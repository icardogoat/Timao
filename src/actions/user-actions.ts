

'use server';

import clientPromise from '@/lib/mongodb';
import type { UserRanking, ActiveBettorRanking, TopLevelUserRanking, PlacedBet, UserLevel, RichestUserRanking, InviterRanking, UserStats } from '@/types';
import type { WithId } from 'mongodb';
import { cache } from 'react';
import { getLevelConfig } from './level-actions';

const defaultStats: UserStats = { 
    userId: '', 
    totalWagered: 0, 
    totalBets: 0, 
    totalWinnings: 0, 
    totalLosses: 0, 
    betsWon: 0, 
    betsLost: 0 
};

// This function now primarily reads from the aggregated stats collection.
// It includes a self-healing fallback for users who haven't had their stats migrated.
export const getUserStats = cache(async (userId: string): Promise<UserStats> => {
    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const userStatsCollection = db.collection<UserStats>('user_stats');

        const userStats = await userStatsCollection.findOne({ userId });

        if (userStats) {
            // Remove the _id and merge with defaults to ensure all fields are present
            const { _id, ...stats } = userStats;
            return { ...defaultStats, ...stats, userId };
        }

        // --- Fallback for existing users without an aggregated doc ---
        // This part can be removed after all users have placed at least one bet
        // with the new system, or after running a one-time migration script.
        const betsCollection = db.collection<WithId<PlacedBet>>('bets');
        const userBets = await betsCollection.find({ userId }).toArray();
        if (userBets.length === 0) {
            return { ...defaultStats, userId };
        }

        const calculatedStats: UserStats = {
            userId,
            totalBets: userBets.length,
            totalWagered: userBets.reduce((sum, bet) => sum + bet.stake, 0),
            betsWon: userBets.filter(bet => bet.status === 'Ganha').length,
            betsLost: userBets.filter(bet => bet.status === 'Perdida').length,
            totalWinnings: userBets.filter(b => b.status === 'Ganha').reduce((sum, bet) => sum + bet.potentialWinnings, 0),
            totalLosses: userBets.filter(b => b.status === 'Perdida').reduce((sum, bet) => sum + bet.stake, 0),
        };

        // Create the aggregated document for future queries
        await userStatsCollection.updateOne(
            { userId },
            { $set: calculatedStats },
            { upsert: true }
        );

        return calculatedStats;

    } catch (error) {
        console.error('Error fetching user stats:', error);
        return { ...defaultStats, userId };
    }
});

export const getTopWinners = cache(async (): Promise<UserRanking[]> => {
    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const userStatsCollection = db.collection('user_stats');

        const rankingsData = await userStatsCollection.aggregate([
            { $match: { totalWinnings: { $gt: 0 } } },
            { $sort: { totalWinnings: -1 } },
            { $limit: 50 },
            {
                $lookup: {
                    from: 'users',
                    localField: 'userId',
                    foreignField: 'discordId',
                    as: 'userDetails'
                }
            },
            { $unwind: '$userDetails' },
            {
                $project: {
                    _id: 0,
                    discordId: '$userDetails.discordId',
                    name: '$userDetails.name',
                    avatar: '$userDetails.image',
                    winnings: '$totalWinnings',
                    isVip: '$userDetails.isVip',
                }
            }
        ]).toArray();
        
        return rankingsData.map((user, index) => ({
            rank: index + 1,
            discordId: user.discordId as string,
            name: user.name as string,
            avatar: user.avatar as string,
            winnings: user.winnings as number,
            isVip: user.isVip as boolean ?? false,
        }));

    } catch (error) {
        console.error('Error fetching top winners:', error);
        return [];
    }
});

export const getMostActiveBettors = cache(async (): Promise<ActiveBettorRanking[]> => {
    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const userStatsCollection = db.collection('user_stats');

        const rankingsData = await userStatsCollection.aggregate([
            { $sort: { totalBets: -1 } },
            { $limit: 50 },
            {
                $lookup: {
                    from: 'users',
                    localField: 'userId',
                    foreignField: 'discordId',
                    as: 'userDetails'
                }
            },
            { $unwind: '$userDetails' },
            {
                $project: {
                    _id: 0,
                    discordId: '$userDetails.discordId',
                    name: '$userDetails.name',
                    avatar: '$userDetails.image',
                    totalBets: 1,
                    isVip: '$userDetails.isVip',
                }
            }
        ]).toArray();
        
        return rankingsData.map((user, index) => ({
            rank: index + 1,
            discordId: user.discordId as string,
            name: user.name as string,
            avatar: user.avatar as string,
            totalBets: user.totalBets as number,
            isVip: user.isVip as boolean ?? false,
        }));

    } catch (error) {
        console.error('Error fetching most active bettors:', error);
        return [];
    }
});

export const getTopLevelUsers = cache(async (): Promise<TopLevelUserRanking[]> => {
    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const usersCollection = db.collection('users');

        const rankingsData = await usersCollection.find({})
            .sort({ xp: -1 })
            .limit(50)
            .toArray();
        
        return rankingsData.map((user, index) => ({
            rank: index + 1,
            discordId: user.discordId as string,
            name: user.name as string,
            avatar: user.image as string,
            level: user.level ?? 1,
            xp: user.xp ?? 0,
            isVip: user.isVip as boolean ?? false,
        }));

    } catch (error) {
        console.error('Error fetching top level users:', error);
        return [];
    }
});

export const getRichestUsers = cache(async (): Promise<RichestUserRanking[]> => {
    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const walletsCollection = db.collection('wallets');

        const rankingsData = await walletsCollection.aggregate([
            { $sort: { balance: -1 } },
            { $limit: 50 },
            {
                $lookup: {
                    from: 'users',
                    localField: 'userId',
                    foreignField: 'discordId',
                    as: 'userDetails'
                }
            },
            { $unwind: { path: '$userDetails', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: 0,
                    discordId: '$userDetails.discordId',
                    name: '$userDetails.name',
                    avatar: '$userDetails.image',
                    balance: 1,
                    isVip: '$userDetails.isVip',
                }
            }
        ]).toArray();
        
        return rankingsData
            .filter(user => user.name)
            .map((user, index) => ({
                rank: index + 1,
                discordId: user.discordId as string,
                name: user.name as string,
                avatar: user.avatar as string,
                balance: user.balance as number,
                isVip: user.isVip as boolean ?? false,
            }));

    } catch (error) {
        console.error('Error fetching richest users:', error);
        return [];
    }
});

export const getUserLevel = cache(async (userId: string): Promise<UserLevel> => {
    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const usersCollection = db.collection('users');
        const [user, levelThresholds] = await Promise.all([
            usersCollection.findOne({ discordId: userId }),
            getLevelConfig()
        ]);
        
        const xp = user?.xp ?? 0;

        let currentLevel = 1;
        let currentLevelName = levelThresholds[0]?.name ?? 'Iniciante';
        let xpForNextLevel = levelThresholds[1]?.xp ?? Infinity;
        let xpForCurrentLevel = 0;

        for (let i = levelThresholds.length - 1; i >= 0; i--) {
            if (xp >= levelThresholds[i].xp) {
                currentLevel = levelThresholds[i].level;
                currentLevelName = levelThresholds[i].name;
                xpForCurrentLevel = levelThresholds[i].xp;
                xpForNextLevel = levelThresholds[i + 1]?.xp ?? levelThresholds[i].xp;
                break;
            }
        }
        
        // Self-correcting: if the level in DB is not correct, update it.
        if (user && user.level !== currentLevel) {
            await usersCollection.updateOne({ _id: user._id }, { $set: { level: currentLevel } });
        }

        if (currentLevel === levelThresholds[levelThresholds.length - 1].level) {
            xpForNextLevel = xpForCurrentLevel;
        }

        const xpInCurrentLevel = xp - xpForCurrentLevel;
        const xpNeededForNextLevel = xpForNextLevel - xpForCurrentLevel;
        
        const progress = xpNeededForNextLevel > 0 ? Math.floor((xpInCurrentLevel / xpNeededForNextLevel) * 100) : 100;

        return {
            level: currentLevel,
            levelName: currentLevelName,
            xp,
            xpForNextLevel: xpForNextLevel,
            progress: Math.min(progress, 100),
        };
    } catch (error) {
        console.error(`Error fetching user level for ${userId}:`, error);
        return { level: 1, levelName: 'Iniciante', xp: 0, xpForNextLevel: 500, progress: 0 };
    }
});

export const getTopInviters = cache(async (): Promise<InviterRanking[]> => {
    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const invitesCollection = db.collection('invites');

        const rankingsData = await invitesCollection.aggregate([
            {
                $group: {
                    _id: '$inviterId',
                    inviteCount: { $sum: 1 }
                }
            },
            { $sort: { inviteCount: -1 } },
            { $limit: 50 },
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
                    inviterId: '$_id',
                    name: '$userDetails.name',
                    avatar: '$userDetails.image',
                    inviteCount: 1,
                    isVip: '$userDetails.isVip',
                }
            }
        ]).toArray();
        
        return rankingsData.map((user, index) => ({
            rank: index + 1,
            inviterId: user.inviterId as string,
            name: user.name as string,
            avatar: user.avatar as string,
            inviteCount: user.inviteCount as number,
            isVip: user.isVip as boolean ?? false,
        }));

    } catch (error) {
        console.error('Error fetching top inviters:', error);
        return [];
    }
});
