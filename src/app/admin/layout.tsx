
'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useMemo, useState, useEffect } from "react";
import {
    Bot, Home, Megaphone, Receipt, Server, Settings, ShoppingBag, Star, Ticket, Trophy, Users, FilePen, Tv, PartyPopper, Layers, Gift, QrCode, HelpCircle, BarChart, BrainCircuit, Puzzle, Shield,
} from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FielBetLogo } from "@/components/icons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { AvatarFallbackText } from "@/components/avatar-fallback-text";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";

interface AdminLayoutProps {
    children: ReactNode;
}

const allNavGroups = [
  {
    title: 'Principal',
    icon: Home,
    links: [
      { href: "/admin/dashboard", label: "Dashboard", icon: Home, adminOnly: true },
    ]
  },
  {
    title: 'Gerenciamento',
    icon: Trophy,
    links: [
      { href: "/admin/matches", label: "Partidas", icon: Trophy, adminOnly: true },
      { href: "/admin/championships", label: "Campeonatos", icon: BarChart, adminOnly: true },
      { href: "/admin/bets", label: "Apostas", icon: Ticket, adminOnly: true },
      { href: "/admin/users", label: "Usuários", icon: Users, adminOnly: true },
      { href: "/admin/moderation", label: "Moderação", icon: Shield, adminOnly: true },
      { href: "/admin/purchases", label: "Compras", icon: Receipt, adminOnly: true },
    ]
  },
  {
    title: 'Comunidade & Eventos',
    icon: Star,
    links: [
        { href: "/admin/mvp", label: "MVP Votação", icon: Star, adminOnly: true },
        { href: "/admin/level", label: "Níveis", icon: Layers, adminOnly: true },
        { href: "/admin/announcements", label: "Posts", icon: FilePen, adminOnly: false },
        { href: "/admin/stream", label: "Transmissão", icon: Tv, adminOnly: true },
        { href: "/admin/events", label: "Eventos", icon: PartyPopper, adminOnly: true },
        { href: "/admin/quiz", label: "Quiz", icon: HelpCircle, adminOnly: true },
        { href: "/admin/player-game", label: "Quem é o Jogador?", icon: BrainCircuit, adminOnly: true },
        { href: "/admin/forca", label: "Forca", icon: Puzzle, adminOnly: true },
    ]
  },
  {
    title: 'Monetização',
    icon: ShoppingBag,
    links: [
        { href: "/admin/store", label: "Loja", icon: ShoppingBag, adminOnly: true },
        { href: "/admin/ads", label: "Anúncios", icon: Megaphone, adminOnly: true },
        { href: "/admin/rewards", label: "Recompensas", icon: Gift, adminOnly: true },
        { href: "/admin/codes", label: "Códigos", icon: QrCode, adminOnly: true },
    ]
  },
  {
    title: 'Configuração',
    icon: Settings,
    links: [
        { href: "/admin/server", label: "Servidor", icon: Server, adminOnly: true },
        { href: "/admin/bot", label: "Bot", icon: Bot, adminOnly: true },
        { href: "/admin/settings", label: "Configurações", icon: Settings, adminOnly: true },
    ]
  }
];


export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user;
  const isVip = user?.isVip ?? false;

  const navGroups = useMemo(() => {
    if (!user) return [];
    return allNavGroups.map(group => ({
        ...group,
        links: group.links.filter(link => {
            if (!link.adminOnly) {
               return user.admin || user.canPost;
            }
            return user.admin;
        })
    })).filter(group => group.links.length > 0);
  }, [user]);
  
  const [openMenus, setOpenMenus] = useState<string[]>([]);
  const [isInitialStateLoaded, setIsInitialStateLoaded] = useState(false);

  // Load state from localStorage on mount
  useEffect(() => {
    const activeGroup = navGroups.find(group => group.links.some(link => pathname.startsWith(link.href)));
    const defaultOpen = activeGroup ? [activeGroup.title] : [];
    try {
        const storedState = localStorage.getItem('adminSidebarOpenMenus');
        setOpenMenus(storedState ? JSON.parse(storedState) : defaultOpen);
    } catch {
        setOpenMenus(defaultOpen);
    }
    setIsInitialStateLoaded(true);
  }, [navGroups, pathname]);


  // Find active group and open it if not already open
  useEffect(() => {
      const activeGroup = navGroups.find(group => group.links.some(link => pathname.startsWith(link.href)));
      if (activeGroup && !openMenus.includes(activeGroup.title)) {
          // Use a timeout to ensure state is settled before updating
          setTimeout(() => setOpenMenus(prev => [...prev, activeGroup.title]), 0);
      }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, navGroups]);

  // Persist state to localStorage
  useEffect(() => {
    if (isInitialStateLoaded) {
        try {
            localStorage.setItem('adminSidebarOpenMenus', JSON.stringify(openMenus));
        } catch (error) {
            console.error("Failed to save admin sidebar state to localStorage:", error);
        }
    }
  }, [openMenus, isInitialStateLoaded]);

  const toggleMenu = (title: string) => {
    setOpenMenus(prev =>
      prev.includes(title)
        ? prev.filter((item) => item !== title)
        : [...prev, title]
    );
  };

  const userName = user?.name ?? 'Admin';
  const userImage = user?.image ?? 'https://placehold.co/40x40.png';

  const renderNav = () => (
    <SidebarMenu>
        {navGroups.map((group) => {
            const GroupIcon = group.icon;
            return (
                <SidebarMenuItem key={group.title}>
                    <SidebarMenuButton
                        onClick={() => toggleMenu(group.title)}
                        data-state={openMenus.includes(group.title) ? 'open' : 'closed'}
                    >
                        <GroupIcon />
                        <span>{group.title}</span>
                    </SidebarMenuButton>
                    {openMenus.includes(group.title) && (
                        <SidebarMenuSub>
                            {group.links.map(link => (
                                <SidebarMenuSubItem key={link.href}>
                                    <SidebarMenuSubButton
                                        asChild
                                        isActive={pathname.startsWith(link.href)}
                                    >
                                        <Link href={link.href}>
                                            <link.icon/>
                                            <span>{link.label}</span>
                                        </Link>
                                    </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                            ))}
                        </SidebarMenuSub>
                    )}
                </SidebarMenuItem>
            )
        })}
    </SidebarMenu>
  );

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <Link href="/admin/dashboard" className="flex items-center gap-2">
            <FielBetLogo className="size-7 text-primary" />
            <h2 className="text-lg font-semibold font-headline text-primary">Painel Admin</h2>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          {renderNav()}
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
          <SidebarTrigger className="md:hidden" />
          <div className="w-full flex-1" />
          <DropdownMenu>
              <DropdownMenuTrigger asChild>
                  <Avatar className={cn("h-9 w-9 cursor-pointer", isVip && "ring-2 ring-offset-2 ring-vip ring-offset-muted")}>
                      <AvatarImage src={userImage} alt="Admin Avatar" data-ai-hint="user avatar" />
                      <AvatarFallback><AvatarFallbackText name={userName} /></AvatarFallback>
                  </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
              {(user?.admin || user?.canPost) && <DropdownMenuItem asChild><Link href="/admin/dashboard">Painel</Link></DropdownMenuItem>}
              <DropdownMenuItem asChild><Link href="/bet">Voltar ao App</Link></DropdownMenuItem>
              <DropdownMenuItem onClick={() => signOut({ callbackUrl: '/' })}>Deslogar</DropdownMenuItem>
              </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-muted/20">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
