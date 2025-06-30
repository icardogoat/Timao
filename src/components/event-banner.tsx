'use client';

import { getActiveEvent } from '@/actions/event-actions';
import type { SiteEvent } from '@/types';
import { PartyPopper } from 'lucide-react';
import { useEffect, useState } from 'react';

export function EventHeaderBanner() {
    const [event, setEvent] = useState<SiteEvent | null>(null);

    useEffect(() => {
        // Fetch event every minute to keep it fresh
        const fetcher = () => getActiveEvent().then(setEvent);
        fetcher();
        const interval = setInterval(fetcher, 60000);
        return () => clearInterval(interval);
    }, []);

    if (!event) {
        return null;
    }

    return (
        <div className="bg-primary text-primary-foreground text-center py-2 px-4 text-sm font-semibold flex items-center justify-center gap-2 animate-in fade-in duration-500">
            <PartyPopper className="h-5 w-5" />
            <span>Evento Ativo: <span className="font-bold">{event.name}</span>! Ganhe {event.xpMultiplier}x XP em suas vitórias!</span>
        </div>
    );
}
