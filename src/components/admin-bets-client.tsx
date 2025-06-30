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
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { MoreHorizontal } from "lucide-react"
import { Label } from "@/components/ui/label";

type BetAdminView = {
    id: string;
    userName: string;
    userEmail: string;
    matchDescription: string;
    selections: string;
    stake: number;
    potentialWinnings: number;
    status: 'Em Aberto' | 'Ganha' | 'Perdida' | 'Cancelada';
};


interface AdminBetsClientProps {
    initialBets: BetAdminView[];
}


export function AdminBetsClient({ initialBets }: AdminBetsClientProps) {
    const [allBets, setAllBets] = useState(initialBets);
    const [selectedBet, setSelectedBet] = useState<BetAdminView | null>(null);

    const openBets = allBets.filter(b => b.status === 'Em Aberto');
    const wonBets = allBets.filter(b => b.status === 'Ganha');
    const lostBets = allBets.filter(b => b.status === 'Perdida');

    const renderTable = (bets: BetAdminView[]) => (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead className="hidden md:table-cell">Partida/Seleções</TableHead>
                    <TableHead>Seleções</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="hidden text-center sm:table-cell">Status</TableHead>
                    <TableHead>
                        <span className="sr-only">Ações</span>
                    </TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {bets.map((bet) => (
                    <TableRow key={bet.id}>
                        <TableCell>
                            <div className="font-medium">{bet.userName}</div>
                            <div className="hidden text-sm text-muted-foreground sm:block">{bet.userEmail}</div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">{bet.matchDescription}</TableCell>
                        <TableCell>
                            <div className="max-w-[200px] truncate">{bet.selections}</div>
                        </TableCell>
                        <TableCell className="text-right">R$ {bet.stake.toFixed(2)}</TableCell>
                        <TableCell className="hidden text-center sm:table-cell">
                            <Badge variant={
                                bet.status === "Ganha" ? "outline" : bet.status === "Perdida" ? "destructive" : "secondary"
                            }>
                                {bet.status}
                            </Badge>
                        </TableCell>
                        <TableCell>
                             <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button aria-haspopup="true" size="icon" variant="ghost">
                                    <MoreHorizontal className="h-4 w-4" />
                                    <span className="sr-only">Toggle menu</span>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                  <DropdownMenuItem onClick={() => setSelectedBet(bet)}>Ver Detalhes</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );

  return (
    <>
        <Tabs defaultValue="all">
            <div className="flex items-center">
                <TabsList>
                    <TabsTrigger value="all">Todas</TabsTrigger>
                    <TabsTrigger value="open">Em Aberto</TabsTrigger>
                    <TabsTrigger value="won">Ganha</TabsTrigger>
                    <TabsTrigger value="lost">Perdida</TabsTrigger>
                </TabsList>
            </div>
            <TabsContent value="all">
                <Card>
                    <CardHeader>
                        <CardTitle>Todas as Apostas</CardTitle>
                        <CardDescription>
                            Gerencie todas as apostas realizadas na plataforma.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {renderTable(allBets)}
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="open">
                <Card>
                    <CardHeader>
                        <CardTitle>Apostas em Aberto</CardTitle>
                        <CardDescription>
                            Apostas que ainda não foram resolvidas.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {renderTable(openBets)}
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="won">
                <Card>
                    <CardHeader>
                        <CardTitle>Apostas Ganhas</CardTitle>
                        <CardDescription>
                            Histórico de apostas vitoriosas.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {renderTable(wonBets)}
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="lost">
                <Card>
                    <CardHeader>
                        <CardTitle>Apostas Perdidas</CardTitle>
                        <CardDescription>
                            Histórico de apostas perdidas.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {renderTable(lostBets)}
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>

        <Dialog open={!!selectedBet} onOpenChange={(isOpen) => !isOpen && setSelectedBet(null)}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Detalhes da Aposta</DialogTitle>
                    <DialogDescription>
                        Informações detalhadas sobre a aposta selecionada.
                    </DialogDescription>
                </DialogHeader>
                {selectedBet && (
                    <div className="grid gap-4 py-4 text-sm">
                        <div className="flex items-start justify-between">
                            <Label className="font-semibold">ID da Aposta</Label>
                            <p className="font-mono text-xs">{selectedBet.id}</p>
                        </div>
                        <div className="flex items-start justify-between">
                            <Label className="font-semibold">Usuário</Label>
                            <div className="text-right">
                                <p className="font-medium">{selectedBet.userName}</p>
                                <p className="text-muted-foreground">{selectedBet.userEmail}</p>
                            </div>
                        </div>
                        <div className="flex items-start justify-between">
                            <Label className="font-semibold">Partida/Seleções</Label>
                            <p className="font-medium text-right">{selectedBet.matchDescription}</p>
                        </div>
                        <div className="flex flex-col items-start justify-between gap-2">
                            <Label className="font-semibold">Seleções</Label>
                             <p className="font-medium text-left text-muted-foreground">{selectedBet.selections}</p>
                        </div>
                        <div className="flex items-start justify-between">
                            <Label className="font-semibold">Valor da Aposta</Label>
                            <p className="font-medium">R$ {selectedBet.stake.toFixed(2)}</p>
                        </div>
                        <div className="flex items-start justify-between">
                            <Label className="font-semibold">Ganhos Potenciais</Label>
                            <p className="font-medium">R$ {selectedBet.potentialWinnings.toFixed(2)}</p>
                        </div>
                        <div className="flex items-start justify-between">
                            <Label className="font-semibold">Status</Label>
                             <Badge variant={
                                selectedBet.status === "Ganha" ? "outline" : selectedBet.status === "Perdida" ? "destructive" : "secondary"
                            }>
                                {selectedBet.status}
                            </Badge>
                        </div>
                    </div>
                )}
                <DialogFooter>
                    <Button variant="outline" onClick={() => setSelectedBet(null)}>Fechar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </>
  )
}
