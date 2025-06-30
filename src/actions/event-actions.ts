
'use server';

import clientPromise from '@/lib/mongodb';
import type { SiteEvent } from '@/types';
import { cache } from 'react';

/**
 * @fileOverview Actions related to site-wide events.
 */

/**
 * Retrieves the currently active event, if any.
 * The result is cached for the duration of the request.
 * @returns {Promise<SiteEvent | null>} The active event object or null.
 */
export const getActiveEvent = cache(async (): Promise<SiteEvent | null> => {
    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const eventsCollection = db.collection('site_events');
        
        const activeEvent = await eventsCollection.findOne({ isActive: true });

        if (!activeEvent) {
            return null;
        }

        return JSON.parse(JSON.stringify(activeEvent));
    } catch (error) {
        console.error('Error fetching active event:', error);
        return null;
    }
});
