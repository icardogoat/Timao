
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { 
    upsertAdvertisement, 
    deleteAdvertisement, 
    getAdminAdvertisements,
} from '@/actions/admin-actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Loader2, PlusCircle, Trash2, Edit, CalendarIcon } from 'lucide-react';
import type { Advertisement } from '@/types';
import Image from 'next/image';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from './ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar } from './ui/calendar';

const formSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(3, { message: 'O título deve ter pelo menos 3 caracteres.' }),
  description: z.string().min(10, { message: 'A descrição deve ter pelo menos 10 caracteres.' }),
  imageUrl: z.string().url({ message: "Por favor, insira uma URL de imagem válida." }),
  linkUrl: z.string().url({ message: "Por favor, insira uma URL de link válida." }),
  status: z.enum(['active', 'inactive']).default('active'),
  startDate: z.date().optional().nullable(),
  endDate: z.date().optional().nullable(),
});


export default function AdminAdsClient({ initialAds }: { initialAds: Advertisement[] }) {
    const { toast } = useToast();
    const [ads, setAds] = useState(initialAds);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submittingId, setSubmittingId] = useState<string | null>(null);
    const [currentAd, setCurrentAd] = useState<Advertisement | null>(null);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: { status: 'active' },
    });
    
    const handleOpenDialog = (ad: Advertisement | null) => {
        setCurrentAd(ad);
        const defaultValues = ad 
            ? { ...ad, id: ad._id.toString(), startDate: ad.startDate ? new Date(ad.startDate) : null, endDate: ad.endDate ? new Date(ad.endDate) : null } 
            : { title: '', description: '', imageUrl: '', linkUrl: '', status: 'active' as 'active' | 'inactive', startDate: null, endDate: null };
        form.reset(defaultValues);
        setIsDialogOpen(true);
    };

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        setIsSubmitting(true);
        const result = await upsertAdvertisement(values);
        if (result.success) {
            toast({ title: "Sucesso!", description: result.message });
            setAds(await getAdminAdvertisements());
            setIsDialogOpen(false);
        } else {
            toast({ title: "Erro", description: result.message, variant: "destructive" });
        }
        setIsSubmitting(false);
    };

    const handleDelete = async () => {
        if (!isDeleteDialogOpen) return;
        setSubmittingId(isDeleteDialogOpen);
        const result = await deleteAdvertisement(isDeleteDialogOpen);
         if (result.success) {
            toast({ title: "Sucesso!", description: result.message });
            setAds(ads.filter(ad => ad._id.toString() !== isDeleteDialogOpen));
            setIsDeleteDialogOpen(null);
        } else {
            toast({ title: "Erro", description: result.message, variant: "destructive" });
        }
        setSubmittingId(null);
    };
    
    const activeAds = ads.filter(ad => ad.status === 'active');
    const inactiveAds = ads.filter(ad => ad.status !== 'active');

    const renderTable = (data: Advertisement[]) => (
         <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Anúncio</TableHead>
                    <TableHead className="hidden md:table-cell">Início</TableHead>
                    <TableHead className="hidden md:table-cell">Fim</TableHead>
                    <TableHead className="hidden sm:table-cell">Status</TableHead>
                    <TableHead className="w-24 text-right">Ações</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {data.length > 0 ? data.map(ad => (
                    <TableRow key={ad._id as string}>
                        <TableCell>
                            <div className="flex items-center gap-4">
                                <Image src={ad.imageUrl} alt={ad.title} width={40} height={40} className="rounded-md" data-ai-hint="advertisement banner"/>
                                <div>
                                    <p className="font-medium">{ad.title}</p>
                                    <p className="text-xs text-muted-foreground truncate max-w-xs">{ad.description}</p>
                                </div>
                            </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                            {ad.startDate ? new Date(ad.startDate).toLocaleDateString('pt-BR') : 'N/A'}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                            {ad.endDate ? new Date(ad.endDate).toLocaleDateString('pt-BR') : 'Indefinido'}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell"><Badge variant={ad.status === 'active' ? 'default' : 'secondary'}>{ad.status}</Badge></TableCell>
                        <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                                <Button variant="outline" size="icon" onClick={() => handleOpenDialog(ad)}><Edit className="h-4 w-4" /></Button>
                                <Button variant="destructive" size="icon" onClick={() => setIsDeleteDialogOpen(ad._id.toString())}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                        </TableCell>
                    </TableRow>
                )) : <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground h-24">Nenhum anúncio encontrado.</TableCell></TableRow>}
            </TableBody>
        </Table>
    );

    return (
        <>
            <Tabs defaultValue="active">
                <div className="flex justify-between items-center mb-4">
                    <TabsList>
                        <TabsTrigger value="active">Ativos</TabsTrigger>
                        <TabsTrigger value="inactive">Inativos</TabsTrigger>
                    </TabsList>
                    <Button onClick={() => handleOpenDialog(null)}><PlusCircle className="mr-2 h-4 w-4" /> Novo Anúncio</Button>
                </div>

                <TabsContent value="active">
                    <Card>
                        <CardHeader><CardTitle>Anúncios Ativos</CardTitle><CardDescription>Todos os anúncios que estão sendo exibidos no site.</CardDescription></CardHeader>
                        <CardContent>{renderTable(activeAds)}</CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="inactive">
                    <Card>
                        <CardHeader><CardTitle>Anúncios Inativos</CardTitle><CardDescription>Anúncios que não estão ativos no momento.</CardDescription></CardHeader>
                        <CardContent>{renderTable(inactiveAds)}</CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{currentAd ? 'Editar Anúncio' : 'Novo Anúncio do Sistema'}</DialogTitle>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField control={form.control} name="title" render={({ field }) => (
                                <FormItem><FormLabel>Título</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                             <FormField control={form.control} name="description" render={({ field }) => (
                                <FormItem><FormLabel>Descrição</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="imageUrl" render={({ field }) => (
                                <FormItem><FormLabel>URL da Imagem</FormLabel><FormControl><Input {...field} placeholder="https://exemplo.com/imagem.png" /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="linkUrl" render={({ field }) => (
                                <FormItem><FormLabel>URL do Link</FormLabel><FormControl><Input {...field} placeholder="https://exemplo.com" /></FormControl><FormMessage /></FormItem>
                            )}/>
                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="startDate"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-col">
                                        <FormLabel>Data de Início (Opcional)</FormLabel>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                variant={"outline"}
                                                className={cn(
                                                    "w-full pl-3 text-left font-normal",
                                                    !field.value && "text-muted-foreground"
                                                )}
                                                >
                                                {field.value ? (
                                                    format(field.value, "PPP", { locale: ptBR })
                                                ) : (
                                                    <span>Escolha uma data</span>
                                                )}
                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                </Button>
                                            </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={field.value ?? undefined}
                                                onSelect={(date) => field.onChange(date)}
                                                initialFocus
                                            />
                                            </PopoverContent>
                                        </Popover>
                                        <FormDescription>
                                            O anúncio começa nesta data. Deixe em branco para iniciar imediatamente.
                                        </FormDescription>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="endDate"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-col">
                                        <FormLabel>Data de Término (Opcional)</FormLabel>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                variant={"outline"}
                                                className={cn(
                                                    "w-full pl-3 text-left font-normal",
                                                    !field.value && "text-muted-foreground"
                                                )}
                                                >
                                                {field.value ? (
                                                    format(field.value, "PPP", { locale: ptBR })
                                                ) : (
                                                    <span>Escolha uma data</span>
                                                )}
                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                </Button>
                                            </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={field.value ?? undefined}
                                                onSelect={(date) => field.onChange(date)}
                                                disabled={(date) =>
                                                    date < new Date(new Date().setHours(0, 0, 0, 0))
                                                }
                                                initialFocus
                                            />
                                            </PopoverContent>
                                        </Popover>
                                        <FormDescription>
                                            O anúncio será desativado após esta data. Deixe em branco para rodar indefinidamente.
                                        </FormDescription>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <FormField control={form.control} name="status" render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                    <div className="space-y-0.5">
                                        <FormLabel>Anúncio Ativo</FormLabel>
                                        <FormDescription>Se o anúncio deve ser exibido no site.</FormDescription>
                                    </div>
                                    <FormControl>
                                        <Switch
                                            checked={field.value === 'active'}
                                            onCheckedChange={(checked) => field.onChange(checked ? 'active' : 'inactive')}
                                        />
                                    </FormControl>
                                </FormItem>
                            )}/>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                                <Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar</Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

             <AlertDialog open={!!isDeleteDialogOpen} onOpenChange={() => setIsDeleteDialogOpen(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle><AlertDialogDescription>Tem certeza que deseja excluir este anúncio?</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} disabled={!!submittingId} className="bg-destructive hover:bg-destructive/90">
                            {submittingId === isDeleteDialogOpen && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Excluir
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
