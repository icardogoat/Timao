
'use server';

import clientPromise from '@/lib/mongodb';
import type { Post, AuthorInfo, PlacedBet, Transaction, UserRanking, MvpVoting, MvpPlayer, MvpTeamLineup, Notification, StoreItem, Bolao, Advertisement, UserInventoryItem, PurchaseAdminView, BetVolumeData, ProfitLossData, SiteEvent, LevelThreshold, DbStats, UserStats, RecentUser, PromoCode, Championship, MemberActivityStats } from '@/types';
import { ObjectId, WithId } from 'mongodb';
import { revalidatePath } from 'next/cache';
import { getBotConfig } from './bot-config-actions';
import { grantAchievement } from './achievement-actions';
import { getApiSettings, getAvailablePaymentApiKey } from './settings-actions';
import { sendDiscordPostNotification, syncDiscordNews } from './news-actions';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getActiveEvent } from './event-actions';
import { getLevelConfig } from './level-actions';
import { updateFixturesFromApi } from './fixtures-actions';

// Base type for a match in the DB (for admin list view)
type MatchFromDb = {
  _id: number;
  homeTeam: string;
  awayTeam: string;
  league: string;
  timestamp: number;
  status: string;
  isProcessed?: boolean;
  isNotificationSent?: boolean;
  homeLogo?: string;
  awayLogo?: string;
};

// Types for data structure inside a full match document from DB
// These are expected from the external script that saves API data
interface TeamDataInDB {
    home: { id: number; name: string; winner: boolean | null };
    away: { id: number; name: string; winner: boolean | null };
}

interface StatsInDB {
    team: { id: number; };
    statistics: { type: string; value: number | string | null; }[];
}

// Type for the full match document in MongoDB, acknowledging some fields might be missing
type FullMatchInDb = MatchFromDb & {
    goals: { home: number | null; away: number | null; };
    statistics?: StatsInDB[];
};

type MatchAdminView = {
    id: string;
    fixtureId: number;
    teamA: string;
    teamB: string;
    league: string;
    time: string;
    status: string;
    isProcessed: boolean;
    hasBolao: boolean;
    bolaoId?: string;
    hasMvpVoting: boolean;
    mvpVotingId?: string;
};

type UserAdminView = {
    id: string;
    name: string;
    email: string;
    discordId: string;
    joinDate: string;
    totalBets: number;
    totalWagered: number;
    balance: number;
    status: "Ativo" | "Suspenso";
    avatar: string;
    isVip?: boolean;
};

type BetAdminView = {
    id: string;
    userName: string;
    userEmail: string;
    matchDescription: string;
    selections: string;
    stake: number;
    potentialWinnings: number;
    status: 'Em Aberto' | 'Ganha' | 'Perdida' | 'Cancelada';
};

// Types for dashboard data
export type DashboardStats = {
    totalWagered: number;
    activeUsers: number;
    totalBets: number;
    grossProfit: number;
};

export type TopBettor = {
    name: string;
    email: string;
    avatar: string;
    totalWagered: number;
    isVip?: boolean;
};

export type RecentBet = {
    userName: string;
    userEmail: string;
    matchDescription: string;
    status: 'Em Aberto' | 'Ganha' | 'Perdida' | 'Cancelada';
    stake: number;
};

const AD_PRICE = 500; // Price for user-submitted advertisement
const AD_DURATION_DAYS = 7; // Duration for a user-submitted ad
const SETTINGS_ID = '66a4f2b9a7c3d2e3c4f5b6a7';

// Helper function to send a win notification to a Discord channel
async function sendWinNotification(bet: WithId<PlacedBet>, user: UserRanking, winnings: number) {
    const config = await getBotConfig();
    const botToken = process.env.DISCORD_BOT_TOKEN;

    if (!config.winnersChannelId || !botToken || botToken === 'YOUR_BOT_TOKEN_HERE') {
        if (!config.winnersChannelId) console.log('Winners channel not configured. Skipping Discord notification.');
        if (!botToken || botToken === 'YOUR_BOT_TOKEN_HERE') console.log('Bot token not configured. Skipping Discord notification.');
        return;
    }

    const betDescription = bet.bets.length > 1
        ? `Múltipla (${bet.bets.length} seleções)`
        : `${bet.bets[0].teamA} vs ${bet.bets[0].teamB}`;

    const embed = {
        color: 0x22c55e, // Tailwind's green-500
        title: '🏆 Aposta Vencedora! 🏆',
        author: {
            name: user.name,
            icon_url: user.avatar,
        },
        fields: [
            { name: 'Aposta', value: betDescription, inline: false },
            { name: 'Valor Apostado', value: `R$ ${bet.stake.toFixed(2)}`, inline: true },
            { name: 'Prêmio Recebido', value: `**R$ ${winnings.toFixed(2)}**`, inline: true },
        ],
        footer: {
            text: 'Parabéns ao vencedor! 🎉',
        },
        timestamp: new Date().toISOString(),
    };

    try {
        const response = await fetch(`https://discord.com/api/v10/channels/${config.winnersChannelId}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bot ${botToken}`,
            },
            body: JSON.stringify({ embeds: [embed] }),
            cache: 'no-store'
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Failed to send win notification to Discord:', JSON.stringify(errorData, null, 2));
        } else {
            console.log(`Successfully sent win notification for user ${user.name}`);
        }
    } catch (error) {
        console.error('Error sending win notification to Discord:', error);
    }
}

// Fetch matches for admin page
export async function getAdminMatches(): Promise<MatchAdminView[]> {
    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const matchesCollection = db.collection<MatchFromDb>('matches');
        const boloesCollection = db.collection('boloes');
        const mvpVotingsCollection = db.collection('mvp_votings');

        const activeBoloes = await boloesCollection.find({ status: 'Aberto' }).project({ matchId: 1, _id: 1 }).toArray();
        const bolaoMatchMap = new Map(activeBoloes.map(b => [b.matchId, b._id.toString()]));

        const activeVotings = await mvpVotingsCollection.find({}).project({ matchId: 1, _id: 1 }).toArray();
        const mvpMatchMap = new Map(activeVotings.map(v => [v.matchId, v._id.toString()]));
        
        // Find all matches and sort by timestamp descending
        const matchesFromDb = await matchesCollection.find({}).sort({ 'timestamp': -1 }).limit(100).toArray();

        const matches = matchesFromDb.map(match => {
            // Add a check for incomplete data to prevent crashes
            if (!match?._id || !match?.homeTeam || !match?.awayTeam) {
                return null;
            }
            
            let statusLabel: string;
            if (match.isProcessed) {
                statusLabel = 'Pago';
            } else {
                switch (match.status) {
                    case 'FT':
                    case 'AET':
                    case 'PEN':
                        statusLabel = 'Pendente Pagamento';
                        break;
                    case 'NS':
                        statusLabel = 'Agendada';
                        break;
                    case 'PST':
                        statusLabel = 'Adiado';
                        break;
                    case 'HT':
                        statusLabel = 'Intervalo';
                        break;
                    case 'SUSP':
                        statusLabel = 'Paralizado';
                        break;
                    default:
                        statusLabel = 'Ao Vivo';
                }
            }


            return {
                id: match._id.toString(),
                fixtureId: match._id,
                teamA: match.homeTeam,
                teamB: match.awayTeam,
                league: match.league,
                time: new Date(match.timestamp * 1000).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
                status: statusLabel,
                isProcessed: match.isProcessed ?? false,
                hasBolao: bolaoMatchMap.has(match._id),
                bolaoId: bolaoMatchMap.get(match._id),
                hasMvpVoting: mvpMatchMap.has(match._id),
                mvpVotingId: mvpMatchMap.get(match._id),
            };
        });
        
        // Filter out any null values from malformed data
        return matches.filter((match): match is MatchAdminView => match !== null);

    } catch (error) {
        console.error("Error fetching admin matches:", error);
        return [];
    }
}

// Fetch bets for admin page
export async function getAdminBets(): Promise<BetAdminView[]> {
    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        
        const bets = await db.collection('bets').aggregate([
            {
                $lookup: {
                    from: 'users',
                    localField: 'userId',
                    foreignField: 'discordId',
                    as: 'userDetails'
                }
            },
            {
                $unwind: '$userDetails'
            },
            { $sort: { createdAt: -1 } }
        ]).toArray();

        return bets.map((bet: any) => ({
            id: bet._id.toString(),
            userName: bet.userDetails.name,
            userEmail: bet.userDetails.email,
            matchDescription: bet.bets.length > 1 
                ? `Múltipla (${bet.bets.length} seleções)` 
                : `${bet.bets[0].teamA} vs ${bet.bets[0].teamB}`,
            selections: bet.bets.map((s: any) => `${s.selection} @ ${s.oddValue}`).join(', '),
            stake: bet.stake,
            potentialWinnings: bet.potentialWinnings,
            status: bet.status
        }));

    } catch (error) {
        console.error("Error fetching admin bets:", error);
        return [];
    }
}

// Fetch users for admin page
export async function getAdminUsers(): Promise<UserAdminView[]> {
    try {
        const client = await clientPromise;
        const db = client.db('timaocord');

        const users = await db.collection('users').aggregate([
            {
                $lookup: {
                    from: 'wallets',
                    localField: 'discordId',
                    foreignField: 'userId',
                    as: 'walletInfo'
                }
            },
            {
                $unwind: {
                    path: '$walletInfo',
                    preserveNullAndEmptyArrays: true
                }
            },
             {
                $lookup: {
                    from: 'user_stats',
                    localField: 'discordId',
                    foreignField: 'userId',
                    as: 'statsInfo'
                }
            },
            {
                $unwind: {
                    path: '$statsInfo',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $addFields: {
                    totalBets: { $ifNull: ['$statsInfo.totalBets', 0] },
                    totalWagered: { $ifNull: ['$statsInfo.totalWagered', 0] },
                    balance: { $ifNull: ['$walletInfo.balance', 0] },
                    joinDate: { $ifNull: ['$createdAt', new Date()] },
                }
            },
            {
                $project: {
                    betInfo: 0,
                    walletInfo: 0,
                    accounts: 0,
                    sessions: 0,
                    emailVerified: 0
                }
            }
        ]).toArray();
        
        return users.map((user: any) => ({
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            discordId: user.discordId,
            joinDate: (user.joinDate as Date).toISOString().split('T')[0],
            totalBets: user.totalBets,
            totalWagered: user.totalWagered,
            balance: user.balance,
            status: "Ativo", // Assuming status logic would be more complex
            avatar: user.image || `https://placehold.co/40x40.png`,
            isVip: user.isVip ?? false,
        }));
    } catch (error) {
        console.error("Error fetching admin users:", error);
        return [];
    }
}

// Type for the full API response for a fixture
interface FixtureApiResponse {
  fixture: {
    id: number;
    status: {
      short: string;
    };
  };
  league: {
    id: number;
    name: string;
    logo: string;
  };
  teams: {
    home: { id: number; name: string; winner: boolean | null; logo: string };
    away: { id: number; name: string; winner: boolean | null; logo: string };
  };
  goals: {
    home: number | null;
    away: number | null;
  };
  statistics: {
    team: { id: number };
    statistics: { type: string; value: any }[];
  }[];
}

// Fetches the latest fixture data from the API
async function getFixtureFromApi(fixtureId: number): Promise<{ success: boolean; data?: FixtureApiResponse; message?: string }> {
    let apiKey;
    try {
      apiKey = await getAvailablePaymentApiKey();
    } catch (error: any) {
      console.error('API Key Error:', error.message);
      return { success: false, message: error.message };
    }

    const url = `https://api-football-v1.p.rapidapi.com/v3/fixtures?id=${fixtureId}`;
    const options = {
        method: 'GET',
        headers: {
            'X-RapidAPI-Key': apiKey,
            'X-RapidAPI-Host': 'api-football-v1.p.rapidapi.com'
        },
        cache: 'no-store' as RequestCache
    };

    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            const errorData = await response.json();
            console.error(`API Error fetching fixture ${fixtureId}:`, errorData);
            return { success: false, message: `Erro na API: ${errorData.message || 'Falha ao buscar dados da partida.'}` };
        }

        const data = await response.json();
        if (!data.response || data.response.length === 0) {
            return { success: false, message: 'Partida não encontrada na API.' };
        }
        
        return { success: true, data: data.response[0] };

    } catch (error) {
        console.error(`Failed to fetch fixture ${fixtureId}:`, error);
        return { success: false, message: 'Falha crítica ao se comunicar com a API.' };
    }
}

// Function to evaluate one selection
function evaluateSelection(selection: PlacedBet['bets'][0], goals: { home: number, away: number }, stats: StatsInDB[] | undefined, teams: TeamDataInDB): 'Ganha' | 'Perdida' | 'Anulada' {
    const { home, away } = goals;
    const totalGoals = home + away;
    
    const marketsNeedingStats = [
        'Escanteios Acima/Abaixo', 'Cartões Acima/Abaixo', 'Escanteios 1x2',
        'Escanteios da Casa Acima/Abaixo', 'Escanteios do Visitante Acima/Abaixo',
    ];

    if (marketsNeedingStats.includes(selection.marketName) && (!stats || !teams)) {
        console.warn(`Market "${selection.marketName}" for match ${selection.matchId} will be voided due to missing statistics data.`);
        return 'Anulada';
    }
    
    let homeCorners = 0, awayCorners = 0, totalCorners = 0, totalCards = 0;

    if (stats && teams) {
        const homeStats = stats.find(s => s.team.id === teams.home.id)?.statistics || [];
        const awayStats = stats.find(s => s.team.id === teams.away.id)?.statistics || [];
        
        const getStat = (teamStats: { type: string; value: any }[], type: string): number => {
            const stat = teamStats.find(s => s.type === type);
            if (!stat || stat.value === null) return 0;
            const value = typeof stat.value === 'string' ? parseInt(stat.value, 10) : stat.value;
            return isNaN(value) ? 0 : Number(value);
        }
        
        homeCorners = getStat(homeStats, 'Corner Kicks');
        awayCorners = getStat(awayStats, 'Corner Kicks');
        totalCorners = homeCorners + awayCorners;

        const homeYellow = getStat(homeStats, 'Yellow Cards');
        const homeRed = getStat(homeStats, 'Red Cards');
        const awayYellow = getStat(awayStats, 'Yellow Cards');
        const awayRed = getStat(awayStats, 'Red Cards');
        totalCards = homeYellow + homeRed + awayYellow + awayRed;
    }
    
    switch (selection.marketName) {
        case 'Vencedor da Partida':
            if (selection.selection === 'Casa' && home > away) return 'Ganha';
            if (selection.selection === 'Empate' && home === away) return 'Ganha';
            if (selection.selection === 'Fora' && away > home) return 'Ganha';
            return 'Perdida';
        
        case 'Aposta sem Empate':
            if (selection.selection === 'Casa' && home > away) return 'Ganha';
            if (selection.selection === 'Fora' && away > home) return 'Ganha';
            if (home === away) return 'Anulada';
            return 'Perdida';

        case 'Gols Acima/Abaixo':
        case 'Escanteios Acima/Abaixo':
        case 'Cartões Acima/Abaixo': {
            let valueToCompare;
            if (selection.marketName.includes('Gols')) valueToCompare = totalGoals;
            else if (selection.marketName.includes('Escanteios')) valueToCompare = totalCorners;
            else valueToCompare = totalCards;

            const [condition, valueStr] = selection.selection.split(' ');
            const value = parseFloat(valueStr);
            if (condition === 'Acima') {
                if (valueToCompare > value) return 'Ganha';
                if (valueToCompare === value) return 'Anulada';
            }
            if (condition === 'Abaixo') {
                if (valueToCompare < value) return 'Ganha';
                if (valueToCompare === value) return 'Anulada';
            }
            return 'Perdida';
        }

        case 'Ambos Marcam':
            if (selection.selection === 'Sim' && home > 0 && away > 0) return 'Ganha';
            if (selection.selection === 'Não' && (home === 0 || away === 0)) return 'Ganha';
            return 'Perdida';
        
        case 'Placar Exato':
            const [homeScore, awayScore] = selection.selection.split('-').map(Number);
            if (home === homeScore && away === awayScore) return 'Ganha';
            return 'Perdida';
            
        case 'Dupla Chance':
            if (selection.selection === 'Casa ou Empate' && home >= away) return 'Ganha';
            if (selection.selection === 'Fora ou Empate' && away >= home) return 'Ganha';
            if (selection.selection === 'Casa ou Fora' && home !== away) return 'Ganha';
            return 'Perdida';

        case 'Total de Gols da Casa':
        case 'Total de Gols do Visitante':
        case 'Escanteios da Casa Acima/Abaixo':
        case 'Escanteios do Visitante Acima/Abaixo': {
             let valueToCompare;
            if (selection.marketName.includes('Casa')) {
                valueToCompare = selection.marketName.includes('Gols') ? home : homeCorners;
            } else { // Visitante
                valueToCompare = selection.marketName.includes('Gols') ? away : awayCorners;
            }
            const [condition, valueStr] = selection.selection.split(' ');
            const value = parseFloat(valueStr);
            if (condition === 'Acima') {
                if (valueToCompare > value) return 'Ganha';
                if (valueToCompare === value) return 'Anulada';
            }
            if (condition === 'Abaixo') {
                if (valueToCompare < value) return 'Ganha';
                if (valueToCompare === value) return 'Anulada';
            }
            return 'Perdida';
        }

        case 'Escanteios 1x2':
            if (selection.selection === 'Casa' && homeCorners > awayCorners) return 'Ganha';
            if (selection.selection === 'Empate' && homeCorners === awayCorners) return 'Ganha';
            if (selection.selection === 'Fora' && awayCorners > homeCorners) return 'Ganha';
            return 'Perdida';
            
        default:
            console.warn(`Market not handled for resolution: ${selection.marketName}`);
            return 'Perdida';
    }
}

function determineUserLevel(xp: number, levelThresholds: LevelThreshold[]): { level: number; levelName: string } {
    let currentLevel = 1;
    let currentLevelName = levelThresholds[0]?.name ?? 'Iniciante';

    for (let i = levelThresholds.length - 1; i >= 0; i--) {
        if (xp >= levelThresholds[i].xp) {
            currentLevel = levelThresholds[i].level;
            currentLevelName = levelThresholds[i].name;
            break;
        }
    }
    return { level: currentLevel, levelName: currentLevelName };
}

// Main action to resolve a match and settle bets
export async function resolveMatch(fixtureId: number, options: { revalidate: boolean } = { revalidate: true }): Promise<{ success: boolean; message: string }> {
    const client = await clientPromise;
    const db = client.db('timaocord');
    const matchesCollection = db.collection<FullMatchInDb>('matches');

    try {
        const matchInDb = await matchesCollection.findOne({ _id: fixtureId });

        if (matchInDb?.isProcessed) {
            return { success: true, message: `Partida ${fixtureId} já foi processada anteriormente.` };
        }

        // Fetch latest data from the API to ensure accuracy
        const apiResult = await getFixtureFromApi(fixtureId);
        if (!apiResult.success || !apiResult.data) {
            return { success: false, message: apiResult.message || 'Não foi possível obter os dados da API para a partida.' };
        }
        const apiData = apiResult.data;

        if (apiData.fixture.status.short !== 'FT') {
            return { success: false, message: `A partida ${fixtureId} ainda não foi finalizada (Status API: ${apiData.fixture.status.short}).` };
        }

        const { goals, statistics: finalStats, teams } = apiData;

        if (goals.home === null || goals.away === null) {
            return { success: false, message: 'Dados de gols ausentes no documento da partida (API).' };
        }

        const teamsForEval: TeamDataInDB = {
            home: { id: teams.home.id, name: teams.home.name, winner: teams.home.winner },
            away: { id: teams.away.id, name: teams.away.name, winner: teams.home.winner },
        };

        const mongoSession = client.startSession();
        let settledCount = 0;

        await mongoSession.withTransaction(async () => {
            const betsCollection = db.collection<WithId<PlacedBet>>('bets');
            const walletsCollection = db.collection('wallets');
            const notificationsCollection = db.collection('notifications');
            const usersCollection = db.collection('users');
            const userStatsCollection = db.collection<UserStats>('user_stats');
            const boloesCollection = db.collection<Bolao>('boloes');
            const pendingRewardsCollection = db.collection('pending_rewards');
            const levelConfig = await getLevelConfig();


            // Mark as processed inside the transaction, and update with fresh API data
            await matchesCollection.updateOne(
                { '_id': fixtureId },
                { $set: { 
                    isProcessed: true,
                    status: apiData.fixture.status.short,
                    goals: apiData.goals,
                    statistics: apiData.statistics,
                } },
                { session: mongoSession }
            );

            const openBets = await betsCollection.find({ 
                'bets.matchId': fixtureId,
                status: 'Em Aberto' 
            }, { session: mongoSession }).toArray();

            for (const bet of openBets) {
                const updatedSelections = bet.bets.map(selection => {
                    if (selection.matchId === fixtureId) {
                        return { ...selection, status: evaluateSelection(selection, goals as { home: number; away: number; }, finalStats, teamsForEval) };
                    }
                    return selection;
                });
                
                const allSelectionsSettled = updatedSelections.every(s => s.status && s.status !== 'Em Aberto');
                
                if (allSelectionsSettled) {
                    const isBetLost = updatedSelections.some(s => s.status === 'Perdida');
                    const finalBetStatus = isBetLost ? 'Perdida' : 'Ganha';
                    
                    if (finalBetStatus === 'Perdida') {
                        await grantAchievement(bet.userId, 'first_loss');
                         await userStatsCollection.updateOne(
                            { userId: bet.userId },
                            { $inc: { betsLost: 1, totalLosses: bet.stake } },
                            { upsert: true, session: mongoSession }
                        );
                    }
                    
                    let winnings = 0;
                    if (finalBetStatus === 'Ganha') {
                        const finalOdds = updatedSelections.reduce((acc, sel) => {
                            if (sel.status === 'Anulada') return acc * 1;
                            return acc * parseFloat(sel.oddValue);
                        }, 1);
                        winnings = bet.stake * finalOdds;

                         await userStatsCollection.updateOne(
                            { userId: bet.userId },
                            { $inc: { betsWon: 1, totalWinnings: winnings } },
                            { upsert: true, session: mongoSession }
                        );

                         const newTransaction: Transaction = {
                            id: new ObjectId().toString(),
                            type: 'Prêmio',
                            description: `Ganhos da aposta #${bet._id.toString().substring(18)}`,
                            amount: winnings,
                            date: new Date().toISOString(),
                            status: 'Concluído',
                        };

                        await walletsCollection.updateOne(
                            { userId: bet.userId },
                            {
                                $inc: { balance: winnings },
                                $push: { transactions: { $each: [newTransaction], $sort: { date: -1 } } },
                            },
                            { session: mongoSession }
                        );

                        const user = await usersCollection.findOne({ discordId: bet.userId }, { session: mongoSession });
                        
                        // New XP & Level Up Logic
                        const activeEvent = await getActiveEvent();
                        const eventMultiplier = activeEvent ? activeEvent.xpMultiplier : 1;
                        const vipMultiplier = user?.isVip ? 2 : 1;
                        const totalMultiplier = eventMultiplier * vipMultiplier;
                        const xpGain = bet.stake * totalMultiplier;
                        const oldLevel = user?.level ?? 1;
                        
                        // Add user XP for won bet
                        const { value: updatedUser } = await usersCollection.findOneAndUpdate(
                            { discordId: bet.userId },
                            { $inc: { xp: xpGain } },
                            { session: mongoSession, returnDocument: 'after' }
                        );

                        if (updatedUser) {
                           const newLevelData = determineUserLevel(updatedUser.xp, levelConfig);
                           if (newLevelData.level > oldLevel) {
                               await usersCollection.updateOne({ _id: updatedUser._id }, { $set: { level: newLevelData.level } }, { session: mongoSession });
                               
                               const levelReward = levelConfig.find(l => l.level === newLevelData.level);
                               let rewardDescription = '';
                               
                               if (levelReward) {
                                   if (levelReward.rewardType === 'money' && levelReward.rewardAmount) {
                                       const moneyRewardTx: Transaction = {
                                           id: new ObjectId().toString(), type: 'Bônus',
                                           description: `Recompensa por atingir Nível ${newLevelData.level}: ${newLevelData.levelName}`,
                                           amount: levelReward.rewardAmount, date: new Date().toISOString(), status: 'Concluído',
                                       };
                                       await walletsCollection.updateOne(
                                           { userId: bet.userId },
                                           { $inc: { balance: levelReward.rewardAmount }, $push: { transactions: { $each: [moneyRewardTx], $sort: { date: -1 } } } },
                                           { session: mongoSession }
                                       );
                                       rewardDescription = ` Você ganhou uma recompensa de R$ ${levelReward.rewardAmount.toFixed(2)}!`;
                                   } else if (levelReward.rewardType === 'role' && levelReward.rewardRoleId) {
                                        await pendingRewardsCollection.insertOne({
                                           userId: bet.userId, type: 'role', roleId: levelReward.rewardRoleId,
                                           reason: `Atingiu Nível ${newLevelData.level}`, createdAt: new Date(),
                                       }, { session: mongoSession });
                                       rewardDescription = ` Você ganhou um novo cargo no Discord!`;
                                   }
                               }
                               
                               const levelUpNotification: Omit<Notification, '_id'> = {
                                    userId: bet.userId, title: `🎉 Nível ${newLevelData.level} Alcançado!`,
                                    description: `Parabéns, você agora é ${newLevelData.levelName}!${rewardDescription}`,
                                    date: new Date(), read: false, link: '/profile', isPriority: true,
                               };
                               await notificationsCollection.insertOne(levelUpNotification as any, { session: mongoSession });

                               if (newLevelData.level === 5) await grantAchievement(bet.userId, 'level_5');
                               if (newLevelData.level === 10) await grantAchievement(bet.userId, 'level_10');
                           }
                        }
                        
                        if (user) {
                           await sendWinNotification(bet, user as any, winnings);
                        }

                        // Grant first win achievement
                        await grantAchievement(bet.userId, 'first_win');
                        
                        // Grant multiple win achievement if applicable
                        if (bet.bets.length > 1) {
                            await grantAchievement(bet.userId, 'multiple_win');
                        }
                    }
                    
                    await betsCollection.updateOne(
                        { _id: bet._id },
                        { $set: { bets: updatedSelections, status: finalBetStatus, potentialWinnings: winnings, settledAt: new Date() } },
                        { session: mongoSession }
                    );

                    const notificationTitle = finalBetStatus === 'Ganha' ? 'Aposta Ganha!' : 'Aposta Perdida';
                    const betDescription = bet.bets.length > 1 
                        ? `Múltipla (${bet.bets.length} seleções)` 
                        : `${bet.bets[0].teamA} vs ${bet.bets[0].teamB}`;
                    const notificationDesc = `Sua aposta em "${betDescription}" foi resolvida. Clique para ver.`;

                    await notificationsCollection.insertOne({
                        userId: bet.userId,
                        title: notificationTitle,
                        description: notificationDesc,
                        date: new Date(),
                        read: false,
                        link: `/my-bets`,
                        isPriority: true,
                    }, { session: mongoSession });
                    
                    settledCount++;
                } else {
                     await betsCollection.updateOne(
                        { _id: bet._id },
                        { $set: { bets: updatedSelections } },
                        { session: mongoSession }
                    );
                }
            }

            // Resolve Bolão if it exists for this match
            const activeBolao = await boloesCollection.findOne({ 
                matchId: fixtureId,
                status: 'Aberto' 
            }, { session: mongoSession });

            if (activeBolao) {
                const finalScore = { home: goals.home as number, away: goals.away as number };
                const winners = activeBolao.participants.filter(p => 
                    p.guess.home === finalScore.home && p.guess.away === finalScore.away
                );

                if (winners.length > 0) {
                    const prizePerWinner = activeBolao.prizePool / winners.length;

                    for (const winner of winners) {
                        const prizeTransaction: Transaction = {
                            id: new ObjectId().toString(),
                            type: 'Prêmio',
                            description: `Ganhos do Bolão: ${activeBolao.homeTeam} vs ${activeBolao.awayTeam}`,
                            amount: prizePerWinner,
                            date: new Date().toISOString(),
                            status: 'Concluído',
                        };

                        await walletsCollection.updateOne(
                            { userId: winner.userId },
                            {
                                $inc: { balance: prizePerWinner },
                                $push: { transactions: { $each: [prizeTransaction], $sort: { date: -1 } } },
                            },
                            { session: mongoSession }
                        );

                        const winNotification: Omit<Notification, '_id'> = {
                            userId: winner.userId,
                            title: '🏆 Você ganhou no Bolão!',
                            description: `Parabéns! Você acertou o placar de ${activeBolao.homeTeam} vs ${activeBolao.awayTeam} e ganhou R$ ${prizePerWinner.toFixed(2)}.`,
                            date: new Date(),
                            read: false,
                            link: '/bolao',
                            isPriority: true,
                        };
                        await notificationsCollection.insertOne(winNotification as any, { session: mongoSession });
                    }
                    
                    await boloesCollection.updateOne(
                        { _id: activeBolao._id },
                        { 
                            $set: { 
                                status: 'Pago',
                                finalScore: finalScore,
                                winners: winners.map(w => ({ userId: w.userId, prize: prizePerWinner }))
                            } 
                        },
                        { session: mongoSession }
                    );

                } else {
                    // No winners, refund everyone
                    for (const participant of activeBolao.participants) {
                        const refundTransaction: Transaction = {
                            id: new ObjectId().toString(),
                            type: 'Bônus',
                            description: `Reembolso do Bolão (sem vencedores): ${activeBolao.homeTeam} vs ${activeBolao.awayTeam}`,
                            amount: activeBolao.entryFee,
                            date: new Date().toISOString(),
                            status: 'Concluído',
                        };

                        await walletsCollection.updateOne(
                            { userId: participant.userId },
                            {
                                $inc: { balance: activeBolao.entryFee },
                                $push: { transactions: { $each: [refundTransaction], $sort: { date: -1 } } },
                            },
                            { session: mongoSession }
                        );
                        
                        const refundNotification: Omit<Notification, '_id'> = {
                            userId: participant.userId,
                            title: 'Bolão Reembolsado',
                            description: `Ninguém acertou o placar de ${activeBolao.homeTeam} vs ${activeBolao.awayTeam}. Sua entrada de R$ ${activeBolao.entryFee.toFixed(2)} foi devolvida.`,
                            date: new Date(),
                            read: false,
                            link: '/wallet',
                            isPriority: true,
                        };
                        await notificationsCollection.insertOne(refundNotification as any, { session: mongoSession });
                    }

                    await boloesCollection.updateOne(
                        { _id: activeBolao._id },
                        { 
                            $set: { 
                                status: 'Pago',
                                finalScore: finalScore,
                                winners: [] 
                            }
                        },
                        { session: mongoSession }
                    );
                }
            }
        });
        
        await mongoSession.endSession();

        if (options.revalidate) {
            revalidatePath('/admin/matches');
            revalidatePath('/admin/bets');
            revalidatePath('/my-bets');
            revalidatePath('/wallet');
            revalidatePath('/notifications');
            revalidatePath('/profile');
            revalidatePath('/bolao');
        }

        return { success: true, message: `Partida ${fixtureId} resolvida. ${settledCount} apostas foram finalizadas.` };

    } catch (error) {
        console.error(`Error resolving match ${fixtureId}:`, error);
        return { success: false, message: 'Ocorreu um erro inesperado ao processar a resolução.' };
    }
}

// Function to be called by a cron job to process all finished matches
export async function processAllFinishedMatches(): Promise<{ success: boolean; message: string; details: string[] }> {
    console.log('Starting to process finished matches...');
    const client = await clientPromise;
    const db = client.db('timaocord');
    const matchesCollection = db.collection('matches');

    const finishedMatchesToProcess = await matchesCollection.find({
        'status': 'FT',
        'isProcessed': { $ne: true }
    }).toArray();

    if (finishedMatchesToProcess.length === 0) {
        console.log('No new finished matches to process.');
        return { success: true, message: 'No new finished matches to process.', details: [] };
    }

    console.log(`Found ${finishedMatchesToProcess.length} matches to process.`);
    const results: string[] = [];
    let successCount = 0;
    let failureCount = 0;

    for (const match of finishedMatchesToProcess) {
        const fixtureId = match._id; 
        console.log(`Processing match ${fixtureId}...`);
        try {
            const result = await resolveMatch(fixtureId, { revalidate: false });
            if (result.success) {
                successCount++;
                results.push(`Successfully resolved match ${fixtureId}: ${result.message}`);
            } else {
                failureCount++;
                results.push(`Failed to resolve match ${fixtureId}: ${result.message}`);
            }
        } catch (error) {
            failureCount++;
            const errorMessage = (error instanceof Error) ? error.message : String(error);
            results.push(`Error processing match ${fixtureId}: ${errorMessage}`);
            console.error(`Error processing match ${fixtureId}:`, error);
        }
    }

    const summaryMessage = `Processed ${finishedMatchesToProcess.length} matches. Success: ${successCount}, Failure: ${failureCount}.`;
    console.log(summaryMessage);
    
    if (successCount > 0) {
        console.log('Revalidating paths...');
        revalidatePath('/admin/matches');
        revalidatePath('/admin/bets');
        revalidatePath('/my-bets');
        revalidatePath('/wallet');
        revalidatePath('/notifications');
        revalidatePath('/profile');
    }

    return {
        success: failureCount === 0,
        message: summaryMessage,
        details: results
    };
}

// Function to fetch dashboard stats
export async function getDashboardStats(): Promise<DashboardStats> {
    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const betsCollection = db.collection('bets');
        const usersCollection = db.collection('users');

        const totalUsers = await usersCollection.countDocuments();

        const betsStats = await betsCollection.aggregate([
            {
                $group: {
                    _id: null,
                    totalWagered: { $sum: '$stake' },
                    totalBets: { $sum: 1 },
                    totalWinnings: {
                        $sum: {
                            $cond: [{ $eq: ['$status', 'Ganha'] }, '$potentialWinnings', 0]
                        }
                    }
                }
            }
        ]).toArray();

        const stats = betsStats[0] || { totalWagered: 0, totalBets: 0, totalWinnings: 0 };
        const grossProfit = stats.totalWagered - stats.totalWinnings;

        return {
            totalWagered: stats.totalWagered,
            activeUsers: totalUsers,
            totalBets: stats.totalBets,
            grossProfit: grossProfit,
        };
    } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        return { totalWagered: 0, activeUsers: 0, totalBets: 0, grossProfit: 0 };
    }
}

export async function getChartData(period: 'weekly' | 'monthly' = 'weekly'): Promise<{ volume: BetVolumeData; profit: ProfitLossData; }> {
    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const betsCollection = db.collection('bets');
        
        const now = new Date();
        let startDate: Date;
        const dateFormat = "%Y-%m-%d";

        if (period === 'monthly') {
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        } else { // weekly
            startDate = new Date();
            startDate.setDate(startDate.getDate() - 6);
            startDate.setHours(0, 0, 0, 0);
        }
        
        const aggregationResult = await betsCollection.aggregate([
            { $match: { createdAt: { $gte: startDate } } },
            {
                $group: {
                    _id: { $dateToString: { format: dateFormat, date: "$createdAt", timezone: "America/Sao_Paulo" } },
                    totalWagered: { $sum: '$stake' },
                    totalBets: { $sum: 1 },
                    winnings: { $sum: { $cond: [{ $eq: ['$status', 'Ganha'] }, '$potentialWinnings', 0] } }
                }
            },
            { $sort: { _id: 1 } }
        ]).toArray();
        
        const dataMap = new Map<string, any>();
        aggregationResult.forEach(item => { dataMap.set(item._id, item); });

        const volume: BetVolumeData = [];
        const profit: ProfitLossData = [];
        const days = period === 'weekly' ? 7 : new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const weekDayMap = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

        for (let i = 0; i < days; i++) {
            const d = new Date(now);
            if (period === 'weekly') {
                d.setDate(now.getDate() - (days - 1 - i));
            } else {
                d.setFullYear(now.getFullYear());
                d.setMonth(now.getMonth());
                d.setDate(i + 1);
            }
            d.setHours(12, 0, 0, 0); 

            const key = d.toISOString().split('T')[0];
            const data = dataMap.get(key) || { totalWagered: 0, totalBets: 0, winnings: 0 };
            const label = period === 'weekly' ? weekDayMap[d.getDay()] : (i + 1).toString().padStart(2, '0');
            
            volume.push({ date: label, totalWagered: data.totalWagered, totalBets: data.totalBets });
            profit.push({ date: label, wagered: data.totalWagered, winnings: data.winnings, profit: data.totalWagered - data.winnings });
        }
        
        return { volume, profit };
        
    } catch (error) {
        console.error(`Error fetching chart data for period ${period}:`, error);
        return { volume: [], profit: [] };
    }
}


// Function to fetch top bettors by amount wagered
export async function getTopBettors(): Promise<TopBettor[]> {
     try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const betsCollection = db.collection('bets');

        const topBettorsData = await betsCollection.aggregate([
            {
                $group: {
                    _id: '$userId',
                    totalWagered: { $sum: '$stake' }
                }
            },
            { $sort: { totalWagered: -1 } },
            { $limit: 5 },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: 'discordId',
                    as: 'userDetails'
                }
            },
            { $unwind: '$userDetails' },
            {
                $project: {
                    _id: 0,
                    name: '$userDetails.name',
                    email: '$userDetails.email',
                    avatar: '$userDetails.image',
                    totalWagered: 1,
                    isVip: '$userDetails.isVip',
                }
            }
        ]).toArray();

        return topBettorsData.map(user => ({
            name: user.name as string,
            email: user.email as string,
            avatar: user.avatar as string,
            totalWagered: user.totalWagered as number,
            isVip: user.isVip as boolean ?? false,
        }));

    } catch (error) {
        console.error('Error fetching top bettors:', error);
        return [];
    }
}

// Function to fetch recent bets for dashboard
export async function getRecentBets(): Promise<RecentBet[]> {
    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        
        const bets = await db.collection('bets').aggregate([
            { $sort: { createdAt: -1 } },
            { $limit: 5 },
            {
                $lookup: {
                    from: 'users',
                    localField: 'userId',
                    foreignField: 'discordId',
                    as: 'userDetails'
                }
            },
            {
                $unwind: '$userDetails'
            }
        ]).toArray();

        return bets.map((bet: any) => ({
            userName: bet.userDetails.name,
            userEmail: bet.userDetails.email,
            matchDescription: bet.bets.length > 1 
                ? `Múltipla (${bet.bets.length} seleções)` 
                : `${bet.bets[0].teamA} vs ${bet.bets[0].teamB}`,
            stake: bet.stake,
            status: bet.status
        }));

    } catch (error) {
        console.error("Error fetching recent bets for dashboard:", error);
        return [];
    }
}

// ---- MVP VOTING ACTIONS ----
const getTeamIdFromLogo = (url: string | undefined): number | null => {
    if (!url) return null;
    const match = url.match(/\/teams\/(\d+)\.png$/);
    return match ? parseInt(match[1], 10) : null;
};


async function getMatchLineups(fixtureId: number): Promise<{ success: boolean; data?: MvpTeamLineup[]; message?: string }> {
    let apiKey;
    try {
      apiKey = await getAvailablePaymentApiKey();
    } catch (error: any) {
      console.error('API Key Error:', error.message);
      return { success: false, message: error.message };
    }

    const url = `https://api-football-v1.p.rapidapi.com/v3/fixtures/players?fixture=${fixtureId}`;
    const options = {
        method: 'GET',
        headers: {
            'X-RapidAPI-Key': apiKey,
            'X-RapidAPI-Host': 'api-football-v1.p.rapidapi.com'
        },
        cache: 'no-store' as RequestCache
    };

    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            const errorData = await response.json();
            console.error(`API Error fetching players for fixture ${fixtureId}:`, errorData);
            return { success: false, message: `Erro na API: ${errorData.message || 'Falha ao buscar jogadores da partida.'}` };
        }

        const data = await response.json();
        if (!data.response || data.response.length === 0) {
            return { success: false, message: 'Jogadores não disponíveis para esta partida na API.' };
        }

        const lineups: MvpTeamLineup[] = data.response.map((teamData: any) => {
            const players = teamData.players
                .filter((p: any) => p.statistics[0]?.games?.minutes > 0)
                .map((p: any) => ({
                    id: p.player.id,
                    name: p.player.name,
                    photo: p.player.photo || 'https://placehold.co/40x40.png',
                }));

            return {
                teamId: teamData.team.id,
                teamName: teamData.team.name,
                teamLogo: teamData.team.logo,
                players: players,
            };
        });
        
        if (lineups.length === 0 || lineups.every(l => l.players.length === 0)) {
            return { success: false, message: 'Nenhum jogador que participou da partida foi encontrado na API. A votação MVP não pode ser criada.' };
        }

        return { success: true, data: lineups };

    } catch (error) {
        console.error(`Failed to fetch players for fixture ${fixtureId}:`, error);
        return { success: false, message: 'Falha crítica ao se comunicar com a API de jogadores.' };
    }
}

async function sendNewMvpNotification(voting: Omit<MvpVoting, '_id'>) {
    const config = await getBotConfig();
    const { siteUrl } = await getApiSettings();
    const botToken = process.env.DISCORD_BOT_TOKEN;
    const channelId = config.mvpChannelId;

    if (!channelId || !botToken || botToken === 'YOUR_BOT_TOKEN_HERE') {
        console.log('Discord MVP channel or bot token not configured. Skipping MVP notification.');
        return;
    }

    const embed = {
        color: 0xf97316, // orange-500
        title: '⭐ VOTAÇÃO MVP ABERTA! ⭐',
        description: `**${voting.homeTeam} vs ${voting.awayTeam}**\n\nQuem foi o melhor em campo? Vote agora e ganhe uma recompensa!`,
        fields: [
            { name: 'Recompensa por Voto', value: `**R$ 100,00**`, inline: true },
        ],
        footer: {
            text: `Campeonato: ${voting.league}`,
        },
        timestamp: new Date().toISOString(),
    };

    const payload: { embeds: any[], components?: any[] } = {
        embeds: [embed],
    };

    if (siteUrl) {
        payload.components = [
            {
                type: 1, // Action Row
                components: [
                    {
                        type: 2, // Button
                        style: 5, // Link
                        label: 'Votar no MVP',
                        url: `${siteUrl}/mvp`
                    }
                ]
            }
        ];
    } else {
        embed.fields.push({ name: 'Como participar?', value: `Acesse a aba **MVP** no nosso site para registrar seu voto!`, inline: false });
    }


     try {
        const response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bot ${botToken}`,
            },
            body: JSON.stringify(payload),
            cache: 'no-store'
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Failed to send new MVP notification to Discord:', JSON.stringify(errorData, null, 2));
        } else {
            console.log(`Successfully sent new MVP notification for match ${voting.matchId}`);
        }
    } catch (error) {
        console.error('Error sending new MVP notification to Discord:', error);
    }
}


export async function createMvpVoting(matchId: number): Promise<{ success: boolean; message: string }> {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.admin) {
            return { success: false, message: 'Acesso negado.' };
        }
        
        const client = await clientPromise;
        const db = client.db('timaocord');
        const matchesCollection = db.collection('matches');
        const mvpVotingsCollection = db.collection('mvp_votings');

        const existingVoting = await mvpVotingsCollection.findOne({ matchId });
        if (existingVoting) {
            return { success: false, message: 'Já existe uma votação de MVP para esta partida.' };
        }

        const matchData = await matchesCollection.findOne({ _id: matchId });
        if (!matchData) {
            return { success: false, message: 'Partida não encontrada.' };
        }

        const lineupResult = await getMatchLineups(matchId);
        if (!lineupResult.success || !lineupResult.data) {
            return { success: false, message: lineupResult.message || 'Não foi possível obter as escalações.' };
        }
        
        const lineups = lineupResult.data;
        if(lineups.length < 2) {
             return { success: false, message: 'Dados de escalação incompletos da API.' };
        }


        const newVoting: Omit<MvpVoting, '_id'> = {
            matchId: matchData._id,
            homeTeam: matchData.homeTeam,
            awayTeam: matchData.awayTeam,
            homeLogo: matchData.homeLogo || '',
            awayLogo: matchData.awayLogo || '',
            league: matchData.league,
            status: 'Aberto',
            lineups: lineups,
            votes: [],
            createdAt: new Date(),
            endsAt: new Date(Date.now() + 10 * 60 * 1000), // Ends in 10 minutes
        };

        await mvpVotingsCollection.insertOne(newVoting as any);
        await sendNewMvpNotification(newVoting);

        revalidatePath('/admin/matches');
        revalidatePath('/admin/mvp');
        revalidatePath('/mvp');

        return { success: true, message: 'Votação de MVP criada com sucesso!' };

    } catch (error) {
        console.error('Error creating MVP voting:', error);
        return { success: false, message: 'Ocorreu um erro ao criar a votação de MVP.' };
    }
}

export async function getAdminVotings(): Promise<MvpVoting[]> {
    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const votings = await db.collection<MvpVoting>('mvp_votings')
            .find({})
            .sort({ createdAt: -1 })
            .toArray();
        return JSON.parse(JSON.stringify(votings));
    } catch (error) {
        console.error('Error fetching admin votings:', error);
        return [];
    }
}

export async function finalizeMvpVoting(votingId: string, mvpPlayerId: number): Promise<{ success: boolean; message: string }> {
     try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const mvpVotingsCollection = db.collection('mvp_votings');

        const result = await mvpVotingsCollection.updateOne(
            { _id: new ObjectId(votingId), status: 'Aberto' },
            {
                $set: {
                    status: 'Finalizado',
                    mvpPlayerIds: [mvpPlayerId],
                    finalizedAt: new Date(),
                }
            }
        );

        if (result.modifiedCount === 0) {
            return { success: false, message: 'Votação não encontrada ou já finalizada.' };
        }

        revalidatePath('/admin/mvp');
        revalidatePath('/mvp');

        return { success: true, message: 'Votação de MVP finalizada com sucesso!' };
    } catch (error) {
        console.error('Error finalizing MVP voting:', error);
        return { success: false, message: 'Ocorreu um erro ao finalizar a votação.' };
    }
}

export async function cancelMvpVoting(votingId: string): Promise<{ success: boolean; message: string }> {
    const client = await clientPromise;
    const db = client.db('timaocord');
    const mongoSession = client.startSession();
    const VOTE_REWARD = 100;

    let result: { success: boolean; message: string } | undefined;

    try {
        await mongoSession.withTransaction(async () => {
            const mvpVotingsCollection = db.collection<MvpVoting>('mvp_votings');
            const walletsCollection = db.collection('wallets');
            const notificationsCollection = db.collection('notifications');

            const voting = await mvpVotingsCollection.findOne({ _id: new ObjectId(votingId), status: 'Aberto' }, { session: mongoSession });
            if (!voting) {
                throw new Error('Votação não encontrada ou já não está mais aberta.');
            }

            for (const vote of voting.votes) {
                const debitAmount = -VOTE_REWARD;
                const newTransaction: Transaction = {
                    id: new ObjectId().toString(),
                    type: 'Ajuste',
                    description: `Reversão de bônus: Votação MVP cancelada - ${voting.homeTeam} vs ${voting.awayTeam}`,
                    amount: debitAmount,
                    date: new Date().toISOString(),
                    status: 'Concluído',
                };
                await walletsCollection.updateOne(
                    { userId: vote.userId },
                    {
                        $inc: { balance: debitAmount },
                        $push: { transactions: { $each: [newTransaction], $sort: { date: -1 } } },
                    },
                    { session: mongoSession }
                );

                const newNotification: Omit<Notification, '_id'> = {
                    userId: vote.userId,
                    title: 'Votação MVP Cancelada',
                    description: `A votação MVP para ${voting.homeTeam} vs ${voting.awayTeam} foi cancelada. O bônus de R$ ${VOTE_REWARD.toFixed(2)} foi revertido.`,
                    date: new Date(),
                    read: false,
                    link: '/wallet',
                    isPriority: true,
                };
                await notificationsCollection.insertOne(newNotification as any, { session: mongoSession });
            }

            await mvpVotingsCollection.updateOne(
                { _id: new ObjectId(votingId) },
                { $set: { status: 'Cancelado' } },
                { session: mongoSession }
            );

            result = { success: true, message: `Votação cancelada e o bônus de ${voting.votes.length} participante(s) foi revertido.` };
        });

        await mongoSession.endSession();

        if (result?.success) {
            revalidatePath('/admin/mvp');
            revalidatePath('/mvp');
            revalidatePath('/wallet');
            revalidatePath('/notifications');
            return result;
        }

        return { success: false, message: 'A transação falhou.' };

    } catch (error: any) {
        await mongoSession.endSession();
        return { success: false, message: error.message || 'Ocorreu um erro ao cancelar a votação.' };
    }
}

async function sendMvpWinnerNotification(voting: MvpVoting, winners: (MvpPlayer & { voteCount: number })[]) {
    const config = await getBotConfig();
    const botToken = process.env.DISCORD_BOT_TOKEN;
    const channelId = config.mvpChannelId;

    if (!channelId || !botToken || botToken === 'YOUR_BOT_TOKEN_HERE' || winners.length === 0) {
        console.log('Discord MVP channel, bot token not configured, or no winners. Skipping MVP winner notification.');
        return;
    }
    
    const winnerNames = winners.map(w => `**${w.name}**`).join(' e ');
    const voteCount = winners[0]?.voteCount ?? 0;

    const embed = {
        color: 0xfacc15, // yellow-400
        title: '🏆 Votação MVP Encerrada! 🏆',
        description: `A votação para **${voting.homeTeam} vs ${voting.awayTeam}** foi finalizada!\n\nCom ${voteCount} voto(s), o(s) MVP(s) da partida é/são: ${winnerNames}!`,
        thumbnail: {
            url: winners[0].photo,
        },
        footer: {
            text: `Total de ${voting.votes.length} votos.`,
        },
        timestamp: new Date().toISOString(),
    };

     try {
        const response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bot ${botToken}`,
            },
            body: JSON.stringify({ embeds: [embed] }),
            cache: 'no-store'
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error(`Failed to send MVP winner notification for match ${voting.matchId}:`, JSON.stringify(errorData, null, 2));
        } else {
            console.log(`Successfully sent MVP winner notification for match ${voting.matchId}`);
        }
    } catch (error) {
        console.error('Error sending MVP winner notification to Discord:', error);
    }
}


export async function processMvpVotings(): Promise<{ success: boolean; message: string; details: string[] }> {
    console.log('Starting to process MVP votings...');
    const client = await clientPromise;
    const db = client.db('timaocord');
    const mvpVotingsCollection = db.collection<MvpVoting>('mvp_votings');
    
    const votingsToProcess = await mvpVotingsCollection.find({
        status: 'Aberto',
        endsAt: { $lt: new Date() }
    }).toArray();
    
    if (votingsToProcess.length === 0) {
        const msg = 'No expired MVP votings to process.';
        console.log(msg);
        return { success: true, message: msg, details: [] };
    }

    console.log(`Found ${votingsToProcess.length} MVP votings to process.`);
    const results: string[] = [];
    let successCount = 0;
    let failureCount = 0;

    for (const voting of votingsToProcess) {
        try {
            const voteCounts = new Map<number, number>();
            voting.votes.forEach(vote => {
                voteCounts.set(vote.playerId, (voteCounts.get(vote.playerId) || 0) + 1);
            });

            if (voteCounts.size === 0) {
                 await mvpVotingsCollection.updateOne(
                    { _id: voting._id },
                    { $set: { status: 'Finalizado', finalizedAt: new Date(), mvpPlayerIds: [] } }
                );
                results.push(`Voting ${voting._id} finalized with no votes.`);
                successCount++;
                continue;
            }

            const maxVotes = Math.max(...Array.from(voteCounts.values()));
            const winnerIds = Array.from(voteCounts.entries())
                .filter(([_, count]) => count === maxVotes)
                .map(([playerId, _]) => playerId);

            await mvpVotingsCollection.updateOne(
                { _id: voting._id },
                { $set: { status: 'Finalizado', finalizedAt: new Date(), mvpPlayerIds: winnerIds } }
            );
            
            const allPlayers = voting.lineups.flatMap(l => l.players);
            const winnerPlayers = allPlayers
                .filter(p => winnerIds.includes(p.id))
                .map(p => ({ ...p, voteCount: maxVotes }));

            await sendMvpWinnerNotification(voting, winnerPlayers);

            results.push(`Successfully finalized voting ${voting._id} with ${winnerIds.length} winner(s).`);
            successCount++;

        } catch (error) {
            failureCount++;
            const errorMessage = (error instanceof Error) ? error.message : String(error);
            results.push(`Error processing voting ${voting._id}: ${errorMessage}`);
            console.error(`Error processing voting ${voting._id}:`, error);
        }
    }
    
     if (successCount > 0) {
        revalidatePath('/admin/mvp');
        revalidatePath('/mvp');
    }

    const summaryMessage = `Processed ${votingsToProcess.length} MVP votings. Success: ${successCount}, Failure: ${failureCount}.`;
    console.log(summaryMessage);

    return {
        success: failureCount === 0,
        message: summaryMessage,
        details: results
    };
}


// ---- ADMIN STORE ACTIONS ----

type StoreItemAdminData = Omit<StoreItem, '_id' | 'createdAt'> & { id: string };

export async function getAdminStoreItems(): Promise<StoreItemAdminData[]> {
    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const items = await db.collection<StoreItem>('store_items')
            .find({})
            .sort({ price: 1 })
            .toArray();

        return items.map(item => ({
            id: item._id.toString(),
            name: item.name,
            description: item.description,
            price: item.price,
            type: item.type,
            duration: item.duration,
            durationInDays: item.durationInDays,
            roleId: item.roleId,
            xpAmount: item.xpAmount,
            isActive: item.isActive,
            stock: item.stock,
        }));
    } catch (error) {
        console.error("Error fetching admin store items:", error);
        return [];
    }
}

export async function upsertStoreItem(data: Omit<StoreItemAdminData, 'id'> & {id?: string}): Promise<{ success: boolean; message: string }> {
    const { id, ...itemData } = data;

    const itemToSave: Partial<StoreItem> = {
        name: itemData.name,
        description: itemData.description,
        price: itemData.price,
        type: itemData.type,
        isActive: itemData.isActive,
        stock: itemData.stock,
    };

    if (itemData.type === 'XP_BOOST') {
        itemToSave.xpAmount = itemData.xpAmount;
    } else if (itemData.type === 'ROLE') {
        itemToSave.roleId = itemData.roleId;
        itemToSave.duration = itemData.duration;
    } else if (itemData.type === 'AD_REMOVAL') {
        itemToSave.durationInDays = itemData.durationInDays;
    }
    
    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const collection = db.collection<StoreItem>('store_items');

        if (id) {
            // Update
            await collection.updateOne(
                { _id: new ObjectId(id) },
                { $set: itemToSave }
            );
        } else {
            // Insert
            await collection.insertOne({
                ...itemToSave,
                createdAt: new Date(),
            } as StoreItem);
        }
        revalidatePath('/admin/store');
        revalidatePath('/store');
        return { success: true, message: `Item ${id ? 'atualizado' : 'criado'} com sucesso!` };
    } catch (error) {
        console.error("Error upserting store item:", error);
        return { success: false, message: "Ocorreu um erro ao salvar o item." };
    }
}

export async function deleteStoreItem(itemId: string): Promise<{ success: boolean; message: string }> {
     try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const collection = db.collection<StoreItem>('store_items');

        await collection.deleteOne({ _id: new ObjectId(itemId) });

        revalidatePath('/admin/store');
        revalidatePath('/store');
        return { success: true, message: "Item excluído com sucesso." };
    } catch (error) {
        console.error("Error deleting store item:", error);
        return { success: false, message: "Ocorreu um erro ao excluir o item." };
    }
}


// ---- ADMIN ADVERTISEMENT ACTIONS ----

export async function getAdminAdvertisements(): Promise<Advertisement[]> {
    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const ads = await db.collection<Advertisement>('advertisements')
            .find({})
            .sort({ createdAt: -1 })
            .toArray();

        return JSON.parse(JSON.stringify(ads));
    } catch (error) {
        console.error("Error fetching admin advertisements:", error);
        return [];
    }
}

export async function upsertAdvertisement(data: {
    id?: string;
    title: string;
    description: string;
    imageUrl: string;
    linkUrl: string;
    status: 'active' | 'inactive';
    startDate?: Date | null;
    endDate?: Date | null;
}): Promise<{ success: boolean; message: string }> {
    const { id, ...adData } = data;

    const adToSave: Partial<Advertisement> = {
        ...adData,
        owner: 'system',
    };

    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const collection = db.collection<Advertisement>('advertisements');

        if (id) {
            // Update logic
            await collection.updateOne({ _id: new ObjectId(id) }, { $set: adToSave });
        } else {
            // Insert logic
            adToSave.createdAt = new Date();
            // If start date is not provided but status is active, set it to now.
            if (adData.status === 'active' && !adData.startDate) {
                adToSave.startDate = new Date();
            }
            await collection.insertOne(adToSave as any);
        }

        revalidatePath('/admin/ads');
        return { success: true, message: `Anúncio ${id ? 'atualizado' : 'criado'} com sucesso!` };
    } catch (error) {
        console.error("Error upserting advertisement:", error);
        return { success: false, message: "Ocorreu um erro ao salvar o anúncio." };
    }
}

export async function deleteAdvertisement(adId: string): Promise<{ success: boolean; message: string }> {
     try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const collection = db.collection<Advertisement>('advertisements');

        await collection.deleteOne({ _id: new ObjectId(adId) });

        revalidatePath('/admin/ads');
        return { success: true, message: "Anúncio excluído com sucesso." };
    } catch (error) {
        console.error("Error deleting advertisement:", error);
        return { success: false, message: "Ocorreu um erro ao excluir o anúncio." };
    }
}

// ---- ADMIN PURCHASE ACTIONS ----

export async function getAdminPurchases(): Promise<PurchaseAdminView[]> {
    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        
        const purchases = await db.collection('user_inventory').aggregate([
            { $sort: { purchasedAt: -1 } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'userId',
                    foreignField: 'discordId',
                    as: 'userDetails'
                }
            },
            {
                $unwind: '$userDetails'
            },
            {
                $project: {
                    id: '$_id',
                    userName: '$userDetails.name',
                    userAvatar: '$userDetails.image',
                    itemName: '$itemName',
                    itemType: '$itemType',
                    pricePaid: '$pricePaid',
                    isRedeemed: '$isRedeemed',
                    purchasedAt: '$purchasedAt',
                    redemptionCode: '$redemptionCode',
                    userId: '$userId',
                }
            }
        ]).toArray();

        return JSON.parse(JSON.stringify(purchases));

    } catch (error) {
        console.error("Error fetching admin purchases:", error);
        return [];
    }
}

export async function refundPurchase(inventoryId: string): Promise<{ success: boolean; message: string }> {
    const client = await clientPromise;
    const db = client.db('timaocord');
    const mongoSession = client.startSession();

    try {
        let result: { success: boolean, message: string } | undefined;

        await mongoSession.withTransaction(async () => {
            const inventoryCollection = db.collection<UserInventoryItem>('user_inventory');
            const walletsCollection = db.collection('wallets');
            const notificationsCollection = db.collection('notifications');

            const purchase = await inventoryCollection.findOne({ _id: new ObjectId(inventoryId) }, { session: mongoSession });

            if (!purchase) {
                throw new Error('Compra não encontrada.');
            }

            // Refund the user
            await walletsCollection.updateOne(
                { userId: purchase.userId },
                { $inc: { balance: purchase.pricePaid } },
                { session: mongoSession }
            );

            // Add a transaction for the refund
            const refundTransaction: Transaction = {
                id: new ObjectId().toString(),
                type: 'Ajuste',
                description: `Reembolso da compra: ${purchase.itemName}`,
                amount: purchase.pricePaid,
                date: new Date().toISOString(),
                status: 'Concluído',
            };
            await walletsCollection.updateOne(
                { userId: purchase.userId },
                { $push: { transactions: { $each: [refundTransaction], $sort: { date: -1 } } } },
                { session: mongoSession }
            );

            // Add notification for the user
             const newNotification: Omit<Notification, '_id'> = {
                userId: purchase.userId,
                title: 'Compra Reembolsada',
                description: `Sua compra de "${purchase.itemName}" foi reembolsada. R$ ${purchase.pricePaid.toFixed(2)} foram adicionados à sua carteira.`,
                date: new Date(),
                read: false,
                link: '/wallet',
                isPriority: true,
            };
            await notificationsCollection.insertOne(newNotification as any, { session: mongoSession });

            // Delete the purchase record
            await inventoryCollection.deleteOne({ _id: new ObjectId(inventoryId) }, { session: mongoSession });

            result = { success: true, message: `Compra de ${purchase.itemName} reembolsada para o usuário.` };
        });
        
        await mongoSession.endSession();

        if (result?.success) {
            revalidatePath('/admin/purchases');
            revalidatePath('/wallet');
            revalidatePath('/notifications');
            revalidatePath('/profile');
            return result;
        }

        return { success: false, message: 'A transação falhou.' };

    } catch (error: any) {
        await mongoSession.endSession();
        console.error("Error refunding purchase:", error);
        return { success: false, message: error.message || 'Ocorreu um erro ao reembolsar a compra.' };
    }
}

export async function deletePurchase(inventoryId: string): Promise<{ success: boolean; message: string }> {
     try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const collection = db.collection<UserInventoryItem>('user_inventory');

        const result = await collection.deleteOne({ _id: new ObjectId(inventoryId) });

        if(result.deletedCount === 0) {
            return { success: false, message: "Registro da compra não encontrado." };
        }

        revalidatePath('/admin/purchases');
        revalidatePath('/profile');
        return { success: true, message: "Registro da compra excluído com sucesso." };
    } catch (error) {
        console.error("Error deleting purchase:", error);
        return { success: false, message: "Ocorreu um erro ao excluir o registro." };
    }
}

// ---- ANNOUNCEMENT ACTIONS ----
export async function sendAnnouncement(data: {
    title: string;
    description: string;
    target: 'all' | 'vip' | 'normal';
    link?: string;
}): Promise<{ success: boolean; message: string; userCount: number }> {
    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const usersCollection = db.collection('users');
        const notificationsCollection = db.collection('notifications');

        let userQuery = {};
        if (data.target === 'vip') {
            userQuery = { isVip: true };
        } else if (data.target === 'normal') {
            userQuery = { isVip: { $ne: true } };
        }
        
        const targetUsers = await usersCollection.find(userQuery, { projection: { discordId: 1 } }).toArray();

        if (targetUsers.length === 0) {
            return { success: false, message: 'Nenhum usuário encontrado para o público alvo selecionado.', userCount: 0 };
        }

        const newNotifications = targetUsers.map(user => ({
            insertOne: {
                document: {
                    userId: user.discordId,
                    title: `📢 ${data.title}`,
                    description: data.description,
                    date: new Date(),
                    read: false,
                    link: data.link || '/notifications'
                }
            }
        }));

        const result = await notificationsCollection.bulkWrite(newNotifications);
        
        const insertedCount = result.insertedCount;

        if (insertedCount > 0) {
            revalidatePath('/notifications');
            return { success: true, message: `Comunicado enviado com sucesso para ${insertedCount} usuário(s).`, userCount: insertedCount };
        } else {
             return { success: false, message: 'Nenhuma notificação foi enviada.', userCount: 0 };
        }

    } catch (error) {
        console.error("Error sending announcement:", error);
        return { success: false, message: 'Ocorreu um erro ao enviar o comunicado.', userCount: 0 };
    }
}

// --- POSTS ACTIONS ---

export async function getAdminPosts(): Promise<Post[]> {
    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const posts = await db.collection<Post>('posts').aggregate([
            { $sort: { isPinned: -1, publishedAt: -1 } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'authorId',
                    foreignField: 'discordId',
                    as: 'authorDetails'
                }
            },
            {
                $unwind: {
                    path: '$authorDetails',
                    preserveNullAndEmptyArrays: true // Keep posts even if author is not found
                }
            },
            {
                $project: {
                    title: 1,
                    publishedAt: 1,
                    isPinned: 1,
                    author: {
                        name: '$authorDetails.name',
                        avatarUrl: '$authorDetails.image'
                    },
                }
            }
        ]).toArray();
        return JSON.parse(JSON.stringify(posts));
    } catch (error) {
        console.error('Error fetching admin posts:', error);
        return [];
    }
}

export async function getPostForEdit(id: string): Promise<(Omit<Post, 'authorId' | 'author'> & { authorId?: string }) | null> {
     if (!ObjectId.isValid(id)) return null;
    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const post = await db.collection('posts').findOne({ _id: new ObjectId(id) });
        if (!post) return null;
        return JSON.parse(JSON.stringify(post));
    } catch (error) {
        console.error('Error fetching post for edit:', error);
        return null;
    }
}

export async function upsertPost(data: { id?: string; title: string; content: string; imageUrl?: string | null; isPinned: boolean; }): Promise<{ success: boolean; message: string }> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.discordId) {
        return { success: false, message: "Não autenticado." };
    }
    
    // Check for permissions
    if (!session.user.admin && !session.user.canPost) {
        return { success: false, message: "Acesso negado." };
    }

    const { id, ...postData } = data;
    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const postsCollection = db.collection('posts');
        
        const postToSave = {
            ...postData,
            authorId: session.user.discordId,
        };
        
        let savedPostId: ObjectId;
        let isNewPost = false;

        if (id) {
            await postsCollection.updateOne({ _id: new ObjectId(id) }, { $set: postToSave });
            savedPostId = new ObjectId(id);
        } else {
            isNewPost = true;
            const result = await postsCollection.insertOne({ ...postToSave, publishedAt: new Date() } as any);
            savedPostId = result.insertedId;
        }

        const fullPost = await postsCollection.findOne({ _id: savedPostId });

        if (fullPost && isNewPost) {
           await sendDiscordPostNotification(fullPost as Post, {
               _id: new ObjectId(session.user.id),
               name: session.user.name || 'Usuário',
               avatarUrl: session.user.image || '',
           });
        }

        revalidatePath('/admin/announcements');
        revalidatePath('/news');
        revalidatePath('/');
        return { success: true, message: `Post ${id ? 'atualizado' : 'criado'} com sucesso.` };
    } catch (error) {
        console.error('Error upserting post:', error);
        return { success: false, message: 'Falha ao salvar o post.' };
    }
}

export async function deletePost(id: string): Promise<{ success: boolean; message: string }> {
     try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        await db.collection('posts').deleteOne({ _id: new ObjectId(id) });
        
        revalidatePath('/admin/announcements');
        revalidatePath('/news');
        revalidatePath('/');
        return { success: true, message: 'Post excluído com sucesso.' };
    } catch (error) {
        console.error('Error deleting post:', error);
        return { success: false, message: 'Falha ao excluir o post.' };
    }
}


export async function syncPostsFromDiscord(): Promise<{ success: boolean; message: string; }> {
    const result = await syncDiscordNews();
    if (result.success) {
        revalidatePath('/admin/announcements');
        revalidatePath('/news');
        revalidatePath('/');
    }
    return { success: result.success, message: result.message };
}

// ---- ADMIN EVENT ACTIONS ----

export async function getAdminEvents(): Promise<SiteEvent[]> {
    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const events = await db.collection<SiteEvent>('site_events')
            .find({})
            .sort({ createdAt: -1 })
            .toArray();

        return JSON.parse(JSON.stringify(events));
    } catch (error) {
        console.error("Error fetching admin events:", error);
        return [];
    }
}

export async function upsertEvent(data: Omit<SiteEvent, '_id' | 'createdAt' | 'updatedAt' | 'isActive'> & { id?: string }): Promise<{ success: boolean; message: string }> {
    const { id, ...eventData } = data;
    
    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const collection = db.collection<SiteEvent>('site_events');
        
        const dataToSave: Partial<SiteEvent> = { ...eventData, updatedAt: new Date() };

        if (id) {
            await collection.updateOne(
                { _id: new ObjectId(id) },
                { $set: dataToSave }
            );
        } else {
            // New events are created as inactive by default
            await collection.insertOne(
                { ...dataToSave, isActive: false, createdAt: new Date() } as SiteEvent
            );
        }
        revalidatePath('/admin/events');
        return { success: true, message: `Evento ${id ? 'atualizado' : 'criado'} com sucesso!` };

    } catch (error) {
        console.error("Error upserting event:", error);
        return { success: false, message: "Ocorreu um erro ao salvar o evento." };
    }
}

export async function toggleEventStatus(eventId: string, currentStatus: boolean): Promise<{ success: boolean, message: string }> {
    const client = await clientPromise;
    const db = client.db('timaocord');
    const collection = db.collection<SiteEvent>('site_events');
    const mongoSession = client.startSession();

    const newStatus = !currentStatus;

    try {
        let result: { success: boolean; message: string } | undefined;
        await mongoSession.withTransaction(async () => {
            if (newStatus) { // If activating this event
                // Deactivate all other events
                await collection.updateMany(
                    { _id: { $ne: new ObjectId(eventId) } },
                    { $set: { isActive: false, updatedAt: new Date() } },
                    { session: mongoSession }
                );
            }
            
            // Activate/deactivate the target event
            await collection.updateOne(
                { _id: new ObjectId(eventId) },
                { $set: { isActive: newStatus, updatedAt: new Date() } },
                { session: mongoSession }
            );
            result = { success: true, message: `Evento ${newStatus ? 'ativado' : 'desativado'}.` };
        });
        await mongoSession.endSession();
        revalidatePath('/admin/events');
        if (result) return result;
        throw new Error("Transaction failed to complete.");
    } catch (error) {
        await mongoSession.endSession();
        console.error("Error toggling event status:", error);
        return { success: false, message: 'Falha ao alterar o status do evento.' };
    }
}


export async function deleteEvent(eventId: string): Promise<{ success: boolean; message: string }> {
     try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const collection = db.collection<SiteEvent>('site_events');

        await collection.deleteOne({ _id: new ObjectId(eventId) });

        revalidatePath('/admin/events');
        return { success: true, message: "Evento excluído com sucesso." };
    } catch (error) {
        console.error("Error deleting event:", error);
        return { success: false, message: "Ocorreu um erro ao excluir o evento." };
    }
}

// ---- DATABASE ACTIONS ----

export async function getDbStats(): Promise<{ success: boolean; data?: DbStats, error?: string }> {
    try {
        const client = await clientPromise;
        const db = client.db('timaocord'); // Get the main database for stats
        
        const stats = await db.command({ dbStats: 1, scale: 1024 * 1024 }); // Scale to MB
        
        const dbStats: DbStats = {
            db: stats.db || 'timaocord',
            collections: stats.collections || 0,
            objects: stats.objects || 0,
            dataSize: (stats.dataSize ?? 0).toFixed(2),
            storageSize: (stats.storageSize ?? 0).toFixed(2),
            totalSize: (stats.totalSize ?? 0).toFixed(2),
        };

        return { success: true, data: dbStats };
    } catch (error) {
        const errorMessage = (error instanceof Error) ? error.message : "An unknown error occurred.";
        console.error("Error fetching DB stats:", error);
        return { success: false, error: `Failed to fetch database statistics: ${errorMessage}` };
    }
}

export async function getMemberActivityStats(): Promise<{ success: boolean; data?: MemberActivityStats, error?: string }> {
    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const activityCollection = db.collection('member_activity');

        const now = new Date();
        const todayStart = new Date(now);
        todayStart.setUTCHours(0, 0, 0, 0);

        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(now.getDate() - 7);
        sevenDaysAgo.setUTCHours(0, 0, 0, 0);

        const thirtyDaysAgo = new Date(now);
        thirtyDaysAgo.setDate(now.getDate() - 30);
        thirtyDaysAgo.setUTCHours(0, 0, 0, 0);
        
        const oneYearAgo = new Date(now);
        oneYearAgo.setDate(now.getDate() - 365);
        oneYearAgo.setUTCHours(0, 0, 0, 0);

        const [dailyJoins, dailyLeaves, weeklyJoins, weeklyLeaves, monthlyJoins, monthlyLeaves, annualJoins, annualLeaves, chartData] = await Promise.all([
            activityCollection.countDocuments({ type: 'join', timestamp: { $gte: todayStart } }),
            activityCollection.countDocuments({ type: 'leave', timestamp: { $gte: todayStart } }),
            activityCollection.countDocuments({ type: 'join', timestamp: { $gte: sevenDaysAgo } }),
            activityCollection.countDocuments({ type: 'leave', timestamp: { $gte: sevenDaysAgo } }),
            activityCollection.countDocuments({ type: 'join', timestamp: { $gte: thirtyDaysAgo } }),
            activityCollection.countDocuments({ type: 'leave', timestamp: { $gte: thirtyDaysAgo } }),
            activityCollection.countDocuments({ type: 'join', timestamp: { $gte: oneYearAgo } }),
            activityCollection.countDocuments({ type: 'leave', timestamp: { $gte: oneYearAgo } }),
            activityCollection.aggregate([
                { $match: { timestamp: { $gte: thirtyDaysAgo } } },
                {
                    $group: {
                        _id: { 
                            date: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp", timezone: "America/Sao_Paulo" } },
                            type: '$type'
                        },
                        count: { $sum: 1 }
                    }
                },
                {
                    $group: {
                        _id: '$_id.date',
                        activities: { $push: { type: '$_id.type', count: '$count' } }
                    }
                },
                {
                    $project: {
                        date: '$_id',
                        joins: { $ifNull: [{ $arrayElemAt: [{ $filter: { input: '$activities', as: 'a', cond: { $eq: ['$$a.type', 'join'] } } }, 0] }, { count: 0 }] },
                        leaves: { $ifNull: [{ $arrayElemAt: [{ $filter: { input: '$activities', as: 'a', cond: { $eq: ['$$a.type', 'leave'] } } }, 0] }, { count: 0 }] }
                    }
                },
                 {
                    $project: {
                        _id: 0,
                        date: 1,
                        joins: '$joins.count',
                        leaves: '$leaves.count',
                    }
                },
                { $sort: { date: 1 } }
            ]).toArray()
        ]);
        
        const stats: MemberActivityStats = {
            daily: { joins: dailyJoins, leaves: dailyLeaves, net: dailyJoins - dailyLeaves },
            weekly: { joins: weeklyJoins, leaves: weeklyLeaves, net: weeklyJoins - weeklyLeaves },
            monthly: { joins: monthlyJoins, leaves: monthlyLeaves, net: monthlyJoins - monthlyLeaves },
            annual: { joins: annualJoins, leaves: annualLeaves, net: annualJoins - annualLeaves },
            chartData: chartData.map((d: any) => ({...d, date: new Date(d.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' }) }))
        };

        return { success: true, data: stats };

    } catch (error) {
        const errorMessage = (error instanceof Error) ? error.message : "An unknown error occurred.";
        console.error("Error fetching member activity stats:", error);
        return { success: false, error: `Failed to fetch activity statistics: ${errorMessage}` };
    }
}

export async function cleanupOldData(): Promise<{ success: boolean; message: string; details: string[] }> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const ninetyDaysAgoTimestamp = Math.floor(ninetyDaysAgo.getTime() / 1000);

    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        
        const notificationsCollection = db.collection('notifications');
        const matchesCollection = db.collection('matches');
        const mvpVotingsCollection = db.collection('mvp_votings');
        const betsCollection = db.collection('bets');

        const deletedNotifications = await notificationsCollection.deleteMany({ date: { $lt: thirtyDaysAgo } });
        const deletedMatches = await matchesCollection.deleteMany({ timestamp: { $lt: ninetyDaysAgoTimestamp }, isProcessed: true });
        const deletedVotings = await mvpVotingsCollection.deleteMany({ createdAt: { $lt: ninetyDaysAgo }, status: { $in: ['Finalizado', 'Cancelado'] } });
        const deletedBets = await betsCollection.deleteMany({ settledAt: { $lt: ninetyDaysAgo } });


        const details = [
            `${deletedNotifications.deletedCount} notificações antigas foram excluídas.`,
            `${deletedMatches.deletedCount} partidas antigas foram excluídas.`,
            `${deletedVotings.deletedCount} votações MVP antigas foram excluídas.`,
            `${deletedBets.deletedCount} apostas resolvidas antigas foram excluídas.`,
        ];
        
        revalidatePath('/admin/server');

        return {
            success: true,
            message: "Limpeza de dados concluída com sucesso.",
            details: details
        };
    } catch (error) {
        const errorMessage = (error instanceof Error) ? error.message : "An unknown error occurred.";
        console.error("Error cleaning up old data:", error);
        return { success: false, message: `Falha ao limpar dados antigos: ${errorMessage}`, details: [] };
    }
}


export async function getRecentUsers(): Promise<RecentUser[]> {
    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const users = await db.collection('users').find({})
            .sort({ createdAt: -1 })
            .limit(5)
            .project({ name: 1, image: 1, createdAt: 1 })
            .toArray();
        
        return users
            .filter(user => user.name)
            .map(user => ({
                name: user.name as string,
                avatar: user.image as string,
                joinDate: user.createdAt 
                    ? (user.createdAt as Date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
                    : 'N/A'
            }));
    } catch (error) {
        console.error('Error fetching recent users:', error);
        return [];
    }
}

// ---- PROMO CODE ACTIONS ----

export async function getPromoCodes(): Promise<PromoCode[]> {
    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const codes = await db.collection<PromoCode>('promo_codes')
            .find({})
            .sort({ createdAt: -1 })
            .limit(200) // limit for performance
            .toArray();

        return JSON.parse(JSON.stringify(codes));
    } catch (error) {
        console.error("Error fetching promo codes:", error);
        return [];
    }
}

export async function revokePromoCode(codeId: string): Promise<{ success: boolean; message: string }> {
    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const collection = db.collection<PromoCode>('promo_codes');

        const result = await collection.updateOne(
            { _id: new ObjectId(codeId), status: 'ACTIVE' },
            { $set: { status: 'REVOKED' } }
        );
        
        if (result.modifiedCount === 0) {
            return { success: false, message: 'Código não encontrado ou já não estava ativo.' };
        }

        revalidatePath('/admin/codes');
        return { success: true, message: "Código revogado com sucesso." };
    } catch (error) {
        console.error("Error revoking promo code:", error);
        return { success: false, message: "Ocorreu um erro ao revogar o código." };
    }
}

export async function manualUpdateFixtures(): Promise<{success: boolean, message: string}> {
    return await updateFixturesFromApi();
}

// --- CHAMPIONSHIP ACTIONS ---
export async function getAdminChampionships(): Promise<Championship[]> {
    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const championships = await db.collection<Championship>('championships')
            .find({})
            .sort({ name: 1 })
            .toArray();

        return JSON.parse(JSON.stringify(championships));
    } catch (error) {
        console.error("Error fetching admin championships:", error);
        return [];
    }
}

export async function upsertChampionship(data: { id?: string; name: string; leagueId: number; season: number; isActive: boolean }): Promise<{ success: boolean; message: string }> {
    const { id, ...champData } = data;

    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const collection = db.collection<Championship>('championships');

        const dataToSave: Partial<Championship> = {
            name: champData.name,
            leagueId: champData.leagueId,
            season: champData.season,
            isActive: champData.isActive,
        };

        if (id) {
            await collection.updateOne({ _id: new ObjectId(id) }, { $set: dataToSave });
        } else {
            await collection.insertOne({ ...dataToSave, createdAt: new Date() } as Championship);
        }

        revalidatePath('/admin/championships');
        return { success: true, message: `Campeonato ${id ? 'atualizado' : 'criado'} com sucesso!` };
    } catch (error) {
        console.error("Error upserting championship:", error);
        return { success: false, message: "Ocorreu um erro ao salvar o campeonato." };
    }
}

export async function deleteChampionship(id: string): Promise<{ success: boolean; message: string }> {
    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        await db.collection('championships').deleteOne({ _id: new ObjectId(id) });
        revalidatePath('/admin/championships');
        return { success: true, message: 'Campeonato excluído com sucesso.' };
    } catch (error) {
        console.error("Error deleting championship:", error);
        return { success: false, message: 'Falha ao excluir o campeonato.' };
    }
}
