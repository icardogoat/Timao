
'use client';

import { DiscordLogo } from '@/components/icons';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { getDisplayAdvertisements } from '@/actions/ad-actions';
import type { Advertisement } from '@/types';

interface IntervalOverlayProps {
    discordInviteUrl: string;
}

const DiscordInviteCard = ({ discordInviteUrl }: { discordInviteUrl: string }) => {
    if (!discordInviteUrl) return null;
    return (
        <Card className="mt-8 bg-background/50 border-border/50 max-w-md w-full">
            <CardHeader>
                <CardTitle className="flex items-center justify-center gap-3 text-xl">
                    <DiscordLogo className="h-7 w-7" />
                    Junte-se à nossa comunidade
                </CardTitle>
            </CardHeader>
            <CardContent>
                    <p className="text-base text-muted-foreground text-center">
                    Discuta o jogo, participe de sorteios e muito mais no nosso servidor do Discord!
                </p>
                <Button asChild size="lg" className="mt-6 w-full">
                    <Link href={discordInviteUrl} target="_blank" rel="noopener noreferrer">
                        Entrar no Servidor
                    </Link>
                </Button>
            </CardContent>
        </Card>
    );
};

const AdCard = ({ ad }: { ad: Advertisement }) => (
    <Link href={ad.linkUrl} target="_blank" rel="noopener noreferrer" className="block max-w-md w-full">
        <Card className="mt-8 bg-background/50 border-border/50 group overflow-hidden">
            <div className="relative">
                 <Image
                    src={ad.imageUrl}
                    alt={ad.title}
                    width={500}
                    height={281}
                    className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-300"
                    data-ai-hint="advertisement banner"
                />
            </div>
            <div className="p-6">
                <h3 className="text-xl font-bold">{ad.title}</h3>
                <p className="text-base text-muted-foreground mt-2 line-clamp-2">{ad.description}</p>
            </div>
        </Card>
    </Link>
);


export function IntervalOverlay({ discordInviteUrl }: IntervalOverlayProps) {
    const [ads, setAds] = useState<Advertisement[]>([]);
    const [currentAdIndex, setCurrentAdIndex] = useState(0);

    useEffect(() => {
        getDisplayAdvertisements().then(fetchedAds => {
            if (fetchedAds.length > 0) {
                setAds(fetchedAds);
                setCurrentAdIndex(Math.floor(Math.random() * fetchedAds.length));
            }
        });
    }, []);

    // Rotate ad every 10 seconds
    useEffect(() => {
        if (ads.length <= 1) return;
        const interval = setInterval(() => {
            setCurrentAdIndex(prev => (prev + 1) % ads.length);
        }, 10000);
        return () => clearInterval(interval);
    }, [ads]);

    const adToDisplay = ads.length > 0 ? ads[currentAdIndex] : null;

    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background text-white">
            <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>

            <div className="relative z-10 flex flex-col items-center justify-center text-center p-4">
                <Image
                    src="https://i.imgur.com/xD76hcl.png"
                    alt="FielBet Logo"
                    width={400}
                    height={101}
                    className="h-24 w-auto mb-8 animate-pulse"
                    priority
                    data-ai-hint="logo"
                />

                <h1 className="text-4xl font-bold font-headline tracking-tight">Estamos no Intervalo</h1>
                <p className="text-lg text-muted-foreground mt-2">Voltamos em breve com o segundo tempo!</p>
                
                <div className="min-h-[480px] flex items-center justify-center">
                    {adToDisplay ? (
                        <div key={adToDisplay._id as string} className="animate-in fade-in-50 duration-500">
                           <AdCard ad={adToDisplay} />
                        </div>
                    ) : (
                        <div className="animate-in fade-in-50 duration-500">
                            <DiscordInviteCard discordInviteUrl={discordInviteUrl} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
