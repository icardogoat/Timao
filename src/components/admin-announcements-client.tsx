
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { 
    getAdminPosts, 
    upsertPost,
    deletePost,
    getPostForEdit,
    syncPostsFromDiscord
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
import { Loader2, PlusCircle, Trash2, Edit, Pin, Rss } from 'lucide-react';
import type { Post } from '@/types';

// Schema for Post form
const postFormSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(5, { message: 'O título deve ter pelo menos 5 caracteres.' }),
  content: z.string().min(10, { message: 'O conteúdo deve ter pelo menos 10 caracteres.' }),
  imageUrl: z.string().url({ message: "URL inválida" }).optional().or(z.literal('')),
  isPinned: z.boolean().default(false),
});

export default function AdminPostsClient({ initialPosts }: { initialPosts: Post[] }) {
    const { toast } = useToast();
    const [posts, setPosts] = useState(initialPosts);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    
    // Dialog states
    const [isPostDialogOpen, setIsPostDialogOpen] = useState(false);
    const [isDeletePostOpen, setIsDeletePostOpen] = useState<string | null>(null);

    const postForm = useForm<z.infer<typeof postFormSchema>>({ resolver: zodResolver(postFormSchema) });

    const handleSync = async () => {
        setIsSyncing(true);
        toast({ title: 'Sincronizando...', description: 'Buscando novos posts do Discord.' });
        const result = await syncPostsFromDiscord();
        if (result.success) {
            toast({ title: 'Sucesso!', description: result.message });
            setPosts(await getAdminPosts());
        } else {
            toast({ title: 'Erro', description: result.message, variant: 'destructive' });
        }
        setIsSyncing(false);
    }

    // Post Handlers
    const handleOpenPostDialog = async (post: Post | null) => {
        if (post) {
            const fullPost = await getPostForEdit(post._id.toString());
            postForm.reset({ ...fullPost, imageUrl: fullPost?.imageUrl || '' });
        } else {
            postForm.reset({ title: '', content: '', isPinned: false, imageUrl: '' });
        }
        setIsPostDialogOpen(true);
    };

    const onPostSubmit = async (values: z.infer<typeof postFormSchema>) => {
        setIsSubmitting(true);
        const result = await upsertPost(values);
        if (result.success) {
            toast({ title: "Sucesso!", description: result.message });
            setPosts(await getAdminPosts());
            setIsPostDialogOpen(false);
        } else {
            toast({ title: "Erro", description: result.message, variant: "destructive" });
        }
        setIsSubmitting(false);
    };

    const handleDeletePost = async () => {
        if (!isDeletePostOpen) return;
        setIsSubmitting(true);
        const result = await deletePost(isDeletePostOpen);
        if (result.success) {
            toast({ title: "Sucesso!", description: result.message });
            setPosts(posts.filter(p => p._id.toString() !== isDeletePostOpen));
            setIsDeletePostOpen(null);
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
                            <CardTitle>Posts</CardTitle>
                            <CardDescription>Crie e gerencie as notícias e comunicados do seu site.</CardDescription>
                        </div>
                        <div className="flex gap-2">
                            <Button onClick={handleSync} disabled={isSyncing} variant="outline">
                                {isSyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Rss className="mr-2 h-4 w-4" />}
                                Sincronizar com Discord
                            </Button>
                            <Button onClick={() => handleOpenPostDialog(null)}><PlusCircle className="mr-2 h-4 w-4" /> Novo Post</Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader><TableRow><TableHead>Título</TableHead><TableHead>Autor</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {posts.length > 0 ? posts.map(post => (
                                <TableRow key={post._id.toString()}>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            {post.isPinned && <Pin className="h-4 w-4 text-primary" />}
                                            <span className="font-medium">{post.title}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>{post.author?.name || 'N/A'}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="outline" size="icon" onClick={() => handleOpenPostDialog(post)}><Edit className="h-4 w-4" /></Button>
                                        <Button variant="destructive" size="icon" onClick={() => setIsDeletePostOpen(post._id.toString())} className="ml-2"><Trash2 className="h-4 w-4" /></Button>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center h-24 text-muted-foreground">
                                        Nenhum post encontrado.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Post Dialog */}
            <Dialog open={isPostDialogOpen} onOpenChange={setIsPostDialogOpen}>
                 <DialogContent className="sm:max-w-2xl">
                    <DialogHeader><DialogTitle>{postForm.getValues('id') ? 'Editar Post' : 'Novo Post'}</DialogTitle></DialogHeader>
                    <Form {...postForm}>
                        <form onSubmit={postForm.handleSubmit(onPostSubmit)} className="space-y-4">
                            <FormField control={postForm.control} name="title" render={({ field }) => (
                                <FormItem><FormLabel>Título</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={postForm.control} name="content" render={({ field }) => (
                                <FormItem><FormLabel>Conteúdo</FormLabel><FormControl><Textarea rows={10} {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                             <FormField control={postForm.control} name="imageUrl" render={({ field }) => (
                                <FormItem><FormLabel>URL da Imagem (Opcional)</FormLabel><FormControl><Input {...field} placeholder="https://exemplo.com/imagem.png" /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={postForm.control} name="isPinned" render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                    <div className="space-y-0.5"><FormLabel>Fixar Post</FormLabel><FormDescription>Posts fixados aparecem no topo do feed.</FormDescription></div>
                                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                </FormItem>
                            )}/>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsPostDialogOpen(false)}>Cancelar</Button>
                                <Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar</Button>
                            </DialogFooter>
                        </form>
                    </Form>
                 </DialogContent>
            </Dialog>

            {/* Delete Alert */}
             <AlertDialog open={!!isDeletePostOpen} onOpenChange={() => setIsDeletePostOpen(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle><AlertDialogDescription>Tem certeza que deseja excluir este post? Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeletePost} disabled={isSubmitting} className="bg-destructive hover:bg-destructive/90">{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Excluir</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
