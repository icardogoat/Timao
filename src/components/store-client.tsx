'use client';

import { useState } from 'react';
import type { StoreItem, UserInventoryItem } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { useSession } from 'next-auth/react';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { purchaseItem } from '@/actions/store-actions';
import { Award, Loader2, Star, Gift, Clock, ShieldOff } from 'lucide-react';

type StoreItemData = Omit<StoreItem, '_id' | 'createdAt' | 'isActive'> & { id: string };

interface StoreClientProps {
    initialItems: StoreItemData[];
    initialInventory: UserInventoryItem[];
}

const iconMap = {
    'ROLE': Award,
    'XP_BOOST': Star,
    'AD_REMOVAL': ShieldOff,
    'DEFAULT': Gift,
};

// New state for showing the success/code dialog
interface SuccessDialogState {
    open: boolean;
    message: string;
    code?: string;
}

export function StoreClient({ initialItems, initialInventory }: StoreClientProps) {
    const { data: session, update: updateSession } = useSession();
    const { toast } = useToast();
    const [isConfirming, setIsConfirming] = useState<StoreItemData | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successState, setSuccessState] = useState<SuccessDialogState>({ open: false, message: '', code: undefined });

    const userBalance = session?.user?.balance ?? 0;
    const isVip = session?.user?.isVip ?? false;

    const handlePurchase = async () => {
        if (!isConfirming) return;

        setIsSubmitting(true);
        const result = await purchaseItem(isConfirming.id);

        if (result.success) {
            toast({
                title: 'Sucesso!',
                description: result.message,
            });
            await updateSession(); // Refresh session data to get new balance
            if (result.redemptionCode) {
                 setSuccessState({ open: true, message: result.message, code: result.redemptionCode });
            }
        } else {
            toast({
                title: 'Erro na Compra',
                description: result.message,
                variant: 'destructive',
            });
        }
        
        setIsSubmitting(false);
        setIsConfirming(null);
    }
    
    const VIP_DISCOUNT_MULTIPLIER = 0.9;

    return (
        <>
            <div className="flex-1 p-4 sm:p-6 lg:p-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold font-headline tracking-tight">Loja de Itens</h1>
                    <p className="text-muted-foreground">Use seu saldo para comprar itens exclusivos e receber códigos de resgate.</p>
                </div>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {initialItems.map((item) => {
                        const Icon = iconMap[item.type as keyof typeof iconMap] || iconMap['DEFAULT'];
                        const finalPrice = isVip && item.type !== 'ROLE' ? item.price * VIP_DISCOUNT_MULTIPLIER : item.price;
                        const canAfford = userBalance >= finalPrice;

                        const ownedItem = initialInventory.find(invItem => invItem.itemId.toString() === item.id);
                        let isOwnedAndActive = false;
                        
                        if (item.type === 'ROLE' && ownedItem) {
                            if (ownedItem.itemDuration === 'PERMANENT') {
                                isOwnedAndActive = true;
                            } else if (ownedItem.itemDuration === 'MONTHLY' && ownedItem.expiresAt && new Date(ownedItem.expiresAt) > new Date()) {
                                isOwnedAndActive = true;
                            }
                        } else if (item.type === 'AD_REMOVAL') {
                            if (session?.user?.adRemovalExpiresAt && new Date(session.user.adRemovalExpiresAt) > new Date()) {
                                isOwnedAndActive = true;
                            }
                        }

                        return (
                            <Card key={item.id} className="flex flex-col">
                                <CardHeader className="flex-row gap-4 items-center">
                                    <div className="bg-primary/10 text-primary p-3 rounded-lg">
                                        <Icon className="h-8 w-8" />
                                    </div>
                                    <div>
                                        <CardTitle>{item.name}</CardTitle>
                                        <div className="flex items-center gap-2">
                                            <p className="font-bold text-primary text-base">
                                                R$ {finalPrice.toLocaleString('pt-BR')}
                                            </p>
                                            {isVip && item.price !== finalPrice && (
                                                <p className="text-sm text-muted-foreground line-through">
                                                     R$ {item.price.toLocaleString('pt-BR')}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    {item.type === 'ROLE' && (
                                        <div className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                                           {item.duration === 'MONTHLY' ? <Clock className="h-3 w-3" /> : null}
                                           <span>{item.duration === 'PERMANENT' ? 'Permanente' : 'Mensal'}</span>
                                        </div>
                                    )}
                                    {item.type === 'AD_REMOVAL' && (
                                        <div className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                                           <Clock className="h-3 w-3" />
                                           <span>{item.durationInDays} dia(s)</span>
                                        </div>
                                    )}
                                </CardHeader>
                                <CardContent className="flex-grow">
                                    <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                                </CardContent>
                                <CardFooter>
                                    <Button 
                                        className="w-full" 
                                        disabled={!canAfford || isSubmitting || isOwnedAndActive}
                                        onClick={() => setIsConfirming(item)}
                                    >
                                        {isOwnedAndActive ? 'Item Ativo' : canAfford ? 'Comprar' : 'Saldo Insuficiente'}
                                    </Button>
                                </CardFooter>
                            </Card>
                        )
                    })}
                </div>
            </div>

            <AlertDialog open={!!isConfirming} onOpenChange={(isOpen) => !isOpen && setIsConfirming(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar Compra</AlertDialogTitle>
                        <AlertDialogDescription>
                            Você tem certeza que deseja comprar "{isConfirming?.name}" por R$ {(isVip && isConfirming?.type !== 'ROLE' ? (isConfirming?.price ?? 0) * VIP_DISCOUNT_MULTIPLIER : (isConfirming?.price ?? 0)).toLocaleString('pt-BR')}? Este valor será deduzido do seu saldo.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handlePurchase} disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Confirmar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
            <AlertDialog open={successState.open} onOpenChange={(isOpen) => !isOpen && setSuccessState({ open: false, message: '', code: undefined })}>
                 <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Compra Realizada com Sucesso!</AlertDialogTitle>
                        <AlertDialogDescription>
                            {successState.message}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    {successState.code && (
                        <div className="my-4 text-center">
                            <p className="text-sm text-muted-foreground">Seu código de resgate é:</p>
                            <div className="mt-2 p-3 bg-muted rounded-md border">
                                <p className="text-2xl font-bold tracking-widest font-mono">{successState.code}</p>
                            </div>
                            <p className="mt-4 text-xs text-muted-foreground">
                                Use o comando <code className="font-mono bg-muted p-1 rounded-sm">/resgatar {successState.code}</code> no nosso servidor do Discord para ativar seu item.
                            </p>
                        </div>
                    )}
                    <AlertDialogFooter>
                         <AlertDialogAction onClick={() => setSuccessState({ open: false, message: '', code: undefined })}>
                            Fechar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
