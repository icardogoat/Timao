'use client';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Gift } from "lucide-react";
import { cn } from "@/lib/utils";
import type { InviterRanking } from "@/types";

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
                <TableRow key={user.rank}>
                    <TableCell className="text-center"><RankBadge rank={user.rank} /></TableCell>
                    <TableCell>
                        <div className="flex items-center gap-3">
                            <Avatar className={cn(user.isVip && "ring-2 ring-vip")}>
                                <AvatarImage src={user.avatar ?? undefined} alt={user.name} data-ai-hint="user avatar" />
                                <AvatarFallback>{(user.name?.substring(0, 2) || 'U').toUpperCase()}</AvatarFallback>
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
                        Ninguém convidou usuários ainda. Os dados aparecerão aqui quando o bot começar a rastrear os convites.
                    </TableCell>
                </TableRow>
            )}
        </TableBody>
    </Table>
);


interface InvitesClientProps {
    topInviters: InviterRanking[];
}

export function InvitesClient({ topInviters }: InvitesClientProps) {
    return (
        <div className="flex-1 space-y-8 p-4 sm:p-6 lg:p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold font-headline tracking-tight">Ranking de Convites</h1>
                <p className="text-muted-foreground">Veja quem mais contribui para o crescimento da nossa comunidade.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Users /> Top 10 Recrutadores</CardTitle>
                            <CardDescription>Os 10 membros que mais convidaram novos usuários para o servidor.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <InvitersTable data={topInviters} />
                        </CardContent>
                    </Card>
                </div>
                <div className="lg:col-span-1">
                    <Card className="bg-gradient-to-br from-primary/10 to-transparent">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Gift /> Recompensas por Convite</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-muted-foreground">
                            <p>Para agradecer seu apoio, oferecemos recompensas incríveis para os melhores recrutadores!</p>
                            <ul className="list-disc pl-5 space-y-2">
                                <li>Prêmios em dinheiro (moeda virtual) no final de cada semana/mês.</li>
                                <li>Cargos exclusivos no Discord.</li>
                                <li>Itens especiais na loja do site.</li>
                            </ul>
                            <p>Fique de olho no canal de anúncios do Discord para mais detalhes sobre as recompensas atuais!</p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
