
'use server';

import clientPromise from '@/lib/mongodb';
import { revalidatePath } from 'next/cache';
import type { LiveStream, StreamSource } from '@/types';
import { ObjectId } from 'mongodb';
import { randomBytes } from 'crypto';

// --- Stream Management ---

export async function getLiveStreams(): Promise<LiveStream[]> {
    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const streams = await db.collection<LiveStream>('streams').find({}).sort({ createdAt: -1 }).toArray();
        return JSON.parse(JSON.stringify(streams));
    } catch (error) {
        console.error("Error fetching live streams:", error);
        return [];
    }
}

export async function getLiveStream(id: string): Promise<LiveStream | null> {
    if (!ObjectId.isValid(id)) return null;
    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const stream = await db.collection('streams').findOne({ _id: new ObjectId(id) });
        if (!stream) return null;
        return JSON.parse(JSON.stringify(stream));
    } catch (error) {
        console.error("Error fetching live stream:", error);
        return null;
    }
}

type UpsertData = {
    id?: string;
    name: string;
    sources: { id: string, name: string; type: 'iframe' | 'hls'; url: string }[];
};


export async function upsertLiveStream(data: UpsertData): Promise<{ success: boolean; message: string; streamId?: string }> {
    const { id, name, sources } = data;
    
    // Ensure each source has a unique ID, creating one if it doesn't exist.
    const sourcesWithIds: StreamSource[] = sources.map(source => ({
        ...source,
        id: source.id || randomBytes(8).toString('hex')
    }));

    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const collection = db.collection<Omit<LiveStream, '_id'>>('streams');

        const streamData = { name, sources: sourcesWithIds };

        if (id) {
            await collection.updateOne({ _id: new ObjectId(id) }, { $set: streamData });
            revalidatePath(`/admin/stream`);
            revalidatePath(`/stream/${id}`);
            return { success: true, message: 'Transmissão atualizada com sucesso!', streamId: id };
        } else {
            const result = await collection.insertOne({
                ...streamData,
                isIntervalActive: false,
                createdAt: new Date(),
            });
            revalidatePath('/admin/stream');
            return { success: true, message: 'Transmissão criada com sucesso!', streamId: result.insertedId.toString() };
        }
    } catch (error) {
        console.error("Error upserting live stream:", error);
        return { success: false, message: "Ocorreu um erro ao salvar a transmissão." };
    }
}

export async function deleteLiveStream(id: string): Promise<{ success: boolean; message: string }> {
    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        await db.collection('streams').deleteOne({ _id: new ObjectId(id) });
        revalidatePath('/admin/stream');
        return { success: true, message: 'Transmissão excluída com sucesso.' };
    } catch (error) {
        console.error("Error deleting live stream:", error);
        return { success: false, message: "Ocorreu um erro ao excluir a transmissão." };
    }
}

export async function setStreamIntervalState(streamId: string, isActive: boolean): Promise<{ success: boolean; message: string }> {
    if (!streamId) {
        return { success: false, message: "ID da transmissão não fornecido." };
    }
    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const collection = db.collection('streams');

        const result = await collection.updateOne(
            { _id: new ObjectId(streamId) },
            { $set: { isIntervalActive: isActive } }
        );

        if (result.modifiedCount === 0) {
            const stream = await collection.findOne({ _id: new ObjectId(streamId) });
             if (stream && stream.isIntervalActive === isActive) {
                return { success: true, message: `O intervalo já estava ${isActive ? 'ativo' : 'inativo'}.` };
            }
            return { success: false, message: "A transmissão não foi encontrada ou o estado já era o mesmo." };
        }

        revalidatePath(`/stream/${streamId}`);
        revalidatePath(`/admin/stream`);
        return { success: true, message: `Modo intervalo ${isActive ? 'ativado' : 'desativado'} com sucesso.` };

    } catch (error) {
        console.error("Error setting stream interval state:", error);
        return { success: false, message: "Ocorreu um erro ao alterar o estado do intervalo." };
    }
}
