

'use client';

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import {
    upsertPlayerGame,
    deletePlayerGame,
    getPlayerGames,
    setPlayerGameStatus,
    generatePlayerGameByAI,
} from '@/actions/player-game-actions';
import { updatePlayerGameSchedule } from '@/actions/bot-config-actions';
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
import { Textarea } from '@/components/ui/textarea';
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
import { Loader2, PlusCircle, Trash2, Edit, HelpCircle, Sparkles, Gamepad2, Play, Pause, Clock } from 'lucide-react';
import type { PlayerGuessingGame } from '@/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Badge } from './ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import type { DiscordChannel } from '@/actions/bot-config-actions';

const gameFormSchema = z.object({
  id: z.string().optional(),
  channelId: z.string().optional(),
  playerName: z.string().min(1, "O nome do jogador é obrigatório."),
  prizeAmount: z.coerce.number().min(1, "O prêmio deve ser de pelo menos 1."),
  hints: z.array(z.string().min(1, "A dica não pode estar vazia.")).min(5, "São necessárias pelo menos 5 dicas."),
  nationality: z.string().length(2, "Deve ser um código de país de 2 letras.").min(1, "A nacionalidade é obrigatória."),
});

const scheduleFormSchema = z.object({
    schedule: z.array(z.object({ value: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato inválido. Use HH:mm") })),
});


type FormValues = z.infer<typeof gameFormSchema>;

interface AdminPlayerGameClientProps {
    initialGames: PlayerGuessingGame[];
    discordChannels: DiscordChannel[];
    error: string | null;
    initialSchedule: string[];
}

export function AdminPlayerGameClient({ initialGames, discordChannels, error, initialSchedule }: AdminPlayerGameClientProps) {
    const { toast } = useToast();
    const [games, setGames] = useState(initialGames);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isScheduleSubmitting, setIsScheduleSubmitting] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [aiTheme, setAiTheme] = useState('');
    const [currentGame, setCurrentGame] = useState<PlayerGuessingGame | null>(null);

    const form = useForm<FormValues>({
        resolver: zodResolver(gameFormSchema),
        defaultValues: { playerName: '', prizeAmount: 500, hints: Array(5).fill(''), nationality: '' }
    });
    
    const scheduleForm = useForm<z.infer<typeof scheduleFormSchema>>({
        resolver: zodResolver(scheduleFormSchema),
        defaultValues: {
            schedule: initialSchedule.map(s => ({ value: s })) || [],
        },
    });

     const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "hints"
    });
    
    const { fields: scheduleFields, append: appendSchedule, remove: removeSchedule } = useFieldArray({
        control: scheduleForm.control,
        name: "schedule"
    });

    const handleGenerateByAI = async () => {
        if (!aiTheme) {
            toast({ title: 'Erro', description: 'Por favor, insira um tema para a IA.', variant: 'destructive' });
            return;
        }
        setIsGenerating(true);
        try {
            const result = await generatePlayerGameByAI(aiTheme);
            if (result.success && result.data) {
                form.setValue('playerName', result.data.playerName);
                form.setValue('nationality', result.data.nationality);
                form.setValue('hints', result.data.hints);
                toast({ title: 'Sucesso!', description: 'Dados do jogador gerados pela IA.' });
            } else {
                toast({ title: 'Erro de IA', description: result.message, variant: 'destructive' });
            }
        } catch (e) {
            console.error(e);
            toast({ title: 'Erro de IA', description: 'Não foi possível gerar os dados do jogador.', variant: 'destructive' });
        }
        setIsGenerating(false);
    };

    const handleOpenDialog = (game: PlayerGuessingGame | null) => {
        setCurrentGame(game);
        form.reset(game ? {
            id: game._id.toString(),
            channelId: game.channelId,
            playerName: game.playerName,
            prizeAmount: game.prizeAmount,
            hints: game.hints,
            nationality: game.nationality,
        } : { playerName: '', prizeAmount: 500, hints: Array(5).fill(''), nationality: '' });
        setIsDialogOpen(true);
    };

    const onSubmit = async (values: FormValues) => {
        setIsSubmitting(true);
        const result = await upsertPlayerGame(values);
        if (result.success) {
            toast({ title: "Sucesso!", description: result.message });
            setGames(await getPlayerGames());
            setIsDialogOpen(false);
        } else {
            toast({ title: "Erro", description: result.message, variant: "destructive" });
        }
        setIsSubmitting(false);
    };

    const onScheduleSubmit = async (values: z.infer<typeof scheduleFormSchema>) => {
        setIsScheduleSubmitting(true);
        const result = await updatePlayerGameSchedule(values.schedule.map(s => s.value));
        if (result.success) {
            toast({ title: "Sucesso!", description: result.message });
        } else {
            toast({ title: "Erro", description: result.message, variant: "destructive" });
        }
        setIsScheduleSubmitting(false);
    };

    const handleDelete = async () => {
        if (!isDeleteDialogOpen) return;
        setIsSubmitting(true);
        const result = await deletePlayerGame(isDeleteDialogOpen);
        if (result.success) {
            toast({ title: "Sucesso!", description: result.message });
            setGames(games.filter(g => g._id.toString() !== isDeleteDialogOpen));
        } else {
            toast({ title: "Erro", description: result.message, variant: "destructive" });
        }
        setIsSubmitting(false);
        setIsDeleteDialogOpen(null);
    };
    
    const handleStatusChange = async (game: PlayerGuessingGame, newStatus: 'draft' | 'active') => {
        if (newStatus === 'active' && !game.channelId) {
            toast({
                title: "Canal não selecionado",
                description: "Por favor, edite o jogo e selecione um canal antes de iniciá-lo.",
                variant: "destructive"
            });
            return;
        }

        setIsSubmitting(true);
        const result = await setPlayerGameStatus(game._id.toString(), newStatus);
         if (result.success) {
            toast({ title: "Sucesso!", description: result.message });
            setGames(await getPlayerGames());
        } else {
            toast({ title: "Erro", description: result.message, variant: "destructive" });
        }
        setIsSubmitting(false);
    }
    
    const getStatusBadge = (status: PlayerGuessingGame['status'], winnerName?: string) => {
        switch(status) {
            case 'active': return <Badge>Ativo</Badge>;
            case 'finished': 
                return winnerName 
                    ? <Badge variant="secondary">Finalizado (Vencedor: {winnerName})</Badge>
                    : <Badge variant="secondary">Finalizado (Sem vencedor)</Badge>;
            case 'draft': return <Badge variant="outline">Inativo</Badge>;
        }
    }

    const sortedGames = [...games].sort((a, b) => {
        if (a.status === 'active' && b.status !== 'active') return -1;
        if (a.status !== 'active' && b.status === 'active') return 1;
        return 0;
    });

    return (
    <div className="space-y-6">
        <Card>
             <CardHeader>
                <CardTitle className="flex items-center gap-2"><Clock /> Agendamento Global</CardTitle>
                <CardDescription>
                    Defina horários para o jogo ser iniciado automaticamente. O bot irá sortear um dos jogos criados para iniciar.
                </CardDescription>
            </CardHeader>
             <CardContent>
                <Form {...scheduleForm}>
                    <form onSubmit={scheduleForm.handleSubmit(onScheduleSubmit)} className="space-y-4">
                        <div className="space-y-2">
                            {scheduleFields.map((field, index) => (
                                <FormField
                                    key={field.id}
                                    control={scheduleForm.control}
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
                        <div className="flex flex-wrap gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => appendSchedule({ value: '' })}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Horário
                            </Button>
                            <Button type="submit" size="sm" disabled={isScheduleSubmitting}>
                                {isScheduleSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Salvar Agenda
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
                        <CardTitle>Banco de Jogos</CardTitle>
                        <CardDescription>Crie e gerencie os jogos de adivinhação.</CardDescription>
                    </div>
                    <Button onClick={() => handleOpenDialog(null)}><PlusCircle className="mr-2 h-4 w-4" /> Novo Jogo</Button>
                </div>
            </CardHeader>
             <CardContent>
                {error && (
                    <Alert variant="destructive" className="mb-4">
                        <HelpCircle className="h-4 w-4" />
                        <AlertTitle>Erro de Configuração</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Jogador</TableHead>
                            <TableHead className="text-center">Canal</TableHead>
                            <TableHead className="text-center">Prêmio</TableHead>
                            <TableHead className="text-center">Status</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedGames.length > 0 ? sortedGames.map(game => (
                            <TableRow key={game._id.toString()}>
                                <TableCell className="font-medium">{game.playerName}</TableCell>
                                <TableCell className="text-center text-sm text-muted-foreground">
                                    {discordChannels.find(c => c.id === game.channelId)?.name ? `#${discordChannels.find(c => c.id === game.channelId)?.name}` : 'Nenhum'}
                                </TableCell>
                                <TableCell className="text-center font-mono">R$ {game.prizeAmount.toFixed(2)}</TableCell>
                                <TableCell className="text-center">{getStatusBadge(game.status, game.winnerName)}</TableCell>
                                <TableCell className="text-right space-x-2">
                                    {game.status === 'active' ? (
                                        <Button size="sm" variant="secondary" onClick={() => handleStatusChange(game, 'draft')} disabled={isSubmitting}>
                                            <Pause className="mr-2 h-4 w-4" /> Pausar
                                        </Button>
                                    ) : (
                                        <Button size="sm" onClick={() => handleStatusChange(game, 'active')} disabled={isSubmitting || !!error}>
                                            <Play className="mr-2 h-4 w-4" /> Iniciar
                                        </Button>
                                    )}
                                    <Button variant="outline" size="icon" onClick={() => handleOpenDialog(game)}><Edit className="h-4 w-4" /></Button>
                                    <Button variant="destructive" size="icon" onClick={() => setIsDeleteDialogOpen(game._id.toString())}><Trash2 className="h-4 w-4" /></Button>
                                </TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                    <Gamepad2 className="mx-auto h-8 w-8 mb-2" />
                                    Nenhum jogo encontrado. Crie um novo para começar!
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{currentGame ? 'Editar Jogo' : 'Novo Jogo'}</DialogTitle>
                </DialogHeader>
                 <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden">
                        <div className="flex-grow overflow-y-auto pr-6 -mr-6 space-y-6">
                            <Card className="bg-muted/30">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2"><Sparkles className="text-yellow-400"/> Gerador com IA</CardTitle>
                                </CardHeader>
                                <CardContent className="flex flex-col sm:flex-row gap-2">
                                    <Input
                                        placeholder="Ex: um zagueiro campeão do mundo em 2002"
                                        value={aiTheme}
                                        onChange={(e) => setAiTheme(e.target.value)}
                                        disabled={isGenerating}
                                        className="flex-grow"
                                    />
                                    <Button type="button" onClick={handleGenerateByAI} disabled={isGenerating || !aiTheme}>
                                        {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                        Gerar Dados
                                    </Button>
                                </CardContent>
                            </Card>

                            <Separator />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField control={form.control} name="channelId" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Canal do Jogo</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione um canal" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {discordChannels.map(c => <SelectItem key={c.id} value={c.id}>#{c.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                        <FormDescription>Canal onde o jogo será postado.</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                <FormField control={form.control} name="prizeAmount" render={({ field }) => (
                                    <FormItem><FormLabel>Prêmio (R$)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField control={form.control} name="playerName" render={({ field }) => (
                                    <FormItem><FormLabel>Nome do Jogador</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                 <FormField control={form.control} name="nationality" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nacionalidade</FormLabel>
                                        <FormControl><Input {...field} maxLength={2} placeholder="Ex: BR, AR, PT" /></FormControl>
                                        <FormDescription>Código do país de 2 letras (ISO 3166-1 alpha-2).</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                            </div>

                            <div>
                                <Label>Dicas</Label>
                                <div className="space-y-2 mt-2">
                                    {fields.map((field, index) => (
                                         <FormField key={field.id} control={form.control} name={`hints.${index}`} render={({ field: optionField }) => (
                                            <FormItem className="flex items-center gap-2">
                                                <FormControl><Textarea {...optionField} rows={1} placeholder={`Dica ${index + 1}`} /></FormControl>
                                                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={fields.length <= 1}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                            </FormItem>
                                        )}/>
                                    ))}
                                </div>
                                <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => append('')}>
                                    <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Dica
                                </Button>
                            </div>
                        </div>
                        <DialogFooter className="pt-4 border-t">
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                            <Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar Jogo</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>

        <AlertDialog open={!!isDeleteDialogOpen} onOpenChange={() => setIsDeleteDialogOpen(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                    <AlertDialogDescription>Tem certeza que deseja excluir este jogo? Esta ação não pode ser desfeita.</AlertDialogDescription>
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
