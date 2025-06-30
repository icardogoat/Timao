
'use server';

import { AdminPlayerGameClient } from '@/components/admin-player-game-client';
import { getPlayerGames } from '@/actions/player-game-actions';
import { getBotConfig, getDiscordServerDetails } from '@/actions/bot-config-actions';

export default async function AdminPlayerGamePage() {
    const [games, config] = await Promise.all([
        getPlayerGames(),
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
    
    return <AdminPlayerGameClient 
        initialGames={games} 
        discordChannels={discordChannels} 
        error={error} 
        initialSchedule={config.playerGameSchedule || []}
    />;
}
