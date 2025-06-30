
'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import * as z from "zod";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import type { ApiSettings, SiteSettings } from "@/types";
import { updateApiSettings, updateGeneralSiteSettings, updateBetaVipSettings } from "@/actions/settings-actions";
import { Loader2, PlusCircle, RefreshCw, Trash2, ShieldCheck, HelpCircle } from "lucide-react";
import { Switch } from "./ui/switch";
import { Textarea } from "./ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { Separator } from "./ui/separator";

const apiFormSchema = z.object({
  siteUrl: z.string().url({ message: "Por favor, insira uma URL válida." }).optional().or(z.literal('')),
  updateApiKeys: z.array(z.object({ key: z.string() })).max(15, { message: "Você pode adicionar no máximo 15 chaves de API." }).optional(),
  paymentApiKeys: z.array(z.object({ key: z.string() })).max(15, { message: "Você pode adicionar no máximo 15 chaves de API." }).optional(),
});

const siteSettingsFormSchema = z.object({
    maintenanceMode: z.boolean().default(false),
    maintenanceMessage: z.string().min(10, 'A mensagem deve ter pelo menos 10 caracteres.').max(200, 'A mensagem é muito longa.'),
    maintenanceExpectedReturn: z.string().max(50, 'O texto é muito longo.').optional(),
});

const betaVipFormSchema = z.object({
    betaVipMode: z.boolean().default(false),
});

type ApiFormValues = z.infer<typeof apiFormSchema>;
type SiteSettingsFormValues = z.infer<typeof siteSettingsFormSchema>;
type BetaVipFormValues = z.infer<typeof betaVipFormSchema>;

interface AdminSettingsClientProps {
    initialApiSettings: Partial<ApiSettings>;
    initialSiteSettings: SiteSettings;
}

export default function AdminSettingsClient({ initialApiSettings, initialSiteSettings }: AdminSettingsClientProps) {
    const { toast } = useToast();
    const [isApiSubmitting, setIsApiSubmitting] = useState(false);
    const [isSiteSettingsSubmitting, setIsSiteSettingsSubmitting] = useState(false);
    const [isBetaVipSubmitting, setIsBetaVipSubmitting] = useState(false);

    const apiForm = useForm<ApiFormValues>({
        resolver: zodResolver(apiFormSchema),
        defaultValues: {
            siteUrl: initialApiSettings.siteUrl || "",
            updateApiKeys: initialApiSettings.updateApiKeys?.map(k => ({ key: k.key })) || [{ key: '' }],
            paymentApiKeys: initialApiSettings.paymentApiKeys?.map(k => ({ key: k.key })) || [{ key: '' }],
        },
    });

    const { fields: updateApiFields, append: appendUpdateApi, remove: removeUpdateApi } = useFieldArray({
        control: apiForm.control, name: "updateApiKeys"
    });
    const { fields: paymentApiFields, append: appendPaymentApi, remove: removePaymentApi } = useFieldArray({
        control: apiForm.control, name: "paymentApiKeys"
    });
    
    const siteSettingsForm = useForm<SiteSettingsFormValues>({
        resolver: zodResolver(siteSettingsFormSchema),
        defaultValues: {
            maintenanceMode: initialSiteSettings.maintenanceMode,
            maintenanceMessage: initialSiteSettings.maintenanceMessage,
            maintenanceExpectedReturn: initialSiteSettings.maintenanceExpectedReturn || '',
        }
    });

    const betaVipForm = useForm<BetaVipFormValues>({
        resolver: zodResolver(betaVipFormSchema),
        defaultValues: {
            betaVipMode: initialSiteSettings.betaVipMode,
        }
    });

    async function onApiSubmit(values: ApiFormValues) {
        setIsApiSubmitting(true);
        const dataToSubmit = {
            ...values,
            updateApiKeys: values.updateApiKeys?.filter(k => k.key.trim() !== '') || [],
            paymentApiKeys: values.paymentApiKeys?.filter(k => k.key.trim() !== '') || [],
        };
        const result = await updateApiSettings(dataToSubmit);

        if (result.success) {
            toast({ title: "Sucesso!", description: result.message });
        } else {
            toast({ title: "Erro", description: result.message, variant: "destructive" });
        }
        setIsApiSubmitting(false);
    }
    
    async function onSiteSettingsSubmit(values: SiteSettingsFormValues) {
        setIsSiteSettingsSubmitting(true);
        const result = await updateGeneralSiteSettings(values);
        
         if (result.success) {
            toast({ title: "Sucesso!", description: result.message });
        } else {
            toast({ title: "Erro", description: result.message, variant: "destructive" });
        }
        setIsSiteSettingsSubmitting(false);
    }

    async function onBetaVipSubmit(values: BetaVipFormValues) {
        setIsBetaVipSubmitting(true);
        const result = await updateBetaVipSettings(values);
        
        if (result.success) {
            toast({ title: "Sucesso!", description: result.message });
        } else {
            toast({ title: "Erro", description: result.message, variant: "destructive" });
        }
        setIsBetaVipSubmitting(false);
    }

    const renderApiKeySection = (
        fieldArray: any,
        removeFn: (index: number) => void,
        appendFn: () => void,
        fieldName: "updateApiKeys" | "paymentApiKeys",
        allKeys: any[],
        title: string,
        description: string,
        initialData: any[] | undefined
    ) => (
         <div className="space-y-4 rounded-lg border p-4">
            <div className="flex items-center gap-2">
                <FormLabel className="text-base">{title}</FormLabel>
                 <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{description}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
            {fieldArray.map((field: { id: string }, index: number) => {
                const currentKeyData = initialData?.find(k => k.key === apiForm.watch(`${fieldName}.${index}.key`));
                return (
                <FormField
                    control={apiForm.control}
                    key={field.id}
                    name={`${fieldName}.${index}.key`}
                    render={({ field: renderField }) => (
                        <FormItem>
                            <FormLabel className="sr-only">Chave {index+1}</FormLabel>
                            <div className="flex items-center gap-2">
                                <FormControl>
                                    <Input type="password" placeholder={`Chave da API ${index + 1}`} {...renderField} />
                                </FormControl>
                                <div className="p-2 border rounded-md bg-muted text-muted-foreground text-sm font-mono whitespace-nowrap">
                                    {currentKeyData?.usage ?? 0} / 90
                                </div>
                                <Button type="button" variant="destructive" size="icon" onClick={() => removeFn(index)} disabled={allKeys.length <= 1}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            )})}
            {allKeys.length < 15 && (
                <Button type="button" variant="outline" size="sm" className="mt-2" onClick={appendFn}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Chave
                </Button>
            )}
            <FormMessage>{apiForm.formState.errors[fieldName]?.message}</FormMessage>
        </div>
    );

    return (
        <div className="grid gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Modo Beta VIP</CardTitle>
                    <CardDescription>
                       Quando ativado, apenas usuários VIP e administradores podem acessar o site.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...betaVipForm}>
                        <form onSubmit={betaVipForm.handleSubmit(onBetaVipSubmit)} className="space-y-4">
                             <FormField
                                control={betaVipForm.control}
                                name="betaVipMode"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                        <div className="space-y-0.5">
                                            <FormLabel className="text-base">Ativar Modo Beta VIP</FormLabel>
                                            <FormDescription>Restringir o acesso apenas a VIPs.</FormDescription>
                                        </div>
                                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                    </FormItem>
                                )}
                            />
                            <Button type="submit" disabled={isBetaVipSubmitting}>
                                {isBetaVipSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Salvar Modo Beta
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Manutenção do Site</CardTitle>
                    <CardDescription>
                        Ative o modo de manutenção para bloquear o acesso ao site, exceto para o painel de administração.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...siteSettingsForm}>
                        <form onSubmit={siteSettingsForm.handleSubmit(onSiteSettingsSubmit)} className="space-y-8">
                            <FormField
                                control={siteSettingsForm.control}
                                name="maintenanceMode"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                        <div className="space-y-0.5">
                                            <FormLabel className="text-base">Ativar Modo de Manutenção</FormLabel>
                                            <FormDescription>Quando ativado, apenas administradores podem acessar o site.</FormDescription>
                                        </div>
                                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={siteSettingsForm.control}
                                name="maintenanceMessage"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Mensagem de Manutenção</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="Ex: Estamos realizando uma atualização importante..." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={siteSettingsForm.control}
                                name="maintenanceExpectedReturn"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Horário Previsto para Retorno (Opcional)</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Ex: 14:00h" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <Button type="submit" disabled={isSiteSettingsSubmitting}>
                                {isSiteSettingsSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Salvar Configurações Gerais
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader>
                    <CardTitle>Configurações de API</CardTitle>
                    <CardDescription>
                        Gerencie configurações globais do site e chaves de API.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...apiForm}>
                        <form onSubmit={apiForm.handleSubmit(onApiSubmit)} className="space-y-8">
                            <FormField
                                control={apiForm.control}
                                name="siteUrl"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>URL do Site</FormLabel>
                                        <FormControl>
                                            <Input placeholder="https://seudominio.com" {...field} />
                                        </FormControl>
                                        <FormDescription>
                                            A URL base do seu site, usada para gerar links em notificações.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            
                            <Separator />

                            <div className="grid md:grid-cols-2 gap-6">
                               {renderApiKeySection(
                                    updateApiFields,
                                    removeUpdateApi,
                                    () => appendUpdateApi({ key: '' }),
                                    "updateApiKeys",
                                    apiForm.watch('updateApiKeys') || [],
                                    "Chaves de Atualização",
                                    "Usadas pelos cron jobs para buscar novas partidas e odds.",
                                    initialApiSettings.updateApiKeys
                                )}

                                {renderApiKeySection(
                                    paymentApiFields,
                                    removePaymentApi,
                                    () => appendPaymentApi({ key: '' }),
                                    "paymentApiKeys",
                                    apiForm.watch('paymentApiKeys') || [],
                                    "Chaves de Pagamento/Resolução",
                                    "Usadas para ações críticas como resolver partidas e criar votações MVP.",
                                    initialApiSettings.paymentApiKeys
                                )}
                            </div>
                            
                            <Button type="submit" disabled={isApiSubmitting}>
                                {isApiSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Salvar Configurações de API
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}
