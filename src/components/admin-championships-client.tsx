
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import {
    upsertChampionship,
    deleteChampionship,
    getAdminChampionships,
} from '@/actions/admin-actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Loader2, PlusCircle, Trash2, Edit } from 'lucide-react';
import type { Championship } from '@/types';
import Image from 'next/image';

const formSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(3, { message: 'O nome deve ter pelo menos 3 caracteres.' }),
  leagueId: z.coerce.number().int().positive({ message: 'O ID da liga deve ser um número positivo.' }),
  season: z.coerce.number().int().min(2000, { message: 'A temporada deve ser um ano válido (ex: 2024).' }),
  isActive: z.boolean().default(true),
});

export function AdminChampionshipsClient({ initialChampionships }: { initialChampionships: Championship[] }) {
    const { toast } = useToast();
    const [championships, setChampionships] = useState(initialChampionships);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [currentChampionship, setCurrentChampionship] = useState<Championship | null>(null);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: { isActive: true },
    });

    const handleOpenDialog = (championship: Championship | null) => {
        setCurrentChampionship(championship);
        form.reset(championship ? { ...championship, id: championship._id.toString() } : { name: '', leagueId: 0, season: new Date().getFullYear(), isActive: true });
        setIsDialogOpen(true);
    };

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        setIsSubmitting(true);
        const result = await upsertChampionship(values);
        if (result.success) {
            toast({ title: "Sucesso!", description: result.message });
            setChampionships(await getAdminChampionships());
            setIsDialogOpen(false);
        } else {
            toast({ title: "Erro", description: result.message, variant: "destructive" });
        }
        setIsSubmitting(false);
    };

    const handleDelete = async () => {
        if (!isDeleteDialogOpen) return;
        setIsSubmitting(true);
        const result = await deleteChampionship(isDeleteDialogOpen);
        if (result.success) {
            toast({ title: "Sucesso!", description: result.message });
            setChampionships(championships.filter(c => c._id.toString() !== isDeleteDialogOpen));
            setIsDeleteDialogOpen(null);
        } else {
            toast({ title: "Erro", description: result.message, variant: "destructive" });
        }
        setIsSubmitting(false);
    };
    
    const handleToggleActive = async (championship: Championship) => {
        setIsSubmitting(true);
        const result = await upsertChampionship({ ...championship, id: championship._id.toString(), isActive: !championship.isActive });
        if (result.success) {
            toast({ title: "Sucesso!", description: `Campeonato ${!championship.isActive ? 'ativado' : 'desativado'}.` });
            setChampionships(await getAdminChampionships());
        } else {
             toast({ title: "Erro", description: result.message, variant: "destructive" });
        }
        setIsSubmitting(false);
    };


    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Gerenciar Campeonatos</CardTitle>
                            <CardDescription>Adicione e controle quais campeonatos serão atualizados pela API.</CardDescription>
                        </div>
                        <Button onClick={() => handleOpenDialog(null)}><PlusCircle className="mr-2 h-4 w-4" /> Novo Campeonato</Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Campeonato</TableHead>
                                <TableHead>ID da Liga</TableHead>
                                <TableHead>Temporada</TableHead>
                                <TableHead className="text-center">Status</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {championships.map(champ => (
                                <TableRow key={champ._id.toString()}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            {champ.logo ? (
                                                <Image src={champ.logo} alt={champ.name} width={24} height={24} data-ai-hint="championship logo" />
                                            ) : (
                                                <div className="h-6 w-6 bg-muted rounded-full" />
                                            )}
                                            <div>
                                                <p className="font-medium">{champ.name}</p>
                                                <p className="text-xs text-muted-foreground">{champ.country || 'País não definido'}</p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>{champ.leagueId}</TableCell>
                                    <TableCell>{champ.season}</TableCell>
                                    <TableCell className="text-center">
                                        <Switch
                                            checked={champ.isActive}
                                            onCheckedChange={() => handleToggleActive(champ)}
                                            disabled={isSubmitting}
                                            aria-label="Ativar/Desativar Campeonato"
                                        />
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="outline" size="icon" onClick={() => handleOpenDialog(champ)} className="mr-2"><Edit className="h-4 w-4" /></Button>
                                        <Button variant="destructive" size="icon" onClick={() => setIsDeleteDialogOpen(champ._id.toString())}><Trash2 className="h-4 w-4" /></Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{currentChampionship ? 'Editar Campeonato' : 'Novo Campeonato'}</DialogTitle>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                             <FormField control={form.control} name="name" render={({ field }) => (
                                <FormItem><FormLabel>Nome do Campeonato</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <div className="grid grid-cols-2 gap-4">
                                <FormField control={form.control} name="leagueId" render={({ field }) => (
                                    <FormItem><FormLabel>ID da Liga</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                 <FormField control={form.control} name="season" render={({ field }) => (
                                    <FormItem><FormLabel>Temporada (Ano)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                            </div>
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
                        <AlertDialogDescription>
                            Tem certeza que deseja excluir este campeonato? Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
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
