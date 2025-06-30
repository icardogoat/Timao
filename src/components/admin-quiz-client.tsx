
'use client';

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import {
    createQuiz,
    deleteQuiz,
    getQuizzes,
    updateQuiz
} from '@/actions/quiz-actions';
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
import { Loader2, PlusCircle, Trash2, Edit, HelpCircle, Sparkles } from 'lucide-react';
import type { Quiz } from '@/types';
import type { DiscordChannel, DiscordRole } from '@/actions/bot-config-actions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Separator } from './ui/separator';
import { generateQuizQuestions } from '@/ai/flows/quiz-generator-flow';

const questionSchema = z.object({
  question: z.string().min(1, 'A pergunta não pode estar vazia.'),
  options: z.array(z.string().min(1, 'A opção não pode estar vazia.')).length(4, 'São necessárias 4 opções.'),
  answer: z.coerce.number().min(0).max(3),
});

const quizSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres.'),
  description: z.string().optional(),
  rewardPerQuestion: z.coerce.number().min(1, 'A recompensa deve ser de pelo menos 1.'),
  questionsPerGame: z.coerce.number().int().min(1, "O quiz deve ter pelo menos 1 pergunta por rodada."),
  winnerLimit: z.coerce.number().int().min(0, "O limite de vencedores não pode ser negativo."),
  channelId: z.string().min(1, 'É necessário selecionar um canal.'),
  mentionRoleId: z.string().optional(),
  schedule: z.array(z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato inválido. Use HH:mm")).optional(),
  questions: z.array(questionSchema).min(1, 'É necessária pelo menos uma pergunta.'),
});

export function AdminQuizClient({ initialQuizzes, discordChannels, discordRoles, error }: { initialQuizzes: Quiz[], discordChannels: DiscordChannel[], discordRoles: DiscordRole[], error: string | null }) {
    const { toast } = useToast();
    const [quizzes, setQuizzes] = useState(initialQuizzes);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [aiTheme, setAiTheme] = useState('');
    const [aiQuestionCount, setAiQuestionCount] = useState(5);
    const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null);

    const form = useForm<z.infer<typeof quizSchema>>({
        resolver: zodResolver(quizSchema),
        defaultValues: { name: '', questions: [{ question: '', options: ['', '', '', ''], answer: 0 }] }
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "questions"
    });
    
    const { fields: scheduleFields, append: appendSchedule, remove: removeSchedule } = useFieldArray({
        control: form.control,
        name: "schedule"
    });

    const handleGenerateQuestions = async () => {
        if (!aiTheme) {
            toast({ title: 'Erro', description: 'Por favor, insira um tema para a IA.', variant: 'destructive' });
            return;
        }
        setIsGenerating(true);
        try {
            const generatedQuestions = await generateQuizQuestions({ theme: aiTheme, questionCount: aiQuestionCount });
            if (generatedQuestions && generatedQuestions.length > 0) {
                // Ensure each question has exactly 4 options for the form
                const formattedQuestions = generatedQuestions.map(q => ({
                    ...q,
                    options: q.options.concat(Array(4 - q.options.length).fill('')).slice(0, 4)
                }));
                form.setValue('questions', formattedQuestions);
                toast({ title: 'Sucesso!', description: `${generatedQuestions.length} perguntas foram geradas.` });
            } else {
                toast({ title: 'Atenção', description: 'A IA não retornou perguntas. Tente um tema diferente.', variant: 'default' });
            }
        } catch (e) {
            console.error(e);
            toast({ title: 'Erro de IA', description: 'Não foi possível gerar as perguntas.', variant: 'destructive' });
        }
        setIsGenerating(false);
    };


    const handleOpenDialog = (quiz: Quiz | null) => {
        setCurrentQuiz(quiz);
        if (quiz) {
            form.reset({
                id: quiz._id.toString(),
                name: quiz.name,
                description: quiz.description,
                rewardPerQuestion: quiz.rewardPerQuestion,
                questionsPerGame: quiz.questionsPerGame,
                winnerLimit: quiz.winnerLimit,
                channelId: quiz.channelId,
                mentionRoleId: quiz.mentionRoleId || undefined,
                schedule: quiz.schedule || [],
                questions: quiz.questions.map(q => ({...q, options: q.options.concat(Array(4 - q.options.length).fill('')).slice(0, 4)})),
            });
        } else {
            form.reset({
                name: '',
                description: '',
                rewardPerQuestion: 100,
                questionsPerGame: 5,
                winnerLimit: 0,
                channelId: undefined,
                mentionRoleId: undefined,
                schedule: [],
                questions: [{ question: '', options: ['', '', '', ''], answer: 0 }],
            });
        }
        setIsDialogOpen(true);
    };

    const onSubmit = async (values: z.infer<typeof quizSchema>) => {
        setIsSubmitting(true);
        const result = values.id
            ? await updateQuiz(values.id, values)
            : await createQuiz(values);
        
        if (result.success) {
            toast({ title: 'Sucesso!', description: result.message });
            setQuizzes(await getQuizzes());
            setIsDialogOpen(false);
        } else {
            toast({ title: 'Erro', description: result.message, variant: 'destructive' });
        }
        setIsSubmitting(false);
    };

    const handleDelete = async () => {
        if (!isDeleteDialogOpen) return;
        setIsSubmitting(true);
        const result = await deleteQuiz(isDeleteDialogOpen);
        if (result.success) {
            toast({ title: 'Sucesso!', description: result.message });
            setQuizzes(quizzes.filter(q => q._id.toString() !== isDeleteDialogOpen));
        } else {
            toast({ title: 'Erro', description: result.message, variant: 'destructive' });
        }
        setIsSubmitting(false);
        setIsDeleteDialogOpen(null);
    };

    return (
        <>
        <Card>
            <CardHeader>
            <div className="flex justify-between items-center">
                <div>
                <CardTitle>Gerenciar Quizzes</CardTitle>
                <CardDescription>Crie e gerencie os quizzes para o seu bot.</CardDescription>
                </div>
                <Button onClick={() => handleOpenDialog(null)}><PlusCircle className="mr-2 h-4 w-4" /> Novo Quiz</Button>
            </div>
            </CardHeader>
            <CardContent>
             {error && (
                <Alert variant="destructive" className="mb-4">
                    <HelpCircle className="h-4 w-4" />
                    <AlertTitle>Erro de Configuração do Bot</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Nome do Quiz</TableHead>
                    <TableHead className="text-center">Perguntas</TableHead>
                    <TableHead className="text-right">Recompensa (por acerto)</TableHead>
                    <TableHead className="text-right w-24">Ações</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {quizzes.length > 0 ? quizzes.map(quiz => (
                    <TableRow key={quiz._id.toString()}>
                    <TableCell>
                        <p className="font-medium">{quiz.name}</p>
                        <p className="text-sm text-muted-foreground">{quiz.description}</p>
                    </TableCell>
                    <TableCell className="text-center">{quiz.questions.length}</TableCell>
                    <TableCell className="text-right font-mono">R$ {quiz.rewardPerQuestion.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                        <Button variant="outline" size="icon" className="mr-2" onClick={() => handleOpenDialog(quiz)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="destructive" size="icon" onClick={() => setIsDeleteDialogOpen(quiz._id.toString())}><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                    </TableRow>
                )) : (
                    <TableRow>
                        <TableCell colSpan={4} className="text-center h-24">Nenhum quiz encontrado.</TableCell>
                    </TableRow>
                )}
                </TableBody>
            </Table>
            </CardContent>
        </Card>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{currentQuiz ? 'Editar Quiz' : 'Novo Quiz'}</DialogTitle>
                </DialogHeader>
                 <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-grow overflow-hidden">
                        <div className="flex-grow overflow-y-auto pr-6 -mr-6 space-y-6">
                            <FormField control={form.control} name="name" render={({ field }) => (
                                <FormItem><FormLabel>Nome do Quiz</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="description" render={({ field }) => (
                                <FormItem><FormLabel>Descrição (Opcional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <FormField control={form.control} name="rewardPerQuestion" render={({ field }) => (
                                    <FormItem><FormLabel>Recompensa por Acerto (R$)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="channelId" render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Canal do Quiz</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value} disabled={discordChannels.length === 0}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Selecione um canal" /></SelectTrigger></FormControl>
                                        <SelectContent>
                                        {discordChannels.map(channel => (
                                            <SelectItem key={channel.id} value={channel.id}>#{channel.name}</SelectItem>
                                        ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                    </FormItem>
                                )}/>
                                <FormField control={form.control} name="mentionRoleId" render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Cargo para Notificar (Opcional)</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Selecione um cargo" /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            {discordRoles.map(role => (
                                                <SelectItem key={role.id} value={role.id}>@{role.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                    </FormItem>
                                )}/>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField control={form.control} name="questionsPerGame" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Perguntas por Rodada</FormLabel>
                                        <FormControl><Input type="number" {...field} /></FormControl>
                                        <FormDescription>Quantas perguntas (aleatórias) serão feitas do total.</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                <FormField control={form.control} name="winnerLimit" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Limite de Vencedores Únicos</FormLabel>
                                        <FormControl><Input type="number" {...field} /></FormControl>
                                        <FormDescription>Quantos usuários diferentes podem ganhar prêmios. Use 0 para ilimitado.</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                            </div>
                            
                            <Separator />

                            <div>
                                <h3 className="text-lg font-semibold">Agendamento (Opcional)</h3>
                                <FormDescription className="mb-4">
                                    Defina horários para o quiz ser iniciado automaticamente no canal selecionado. O horário segue a timezone de São Paulo (UTC-3).
                                </FormDescription>
                                <div className="space-y-2">
                                    {scheduleFields.map((field, index) => (
                                        <FormField
                                            key={field.id}
                                            control={form.control}
                                            name={`schedule.${index}`}
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
                                <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => appendSchedule({value: ''} as any)}>
                                    <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Horário
                                </Button>
                            </div>
                            
                             <Separator />

                            <Card className="bg-muted/30">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2"><Sparkles className="text-yellow-400"/> Gerador de Perguntas com IA</CardTitle>
                                    <CardDescription>Não sabe o que perguntar? Deixe a IA criar as perguntas para você com base em um tema.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex flex-col sm:flex-row gap-2">
                                        <Input
                                            placeholder="Ex: História do Corinthians"
                                            value={aiTheme}
                                            onChange={(e) => setAiTheme(e.target.value)}
                                            disabled={isGenerating}
                                            className="flex-grow"
                                        />
                                        <div className="flex items-center gap-2">
                                            <Input
                                                type="number"
                                                min="1"
                                                max="10"
                                                value={aiQuestionCount}
                                                onChange={(e) => setAiQuestionCount(Math.max(1, Math.min(10, parseInt(e.target.value, 10) || 1)))}
                                                disabled={isGenerating}
                                                className="w-20"
                                                aria-label="Número de perguntas"
                                            />
                                            <Button type="button" onClick={handleGenerateQuestions} disabled={isGenerating || !aiTheme}>
                                                {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                                Gerar
                                            </Button>
                                        </div>
                                    </div>
                                    <FormDescription className="mt-2">Você pode gerar de 1 a 10 perguntas.</FormDescription>
                                </CardContent>
                            </Card>
                            
                            <Separator />

                            <h3 className="text-lg font-semibold">Perguntas</h3>
                            
                            <div className="space-y-4">
                                {fields.map((field, index) => (
                                    <Card key={field.id} className="p-4 bg-muted/50">
                                    <div className="flex justify-between items-center mb-4">
                                        <h4 className="font-semibold">Pergunta {index + 1}</h4>
                                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={fields.length <= 1}>
                                        <Trash2 className="h-4 w-4 text-destructive"/>
                                        </Button>
                                    </div>
                                    <div className="space-y-4">
                                        <FormField control={form.control} name={`questions.${index}.question`} render={({ field }) => (
                                            <FormItem><FormLabel>Texto da Pergunta</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                                        )}/>
                                        <FormField
                                            control={form.control}
                                            name={`questions.${index}.answer`}
                                            render={({ field }) => (
                                                <FormItem>
                                                <FormLabel>Opções (Marque a correta)</FormLabel>
                                                <RadioGroup onValueChange={field.onChange} value={String(field.value)} className="space-y-2">
                                                    {form.getValues(`questions.${index}.options`).map((_, optionIndex) => (
                                                    <FormField key={`${field.name}-option-${optionIndex}`} control={form.control} name={`questions.${index}.options.${optionIndex}`} render={({ field: optionField }) => (
                                                        <FormItem className="flex items-center gap-2">
                                                        <FormControl>
                                                            <RadioGroupItem value={String(optionIndex)} id={`${field.name}-${optionIndex}`} />
                                                        </FormControl>
                                                        <Input {...optionField} placeholder={`Opção ${optionIndex + 1}`} className="flex-1"/>
                                                        </FormItem>
                                                    )}/>
                                                    ))}
                                                </RadioGroup>
                                                <FormMessage />
                                                </FormItem>
                                            )}
                                            />
                                    </div>
                                    </Card>
                                ))}
                            </div>
                            <div className="sticky bottom-0 bg-background pt-4">
                                <Button type="button" variant="outline" size="sm" onClick={() => append({ question: '', options: ['', '', '', ''], answer: 0 })}>
                                    <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Pergunta
                                </Button>
                            </div>
                        </div>
                        <DialogFooter className="sticky bottom-0 bg-background py-4 -mx-6 px-6 border-t mt-auto">
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                            <Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar Quiz</Button>
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
                Tem certeza que deseja excluir este quiz? Esta ação não pode ser desfeita.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} disabled={isSubmitting} className="bg-destructive hover:bg-destructive/90">
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Excluir
                </AlertDialogAction>
            </AlertDialogFooter>
            </AlertDialogContent>
      </AlertDialog>
      </>
    )
}
