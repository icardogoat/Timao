
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { submitUserAdvertisement } from '@/actions/user-ad-actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Wallet } from 'lucide-react';

const formSchema = z.object({
  title: z.string().min(3, 'O título é muito curto.').max(50, 'O título é muito longo.'),
  description: z.string().min(10, 'A descrição é muito curta.').max(100, 'A descrição é muito longa.'),
  imageUrl: z.string().url('Por favor, insira uma URL de imagem válida (ex: https://i.imgur.com/your-image.png).'),
  linkUrl: z.string().url('Por favor, insira uma URL de link válida.'),
});

interface AdvertiseClientProps {
    adPrice: number;
    userBalance: number;
}

export function AdvertiseClient({ adPrice, userBalance }: AdvertiseClientProps) {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: '',
            description: '',
            imageUrl: '',
            linkUrl: '',
        },
    });

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        setIsSubmitting(true);
        const result = await submitUserAdvertisement(values);
        if (result.success) {
            toast({ title: 'Sucesso!', description: result.message });
            form.reset();
        } else {
            toast({ title: 'Erro', description: result.message, variant: 'destructive' });
        }
        setIsSubmitting(false);
    };
    
    const canAfford = userBalance >= adPrice;
    
    return (
         <div className="flex-1 p-4 sm:p-6 lg:p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold font-headline tracking-tight">Anuncie Conosco</h1>
                <p className="text-muted-foreground">Promova seu projeto para a comunidade FielBet.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Criar Novo Anúncio</CardTitle>
                            <CardDescription>Preencha o formulário abaixo. Seu anúncio será revisado e, se aprovado, ficará ativo por 7 dias.</CardDescription>
                        </CardHeader>
                         <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)}>
                                <CardContent className="space-y-4">
                                     <FormField control={form.control} name="title" render={({ field }) => (
                                        <FormItem><FormLabel>Título do Anúncio</FormLabel><FormControl><Input {...field} maxLength={50} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                     <FormField control={form.control} name="description" render={({ field }) => (
                                        <FormItem><FormLabel>Descrição Curta</FormLabel><FormControl><Textarea {...field} maxLength={100} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                    <FormField control={form.control} name="imageUrl" render={({ field }) => (
                                        <FormItem><FormLabel>URL da Imagem</FormLabel><FormControl><Input {...field} placeholder="https://..." /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                    <FormField control={form.control} name="linkUrl" render={({ field }) => (
                                        <FormItem><FormLabel>URL do Link (para onde o anúncio vai direcionar)</FormLabel><FormControl><Input {...field} placeholder="https://..." /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                </CardContent>
                                <CardFooter>
                                    <Button type="submit" disabled={isSubmitting || !canAfford}>
                                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        {canAfford ? `Enviar para Revisão (Custo: R$ ${adPrice.toFixed(2)})` : 'Saldo Insuficiente'}
                                    </Button>
                                </CardFooter>
                            </form>
                        </Form>
                    </Card>
                </div>
                <div className="md:col-span-1 space-y-4">
                     <Card>
                        <CardHeader className="flex-row items-center justify-between pb-2">
                             <CardTitle className="text-sm font-medium">Seu Saldo</CardTitle>
                             <Wallet className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">R$ {userBalance.toFixed(2)}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                             <CardTitle>Regras para Anunciantes</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground space-y-2">
                            <p>• Todos os anúncios são revisados.</p>
                            <p>• Proibido conteúdo ilegal ou adulto.</p>
                            <p>• A imagem deve ter boa qualidade.</p>
                            <p>• O link não pode ser malicioso.</p>
                            <p>• Reservamo-nos o direito de rejeitar qualquer anúncio.</p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
