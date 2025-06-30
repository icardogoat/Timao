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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { MoreHorizontal } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils";

type User = {
    id: string;
    name: string;
    email: string;
    discordId: string;
    joinDate: string;
    totalBets: number;
    totalWagered: number;
    balance: number;
    status: "Ativo" | "Suspenso";
    avatar: string;
    isVip?: boolean;
};

interface AdminUsersClientProps {
    initialUsers: User[];
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


export default function AdminUsersClient({ initialUsers }: AdminUsersClientProps) {
    const [users] = useState<User[]>(initialUsers);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    const filteredUsers = users.filter((user) =>
        (user.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (user.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (user.discordId || '').includes(searchTerm)
    );

    return (
        <>
            <Card>
                <CardHeader>
                     <div>
                        <CardTitle>Usuários</CardTitle>
                        <CardDescription>
                            Gerencie os usuários da plataforma.
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="py-4">
                        <Input
                            placeholder="Pesquisar por nome, email ou ID do Discord..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full md:max-w-sm"
                        />
                    </div>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Usuário</TableHead>
                                <TableHead className="hidden md:table-cell">Data de Cadastro</TableHead>
                                <TableHead className="text-center">Apostas</TableHead>
                                <TableHead className="text-right">Saldo</TableHead>
                                <TableHead className="hidden text-right md:table-cell">Total Apostado</TableHead>
                                <TableHead>
                                    <span className="sr-only">Ações</span>
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredUsers.map((user) => (
                                <TableRow key={user.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar className={cn("hidden h-9 w-9 sm:flex", user.isVip && "ring-2 ring-vip")}>
                                                <AvatarImage src={user.avatar} alt={user.name} data-ai-hint="user avatar"/>
                                                <AvatarFallback>{(user.name?.substring(0,2) || 'U').toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <div className="font-medium">{user.name}</div>
                                                <div className="hidden text-sm text-muted-foreground sm:block">{obfuscateEmail(user.email)}</div>
                                                <div className="text-xs text-muted-foreground">Discord ID: {user.discordId}</div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell">{new Date(user.joinDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</TableCell>
                                    <TableCell className="text-center">{user.totalBets}</TableCell>
                                    <TableCell className="text-right font-medium">R$ {user.balance.toFixed(2)}</TableCell>
                                    <TableCell className="hidden text-right md:table-cell">R$ {user.totalWagered.toFixed(2)}</TableCell>
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
                                                <DropdownMenuItem onSelect={() => setSelectedUser(user)}>
                                                    Ver Detalhes
                                                </DropdownMenuItem>
                                                {user.status === "Ativo" && <DropdownMenuItem className="text-destructive">Suspender Usuário</DropdownMenuItem>}
                                                {user.status === "Suspenso" && <DropdownMenuItem>Reativar Usuário</DropdownMenuItem>}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={!!selectedUser} onOpenChange={(isOpen) => !isOpen && setSelectedUser(null)}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Detalhes do Usuário</DialogTitle>
                    </DialogHeader>
                    {selectedUser && (
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">Nome</Label>
                                <Input value={selectedUser.name} className="col-span-3" readOnly />
                            </div>
                             <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">Email</Label>
                                <Input value={obfuscateEmail(selectedUser.email)} className="col-span-3" readOnly />
                            </div>
                             <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">Discord ID</Label>
                                <Input value={selectedUser.discordId} className="col-span-3" readOnly />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">Saldo</Label>
                                <Input value={`R$ ${selectedUser.balance.toFixed(2)}`} className="col-span-3" readOnly />
                            </div>
                             <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">Total Apostado</Label>
                                <Input value={`R$ ${selectedUser.totalWagered.toFixed(2)}`} className="col-span-3" readOnly />
                            </div>
                             <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">Total de Apostas</Label>
                                <Input value={selectedUser.totalBets.toString()} className="col-span-3" readOnly />
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    )
}
