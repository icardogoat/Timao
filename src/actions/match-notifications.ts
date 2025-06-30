
'use server';

import clientPromise from '@/lib/mongodb';
import { getBotConfig } from './bot-config-actions';
import type { Market } from '@/types';

type MatchForNotification = {
    _id: number;
    homeTeam: string;
    awayTeam: string;
    league: string;
    timestamp: number;
    homeLogo?: string;
    awayLogo?: string;
    markets: Market[];
};

async function sendDiscordNotification(channelId: string, match: MatchForNotification) {
    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (!botToken || botToken === 'YOUR_BOT_TOKEN_HERE') {
        console.error('Bot token not configured. Skipping Discord notification.');
        return { success: false, message: 'Bot token not configured.' };
    }

    const mainMarket = match.markets.find(m => m.name === 'Vencedor da Partida' || m.name === 'Match Winner');
    const homeOdd = mainMarket?.odds.find(o => o.label === 'Casa' || o.label === 'Home')?.value;
    const drawOdd = mainMarket?.odds.find(o => o.label === 'Empate' || o.label === 'Draw')?.value;
    const awayOdd = mainMarket?.odds.find(o => o.label === 'Fora' || o.label === 'Away')?.value;

    const embed = {
        color: 0xfacc15, // Tailwind's yellow-400
        title: '🔥 JOGO PRESTES A COMEÇAR! 🔥',
        description: `**${match.homeTeam} vs ${match.awayTeam}**\n\nA partida começa em menos de 10 minutos! Faça sua aposta agora!`,
        thumbnail: {
            url: match.homeLogo,
        },
        fields: [
            { name: 'Casa', value: `Odd: **${homeOdd || 'N/A'}**`, inline: true },
            { name: 'Empate', value: `Odd: **${drawOdd || 'N/A'}**`, inline: true },
            { name: 'Fora', value: `Odd: **${awayOdd || 'N/A'}**`, inline: true },
        ],
        footer: {
            text: `Campeonato: ${match.league}`,
        },
        timestamp: new Date(match.timestamp * 1000).toISOString(),
    };

    try {
        const response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bot ${botToken}`,
            },
            body: JSON.stringify({ embeds: [embed] }),
            cache: 'no-store'
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error(`Failed to send pre-match notification for match ${match._id}:`, JSON.stringify(errorData, null, 2));
            return { success: false, message: `Failed to send message: ${JSON.stringify(errorData)}` };
        }
        
        console.log(`Successfully sent pre-match notification for match ${match._id}`);
        return { success: true };

    } catch (error) {
        console.error(`Error sending pre-match notification for match ${match._id}:`, error);
        return { success: false, message: 'An unexpected error occurred.' };
    }
}

export async function sendUpcomingMatchNotifications(): Promise<{ success: boolean; message: string; details: string[] }> {
    console.log('Checking for upcoming matches to notify...');
    const config = await getBotConfig();
    const bettingChannelId = config.bettingChannelId;

    if (!bettingChannelId) {
        const msg = 'Betting channel not configured. Skipping upcoming match notifications.';
        console.log(msg);
        return { success: false, message: msg, details: [] };
    }

    const client = await clientPromise;
    const db = client.db('timaocord');
    const matchesCollection = db.collection<MatchForNotification>('matches');

    const now = Math.floor(Date.now() / 1000);
    const tenMinutesFromNow = now + 10 * 60;

    const upcomingMatches = await matchesCollection.find({
        timestamp: { $gte: now, $lt: tenMinutesFromNow },
        isNotificationSent: { $ne: true },
        status: 'NS'
    }).toArray();

    if (upcomingMatches.length === 0) {
        const msg = 'No new upcoming matches to notify about in the next 10 minutes.';
        console.log(msg);
        return { success: true, message: msg, details: [] };
    }

    console.log(`Found ${upcomingMatches.length} matches to notify about.`);
    const results: string[] = [];
    let successCount = 0;
    let failureCount = 0;

    for (const match of upcomingMatches) {
        const notificationResult = await sendDiscordNotification(bettingChannelId, match);
        
        if (notificationResult.success) {
            // Mark as sent to avoid duplicate notifications
            await matchesCollection.updateOne(
                { _id: match._id },
                { $set: { isNotificationSent: true } }
            );
            successCount++;
            results.push(`Successfully sent notification for match ${match._id}.`);
        } else {
            failureCount++;
            results.push(`Failed to send notification for match ${match._id}: ${notificationResult.message}`);
        }
    }

    const summaryMessage = `Processed ${upcomingMatches.length} upcoming matches. Sent: ${successCount}, Failed: ${failureCount}.`;
    console.log(summaryMessage);
    
    return {
        success: failureCount === 0,
        message: summaryMessage,
        details: results
    };
}
