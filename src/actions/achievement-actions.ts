
'use server';

import clientPromise from '@/lib/mongodb';
import {
    AlertCircle, AlertTriangle, Award, Badge, BarChart2, BrainCircuit, Calendar, Clock, Combine, CornerRightUp, Crown, DollarSign, Eye, FileMinus, Flag, Flame, Gem, Gift, Goal, Heart, HelpCircle, Layers, Medal, MinusCircle, Puzzle, Rocket, Send, Shield, ShieldCheck, ShieldOff, ShoppingCart, Slash, Star, StarHalf, Swords, Target, TrendingUp, Trophy, Umbrella, UserPlus, Users2, Wallet, XCircle, Zap
} from 'lucide-react';
import { revalidatePath } from 'next/cache';
import type { Notification } from '@/types';
import { cache } from 'react';

export type Achievement = {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  hidden?: boolean;
};

// All achievements defined here
const allAchievementsList: Achievement[] = [
    // === Conquistas de Início e Engajamento ===
    { id: 'beginner', name: 'Membro Fundador', description: 'Juntou-se à comunidade FielBet.', icon: UserPlus },
    { id: 'vip_status', name: 'VIP da Fiel', description: 'Tornou-se um membro VIP da comunidade.', icon: Gem, hidden: true },
    { id: 'daily_login_7', name: 'Fiel Presença', description: 'Entrou no site 7 dias seguidos.', icon: Calendar },
    { id: 'daily_login_30', name: 'Hábito Criado', description: 'Entrou no site 30 dias seguidos.', icon: Clock },
    { id: 'friend_invited', name: 'Recrutador', description: 'Convidou um amigo para a plataforma.', icon: Send },
    { id: 'referral_5', name: 'Influência Crescente', description: '5 amigos convidados se registraram.', icon: BarChart2 },

    // === Conquistas de Apostas (Geral) ===
    { id: 'first_bet', name: 'Na Torcida', description: 'Fez sua primeira aposta.', icon: Rocket },
    { id: 'first_win', name: 'Sorte de Principiante', description: 'Ganhou sua primeira aposta.', icon: Trophy },
    { id: 'first_loss', name: 'Faz Parte', description: 'Perdeu sua primeira aposta. Coragem!', icon: Heart },
    { id: 'bet_10', name: 'Apostador Frequente', description: 'Fez 10 apostas.', icon: Badge },
    { id: 'bet_50', name: 'Apostador Viciado', description: 'Fez 50 apostas.', icon: Medal },
    { id: 'win_10', name: 'Pé Quente', description: 'Ganhou 10 apostas.', icon: Award },
    { id: 'win_50', name: 'Campeão Consagrado', description: 'Ganhou 50 apostas.', icon: Trophy },

    // === Conquistas de Apostas (Específicas) ===
    { id: 'first_multiple', name: 'Estrategista', description: 'Fez sua primeira aposta múltipla.', icon: Zap },
    { id: 'multiple_win', name: 'Multiplicador', description: 'Ganhou uma aposta múltipla.', icon: Combine },
    { id: 'multiple_win_5', name: 'Combo Perfeito', description: 'Ganhou 5 apostas múltiplas.', icon: Layers },
    { id: 'high_odds_win', name: 'Quase Impossível', description: 'Ganhou uma aposta com odds acima de 5.0.', icon: StarHalf },
    { id: 'underdog_win', name: 'Contra Tudo e Todos', description: 'Ganhou apostando no azarão (odds > 3.0).', icon: TrendingUp },
    { id: 'low_odds_loss', name: 'Zebraça!', description: 'Perdeu uma aposta com odds abaixo de 1.3.', icon: AlertTriangle },
    { id: 'risk_taker', name: 'Tudo ou Nada', description: 'Apostou todo o saldo disponível.', icon: AlertCircle },
    { id: 'safe_bet', name: 'Cauteloso', description: 'Fez uma aposta com odds abaixo de 1.2.', icon: Shield },
    
    // === Conquistas de Sequências ===
    { id: 'win_streak_5', name: 'Em Alta', description: 'Ganhou 5 apostas seguidas.', icon: Flame },
    { id: 'win_streak_10', name: 'Invencível', description: 'Ganhou 10 apostas seguidas.', icon: ShieldCheck },
    { id: 'lost_streak_5', name: 'Resiliente', description: 'Perdeu 5 apostas seguidas. A maré vai virar!', icon: Umbrella },
    { id: 'streak_breaker', name: 'Fim da Linha', description: 'Interrompeu uma longa sequência de vitórias.', icon: Slash },

    // === Conquistas de Nível e Saldo ===
    { id: 'level_5', name: 'Veterano', description: 'Alcançou o nível 5.', icon: Star },
    { id: 'level_10', name: 'Lenda', description: 'Alcançou o nível 10.', icon: Crown },
    { id: 'balance_10k', name: 'Endinheirado', description: 'Alcançou um saldo de R$ 10.000.', icon: Wallet },
    { id: 'balance_zero', name: 'Recomeço', description: 'Bateu na trave! Chegou a R$ 0, mas a próxima pode ser a boa.', icon: MinusCircle },

    // === Conquistas de Recursos da Plataforma ===
    { id: 'first_purchase', name: 'Comprador Compulsivo', description: 'Fez sua primeira compra na Loja.', icon: ShoppingCart },
    { id: 'ad_remover', name: 'Paz Interior', description: 'Comprou o item de remoção de anúncios.', icon: ShieldOff },
    { id: 'first_mvp_vote', name: 'Olho de Tandera', description: 'Votou pela primeira vez no MVP da partida.', icon: Eye },
    { id: 'first_bolao', name: 'Pitonisa', description: 'Participou de um Bolão pela primeira vez.', icon: Swords },
    { id: 'event_participation', name: 'Festeiro', description: 'Participou de um evento especial de XP.', icon: Gift },

    // === Conquistas de Minigames ===
    { id: 'win_quiz', name: 'Gênio do Timão', description: 'Venceu uma rodada de Quiz.', icon: HelpCircle },
    { id: 'win_player_game', name: 'Detetive da Bola', description: 'Acertou o jogador misterioso.', icon: BrainCircuit },
    { id: 'win_forca', name: 'Mestre das Palavras', description: 'Venceu uma rodada do jogo da Forca.', icon: Puzzle },

    // === Conquistas de Apostas em Mercados Específicos ===
    { id: 'bet_derby', name: 'Clássico é Clássico', description: 'Apostou em um clássico do futebol.', icon: Target },
    { id: 'bet_on_final', name: 'Decisão', description: 'Apostou em uma final de campeonato.', icon: Flag },
    { id: 'goal_bet', name: 'Na Rede', description: 'Fez uma aposta no mercado de gols.', icon: Goal },
    { id: 'corner_bet', name: 'Escanteando', description: 'Fez uma aposta no mercado de escanteios.', icon: CornerRightUp },
    { id: 'card_bet', name: 'Cartão Amarelo', description: 'Fez uma aposta no mercado de cartões.', icon: FileMinus },
    { id: 'bet_cancelled', name: 'Sem Jogo', description: 'Teve uma aposta cancelada.', icon: XCircle },
];

export async function getAllAchievements(): Promise<Achievement[]> {
    return allAchievementsList;
}

export const getUserAchievements = cache(async (userId: string): Promise<string[]> => {
    if (!userId) return [];
    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const usersCollection = db.collection('users');
        const user = await usersCollection.findOne({ discordId: userId });
        return user?.unlockedAchievements || [];
    } catch (error) {
        console.error('Error fetching user achievements:', error);
        return [];
    }
});

export async function grantAchievement(userId: string, achievementId: string) {
    if (!userId || !achievementId) return;

    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const usersCollection = db.collection('users');

        const user = await usersCollection.findOne({ discordId: userId });

        if (user && (!user.unlockedAchievements || !user.unlockedAchievements.includes(achievementId))) {
            const achievement = allAchievementsList.find(a => a.id === achievementId);
            if (!achievement) return; // Don't grant non-existent achievements

            await usersCollection.updateOne(
                { discordId: userId },
                { $addToSet: { unlockedAchievements: achievementId } }
            );

            // Create a notification for the user
            const notificationsCollection = db.collection('notifications');
            const newNotification: Omit<Notification, '_id'> = {
                userId: userId,
                title: '🏆 Conquista Desbloqueada!',
                description: `Você ganhou a conquista: "${achievement.name}".`,
                date: new Date(),
                read: false,
                link: '/profile',
                isPriority: true,
            };
            await notificationsCollection.insertOne(newNotification as any);

            revalidatePath('/profile');
            revalidatePath('/notifications');
        }
    } catch (error) {
        console.error(`Error granting achievement ${achievementId} to user ${userId}:`, error);
    }
}
