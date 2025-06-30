'use client';

import { useState } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { updateLevelConfig } from '@/actions/level-actions';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2, PlusCircle, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { LevelThreshold } from '@/types';

const levelSchema = z.object({
  level: z.number(),
  name: z.string().min(1, { message: 'O nome é obrigatório.' }),
  xp: z.coerce.number().min(0, { message: 'O XP não pode ser negativo.' }),
  rewardType: z.enum(['none', 'money', 'role']),
  rewardAmount: z.coerce.number().optional(),
  rewardRoleId: z.string().optional(),
  unlocksFeature: z.enum(['none', 'bolao', 'mvp']).optional(),
});

const formSchema = z.object({
  levels: z.array(levelSchema).refine(levels => {
    for (const level of levels) {
      if (level.rewardType === 'money' && (!level.rewardAmount || level.rewardAmount <= 0)) {
        return false;
      }
      if (level.rewardType === 'role' && (!level.rewardRoleId || level.rewardRoleId.trim() === '')) {
        return false;
      }
    }
    return true;
  }, {
    message: "Valores de recompensa inválidos. Certifique-se de que o valor em dinheiro seja maior que 0 e que o ID do cargo seja preenchido quando necessário.",
  }),
});

export default function AdminLevelClient({ initialLevels }: { initialLevels: LevelThreshold[] }) {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: { levels: initialLevels },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "levels",
    });

    const watchedLevels = useWatch({ control: form.control, name: "levels" });

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        setIsSubmitting(true);
        const result = await updateLevelConfig(values.levels);
        if (result.success) {
            toast({ title: "Sucesso!", description: result.message });
        } else {
            toast({ title: "Erro", description: result.message, variant: "destructive" });
        }
        setIsSubmitting(false);
    };

    const addLevel = () => {
        const lastLevel = fields[fields.length - 1];
        append({
            level: lastLevel.level + 1,
            name: `Nível ${lastLevel.level + 1}`,
            xp: lastLevel.xp + 50000,
            rewardType: 'none',
            unlocksFeature: 'none',
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Gerenciar Níveis e Recompensas</CardTitle>
                <CardDescription>
                    Defina os nomes, XP, recompensas e recursos desbloqueados para cada nível.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                        <div className="space-y-4">
                            {fields.map((field, index) => {
                                const rewardType = watchedLevels[index]?.rewardType;
                                
                                const unlockedFeaturesElsewhere = new Set();
                                if (watchedLevels) {
                                    for (let i = 0; i < watchedLevels.length; i++) {
                                        if (i === index) continue; // Don't check against the current level
                                        const feature = watchedLevels[i]?.unlocksFeature;
                                        if (feature && feature !== 'none') {
                                            unlockedFeaturesElsewhere.add(feature);
                                        }
                                    }
                                }

                                return (
                                    <div key={field.id} className="grid grid-cols-12 gap-4 items-end p-4 border rounded-lg bg-card-foreground/5">
                                        <div className="col-span-12 sm:col-span-1">
                                            <FormLabel>Nível</FormLabel>
                                            <Input value={index + 1} disabled />
                                        </div>
                                        <FormField
                                            control={form.control}
                                            name={`levels.${index}.name`}
                                            render={({ field }) => (
                                                <FormItem className="col-span-6 sm:col-span-2">
                                                    <FormLabel>Nome</FormLabel>
                                                    <FormControl><Input {...field} /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name={`levels.${index}.xp`}
                                            render={({ field }) => (
                                                <FormItem className="col-span-6 sm:col-span-2">
                                                    <FormLabel>XP Mínimo</FormLabel>
                                                    <FormControl><Input type="number" {...field} disabled={index === 0} /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                         <FormField
                                            control={form.control}
                                            name={`levels.${index}.rewardType`}
                                            render={({ field }) => (
                                                 <FormItem className="col-span-6 sm:col-span-2">
                                                    <FormLabel>Recompensa</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <FormControl><SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger></FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="none">Nenhuma</SelectItem>
                                                            <SelectItem value="money">Dinheiro</SelectItem>
                                                            <SelectItem value="role">Cargo (Discord)</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <div className="col-span-6 sm:col-span-2">
                                            {rewardType === 'money' && (
                                                <FormField control={form.control} name={`levels.${index}.rewardAmount`} render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Valor (R$)</FormLabel>
                                                        <FormControl><Input type="number" {...field} value={field.value ?? ''} placeholder="Ex: 500" /></FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}/>
                                            )}
                                            {rewardType === 'role' && (
                                                 <FormField control={form.control} name={`levels.${index}.rewardRoleId`} render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>ID do Cargo</FormLabel>
                                                        <FormControl><Input {...field} value={field.value ?? ''} placeholder="ID do cargo no Discord" /></FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}/>
                                            )}
                                        </div>
                                        <FormField
                                            control={form.control}
                                            name={`levels.${index}.unlocksFeature`}
                                            render={({ field }) => (
                                                 <FormItem className="col-span-6 sm:col-span-2">
                                                    <FormLabel>Desbloqueia</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value || 'none'}>
                                                        <FormControl><SelectTrigger><SelectValue placeholder="Recurso" /></SelectTrigger></FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="none">Nada</SelectItem>
                                                            <SelectItem value="bolao" disabled={unlockedFeaturesElsewhere.has('bolao')}>
                                                                Bolão {unlockedFeaturesElsewhere.has('bolao') && '(em uso)'}
                                                            </SelectItem>
                                                            <SelectItem value="mvp" disabled={unlockedFeaturesElsewhere.has('mvp')}>
                                                                MVP {unlockedFeaturesElsewhere.has('mvp') && '(em uso)'}
                                                            </SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <div className="col-span-12 sm:col-span-1 flex justify-end">
                                            <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)} disabled={fields.length <= 1 || index === 0}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            )}
                        </div>
                        <div className="flex items-center gap-4">
                             <Button type="button" variant="outline" onClick={addLevel}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Adicionar Nível
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Salvar Alterações
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
