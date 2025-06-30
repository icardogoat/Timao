
import { AppLayout } from "@/components/app-layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Trophy, DollarSign, TrendingUp, TrendingDown, Ticket, Medal, Wallet, Gem, CheckCircle, XCircle, Package } from "lucide-react";
import Link from 'next/link';
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getAvailableLeagues } from "@/actions/bet-actions";
import { getUserStats, getTopWinners, getMostActiveBettors, getRichestUsers } from "@/actions/user-actions";
import { redirect } from "next/navigation";
import { getAllAchievements, getUserAchievements } from "@/actions/achievement-actions";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AvatarFallbackText } from "@/components/avatar-fallback-text";
import { getUserInventory } from "@/actions/store-actions";


interface StatCardProps {
    icon: React.ReactNode;
    title: string;
    value: string | number;
    valueClassName?: string;
    footer?: string;
}

function StatCard({ icon, title, value, valueClassName, footer }: StatCardProps) {
    return (
        <div className="rounded-lg border bg-card p-4 text-center flex flex-col items-center justify-center">
            <div className="mb-2">{icon}</div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className={cn("text-2xl font-bold", valueClassName)}>{value}</p>
            {footer && <p className="text-xs text-muted-foreground mt-1">{footer}</p>}
        </div>
    );
}

export default async function ProfilePage() {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        redirect('/');
    }

    const { discordId, name, email, image, isVip, level: userLevel } = session.user;
    const userName = name ?? "Usuário";

    const [
        userStats,
        topWinners,
        mostActiveBettors,
        richestUsers,
        availableLeagues,
        allAchievements,
        unlockedAchievementIds,
        userInventory,
    ] = await Promise.all([
        getUserStats(discordId),
        getTopWinners(),
        getMostActiveBettors(),
        getRichestUsers(),
        getAvailableLeagues(),
        getAllAchievements(),
        getUserAchievements(discordId),
        getUserInventory(discordId),
    ]);

    const unlockedSet = new Set(unlockedAchievementIds);
    const { totalWinnings, totalLosses, totalWagered, totalBets, betsWon, betsLost } = userStats;

    const userWinnerRank = topWinners.find(u => u.discordId === discordId)?.rank;
    const userRichestRank = richestUsers.find(u => u.discordId === discordId)?.rank;
    const userActiveRank = mostActiveBettors.find(u => u.discordId === discordId)?.rank;

    const { level, levelName, progress, xp, xpForNextLevel } = userLevel ?? { level: 1, levelName: 'Iniciante', xp: 0, xpForNextLevel: 1500, progress: 0 };

    const sortedAchievements = [...allAchievements].sort((a, b) => {
        const aUnlocked = unlockedSet.has(a.id);
        const bUnlocked = unlockedSet.has(b.id);
        if (aUnlocked === bUnlocked) return 0;
        return aUnlocked ? -1 : 1;
    });

    const totalVisibleAchievements = allAchievements.filter(a => !a.hidden).length;

    return (
        <AppLayout availableLeagues={availableLeagues}>
            <div className="flex-1 space-y-8 p-4 sm:p-6 lg:p-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold font-headline tracking-tight">Perfil</h1>
                    <p className="text-muted-foreground">Suas informações, estatísticas e rankings.</p>
                </div>
                <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 lg:grid-cols-3">
                    
                    {/* Coluna da Esquerda */}
                    <aside className="lg:col-span-1 space-y-8">
                        <Card>
                            <CardContent className="pt-6 text-center">
                                <Avatar className={cn("h-24 w-24 mx-auto", isVip && "ring-2 ring-offset-4 ring-vip ring-offset-card")}>
                                    <AvatarImage src={image ?? undefined} alt={userName} data-ai-hint="user avatar" />
                                    <AvatarFallback>
                                        <AvatarFallbackText name={userName} />
                                    </AvatarFallback>
                                </Avatar>
                                <h2 className="text-xl font-semibold mt-4 flex items-center justify-center gap-2">
                                    {userName}
                                    {isVip && <Gem className="h-5 w-5 text-vip" title="Usuário VIP" />}
                                </h2>
                                <p className="text-sm text-muted-foreground">{email}</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Nível de Experiência</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex justify-between items-end">
                                    <p className="text-sm text-muted-foreground">Nível Atual</p>
                                    <div className="text-right">
                                        <p className="text-3xl font-bold leading-none">{level}</p>
                                        <p className="font-semibold text-primary">{levelName}</p>
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between items-center mb-1 text-xs text-muted-foreground">
                                        <p>{xp.toLocaleString('pt-BR')} / {xpForNextLevel.toLocaleString('pt-BR')} XP</p>
                                        <p>Nível {level + 1}</p>
                                    </div>
                                    <Progress value={progress} className="h-2" />
                                </div>
                            </CardContent>
                        </Card>
                    </aside>

                    {/* Coluna da Direita */}
                    <main className="lg:col-span-2 space-y-8">
                        <Card>
                            <CardHeader>
                                <CardTitle>Estatísticas & Rankings</CardTitle>
                                <CardDescription>Seu desempenho e posição na comunidade.</CardDescription>
                            </CardHeader>
                            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                <StatCard
                                    icon={<TrendingUp className="h-8 w-8 text-green-400" />}
                                    title="Total Ganho"
                                    value={`R$ ${totalWinnings.toFixed(2)}`}
                                    valueClassName="text-green-400"
                                />
                                <StatCard
                                    icon={<TrendingDown className="h-8 w-8 text-red-400" />}
                                    title="Total Perdido"
                                    value={`R$ ${totalLosses.toFixed(2)}`}
                                    valueClassName="text-red-400"
                                />
                                 <StatCard
                                    icon={<DollarSign className="h-8 w-8 text-primary" />}
                                    title="Total Apostado"
                                    value={`R$ ${totalWagered.toFixed(2)}`}
                                />
                                 <StatCard
                                    icon={<Ticket className="h-8 w-8 text-gray-400" />}
                                    title="Total de Apostas"
                                    value={totalBets}
                                />
                                <StatCard
                                    icon={<CheckCircle className="h-8 w-8 text-green-400" />}
                                    title="Apostas Ganhas"
                                    value={betsWon}
                                    valueClassName="text-green-400"
                                />
                                <StatCard
                                    icon={<XCircle className="h-8 w-8 text-red-400" />}
                                    title="Apostas Perdidas"
                                    value={betsLost}
                                    valueClassName="text-red-400"
                                />
                                <StatCard
                                    icon={<Trophy className="h-8 w-8 text-yellow-400" />}
                                    title="Rank (Ganhos)"
                                    value={userWinnerRank ? `#${userWinnerRank}` : 'N/A'}
                                />
                                <StatCard
                                    icon={<Wallet className="h-8 w-8 text-blue-400" />}
                                    title="Rank (Ricos)"
                                    value={userRichestRank ? `#${userRichestRank}` : 'N/A'}
                                />
                                <StatCard
                                    icon={<Medal className="h-8 w-8 text-orange-400" />}
                                    title="Rank (Ativos)"
                                    value={userActiveRank ? `#${userActiveRank}` : 'N/A'}
                                />
                            </CardContent>
                             <CardFooter className="pt-4">
                                <Link href="/ranking" className={cn(buttonVariants({ variant: "outline" }), "w-full")}>
                                    Ver Rankings Completos
                                </Link>
                            </CardFooter>
                        </Card>
                         <Card>
                            <CardHeader>
                                <div className="flex justify-between items-center">
                                    <div>
                                        <CardTitle>Conquistas</CardTitle>
                                        <CardDescription>Suas medalhas e troféus desbloqueados na FielBet.</CardDescription>
                                    </div>
                                    <p className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                                        {unlockedAchievementIds.length} / {totalVisibleAchievements} Concluídas
                                    </p>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <TooltipProvider>
                                    <div className="flex flex-wrap justify-center gap-4">
                                        {sortedAchievements.map(ach => {
                                            const isUnlocked = unlockedSet.has(ach.id);
                                            if (ach.hidden && !isUnlocked) return null;

                                            return (
                                                <Tooltip key={ach.id} delayDuration={100}>
                                                    <TooltipTrigger>
                                                        <div className={cn(
                                                            "w-16 h-16 rounded-lg bg-card-foreground/5 border-2 border-transparent flex items-center justify-center transition-all",
                                                            isUnlocked ? 'border-primary/50 text-primary' : 'grayscale opacity-60'
                                                        )}>
                                                            <ach.icon className="w-8 h-8" />
                                                        </div>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p className="font-bold">{ach.name}</p>
                                                        <p className="text-muted-foreground">{ach.description}</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            )
                                        })}
                                    </div>
                                </TooltipProvider>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Package className="h-6 w-6" />
                                    Meu Inventário
                                </CardTitle>
                                <CardDescription>Itens comprados na loja e seus códigos de resgate.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {userInventory.length > 0 ? (
                                    <div className="space-y-4">
                                        {userInventory.map(item => (
                                            <div key={item._id.toString()} className="flex items-center justify-between rounded-lg border bg-card-foreground/5 p-3">
                                                <div className="space-y-1">
                                                    <p className="font-semibold">{item.itemName}</p>
                                                    {item.redemptionCode && 
                                                        <p className="text-xs text-muted-foreground">Código: <span className="font-mono">{item.redemptionCode}</span></p>
                                                    }
                                                    <p className="text-xs text-muted-foreground">
                                                        Comprado em: {new Date(item.purchasedAt).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                                                    </p>
                                                </div>
                                                <Badge variant={item.isRedeemed ? "secondary" : "default"}>
                                                    {item.isRedeemed ? "Resgatado" : "Aguardando Resgate"}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-center text-muted-foreground py-4">Você ainda não comprou nenhum item na loja.</p>
                                )}
                            </CardContent>
                             <CardFooter>
                                <Link href="/store" className={cn(buttonVariants({ variant: "outline" }), "w-full")}>
                                    Ir para a Loja
                                </Link>
                            </CardFooter>
                        </Card>
                    </main>

                </div>
            </div>
        </AppLayout>
    );
}
