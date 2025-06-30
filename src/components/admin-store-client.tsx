
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { upsertStoreItem, deleteStoreItem, getAdminStoreItems } from '@/actions/admin-actions';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Loader2, PlusCircle, Trash2, Edit, Award, Star, Gift, Clock, ShieldOff } from 'lucide-react';
import type { StoreItem } from '@/types';

type StoreItemData = Omit<StoreItem, '_id' | 'createdAt'> & { id: string };

const formSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(3, { message: 'O nome deve ter pelo menos 3 caracteres.' }),
  description: z.string().min(10, { message: 'A descrição deve ter pelo menos 10 caracteres.' }),
  price: z.coerce.number().min(0, { message: 'O preço não pode ser negativo.' }),
  type: z.enum(['ROLE', 'XP_BOOST', 'AD_REMOVAL']),
  duration: z.enum(['PERMANENT', 'MONTHLY']).optional(),
  durationInDays: z.coerce.number().optional(),
  roleId: z.string().optional(),
  xpAmount: z.coerce.number().optional(),
  isActive: z.boolean().default(true),
}).refine(data => {
    if (data.type === 'ROLE') return !!data.roleId && data.roleId.length > 0;
    return true;
}, {
    message: "O ID do Cargo é obrigatório para o tipo ROLE.",
    path: ['roleId'],
}).refine(data => {
    if (data.type === 'XP_BOOST') return !!data.xpAmount && data.xpAmount > 0;
    return true;
}, {
    message: "A quantia de XP é obrigatória e deve ser maior que 0.",
    path: ['xpAmount'],
}).refine(data => {
    if (data.type === 'AD_REMOVAL') return !!data.durationInDays && data.durationInDays > 0;
    return true;
}, {
    message: "A duração em dias é obrigatória e deve ser maior que 0.",
    path: ['durationInDays'],
});

const iconMap = { 'ROLE': Award, 'XP_BOOST': Star, 'AD_REMOVAL': ShieldOff, 'DEFAULT': Gift };

export default function AdminStoreClient({ initialItems }: { initialItems: StoreItemData[] }) {
    const { toast } = useToast();
    const [items, setItems] = useState(initialItems);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [currentItem, setCurrentItem] = useState<StoreItemData | null>(null);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: { isActive: true, price: 0, type: 'ROLE', duration: 'PERMANENT' },
    });
    
    const itemType = form.watch('type');

    const handleOpenDialog = (item: StoreItemData | null) => {
        setCurrentItem(item);
        form.reset(item ? { ...item, xpAmount: item.xpAmount || 0, durationInDays: item.durationInDays || 0 } : { name: '', description: '', price: 0, type: 'ROLE', duration: 'PERMANENT', roleId: '', xpAmount: 0, durationInDays: 0, isActive: true });
        setIsDialogOpen(true);
    };

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        setIsSubmitting(true);
        const result = await upsertStoreItem(values);
        if (result.success) {
            toast({ title: "Sucesso!", description: result.message });
            setItems(await getAdminStoreItems());
            setIsDialogOpen(false);
        } else {
            toast({ title: "Erro", description: result.message, variant: "destructive" });
        }
        setIsSubmitting(false);
    };

    const handleDelete = async () => {
        if (!isDeleteDialogOpen) return;
        setIsSubmitting(true);
        const result = await deleteStoreItem(isDeleteDialogOpen);
         if (result.success) {
            toast({ title: "Sucesso!", description: result.message });
            setItems(items.filter(item => item.id !== isDeleteDialogOpen));
            setIsDeleteDialogOpen(null);
        } else {
            toast({ title: "Erro", description: result.message, variant: "destructive" });
        }
        setIsSubmitting(false);
    };

    const getTypeLabel = (type: StoreItem['type']) => {
        switch(type) {
            case 'ROLE': return 'Cargo';
            case 'XP_BOOST': return 'Bônus de XP';
            case 'AD_REMOVAL': return 'Remover Anúncios';
            default: return 'Desconhecido';
        }
    }

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Gerenciar Loja</CardTitle>
                            <CardDescription>Adicione, edite ou remova itens da loja.</CardDescription>
                        </div>
                        <Button onClick={() => handleOpenDialog(null)}><PlusCircle className="mr-2 h-4 w-4" /> Novo Item</Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Item</TableHead>
                                <TableHead className="hidden sm:table-cell">Tipo</TableHead>
                                <TableHead className="hidden sm:table-cell">Duração</TableHead>
                                <TableHead className="text-right">Preço</TableHead>
                                <TableHead className="text-center">Status</TableHead>
                                <TableHead className="w-24">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.map(item => {
                                const Icon = iconMap[item.type as keyof typeof iconMap] || iconMap.DEFAULT;
                                return (
                                <TableRow key={item.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Icon className="h-5 w-5 text-muted-foreground" />
                                            <div>
                                                <p className="font-medium">{item.name}</p>
                                                <p className="text-xs text-muted-foreground truncate max-w-xs">{item.description}</p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="hidden sm:table-cell">{getTypeLabel(item.type)}</TableCell>
                                    <TableCell className="hidden sm:table-cell">
                                        <div className="flex items-center gap-2">
                                            {item.type === 'ROLE' ? (
                                                <>
                                                    {item.duration === 'MONTHLY' && <Clock className="h-4 w-4 text-muted-foreground" />}
                                                    <span>{item.duration === 'PERMANENT' ? 'Permanente' : 'Mensal'}</span>
                                                </>
                                            ) : item.type === 'AD_REMOVAL' ? (
                                                <span>{item.durationInDays} dia(s)</span>
                                            ) : (
                                                <span>N/A</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right font-mono">R$ {item.price.toLocaleString('pt-BR')}</TableCell>
                                    <TableCell className="text-center">
                                        <span className={`px-2 py-1 text-xs rounded-full ${item.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'}`}>
                                            {item.isActive ? 'Ativo' : 'Inativo'}
                                        </span>
                                    </TableCell>
                                    <TableCell className="flex gap-2">
                                        <Button variant="outline" size="icon" onClick={() => handleOpenDialog(item)}><Edit className="h-4 w-4" /></Button>
                                        <Button variant="destructive" size="icon" onClick={() => setIsDeleteDialogOpen(item.id)}><Trash2 className="h-4 w-4" /></Button>
                                    </TableCell>
                                </TableRow>
                            )})}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{currentItem ? 'Editar Item' : 'Novo Item'}</DialogTitle>
                        <DialogDescription>Preencha os detalhes do item da loja.</DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto p-1 pr-4">
                            <FormField control={form.control} name="name" render={({ field }) => (
                                <FormItem><FormLabel>Nome</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                             <FormField control={form.control} name="description" render={({ field }) => (
                                <FormItem><FormLabel>Descrição</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                             <FormField control={form.control} name="price" render={({ field }) => (
                                <FormItem><FormLabel>Preço</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="type" render={({ field }) => (
                                <FormItem>
                                <FormLabel>Tipo de Item</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione um tipo" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="ROLE">Cargo (ROLE)</SelectItem>
                                        <SelectItem value="XP_BOOST">Bônus de XP</SelectItem>
                                        <SelectItem value="AD_REMOVAL">Remoção de Anúncios</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                                </FormItem>
                            )}/>
                            {itemType === 'ROLE' && (
                                <>
                                    <FormField control={form.control} name="duration" render={({ field }) => (
                                        <FormItem>
                                        <FormLabel>Duração</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Selecione a duração" /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                <SelectItem value="PERMANENT">Permanente</SelectItem>
                                                <SelectItem value="MONTHLY">Mensal (30 dias)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormDescription>Se o item expira ou é para sempre.</FormDescription>
                                        <FormMessage />
                                        </FormItem>
                                    )}/>
                                    <FormField control={form.control} name="roleId" render={({ field }) => (
                                        <FormItem><FormLabel>ID do Cargo (Discord)</FormLabel><FormControl><Input {...field} value={field.value ?? ''} placeholder="Ex: 123456789012345678" /></FormControl><FormDescription>O ID do cargo que será atribuído no Discord ao resgatar.</FormDescription><FormMessage /></FormItem>
                                    )}/>
                                </>
                            )}
                             {itemType === 'XP_BOOST' && (
                                <FormField control={form.control} name="xpAmount" render={({ field }) => (
                                    <FormItem><FormLabel>Quantidade de XP</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} /></FormControl><FormDescription>A quantidade de XP que o usuário receberá (resgate direto, sem código).</FormDescription><FormMessage /></FormItem>
                                )}/>
                            )}
                             {itemType === 'AD_REMOVAL' && (
                                <FormField control={form.control} name="durationInDays" render={({ field }) => (
                                    <FormItem><FormLabel>Duração (em dias)</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} /></FormControl><FormDescription>Por quantos dias os anúncios serão removidos para o usuário.</FormDescription><FormMessage /></FormItem>
                                )}/>
                            )}
                             <FormField control={form.control} name="isActive" render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                    <div className="space-y-0.5"><FormLabel>Item Ativo</FormLabel><FormDescription>Se o item deve aparecer na loja para compra.</FormDescription></div>
                                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                </FormItem>
                            )}/>
                             <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                                <Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar Item</Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

             <AlertDialog open={!!isDeleteDialogOpen} onOpenChange={() => setIsDeleteDialogOpen(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle><AlertDialogDescription>Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} disabled={isSubmitting} className="bg-destructive hover:bg-destructive/90">
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Excluir
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
