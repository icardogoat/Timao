
'use client';

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, Loader2, RefreshCw, BellRing, Crown, Star, BarChart } from "lucide-react"
import { getAdminMatches, processAllFinishedMatches, resolveMatch, createMvpVoting } from "@/actions/admin-actions";
import { useToast } from "@/hooks/use-toast";
import { sendUpcomingMatchNotifications } from "@/actions/match-notifications";
import { createBolao, cancelBolao } from "@/actions/bolao-actions";

type MatchAdminView = {
    id: string;
    fixtureId: number;
    teamA: string;
    teamB: string;
    league: string;
    time: string;
    status: string;
    isProcessed: boolean;
    hasBolao: boolean;
    bolaoId?: string;
    hasMvpVoting: boolean;
    mvpVotingId?: string;
};

interface AdminMatchesClientProps {
    initialMatches: MatchAdminView[];
}


export function AdminMatchesClient({ initialMatches }: AdminMatchesClientProps) {
    const [matches, setMatches] = useState(initialMatches);
    const [isResolving, setIsResolving] = useState<number | null>(null);
    const [isProcessingAll, setIsProcessingAll] = useState(false);
    const [isNotifying, setIsNotifying] = useState(false);
    const [isCreatingBolao, setIsCreatingBolao] = useState<number | null>(null);
    const [isCancelingBolao, setIsCancelingBolao] = useState<number | null>(null);
    const [isCreatingMvp, setIsCreatingMvp] = useState<number | null>(null);
    const { toast } = useToast();

    const handleResolve = async (fixtureId: number) => {
        setIsResolving(fixtureId);
        const result = await resolveMatch(fixtureId);
        if (result.success) {
            toast({
                title: "Sucesso!",
                description: result.message,
            });
            // Refetch data to ensure UI is in sync with the database
            const updatedMatches = await getAdminMatches();
            setMatches(updatedMatches);
        } else {
            toast({
                title: "Erro ao Resolver",
                description: result.message,
                variant: "destructive",
            });
        }
        setIsResolving(null);
    };

    const handleProcessAll = async () => {
        setIsProcessingAll(true);
        toast({
            title: "Iniciando Processamento",
            description: "Buscando e processando todas as partidas finalizadas...",
        });
        const result = await processAllFinishedMatches();
        
        toast({
            title: "Processamento Concluído",
            description: result.message,
            variant: result.success ? "default" : "destructive",
        });

        // Refetch data to update the UI
        const updatedMatches = await getAdminMatches();
        setMatches(updatedMatches);
        
        setIsProcessingAll(false);
    }

    const handleNotifyUpcoming = async () => {
        setIsNotifying(true);
        toast({
            title: "Verificando Partidas",
            description: "Buscando partidas prestes a começar para notificar...",
        });
        const result = await sendUpcomingMatchNotifications();
        
        toast({
            title: "Verificação Concluída",
            description: result.message,
            variant: result.success ? "default" : "destructive",
        });
        
        setIsNotifying(false);
    }

    const handleCreateBolao = async (fixtureId: number) => {
        setIsCreatingBolao(fixtureId);
        const result = await createBolao(fixtureId);
        if (result.success) {
            toast({ title: "Sucesso!", description: result.message });
            const updatedMatches = await getAdminMatches();
            setMatches(updatedMatches);
        } else {
            toast({ title: "Erro", description: result.message, variant: "destructive" });
        }
        setIsCreatingBolao(null);
    }
    
    const handleCancelBolao = async (bolaoId: string | undefined, fixtureId: number) => {
        if (!bolaoId) {
            toast({ title: "Erro", description: "ID do Bolão não encontrado.", variant: "destructive" });
            return;
        }
        setIsCancelingBolao(fixtureId);
        const result = await cancelBolao(bolaoId);
        if (result.success) {
            toast({ title: "Sucesso!", description: result.message });
            const updatedMatches = await getAdminMatches();
            setMatches(updatedMatches);
        } else {
            toast({ title: "Erro", description: result.message, variant: "destructive" });
        }
        setIsCancelingBolao(null);
    }

    const handleCreateMvp = async (fixtureId: number) => {
        setIsCreatingMvp(fixtureId);
        const result = await createMvpVoting(fixtureId);
        if (result.success) {
            toast({ title: "Sucesso!", description: result.message });
            const updatedMatches = await getAdminMatches();
            setMatches(updatedMatches);
        } else {
            toast({ title: "Erro", description: result.message, variant: "destructive" });
        }
        setIsCreatingMvp(null);
    }

    return (
        <Card>
            <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <CardTitle>Gerenciar Partidas</CardTitle>
                    <CardDescription>
                        Resolva partidas, pague apostas e notifique sobre jogos futuros.
                    </CardDescription>
                </div>
                 <div className="flex gap-2 flex-wrap">
                     <Button onClick={handleNotifyUpcoming} disabled={isNotifying || isProcessingAll} variant="outline">
                        {isNotifying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BellRing className="mr-2 h-4 w-4" />}
                        Notificar Próximas
                    </Button>
                    <Button onClick={handleProcessAll} disabled={isProcessingAll || isNotifying}>
                        {isProcessingAll ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                        Processar Finalizadas
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Partida</TableHead>
                            <TableHead className="hidden md:table-cell">Liga</TableHead>
                            <TableHead className="hidden lg:table-cell">Horário</TableHead>
                            <TableHead className="text-center">Status</TableHead>
                            <TableHead>
                                <span className="sr-only">Ações</span>
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {matches.map((match) => (
                            <TableRow key={match.id}>
                                <TableCell>
                                    <div className="flex items-center gap-2 font-medium">
                                        {match.hasBolao && <Crown className="h-4 w-4 text-yellow-400" title="Bolão Ativo" />}
                                        {match.hasMvpVoting && <Star className="h-4 w-4 text-orange-400" title="Votação MVP Ativa" />}
                                        {match.teamA} vs {match.teamB}
                                    </div>
                                </TableCell>
                                <TableCell className="hidden md:table-cell">{match.league}</TableCell>
                                <TableCell className="hidden lg:table-cell">{match.time}</TableCell>
                                <TableCell className="text-center">
                                    <Badge variant={
                                        match.status === "Ao Vivo" || match.status === "Intervalo" || match.status === "Paralizado" ? "destructive" :
                                        match.status === "Pago" ? "default" :
                                        "secondary"
                                    } className={
                                        match.status === "Ao Vivo" || match.status === "Intervalo" || match.status === "Paralizado" ? "bg-red-500/80 text-white" :
                                        match.status === "Pago" ? "bg-green-600/90 text-white" :
                                        match.status === "Pendente Pagamento" ? "bg-yellow-500/80 text-white" :
                                        match.status === "Adiado" ? "bg-gray-500/80 text-white" : ""
                                    }>
                                        {match.status}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button aria-haspopup="true" size="icon" variant="ghost" disabled={isResolving === match.fixtureId || isCancelingBolao === match.fixtureId || isCreatingMvp === match.fixtureId}>
                                                {(isResolving === match.fixtureId || isCancelingBolao === match.fixtureId || isCreatingMvp === match.fixtureId) ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <MoreHorizontal className="h-4 w-4" />
                                                )}
                                                <span className="sr-only">Toggle menu</span>
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuLabel>Ações da Partida</DropdownMenuLabel>
                                            <DropdownMenuItem 
                                                onClick={() => handleResolve(match.fixtureId)}
                                                disabled={match.status !== 'Pendente Pagamento'}
                                            >
                                                Resolver Partida
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuLabel>Eventos</DropdownMenuLabel>
                                            <DropdownMenuItem
                                                onClick={() => handleCreateBolao(match.fixtureId)}
                                                disabled={match.status !== 'Agendada' || match.hasBolao || isCreatingBolao === match.fixtureId}
                                            >
                                                {isCreatingBolao === match.fixtureId && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                {match.hasBolao ? "Bolão Já Criado" : "Criar Bolão"}
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() => handleCancelBolao(match.bolaoId, match.fixtureId)}
                                                disabled={!match.hasBolao || isCancelingBolao === match.fixtureId}
                                                className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                                            >
                                                {isCancelingBolao === match.fixtureId && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                Cancelar Bolão
                                            </DropdownMenuItem>
                                             <DropdownMenuItem
                                                onClick={() => handleCreateMvp(match.fixtureId)}
                                                disabled={match.status !== 'Pago' || match.hasMvpVoting || isCreatingMvp === match.fixtureId}
                                            >
                                                {isCreatingMvp === match.fixtureId && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                {match.hasMvpVoting ? "Votação MVP Já Criada" : "Criar Votação MVP"}
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}
