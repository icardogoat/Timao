'use client'
import { useState, useEffect } from 'react';

export function AvatarFallbackText({ name }: { name: string }) {
    const [fallback, setFallback] = useState('');

    useEffect(() => {
        const fallbackText = (name ?? "??")
            .split(' ')
            .map((word) => word[0])
            .join('')
            .substring(0, 2)
            .toUpperCase();
        setFallback(fallbackText);
    }, [name]);
    
    return <>{fallback}</>;
}
