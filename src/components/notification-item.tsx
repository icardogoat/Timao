
'use client';

import { cn } from "@/lib/utils";
import type { Notification } from "@/types";
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Link from 'next/link';
import { useState, useEffect } from "react";

interface NotificationItemProps {
    notification: Notification;
}

export function NotificationItem({ notification }: NotificationItemProps) {
    const [timeAgo, setTimeAgo] = useState('');

    useEffect(() => {
        // This will only run on the client, after hydration, to prevent a mismatch
        setTimeAgo(formatDistanceToNow(new Date(notification.date), {
            addSuffix: true,
            locale: ptBR,
        }));
    }, [notification.date]);


    const content = (
        <div className={cn(
            "flex flex-col items-start gap-1 p-4 transition-colors w-full",
            !notification.read && "bg-accent/50",
            notification.link && "hover:bg-accent cursor-pointer"
        )}>
            <div className='flex items-center w-full'>
                <p className={cn(
                    "text-sm font-medium",
                    !notification.read ? "text-foreground" : "text-muted-foreground"
                )}>{notification.title}</p>
                {timeAgo && <p className="ml-auto text-xs text-muted-foreground">{timeAgo}</p>}
            </div>
            <p className={cn(
                "text-xs w-full text-left",
                !notification.read ? "text-foreground/80" : "text-muted-foreground"
            )}>{notification.description}</p>
        </div>
    );
    
    if (notification.link) {
        return <Link href={notification.link} className="block">{content}</Link>;
    }

    return content;
}
