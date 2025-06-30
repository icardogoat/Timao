
'use server';

import { getForcaWords } from '@/actions/forca-actions';
import { getBotConfig, getDiscordServerDetails } from '@/actions/bot-config-actions';
import { AdminForcaClient } from '@/components/admin-forca-client';

export default async function AdminForcaPage() {
    const [words, config] = await Promise.all([
        getForcaWords(),
        getBotConfig()
    ]);

    let discordChannels = [];
    let error: string | null = null;

    if (config.guildId) {
        const detailsResult = await getDiscordServerDetails(config.guildId);
        if (detailsResult.success && detailsResult.data) {
            discordChannels = detailsResult.data.channels;
        } else {
            error = detailsResult.error || "Falha ao carregar canais do Discord.";
        }
    } else {
        error = "O ID do Servidor Discord não está configurado. Configure-o na aba 'Bot' para selecionar um canal para o jogo.";
    }

    return (
        <AdminForcaClient 
            initialWords={words} 
            initialSchedule={config.forcaSchedule || []} 
            initialChannelId={config.forcaChannelId || ''}
            discordChannels={discordChannels}
            error={error}
        />
    );
}
