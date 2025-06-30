'use client';

import Link from "next/link"
import { usePathname } from "next/navigation"
import { type ReactNode } from "react"
import { Home, Users, Trophy, Ticket, Menu, Bot, Server, Settings } from "lucide-react"
import { useSession, signOut } from "next-auth/react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { FielBetLogo } from "./icons"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import { cn } from "@/lib/utils"

interface AdminLayoutProps {
    children: ReactNode;
}

const navLinks = [
    { href: "/admin/dashboard", label: "Dashboard", icon: Home },
    { href: "/admin/bets", label: "Apostas", icon: Ticket },
    { href: "/admin/matches", label: "Partidas", icon: Trophy },
    { href: "/admin/users", label: "Usuários", icon: Users },
    { href: "/admin/server", label: "Servidor", icon: Server },
    { href: "/admin/bot", label: "Bot", icon: Bot },
    { href: "/admin/settings", label: "Configurações", icon: Settings },
];


export function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const { data: session } = useSession();

  const user = session?.user;
  const userName = user?.name ?? 'Admin';
  const userImage = user?.image ?? 'https://placehold.co/40x40.png';
  const isVip = user?.isVip ?? false;
  const userFallback =
    userName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase() || 'AD';

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <div className="hidden border-r bg-muted/40 md:block">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
            <Link href="/admin/dashboard" className="flex items-center gap-2 font-semibold">
              <FielBetLogo className="h-6 w-6 text-primary" />
              <span className="text-lg">Painel Admin</span>
            </Link>
          </div>
          <div className="flex-1">
            <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
              {navLinks.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                        pathname === href && "bg-muted text-primary font-semibold"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Link>
              ))}
            </nav>
          </div>
        </div>
      </div>
      <div className="flex flex-col">
        <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
            <Sheet>
                <SheetTrigger asChild>
                    <Button
                    variant="outline"
                    size="icon"
                    className="shrink-0 md:hidden"
                    >
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Toggle navigation menu</span>
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="flex flex-col p-0">
                    <SheetHeader className="text-left border-b pb-4 pt-6 px-6">
                        <SheetTitle>
                            <Link
                                href="/admin/dashboard"
                                className="flex items-center gap-2 text-lg font-semibold"
                            >
                                <FielBetLogo className="h-6 w-6" />
                                <span>Painel Admin</span>
                            </Link>
                        </SheetTitle>
                    </SheetHeader>
                    <nav className="grid gap-2 text-base font-medium mt-4 px-4">
                        {navLinks.map(({ href, label, icon: Icon }) => (
                           <Link
                                key={href}
                                href={href}
                                className={cn(
                                    "flex items-center gap-4 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                                    pathname === href && "bg-muted text-primary font-semibold"
                                )}
                            >
                                <Icon className="h-5 w-5" />
                                {label}
                            </Link>
                        ))}
                    </nav>
                </SheetContent>
            </Sheet>
          <div className="w-full flex-1" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Avatar className={cn("h-9 w-9 cursor-pointer", isVip && "ring-2 ring-offset-2 ring-vip ring-offset-muted")}>
                    <AvatarImage src={userImage} alt="Admin Avatar" data-ai-hint="user avatar" />
                    <AvatarFallback>{userFallback}</AvatarFallback>
                </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild><Link href="/admin/dashboard">Admin</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link href="/bet">Voltar ao App</Link></DropdownMenuItem>
              <DropdownMenuItem onClick={() => signOut({ callbackUrl: '/' })}>Sair</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
