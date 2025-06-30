

'use server';

import clientPromise from '@/lib/mongodb';
import { revalidatePath } from 'next/cache';
import { ObjectId } from 'mongodb';
import type { PlayerGuessingGame } from '@/types';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { generatePlayerGame } from '@/ai/flows/player-generator-flow';

export async function getPlayerGames(): Promise<PlayerGuessingGame[]> {
    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const games = await db.collection<PlayerGuessingGame>('player_guessing_games')
            .find({})
            .sort({ createdAt: -1 })
            .toArray();

        return JSON.parse(JSON.stringify(games));
    } catch (error) {
        console.error("Error fetching player games:", error);
        return [];
    }
}

type UpsertData = Omit<PlayerGuessingGame, '_id' | 'createdAt' | 'createdBy' | 'status' | 'startedAt' | 'winnerId' | 'winnerName' | 'winnerAvatar'> & { id?: string };

export async function upsertPlayerGame(data: UpsertData): Promise<{ success: boolean; message: string }> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.admin) {
        return { success: false, message: 'Acesso negado.' };
    }

    const { id, ...gameData } = data;

    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const collection = db.collection<PlayerGuessingGame>('player_guessing_games');

        if (id) {
            await collection.updateOne(
                { _id: new ObjectId(id) },
                { $set: gameData }
            );
        } else {
            await collection.insertOne({
                ...gameData,
                status: 'draft',
                createdBy: session.user.discordId,
                createdAt: new Date(),
            } as PlayerGuessingGame);
        }
        revalidatePath('/admin/player-game');
        return { success: true, message: `Jogo ${id ? 'atualizado' : 'criado'} com sucesso!` };
    } catch (error) {
        console.error("Error upserting player game:", error);
        return { success: false, message: "Ocorreu um erro ao salvar o jogo." };
    }
}

export async function deletePlayerGame(id: string): Promise<{ success: boolean; message: string }> {
    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        await db.collection('player_guessing_games').deleteOne({ _id: new ObjectId(id) });
        revalidatePath('/admin/player-game');
        return { success: true, message: 'Jogo excluído com sucesso.' };
    } catch (error) {
        console.error("Error deleting player game:", error);
        return { success: false, message: "Ocorreu um erro ao excluir o jogo." };
    }
}

export async function setPlayerGameStatus(id: string, status: 'draft' | 'active'): Promise<{ success: boolean, message: string }> {
    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const collection = db.collection<PlayerGuessingGame>('player_guessing_games');

        if (status === 'active') {
             const gameToActivate = await collection.findOne({ _id: new ObjectId(id) });
            if (!gameToActivate?.channelId) {
                 return { success: false, message: "Não é possível iniciar o jogo. Um canal precisa ser selecionado nas configurações do jogo." };
            }
            // Ensure no other game is active
            const activeGame = await collection.findOne({ status: 'active' });
            if (activeGame) {
                return { success: false, message: "Já existe um jogo ativo. Finalize-o antes de iniciar um novo." };
            }
        }
        
        await collection.updateOne(
            { _id: new ObjectId(id) },
            { $set: { status: status, startedAt: status === 'active' ? new Date() : undefined } }
        );

        revalidatePath('/admin/player-game');
        const message = status === 'active' 
            ? "Jogo iniciado! O bot agora assumirá o controle."
            : "Jogo movido para rascunho.";
        return { success: true, message };

    } catch (error) {
        console.error(`Error setting player game ${id} to ${status}:`, error);
        return { success: false, message: "Ocorreu um erro ao alterar o status do jogo." };
    }
}

export async function generatePlayerGameByAI(theme: string) {
    try {
        const result = await generatePlayerGame({ theme });
        return { success: true, data: result };
    } catch (error) {
        console.error("Error generating player game by AI:", error);
        const errorMessage = (error instanceof Error) ? error.message : "Um erro desconhecido ocorreu.";
        return { success: false, message: `Falha na IA: ${errorMessage}` };
    }
}
