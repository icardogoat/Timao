
'use server';

import clientPromise from '@/lib/mongodb';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getServerSession } from 'next-auth/next';
import { revalidatePath } from 'next/cache';
import type { MvpVoting, Transaction } from '@/types';
import { ObjectId } from 'mongodb';
import { grantAchievement } from './achievement-actions';

const VOTE_REWARD = 100;

export async function getActiveVotings(): Promise<MvpVoting[]> {
    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const mvpVotingsCollection = db.collection<MvpVoting>('mvp_votings');

        const votings = await mvpVotingsCollection
            .find({})
            .sort({ createdAt: -1 })
            .toArray();

        return JSON.parse(JSON.stringify(votings));
    } catch (error) {
        console.error('Error fetching active MVP votings:', error);
        return [];
    }
}

export async function castVote(votingId: string, playerId: number): Promise<{ success: boolean; message: string }> {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return { success: false, message: 'Você precisa estar logado para votar.' };
    }
    if (!session.user.canAccessMvp) {
        return { success: false, message: 'Você não tem nível suficiente para participar da votação MVP.' };
    }
    const { discordId } = session.user;

    const client = await clientPromise;
    const db = client.db('timaocord');
    const mongoSession = client.startSession();

    try {
        let result: { success: boolean, message: string } | undefined;
        
        await mongoSession.withTransaction(async () => {
            const mvpVotingsCollection = db.collection<MvpVoting>('mvp_votings');
            const walletsCollection = db.collection('wallets');

            const voting = await mvpVotingsCollection.findOne({ _id: new ObjectId(votingId) }, { session: mongoSession });
            if (!voting || voting.status !== 'Aberto') {
                throw new Error('Esta votação não está mais aberta.');
            }

            if (voting.votes.some(v => v.userId === discordId)) {
                throw new Error('Você já votou nesta partida.');
            }
            
            // Add vote to voting document
            await mvpVotingsCollection.updateOne(
                { _id: new ObjectId(votingId) },
                {
                    $push: {
                        votes: {
                            userId: discordId,
                            playerId: playerId,
                            votedAt: new Date(),
                        }
                    }
                },
                { session: mongoSession }
            );

            // Grant reward to user
            const newTransaction: Transaction = {
                id: new ObjectId().toString(),
                type: 'Bônus',
                description: `Recompensa por votar no MVP: ${voting.homeTeam} vs ${voting.awayTeam}`,
                amount: VOTE_REWARD,
                date: new Date().toISOString(),
                status: 'Concluído',
            };

            await walletsCollection.updateOne(
                { userId: discordId },
                {
                    $inc: { balance: VOTE_REWARD },
                    $push: { transactions: { $each: [newTransaction], $sort: { date: -1 } } },
                },
                { session: mongoSession }
            );
            
            result = { success: true, message: 'Voto computado com sucesso! Você ganhou R$ 100,00.' };
        });

        await mongoSession.endSession();

        if (result?.success) {
            await grantAchievement(discordId, 'first_mvp_vote');
            revalidatePath('/mvp');
            revalidatePath('/wallet');
            return result;
        }

        return { success: false, message: 'A transação falhou.' };

    } catch (error: any) {
        await mongoSession.endSession();
        return { success: false, message: error.message || 'Ocorreu um erro ao registrar seu voto.' };
    }
}
