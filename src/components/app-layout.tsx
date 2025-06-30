

'use client';

import type { ReactNode } from 'react';
import { Suspense } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarTrigger,
  SidebarInset,
  SidebarMenuSkeleton,
} from '@/components/ui/sidebar';
import { FielBetLogo } from '@/components/icons';
import { Header } from '@/components/header';
import { ChampionshipSidebarMenu } from '@/components/championship-sidebar-menu';
import { BetSlipProvider } from '@/context/bet-slip-context';
import { BetSlip } from '@/components/bet-slip';
import { Store, ShieldCheck, Swords, Star, Newspaper, UserPlus, Tv, Lock, Puzzle, Trophy } from 'lucide-react';
import { AdBanner } from './ad-banner';

interface AppLayoutProps {
    children: ReactNode;
    availableLeagues?: string[];
}

const ChampionshipMenuFallback = () => {
    return (
        <>
            <SidebarMenuItem>
                <SidebarMenuSkeleton showIcon />
            </SidebarMenuItem>
            <SidebarMenuItem>
                <SidebarMenuSkeleton showIcon />
            </SidebarMenuItem>
            <SidebarMenuItem>
                <SidebarMenuSkeleton showIcon />
            </SidebarMenuItem>
        </>
    );
};

export function AppLayout({ children, availableLeagues }: AppLayoutProps) {
    const pathname = usePathname();
    const { data: session } = useSession();

    const canAccessBolao = session?.user?.canAccessBolao ?? false;
    const canAccessMvp = session?.user?.canAccessMvp ?? false;

    return (
        <SidebarProvider>
            <BetSlipProvider>
                <Sidebar>
                    <SidebarHeader>
                        <div className="flex items-center gap-2">
                            <Link href="/bet" className="flex items-center gap-2">
                                <FielBetLogo className="size-7 text-primary" />
                                <h2 className="text-lg font-semibold font-headline text-primary">FielBet</h2>
                            </Link>
                            <div className="grow" />
                            <SidebarTrigger />
                        </div>
                    </SidebarHeader>
                    <SidebarContent>
                        <SidebarGroup>
                            <SidebarGroupLabel>Navegação</SidebarGroupLabel>
                            <SidebarGroupContent>
                                <SidebarMenu>
                                    <SidebarMenuItem>
                                        <SidebarMenuButton asChild isActive={pathname?.startsWith('/stream')}>
                                            <Link href="/stream"><Tv /><span>Transmissão</span></Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                    <SidebarMenuItem>
                                        <SidebarMenuButton asChild isActive={pathname?.startsWith('/news')}>
                                            <Link href="/news"><Newspaper /><span>Notícias</span></Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                    <SidebarMenuItem>
                                        <SidebarMenuButton asChild isActive={pathname?.startsWith('/forca')}>
                                            <Link href="/forca"><Puzzle /><span>Forca</span></Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                    <SidebarMenuItem>
                                        <SidebarMenuButton asChild={canAccessBolao} disabled={!canAccessBolao} tooltip={!canAccessBolao ? "Recurso Bloqueado" : undefined}>
                                            {canAccessBolao ? (
                                                <Link href="/bolao"><Swords /><span>Bolão</span></Link>
                                            ) : (
                                                <span className="flex w-full items-center gap-2"><Swords /><span>Bolão</span><Lock className="ml-auto" /></span>
                                            )}
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                     <SidebarMenuItem>
                                        <SidebarMenuButton asChild={canAccessMvp} disabled={!canAccessMvp} tooltip={!canAccessMvp ? "Recurso Bloqueado" : undefined}>
                                             {canAccessMvp ? (
                                                <Link href="/mvp"><Star /><span>MVP</span></Link>
                                             ) : (
                                                <span className="flex w-full items-center gap-2"><Star /><span>MVP</span><Lock className="ml-auto" /></span>
                                             )}
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                    <SidebarMenuItem>
                                        <SidebarMenuButton asChild isActive={pathname?.startsWith('/ranking')}>
                                            <Link href="/ranking"><Trophy /><span>Rankings</span></Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                    <SidebarMenuItem>
                                        <SidebarMenuButton asChild isActive={pathname?.startsWith('/store')}>
                                            <Link href="/store"><Store /><span>Loja</span></Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                </SidebarMenu>
                            </SidebarGroupContent>
                        </SidebarGroup>
                        {availableLeagues && (
                            <SidebarGroup>
                                <SidebarGroupLabel>Campeonatos</SidebarGroupLabel>
                                <SidebarGroupContent>
                                <SidebarMenu>
                                    <Suspense fallback={<ChampionshipMenuFallback />}>
                                        <ChampionshipSidebarMenu availableLeagues={availableLeagues} />
                                    </Suspense>
                                </SidebarMenu>
                                </SidebarGroupContent>
                            </SidebarGroup>
                        )}
                    </SidebarContent>
                </Sidebar>
                <SidebarInset>
                    <Header />
                    <div className="flex-1">
                        {children}
                    </div>
                    <BetSlip />
                    <AdBanner />
                </SidebarInset>
            </BetSlipProvider>
        </SidebarProvider>
    )
}
