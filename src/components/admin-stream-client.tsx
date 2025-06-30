
'use client';

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import {
    getLiveStreams,
    upsertLiveStream,
    deleteLiveStream,
    setStreamIntervalState,
} from '@/actions/stream-actions';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription
} from '@/components/ui/form';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, PlusCircle, Trash2, Edit, Tv, Eye } from 'lucide-react';
import type { LiveStream, StreamSource } from '@/types';
import Link from 'next/link';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Separator } from './ui/separator';
import { Switch } from './ui/switch';

const sourceSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "O nome da opção é obrigatório.").default(''),
  type: z.enum(['iframe', 'hls']).default('iframe'),
  url: z.string().url("Por favor, insira uma URL válida.").default(''),
}).refine(data => {
    if (data.type === 'hls') {
        return data.url.endsWith('.m3u8');
    }
    return true;
}, {
    message: "A URL HLS deve terminar com .m3u8",
    path: ['url'],
});

const streamFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(3, "O nome da transmissão é muito curto."),
  sources: z.array(sourceSchema).min(1, "É necessária pelo menos uma fonte de transmissão."),
});

type FormValues = z.infer<typeof streamFormSchema>;

export function AdminStreamClient({ initialStreams }: { initialStreams: LiveStream[] }) {
  const { toast } = useToast();
  const [streams, setStreams] = useState(initialStreams);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStream, setCurrentStream] = useState<LiveStream | null>(null);
  const [intervalLoading, setIntervalLoading] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(streamFormSchema),
    defaultValues: { name: '', sources: [] }
  });

  const { fields, append, remove } = useFieldArray({
      control: form.control,
      name: "sources",
  });
  
  const handleOpenDialog = (stream: LiveStream | null) => {
    setCurrentStream(stream);
    form.reset({ 
        id: stream?._id.toString(),
        name: stream?.name || '',
        sources: stream?.sources?.length ? stream.sources : [{ id: crypto.randomUUID(), name: 'Opção 1', type: 'iframe', url: '' }],
    });
    setIsDialogOpen(true);
  };

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    const result = await upsertLiveStream(values);
    if (result.success) {
      toast({ title: 'Sucesso!', description: result.message });
      setStreams(await getLiveStreams());
      setIsDialogOpen(false);
    } else {
      toast({ title: 'Erro', description: result.message, variant: 'destructive' });
    }
    setIsSubmitting(false);
  };

  const handleDelete = async () => {
    if (!isDeleteDialogOpen) return;
    setIsSubmitting(true);
    const result = await deleteLiveStream(isDeleteDialogOpen);
    if (result.success) {
      toast({ title: 'Sucesso!', description: result.message });
      setStreams(streams.filter((s) => s._id.toString() !== isDeleteDialogOpen));
    } else {
      toast({ title: 'Erro', description: result.message, variant: 'destructive' });
    }
    setIsSubmitting(false);
    setIsDeleteDialogOpen(null);
  };

  const handleIntervalToggle = async (streamId: string, currentStatus: boolean) => {
    setIntervalLoading(streamId);
    const result = await setStreamIntervalState(streamId, !currentStatus);
    if (result.success) {
        toast({ title: "Sucesso!", description: result.message });
        setStreams(prev => prev.map(s => s._id.toString() === streamId ? { ...s, isIntervalActive: !currentStatus } : s));
    } else {
        toast({ title: "Erro", description: result.message, variant: "destructive" });
    }
    setIntervalLoading(null);
};


  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Gerenciar Transmissões</CardTitle>
              <CardDescription>Crie e controle transmissões ao vivo para sua comunidade.</CardDescription>
            </div>
            <Button onClick={() => handleOpenDialog(null)}>
              <PlusCircle className="mr-2 h-4 w-4" /> Nova Transmissão
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
            {streams.map(stream => (
                <Card key={stream._id.toString()} className="overflow-hidden">
                    <div className="p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                        <div className='flex items-center gap-3'>
                            <Tv className="h-6 w-6 text-primary" />
                            <div>
                                <p className="font-semibold">{stream.name}</p>
                                <p className="text-xs text-muted-foreground">
                                    {stream.sources?.length || 0} fonte(s) | Criado em: {new Date(stream.createdAt).toLocaleDateString('pt-BR')}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                             <Button variant="outline" size="sm" asChild>
                                <Link href={`/stream/${stream._id.toString()}`} target="_blank">
                                    <Eye className="mr-2 h-4 w-4"/>
                                    Abrir Página Pública
                                </Link>
                            </Button>
                             <Button variant="secondary" size="sm" onClick={() => handleOpenDialog(stream)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Editar
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => setIsDeleteDialogOpen(stream._id.toString())}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Excluir
                            </Button>
                        </div>
                    </div>
                     <div className="px-4 pb-4">
                        <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-3">
                            <div className="space-y-0.5">
                                <Label>Modo Intervalo</Label>
                                <p className="text-xs text-muted-foreground">
                                    Exibe uma tela de intervalo para os espectadores.
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                {intervalLoading === stream._id.toString() && <Loader2 className="h-4 w-4 animate-spin" />}
                                <Switch
                                    checked={!!stream.isIntervalActive}
                                    onCheckedChange={() => handleIntervalToggle(stream._id.toString(), !!stream.isIntervalActive)}
                                    disabled={intervalLoading === stream._id.toString()}
                                />
                            </div>
                        </div>
                    </div>
                </Card>
            ))}
            {streams.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                    <Tv className="mx-auto h-12 w-12" />
                    <p className="mt-4">Nenhuma transmissão criada ainda.</p>
                </div>
            )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{currentStream ? 'Editar Transmissão' : 'Nova Transmissão'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="max-h-[60vh] overflow-y-auto space-y-6 pr-4">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Nome da Transmissão</FormLabel>
                        <FormControl>
                        <Input {...field} placeholder="Ex: Corinthians x São Paulo - Ao Vivo" />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                
                <Separator />

                <div>
                    <Label className="text-sm font-medium">Fontes da Transmissão</Label>
                    <FormDescription className="mb-4">Adicione uma ou mais fontes para os espectadores escolherem.</FormDescription>
                    <div className="space-y-4">
                        {fields.map((field, index) => (
                            <Card key={field.id} className="p-4 bg-muted/50">
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="font-semibold">Fonte {index + 1}</h4>
                                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={fields.length <= 1}>
                                        <Trash2 className="h-4 w-4 text-destructive"/>
                                    </Button>
                                </div>
                                <div className="space-y-4">
                                    <FormField control={form.control} name={`sources.${index}.name`} render={({ field }) => (
                                        <FormItem><FormLabel>Nome da Opção</FormLabel><FormControl><Input {...field} placeholder={`Opção ${index + 1}`} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                    <FormField control={form.control} name={`sources.${index}.type`} render={({ field }) => (
                                        <FormItem className="space-y-3">
                                            <FormLabel>Tipo</FormLabel>
                                            <FormControl>
                                                <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex space-x-4">
                                                    <div className="flex items-center space-x-2 space-y-0">
                                                        <RadioGroupItem value="iframe" id={`iframe-${field.id}`} />
                                                        <Label htmlFor={`iframe-${field.id}`} className="font-normal">iFrame</Label>
                                                    </div>
                                                    <div className="flex items-center space-x-2 space-y-0">
                                                        <RadioGroupItem value="hls" id={`hls-${field.id}`} />
                                                        <Label htmlFor={`hls-${field.id}`} className="font-normal">HLS (.m3u8)</Label>
                                                    </div>
                                                </RadioGroup>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}/>
                                    <FormField control={form.control} name={`sources.${index}.url`} render={({ field }) => (
                                        <FormItem><FormLabel>URL</FormLabel><FormControl><Input {...field} placeholder="https://..." /></FormControl>
                                        <FormDescription>Para iframe, cole a URL do atributo 'src'. Para HLS, a URL do arquivo .m3u8.</FormDescription>
                                        <FormMessage /></FormItem>
                                    )}/>
                                </div>
                            </Card>
                        ))}
                    </div>
                    <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => append({ id: crypto.randomUUID(), name: `Opção ${fields.length + 1}`, type: 'iframe', url: '' })}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Fonte
                    </Button>
                </div>
              </div>
              
              <div className="pt-4 border-t">
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar
                    </Button>
                </DialogFooter>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!isDeleteDialogOpen} onOpenChange={() => setIsDeleteDialogOpen(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta transmissão? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
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
