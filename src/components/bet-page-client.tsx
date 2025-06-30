
'use client';

import { useState, useEffect, Suspense } from 'react';
import type { Match, Advertisement, ApiSettings } from '@/types';
import { MatchCard } from '@/components/match-card';
import { InFeedAdCard } from '@/components/in-feed-ad-card';
import { AppLayout } from '@/components/app-layout';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { getMatches } from '@/actions/bet-actions';
import { Loader2 } from 'lucide-react';
import { UpdateCountdownTimer } from './update-countdown-timer';

// Type guard to check if an item is an Advertisement
function isAdvertisement(item: Match | Advertisement): item is Advertisement {
    // A simple check for a property that only exists on Advertisement
    return 'owner' in item;
}

// Helper to intersperse ads into a list of matches
const intersperseAds = (matches: Match[], ads: Advertisement[]): (Match | Advertisement)[] => {
    if (!ads || ads.length === 0) {
        return matches;
    }
    const items: (Match | Advertisement)[] = [];
    let adIndex = 0;
    const adInterval = 4; // Show an ad every 4 matches

    matches.forEach((match, index) => {
        items.push(match);
        // Add an ad after the 4th match, 8th, etc., but not as the very last item
        if ((index + 1) % adInterval === 0 && index < matches.length - 1) {
            items.push(ads[adIndex % ads.length]);
            adIndex++;
        }
    });
    return items;
};

interface BetPageClientProps {
    initialMatches: Match[];
    availableLeagues: string[];
    ads: Advertisement[];
    apiSettings: Partial<ApiSettings>;
}

const MATCHES_PER_PAGE = 6;

export function BetPageClient(props: BetPageClientProps) {
    return (
        <Suspense fallback={null}>
            <BetPageClientInner {...props} />
        </Suspense>
    );
}

function BetPageClientInner({ initialMatches, availableLeagues, ads, apiSettings }: BetPageClientProps) {
    const searchParams = useSearchParams();
    const selectedLeague = searchParams.get('league');

    const [matches, setMatches] = useState<Match[]>(initialMatches);
    const [page, setPage] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [hasMore, setHasMore] = useState(initialMatches.length === MATCHES_PER_PAGE);

    useEffect(() => {
        setMatches(initialMatches);
        setPage(1);
        setHasMore(initialMatches.length === MATCHES_PER_PAGE);
    }, [selectedLeague, initialMatches]);


    const loadMoreMatches = async () => {
        setIsLoading(true);
        const nextPage = page + 1;
        const newMatches = await getMatches({ league: selectedLeague ?? undefined, page: nextPage });
        
        if (newMatches.length > 0) {
            setMatches(prevMatches => {
                const existingIds = new Set(prevMatches.map(m => m.id));
                const uniqueNewMatches = newMatches.filter(m => !existingIds.has(m.id));
                return [...prevMatches, ...uniqueNewMatches];
            });
            setPage(nextPage);
        }

        if (newMatches.length < MATCHES_PER_PAGE) {
            setHasMore(false);
        }
        
        setIsLoading(false);
    };

    const corinthiansMatches = matches.filter(
        (match) => match.teamA.name === 'Corinthians' || match.teamB.name === 'Corinthians'
    );
    const otherMatches = matches.filter(
        (match) => match.teamA.name !== 'Corinthians' && match.teamB.name !== 'Corinthians'
    );

    const otherItemsWithAds = intersperseAds(otherMatches, ads);

    return (
        <AppLayout availableLeagues={availableLeagues}>
            <div className="p-4 sm:p-6 lg:p-8 pb-32 md:pb-8 md:pr-[26rem]">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold font-headline tracking-tight">{selectedLeague || 'Próximas Partidas'}</h1>
                        <p className="text-muted-foreground">Os jogos mais quentes para você apostar.</p>
                    </div>
                    <UpdateCountdownTimer apiSettings={apiSettings} />
                </div>
                
                {matches.length === 0 && !isLoading ? (
                    <div className="flex items-center justify-center pt-16">
                        <Card className="w-full max-w-lg text-center">
                            <CardHeader>
                                <CardTitle>Nenhuma partida disponível no momento.</CardTitle>
                            </CardHeader>
                        </Card>
                    </div>
                ) : (
                    <div className="space-y-12">
                         {corinthiansMatches.length > 0 && (
                            <section>
                                <h2 className="text-2xl font-bold font-headline tracking-tight border-b pb-2 mb-6">Jogos do Timão</h2>
                                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                                    {corinthiansMatches.map((match) => (
                                        <MatchCard key={`match-${match.id}`} match={match} />
                                    ))}
                                </div>
                            </section>
                        )}
                        
                        {otherMatches.length > 0 && (
                            <section>
                                {corinthiansMatches.length > 0 && <h2 className="text-2xl font-bold font-headline tracking-tight border-b pb-2 mb-6">Outras Partidas</h2>}
                                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                                    {otherItemsWithAds.map((item) => (
                                        isAdvertisement(item)
                                            ? <InFeedAdCard key={`ad-${item._id.toString()}`} ad={item} />
                                            : <MatchCard key={`match-${item.id}`} match={item} />
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>
                )}

                {hasMore && (
                    <div className="flex justify-center mt-8">
                        <Button onClick={loadMoreMatches} disabled={isLoading} variant="outline" className="w-full sm:w-auto">
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Carregando...
                                </>
                            ) : (
                                'Ver mais partidas'
                            )}
                        </Button>
                    </div>
                )}
            </div>
        </AppLayout>
    )
}
