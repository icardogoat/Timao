'use server';

import { getBotConfig, getDiscordServerDetails } from '@/actions/bot-config-actions';
import AdminBotConfigClient from '@/components/admin-bot-config-client';

export default async function AdminBotConfigPage() {
    const config = await getBotConfig();
    
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
        error = "O ID do Servidor Discord não foi configurado. Por favor, adicione-o abaixo e clique em 'Carregar'.";
    }
    
    return (
        <AdminBotConfigClient 
            initialConfig={config} 
            initialChannels={serverDetails.channels}
            initialRoles={serverDetails.roles}
            error={error}
        />
    );
}
