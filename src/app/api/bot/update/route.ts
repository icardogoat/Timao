import { NextResponse } from 'next/server';
import { getBotConfig } from '@/actions/bot-config-actions';

// Definição dos comandos slash do bot
const SLASH_COMMANDS = [
  {
    name: 'bet',
    description: 'Fazer uma aposta em uma partida',
    options: [
      {
        name: 'match',
        description: 'ID da partida',
        type: 3, // STRING
        required: true
      },
      {
        name: 'amount',
        description: 'Valor da aposta',
        type: 3, // STRING
        required: true
      },
      {
        name: 'prediction',
        description: 'Sua previsão (casa/empate/fora)',
        type: 3, // STRING
        required: true,
        choices: [
          { name: 'Casa', value: 'home' },
          { name: 'Empate', value: 'draw' },
          { name: 'Fora', value: 'away' }
        ]
      }
    ]
  },
  {
    name: 'balance',
    description: 'Verificar seu saldo atual',
    options: []
  },
  {
    name: 'profile',
    description: 'Ver seu perfil e estatísticas',
    options: []
  },
  {
    name: 'ranking',
    description: 'Ver o ranking de apostadores',
    options: []
  },
  {
    name: 'news',
    description: 'Ver as últimas notícias',
    options: [
      {
        name: 'limit',
        description: 'Número de notícias (padrão: 5)',
        type: 4, // INTEGER
        required: false
      }
    ]
  },
  {
    name: 'quiz',
    description: 'Participar do quiz diário',
    options: []
  },
  {
    name: 'forca',
    description: 'Jogar Forca',
    options: []
  },
  {
    name: 'bolao',
    description: 'Ver informações sobre o bolão',
    options: []
  },
  {
    name: 'mvp',
    description: 'Votar no MVP da partida',
    options: [
      {
        name: 'match',
        description: 'ID da partida',
        type: 3, // STRING
        required: true
      },
      {
        name: 'player',
        description: 'Nome do jogador',
        type: 3, // STRING
        required: true
      }
    ]
  }
];

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response('Unauthorized', { status: 401 });
    }

    const botToken = process.env.DISCORD_BOT_TOKEN;
    const clientId = process.env.DISCORD_CLIENT_ID;
    const config = await getBotConfig();

    if (!botToken || !clientId || !config.guildId) {
      return NextResponse.json({ 
        success: false, 
        message: 'Configuração incompleta do bot do Discord' 
      }, { status: 400 });
    }

    // Atualizar comandos globais (para todos os servidores)
    const globalResponse = await fetch(`https://discord.com/api/v10/applications/${clientId}/commands`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bot ${botToken}`,
      },
      body: JSON.stringify(SLASH_COMMANDS)
    });

    if (!globalResponse.ok) {
      const errorData = await globalResponse.json();
      console.error('Erro ao atualizar comandos globais:', errorData);
    }

    // Atualizar comandos do servidor específico (mais rápido para desenvolvimento)
    const guildResponse = await fetch(`https://discord.com/api/v10/applications/${clientId}/guilds/${config.guildId}/commands`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bot ${botToken}`,
      },
      body: JSON.stringify(SLASH_COMMANDS)
    });

    if (!guildResponse.ok) {
      const errorData = await guildResponse.json();
      console.error('Erro ao atualizar comandos do servidor:', errorData);
    }

    // Enviar notificação de atualização
    if (config.logChannelId) {
      const embed = {
        color: 0x00ff00,
        title: '🤖 Bot Atualizado',
        description: 'Os comandos slash do bot foram atualizados com sucesso!',
        fields: [
          {
            name: 'Comandos Atualizados',
            value: SLASH_COMMANDS.map(cmd => `\`/${cmd.name}\` - ${cmd.description}`).join('\n'),
            inline: false
          },
          {
            name: 'Timestamp',
            value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
            inline: true
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
      message: 'Bot atualizado com sucesso!',
      commandsUpdated: SLASH_COMMANDS.length
    });

  } catch (error) {
    console.error('Erro ao atualizar bot:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Erro interno ao atualizar bot',
      error: (error as Error).message 
    }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  return NextResponse.json({ 
    success: true, 
    message: 'Endpoint de atualização do bot ativo',
    commands: SLASH_COMMANDS
  });
} 