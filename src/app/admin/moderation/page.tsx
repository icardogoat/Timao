
'use server';

import { getModerationLogs } from '@/actions/moderation-actions';
import { AdminModerationClient } from '@/components/admin-moderation-client';
import { getAdminUsers } from '@/actions/admin-actions';
import { getBotConfig, getDiscordServerDetails } from '@/actions/bot-config-actions';

export default async function AdminModerationPage() {
    const [logs, users, config] = await Promise.all([
        getModerationLogs(),
        getAdminUsers(),
        getBotConfig()
    ]);
    
    let serverDetails = { channels: [], roles: [] };
    let error: string | null = null;

     if (config.guildId) {
        const result = await getDiscordServerDetails(config.guildId);
        if (result.success && result.data) {
            serverDetails = result.data;
        } else {
            error = result.error || 'Ocorreu um erro desconhecido ao buscar os detalhes do servidor.';
        }
    } else {
        error = "O ID do Servidor Discord não foi configurado na aba 'Bot'.";
    }

    return (
        <AdminModerationClient 
            initialLogs={logs}
            allUsers={users}
            modLogChannelId={config.moderationLogChannelId}
            error={error}
        />
    );
}
