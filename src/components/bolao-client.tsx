
'use client';

import type { Bolao } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormMessage } from './ui/form';
import { useState } from 'react';
import { joinBolao } from '@/actions/bolao-actions';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { Session } from 'next-auth';
import { AvatarFallbackText } from './avatar-fallback-text';
import { Separator } from './ui/separator';
import { cn } from '@/lib/utils';

const bolaoSchema = z.object({
    home: z.coerce.number().int().min(0, 'Placar não pode ser negativo.'),
    away: z.coerce.number().int().min(0, 'Placar não pode ser negativo.'),
});

interface BolaoCardProps {
    bolao: Bolao;
    sessionUser: Session['user'] | null;
}

function BolaoCard({ bolao, sessionUser }: BolaoCardProps) {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isParticipantsExpanded, setIsParticipantsExpanded] = useState(false);
    
    const form = useForm<z.infer<typeof bolaoSchema>>({
        resolver: zodResolver(bolaoSchema),
        defaultValues: {
            home: 0,
            away: 0,
        }
    });

    const userHasJoined = sessionUser && bolao.participants.some(p => p.userId === sessionUser.discordId);
    const userGuess = userHasJoined ? bolao.participants.find(p => p.userId === sessionUser.discordId)?.guess : null;
    
    const onSubmit = async (values: z.infer<typeof bolaoSchema>) => {
        setIsSubmitting(true);
        const result = await joinBolao(bolao._id.toString(), values);
        if (result.success) {
            toast({ title: "Sucesso!", description: result.message });
            form.reset();
        } else {
            toast({ title: "Erro", description: result.message, variant: "destructive" });
        }
        setIsSubmitting(false);
    };
    
    const formatCurrency = (value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const getTeamCustomization = (teamName: string) => {
        if (teamName === 'Palmeiras') return { name: 'Peppa Pig', logoClass: 'rotate-180' };
        if (teamName === 'São Paulo') return { name: 'Bambi', logoClass: 'rotate-180' };
        return { name: teamName, logoClass: '' };
    };

    const homeTeamCustom = getTeamCustomization(bolao.homeTeam);
    const awayTeamCustom = getTeamCustomization(bolao.awayTeam);

    const participantsToShow = isParticipantsExpanded 
        ? bolao.participants.slice().reverse()
        : bolao.participants.slice(-5).reverse();

    const hasMoreParticipants = bolao.participants.length > 5;

    return (
        <Card className="flex flex-col">
            <CardHeader>
                <div>
                    <CardTitle className="text-xl">{bolao.league}</CardTitle>
                    <CardDescription>{bolao.matchTime}</CardDescription>
                </div>
            </CardHeader>
            <CardContent className="space-y-6 flex-grow">
                 <div className="flex items-center justify-around">
                    <div className="flex flex-col items-center gap-2 w-1/3">
                        <Image src={bolao.homeLogo} alt={`${homeTeamCustom.name} logo`} width={64} height={64} className={cn("rounded-full", homeTeamCustom.logoClass)} data-ai-hint="team logo" />
                        <span className="font-bold text-lg text-center">{homeTeamCustom.name}</span>
                    </div>
                    <span className="text-4xl font-bold text-muted-foreground">vs</span>
                    <div className="flex flex-col items-center gap-2 w-1/3">
                        <Image src={bolao.awayLogo} alt={`${awayTeamCustom.name} logo`} width={64} height={64} className={cn("rounded-full", awayTeamCustom.logoClass)} data-ai-hint="team logo" />
                        <span className="font-bold text-lg text-center">{awayTeamCustom.name}</span>
                    </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="bg-accent/50 p-4 rounded-lg">
                        <p className="text-sm text-muted-foreground">Prêmio</p>
                        <p className="text-2xl font-bold text-primary">{formatCurrency(bolao.prizePool)}</p>
                    </div>
                     <div className="bg-accent/50 p-4 rounded-lg">
                        <p className="text-sm text-muted-foreground">Participantes</p>
                        <p className="text-2xl font-bold text-primary">{bolao.participants.length}</p>
                    </div>
                </div>

                <Separator />
                {userHasJoined ? (
                    <div className="space-y-4 pt-4 text-center">
                        <h3 className="text-lg font-semibold">Você já participou!</h3>
                        <p className="text-muted-foreground">Seu palpite foi:</p>
                        <p className="text-3xl font-bold">{userGuess?.home} x {userGuess?.away}</p>
                        <p className="text-sm text-muted-foreground">Boa sorte!</p>
                    </div>
                ) : (
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-md mx-auto space-y-4 text-center">
                            <h3 className="text-lg font-semibold">Faça seu palpite!</h3>
                            <div className="flex items-center justify-center gap-4">
                                <FormField control={form.control} name="home" render={({ field }) => (
                                    <FormItem className="w-24">
                                        <FormControl><Input type="number" className="text-center text-2xl h-16" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                <span className="text-2xl font-bold">x</span>
                                 <FormField control={form.control} name="away" render={({ field }) => (
                                    <FormItem className="w-24">
                                        <FormControl><Input type="number" className="text-center text-2xl h-16" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                            </div>
                            <Button type="submit" className="w-full" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Participar por {formatCurrency(bolao.entryFee)}
                            </Button>
                        </form>
                    </Form>
                )}
            </CardContent>
            {bolao.participants.length > 0 && (
                 <CardFooter className="flex-col items-start pt-6 border-t">
                    <h4 className="flex items-center gap-2 font-semibold mb-4 text-sm">
                        <Users className="h-4 w-4" />
                        <span>Últimos Participantes</span>
                    </h4>
                    <div className="flex flex-wrap gap-2">
                        {participantsToShow.map(p => (
                            <div key={p.userId} className="flex items-center gap-2 p-1.5 rounded-md bg-card-foreground/5">
                                <Avatar className="h-6 w-6">
                                    <AvatarImage src={p.avatar} alt={p.name} data-ai-hint="user avatar" />
                                    <AvatarFallback><AvatarFallbackText name={p.name} /></AvatarFallback>
                                </Avatar>
                                <span className="text-xs font-medium">{p.name}</span>
                            </div>
                        ))}
                    </div>
                    {hasMoreParticipants && (
                        <Button
                            variant="link"
                            className="p-0 h-auto text-xs mt-2"
                            onClick={() => setIsParticipantsExpanded(!isParticipantsExpanded)}
                        >
                            {isParticipantsExpanded ? 'Ver menos' : `Ver todos os ${bolao.participants.length} participantes`}
                            {isParticipantsExpanded ? <ChevronUp className="ml-1 h-3 w-3" /> : <ChevronDown className="ml-1 h-3 w-3" />}
                        </Button>
                    )}
                </CardFooter>
            )}
        </Card>
    );
}

interface BolaoClientProps {
    activeBoloes: Bolao[];
    sessionUser: Session['user'] | null;
}

export function BolaoClient({ activeBoloes, sessionUser }: BolaoClientProps) {
    return (
        <div className="flex-1 p-4 sm:p-6 lg:p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold font-headline tracking-tight">Bolão FielBet</h1>
                <p className="text-muted-foreground">Adivinhe o placar e concorra a prêmios em dinheiro!</p>
            </div>

            {activeBoloes.length === 0 ? (
                <div className="flex items-center justify-center pt-16">
                    <Card className="w-full max-w-md text-center">
                        <CardHeader>
                            <CardTitle>Nenhum Bolão Ativo</CardTitle>
                            <CardDescription>Volte mais tarde para participar dos próximos bolões!</CardDescription>
                        </CardHeader>
                    </Card>
                </div>
            ) : (
                <div className="grid gap-8 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
                    {activeBoloes.map(bolao => (
                        <BolaoCard key={bolao._id as string} bolao={bolao} sessionUser={sessionUser} />
                    ))}
                </div>
            )}
        </div>
    );
}
