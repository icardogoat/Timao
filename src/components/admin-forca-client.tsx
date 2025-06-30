

'use client';

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import {
    upsertForcaWord,
    deleteForcaWord,
    getForcaWords,
    generateForcaWordByAI,
} from '@/actions/forca-actions';
import { updateForcaSettings } from '@/actions/bot-config-actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
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
import { Loader2, PlusCircle, Trash2, Edit, Sparkles, Puzzle, Clock, HelpCircle } from 'lucide-react';
import type { ForcaGameWord } from '@/types';
import { Separator } from './ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { type DiscordChannel } from '@/actions/bot-config-actions';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

const formSchema = z.object({
  id: z.string().optional(),
  word: z.string().min(1, "A palavra é obrigatória.").max(50, "Palavra muito longa."),
  hint: z.string().min(1, "A dica é obrigatória.").max(100, "Dica muito longa."),
});

const settingsFormSchema = z.object({
    channelId: z.string().min(1, "É necessário selecionar um canal."),
    schedule: z.array(z.object({ value: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato inválido. Use HH:mm") })),
});

type FormValues = z.infer<typeof formSchema>;

interface AdminForcaClientProps {
    initialWords: ForcaGameWord[];
    initialSchedule: string[];
    initialChannelId: string;
    discordChannels: DiscordChannel[];
    error: string | null;
}

export function AdminForcaClient({ initialWords, initialSchedule, initialChannelId, discordChannels, error }: AdminForcaClientProps) {
    const { toast } = useToast();
    const [words, setWords] = useState(initialWords);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSettingsSubmitting, setIsSettingsSubmitting] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [aiTheme, setAiTheme] = useState('');
    const [currentWord, setCurrentWord] = useState<ForcaGameWord | null>(null);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: { word: '', hint: '' }
    });

    const settingsForm = useForm<z.infer<typeof settingsFormSchema>>({
        resolver: zodResolver(settingsFormSchema),
        defaultValues: {
            channelId: initialChannelId,
            schedule: initialSchedule.map(s => ({ value: s })) || [],
        },
    });

     const { fields: scheduleFields, append: appendSchedule, remove: removeSchedule } = useFieldArray({
        control: settingsForm.control,
        name: "schedule"
    });

    const handleGenerateByAI = async () => {
        if (!aiTheme) {
            toast({ title: 'Erro', description: 'Por favor, insira um tema para a IA.', variant: 'destructive' });
            return;
        }
        setIsGenerating(true);
        try {
            const result = await generateForcaWordByAI(aiTheme);
            if (result.success && result.data) {
                form.setValue('word', result.data.word);
                form.setValue('hint', result.data.hint);
                toast({ title: 'Sucesso!', description: 'Palavra e dica geradas pela IA.' });
            } else {
                toast({ title: 'Erro de IA', description: result.message, variant: 'destructive' });
            }
        } catch (e) {
            console.error(e);
            toast({ title: 'Erro de IA', description: 'Não foi possível gerar a palavra.', variant: 'destructive' });
        }
        setIsGenerating(false);
    };

    const handleOpenDialog = (word: ForcaGameWord | null) => {
        setCurrentWord(word);
        form.reset(word ? {
            id: word._id.toString(),
            word: word.word,
            hint: word.hint,
        } : { word: '', hint: '' });
        setIsDialogOpen(true);
    };

    const onSubmit = async (values: FormValues) => {
        setIsSubmitting(true);
        const result = await upsertForcaWord(values);
        if (result.success) {
            toast({ title: "Sucesso!", description: result.message });
            setWords(await getForcaWords());
            setIsDialogOpen(false);
        } else {
            toast({ title: "Erro", description: result.message, variant: "destructive" });
        }
        setIsSubmitting(false);
    };
    
    const onSettingsSubmit = async (values: z.infer<typeof settingsFormSchema>) => {
        setIsSettingsSubmitting(true);
        const result = await updateForcaSettings({
            schedule: values.schedule.map(s => s.value),
            channelId: values.channelId,
        });
        if (result.success) {
            toast({ title: "Sucesso!", description: result.message });
        } else {
            toast({ title: "Erro", description: result.message, variant: "destructive" });
        }
        setIsSettingsSubmitting(false);
    };

    const handleDelete = async () => {
        if (!isDeleteDialogOpen) return;
        setIsSubmitting(true);
        const result = await deleteForcaWord(isDeleteDialogOpen);
        if (result.success) {
            toast({ title: "Sucesso!", description: result.message });
            setWords(words.filter(g => g._id.toString() !== isDeleteDialogOpen));
        } else {
            toast({ title: "Erro", description: result.message, variant: "destructive" });
        }
        setIsSubmitting(false);
        setIsDeleteDialogOpen(null);
    };
    
    return (
    <div className="space-y-6">
        <Card>
             <CardHeader>
                <CardTitle className="flex items-center gap-2"><Clock /> Agendamento e Canal</CardTitle>
                <CardDescription>
                    Defina o canal e os horários para a Forca ser iniciada automaticamente. O bot irá sortear uma das palavras cadastradas.
                </CardDescription>
            </CardHeader>
             <CardContent>
                {error && (
                    <Alert variant="destructive" className="mb-4">
                        <HelpCircle className="h-4 w-4" />
                        <AlertTitle>Erro de Configuração</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}
                <Form {...settingsForm}>
                    <form onSubmit={settingsForm.handleSubmit(onSettingsSubmit)} className="space-y-4">
                         <FormField
                            control={settingsForm.control}
                            name="channelId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Canal do Jogo</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value} disabled={discordChannels.length === 0}>
                                        <FormControl>
                                            <SelectTrigger className="w-full md:w-1/2">
                                                <SelectValue placeholder="Selecione um canal" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {discordChannels.map(c => <SelectItem key={c.id} value={c.id}>#{c.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>Canal onde o jogo da Forca será iniciado.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                        
                        <div>
                            <FormLabel>Horários</FormLabel>
                            <div className="space-y-2 mt-2">
                                {scheduleFields.map((field, index) => (
                                    <FormField
                                        key={field.id}
                                        control={settingsForm.control}
                                        name={`schedule.${index}.value`}
                                        render={({ field }) => (
                                            <FormItem className="flex items-center gap-2">
                                                <FormControl><Input type="time" {...field} className="w-48" /></FormControl>
                                                <Button type="button" variant="ghost" size="icon" onClick={() => removeSchedule(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => appendSchedule({ value: '' })}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Horário
                            </Button>
                            <Button type="submit" size="sm" disabled={isSettingsSubmitting || !!error}>
                                {isSettingsSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Salvar Configurações
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Banco de Palavras da Forca</CardTitle>
                        <CardDescription>Crie e gerencie as palavras para o minigame.</CardDescription>
                    </div>
                    <Button onClick={() => handleOpenDialog(null)}><PlusCircle className="mr-2 h-4 w-4" /> Nova Palavra</Button>
                </div>
            </CardHeader>
             <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Palavra</TableHead>
                            <TableHead>Dica</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {words.length > 0 ? words.map(word => (
                            <TableRow key={word._id.toString()}>
                                <TableCell className="font-medium">{word.word}</TableCell>
                                <TableCell className="text-sm text-muted-foreground">{word.hint}</TableCell>
                                <TableCell className="text-right space-x-2">
                                    <Button variant="outline" size="icon" onClick={() => handleOpenDialog(word)}><Edit className="h-4 w-4" /></Button>
                                    <Button variant="destructive" size="icon" onClick={() => setIsDeleteDialogOpen(word._id.toString())}><Trash2 className="h-4 w-4" /></Button>
                                </TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center h-24 text-muted-foreground">
                                    <Puzzle className="mx-auto h-8 w-8 mb-2" />
                                    Nenhuma palavra cadastrada.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>{currentWord ? 'Editar Palavra' : 'Nova Palavra'}</DialogTitle>
                </DialogHeader>
                 <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <Card className="bg-muted/30">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base"><Sparkles className="text-yellow-400"/> Gerador com IA</CardTitle>
                            </CardHeader>
                            <CardContent className="flex flex-col sm:flex-row gap-2">
                                <Input
                                    placeholder="Ex: Ídolos do Corinthians"
                                    value={aiTheme}
                                    onChange={(e) => setAiTheme(e.target.value)}
                                    disabled={isGenerating}
                                    className="flex-grow"
                                />
                                <Button type="button" onClick={handleGenerateByAI} disabled={isGenerating || !aiTheme}>
                                    {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                    Gerar
                                </Button>
                            </CardContent>
                        </Card>

                        <Separator />
                        
                        <FormField control={form.control} name="word" render={({ field }) => (
                            <FormItem><FormLabel>Palavra ou Frase</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField control={form.control} name="hint" render={({ field }) => (
                            <FormItem><FormLabel>Dica</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <DialogFooter className="pt-4 border-t">
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                            <Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>

        <AlertDialog open={!!isDeleteDialogOpen} onOpenChange={() => setIsDeleteDialogOpen(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                    <AlertDialogDescription>Tem certeza que deseja excluir esta palavra? Esta ação não pode ser desfeita.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} disabled={isSubmitting} className="bg-destructive hover:bg-destructive/90">
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Excluir
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
      </AlertDialog>
    </div>
    );
}
