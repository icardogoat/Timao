
'use client';

import { useState } from "react";
import type { PlacedBet } from "@/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Separator } from "./ui/separator";
import { Button } from "./ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";

interface PlacedBetCardProps {
    bet: PlacedBet;
}

const getTeamName = (name: string) => {
    if (name === 'Palmeiras') return 'Peppa Pig';
    if (name === 'São Paulo') return 'Bambi';
    return name;
};

export function PlacedBetCard({ bet }: PlacedBetCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    const mainStatusVariant = {
        'Ganha': 'default',
        'Perdida': 'destructive',
        'Em Aberto': 'secondary',
        'Cancelada': 'secondary'
    } as const;
    
    const getMainStatusClass = (status: PlacedBet['status']) => {
        switch (status) {
            case 'Ganha':
                return 'bg-green-500/20 text-green-400 border-green-500/30';
            case 'Perdida':
                return 'bg-red-500/20 text-red-400 border-red-500/30';
            default:
                return '';
        }
    };
    
    const isSingleBet = bet.bets.length === 1;
    const single = isSingleBet ? bet.bets[0] : null;

    const selectionsToShow = isExpanded ? bet.bets : bet.bets.slice(0, 1);
    const hasMoreSelections = !isSingleBet && bet.bets.length > 1;

    // A safer way to format date on the client
    const formattedDate = new Date(bet.createdAt).toLocaleDateString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        timeZone: 'UTC'
    });
    
    const singleTeamAName = isSingleBet ? getTeamName(single!.teamA) : '';
    const singleTeamBName = isSingleBet ? getTeamName(single!.teamB) : '';

    return (
        <Card className="flex flex-col">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-base">
                            {isSingleBet ? `${singleTeamAName} vs ${singleTeamBName}` : `Aposta Múltipla (${bet.bets.length} seleções)`}
                        </CardTitle>
                        <CardDescription>
                            {isSingleBet ? `${single!.league} - ${single!.matchTime}` : `Realizada em: ${formattedDate}`}
                        </CardDescription>
                    </div>
                    <Badge variant={mainStatusVariant[bet.status]} className={cn(bet.status !== 'Perdida' && getMainStatusClass(bet.status))}>
                        {bet.status}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-3 flex-grow pb-4">
                {selectionsToShow.map((selection, index) => (
                    <div key={index} className="text-sm">
                        <div className="flex justify-between items-center">
                            <p className="font-semibold text-foreground">{selection.selection}</p>
                            <p className="font-semibold text-primary">{selection.oddValue}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">{selection.marketName}</p>
                        <p className="text-xs text-muted-foreground">{getTeamName(selection.teamA)} vs {getTeamName(selection.teamB)}</p>
                    </div>
                ))}

                {hasMoreSelections && (
                     <Button variant="link" className="p-0 h-auto text-xs" onClick={() => setIsExpanded(!isExpanded)}>
                        {isExpanded ? 'Ver menos' : `Ver mais ${bet.bets.length - 1} seleções`}
                        {isExpanded ? <ChevronUp className="ml-1 h-3 w-3" /> : <ChevronDown className="ml-1 h-3 w-3" />}
                    </Button>
                )}
            </CardContent>
            <Separator />
            <CardFooter className="grid grid-cols-3 gap-2 pt-4 text-center text-sm">
                 <div>
                    <p className="text-xs text-muted-foreground">Cotação</p>
                    <p className="font-bold text-foreground">{bet.totalOdds.toFixed(2)}</p>
                </div>
                <div>
                    <p className="text-xs text-muted-foreground">Aposta</p>
                    <p className="font-bold text-foreground">R$ {bet.stake.toFixed(2)}</p>
                </div>
                <div>
                    <p className="text-xs text-muted-foreground">Retorno Pot.</p>
                    <p className={cn("font-bold", {
                        'text-green-400': bet.status === 'Ganha',
                        'text-red-400': bet.status === 'Perdida',
                        'text-foreground': bet.status === 'Em Aberto',
                    })}>
                      R$ {bet.status === 'Perdida' ? '0.00' : bet.potentialWinnings.toFixed(2)}
                    </p>
                </div>
            </CardFooter>
        </Card>
    );
}
