
'use server';

import clientPromise from '@/lib/mongodb';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getServerSession } from 'next-auth';
import { revalidatePath } from 'next/cache';
import type { Quiz } from '@/types';
import { ObjectId } from 'mongodb';

export async function getQuizzes(): Promise<Quiz[]> {
    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const quizzes = await db.collection<Quiz>('quizzes')
            .find({})
            .sort({ createdAt: -1 })
            .toArray();

        return JSON.parse(JSON.stringify(quizzes));
    } catch (error) {
        console.error("Error fetching quizzes:", error);
        return [];
    }
}

type QuizData = Omit<Quiz, '_id' | 'createdAt' | 'createdBy' | 'lastScheduledTriggers'>;

export async function createQuiz(data: QuizData): Promise<{ success: boolean; message: string }> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.admin) {
        return { success: false, message: 'Acesso negado.' };
    }

    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const collection = db.collection<Quiz>('quizzes');
        
        await collection.insertOne({
            ...data,
            createdBy: session.user.discordId,
            createdAt: new Date(),
        } as Quiz);

        revalidatePath('/admin/quiz');
        return { success: true, message: 'Quiz criado com sucesso!' };
    } catch (error) {
        console.error("Error creating quiz:", error);
        return { success: false, message: 'Ocorreu um erro ao criar o quiz.' };
    }
}

export async function updateQuiz(id: string, data: QuizData): Promise<{ success: boolean; message: string }> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.admin) {
        return { success: false, message: 'Acesso negado.' };
    }

    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const collection = db.collection<Quiz>('quizzes');

        await collection.updateOne(
            { _id: new ObjectId(id) },
            { $set: data }
        );

        revalidatePath('/admin/quiz');
        return { success: true, message: 'Quiz atualizado com sucesso!' };
    } catch (error) {
        console.error("Error updating quiz:", error);
        return { success: false, message: 'Ocorreu um erro ao atualizar o quiz.' };
    }
}

export async function deleteQuiz(id: string): Promise<{ success: boolean; message: string }> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.admin) {
        return { success: false, message: 'Acesso negado.' };
    }

    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const collection = db.collection<Quiz>('quizzes');

        await collection.deleteOne({ _id: new ObjectId(id) });

        revalidatePath('/admin/quiz');
        return { success: true, message: 'Quiz excluído com sucesso.' };
    } catch (error) {
        console.error("Error deleting quiz:", error);
        return { success: false, message: 'Ocorreu um erro ao excluir o quiz.' };
    }
}
