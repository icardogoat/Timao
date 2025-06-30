

'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useState } from "react";
import { cn } from "@/lib/utils"

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
import type { BotConfig } from "@/types";
import { updateBotConfig, getDiscordServerDetails, sendTestDiscordMessage, type DiscordChannel, type DiscordRole } from "@/actions/bot-config-actions";
import { Loader2, Terminal, Check, ChevronsUpDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Separator } from "./ui/separator";


const formSchema = z.object({
  guildId: z.string().min(1, 'O ID do Servidor é obrigatório.'),
  guildInviteUrl: z.string().url({ message: "Por favor, insira um link de convite válido (ex: https://discord.gg/xxxx)" }).optional().or(z.literal('')),
  welcomeChannelId: z.string().optional(),
  logChannelId: z.string().optional(),
  bettingChannelId: z.string().optional(),
  winnersChannelId: z.string().optional(),
  bolaoChannelId: z.string().optional(),
  mvpChannelId: z.string().optional(),
  levelUpChannelId: z.string().optional(),
  eventChannelId: z.string().optional(),
  newsChannelId: z.string().optional(),
  newsMentionRoleId: z.string().optional(),
  adminRoleId: z.string().optional(),
  moderationLogChannelId: z.string().optional(),
  postCreatorRoleId: z.string().optional(),
  vipRoleIds: z.array(z.string()).max(3, { message: "Você pode selecionar no máximo 3 cargos VIP." }).optional(),
  streamViewerRoleId: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface AdminBotConfigClientProps {
    initialConfig: Partial<BotConfig>;
    initialChannels: DiscordChannel[];
    initialRoles: DiscordRole[];
    error?: string | null;
}

export default function AdminBotConfigClient({ initialConfig, initialChannels, initialRoles, error: initialError }: AdminBotConfigClientProps) {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);
    const [isTesting, setIsTesting] = useState<string | null>(null);
    const [channels, setChannels] = useState<DiscordChannel[]>(initialChannels);
    const [roles, setRoles] = useState<DiscordRole[]>(initialRoles);
    const [error, setError] = useState<string | null>(initialError);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            guildId: initialConfig.guildId || "",
            guildInviteUrl: initialConfig.guildInviteUrl || "",
            welcomeChannelId: initialConfig.welcomeChannelId || "",
            logChannelId: initialConfig.logChannelId || "",
            bettingChannelId: initialConfig.bettingChannelId || "",
            winnersChannelId: initialConfig.winnersChannelId || "",
            bolaoChannelId: initialConfig.bolaoChannelId || "",
            mvpChannelId: initialConfig.mvpChannelId || "",
            levelUpChannelId: initialConfig.levelUpChannelId || "",
            eventChannelId: initialConfig.eventChannelId || "",
            newsChannelId: initialConfig.newsChannelId || "",
            newsMentionRoleId: initialConfig.newsMentionRoleId || "",
            adminRoleId: initialConfig.adminRoleId || "",
            moderationLogChannelId: initialConfig.moderationLogChannelId || "",
            postCreatorRoleId: initialConfig.postCreatorRoleId || "",
            vipRoleIds: initialConfig.vipRoleIds || [],
            streamViewerRoleId: initialConfig.streamViewerRoleId || "",
        },
    });

    const guildId = form.watch('guildId');

    const fetchDetails = async (id: string) => {
        if (!id) return;
        setIsLoadingDetails(true);
        setError(null); // Clear previous errors
        setChannels([]);
        setRoles([]);

        // When fetching for a new ID, clear old selections
        form.reset({
            ...form.getValues(),
            guildId: id, // keep the new id
            welcomeChannelId: '',
            logChannelId: '',
            bettingChannelId: '',
            winnersChannelId: '',
            bolaoChannelId: '',
            mvpChannelId: '',
            levelUpChannelId: '',
            eventChannelId: '',
            newsChannelId: '',
            newsMentionRoleId: '',
            adminRoleId: '',
            moderationLogChannelId: '',
            postCreatorRoleId: '',
            vipRoleIds: [],
            streamViewerRoleId: '',
        });

        const result = await getDiscordServerDetails(id);
        if (result.success && result.data) {
            setChannels(result.data.channels);
            setRoles(result.data.roles);
            if (result.data.channels.length > 0 || result.data.roles.length > 0) {
                 toast({
                    title: 'Sucesso!',
                    description: 'Canais e cargos carregados com sucesso.'
                });
            }
        } else {
            setError(result.error || 'Ocorreu um erro desconhecido.');
        }
        setIsLoadingDetails(false);
    };

    const handleTest = async (channelType: 'welcome' | 'log' | 'betting' | 'winners' | 'bolao' | 'mvp' | 'news' | 'levelUp' | 'event' | 'moderationLog') => {
        const channelId = form.getValues(`${channelType}ChannelId` as keyof FormValues);
        if (!channelId) {
            toast({ title: "Nenhum canal selecionado", variant: "destructive" });
            return;
        }

        let payload: { content?: string, embeds?: any[] } = {};
        switch(channelType) {
            case 'welcome': 
                payload = { content: 'Olá! 👋 Esta é uma mensagem de teste do canal de boas-vindas.' }; 
                break;
            case 'log': 
                payload = { content: '```ini\n[LOG TEST] Esta é uma mensagem de teste do canal de logs.\n```' }; 
                break;
            case 'betting': 
                payload = { content: '⚽ Esta é uma mensagem de teste do canal de apostas.' }; 
                break;
            case 'moderationLog':
                payload = {
                    embeds: [{
                        color: 0xef4444, // red-500
                        title: '✅ Teste do Canal de Moderação ✅',
                        description: 'Se você pode ver esta mensagem, os logs de moderação funcionarão corretamente!',
                        footer: { text: 'Teste enviado pelo Painel Admin' },
                        timestamp: new Date().toISOString(),
                    }]
                };
                break;
            case 'winners':
                payload = {
                    embeds: [{
                        color: 0x22c55e, // green-500
                        title: '✅ Teste do Canal de Vencedores ✅',
                        description: 'Se você pode ver esta mensagem, as notificações de vencedores funcionarão corretamente!',
                        footer: { text: 'Teste enviado pelo Painel Admin' },
                        timestamp: new Date().toISOString(),
                    }]
                };
                break;
            case 'bolao':
                payload = {
                    embeds: [{
                        color: 0x2563eb, // blue-600
                        title: '✅ Teste do Canal de Bolão ✅',
                        description: 'Se você pode ver esta mensagem, as notificações de novos bolões funcionarão corretamente!',
                        footer: { text: 'Teste enviado pelo Painel Admin' },
                        timestamp: new Date().toISOString(),
                    }]
                };
                break;
            case 'mvp':
                payload = {
                    embeds: [{
                        color: 0xf97316, // orange-500
                        title: '✅ Teste do Canal de MVP ✅',
                        description: 'Se você pode ver esta mensagem, as notificações de novas votações MVP funcionarão corretamente!',
                        footer: { text: 'Teste enviado pelo Painel Admin' },
                        timestamp: new Date().toISOString(),
                    }]
                };
                break;
            case 'news':
                payload = {
                    embeds: [{
                        color: 0x0ea5e9, // sky-500
                        title: '✅ Teste do Canal de Posts ✅',
                        description: 'Se você pode ver esta mensagem, os novos posts serão publicados aqui!',
                        footer: { text: 'Teste enviado pelo Painel Admin' },
                        timestamp: new Date().toISOString(),
                    }]
                };
                break;
             case 'levelUp':
                payload = {
                    embeds: [{
                        color: 0xFFD700, // yellow
                        title: '🎉 Teste do Canal de Level Up 🎉',
                        description: 'Se você pode ver esta mensagem, as notificações de level up funcionarão corretamente!',
                        footer: { text: 'Teste enviado pelo Painel Admin' },
                        timestamp: new Date().toISOString(),
                    }]
                };
                break;
            case 'event':
                payload = {
                    embeds: [{
                        color: 0x8B5CF6, // violet-500
                        title: '✅ Teste do Canal de Eventos ✅',
                        description: 'Se você pode ver esta mensagem, eventos como o Quiz funcionarão corretamente!',
                        footer: { text: 'Teste enviado pelo Painel Admin' },
                        timestamp: new Date().toISOString(),
                    }]
                };
                break;
        }
        
        setIsTesting(channelType);
        const result = await sendTestDiscordMessage(channelId as string, payload);
        if (result.success) {
            toast({ title: 'Sucesso!', description: result.message });
        } else {
            toast({ title: 'Erro', description: result.message, variant: 'destructive' });
        }
        setIsTesting(null);
    };

    async function onSubmit(values: FormValues) {
        setIsSubmitting(true);
        const result = await updateBotConfig({
            guildId: values.guildId,
            guildInviteUrl: values.guildInviteUrl || '',
            welcomeChannelId: values.welcomeChannelId || '',
            logChannelId: values.logChannelId || '',
            moderationLogChannelId: values.moderationLogChannelId || '',
            bettingChannelId: values.bettingChannelId || '',
            winnersChannelId: values.winnersChannelId || '',
            bolaoChannelId: values.bolaoChannelId || '',
            mvpChannelId: values.mvpChannelId || '',
            levelUpChannelId: values.levelUpChannelId || '',
            eventChannelId: values.eventChannelId || '',
            newsChannelId: values.newsChannelId || '',
            newsMentionRoleId: values.newsMentionRoleId || '',
            adminRoleId: values.adminRoleId || '',
            postCreatorRoleId: values.postCreatorRoleId || '',
            vipRoleIds: values.vipRoleIds || [],
            streamViewerRoleId: values.streamViewerRoleId || '',
        });

        if (result.success) {
            toast({
                title: "Sucesso!",
                description: result.message,
            });
        } else {
            toast({
                title: "Erro",
                description: result.message,
                variant: "destructive",
            });
        }
        setIsSubmitting(false);
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Configuração do Bot do Discord</CardTitle>
                <CardDescription>
                    Gerencie as configurações do seu bot do Discord. Insira o ID do servidor para carregar canais e cargos.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                        <FormField
                            control={form.control}
                            name="guildId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>ID do Servidor (Guild ID)</FormLabel>
                                    <div className="flex gap-2">
                                        <FormControl>
                                            <Input placeholder="Insira o ID do seu servidor Discord" {...field} />
                                        </FormControl>
                                        <Button 
                                            type="button" 
                                            onClick={() => fetchDetails(guildId)} 
                                            disabled={!guildId || isLoadingDetails}
                                        >
                                            {isLoadingDetails ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                            Carregar
                                        </Button>
                                    </div>
                                    <FormDescription>
                                        Após inserir o ID, clique em "Carregar" para buscar os canais e cargos.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        
                        <FormField
                            control={form.control}
                            name="guildInviteUrl"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Link de Convite do Servidor</FormLabel>
                                    <FormControl>
                                        <Input placeholder="https://discord.gg/seu-convite" {...field} />
                                    </FormControl>
                                    <FormDescription>
                                        O link de convite permanente para o seu servidor Discord. Essencial para novos usuários.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        
                        {error && (
                            <Alert variant="destructive">
                                <Terminal className="h-4 w-4" />
                                <AlertTitle>Erro ao Carregar Detalhes</AlertTitle>
                                <AlertDescription>
                                    {error.split('\n').map((line, i) => <p key={i}>{line}</p>)}
                                </AlertDescription>
                            </Alert>
                        )}

                        {(guildId && !isLoadingDetails && !error && channels.length === 0 && roles.length === 0) && (
                            <Alert>
                                <Terminal className="h-4 w-4" />
                                <AlertTitle>Nenhum Canal ou Cargo Encontrado</AlertTitle>
                                <AlertDescription>
                                    Verifique se o ID do servidor está correto, se o bot foi adicionado ao servidor e se ele possui as permissões necessárias para visualizar canais e cargos.
                                </AlertDescription>
                            </Alert>
                        )}

                        <Separator />
                        <h3 className="text-lg font-medium">Canais de Notificação</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                            <FormField
                                control={form.control}
                                name="welcomeChannelId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Canal de Boas-Vindas</FormLabel>
                                        <div className="flex items-center gap-2">
                                            <Select onValueChange={field.onChange} value={field.value} disabled={channels.length === 0}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Selecione um canal" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {channels.map(channel => (
                                                        <SelectItem key={channel.id} value={channel.id}>
                                                            #{channel.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <Button 
                                                type="button" 
                                                variant="outline" 
                                                onClick={() => handleTest('welcome')}
                                                disabled={!field.value || isTesting !== null}
                                                aria-label="Testar canal de boas-vindas"
                                            >
                                                {isTesting === 'welcome' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Testar'}
                                            </Button>
                                        </div>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="logChannelId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Canal de Logs Gerais</FormLabel>
                                        <div className="flex items-center gap-2">
                                            <Select onValueChange={field.onChange} value={field.value} disabled={channels.length === 0}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Selecione um canal" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {channels.map(channel => (
                                                        <SelectItem key={channel.id} value={channel.id}>
                                                            #{channel.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <Button 
                                                type="button" 
                                                variant="outline" 
                                                onClick={() => handleTest('log')}
                                                disabled={!field.value || isTesting !== null}
                                                aria-label="Testar canal de logs"
                                            >
                                                {isTesting === 'log' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Testar'}
                                            </Button>
                                        </div>
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="moderationLogChannelId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Canal de Logs de Moderação</FormLabel>
                                        <div className="flex items-center gap-2">
                                            <Select onValueChange={field.onChange} value={field.value} disabled={channels.length === 0}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Selecione um canal" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {channels.map(channel => (
                                                        <SelectItem key={channel.id} value={channel.id}>
                                                            #{channel.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <Button 
                                                type="button" 
                                                variant="outline" 
                                                onClick={() => handleTest('moderationLog')}
                                                disabled={!field.value || isTesting !== null}
                                                aria-label="Testar canal de logs de moderação"
                                            >
                                                {isTesting === 'moderationLog' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Testar'}
                                            </Button>
                                        </div>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="bettingChannelId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Canal de Apostas</FormLabel>
                                        <div className="flex items-center gap-2">
                                            <Select onValueChange={field.onChange} value={field.value} disabled={channels.length === 0}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Selecione um canal" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {channels.map(channel => (
                                                        <SelectItem key={channel.id} value={channel.id}>
                                                            #{channel.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <Button 
                                                type="button" 
                                                variant="outline" 
                                                onClick={() => handleTest('betting')}
                                                disabled={!field.value || isTesting !== null}
                                                aria-label="Testar canal de apostas"
                                            >
                                                {isTesting === 'betting' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Testar'}
                                            </Button>
                                        </div>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="bolaoChannelId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Canal do Bolão</FormLabel>
                                        <div className="flex items-center gap-2">
                                            <Select onValueChange={field.onChange} value={field.value} disabled={channels.length === 0}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Selecione um canal" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {channels.map(channel => (
                                                        <SelectItem key={channel.id} value={channel.id}>
                                                            #{channel.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <Button 
                                                type="button" 
                                                variant="outline" 
                                                onClick={() => handleTest('bolao')}
                                                disabled={!field.value || isTesting !== null}
                                                aria-label="Testar canal do bolão"
                                            >
                                                {isTesting === 'bolao' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Testar'}
                                            </Button>
                                        </div>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="mvpChannelId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Canal de Votação MVP</FormLabel>
                                        <div className="flex items-center gap-2">
                                            <Select onValueChange={field.onChange} value={field.value} disabled={channels.length === 0}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Selecione um canal" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {channels.map(channel => (
                                                        <SelectItem key={channel.id} value={channel.id}>
                                                            #{channel.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <Button 
                                                type="button" 
                                                variant="outline" 
                                                onClick={() => handleTest('mvp')}
                                                disabled={!field.value || isTesting !== null}
                                                aria-label="Testar canal de votação MVP"
                                            >
                                                {isTesting === 'mvp' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Testar'}
                                            </Button>
                                        </div>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="newsChannelId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Canal de Posts</FormLabel>
                                        <div className="flex items-center gap-2">
                                            <Select onValueChange={field.onChange} value={field.value} disabled={channels.length === 0}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Selecione um canal" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {channels.map(channel => (
                                                        <SelectItem key={channel.id} value={channel.id}>
                                                            #{channel.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <Button 
                                                type="button" 
                                                variant="outline" 
                                                onClick={() => handleTest('news')}
                                                disabled={!field.value || isTesting !== null}
                                                aria-label="Testar canal de posts"
                                            >
                                                {isTesting === 'news' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Testar'}
                                            </Button>
                                        </div>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="winnersChannelId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Canal de Vencedores</FormLabel>
                                        <div className="flex items-center gap-2">
                                            <Select onValueChange={field.onChange} value={field.value} disabled={channels.length === 0}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Selecione um canal" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {channels.map(channel => (
                                                        <SelectItem key={channel.id} value={channel.id}>
                                                            #{channel.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <Button 
                                                type="button" 
                                                variant="outline" 
                                                onClick={() => handleTest('winners')}
                                                disabled={!field.value || isTesting !== null}
                                                aria-label="Testar canal de vencedores"
                                            >
                                                {isTesting === 'winners' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Testar'}
                                            </Button>
                                        </div>
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="levelUpChannelId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Canal de Level Up</FormLabel>
                                        <div className="flex items-center gap-2">
                                            <Select onValueChange={field.onChange} value={field.value} disabled={channels.length === 0}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Selecione um canal" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {channels.map(channel => (
                                                        <SelectItem key={channel.id} value={channel.id}>
                                                            #{channel.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <Button 
                                                type="button" 
                                                variant="outline" 
                                                onClick={() => handleTest('levelUp')}
                                                disabled={!field.value || isTesting !== null}
                                                aria-label="Testar canal de level up"
                                            >
                                                {isTesting === 'levelUp' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Testar'}
                                            </Button>
                                        </div>
                                         <FormDescription>
                                            Canal onde as mensagens de level up serão enviadas. Se não for definido, será enviado no canal onde o usuário ganhou o XP.
                                        </FormDescription>
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="eventChannelId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Canal de Eventos (Quiz)</FormLabel>
                                        <div className="flex items-center gap-2">
                                            <Select onValueChange={field.onChange} value={field.value} disabled={channels.length === 0}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Selecione um canal" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {channels.map(channel => (
                                                        <SelectItem key={channel.id} value={channel.id}>
                                                            #{channel.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <Button 
                                                type="button" 
                                                variant="outline" 
                                                onClick={() => handleTest('event')}
                                                disabled={!field.value || isTesting !== null}
                                                aria-label="Testar canal de eventos"
                                            >
                                                {isTesting === 'event' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Testar'}
                                            </Button>
                                        </div>
                                         <FormDescription>
                                            Canal onde os eventos como o Quiz do Timão serão iniciados.
                                        </FormDescription>
                                    </FormItem>
                                )}
                            />
                        </div>
                        
                        <Separator />
                        <h3 className="text-lg font-medium">Cargos de Permissão</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                             <FormField
                                control={form.control}
                                name="adminRoleId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Cargo de Administrador</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value} disabled={roles.length === 0}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione um cargo" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {roles.map(role => (
                                                    <SelectItem key={role.id} value={role.id}>
                                                        {role.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormDescription>
                                            O cargo que tem permissão para usar comandos de admin do bot.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="postCreatorRoleId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Cargo Criador de Posts</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value} disabled={roles.length === 0}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione um cargo (opcional)" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {roles.map(role => (
                                                    <SelectItem key={role.id} value={role.id}>
                                                        {role.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormDescription>
                                            Membros com este cargo poderão criar/gerenciar posts no painel de admin.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="newsMentionRoleId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Cargo de Marcação para Posts</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value} disabled={roles.length === 0}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione um cargo (opcional)" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {roles.map(role => (
                                                    <SelectItem key={role.id} value={role.id}>
                                                        {role.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormDescription>
                                            Este cargo será mencionado (@) sempre que um novo post for criado.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="streamViewerRoleId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Cargo para Ver Transmissão</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value} disabled={roles.length === 0}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione um cargo (opcional)" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {roles.map(role => (
                                                    <SelectItem key={role.id} value={role.id}>
                                                        {role.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormDescription>
                                            Membros com este cargo (e admins) poderão ver a página de transmissão.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="vipRoleIds"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Cargos VIP</FormLabel>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button
                                                        variant="outline"
                                                        role="combobox"
                                                        className={cn(
                                                            "w-full justify-between h-auto min-h-10",
                                                            !field.value?.length && "text-muted-foreground"
                                                        )}
                                                        disabled={roles.length === 0}
                                                    >
                                                        <div className="flex gap-1 flex-wrap">
                                                            {field.value?.length ?
                                                            roles
                                                                .filter(role => field.value?.includes(role.id))
                                                                .map(role => <Badge variant="secondary" key={role.id}>{role.name}</Badge>)
                                                            : "Selecione até 3 cargos"
                                                            }
                                                        </div>
                                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                                <Command>
                                                    <CommandInput placeholder="Pesquisar cargo..." />
                                                    <CommandList>
                                                        <CommandEmpty>Nenhum cargo encontrado.</CommandEmpty>
                                                        <CommandGroup>
                                                            {roles.map((role) => {
                                                                const isSelected = field.value?.includes(role.id) ?? false;
                                                                return (
                                                                    <CommandItem
                                                                        key={role.id}
                                                                        onSelect={() => {
                                                                            if (isSelected) {
                                                                                field.onChange(field.value?.filter((id) => id !== role.id));
                                                                            } else {
                                                                                if ((field.value?.length ?? 0) < 3) {
                                                                                    field.onChange([...(field.value ?? []), role.id]);
                                                                                }
                                                                            }
                                                                        }}
                                                                    >
                                                                        <Check
                                                                            className={cn(
                                                                                "mr-2 h-4 w-4",
                                                                                isSelected ? "opacity-100" : "opacity-0"
                                                                            )}
                                                                        />
                                                                        {role.name}
                                                                    </CommandItem>
                                                                );
                                                            })}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                        <FormDescription>
                                            Selecione até 3 cargos que darão status VIP aos usuários.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Salvar Configurações
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
