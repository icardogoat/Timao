'use client';

import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import type { BetInSlip } from '@/types';
import { useBetSlip } from '@/context/bet-slip-context';

interface BetSlipItemProps {
  bet: BetInSlip;
}

export function BetSlipItem({ bet }: BetSlipItemProps) {
  const { removeBet } = useBetSlip();

  return (
    <div className="p-3 rounded-lg bg-card-foreground/5">
      <div className="flex justify-between items-start text-sm">
        <div>
          <p className="font-semibold text-foreground">
            {bet.teamA} vs {bet.teamB}
          </p>
          <p className="text-muted-foreground">{bet.marketName}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-6 shrink-0"
          onClick={() => removeBet(bet.id)}
          aria-label="Remove bet"
        >
          <X className="size-4" />
        </Button>
      </div>
      <div className="flex justify-between items-center mt-2">
        <p className="text-sm font-medium text-foreground">{bet.odd.label}</p>
        <p className="text-sm font-bold text-primary">{bet.odd.value}</p>
      </div>
    </div>
  );
}
