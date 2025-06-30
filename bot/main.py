import discord
from discord.ext import commands, tasks
import os
import json
import asyncio
from datetime import datetime, timedelta
import aiohttp
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv()

# Configuração do bot
intents = discord.Intents.default()
intents.message_content = True
intents.members = True
intents.guilds = True

# Configurações
BOT_TOKEN = os.getenv('DISCORD_BOT_TOKEN')
CLIENT_ID = os.getenv('DISCORD_CLIENT_ID')

# Tratar GUILD_ID de forma segura
guild_id_str = os.getenv('DISCORD_GUILD_ID', '0')
try:
    GUILD_ID = int(guild_id_str) if guild_id_str.isdigit() else 0
except (ValueError, AttributeError):
    GUILD_ID = 0

WEBHOOK_URL = os.getenv('WEBHOOK_URL', '')
API_BASE_URL = os.getenv('API_BASE_URL', 'http://localhost:3000')
CRON_SECRET = os.getenv('CRON_SECRET')

# Cores para embeds
COLORS = {
    'success': 0x00ff00,
    'error': 0xff0000,
    'warning': 0xffff00,
    'info': 0x0099ff,
    'bet': 0xff6b35,
    'mvp': 0xffd700,
    'quiz': 0x9b59b6
}

class TimaoBot(commands.Bot):
    def __init__(self):
        super().__init__(
            command_prefix='!',
            intents=intents,
            help_command=None
        )
        self.session = None
        self.last_sync = None
        
    async def setup_hook(self):
        """Configuração inicial do bot"""
        print(f'🤖 Bot {self.user} está inicializando...')
        
        # Criar sessão HTTP
        self.session = aiohttp.ClientSession()
        
        # Carregar comandos
        await self.load_extension('comandos.cron')
        # await self.load_extension('comandos.bet')
        # await self.load_extension('comandos.profile')
        # await self.load_extension('comandos.news')
        # await self.load_extension('comandos.quiz')
        # await self.load_extension('comandos.forca')
        # await self.load_extension('comandos.bolao')
        # await self.load_extension('comandos.mvp')
        # await self.load_extension('comandos.admin')
        
        # Iniciar tarefas em background
        self.sync_commands.start()
        self.health_check.start()
        
        print('✅ Bot inicializado com sucesso!')
    
    async def close(self):
        """Limpeza ao fechar o bot"""
        if self.session:
            await self.session.close()
        await super().close()
    
    @tasks.loop(hours=1)
    async def sync_commands(self):
        """Sincronizar comandos com o site"""
        try:
            headers = {'Authorization': f'Bearer {CRON_SECRET}'}
            
            # Primeiro testar se a API está funcionando
            async with self.session.get(f'{API_BASE_URL}/api/bot/test', headers=headers) as test_response:
                if test_response.status != 200:
                    print(f'❌ API não está acessível: {test_response.status}')
                    return
            
            # Se o teste passou, tentar sincronizar comandos
            async with self.session.post(f'{API_BASE_URL}/api/bot/update', headers=headers) as response:
                if response.status == 200:
                    data = await response.json()
                    print(f'✅ Comandos sincronizados: {data.get("commandsUpdated", 0)} comandos')
                else:
                    print(f'❌ Erro ao sincronizar comandos: {response.status}')
        except Exception as e:
            print(f'❌ Erro na sincronização: {e}')
    
    @tasks.loop(minutes=30)
    async def health_check(self):
        """Verificar saúde do bot e conexão com o site"""
        try:
            headers = {'Authorization': f'Bearer {CRON_SECRET}'}
            
            # Testar endpoint de sync
            async with self.session.get(f'{API_BASE_URL}/api/bot/sync', headers=headers) as response:
                if response.status == 200:
                    print(f'✅ Health check: {datetime.now().strftime("%H:%M:%S")}')
                else:
                    print(f'⚠️ Health check falhou: {response.status}')
        except Exception as e:
            print(f'❌ Health check erro: {e}')

bot = TimaoBot()

# Eventos do bot
@bot.event
async def on_ready():
    """Evento quando o bot está pronto"""
    print(f'🎉 {bot.user} está online!')
    print(f'📊 Servidores: {len(bot.guilds)}')
    print(f'👥 Usuários: {len(bot.users)}')
    
    # Definir status do bot
    await bot.change_presence(
        activity=discord.Activity(
            type=discord.ActivityType.watching,
            name="apostas e partidas! ⚽"
        )
    )

@bot.event
async def on_command_error(ctx, error):
    """Tratamento de erros de comandos"""
    if isinstance(error, commands.CommandNotFound):
        return
    
    if isinstance(error, commands.MissingPermissions):
        embed = discord.Embed(
            title="❌ Permissão Negada",
            description="Você não tem permissão para usar este comando.",
            color=COLORS['error']
        )
        await ctx.send(embed=embed)
        return
    
    if isinstance(error, commands.MissingRequiredArgument):
        embed = discord.Embed(
            title="❌ Argumento Faltando",
            description=f"Faltou o argumento: `{error.param.name}`",
            color=COLORS['error']
        )
        await ctx.send(embed=embed)
        return
    
    # Erro genérico
    embed = discord.Embed(
        title="❌ Erro",
        description=f"Ocorreu um erro: {str(error)}",
        color=COLORS['error']
    )
    await ctx.send(embed=embed)

@bot.event
async def on_guild_join(guild):
    """Evento quando o bot entra em um servidor"""
    embed = discord.Embed(
        title="🎉 Obrigado por me adicionar!",
        description="Sou o bot do Timão Cord! Use `/help` para ver meus comandos.",
        color=COLORS['success']
    )
    
    # Tentar enviar para o primeiro canal de texto disponível
    for channel in guild.text_channels:
        if channel.permissions_for(guild.me).send_messages:
            try:
                await channel.send(embed=embed)
                break
            except:
                continue

# Comando de ajuda personalizado
@bot.command(name='help')
async def help_command(ctx):
    """Mostrar ajuda dos comandos"""
    embed = discord.Embed(
        title="🤖 Comandos do Timão Bot",
        description="Aqui estão todos os comandos disponíveis:",
        color=COLORS['info']
    )
    
    embed.add_field(
        name="💰 Apostas",
        value="`/bet` - Fazer uma aposta\n`/balance` - Ver saldo\n`/ranking` - Ranking de apostadores",
        inline=False
    )
    
    embed.add_field(
        name="👤 Perfil",
        value="`/profile` - Ver perfil e estatísticas",
        inline=False
    )
    
    embed.add_field(
        name="📰 Notícias",
        value="`/news` - Ver últimas notícias",
        inline=False
    )
    
    embed.add_field(
        name="🎮 Jogos",
        value="`/quiz` - Quiz diário\n`/forca` - Jogar Forca",
        inline=False
    )
    
    embed.add_field(
        name="🏆 MVP",
        value="`/mvp` - Votar no MVP da partida",
        inline=False
    )
    
    embed.add_field(
        name="🎯 Bolão",
        value="`/bolao` - Informações do bolão",
        inline=False
    )
    
    embed.set_footer(text="Use / antes do comando para comandos slash!")
    
    await ctx.send(embed=embed)

@bot.command(name='atualizapartidas')
@commands.has_permissions(administrator=True)
async def atualiza_partidas(ctx):
    """Atualiza as partidas de futebol manualmente via cron job do site"""
    embed = discord.Embed(
        title="🔄 Atualizando Partidas",
        description="Aguarde, atualizando partidas de futebol...",
        color=COLORS['info']
    )
    msg = await ctx.send(embed=embed)
    try:
        headers = {'Authorization': f'Bearer {CRON_SECRET}'}
        async with aiohttp.ClientSession() as session:
            async with session.get(f'{API_BASE_URL}/api/cron/update-matches', headers=headers) as response:
                if response.status == 200:
                    data = await response.json()
                    embed = discord.Embed(
                        title="✅ Partidas Atualizadas",
                        description=data.get('message', 'Partidas atualizadas com sucesso!'),
                        color=COLORS['success']
                    )
                else:
                    embed = discord.Embed(
                        title="❌ Erro ao Atualizar",
                        description=f'Erro: {response.status}',
                        color=COLORS['error']
                    )
        await msg.edit(embed=embed)
    except Exception as e:
        embed = discord.Embed(
            title="❌ Erro ao Atualizar",
            description=str(e),
            color=COLORS['error']
        )
        await msg.edit(embed=embed)

# Função principal
def main():
    """Função principal para iniciar o bot"""
    if not BOT_TOKEN:
        print("❌ DISCORD_BOT_TOKEN não configurado!")
        return
    
    if not CLIENT_ID:
        print("❌ DISCORD_CLIENT_ID não configurado!")
        return
    
    try:
        bot.run(BOT_TOKEN)
    except discord.LoginFailure:
        print("❌ Token do bot inválido!")
    except Exception as e:
        print(f"❌ Erro ao iniciar bot: {e}")

if __name__ == "__main__":
    main() 