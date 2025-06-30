
'use client'

import { Activity, CreditCard, DollarSign, Users, Loader2, RefreshCw, BellRing, Send, ShieldCheck, Wallet, Zap, Trophy, UserPlus } from "lucide-react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from "recharts"
import { useState } from "react"
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { DashboardStats, TopBettor, RecentUser, BetVolumeData, ProfitLossData, RichestUserRanking, TopLevelUserRanking, InviterRanking } from "@/types"
import { useToast } from "@/hooks/use-toast"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { processAllFinishedMatches, sendAnnouncement, getChartData } from "@/actions/admin-actions";
import { updateFixturesFromApi } from "@/actions/fixtures-actions";
import { sendUpcomingMatchNotifications } from "@/actions/match-notifications";
import { Separator } from "./ui/separator";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "./ui/form";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { AvatarFallbackText } from "./avatar-fallback-text";


const volumeChartConfig = {
  totalWagered: {
    label: "Total Apostado",
    color: "hsl(var(--chart-1))",
  },
  totalBets: {
    label: "Nº de Apostas",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig

const profitChartConfig = {
    wagered: {
        label: "Apostado",
        color: "hsl(var(--chart-4))",
    },
    winnings: {
        label: "Ganhos (Prêmios)",
        color: "hsl(var(--chart-2))",
    },
} satisfies ChartConfig

const announcementSchema = z.object({
    title: z.string().min(5, "Título muito curto.").max(50, "Título muito longo."),
    description: z.string().min(10, "Descrição muito curta.").max(200, "Descrição muito longa."),
    target: z.enum(['all', 'vip', 'normal']),
    link: z.string().url("URL inválida.").optional().or(z.literal('')),
});

interface AdminDashboardClientProps {
    stats: DashboardStats;
    initialChartData: { volume: BetVolumeData; profit: ProfitLossData; };
    topBettors: TopBettor[];
    recentUsers: RecentUser[];
    richestUsers: RichestUserRanking[];
    topLevelUsers: TopLevelUserRanking[];
    topInviters: InviterRanking[];
}

const obfuscateEmail = (email: string) => {
    if (!email || !email.includes('@')) {
        return 'Email inválido';
    }
    const [localPart, domain] = email.split('@');
    if (localPart.length <= 3) {
        return `${localPart.slice(0, 1)}*****@${domain}`;
    }
    return `${localPart.slice(0, 3)}*****@${domain}`;
};


export function AdminDashboardClient({ stats, initialChartData, topBettors, recentUsers, richestUsers, topLevelUsers, topInviters }: AdminDashboardClientProps) {
    const { toast } = useToast();
    const [isProcessingAll, setIsProcessingAll] = useState(false);
    const [isNotifying, setIsNotifying] = useState(false);
    const [isUpdatingFixtures, setIsUpdatingFixtures] = useState(false);
    const [isSendingAnnouncement, setIsSendingAnnouncement] = useState(false);
    const [chartData, setChartData] = useState(initialChartData);
    const [isChartLoading, setIsChartLoading] = useState(false);
    const [chartPeriod, setChartPeriod] = useState<'weekly' | 'monthly'>('weekly');
    
    const announcementForm = useForm<z.infer<typeof announcementSchema>>({
        resolver: zodResolver(announcementSchema),
        defaultValues: {
            title: '',
            description: '',
            target: 'all',
            link: '',
        },
    });
    
    const handleProcessAll = async () => {
        setIsProcessingAll(true);
        toast({ title: "Iniciando Processamento", description: "Buscando e processando todas as partidas finalizadas..." });
        const result = await processAllFinishedMatches();
        toast({ title: "Processamento Concluído", description: result.message, variant: result.success ? "default" : "destructive" });
        setIsProcessingAll(false);
    };

    const handleNotifyUpcoming = async () => {
        setIsNotifying(true);
        toast({ title: "Verificando Partidas", description: "Buscando partidas prestes a começar para notificar..." });
        const result = await sendUpcomingMatchNotifications();
        toast({ title: "Verificação Concluída", description: result.message, variant: result.success ? "default" : "destructive" });
        setIsNotifying(false);
    };
    
    const handleUpdateFixtures = async () => {
        setIsUpdatingFixtures(true);
        toast({ title: "Iniciando Atualização", description: "Buscando novas partidas e odds da API..." });
        const result = await updateFixturesFromApi();
        toast({ title: "Atualização Concluída", description: result.message, variant: result.success ? "default" : "destructive" });
        setIsUpdatingFixtures(false);
    };

    const onAnnouncementSubmit = async (values: z.infer<typeof announcementSchema>) => {
        setIsSendingAnnouncement(true);
        const result = await sendAnnouncement(values);
        if (result.success) {
            toast({ title: `Sucesso!`, description: result.message });
            announcementForm.reset();
        } else {
            toast({ title: 'Erro', description: result.message, variant: 'destructive' });
        }
        setIsSendingAnnouncement(false);
    };
    
    const handlePeriodChange = async (period: 'weekly' | 'monthly') => {
        setIsChartLoading(true);
        setChartPeriod(period);
        const newData = await getChartData(period);
        setChartData(newData);
        setIsChartLoading(false);
    }
    
    const formatCurrency = (value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const getChangeColor = (value: number) => value >= 0 ? "text-green-500" : "text-red-500";
    
    const anyActionRunning = isProcessingAll || isNotifying || isUpdatingFixtures;

  return (
    <div className="grid auto-rows-max items-start gap-4 md:gap-8 lg:grid-cols-3">
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 lg:col-span-3">
          <Card className="border-l-4 border-primary">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Apostado
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalWagered)}</div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-sky-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Usuários Ativos
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">+{stats.activeUsers}</div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-amber-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Apostas</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">+{stats.totalBets.toLocaleString('pt-BR')}</div>
            </CardContent>
          </Card>
          <Card className={cn("border-l-4", stats.grossProfit >= 0 ? "border-green-500" : "border-red-500")}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Lucro Bruto</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={cn("text-2xl font-bold", getChangeColor(stats.grossProfit))}>
                  {stats.grossProfit >= 0 ? `+${formatCurrency(stats.grossProfit)}` : formatCurrency(stats.grossProfit)}
              </div>
            </CardContent>
          </Card>
      </div>

        <Card className="lg:col-span-3">
            <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <CardTitle>Visão Geral de Desempenho</CardTitle>
                        <CardDescription>Análise de volume de apostas e lucratividade.</CardDescription>
                    </div>
                    <Tabs defaultValue="weekly" onValueChange={(value) => handlePeriodChange(value as any)} className="w-full sm:w-auto">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="weekly">Semanal</TabsTrigger>
                            <TabsTrigger value="monthly">Mensal</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
            </CardHeader>
            <CardContent className="relative pt-2">
                {isChartLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10 rounded-lg">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                )}
                <div className={cn("grid grid-cols-1 xl:grid-cols-2 gap-8", isChartLoading && "opacity-50 blur-sm")}>
                    <div>
                        <h3 className="font-semibold mb-4 text-center">Volume de Apostas ({chartPeriod === 'weekly' ? 'Últimos 7 dias' : 'Este Mês'})</h3>
                        <ChartContainer config={volumeChartConfig} className="h-[350px] w-full min-w-[300px]">
                            <BarChart data={chartData.volume}>
                                <CartesianGrid vertical={false} />
                                <XAxis dataKey="date" tickLine={false} tickMargin={10} axisLine={false} />
                                <YAxis yAxisId="left" orientation="left" stroke="hsl(var(--chart-1))" tickFormatter={(value) => `R$${Number(value) / 1000}k`} />
                                <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--chart-2))" />
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <Legend />
                                <Bar yAxisId="left" dataKey="totalWagered" fill="var(--color-totalWagered)" radius={4} name="Total Apostado" />
                                <Bar yAxisId="right" dataKey="totalBets" fill="var(--color-totalBets)" radius={4} name="Nº de Apostas" />
                            </BarChart>
                        </ChartContainer>
                    </div>
                     <div>
                        <h3 className="font-semibold mb-4 text-center">Lucratividade ({chartPeriod === 'weekly' ? 'Últimos 7 dias' : 'Este Mês'})</h3>
                        <ChartContainer config={profitChartConfig} className="h-[350px] w-full min-w-[300px]">
                            <BarChart data={chartData.profit}>
                                <CartesianGrid vertical={false} />
                                <XAxis dataKey="date" tickLine={false} tickMargin={10} axisLine={false} />
                                <YAxis tickFormatter={(value) => `R$${Number(value)/1000}k`} />
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <Legend />
                                <Bar dataKey="wagered" fill="var(--color-wagered)" radius={4} name="Apostado" />
                                <Bar dataKey="winnings" fill="var(--color-winnings)" radius={4} name="Ganhos (Prêmios)" />
                            </BarChart>
                        </ChartContainer>
                    </div>
                </div>
            </CardContent>
        </Card>

        <div className="grid auto-rows-max gap-4 md:gap-8 lg:col-span-2">
            <div className="grid gap-4 sm:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Trophy />Top Apostadores</CardTitle>
                        <CardDescription>Usuários com maior volume de apostas.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                        {topBettors.map(user => (
                            <div className="flex items-center gap-4" key={user.email}>
                            <Avatar className={cn("hidden h-9 w-9 sm:flex", user.isVip && "ring-2 ring-vip")}>
                                <AvatarImage src={user.avatar} alt="Avatar" data-ai-hint="user avatar" />
                                <AvatarFallback><AvatarFallbackText name={user.name} /></AvatarFallback>
                            </Avatar>
                            <div className="grid gap-1">
                                <p className="text-sm font-medium leading-none">{user.name}</p>
                                <p className="text-sm text-muted-foreground">{obfuscateEmail(user.email)}</p>
                            </div>
                            <div className="ml-auto font-medium">{formatCurrency(user.totalWagered)}</div>
                            </div>
                        ))}
                        {topBettors.length === 0 && <p className="text-sm text-center text-muted-foreground">Nenhum apostador encontrado.</p>}
                    </CardContent>
                    <CardFooter>
                         <Link href="/ranking" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full")}>Ver Ranking Completo</Link>
                    </CardFooter>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Wallet /> Mais Ricos</CardTitle>
                        <CardDescription>Usuários com maior saldo.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                        {richestUsers.map(user => (
                            <div className="flex items-center gap-4" key={user.discordId}>
                                <Avatar className={cn("hidden h-9 w-9 sm:flex", user.isVip && "ring-2 ring-vip")}>
                                    <AvatarImage src={user.avatar} alt="Avatar" data-ai-hint="user avatar" />
                                    <AvatarFallback><AvatarFallbackText name={user.name} /></AvatarFallback>
                                </Avatar>
                                <div className="grid gap-1">
                                    <p className="text-sm font-medium leading-none">{user.name}</p>
                                    <p className="text-sm text-muted-foreground">Rank: {user.rank}</p>
                                </div>
                                <div className="ml-auto font-medium">{formatCurrency(user.balance)}</div>
                            </div>
                        ))}
                        {richestUsers.length === 0 && <p className="text-sm text-center text-muted-foreground">Nenhum usuário encontrado.</p>}
                    </CardContent>
                    <CardFooter>
                        <Link href="/ranking" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full")}>Ver Ranking Completo</Link>
                    </CardFooter>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Zap /> Top Níveis</CardTitle>
                        <CardDescription>Usuários com mais experiência (XP).</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                        {topLevelUsers.map(user => (
                            <div className="flex items-center gap-4" key={user.discordId}>
                                <Avatar className={cn("hidden h-9 w-9 sm:flex", user.isVip && "ring-2 ring-vip")}>
                                    <AvatarImage src={user.avatar} alt="Avatar" data-ai-hint="user avatar" />
                                    <AvatarFallback><AvatarFallbackText name={user.name} /></AvatarFallback>
                                </Avatar>
                                <div className="grid gap-1">
                                    <p className="text-sm font-medium leading-none">{user.name}</p>
                                    <p className="text-sm text-muted-foreground">{user.xp.toLocaleString('pt-BR')} XP</p>
                                </div>
                                <div className="ml-auto font-medium">Nível {user.level}</div>
                            </div>
                        ))}
                        {topLevelUsers.length === 0 && <p className="text-sm text-center text-muted-foreground">Nenhum usuário encontrado.</p>}
                    </CardContent>
                    <CardFooter>
                        <Link href="/ranking" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full")}>Ver Ranking Completo</Link>
                    </CardFooter>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><UserPlus />Top Convites</CardTitle>
                        <CardDescription>Usuários que mais convidaram.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                        {topInviters.map(user => (
                            <div className="flex items-center gap-4" key={user.inviterId}>
                                <Avatar className={cn("hidden h-9 w-9 sm:flex", user.isVip && "ring-2 ring-vip")}>
                                    <AvatarImage src={user.avatar} alt="Avatar" data-ai-hint="user avatar" />
                                    <AvatarFallback><AvatarFallbackText name={user.name} /></AvatarFallback>
                                </Avatar>
                                <div className="grid gap-1">
                                    <p className="text-sm font-medium leading-none">{user.name}</p>
                                    <p className="text-sm text-muted-foreground">Rank: {user.rank}</p>
                                </div>
                                <div className="ml-auto font-medium">{user.inviteCount} convites</div>
                            </div>
                        ))}
                        {topInviters.length === 0 && <p className="text-sm text-center text-muted-foreground">Nenhum convidador encontrado.</p>}
                    </CardContent>
                    <CardFooter>
                        <Link href="/convites" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full")}>Ver Página de Convites</Link>
                    </CardFooter>
                </Card>
            </div>
        </div>

      <div className="grid auto-rows-max gap-4 md:gap-8 lg:col-span-1">
          <Card>
            <CardHeader>
                <CardTitle>Ações Rápidas</CardTitle>
                <CardDescription>Execute tarefas manuais e envie comunicados.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
                <div className="flex flex-wrap gap-2">
                    <Button onClick={handleUpdateFixtures} disabled={anyActionRunning}>
                        {isUpdatingFixtures ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                        Atualizar Partidas
                    </Button>
                    <Button onClick={handleProcessAll} disabled={anyActionRunning} variant="outline">
                        {isProcessingAll ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                        Processar Finalizadas
                    </Button>
                    <Button onClick={handleNotifyUpcoming} disabled={anyActionRunning} variant="outline">
                        {isNotifying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BellRing className="mr-2 h-4 w-4" />}
                        Notificar Próximas
                    </Button>
                </div>
                <Separator />
                <Form {...announcementForm}>
                    <form onSubmit={announcementForm.handleSubmit(onAnnouncementSubmit)} className="space-y-4">
                        <p className="text-sm font-medium">Enviar Comunicado Global</p>
                        <FormField control={announcementForm.control} name="title" render={({ field }) => (
                            <FormItem><FormLabel className="sr-only">Título</FormLabel><FormControl><Input placeholder="Título do comunicado" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField control={announcementForm.control} name="description" render={({ field }) => (
                            <FormItem><FormLabel className="sr-only">Descrição</FormLabel><FormControl><Textarea placeholder="Descrição do comunicado..." {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                            <FormField control={announcementForm.control} name="link" render={({ field }) => (
                            <FormItem><FormLabel className="sr-only">Link</FormLabel><FormControl><Input placeholder="Link opcional (ex: /store)" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <FormField control={announcementForm.control} name="target" render={({ field }) => (
                                <FormItem className="flex-1">
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Público Alvo" /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            <SelectItem value="all">Todos os Usuários</SelectItem>
                                            <SelectItem value="vip">Apenas VIPs</SelectItem>
                                            <SelectItem value="normal">Não-VIPs</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </FormItem>
                            )}/>
                            <Button type="submit" disabled={isSendingAnnouncement} className="flex-1">
                                {isSendingAnnouncement ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                Enviar
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-3">
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><UserPlus /> Novos Membros</CardTitle>
                <CardDescription>
                  Os últimos 5 usuários que se cadastraram no site.
                </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6">
                {recentUsers.length > 0 ? recentUsers.map((user, index) => (
                    <div className="flex items-center gap-4" key={index}>
                    <Avatar className="hidden h-9 w-9 sm:flex">
                        <AvatarImage src={user.avatar} alt="Avatar" data-ai-hint="user avatar" />
                        <AvatarFallback><AvatarFallbackText name={user.name} /></AvatarFallback>
                    </Avatar>
                    <div className="grid gap-1">
                        <p className="text-sm font-medium leading-none">{user.name}</p>
                    </div>
                    <div className="ml-auto text-sm text-muted-foreground">{user.joinDate}</div>
                    </div>
                )) : (
                    <p className="text-sm text-center text-muted-foreground">Nenhum usuário recente.</p>
                )}
            </CardContent>
          </Card>
      </div>
    </div>
  )
}
