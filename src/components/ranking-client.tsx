

'use client';

import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Medal, Zap, Wallet, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserRanking, ActiveBettorRanking, TopLevelUserRanking, RichestUserRanking, InviterRanking } from "@/types";
import { Button } from './ui/button';
import { AvatarFallbackText } from './avatar-fallback-text';

const ITEMS_PER_PAGE = 10;

const RankBadge = ({ rank }: { rank: number }) => {
    if (rank <= 3) {
        return (
            <span className={cn(
                "font-bold text-lg",
                rank === 1 && "text-yellow-400",
                rank === 2 && "text-gray-400",
                rank === 3 && "text-orange-400"
            )}>
                {rank}
            </span>
        );
    }
    return <>{rank}</>;
};

const WinnersTable = ({ data }: { data: UserRanking[] }) => (
    <Table>
        <TableHeader>
            <TableRow>
                <TableHead className="w-16 text-center">Rank</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead className="text-right">Ganhos</TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
            {data.length > 0 ? data.map((user) => (
                <TableRow key={user.discordId}>
                    <TableCell className="text-center"><RankBadge rank={user.rank} /></TableCell>
                    <TableCell>
                        <div className="flex items-center gap-3">
                            <Avatar className={cn(user.isVip && "ring-2 ring-vip")}>
                                <AvatarImage src={user.avatar ?? undefined} alt={user.name} data-ai-hint="user avatar" />
                                <AvatarFallback><AvatarFallbackText name={user.name} /></AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{user.name}</span>
                        </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-green-400">
                        R$ {user.winnings.toFixed(2)}
                    </TableCell>
                </TableRow>
            )) : (
                <TableRow>
                    <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                        Ainda não há apostadores no ranking.
                    </TableCell>
                </TableRow>
            )}
        </TableBody>
    </Table>
);

const RichestTable = ({ data }: { data: RichestUserRanking[] }) => (
    <Table>
        <TableHeader>
            <TableRow>
                <TableHead className="w-16 text-center">Rank</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
            {data.length > 0 ? data.map((user) => (
                <TableRow key={user.discordId}>
                    <TableCell className="text-center"><RankBadge rank={user.rank} /></TableCell>
                    <TableCell>
                        <div className="flex items-center gap-3">
                            <Avatar className={cn(user.isVip && "ring-2 ring-vip")}>
                                <AvatarImage src={user.avatar ?? undefined} alt={user.name} data-ai-hint="user avatar" />
                                <AvatarFallback><AvatarFallbackText name={user.name} /></AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{user.name}</span>
                        </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-primary">
                        R$ {user.balance.toFixed(2)}
                    </TableCell>
                </TableRow>
            )) : (
                <TableRow>
                    <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                        Ainda não há apostadores no ranking.
                    </TableCell>
                </TableRow>
            )}
        </TableBody>
    </Table>
);

const MostActiveTable = ({ data }: { data: ActiveBettorRanking[] }) => (
    <Table>
        <TableHeader>
            <TableRow>
                <TableHead className="w-16 text-center">Rank</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead className="text-right">Apostas Feitas</TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
            {data.length > 0 ? data.map((user) => (
                <TableRow key={user.discordId}>
                    <TableCell className="text-center"><RankBadge rank={user.rank} /></TableCell>
                    <TableCell>
                        <div className="flex items-center gap-3">
                            <Avatar className={cn(user.isVip && "ring-2 ring-vip")}>
                                <AvatarImage src={user.avatar ?? undefined} alt={user.name} data-ai-hint="user avatar" />
                                <AvatarFallback><AvatarFallbackText name={user.name} /></AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{user.name}</span>
                        </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                        {user.totalBets}
                    </TableCell>
                </TableRow>
            )) : (
                <TableRow>
                    <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                        Ninguém fez apostas ainda.
                    </TableCell>
                </TableRow>
            )}
        </TableBody>
    </Table>
);


const TopLevelsTable = ({ data }: { data: TopLevelUserRanking[] }) => (
    <Table>
        <TableHeader>
            <TableRow>
                <TableHead className="w-16 text-center">Rank</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead className="text-right">Nível</TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
            {data.length > 0 ? data.map((user) => (
                <TableRow key={user.discordId}>
                    <TableCell className="text-center"><RankBadge rank={user.rank} /></TableCell>
                    <TableCell>
                        <div className="flex items-center gap-3">
                            <Avatar className={cn(user.isVip && "ring-2 ring-vip")}>
                                <AvatarImage src={user.avatar ?? undefined} alt={user.name} data-ai-hint="user avatar" />
                                <AvatarFallback><AvatarFallbackText name={user.name} /></AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{user.name}</span>
                        </div>
                    </TableCell>
                    <TableCell className="text-right">
                        <span className="font-semibold">{user.level}</span>
                        <span className="text-xs text-muted-foreground ml-2">({user.xp} XP)</span>
                    </TableCell>
                </TableRow>
            )) : (
                <TableRow>
                    <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                        Ninguém subiu de nível ainda.
                    </TableCell>
                </TableRow>
            )}
        </TableBody>
    </Table>
);

const InvitersTable = ({ data }: { data: InviterRanking[] }) => (
    <Table>
        <TableHeader>
            <TableRow>
                <TableHead className="w-16 text-center">Rank</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead className="text-right">Convites</TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
            {data.length > 0 ? data.map((user) => (
                <TableRow key={user.inviterId}>
                    <TableCell className="text-center"><RankBadge rank={user.rank} /></TableCell>
                    <TableCell>
                        <div className="flex items-center gap-3">
                            <Avatar className={cn(user.isVip && "ring-2 ring-vip")}>
                                <AvatarImage src={user.avatar ?? undefined} alt={user.name} data-ai-hint="user avatar" />
                                <AvatarFallback><AvatarFallbackText name={user.name} /></AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{user.name}</span>
                        </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                        {user.inviteCount}
                    </TableCell>
                </TableRow>
            )) : (
                <TableRow>
                    <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                        Ninguém convidou usuários ainda.
                    </TableCell>
                </TableRow>
            )}
        </TableBody>
    </Table>
);


interface RankingClientProps {
    topWinners: UserRanking[];
    mostActiveBettors: ActiveBettorRanking[];
    topLevelUsers: TopLevelUserRanking[];
    richestUsers: RichestUserRanking[];
    topInviters: InviterRanking[];
}

export function RankingClient({ topWinners, mostActiveBettors, topLevelUsers, richestUsers, topInviters }: RankingClientProps) {
    const [visibleWinners, setVisibleWinners] = useState(ITEMS_PER_PAGE);
    const [visibleRichest, setVisibleRichest] = useState(ITEMS_PER_PAGE);
    const [visibleActive, setVisibleActive] = useState(ITEMS_PER_PAGE);
    const [visibleLevels, setVisibleLevels] = useState(ITEMS_PER_PAGE);
    const [visibleInviters, setVisibleInviters] = useState(ITEMS_PER_PAGE);

    return (
        <div className="flex-1 space-y-8 p-4 sm:p-6 lg:p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold font-headline tracking-tight">Rankings</h1>
                <p className="text-muted-foreground">Veja quem são os melhores da FielBet em várias categorias.</p>
            </div>

            <Tabs defaultValue="winners" className="w-full">
                <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5">
                    <TabsTrigger value="winners">
                        <Trophy className="mr-2 h-4 w-4" /> Maiores Ganhadores
                    </TabsTrigger>
                    <TabsTrigger value="richest">
                        <Wallet className="mr-2 h-4 w-4" /> Mais Ricos
                    </TabsTrigger>
                    <TabsTrigger value="most_active">
                        <Medal className="mr-2 h-4 w-4" /> Mais Ativos
                    </TabsTrigger>
                    <TabsTrigger value="top_levels">
                        <Zap className="mr-2 h-4 w-4" /> Top Níveis
                    </TabsTrigger>
                    <TabsTrigger value="inviters">
                        <UserPlus className="mr-2 h-4 w-4" /> Top Convites
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="winners">
                    <Card>
                        <CardHeader>
                            <CardTitle>Maiores Ganhadores</CardTitle>
                            <CardDescription>O ranking dos maiores campeões em ganhos.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <WinnersTable data={topWinners.slice(0, visibleWinners)} />
                        </CardContent>
                        {visibleWinners < topWinners.length && (
                             <CardFooter className="justify-center">
                                <Button onClick={() => setVisibleWinners(prev => prev + ITEMS_PER_PAGE)} variant="outline">
                                    Mostrar mais
                                </Button>
                            </CardFooter>
                        )}
                    </Card>
                </TabsContent>

                <TabsContent value="richest">
                    <Card>
                        <CardHeader>
                            <CardTitle>Mais Ricos</CardTitle>
                            <CardDescription>Usuários com o maior saldo na carteira.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <RichestTable data={richestUsers.slice(0, visibleRichest)} />
                        </CardContent>
                         {visibleRichest < richestUsers.length && (
                             <CardFooter className="justify-center">
                                <Button onClick={() => setVisibleRichest(prev => prev + ITEMS_PER_PAGE)} variant="outline">
                                    Mostrar mais
                                </Button>
                            </CardFooter>
                        )}
                    </Card>
                </TabsContent>

                <TabsContent value="most_active">
                    <Card>
                        <CardHeader>
                            <CardTitle>Mais Ativos</CardTitle>
                            <CardDescription>Usuários que fizeram o maior número de apostas.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <MostActiveTable data={mostActiveBettors.slice(0, visibleActive)} />
                        </CardContent>
                         {visibleActive < mostActiveBettors.length && (
                             <CardFooter className="justify-center">
                                <Button onClick={() => setVisibleActive(prev => prev + ITEMS_PER_PAGE)} variant="outline">
                                    Mostrar mais
                                </Button>
                            </CardFooter>
                        )}
                    </Card>
                </TabsContent>

                <TabsContent value="top_levels">
                    <Card>
                        <CardHeader>
                            <CardTitle>Top Níveis</CardTitle>
                            <CardDescription>Os usuários com mais experiência na plataforma.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <TopLevelsTable data={topLevelUsers.slice(0, visibleLevels)} />
                        </CardContent>
                         {visibleLevels < topLevelUsers.length && (
                             <CardFooter className="justify-center">
                                <Button onClick={() => setVisibleLevels(prev => prev + ITEMS_PER_PAGE)} variant="outline">
                                    Mostrar mais
                                </Button>
                            </CardFooter>
                        )}
                    </Card>
                </TabsContent>
                
                 <TabsContent value="inviters">
                    <Card>
                        <CardHeader>
                            <CardTitle>Top Convites</CardTitle>
                            <CardDescription>Usuários que mais convidaram novos membros para o servidor.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <InvitersTable data={topInviters.slice(0, visibleInviters)} />
                        </CardContent>
                         {visibleInviters < topInviters.length && (
                             <CardFooter className="justify-center">
                                <Button onClick={() => setVisibleInviters(prev => prev + ITEMS_PER_PAGE)} variant="outline">
                                    Mostrar mais
                                </Button>
                            </CardFooter>
                        )}
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
