
'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import type { Match } from '@/types';
import { ScrollArea } from './ui/scroll-area';
import { useBetSlip } from '@/context/bet-slip-context';
import { cn } from '@/lib/utils';

interface MoreMarketsDialogProps {
  match: Match;
  children: React.ReactNode;
  isBettingDisabled: boolean;
}

const allowedMarkets = [
  'Vencedor da Partida',
  'Aposta sem Empate',
  'Gols Acima/Abaixo',
  'Ambos Marcam',
  'Placar Exato',
  'Dupla Chance',
  'Total de Gols da Casa',
  'Total de Gols do Visitante',
  'Escanteios 1x2',
  'Escanteios Acima/Abaixo',
  'Escanteios da Casa Acima/Abaixo',
  'Escanteios do Visitante Acima/Abaixo',
  'Cartões Acima/Abaixo'
];

const getTeamName = (name: string) => {
    if (name === 'Palmeiras') return 'Peppa Pig';
    if (name === 'São Paulo') return 'Bambi';
    return name;
};

export function MoreMarketsDialog({ match, children, isBettingDisabled }: MoreMarketsDialogProps) {
  const { toggleBet, isBetSelected } = useBetSlip();
  
  const filteredMarkets = match.markets.filter(market => allowedMarkets.includes(market.name));
  const defaultValues = filteredMarkets.map(m => m.name);
  
  const teamAName = getTeamName(match.teamA.name);
  const teamBName = getTeamName(match.teamB.name);

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[625px] h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Mais Mercados</DialogTitle>
          <DialogDescription>
            {teamAName} vs {teamBName} - {match.league}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-grow pr-6 -mr-6">
          <Accordion type="multiple" defaultValue={defaultValues} className="w-full">
            {filteredMarkets.map((market) => (
              <AccordionItem value={market.name} key={market.name}>
                <AccordionTrigger>{market.name}</AccordionTrigger>
                <AccordionContent>
                  <div className={cn("grid gap-2", market.odds.length === 3 ? "grid-cols-3" : "grid-cols-2")}>
                    {market.odds.map((odd) => (
                      <Button
                        variant={isBetSelected(`${match.id}-${market.name}-${odd.label}`) ? 'default' : 'secondary'}
                        className="flex flex-col h-auto py-2"
                        key={odd.label}
                        onClick={() => toggleBet(match, market, odd)}
                        disabled={isBettingDisabled}
                      >
                        <span className="text-xs text-muted-foreground">{odd.label}</span>
                        <span className="font-bold">{odd.value}</span>
                      </Button>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
