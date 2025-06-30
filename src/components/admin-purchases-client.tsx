'use client';

import { useState } from 'react';
import type { PurchaseAdminView } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { refundPurchase, deletePurchase, getAdminPurchases } from '@/actions/admin-actions';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, Loader2 } from 'lucide-react';

type AdminPurchasesClientProps = {
    initialPurchases: PurchaseAdminView[];
}

type DialogState = {
    type: 'refund' | 'delete';
    purchase: PurchaseAdminView;
} | null;

export default function AdminPurchasesClient({ initialPurchases }: AdminPurchasesClientProps) {
    const { toast } = useToast();
    const [purchases, setPurchases] = useState(initialPurchases);
    const [searchTerm, setSearchTerm] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [dialogState, setDialogState] = useState<DialogState>(null);

    const filteredPurchases = purchases.filter(p => 
        (p.userName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (p.itemName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (p.userId || '').includes(searchTerm) ||
        (p.redemptionCode || '').includes(searchTerm)
    );

    const handleConfirmAction = async () => {
        if (!dialogState) return;

        setIsSubmitting(true);
        let result;
        if (dialogState.type === 'refund') {
            result = await refundPurchase(dialogState.purchase.id);
        } else {
            result = await deletePurchase(dialogState.purchase.id);
        }
        
        if (result.success) {
            toast({ title: 'Sucesso!', description: result.message });
            setPurchases(await getAdminPurchases());
        } else {
            toast({ title: 'Erro', description: result.message, variant: 'destructive' });
        }
        
        setIsSubmitting(false);
        setDialogState(null);
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>Gerenciar Compras</CardTitle>
                    <CardDescription>Visualize e gerencie as compras dos usuários.</CardDescription>
                </CardHeader>
                <CardContent>
                     <div className="py-4">
                        <Input
                            placeholder="Pesquisar por usuário, item, ID ou código..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full md:max-w-sm"
                        />
                    </div>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Usuário</TableHead>
                                <TableHead>Item</TableHead>
                                <TableHead className="text-right">Preço Pago</TableHead>
                                <TableHead className="text-center">Status</TableHead>
                                <TableHead className="hidden sm:table-cell">Data</TableHead>
                                <TableHead className="w-12"><span className="sr-only">Ações</span></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredPurchases.map(purchase => (
                                <TableRow key={purchase.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar className="hidden h-9 w-9 sm:flex">
                                                <AvatarImage src={purchase.userAvatar} alt={purchase.userName} data-ai-hint="user avatar" />
                                                <AvatarFallback>{(purchase.userName?.substring(0,2) || 'U').toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                            <span className="font-medium">{purchase.userName}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <p className="font-medium">{purchase.itemName}</p>
                                        {purchase.redemptionCode && <p className="text-xs text-muted-foreground font-mono">{purchase.redemptionCode}</p>}
                                    </TableCell>
                                    <TableCell className="text-right font-mono">R$ {purchase.pricePaid.toFixed(2)}</TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant={purchase.isRedeemed ? 'secondary' : 'default'}>
                                            {purchase.isRedeemed ? 'Resgatado' : 'Pendente'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="hidden sm:table-cell">{new Date(purchase.purchasedAt).toLocaleDateString('pt-BR')}</TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                                <DropdownMenuItem onClick={() => setDialogState({ type: 'refund', purchase })}>Reembolsar Compra</DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onClick={() => setDialogState({ type: 'delete', purchase })} className="text-destructive focus:text-destructive">Excluir Registro</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <AlertDialog open={!!dialogState} onOpenChange={() => setDialogState(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {dialogState?.type === 'refund' ? 'Confirmar Reembolso' : 'Confirmar Exclusão'}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {dialogState?.type === 'refund' 
                                ? `Tem certeza que deseja reembolsar R$ ${dialogState?.purchase.pricePaid.toFixed(2)} para ${dialogState?.purchase.userName} pela compra de "${dialogState?.purchase.itemName}"? Esta ação não pode ser desfeita.`
                                : `Tem certeza que deseja excluir o registro da compra de "${dialogState?.purchase.itemName}" por ${dialogState?.purchase.userName}? Esta ação não afeta o saldo do usuário e não pode ser desfeita.`
                            }
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmAction} disabled={isSubmitting} className={dialogState?.type === 'delete' ? 'bg-destructive hover:bg-destructive/90' : ''}>
                             {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                             Confirmar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
