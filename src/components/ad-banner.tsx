'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { getDisplayAdvertisements } from '@/actions/ad-actions';
import type { Advertisement } from '@/types';
import Link from 'next/link';
import Image from 'next/image';
import { Card } from './ui/card';
import { X } from 'lucide-react';
import { Button } from './ui/button';

export function AdBanner() {
    const { data: session } = useSession();
    const [ads, setAds] = useState<Advertisement[]>([]);
    const [currentAdIndex, setCurrentAdIndex] = useState(0);
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        async function fetchAds() {
            const fetchedAds = await getDisplayAdvertisements();
            setAds(fetchedAds);
            if(fetchedAds.length > 0) {
                setCurrentAdIndex(Math.floor(Math.random() * fetchedAds.length));
            }
        }
        fetchAds();
    }, []);

    useEffect(() => {
        if (ads.length <= 1) return;
        const interval = setInterval(() => {
            setCurrentAdIndex(prevIndex => (prevIndex + 1) % ads.length);
        }, 15000); // Change ad every 15 seconds
        return () => clearInterval(interval);
    }, [ads]);

    const user = session?.user;
    const adRemovalActive = user?.adRemovalExpiresAt && new Date(user.adRemovalExpiresAt) > new Date();

    if (!isVisible || !user || user.isVip || adRemovalActive || ads.length === 0) {
        return null;
    }

    const currentAd = ads[currentAdIndex];
    if (!currentAd) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-40 p-2 md:p-4 flex justify-center">
            <Card className="w-full max-w-4xl p-2 pr-10 shadow-lg relative">
                <Link href={currentAd.linkUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4">
                     <Image
                        src={currentAd.imageUrl}
                        alt={currentAd.title}
                        width={64}
                        height={64}
                        className="rounded-md object-cover w-12 h-12 md:w-16 md:h-16"
                        data-ai-hint="advertisement banner"
                    />
                    <div className="overflow-hidden">
                        <h4 className="font-bold text-sm md:text-base truncate">{currentAd.title}</h4>
                        <p className="text-xs md:text-sm text-muted-foreground truncate">{currentAd.description}</p>
                    </div>
                </Link>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute top-1 right-1 h-6 w-6" 
                    onClick={() => setIsVisible(false)}
                >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Fechar anúncio</span>
                </Button>
            </Card>
        </div>
    );
}
