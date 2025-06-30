
'use client';

import type { MvpVoting, MvpVote, MvpPlayer } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import Image from 'next/image';
import { Button } from './ui/button';
import { useState } from 'react';
import { castVote } from '@/actions/mvp-actions';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Crown, Star, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Session } from 'next-auth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';

const PLAYERS_PER_TEAM_LIMIT = 5;

interface MvpCardProps {
    voting: MvpVoting;
    sessionUser: Session['user'] | null;
    onVote: (votingId: string, playerId: number) => void;
}

function MvpCard({ voting, sessionUser, onVote }: MvpCardProps) {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState<number | null>(null);
    const [expandedTeams, setExpandedTeams] = useState<number[]>([]);

    const userVote = sessionUser ? voting.votes.find(v => v.userId === sessionUser.discordId) : null;
    const mvpPlayerIds = voting.status === 'Finalizado' ? voting.mvpPlayerIds || [] : [];
    const winnerPlayers = mvpPlayerIds.map(id => voting.lineups.flatMap(l => l.players).find(p => p.id === id)).filter(Boolean) as MvpPlayer[];

    const handleVote = async (playerId: number) => {
        setIsSubmitting(playerId);
        const result = await castVote(voting._id.toString(), playerId);
        if (result.success) {
            toast({ title: "Sucesso!", description: result.message });
            onVote(voting._id.toString(), playerId);
        } else {
            toast({ title: "Erro", description: result.message, variant: "destructive" });
        }
        setIsSubmitting(null);
    };

    const toggleTeamExpansion = (teamId: number) => {
        setExpandedTeams(prev => 
            prev.includes(teamId) 
                ? prev.filter(id => id !== teamId)
                : [...prev, teamId]
        );
    };
    
    const getTeamName = (name: string) => {
        if (name === 'Palmeiras') return 'Peppa Pig';
        if (name === 'São Paulo') return 'Bambi';
        return name;
    };

    const getLogoClass = (name: string) => {
        if (name === 'Palmeiras' || name === 'São Paulo') return 'rotate-180';
        return '';
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-xl">{getTeamName(voting.homeTeam)} vs {getTeamName(voting.awayTeam)}</CardTitle>
                        <CardDescription>{voting.league}</CardDescription>
                    </div>
                     <Badge variant={voting.status === 'Aberto' ? 'default' : voting.status === 'Cancelado' ? 'destructive' : 'secondary'}>
                        {voting.status}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                {voting.lineups.map(lineup => {
                    const isExpanded = expandedTeams.includes(lineup.teamId);
                    const playersToShow = isExpanded ? lineup.players : lineup.players.slice(0, PLAYERS_PER_TEAM_LIMIT);
                    const hasMorePlayers = lineup.players.length > PLAYERS_PER_TEAM_LIMIT;
                    const lineupTeamName = getTeamName(lineup.teamName);
                    const lineupLogoClass = getLogoClass(lineup.teamName);

                    return (
                        <div key={lineup.teamId}>
                            <div className="flex items-center gap-2 mb-3">
                                <Image src={lineup.teamLogo} alt={`${lineupTeamName} logo`} width={24} height={24} className={cn("rounded-full", lineupLogoClass)} data-ai-hint="team logo" />
                                <h3 className="font-semibold">{lineupTeamName}</h3>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {playersToShow.map(player => (
                                    <div key={player.id} className="p-2 border rounded-lg flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <Image src={player.photo} alt={player.name} width={40} height={40} className="rounded-full" data-ai-hint="player photo" />
                                            <div className="overflow-hidden">
                                                <p className="text-sm font-medium truncate">{player.name}</p>
                                            </div>
                                        </div>
                                        {voting.status === 'Aberto' && !userVote && (
                                            <Button size="sm" onClick={() => handleVote(player.id)} disabled={!!isSubmitting}>
                                                {isSubmitting === player.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Votar'}
                                            </Button>
                                        )}
                                        {userVote?.playerId === player.id && (
                                            <Star className="h-5 w-5 text-yellow-400" title="Seu voto" />
                                        )}
                                        {mvpPlayerIds.includes(player.id) && (
                                            <Crown className="h-5 w-5 text-yellow-500" title="MVP" />
                                        )}
                                    </div>
                                ))}
                            </div>
                             {hasMorePlayers && (
                                <Button 
                                    variant="link" 
                                    className="p-0 h-auto text-xs mt-2" 
                                    onClick={() => toggleTeamExpansion(lineup.teamId)}
                                >
                                    {isExpanded ? 'Ver menos' : `Ver mais ${lineup.players.length - PLAYERS_PER_TEAM_LIMIT} jogadores`}
                                    {isExpanded ? <ChevronUp className="ml-1 h-3 w-3" /> : <ChevronDown className="ml-1 h-3 w-3" />}
                                </Button>
                            )}
                        </div>
                    );
                })}
            </CardContent>
            {voting.status === 'Aberto' && !userVote && (
                 <CardFooter>
                    <p className="text-xs text-muted-foreground">Vote no seu jogador preferido e ganhe R$ 100,00 de bônus!</p>
                </CardFooter>
            )}
             {voting.status === 'Finalizado' && winnerPlayers.length > 0 && (
                 <CardFooter className="bg-primary/10 rounded-b-lg p-4">
                    <div className="flex items-center gap-3">
                        <Crown className="h-6 w-6 text-yellow-500" />
                        <p className="font-semibold">
                            {winnerPlayers.length > 1 ? 'Os MVPs da partida foram: ' : 'O MVP da partida foi: '}
                            {winnerPlayers.map(p => p.name).join(' & ')}!
                        </p>
                    </div>
                </CardFooter>
            )}
            {voting.status === 'Cancelado' && (
                 <CardFooter className="bg-destructive/10 rounded-b-lg p-4">
                    <div className="flex items-center gap-3">
                        <XCircle className="h-6 w-6 text-destructive" />
                        <p className="font-semibold text-destructive">Esta votação foi cancelada.</p>
                    </div>
                </CardFooter>
            )}
        </Card>
    );
}


interface MvpClientProps {
    activeVotings: MvpVoting[];
    sessionUser: Session['user'] | null;
}

const VOTINGS_PER_PAGE = 3;

export function MvpClient({ activeVotings, sessionUser }: MvpClientProps) {
    const [votings, setVotings] = useState(activeVotings);
    const [visibleOpenCount, setVisibleOpenCount] = useState(VOTINGS_PER_PAGE);
    const [visibleClosedCount, setVisibleClosedCount] = useState(VOTINGS_PER_PAGE);

    const handleVoteSuccess = (votingId: string, playerId: number) => {
        if (!sessionUser) return;

        setVotings(prevVotings => {
            return prevVotings.map(voting => {
                if (voting._id.toString() === votingId) {
                    const newVote: MvpVote = {
                        userId: sessionUser.discordId,
                        playerId: playerId,
                        votedAt: new Date().toISOString(),
                    };
                    return {
                        ...voting,
                        votes: [...voting.votes, newVote]
                    };
                }
                return voting;
            });
        });
    };
    
    const openVotings = votings.filter(v => v.status === 'Aberto');
    const closedVotings = votings.filter(v => v.status === 'Finalizado' || v.status === 'Cancelado');

    const openVotingsToShow = openVotings.slice(0, visibleOpenCount);
    const closedVotingsToShow = closedVotings.slice(0, visibleClosedCount);

    const hasMoreOpen = visibleOpenCount < openVotings.length;
    const hasMoreClosed = visibleClosedCount < closedVotings.length;

    return (
        <div className="flex-1 p-4 sm:p-6 lg:p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold font-headline tracking-tight">Votação MVP</h1>
                <p className="text-muted-foreground">Escolha o melhor jogador da partida e ganhe recompensas!</p>
            </div>
             <Tabs defaultValue="open" className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-sm">
                    <TabsTrigger value="open">Abertas</TabsTrigger>
                    <TabsTrigger value="closed">Encerradas</TabsTrigger>
                </TabsList>
                <TabsContent value="open">
                     {openVotings.length === 0 ? (
                        <div className="flex items-center justify-center pt-16">
                            <Card className="w-full max-w-md text-center">
                                <CardHeader>
                                    <CardTitle>Nenhuma Votação Aberta</CardTitle>
                                    <CardDescription>Volte mais tarde para votar!</CardDescription>
                                </CardHeader>
                            </Card>
                        </div>
                    ) : (
                        <>
                            <div className="grid gap-8 mt-6">
                                {openVotingsToShow.map(voting => (
                                    <MvpCard key={voting._id as string} voting={voting} sessionUser={sessionUser} onVote={handleVoteSuccess} />
                                ))}
                            </div>
                            {hasMoreOpen && (
                                <div className="flex justify-center mt-6">
                                    <Button onClick={() => setVisibleOpenCount(prev => prev + VOTINGS_PER_PAGE)} variant="outline">
                                        Ver mais votações
                                    </Button>
                                </div>
                            )}
                        </>
                    )}
                </TabsContent>
                 <TabsContent value="closed">
                     {closedVotings.length === 0 ? (
                        <div className="flex items-center justify-center pt-16">
                            <Card className="w-full max-w-md text-center">
                                <CardHeader>
                                    <CardTitle>Nenhuma Votação Encerrada</CardTitle>
                                    <CardDescription>Os resultados aparecerão aqui.</CardDescription>
                                </CardHeader>
                            </Card>
                        </div>
                    ) : (
                         <>
                            <div className="grid gap-8 mt-6">
                                {closedVotingsToShow.map(voting => (
                                    <MvpCard key={voting._id as string} voting={voting} sessionUser={sessionUser} onVote={handleVoteSuccess} />
                                ))}
                            </div>
                            {hasMoreClosed && (
                                <div className="flex justify-center mt-6">
                                    <Button onClick={() => setVisibleClosedCount(prev => prev + VOTINGS_PER_PAGE)} variant="outline">
                                        Ver mais votações
                                    </Button>
                                </div>
                            )}
                        </>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
