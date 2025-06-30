
'use server';

import clientPromise from '@/lib/mongodb';
import type { Notification } from '@/types';
import { ObjectId } from 'mongodb';
import { revalidatePath } from 'next/cache';

export async function getNotificationsForUser(userId: string): Promise<Notification[]> {
    if (!userId) return [];
    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const notificationsCollection = db.collection<Notification>('notifications');

        const notifications = await notificationsCollection
            .find({ userId })
            .sort({ date: -1 })
            .limit(50) // Limit to last 50 notifications for performance
            .toArray();

        // Convert documents to plain objects for client components
        return notifications.map(n => ({
            ...n,
            _id: n._id.toString(),
            date: (n.date as Date).toISOString(),
        }));
    } catch (error) {
        console.error('Error fetching notifications:', error);
        return [];
    }
}

export async function markNotificationsAsRead(userId: string): Promise<{ success: boolean }> {
    if (!userId) return { success: false };
    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const notificationsCollection = db.collection('notifications');
        
        await notificationsCollection.updateMany(
            { userId: userId, read: false },
            { $set: { read: true } }
        );

        revalidatePath('/notifications'); // Revalidate the main notifications page
        
        return { success: true };
    } catch (error) {
        console.error('Error marking notifications as read:', error);
        return { success: false };
    }
}
    
