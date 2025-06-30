import { NextResponse } from 'next/server';
import { getBotConfig } from '@/actions/bot-config-actions';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response('Unauthorized', { status: 401 });
    }

    const config = await getBotConfig();
    const botToken = process.env.DISCORD_BOT_TOKEN;

    if (!botToken || !config.guildId) {
      return NextResponse.json({ 
        success: false, 
        message: 'Configuração incompleta do bot do Discord' 
      }, { status: 400 });
    }

    // Buscar informações atualizadas do servidor Discord
    const guildResponse = await fetch(`https://discord.com/api/v10/guilds/${config.guildId}?with_counts=true`, {
      headers: { 'Authorization': `Bot ${botToken}` },
      cache: 'no-store'
    });

    if (!guildResponse.ok) {
      throw new Error(`Erro ao buscar dados do servidor: ${guildResponse.status}`);
    }

    const guildData = await guildResponse.json();

    // Buscar canais atualizados
    const channelsResponse = await fetch(`https://discord.com/api/v10/guilds/${config.guildId}/channels`, {
      headers: { 'Authorization': `Bot ${botToken}` },
      cache: 'no-store'
    });

    if (!channelsResponse.ok) {
      throw new Error(`Erro ao buscar canais: ${channelsResponse.status}`);
    }

    const channelsData = await channelsResponse.json();

    // Buscar cargos atualizados
    const rolesResponse = await fetch(`https://discord.com/api/v10/guilds/${config.guildId}/roles`, {
      headers: { 'Authorization': `Bot ${botToken}` },
      cache: 'no-store'
    });

    if (!rolesResponse.ok) {
      throw new Error(`Erro ao buscar cargos: ${rolesResponse.status}`);
    }

    const rolesData = await rolesResponse.json();

    // Preparar dados de sincronização
    const syncData = {
      guild: {
        id: guildData.id,
        name: guildData.name,
        memberCount: guildData.approximate_member_count,
        channelCount: channelsData.length,
        roleCount: rolesData.length
      },
      channels: channelsData
        .filter((channel: any) => channel.type === 0) // Apenas canais de texto
        .map((channel: any) => ({
          id: channel.id,
          name: channel.name,
          type: channel.type
        })),
      roles: rolesData
        .filter((role: any) => !role.managed && role.name !== '@everyone') // Excluir cargos gerenciados
        .map((role: any) => ({
          id: role.id,
          name: role.name
        })),
      config: {
        guildId: config.guildId,
        guildInviteUrl: config.guildInviteUrl,
        welcomeChannelId: config.welcomeChannelId,
        logChannelId: config.logChannelId,
        bettingChannelId: config.bettingChannelId,
        winnersChannelId: config.winnersChannelId,
        bolaoChannelId: config.bolaoChannelId,
        mvpChannelId: config.mvpChannelId,
        levelUpChannelId: config.levelUpChannelId,
        eventChannelId: config.eventChannelId,
        newsChannelId: config.newsChannelId,
        newsMentionRoleId: config.newsMentionRoleId,
        adminRoleId: config.adminRoleId,
        moderationLogChannelId: config.moderationLogChannelId,
        postCreatorRoleId: config.postCreatorRoleId,
        vipRoleIds: config.vipRoleIds,
        streamViewerRoleId: config.streamViewerRoleId
      },
      timestamp: new Date().toISOString()
    };

    // Enviar notificação de sincronização se o canal de logs estiver configurado
    if (config.logChannelId) {
      const embed = {
        color: 0x3b82f6,
        title: '🔄 Sincronização Realizada',
        description: 'As configurações do bot foram sincronizadas com o servidor Discord.',
        fields: [
          {
            name: 'Servidor',
            value: `${guildData.name} (${guildData.approximate_member_count} membros)`,
            inline: true
          },
          {
            name: 'Canais',
            value: `${channelsData.filter((c: any) => c.type === 0).length} canais de texto`,
            inline: true
          },
          {
            name: 'Cargos',
            value: `${rolesData.filter((r: any) => !r.managed && r.name !== '@everyone').length} cargos disponíveis`,
            inline: true
          },
          {
            name: 'Configurações Ativas',
            value: Object.entries(config)
              .filter(([key, value]) => value && key !== 'guildId' && key !== 'guildInviteUrl')
              .map(([key, value]) => `• ${key}: ${value}`)
              .join('\n') || 'Nenhuma configuração ativa',
            inline: false
          }
        ],
        timestamp: new Date().toISOString()
      };

      await fetch(`https://discord.com/api/v10/channels/${config.logChannelId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bot ${botToken}`,
        },
        body: JSON.stringify({ embeds: [embed] })
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Sincronização realizada com sucesso!',
      data: syncData
    });

  } catch (error) {
    console.error('Erro na sincronização:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Erro interno na sincronização',
      error: (error as Error).message 
    }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const config = await getBotConfig();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Endpoint de sincronização ativo',
      config: {
        guildId: config.guildId,
        hasLogChannel: !!config.logChannelId,
        hasNewsChannel: !!config.newsChannelId,
        hasBettingChannel: !!config.bettingChannelId,
        hasMvpChannel: !!config.mvpChannelId
      }
    });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      message: 'Erro ao verificar configuração',
      error: (error as Error).message 
    }, { status: 500 });
  }
} 