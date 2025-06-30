
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { upsertEvent, deleteEvent, getAdminEvents, toggleEventStatus } from '@/actions/admin-actions';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Loader2, PlusCircle, Trash2, Edit } from 'lucide-react';
import type { SiteEvent } from '@/types';

const formSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(3, { message: 'O nome deve ter pelo menos 3 caracteres.' }),
  description: z.string().min(10, { message: 'A descrição deve ter pelo menos 10 caracteres.' }),
  xpMultiplier: z.coerce.number().int().min(1, { message: 'O multiplicador deve ser no mínimo 1.' }),
});

export default function AdminEventsClient({ initialEvents }: { initialEvents: SiteEvent[] }) {
    const { toast } = useToast();
    const [events, setEvents] = useState(initialEvents);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isToggling, setIsToggling] = useState<string | null>(null);
    const [currentEvent, setCurrentEvent] = useState<SiteEvent | null>(null);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: { name: '', description: '', xpMultiplier: 2 },
    });

    const handleOpenDialog = (event: SiteEvent | null) => {
        setCurrentEvent(event);
        form.reset(event ? { ...event, id: event._id.toString() } : { name: '', description: '', xpMultiplier: 2 });
        setIsDialogOpen(true);
    };

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        setIsSubmitting(true);
        const result = await upsertEvent(values);
        if (result.success) {
            toast({ title: "Sucesso!", description: result.message });
            setEvents(await getAdminEvents());
            setIsDialogOpen(false);
        } else {
            toast({ title: "Erro", description: result.message, variant: "destructive" });
        }
        setIsSubmitting(false);
    };

    const handleDelete = async () => {
        if (!isDeleteDialogOpen) return;
        setIsSubmitting(true);
        const result = await deleteEvent(isDeleteDialogOpen);
        if (result.success) {
            toast({ title: "Sucesso!", description: result.message });
            setEvents(events.filter(event => event._id.toString() !== isDeleteDialogOpen));
            setIsDeleteDialogOpen(null);
        } else {
            toast({ title: "Erro", description: result.message, variant: "destructive" });
        }
        setIsSubmitting(false);
    };

    const handleToggleStatus = async (eventId: string, currentStatus: boolean) => {
        setIsToggling(eventId);
        const result = await toggleEventStatus(eventId, currentStatus);
        if (result.success) {
            toast({ title: "Sucesso!", description: result.message });
            setEvents(await getAdminEvents());
        } else {
            toast({ title: "Erro", description: result.message, variant: "destructive" });
        }
        setIsToggling(null);
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Gerenciar Eventos de XP</CardTitle>
                            <CardDescription>Crie e gerencie eventos que concedem XP bônus aos usuários.</CardDescription>
                        </div>
                        <Button onClick={() => handleOpenDialog(null)}><PlusCircle className="mr-2 h-4 w-4" /> Novo Evento</Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Evento</TableHead>
                                <TableHead className="text-center">Multiplicador</TableHead>
                                <TableHead className="text-center">Ativo</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {events.map(event => (
                                <TableRow key={event._id.toString()}>
                                    <TableCell>
                                        <p className="font-medium">{event.name}</p>
                                        <p className="text-xs text-muted-foreground truncate max-w-sm">{event.description}</p>
                                    </TableCell>
                                    <TableCell className="text-center font-mono">{event.xpMultiplier}x</TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex justify-center items-center gap-2">
                                            {isToggling === event._id.toString() ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Switch
                                                    checked={event.isActive}
                                                    onCheckedChange={() => handleToggleStatus(event._id.toString(), event.isActive)}
                                                />
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="outline" size="icon" onClick={() => handleOpenDialog(event)} className="mr-2">
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button variant="destructive" size="icon" onClick={() => setIsDeleteDialogOpen(event._id.toString())}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {events.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center h-24">
                                        Nenhum evento criado.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{currentEvent ? 'Editar Evento' : 'Novo Evento'}</DialogTitle>
                        <DialogDescription>Preencha os detalhes do evento de XP. Ele será criado como inativo por padrão.</DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField control={form.control} name="name" render={({ field }) => (
                                <FormItem><FormLabel>Nome</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                             <FormField control={form.control} name="description" render={({ field }) => (
                                <FormItem><FormLabel>Descrição</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                             <FormField control={form.control} name="xpMultiplier" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Multiplicador de XP</FormLabel>
                                    <FormControl><Input type="number" {...field} /></FormControl>
                                    <FormDescription>Multiplicador para o ganho de XP em apostas. Ex: 2 para 2x. VIPs recebem o dobro (multiplicador do evento x2).</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!isDeleteDialogOpen} onOpenChange={() => setIsDeleteDialogOpen(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                        <AlertDialogDescription>Tem certeza que deseja excluir este evento? Esta ação não pode ser desfeita.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} disabled={isSubmitting} className="bg-destructive hover:bg-destructive/90">
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Excluir
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
