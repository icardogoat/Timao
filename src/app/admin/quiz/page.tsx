
'use server';

import { getQuizzes } from '@/actions/quiz-actions';
import { AdminQuizClient } from '@/components/admin-quiz-client';
import { getBotConfig, getDiscordServerDetails } from '@/actions/bot-config-actions';

export default async function AdminQuizPage() {
    const quizzes = await getQuizzes();
    const config = await getBotConfig();
    
    let serverDetails = { channels: [], roles: [] };
    let error: string | null = null;

    if (config.guildId) {
        const result = await getDiscordServerDetails(config.guildId);
        if (result.success && result.data) {
            serverDetails.channels = result.data.channels;
            serverDetails.roles = result.data.roles;
        } else {
            error = result.error || 'Ocorreu um erro desconhecido ao buscar os detalhes do servidor.';
        }
    } else {
        error = "O ID do Servidor Discord não foi configurado. Por favor, adicione-o na aba 'Bot'.";
    }

    return (
        <AdminQuizClient 
            initialQuizzes={quizzes} 
            discordChannels={serverDetails.channels}
            discordRoles={serverDetails.roles}
            error={error}
        />
    );
}
