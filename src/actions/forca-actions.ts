
'use server';

import clientPromise from '@/lib/mongodb';
import { revalidatePath } from 'next/cache';
import { ObjectId } from 'mongodb';
import type { ForcaGameWord } from '@/types';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { generateForcaGame } from '@/ai/flows/forca-generator-flow';

export async function getForcaWords(): Promise<ForcaGameWord[]> {
    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const words = await db.collection<ForcaGameWord>('forca_words')
            .find({})
            .sort({ createdAt: -1 })
            .toArray();

        return JSON.parse(JSON.stringify(words));
    } catch (error) {
        console.error("Error fetching forca words:", error);
        return [];
    }
}

type UpsertData = Omit<ForcaGameWord, '_id' | 'createdAt' | 'createdBy'> & { id?: string };

export async function upsertForcaWord(data: UpsertData): Promise<{ success: boolean; message: string }> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.admin) {
        return { success: false, message: 'Acesso negado.' };
    }

    const { id, ...wordData } = data;

    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const collection = db.collection<ForcaGameWord>('forca_words');

        if (id) {
            await collection.updateOne(
                { _id: new ObjectId(id) },
                { $set: wordData }
            );
        } else {
            await collection.insertOne({
                ...wordData,
                createdBy: session.user.discordId,
                createdAt: new Date(),
            } as ForcaGameWord);
        }
        revalidatePath('/admin/forca');
        return { success: true, message: `Palavra ${id ? 'atualizada' : 'criada'} com sucesso!` };
    } catch (error) {
        console.error("Error upserting forca word:", error);
        return { success: false, message: "Ocorreu um erro ao salvar a palavra." };
    }
}

export async function deleteForcaWord(id: string): Promise<{ success: boolean; message: string }> {
    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        await db.collection('forca_words').deleteOne({ _id: new ObjectId(id) });
        revalidatePath('/admin/forca');
        return { success: true, message: 'Palavra excluída com sucesso.' };
    } catch (error) {
        console.error("Error deleting forca word:", error);
        return { success: false, message: "Ocorreu um erro ao excluir a palavra." };
    }
}

export async function generateForcaWordByAI(theme: string) {
    try {
        const result = await generateForcaGame({ theme });
        return { success: true, data: result };
    } catch (error) {
        console.error("Error generating forca word by AI:", error);
        const errorMessage = (error instanceof Error) ? error.message : "Um erro desconhecido ocorreu.";
        return { success: false, message: `Falha na IA: ${errorMessage}` };
    }
}
