
'use client';

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { updateApiSettings } from '@/actions/settings-actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2, PlusCircle, Trash2, Gift } from 'lucide-react';
import type { ApiSettings } from '@/types';

const adSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "O nome é obrigatório."),
  url: z.string().url("Por favor, insira uma URL de vídeo válida."),
});

const formSchema = z.object({
  dailyRewardAds: z.array(adSchema).max(5, "Você pode adicionar no máximo 5 vídeos."),
});

type FormValues = z.infer<typeof formSchema>;

interface AdminRewardsClientProps {
    initialSettings: Partial<ApiSettings>;
}

export default function AdminRewardsClient({ initialSettings }: AdminRewardsClientProps) {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            dailyRewardAds: initialSettings.dailyRewardAds || [],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "dailyRewardAds",
    });

    async function onSubmit(values: FormValues) {
        setIsSubmitting(true);
        // We need to submit all api settings, not just the ads part.
        const result = await updateApiSettings({
            siteUrl: initialSettings.siteUrl || '',
            updateApiKeys: initialSettings.updateApiKeys?.map(k => ({ key: k.key })) || [],
            paymentApiKeys: initialSettings.paymentApiKeys?.map(k => ({ key: k.key })) || [],
            dailyRewardAds: values.dailyRewardAds,
        });

        if (result.success) {
            toast({ title: "Sucesso!", description: "Configurações de recompensa salvas." });
        } else {
            toast({ title: "Erro", description: result.message, variant: "destructive" });
        }
        setIsSubmitting(false);
    }
    
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Gift /> Recompensa Diária</CardTitle>
                <CardDescription>Configure os vídeos de anúncio que os usuários devem assistir para resgatar a recompensa diária.</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <div className="space-y-4">
                            {fields.map((field, index) => (
                                <Card key={field.id} className="p-4 bg-muted/50">
                                    <div className="flex justify-between items-center mb-4">
                                        <h4 className="font-semibold">Vídeo {index + 1}</h4>
                                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                                            <Trash2 className="h-4 w-4 text-destructive"/>
                                        </Button>
                                    </div>
                                    <div className="space-y-4">
                                        <FormField control={form.control} name={`dailyRewardAds.${index}.name`} render={({ field }) => (
                                            <FormItem><FormLabel>Nome do Vídeo</FormLabel><FormControl><Input {...field} placeholder="Anúncio Parceiro X" /></FormControl><FormMessage /></FormItem>
                                        )}/>
                                        <FormField control={form.control} name={`dailyRewardAds.${index}.url`} render={({ field }) => (
                                            <FormItem><FormLabel>URL do Vídeo</FormLabel><FormControl><Input {...field} placeholder="https://exemplo.com/video.mp4" /></FormControl><FormMessage /></FormItem>
                                        )}/>
                                    </div>
                                </Card>
                            ))}
                        </div>

                        {fields.length < 5 && (
                             <Button type="button" variant="outline" size="sm" onClick={() => append({ name: `Anúncio ${fields.length + 1}`, url: '' })}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Vídeo
                            </Button>
                        )}
                        
                        <div className="pt-4 border-t">
                             <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Salvar Configurações
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
