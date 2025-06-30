

"use client";

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { FielBetLogo } from '@/components/icons';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, User, Wallet, Ticket, Bell, Trophy, LayoutGrid, Store, ShieldCheck, Swords, Star, Megaphone, Newspaper, UserPlus, Tv, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSession, signOut } from 'next-auth/react';
import type { Notification } from '@/types';
import { getNotificationsForUser, markNotificationsAsRead } from '@/actions/notification-actions';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AvatarFallbackText } from './avatar-fallback-text';
import { EventHeaderBanner } from './event-banner';

// Sub-component to safely render the formatted date only on the client
function NotificationDropdownItem({ notification }: { notification: Notification }) {
    const [timeAgo, setTimeAgo] = React.useState('');

    React.useEffect(() => {
        // This runs only on the client, after hydration, preventing mismatch
        setTimeAgo(
            formatDistanceToNow(new Date(notification.date), {
                addSuffix: true,
                locale: ptBR,
            })
        );
    }, [notification.date]);

    return (
        <DropdownMenuItem key={notification._id as string} asChild className="p-0">
           <Link href={notification.link || '/notifications'} className={cn(
               "flex flex-col items-start gap-1 p-3 cursor-pointer transition-colors hover:bg-accent w-full",
               !notification.read && "bg-accent/50 hover:bg-accent"
           )}>
             <div className='flex items-center w-full'>
               <p className={cn(
                   "text-sm font-medium",
                   !notification.read ? "text-foreground" : "text-muted-foreground"
                )}>{notification.title}</p>
               {timeAgo && (
                 <p className="ml-auto text-xs text-muted-foreground">
                   {timeAgo}
                 </p>
               )}
             </div>
                <p className={cn(
                    "text-xs w-full text-left",
                    !notification.read ? "text-foreground/80" : "text-muted-foreground"
                    )}>{notification.description}</p>
           </Link>
        </DropdownMenuItem>
    );
}

export function Header() {
  const { data: session } = useSession();
  const { isMobile } = useSidebar();
  const pathname = usePathname();
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const seenNotificationIds = React.useRef(new Set<string>());
  const isInitialLoad = React.useRef(true);
  const notificationSound = React.useRef<HTMLAudioElement | null>(null);

  React.useEffect(() => {
    notificationSound.current = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-correct-answer-tone-2870.mp3');
    notificationSound.current.volume = 0.5;

    if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
        Notification.requestPermission();
    }
  }, []);

  const fetchNotifications = React.useCallback(async () => {
    if (session?.user?.discordId) {
        const userNotifications = await getNotificationsForUser(session.user.discordId);

        if (isInitialLoad.current) {
            userNotifications.forEach(n => seenNotificationIds.current.add(n._id.toString()));
            isInitialLoad.current = false;
        } else {
            userNotifications.forEach(n => {
                const notificationId = n._id.toString();
                if (!seenNotificationIds.current.has(notificationId)) {
                    notificationSound.current?.play().catch(e => console.error("Error playing sound:", e));
                    if (n.isPriority && Notification.permission === "granted") {
                        new Notification(n.title, {
                            body: n.description,
                            icon: 'https://i.imgur.com/RocHctJ.png'
                        });
                    }
                    seenNotificationIds.current.add(notificationId);
                }
            });
        }
        
        setNotifications(userNotifications);
        setUnreadCount(userNotifications.filter(n => !n.read).length);
    }
  }, [session]);

  React.useEffect(() => {
    fetchNotifications();
    const intervalId = setInterval(fetchNotifications, 30000); // Check every 30 seconds
    return () => clearInterval(intervalId);
  }, [fetchNotifications]);

  const handleOpenChange = async (open: boolean) => {
    if (open && unreadCount > 0 && session?.user?.discordId) {
        setUnreadCount(0);
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        
        await markNotificationsAsRead(session.user.discordId);
    }
  }

  const user = session?.user;
  const userName = user?.name ?? 'Usuário';
  const userImage = user?.image;
  const userBalance = user?.balance ?? 0;
  const userLevel = user?.level?.level ?? 1;
  const isVip = user?.isVip ?? false;
  const canAccessBolao = session?.user?.canAccessBolao ?? false;
  const canAccessMvp = session?.user?.canAccessMvp ?? false;

  return (
    <div className="sticky top-0 z-10">
      <EventHeaderBanner />
      <header className="flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-sm sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          {isMobile && <SidebarTrigger />}
          <div className="hidden items-center gap-2 sm:flex">
            <FielBetLogo className="size-7 text-primary" />
            <h1 className="text-lg font-semibold font-headline text-primary">FielBet</h1>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium ml-6">
              <Link 
                  href="/bet" 
                  className={cn(
                      "transition-colors hover:text-foreground",
                      pathname === "/bet" ? "text-foreground font-semibold" : "text-muted-foreground"
                  )}
              >
                  Apostas
              </Link>
              <Link 
                  href="/stream" 
                  className={cn(
                      "transition-colors hover:text-foreground",
                      pathname?.startsWith("/stream") ? "text-foreground font-semibold" : "text-muted-foreground"
                  )}
              >
                  Transmissão
              </Link>
              <Link 
                  href="/news" 
                  className={cn(
                      "transition-colors hover:text-foreground",
                      pathname?.startsWith("/news") ? "text-foreground font-semibold" : "text-muted-foreground"
                  )}
              >
                  Notícias
              </Link>
              <Link 
                  href="/bolao" 
                  className={cn(
                      "transition-colors hover:text-foreground",
                      pathname === "/bolao" ? "text-foreground font-semibold" : "text-muted-foreground",
                      !canAccessBolao && "pointer-events-none opacity-50"
                  )}
              >
                  Bolão
              </Link>
              <Link 
                  href="/mvp" 
                  className={cn(
                      "transition-colors hover:text-foreground",
                      pathname === "/mvp" ? "text-foreground font-semibold" : "text-muted-foreground",
                       !canAccessMvp && "pointer-events-none opacity-50"
                  )}
              >
                  MVP
              </Link>
              <Link 
                  href="/ranking" 
                  className={cn(
                      "transition-colors hover:text-foreground",
                      pathname === "/ranking" ? "text-foreground font-semibold" : "text-muted-foreground"
                  )}
              >
                  Rankings
              </Link>
              <Link 
                  href="/store" 
                  className={cn(
                      "transition-colors hover:text-foreground",
                      pathname === "/store" ? "text-foreground font-semibold" : "text-muted-foreground"
                  )}
              >
                  Loja
              </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 rounded-md border bg-card px-3 py-1.5 text-sm">
            <Wallet className="size-4 text-muted-foreground" />
            <span className="font-semibold text-foreground">R$ {userBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>

          <DropdownMenu onOpenChange={handleOpenChange}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative h-9 w-9">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                      <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                          {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                  )}
                  <span className="sr-only">Toggle notifications</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 md:w-96">
              <DropdownMenuLabel className='px-3 py-2'>Notificações</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className='max-h-80 overflow-y-auto'>
                  {notifications.length > 0 ? (
                      notifications.map((notification) => (
                          <NotificationDropdownItem key={notification._id as string} notification={notification} />
                      ))
                  ) : (
                      <p className='p-4 text-sm text-center text-muted-foreground'>Nenhuma notificação nova.</p>
                  )}
              </div>
              {notifications.length > 0 && (
                  <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                          <Link href="/notifications" className="flex items-center justify-center p-2 text-sm font-medium text-primary">
                              Ver todas as notificações
                          </Link>
                      </DropdownMenuItem>
                  </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0">
                  <Avatar className={cn("h-9 w-9", isVip && "ring-2 ring-offset-2 ring-vip ring-offset-background")}>
                      <AvatarImage src={userImage ?? undefined} alt={userName} data-ai-hint="user avatar" />
                      <AvatarFallback>
                          <AvatarFallbackText name={userName} />
                      </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground border-2 border-background">
                      {userLevel}
                  </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>{userName}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile">
                  <User className="mr-2 h-4 w-4" />
                  <span>Perfil</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/wallet">
                  <Wallet className="mr-2 h-4 w-4" />
                  <span>Carteira</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/my-bets">
                  <Ticket className="mr-2 h-4 w-4" />
                  <span>Minhas Apostas</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/stream">
                  <Tv className="mr-2 h-4 w-4" />
                  <span>Transmissão</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/news">
                  <Newspaper className="mr-2 h-4 w-4" />
                  <span>Notícias</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild disabled={!canAccessBolao}>
                <Link href="/bolao" className={cn(!canAccessBolao && "pointer-events-none")}>
                  <Swords className="mr-2 h-4 w-4" />
                  <span>Bolão</span>
                  {!canAccessBolao && <Lock className="ml-auto h-3 w-3" />}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild disabled={!canAccessMvp}>
                <Link href="/mvp" className={cn(!canAccessMvp && "pointer-events-none")}>
                  <Star className="mr-2 h-4 w-4" />
                  <span>MVP</span>
                  {!canAccessMvp && <Lock className="ml-auto h-3 w-3" />}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/ranking">
                  <Trophy className="mr-2 h-4 w-4" />
                  <span>Ranking</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/store">
                  <Store className="mr-2 h-4 w-4" />
                  <span>Loja</span>
                </Link>
              </DropdownMenuItem>
              {user?.admin && (
                  <DropdownMenuItem asChild>
                      <Link href="/admin">
                          <LayoutGrid className="mr-2 h-4 w-4" />
                          <span>Admin</span>
                      </Link>
                  </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => signOut({ callbackUrl: '/' })}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Deslogar</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
    </div>
  );
}
