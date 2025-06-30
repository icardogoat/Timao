'use client';

import { useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { PlacedBetCard } from "@/components/placed-bet-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { PlacedBet } from "@/types";
import { Button } from "./ui/button";

interface MyBetsClientProps {
    placedBets: PlacedBet[];
    availableLeagues: string[];
}

const BETS_PER_PAGE = 6;

export function MyBetsClient({ placedBets, availableLeagues }: MyBetsClientProps) {
    const [visibleOpenCount, setVisibleOpenCount] = useState(BETS_PER_PAGE);
    const [visibleSettledCount, setVisibleSettledCount] = useState(BETS_PER_PAGE);

    const openBets = placedBets.filter(bet => bet.status === 'Em Aberto');
    const settledBets = placedBets.filter(bet => bet.status !== 'Em Aberto');

    const openBetsToShow = openBets.slice(0, visibleOpenCount);
    const settledBetsToShow = settledBets.slice(0, visibleSettledCount);

    const hasMoreOpen = visibleOpenCount < openBets.length;
    const hasMoreSettled = visibleSettledCount < settledBets.length;

    const handleLoadMoreOpen = () => {
        setVisibleOpenCount(prev => prev + BETS_PER_PAGE);
    };

    const handleLoadMoreSettled = () => {
        setVisibleSettledCount(prev => prev + BETS_PER_PAGE);
    };

    return (
        <AppLayout availableLeagues={availableLeagues}>
            <div className="flex-1 p-4 sm:p-6 lg:p-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold font-headline tracking-tight">Minhas Apostas</h1>
                    <p className="text-muted-foreground">Acompanhe suas apostas abertas e resolvidas.</p>
                </div>

                <Tabs defaultValue="open">
                    <TabsList className="grid w-full grid-cols-2 max-w-md">
                        <TabsTrigger value="open">Em Aberto</TabsTrigger>
                        <TabsTrigger value="settled">Resolvidas</TabsTrigger>
                    </TabsList>
                    <TabsContent value="open">
                        {openBets.length > 0 ? (
                            <>
                                <div className="grid gap-4 mt-4 md:grid-cols-2 lg:grid-cols-3">
                                    {openBetsToShow.map(bet => <PlacedBetCard key={bet._id as string} bet={bet} />)}
                                </div>
                                {hasMoreOpen && (
                                    <div className="flex justify-center mt-6">
                                        <Button onClick={handleLoadMoreOpen} variant="outline">
                                            Carregar mais
                                        </Button>
                                    </div>
                                )}
                            </>
                        ) : (
                            <p className="text-muted-foreground col-span-full mt-4">Você não tem apostas em aberto.</p>
                        )}
                    </TabsContent>
                    <TabsContent value="settled">
                        {settledBets.length > 0 ? (
                             <>
                                <div className="grid gap-4 mt-4 md:grid-cols-2 lg:grid-cols-3">
                                    {settledBetsToShow.map(bet => <PlacedBetCard key={bet._id as string} bet={bet} />)}
                                </div>
                                {hasMoreSettled && (
                                    <div className="flex justify-center mt-6">
                                        <Button onClick={handleLoadMoreSettled} variant="outline">
                                            Carregar mais
                                        </Button>
                                    </div>
                                )}
                            </>
                        ) : (
                           <p className="text-muted-foreground col-span-full mt-4">Você não tem apostas resolvidas.</p>
                        )}
                    </TabsContent>
                </Tabs>
            </div>
        </AppLayout>
    );
}
