'use client';

import { useState, useEffect } from 'react';
import type { PromoCode } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { revokePromoCode, getPromoCodes } from '@/actions/admin-actions';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from '@/components/ui/badge';
import { XCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type AdminCodesClientProps = {
    initialCodes: PromoCode[];
}

const getStatusVariant = (status: PromoCode['status']) => {
    switch (status) {
        case 'ACTIVE': return 'default';
        case 'REDEEMED': return 'secondary';
        case 'REVOKED': return 'destructive';
        case 'EXPIRED': return 'outline';
        default: return 'secondary';
    }
};

const TimeAgo = ({ date }: { date: string | Date }) => {
    const [timeAgo, setTimeAgo] = useState('');

    useEffect(() => {
        setTimeAgo(formatDistanceToNow(new Date(date), { addSuffix: true, locale: ptBR }));
    }, [date]);

    return <>{timeAgo || '...'}</>;
};

export default function AdminCodesClient({ initialCodes }: AdminCodesClientProps) {
    const { toast } = useToast();
    const [codes, setCodes] = useState(initialCodes);
    const [searchTerm, setSearchTerm] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [dialogState, setDialogState] = useState<PromoCode | null>(null);

    const filteredCodes = codes.filter(c => 
        (c.code?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (c.description?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (c.createdBy?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );

    const handleRevoke = async () => {
        if (!dialogState) return;

        setIsSubmitting(true);
        const result = await revokePromoCode(dialogState._id.toString());
        
        if (result.success) {
            toast({ title: 'Sucesso!', description: result.message });
            setCodes(await getPromoCodes());
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
                    <CardTitle>Gerenciar Códigos Promocionais</CardTitle>
                    <CardDescription>Visualize e gerencie códigos gerados pelo bot.</CardDescription>
                </CardHeader>
                <CardContent>
                     <div className="py-4">
                        <Input
                            placeholder="Pesquisar por código, descrição ou ID do criador..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full md:max-w-sm"
                        />
                    </div>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Código</TableHead>
                                <TableHead>Descrição</TableHead>
                                <TableHead className="text-center">Tipo/Valor</TableHead>
                                <TableHead className="hidden sm:table-cell">Criado Por</TableHead>
                                <TableHead className="hidden sm:table-cell text-center">Uso</TableHead>
                                <TableHead className="text-center">Status</TableHead>
                                <TableHead className="w-12"><span className="sr-only">Ações</span></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredCodes.map(code => (
                                <TableRow key={code._id.toString()}>
                                    <TableCell>
                                        <p className="font-mono font-semibold">{code.code}</p>
                                        <p className="text-xs text-muted-foreground">
                                            Criado <TimeAgo date={code.createdAt} />
                                        </p>
                                    </TableCell>
                                    <TableCell>{code.description}</TableCell>
                                    <TableCell className="text-center">
                                        <p className="font-semibold">{code.type}</p>
                                        <p className="text-xs">{code.type === 'MONEY' && `R$ `}{code.value}</p>
                                    </TableCell>
                                    <TableCell className="hidden sm:table-cell font-mono text-xs">{code.createdBy}</TableCell>
                                    <TableCell className="hidden sm:table-cell text-center">
                                        <span className="font-mono text-xs">
                                            {code.redeemedBy?.length ?? 0} / {code.maxUses ?? '∞'}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant={getStatusVariant(code.status)}>
                                            {code.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            onClick={() => setDialogState(code)}
                                            disabled={code.status !== 'ACTIVE'}
                                            title="Revogar Código"
                                        >
                                            <XCircle className="h-4 w-4 text-destructive" />
                                        </Button>
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
                        <AlertDialogTitle>Confirmar Revogação</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza que deseja revogar o código <span className="font-bold font-mono">{dialogState?.code}</span>? 
                            Esta ação não pode ser desfeita e o código não poderá mais ser utilizado.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleRevoke} disabled={isSubmitting} className="bg-destructive hover:bg-destructive/90">
                             {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                             Confirmar e Revogar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
