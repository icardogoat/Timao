
'use server';

import { getServerSession } from 'next-auth/next';
import clientPromise from '@/lib/mongodb';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import type { BetInSlip, Transaction, PlacedBet, Match } from '@/types';
import { revalidatePath } from 'next/cache';
import { ObjectId } from 'mongodb';
import { translateMarketData } from '@/lib/translations';
import { grantAchievement } from './achievement-actions';
import { cache } from 'react';


interface PlaceBetResult {
  success: boolean;
  message: string;
  newBalance?: number;
}

export async function placeBet(betsInSlip: BetInSlip[], stake: number): Promise<PlaceBetResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.discordId) {
    return { success: false, message: 'Você precisa estar logado para apostar.' };
  }

  const userId = session.user.discordId;

  if (betsInSlip.length === 0 || stake <= 0) {
    return { success: false, message: 'Aposta inválida.' };
  }

  const client = await clientPromise;
  const db = client.db('timaocord');
  const mongoSession = client.startSession();

  let finalResult: PlaceBetResult | undefined;

  try {
    await mongoSession.withTransaction(async () => {
      const walletsCollection = db.collection('wallets');
      const betsCollection = db.collection('bets');
      const userStatsCollection = db.collection('user_stats');
      const matchesCollection = db.collection('matches');

      // --- Security Check: Validate matches are still open for betting ---
      const nowTimestamp = Math.floor(Date.now() / 1000);
      const matchIds = betsInSlip.map(b => b.matchId);
      const matchesFromDb = await matchesCollection.find({ _id: { $in: matchIds } }, { session: mongoSession }).toArray();

      if (matchesFromDb.length !== matchIds.length) {
          throw new Error('Uma ou mais partidas na sua aposta não foram encontradas ou não estão mais disponíveis.');
      }

      for (const match of matchesFromDb) {
          if (match.status !== 'NS' || match.timestamp < nowTimestamp) {
              throw new Error(`Apostas para a partida ${match.homeTeam} vs ${match.awayTeam} já foram encerradas.`);
          }
      }
      // --- End Security Check ---

      const userWallet = await walletsCollection.findOne({ userId }, { session: mongoSession });

      if (!userWallet || userWallet.balance < stake) {
        throw new Error('Saldo insuficiente.');
      }
      
      const totalOdds = betsInSlip.reduce((acc, bet) => acc * parseFloat(bet.odd.value), 1);
      const potentialWinnings = stake * totalOdds;
      const description = betsInSlip.length > 1 ? `Múltipla (${betsInSlip.length} seleções)` : `${betsInSlip[0].teamA} vs ${betsInSlip[0].teamB}`;

      const newPlacedBet: Omit<PlacedBet, '_id'> = {
        userId: userId,
        bets: betsInSlip.map(b => ({
          matchId: b.matchId,
          matchTime: b.matchTime,
          teamA: b.teamA,
          teamB: b.teamB,
          league: b.league,
          marketName: b.marketName,
          selection: b.odd.label,
          oddValue: b.odd.value,
        })),
        stake,
        potentialWinnings,
        totalOdds,
        status: 'Em Aberto',
        createdAt: new Date(),
      };
      
      await betsCollection.insertOne(newPlacedBet as any, { session: mongoSession });
      
      // Update user stats
      await userStatsCollection.updateOne(
        { userId },
        { 
            $inc: { 
                totalBets: 1, 
                totalWagered: stake 
            } 
        },
        { upsert: true, session: mongoSession }
      );

      const newTransaction: Transaction = {
        id: new ObjectId().toString(),
        type: 'Aposta',
        description,
        amount: -stake,
        date: new Date().toISOString(),
        status: 'Concluído',
      };
      
      const newBalance = userWallet.balance - stake;

      await walletsCollection.updateOne(
        { userId },
        {
          $set: { balance: newBalance },
          $push: { transactions: { $each: [newTransaction], $sort: { date: -1 } } },
        },
        { session: mongoSession }
      );
      
      // Set result on successful transaction
      finalResult = { success: true, message: 'Aposta realizada com sucesso!', newBalance };
    });

    if (finalResult?.success) {
        // Grant achievements
        await grantAchievement(userId, 'first_bet');
        if (betsInSlip.length > 1) {
            await grantAchievement(userId, 'first_multiple');
        }

        revalidatePath('/my-bets');
        revalidatePath('/wallet');
        revalidatePath('/profile');
        
        return {
            success: finalResult.success,
            message: finalResult.message,
            newBalance: finalResult.newBalance,
        };
    }

    // If finalResult is not set, it means transaction failed without throwing an expected error.
    return { success: false, message: "A transação falhou por um motivo desconhecido." };

  } catch (error: any) {
    return { success: false, message: error.message || 'Ocorreu um erro ao processar sua aposta.' };
  } finally {
    await mongoSession.endSession();
  }
}

export const getAvailableLeagues = cache(async (): Promise<string[]> => {
    try {
        const client = await clientPromise;
        const db = client.db("timaocord");
        const championshipsCollection = db.collection("championships");
        
        const activeChampionships = await championshipsCollection.find({ isActive: true }).project({ name: 1 }).toArray();
        
        return activeChampionships.map(c => c.name);
    } catch (error) {
        console.error('Failed to fetch available leagues:', error);
        return [];
    }
});

const MATCHES_PER_PAGE = 6;

type DbMatch = {
  _id: number;
  homeTeam: string;
  homeLogo: string;
  awayTeam: string;
  awayLogo: string;
  league: string;
  timestamp: number;
  isFinished: boolean;
  markets: {
    name: string;
    odds: { label: string; value: string }[];
  }[];
  status: string;
  goals: {
    home: number | null;
    away: number | null;
  };
};

export async function getMatches({ league, page = 1 }: { league?: string; page?: number; }): Promise<Match[]> {
  try {
    const client = await clientPromise;
    const db = client.db("timaocord");
    const matchesCollection = db.collection<DbMatch>("matches");

    const timeZone = 'America/Sao_Paulo';

    // Get the current date in Brasília time zone to correctly define "today".
    const nowInBrasilia = new Date(new Date().toLocaleString('en-US', { timeZone }));
    
    // Get the start of today in Brasília time.
    const start = new Date(nowInBrasilia);
    start.setHours(0, 0, 0, 0);

    // Get the end of tomorrow in Brasília time.
    const end = new Date(nowInBrasilia);
    end.setDate(end.getDate() + 1);
    end.setHours(23, 59, 59, 999);

    // .getTime() is always UTC-based, so this gives us the correct timestamp range for the query.
    const startTimestamp = Math.floor(start.getTime() / 1000);
    const endTimestamp = Math.floor(end.getTime() / 1000);

    const timeRangeQuery = {
      timestamp: { $gte: startTimestamp, $lte: endTimestamp },
    };
    
    const displayQuery = league ? { ...timeRangeQuery, league: league } : timeRangeQuery;
    const skip = (page - 1) * MATCHES_PER_PAGE;

    // Define statuses for sorting
    const finishedOrPostponedStatuses = ['FT', 'AET', 'PEN', 'PST', 'CANC', 'ABD', 'AWD', 'WO'];
    
    const aggregationPipeline: any[] = [
        { $match: displayQuery },
        {
            $addFields: {
                // This field will determine the primary sort order
                sortOrder: {
                    $switch: {
                        branches: [
                            {
                                // Upcoming games are second
                                case: { $eq: ['$status', 'NS'] },
                                then: 2 
                            },
                            {
                                // Finished or Postponed are last
                                case: { $in: ['$status', finishedOrPostponedStatuses] },
                                then: 3
                            }
                        ],
                        // Live games are first
                        default: 1
                    }
                },
                // This field will handle the secondary sort direction.
                // For finished games, we want newest first (descending timestamp).
                // For all others, we want oldest/soonest first (ascending timestamp).
                // By negating the timestamp for finished games, we can use a single ascending sort.
                timeSort: {
                    $cond: {
                        if: { $in: ['$status', finishedOrPostponedStatuses] },
                        then: { $multiply: ['$timestamp', -1] }, // This makes recent (higher) timestamps smaller negatives
                        else: '$timestamp'
                    }
                }
            }
        },
        {
            $sort: {
                sortOrder: 1, // 1 (Live), 2 (Upcoming), 3 (Finished)
                timeSort: 1  // Ascending on our conditional time field
            }
        },
        { $skip: skip },
        { $limit: MATCHES_PER_PAGE }
    ];

    const dbMatches = await matchesCollection.aggregate(aggregationPipeline).toArray();
    
    // Get date parts for today and tomorrow in Brasília time for comparison.
    const todayDatePart = nowInBrasilia.toLocaleDateString('pt-BR', { timeZone, day: '2-digit', month: '2-digit', year: 'numeric' });

    const tomorrowInBrasilia = new Date(nowInBrasilia);
    tomorrowInBrasilia.setDate(nowInBrasilia.getDate() + 1);
    const tomorrowDatePart = tomorrowInBrasilia.toLocaleDateString('pt-BR', { timeZone, day: '2-digit', month: '2-digit', year: 'numeric' });

    const matches: Match[] = (dbMatches as DbMatch[]).map((dbMatch) => {
      const date = new Date(dbMatch.timestamp * 1000);
      let timeString: string;
      
      const matchTimePart = date.toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone,
      });

      const matchDatePart = date.toLocaleDateString('pt-BR', { timeZone, day: '2-digit', month: '2-digit', year: 'numeric' });

      if (matchDatePart === todayDatePart) {
        timeString = `Hoje, ${matchTimePart}`;
      } else if (matchDatePart === tomorrowDatePart) {
        timeString = `Amanhã, ${matchTimePart}`;
      } else {
        // Fallback for other dates, correctly formatted for Brasília timezone.
        timeString = `${date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone })}, ${matchTimePart}`;
      }
      
      const translatedMarkets = (dbMatch.markets || []).map(translateMarketData);

      return {
        id: dbMatch._id,
        teamA: {
          name: dbMatch.homeTeam,
          logo: dbMatch.homeLogo || 'https://placehold.co/40x40.png',
        },
        teamB: {
          name: dbMatch.awayTeam,
          logo: dbMatch.awayLogo || 'https://placehold.co/40x40.png',
        },
        time: timeString,
        league: dbMatch.league,
        markets: translatedMarkets,
        status: dbMatch.status,
        goals: dbMatch.goals,
        isFinished: dbMatch.isFinished,
        timestamp: dbMatch.timestamp,
      };
    });

    return matches;
  } catch (error) {
    console.error('Failed to fetch matches from MongoDB:', error);
    return [];
  }
}
