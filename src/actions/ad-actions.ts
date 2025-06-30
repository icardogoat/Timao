
'use server';

import { getServerSession } from 'next-auth/next';
import clientPromise from '@/lib/mongodb';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import type { Advertisement, Transaction } from '@/types';
import { revalidatePath } from 'next/cache';
import { ObjectId } from 'mongodb';

const DAILY_REWARD_AMOUNT = 100;

export async function getDisplayAdvertisements(): Promise<Advertisement[]> {
    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const adsCollection = db.collection<Advertisement>('advertisements');

        const now = new Date();
        const ads = await adsCollection.find({
            status: 'active',
            $and: [
                {
                    $or: [
                        { startDate: { $lte: now } },
                        { startDate: { $exists: false } },
                        { startDate: null }
                    ]
                },
                {
                     $or: [
                        { endDate: { $gt: now } },
                        { endDate: { $exists: false } },
                        { endDate: null }
                    ]
                }
            ]
        }).toArray();

        // Return serializable data
        return JSON.parse(JSON.stringify(ads));
    } catch (error) {
        console.error('Error fetching display advertisements:', error);
        return [];
    }
}

export async function claimDailyReward(): Promise<{ success: boolean; message: string }> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.discordId) {
        return { success: false, message: 'Usuário não autenticado.' };
    }

    const userId = session.user.discordId;

    const client = await clientPromise;
    const db = client.db('timaocord');
    const mongoSession = client.startSession();

    try {
        let result: { success: boolean; message: string } | undefined;

        await mongoSession.withTransaction(async () => {
            const usersCollection = db.collection('users');
            const walletsCollection = db.collection('wallets');
            
            // Securely fetch user data from DB inside the transaction
            const user = await usersCollection.findOne({ discordId: userId }, { session: mongoSession });

            if (!user) {
                throw new Error("Usuário não encontrado.");
            }
            
            // Check last claim date from the database, not the potentially stale session
            const today = new Date();
            today.setUTCHours(0, 0, 0, 0); // Use UTC hours for consistent comparison
            const userLastClaimed = user.dailyRewardLastClaimed ? new Date(user.dailyRewardLastClaimed) : null;
            if (userLastClaimed && userLastClaimed >= today) {
                throw new Error('Você já resgatou sua recompensa diária hoje.');
            }

            // Give reward
             const newTransaction: Transaction = {
                id: new ObjectId().toString(),
                type: 'Bônus',
                description: 'Recompensa Diária por Anúncio',
                amount: DAILY_REWARD_AMOUNT,
                date: new Date().toISOString(),
                status: 'Concluído',
            };

            await walletsCollection.updateOne(
                { userId },
                {
                    $inc: { balance: DAILY_REWARD_AMOUNT },
                    $push: { transactions: { $each: [newTransaction], $sort: { date: -1 } } },
                },
                { session: mongoSession, upsert: true }
            );

            // Update user's last claimed date
            await usersCollection.updateOne(
                { _id: user._id },
                { $set: { dailyRewardLastClaimed: new Date() } },
                { session: mongoSession }
            );

            result = { success: true, message: `Você ganhou R$ ${DAILY_REWARD_AMOUNT.toFixed(2)}!` };
        });

        await mongoSession.endSession();

        if (result?.success) {
            revalidatePath('/wallet');
            return result;
        }
        
        return { success: false, message: 'A transação falhou.' };

    } catch (error: any) {
        await mongoSession.endSession();
        return { success: false, message: error.message || 'Ocorreu um erro ao resgatar a recompensa.' };
    }
}
