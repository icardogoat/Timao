'use client';

import { useState, useEffect } from 'react';
import type { ModerationAction } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { getModerationLogs, issueWarningFromSite } from '@/actions/moderation-actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, ShieldBan, ShieldCheck, ShieldAlert, ChevronsUpDown, Check, Info } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { cn } from '@/lib/utils';
import { AvatarFallbackText } from './avatar-fallback-text';

type UserForSearch = {
    id: string; // discordId
    name: string;
    avatar: string;
}

const warnFormSchema = z.object({
  user: z.object({
    id: z.string(),
    name: z.string(),
    avatar: z.string(),
  }),
  reason: z.string().min(10, "O motivo deve ter pelo menos 10 caracteres."),
});


const getActionDetails = (action: ModerationAction) => {
    switch (action.type) {
        case 'WARN': return { icon: ShieldAlert, color: 'text-yellow-500', label: 'Advertência' };
        case 'MUTE': return { icon: ShieldBan, color: 'text-blue-500', label: 'Castigo' };
        case 'BAN': return { icon: ShieldBan, color: 'text-red-500', label: 'Banimento' };
        case 'UNBAN': return { icon: ShieldCheck, color: 'text-green-500', label: 'Desbanimento' };
        default: return { icon: ShieldAlert, color: 'text-gray-500', label: action.type };
    }
}

// Client-side component to prevent hydration mismatch
const TimeAgo = ({ date }: { date: string | Date }) => {
    const [timeAgo, setTimeAgo] = useState('');
    useEffect(() => {
        setTimeAgo(formatDistanceToNow(new Date(date), { addSuffix: true, locale: ptBR }));
    }, [date]);
    return <>{timeAgo || '...'}</>;
};

export function AdminModerationClient({ initialLogs, allUsers, modLogChannelId, error }: { initialLogs: ModerationAction[], allUsers: any[], modLogChannelId?: string, error: string | null }) {
    const { toast } = useToast();
    const [logs, setLogs] = useState(initialLogs);
    const [searchTerm, setSearchTerm] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isWarnDialogOpen, setIsWarnDialogOpen] = useState(false);
    
    const warnForm = useForm<z.infer<typeof warnFormSchema>>({
        resolver: zodResolver(warnFormSchema),
    });

    const filteredLogs = logs.filter(log =>
        (log.userName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (log.moderatorName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (log.userId || '').includes(searchTerm)
    );
    
    const availableUsers: UserForSearch[] = allUsers.map(u => ({ id: u.discordId, name: u.name, avatar: u.avatar }));

    const onWarnSubmit = async (values: z.infer<typeof warnFormSchema>) => {
        setIsSubmitting(true);
        const result = await issueWarningFromSite(values.user.id, values.user.name, values.user.avatar, values.reason);
        if (result.success) {
            toast({ title: 'Sucesso!', description: result.message });
            setLogs(await getModerationLogs());
            setIsWarnDialogOpen(false);
            warnForm.reset();
        } else {
            toast({ title: 'Erro', description: result.message, variant: 'destructive' });
        }
        setIsSubmitting(false);
    }
    
    return (
        <>
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle>Logs de Moderação</CardTitle>
                                <CardDescription>Histórico de todas as ações de moderação.</CardDescription>
                            </div>
                            <div className="flex gap-2">
                                <Button onClick={() => setIsWarnDialogOpen(true)}>Nova Advertência</Button>
                                <Button variant="secondary" disabled>Novo Castigo</Button>
                                <Button variant="destructive" disabled>Novo Banimento</Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {!modLogChannelId && (
                            <Alert variant="destructive" className="mb-4">
                                <Info className="h-4 w-4" />
                                <AlertTitle>Canal de Logs Não Configurado</AlertTitle>
                                <AlertDescription>
                                    As ações de moderação não serão registradas no Discord. Por favor, configure o "Canal de Logs de Moderação" na aba de configurações do Bot.
                                </AlertDescription>
                            </Alert>
                        )}
                         <div className="py-4">
                            <Input
                                placeholder="Pesquisar por usuário, moderador ou ID..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full md:max-w-sm"
                            />
                        </div>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Ação</TableHead>
                                    <TableHead>Usuário</TableHead>
                                    <TableHead className="hidden md:table-cell">Moderador</TableHead>
                                    <TableHead className="hidden lg:table-cell">Motivo</TableHead>
                                    <TableHead className="text-right">Data</TableHead>
                                </TableRow>
                            </TableHeader>
                             <TableBody>
                                {filteredLogs.map(log => {
                                    const { icon: Icon, color, label } = getActionDetails(log);
                                    return (
                                        <TableRow key={log._id.toString()}>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Icon className={cn("h-5 w-5", color)} />
                                                    <span className="font-semibold">{label}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                 <div className="flex items-center gap-2">
                                                    <Avatar className="h-8 w-8">
                                                        <AvatarImage src={log.userAvatar} alt={log.userName} data-ai-hint="user avatar" />
                                                        <AvatarFallback><AvatarFallbackText name={log.userName} /></AvatarFallback>
                                                    </Avatar>
                                                    <span className="font-medium">{log.userName}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell">{log.moderatorName}</TableCell>
                                            <TableCell className="hidden lg:table-cell max-w-xs truncate">{log.reason}</TableCell>
                                            <TableCell className="text-right text-xs text-muted-foreground">
                                                <TimeAgo date={log.createdAt} />
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
            
             <Dialog open={isWarnDialogOpen} onOpenChange={setIsWarnDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Aplicar Advertência</DialogTitle>
                        <DialogDescription>A advertência será registrada e o usuário será notificado.</DialogDescription>
                    </DialogHeader>
                    <Form {...warnForm}>
                        <form onSubmit={warnForm.handleSubmit(onWarnSubmit)} className="space-y-4">
                            <FormField
                                control={warnForm.control}
                                name="user"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Usuário</FormLabel>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button variant="outline" role="combobox" className="justify-between">
                                                        {field.value ? availableUsers.find(u => u.id === field.value.id)?.name : "Selecione um usuário"}
                                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                                <Command>
                                                    <CommandInput placeholder="Pesquisar usuário..." />
                                                    <CommandList>
                                                        <CommandEmpty>Nenhum usuário encontrado.</CommandEmpty>
                                                        <CommandGroup>
                                                            {availableUsers.map(user => (
                                                                <CommandItem
                                                                    value={user.name}
                                                                    key={user.id}
                                                                    onSelect={() => field.onChange(user)}
                                                                >
                                                                    <Check className={cn("mr-2 h-4 w-4", field.value?.id === user.id ? "opacity-100" : "opacity-0")} />
                                                                    {user.name}
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={warnForm.control}
                                name="reason"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Motivo</FormLabel>
                                        <FormControl><Textarea {...field} placeholder="Descreva o motivo da advertência..."/></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <DialogFooter>
                                <Button type="button" variant="ghost" onClick={() => setIsWarnDialogOpen(false)} disabled={isSubmitting}>Cancelar</Button>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Confirmar Advertência
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </>
    );
}
