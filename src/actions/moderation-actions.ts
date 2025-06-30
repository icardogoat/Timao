
'use server';

import clientPromise from '@/lib/mongodb';
import { revalidatePath } from 'next/cache';
import { ObjectId, WithId } from 'mongodb';
import type { ModerationAction } from '@/types';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getBotConfig } from './bot-config-actions';

export async function getModerationLogs(): Promise<ModerationAction[]> {
    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const logs = await db.collection<WithId<ModerationAction>>('moderation_actions')
            .find({})
            .sort({ createdAt: -1 })
            .limit(100)
            .toArray();
        
        return JSON.parse(JSON.stringify(logs));
    } catch (error) {
        console.error("Error fetching moderation logs:", error);
        return [];
    }
}

async function sendModLogToDiscord(action: Omit<ModerationAction, '_id'>) {
    const config = await getBotConfig();
    const botToken = process.env.DISCORD_BOT_TOKEN;
    const channelId = config.moderationLogChannelId;

    if (!channelId || !botToken || botToken === 'YOUR_BOT_TOKEN_HERE') {
        console.warn('Discord moderation log channel or bot token not configured.');
        return;
    }

    const colors = {
        WARN: 0xfbbf24, // amber-400
        MUTE: 0x3b82f6, // blue-500
        BAN: 0xef4444,  // red-500
        KICK: 0xf97316, // orange-500
    };

    const titles = {
        WARN: '⚠️ Advertência Aplicada (via Site)',
        MUTE: '⏳ Usuário de Castigo (via Site)',
        BAN: '🚫 Usuário Banido (via Site)',
        KICK: '👢 Usuário Expulso (via Site)',
    };
    
    // @ts-ignore
    const color = colors[action.type] || 0x6b7280; // gray-500
    // @ts-ignore
    const title = titles[action.type] || 'Ação de Moderação (via Site)';

    const embed = {
        color: color,
        title: title,
        fields: [
            { name: "Usuário", value: `<@${action.userId}> (\`${action.userId}\`)`, inline: false },
            { name: "Moderador", value: `<@${action.moderatorId}> (${action.moderatorName})`, inline: false },
            { name: "Motivo", value: action.reason, inline: false },
        ],
        timestamp: new Date().toISOString(),
    };
    
    if (action.duration) {
         // @ts-ignore
        embed.fields.push({ name: "Duração", value: action.duration, inline: true });
    }
     if (action.expiresAt) {
         // @ts-ignore
        embed.fields.push({ name: "Expira em", value: `<t:${Math.floor(new Date(action.expiresAt).getTime() / 1000)}:R>`, inline: true });
    }

    try {
        await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bot ${botToken}` },
            body: JSON.stringify({ embeds: [embed] }),
            cache: 'no-store'
        });
    } catch (error) {
        console.error("Error sending moderation log to Discord:", error);
    }
}


export async function issueWarningFromSite(userId: string, userName: string, userAvatar: string, reason: string): Promise<{ success: boolean; message: string }> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.admin) {
        return { success: false, message: 'Acesso negado.' };
    }

    const action: Omit<ModerationAction, '_id'> = {
        userId, userName, userAvatar,
        moderatorId: session.user.discordId,
        moderatorName: session.user.name ?? 'Admin do Site',
        type: 'WARN',
        reason,
        createdAt: new Date(),
    };

    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        await db.collection('moderation_actions').insertOne(action as any);

        await sendModLogToDiscord(action);

        revalidatePath('/admin/moderation');
        return { success: true, message: `Advertência aplicada a ${userName} com sucesso.` };
    } catch (error) {
        console.error("Error issuing warning from site:", error);
        return { success: false, message: 'Ocorreu um erro ao aplicar a advertência.' };
    }
}
