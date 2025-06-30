
'use client';

import { useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Transaction, ApiSettings } from "@/types";
import { DailyRewardClient } from "./daily-reward-client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from 'zod';
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "./ui/form";
import { Input } from "./ui/input";
import { Gift, Loader2 } from "lucide-react";
import { redeemCode } from "@/actions/reward-actions";
import { useSession } from "next-auth/react";

const getStatusClass = (status: Transaction['status']) => {
    switch (status) {
        case 'Concluído':
            return 'text-green-400';
        case 'Pendente':
            return 'text-yellow-400';
        case 'Cancelado':
            return 'text-red-400';
        default:
            return '';
    }
};

const getAmountClass = (amount: number) => {
    return amount > 0 ? 'text-green-400' : 'text-red-400';
}

const redeemCodeSchema = z.object({
  code: z.string().min(1, { message: "O código não pode estar em branco." }),
});

function RedeemCodeCard() {
    const { toast } = useToast();
    const { update: updateSession } = useSession();
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const form = useForm<z.infer<typeof redeemCodeSchema>>({
        resolver: zodResolver(redeemCodeSchema),
        defaultValues: { code: '' },
    });

    const onSubmit = async (values: z.infer<typeof redeemCodeSchema>) => {
        setIsSubmitting(true);
        const result = await redeemCode(values.code);
        if (result.success) {
            toast({ title: 'Sucesso!', description: result.message });
            await updateSession(); // Refresh balance
            form.reset();
        } else {
            toast({ title: 'Erro', description: result.message, variant: 'destructive' });
        }
        setIsSubmitting(false);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Gift className="h-5 w-5 text-primary" />
                    Resgatar Código
                </CardTitle>
                <CardDescription>Insira um código promocional para receber recompensas.</CardDescription>
            </CardHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <CardContent>
                         <FormField
                            control={form.control}
                            name="code"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="sr-only">Código Promocional</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Insira seu código..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                    <CardFooter>
                         <Button type="submit" className="w-full" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Resgatar
                        </Button>
                    </CardFooter>
                </form>
            </Form>
        </Card>
    );
}

interface WalletClientProps {
    availableLeagues: string[];
    initialBalance: number;
    initialTransactions: Transaction[];
    apiSettings: Partial<ApiSettings>;
}

export function WalletClient({ availableLeagues, initialBalance, initialTransactions, apiSettings }: WalletClientProps) {
    const [visibleCount, setVisibleCount] = useState(5);
    const transactionsToShow = initialTransactions.slice(0, visibleCount);
    const hasMore = visibleCount < initialTransactions.length;

    const handleLoadMore = () => {
        setVisibleCount(prevCount => prevCount + 5);
    };

    return (
         <AppLayout availableLeagues={availableLeagues}>
            <div className="flex-1 p-4 sm:p-6 lg:p-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold font-headline tracking-tight">Minha Carteira</h1>
                    <p className="text-muted-foreground">Gerencie seu saldo e veja seu histórico de transações.</p>
                </div>

                <div className="grid gap-8 md:grid-cols-3">
                    <div className="md:col-span-1 space-y-8">
                        <Card>
                            <CardHeader>
                                <CardTitle>Saldo Atual</CardTitle>
                                <CardDescription>Seu saldo disponível para apostas.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-4xl font-bold">R$ {initialBalance.toFixed(2)}</p>
                            </CardContent>
                        </Card>
                         <DailyRewardClient apiSettings={apiSettings} />
                         <RedeemCodeCard />
                    </div>

                    <div className="md:col-span-2">
                         <Card>
                            <CardHeader>
                                <CardTitle>Histórico de Transações</CardTitle>
                                <CardDescription>Seu histórico de ganhos e perdas.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Descrição</TableHead>
                                            <TableHead className="text-center">Data</TableHead>
                                            <TableHead className="text-center">Status</TableHead>
                                            <TableHead className="text-right">Valor</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {transactionsToShow.length > 0 ? transactionsToShow.map(t => (
                                            <TableRow key={t.id}>
                                                <TableCell>
                                                    <p className="font-medium">{t.type}</p>
                                                    <p className="text-sm text-muted-foreground">{t.description}</p>
                                                </TableCell>
                                                <TableCell className="text-center">{new Date(t.date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</TableCell>
                                                <TableCell className={cn("text-center font-medium", getStatusClass(t.status))}>{t.status}</TableCell>
                                                <TableCell className={cn("text-right font-bold", getAmountClass(t.amount))}>
                                                    {t.amount > 0 ? '+' : ''} R$ {Math.abs(t.amount).toFixed(2)}
                                                </TableCell>
                                            </TableRow>
                                        )) : (
                                            <TableRow>
                                                <TableCell colSpan={4} className="text-center text-muted-foreground">Nenhuma transação encontrada.</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                            {hasMore && (
                                <CardFooter className="justify-center">
                                    <Button onClick={handleLoadMore} variant="outline">
                                        Carregar mais
                                    </Button>
                                </CardFooter>
                            )}
                        </Card>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
