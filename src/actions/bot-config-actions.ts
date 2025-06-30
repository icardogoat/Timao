

'use server';

import clientPromise from '@/lib/mongodb';
import type { BotConfig } from '@/types';
import { ObjectId } from 'mongodb';
import { revalidatePath } from 'next/cache';

const CONFIG_ID = '669fdb5a907548817b848c48';

export async function getBotConfig(): Promise<Partial<BotConfig>> {
    try {
        const client = await clientPromise;
        const db = client.db('timaocord_bot');
        const configCollection = db.collection('config');

        const config = await configCollection.findOne({ _id: new ObjectId(CONFIG_ID) });

        if (!config) {
            return {
                guildId: '',
                guildInviteUrl: '',
                welcomeChannelId: '',
                logChannelId: '',
                bettingChannelId: '',
                winnersChannelId: '',
                bolaoChannelId: '',
                mvpChannelId: '',
                levelUpChannelId: '',
                eventChannelId: '',
                forcaChannelId: '',
                newsChannelId: '',
                newsMentionRoleId: '',
                adminRoleId: '',
                moderationLogChannelId: '',
                vipRoleIds: [],
                postCreatorRoleId: '',
                streamViewerRoleId: '',
                playerGameSchedule: [],
                forcaSchedule: [],
            };
        }

        return {
            _id: config._id.toString(),
            guildId: config.guildId || '',
            guildInviteUrl: config.guildInviteUrl || '',
            welcomeChannelId: config.welcomeChannelId || '',
            logChannelId: config.logChannelId || '',
            bettingChannelId: config.bettingChannelId || '',
            winnersChannelId: config.winnersChannelId || '',
            bolaoChannelId: config.bolaoChannelId || '',
            mvpChannelId: config.mvpChannelId || '',
            levelUpChannelId: config.levelUpChannelId || '',
            eventChannelId: config.eventChannelId || '',
            forcaChannelId: config.forcaChannelId || '',
            newsChannelId: config.newsChannelId || '',
            newsMentionRoleId: config.newsMentionRoleId || '',
            adminRoleId: config.adminRoleId || '',
            moderationLogChannelId: config.moderationLogChannelId || '',
            vipRoleIds: config.vipRoleIds || [],
            postCreatorRoleId: config.postCreatorRoleId || '',
            streamViewerRoleId: config.streamViewerRoleId || '',
            playerGameSchedule: config.playerGameSchedule || [],
            forcaSchedule: config.forcaSchedule || [],
            playerGameLastScheduledTriggers: config.playerGameLastScheduledTriggers || {},
            forcaLastScheduledTriggers: config.forcaLastScheduledTriggers || {},
        };
    } catch (error) {
        console.error("Error fetching bot config:", error);
        return {
            guildId: '',
            guildInviteUrl: '',
            welcomeChannelId: '',
            logChannelId: '',
            bettingChannelId: '',
            winnersChannelId: '',
            bolaoChannelId: '',
            mvpChannelId: '',
            levelUpChannelId: '',
            eventChannelId: '',
            forcaChannelId: '',
            newsChannelId: '',
            newsMentionRoleId: '',
            adminRoleId: '',
            moderationLogChannelId: '',
            vipRoleIds: [],
            postCreatorRoleId: '',
            streamViewerRoleId: '',
            playerGameSchedule: [],
            forcaSchedule: [],
        };
    }
}

type UpdateConfigData = {
    guildId: string;
    guildInviteUrl: string;
    welcomeChannelId: string;
    logChannelId: string;
    bettingChannelId: string;
    winnersChannelId: string;
    bolaoChannelId: string;
    mvpChannelId: string;
    levelUpChannelId: string;
    eventChannelId: string;
    newsChannelId: string;
    newsMentionRoleId: string;
    adminRoleId: string;
    moderationLogChannelId: string;
    postCreatorRoleId: string;
    vipRoleIds: string[];
    streamViewerRoleId: string;
};

export async function updateBotConfig(data: UpdateConfigData): Promise<{ success: boolean; message: string }> {
    try {
        const client = await clientPromise;
        const db = client.db('timaocord_bot');
        const configCollection = db.collection('config');

        await configCollection.updateOne(
            { _id: new ObjectId(CONFIG_ID) },
            { $set: data },
            { upsert: true }
        );

        revalidatePath('/admin/bot');
        return { success: true, message: 'Configuração do bot salva com sucesso!' };
    } catch (error) {
        console.error("Error updating bot config:", error);
        return { success: false, message: 'Falha ao salvar a configuração do bot.' };
    }
}

export async function updatePlayerGameSchedule(schedule: string[]): Promise<{ success: boolean; message: string }> {
    try {
        const client = await clientPromise;
        const db = client.db('timaocord_bot');
        const configCollection = db.collection('config');

        await configCollection.updateOne(
            { _id: new ObjectId(CONFIG_ID) },
            { $set: { playerGameSchedule: schedule } },
            { upsert: true }
        );

        revalidatePath('/admin/player-game');
        return { success: true, message: 'Agenda de jogos salva com sucesso!' };
    } catch (error) {
        console.error("Error updating player game schedule:", error);
        return { success: false, message: 'Falha ao salvar a agenda.' };
    }
}

export async function updateForcaSettings(data: { schedule: string[], channelId: string }): Promise<{ success: boolean; message: string }> {
    try {
        const client = await clientPromise;
        const db = client.db('timaocord_bot');
        const configCollection = db.collection('config');

        await configCollection.updateOne(
            { _id: new ObjectId(CONFIG_ID) },
            { $set: { forcaSchedule: data.schedule, forcaChannelId: data.channelId } },
            { upsert: true }
        );

        revalidatePath('/admin/forca');
        return { success: true, message: 'Configurações da Forca salvas com sucesso!' };
    } catch (error) {
        console.error("Error updating forca settings:", error);
        return { success: false, message: 'Falha ao salvar as configurações da Forca.' };
    }
}


export type DiscordChannel = {
    id: string;
    name: string;
    type: number;
};

export type DiscordRole = {
    id: string;
    name: string;
};

export async function getDiscordServerDetails(guildId: string): Promise<{ success: boolean, data?: { channels: DiscordChannel[]; roles: DiscordRole[] }, error?: string }> {
    const botToken = process.env.DISCORD_BOT_TOKEN;

    if (!botToken || botToken === 'YOUR_BOT_TOKEN_HERE') {
        const errorMessage = 'Token do bot do Discord não configurado no servidor.';
        console.error(errorMessage);
        return { success: false, error: errorMessage };
    }
    if (!guildId) {
        return { success: true, data: { channels: [], roles: [] } };
    }

    const headers = { 'Authorization': `Bot ${botToken}` };

    try {
        const [channelsRes, rolesRes] = await Promise.all([
            fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, { headers, cache: 'no-store' }),
            fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, { headers, cache: 'no-store' })
        ]);

        if (!channelsRes.ok) {
            const errorData = await channelsRes.json();
            console.error(`Falha ao buscar canais: ${channelsRes.statusText}`, errorData);
             if (channelsRes.status === 403) {
                 return { success: false, error: `Acesso Negado (403 Forbidden). Verifique se o bot tem as permissões corretas no servidor e se as 'Privileged Gateway Intents' (como Server Members e Message Content) estão ativadas no Portal de Desenvolvedores do Discord.` };
            }
            return { success: false, error: `Falha ao buscar canais: ${errorData.message || channelsRes.statusText}. Verifique o ID do Servidor e as permissões do bot.` };
        }
        if (!rolesRes.ok) {
            const errorData = await rolesRes.json();
            console.error(`Falha ao buscar cargos: ${rolesRes.statusText}`, errorData);
            if (rolesRes.status === 403) {
                return { success: false, error: `Acesso Negado (403 Forbidden) ao buscar cargos. Verifique as permissões do bot e as 'Privileged Gateway Intents' no Portal de Desenvolvedores do Discord.` };
            }
            return { success: false, error: `Falha ao buscar cargos: ${errorData.message || rolesRes.statusText}.` };
        }

        const channels: DiscordChannel[] = await channelsRes.json();
        const roles: DiscordRole[] = await rolesRes.json();

        const textChannels = channels
            .filter(c => c.type === 0)
            .map(c => ({ id: c.id, name: c.name, type: c.type }))
            .sort((a, b) => a.name.localeCompare(b.name));
            
        const sortedRoles = roles
            .filter(r => r.id !== guildId) 
            .map(r => ({ id: r.id, name: r.name }))
            .sort((a, b) => a.name.localeCompare(b.name));

        return { success: true, data: { channels: textChannels, roles: sortedRoles } };

    } catch (error) {
        console.error("Erro ao buscar detalhes do servidor Discord:", error);
        return { success: false, error: (error instanceof Error) ? error.message : 'Ocorreu um erro desconhecido.' };
    }
}

export type GuildDetails = {
    id: string;
    name: string;
    iconUrl: string | null;
    memberCount: number;
    onlineCount: number;
    boostTier: number;
    boostCount: number;
    createdAt: string;
};

export async function getGuildDetails(guildId: string): Promise<{ success: boolean, data?: GuildDetails, error?: string }> {
    const botToken = process.env.DISCORD_BOT_TOKEN;

    if (!botToken || botToken === 'YOUR_BOT_TOKEN_HERE') {
        const errorMessage = 'Token do bot do Discord não configurado no servidor.';
        console.error(errorMessage);
        return { success: false, error: errorMessage };
    }
    if (!guildId) {
        return { success: false, error: 'ID do Servidor não fornecido.' };
    }

    try {
        const guildRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}?with_counts=true`, {
            headers: { 'Authorization': `Bot ${botToken}` },
            cache: 'no-store'
        });

        if (!guildRes.ok) {
            const errorData = await guildRes.json();
            console.error(`Falha ao buscar detalhes do servidor: ${guildRes.statusText}`, errorData);
            return { success: false, error: `Falha ao buscar detalhes do servidor: ${errorData.message || guildRes.statusText}. Verifique o ID do Servidor e as permissões do bot.` };
        }
        
        const guildData = await guildRes.json();
        
        const details: GuildDetails = {
            id: guildData.id,
            name: guildData.name,
            iconUrl: guildData.icon ? `https://cdn.discordapp.com/icons/${guildData.id}/${guildData.icon}.png` : null,
            memberCount: guildData.approximate_member_count || 0,
            onlineCount: guildData.approximate_presence_count || 0,
            boostTier: guildData.premium_tier,
            boostCount: guildData.premium_subscription_count || 0,
            createdAt: new Date(parseInt((BigInt(guildData.id) >> 22n).toString()) + 1420070400000).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }),
        };

        return { success: true, data: details };

    } catch (error) {
        console.error("Erro ao buscar detalhes do servidor Discord:", error);
        return { success: false, error: (error instanceof Error) ? error.message : 'Ocorreu um erro desconhecido.' };
    }
}

export type RoleWithMemberCount = {
    id: string;
    name: string;
    memberCount: number;
    color: number;
};

export async function getRoleMemberCounts(guildId: string): Promise<{ success: boolean, data?: RoleWithMemberCount[], error?: string }> {
    const botToken = process.env.DISCORD_BOT_TOKEN;

    if (!botToken || botToken === 'YOUR_BOT_TOKEN_HERE') {
        const errorMessage = 'Token do bot do Discord não configurado no servidor.';
        console.error(errorMessage);
        return { success: false, error: errorMessage };
    }
     if (!guildId) {
        return { success: false, error: 'ID do Servidor não fornecido.' };
    }

    const headers = { 'Authorization': `Bot ${botToken}` };

    try {
        // 1. Fetch all roles
        const rolesRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, { headers, cache: 'no-store' });
        if (!rolesRes.ok) {
            const errorData = await rolesRes.json();
            return { success: false, error: `Falha ao buscar cargos: ${errorData.message || rolesRes.statusText}.` };
        }
        const roles: { id: string; name: string; color: number; position: number }[] = await rolesRes.json();

        // Initialize member counts
        const roleCounts = new Map<string, number>(roles.map(r => [r.id, 0]));

        // 2. Fetch all members (paginated)
        let lastMemberId = '0';
        let hasMoreMembers = true;
        while (hasMoreMembers) {
            const membersRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members?limit=1000&after=${lastMemberId}`, { headers, cache: 'no-store' });
            
            if (!membersRes.ok) {
                const errorData = await membersRes.json();
                if (errorData.code === 50001) {
                     return { success: false, error: "Acesso Negado: O bot precisa da 'Server Members Intent' ativada no Portal de Desenvolvedores do Discord para ler os dados dos membros." };
                }
                return { success: false, error: `Falha ao buscar membros: ${errorData.message || membersRes.statusText}.` };
            }
            const members: { user: { id: string }; roles: string[] }[] = await membersRes.json();
            
            if (members.length === 0) {
                hasMoreMembers = false;
            } else {
                lastMemberId = members[members.length - 1].user.id;
                for (const member of members) {
                    for (const roleId of member.roles) {
                        if (roleCounts.has(roleId)) {
                            roleCounts.set(roleId, roleCounts.get(roleId)! + 1);
                        }
                    }
                }
            }
        }
        
        // 3. Combine roles with member counts
        const rolesWithCounts = roles
            .filter(role => role.name !== '@everyone') // Filter out @everyone role
            .map(role => ({
                id: role.id,
                name: role.name,
                color: role.color,
                memberCount: roleCounts.get(role.id) || 0,
                position: role.position,
            }))
            .sort((a, b) => b.position - a.position);

        const finalRoles: RoleWithMemberCount[] = rolesWithCounts.map(({ position, ...rest }) => rest);

        return { success: true, data: finalRoles };

    } catch (error) {
        console.error("Erro ao buscar contagem de membros por cargo:", error);
        return { success: false, error: (error instanceof Error) ? error.message : 'Ocorreu um erro desconhecido.' };
    }
}

export async function sendTestDiscordMessage(channelId: string, payload: { content?: string, embeds?: any[] }): Promise<{ success: boolean; message: string }> {
    const botToken = process.env.DISCORD_BOT_TOKEN;

    if (!botToken || botToken === 'YOUR_BOT_TOKEN_HERE') {
        return { success: false, message: 'Token do bot do Discord não configurado.' };
    }
    if (!channelId) {
        return { success: false, message: 'Nenhum canal selecionado.' };
    }

    try {
        const response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bot ${botToken}`,
            },
            body: JSON.stringify(payload),
            cache: 'no-store'
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Failed to send test message to Discord:', JSON.stringify(errorData, null, 2));
            return { success: false, message: `Falha ao enviar mensagem de teste: ${errorData.message || response.statusText}` };
        }

        return { success: true, message: 'Mensagem de teste enviada com sucesso!' };

    } catch (error) {
        console.error('Error sending test message to Discord:', error);
        return { success: false, message: 'Ocorreu um erro ao enviar a mensagem de teste.' };
    }
}
