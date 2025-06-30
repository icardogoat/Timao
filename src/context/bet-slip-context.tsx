'use client';

import type { ReactNode } from 'react';
import { createContext, useContext, useState, useCallback } from 'react';
import type { BetInSlip, Match, Market, Odd } from '@/types';
import { useToast } from '@/hooks/use-toast';

interface BetSlipContextType {
  bets: BetInSlip[];
  toggleBet: (match: Match, market: Market, odd: Odd) => void;
  removeBet: (betId: string) => void;
  clearBets: () => void;
  isBetSelected: (betId: string) => boolean;
}

const BetSlipContext = createContext<BetSlipContextType | undefined>(undefined);

export function BetSlipProvider({ children }: { children: ReactNode }) {
  const [bets, setBets] = useState<BetInSlip[]>([]);
  const { toast } = useToast();

  const toggleBet = useCallback((match: Match, market: Market, odd: Odd) => {
    const betId = `${match.id}-${market.name}-${odd.label}`;
    const existingBetIndex = bets.findIndex(b => b.id === betId);

    // If the exact same bet selection exists, remove it
    if (existingBetIndex > -1) {
      setBets(prevBets => prevBets.filter((_, index) => index !== existingBetIndex));
      return;
    }

    const newBet: BetInSlip = {
      id: betId,
      matchId: match.id,
      matchTime: match.time,
      teamA: match.teamA.name,
      teamB: match.teamB.name,
      league: match.league,
      marketName: market.name,
      odd: odd,
    };
    
    // If a different bet for the same market in the same match exists, replace it
    // e.g., user clicks "Home" then clicks "Away" for the same match
    const sameMarketIndex = bets.findIndex(b => b.matchId === newBet.matchId && b.marketName === newBet.marketName);
    if (sameMarketIndex > -1) {
      setBets(prevBets => {
        const updatedBets = [...prevBets];
        updatedBets[sameMarketIndex] = newBet;
        return updatedBets;
      });
      return;
    }

    // Add the new bet to the slip
    setBets(prevBets => [...prevBets, newBet]);

  }, [bets, toast]);

  const removeBet = useCallback((betId: string) => {
    setBets(prevBets => prevBets.filter(b => b.id !== betId));
  }, []);

  const clearBets = useCallback(() => {
    setBets([]);
  }, []);

  const isBetSelected = useCallback((betId: string) => {
    return bets.some(b => b.id === betId);
  }, [bets]);

  return (
    <BetSlipContext.Provider value={{ bets, toggleBet, removeBet, clearBets, isBetSelected }}>
      {children}
    </BetSlipContext.Provider>
  );
}

export function useBetSlip() {
  const context = useContext(BetSlipContext);
  if (context === undefined) {
    throw new Error('useBetSlip must be used within a BetSlipProvider');
  }
  return context;
}
