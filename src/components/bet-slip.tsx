'use client';

import { useState, useMemo, useEffect } from 'react';
import { useBetSlip } from '@/context/bet-slip-context';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BetSlipItem } from './bet-slip-item';
import { Ticket } from 'lucide-react';
import { useSidebar } from '@/components/ui/sidebar';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet';
import { Badge } from './ui/badge';
import { placeBet } from '@/actions/bet-actions';
import { useSession } from 'next-auth/react';

export function BetSlip() {
  const { bets, clearBets } = useBetSlip();
  const { toast } = useToast();
  const [stake, setStake] = useState('');
  const [isClient, setIsClient] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { isMobile } = useSidebar();
  const { data: session, update: updateSession } = useSession();

  useEffect(() => {
    setIsClient(true);
  }, []);

  const totalOdds = useMemo(() => {
    if (bets.length === 0) return 0;
    return bets.reduce((acc, bet) => acc * parseFloat(bet.odd.value), 1);
  }, [bets]);

  const potentialWinnings = useMemo(() => {
    const stakeValue = parseFloat(stake);
    if (isNaN(stakeValue) || stakeValue <= 0) return '0.00';
    return (stakeValue * totalOdds).toFixed(2);
  }, [stake, totalOdds]);

  const handleBetSubmit = async () => {
    const stakeValue = parseFloat(stake);
    if (!stake || stakeValue <= 0) {
      toast({ title: 'Valor inválido', description: 'Por favor, insira um valor para apostar.', variant: 'destructive' });
      return;
    }
    if (session?.user?.balance && session.user.balance < stakeValue) {
        toast({ title: 'Saldo Insuficiente', description: 'Você não tem saldo suficiente para esta aposta.', variant: 'destructive' });
        return;
    }

    setIsSubmitting(true);
    const result = await placeBet(bets, stakeValue);
    setIsSubmitting(false);

    if (result.success) {
      toast({
        title: 'Aposta Realizada!',
        description: 'Sua aposta foi registrada com sucesso. Boa sorte!',
      });
      // Update session balance
      await updateSession();
      clearBets();
      setStake('');
      if (isMobile) {
        setIsSheetOpen(false);
      }
    } else {
        toast({
            title: 'Erro ao Apostar',
            description: result.message,
            variant: 'destructive',
        });
    }
  };

  const handleClearBets = () => {
    clearBets();
    setStake('');
    if (isMobile) {
      setIsSheetOpen(false);
    }
  };

  if (!isClient || bets.length === 0) {
    return null;
  }
  
  const stakeValue = parseFloat(stake) || 0;

  const BetSlipBody = (
      <>
        <ScrollArea className="flex-grow">
          <CardContent className="p-4 pt-0">
            <div className="space-y-3">
              {bets.map(bet => (
                <BetSlipItem key={bet.id} bet={bet} />
              ))}
            </div>
          </CardContent>
        </ScrollArea>
        {bets.length > 0 && (
          <CardFooter className="flex-col items-stretch gap-4 border-t p-4">
            <div className="flex justify-between items-center text-sm font-medium">
              <span>Cotação Total</span>
              <span>{totalOdds.toFixed(2)}</span>
            </div>
            <div className="space-y-2">
              <Label htmlFor={isMobile ? "stake-mobile" : "stake-desktop"}>Valor da Aposta (R$)</Label>
              <Input
                id={isMobile ? "stake-mobile" : "stake-desktop"}
                type="number"
                placeholder="0.00"
                value={stake}
                onChange={(e) => setStake(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div className="flex justify-between items-center text-sm font-medium">
              <span>Ganhos Potenciais</span>
              <span>R$ {potentialWinnings}</span>
            </div>
            <Button
              size="lg"
              disabled={!stake || stakeValue <= 0 || isSubmitting}
              onClick={handleBetSubmit}
            >
              {isSubmitting ? 'Processando...' : `Apostar R$ ${stakeValue > 0 ? stakeValue.toFixed(2) : '0.00'}`}
            </Button>
          </CardFooter>
        )}
      </>
  );

  if (isMobile) {
    return (
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
                <Button className="fixed bottom-4 right-4 z-20 md:hidden rounded-full h-16 w-16 shadow-lg">
                    <div className="relative">
                        <Ticket className="h-7 w-7" />
                        <Badge variant="destructive" className="absolute -top-2 -right-2 h-6 w-6 flex items-center justify-center rounded-full text-xs">
                            {bets.length}
                        </Badge>
                    </div>
                    <span className="sr-only">Abrir boletim de apostas</span>
                </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-auto max-h-[90vh] flex flex-col p-0 rounded-t-lg">
                <div className="flex flex-col h-full">
                    <SheetHeader className="flex-row items-center justify-between p-4 border-b">
                         <div className="flex items-center gap-2">
                            <Ticket className="size-5" />
                            <SheetTitle className="text-lg">Boletim de Apostas</SheetTitle>
                        </div>
                        {bets.length > 0 && (
                            <Button variant="ghost" size="sm" onClick={handleClearBets} className="text-xs">
                            Limpar
                            </Button>
                        )}
                    </SheetHeader>
                    {BetSlipBody}
                </div>
            </SheetContent>
        </Sheet>
    );
  }
  
  return (
    <div className="fixed bottom-0 right-0 z-20 w-full max-w-sm p-4 hidden md:block">
      <Card className="flex flex-col max-h-[calc(100vh-2rem)]">
        <CardHeader className="flex-row items-center justify-between p-4">
          <div className="flex items-center gap-2">
            <Ticket className="size-5" />
            <CardTitle className="text-lg">Boletim de Apostas</CardTitle>
          </div>
          {bets.length > 0 && (
            <Button variant="ghost" size="sm" onClick={handleClearBets} className="text-xs">
              Limpar
            </Button>
          )}
        </CardHeader>
        {BetSlipBody}
      </Card>
    </div>
  );
}
