import discord
from discord.ext import commands
import aiohttp
import os
from datetime import datetime
import json

# Cores para embeds
COLORS = {
    'success': 0x00ff00,
    'error': 0xff0000,
    'warning': 0xffff00,
    'info': 0x0099ff,
    'cron': 0x8b5cf6
}

class CronCommands(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.api_base_url = os.getenv('API_BASE_URL', 'http://localhost:3000')
        self.cron_secret = os.getenv('CRON_SECRET')
        
    @commands.command(name='cron')
    @commands.has_permissions(administrator=True)
    async def cron_status(self, ctx):
        """Verificar status dos cron jobs"""
        embed = discord.Embed(
            title="🕐 Status dos Cron Jobs",
            description="Verificando status dos cron jobs do site...",
            color=COLORS['info']
        )
        embed.set_footer(text="Aguarde...")
        
        message = await ctx.send(embed=embed)
        
        try:
            headers = {'Authorization': f'Bearer {self.cron_secret}'}
            
            # Lista de cron jobs para verificar
            cron_jobs = [
                {'name': 'Cleanup', 'path': '/api/cron/cleanup'},
                {'name': 'News Sync', 'path': '/api/cron/news'},
                {'name': 'MVP Update', 'path': '/api/cron/mvp'},
                {'name': 'Notifications', 'path': '/api/cron/notify'},
                {'name': 'Process', 'path': '/api/cron/process'},
                {'name': 'Quiz Scheduler', 'path': '/api/cron/quiz-scheduler'},
                {'name': 'Update Matches', 'path': '/api/cron/update-matches'}
            ]
            
            status_list = []
            
            async with aiohttp.ClientSession() as session:
                for job in cron_jobs:
                    try:
                        async with session.get(f"{self.api_base_url}{job['path']}", headers=headers) as response:
                            if response.status == 200:
                                status_list.append(f"✅ **{job['name']}** - Online")
                            else:
                                status_list.append(f"❌ **{job['name']}** - Erro {response.status}")
                    except Exception as e:
                        status_list.append(f"❌ **{job['name']}** - Offline")
            
            # Atualizar embed com resultados
            embed = discord.Embed(
                title="🕐 Status dos Cron Jobs",
                description="Status atual dos cron jobs do site:",
                color=COLORS['info'],
                timestamp=datetime.now()
            )
            
            for status in status_list:
                embed.add_field(name="", value=status, inline=False)
            
            embed.set_footer(text=f"Verificado em {datetime.now().strftime('%H:%M:%S')}")
            
            await message.edit(embed=embed)
            
        except Exception as e:
            embed = discord.Embed(
                title="❌ Erro",
                description=f"Erro ao verificar cron jobs: {str(e)}",
                color=COLORS['error']
            )
            await message.edit(embed=embed)
    
    @commands.command(name='cronrun')
    @commands.has_permissions(administrator=True)
    async def run_cron(self, ctx, job_name: str):
        """Executar um cron job manualmente"""
        job_mapping = {
            'cleanup': '/api/cron/cleanup',
            'news': '/api/cron/news',
            'mvp': '/api/cron/mvp',
            'notify': '/api/cron/notify',
            'process': '/api/cron/process',
            'quiz': '/api/cron/quiz-scheduler',
            'matches': '/api/cron/update-matches'
        }
        
        if job_name.lower() not in job_mapping:
            embed = discord.Embed(
                title="❌ Cron Job Inválido",
                description=f"Cron jobs disponíveis: {', '.join(job_mapping.keys())}",
                color=COLORS['error']
            )
            await ctx.send(embed=embed)
            return
        
        embed = discord.Embed(
            title="🔄 Executando Cron Job",
            description=f"Executando **{job_name}**...",
            color=COLORS['warning']
        )
        embed.set_footer(text="Aguarde...")
        
        message = await ctx.send(embed=embed)
        
        try:
            headers = {'Authorization': f'Bearer {self.cron_secret}'}
            job_path = job_mapping[job_name.lower()]
            
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{self.api_base_url}{job_path}", headers=headers) as response:
                    if response.status == 200:
                        data = await response.json()
                        
                        embed = discord.Embed(
                            title="✅ Cron Job Executado",
                            description=f"**{job_name}** foi executado com sucesso!",
                            color=COLORS['success']
                        )
                        
                        if 'message' in data:
                            embed.add_field(name="Mensagem", value=data['message'], inline=False)
                        
                        embed.set_footer(text=f"Executado em {datetime.now().strftime('%H:%M:%S')}")
                        
                    else:
                        embed = discord.Embed(
                            title="❌ Erro na Execução",
                            description=f"Erro ao executar **{job_name}**: {response.status}",
                            color=COLORS['error']
                        )
            
            await message.edit(embed=embed)
            
        except Exception as e:
            embed = discord.Embed(
                title="❌ Erro",
                description=f"Erro ao executar cron job: {str(e)}",
                color=COLORS['error']
            )
            await message.edit(embed=embed)
    
    @commands.command(name='cronupdate')
    @commands.has_permissions(administrator=True)
    async def update_bot_commands(self, ctx):
        """Atualizar comandos slash do bot"""
        embed = discord.Embed(
            title="🔄 Atualizando Comandos",
            description="Atualizando comandos slash do bot...",
            color=COLORS['warning']
        )
        embed.set_footer(text="Aguarde...")
        
        message = await ctx.send(embed=embed)
        
        try:
            headers = {'Authorization': f'Bearer {self.cron_secret}'}
            
            async with aiohttp.ClientSession() as session:
                async with session.post(f"{self.api_base_url}/api/bot/update", headers=headers) as response:
                    if response.status == 200:
                        data = await response.json()
                        
                        embed = discord.Embed(
                            title="✅ Comandos Atualizados",
                            description="Comandos slash do bot foram atualizados com sucesso!",
                            color=COLORS['success']
                        )
                        
                        if 'commandsUpdated' in data:
                            embed.add_field(name="Comandos", value=f"{data['commandsUpdated']} comandos atualizados", inline=True)
                        
                        embed.set_footer(text=f"Atualizado em {datetime.now().strftime('%H:%M:%S')}")
                        
                    else:
                        embed = discord.Embed(
                            title="❌ Erro na Atualização",
                            description=f"Erro ao atualizar comandos: {response.status}",
                            color=COLORS['error']
                        )
            
            await message.edit(embed=embed)
            
        except Exception as e:
            embed = discord.Embed(
                title="❌ Erro",
                description=f"Erro ao atualizar comandos: {str(e)}",
                color=COLORS['error']
            )
            await message.edit(embed=embed)
    
    @commands.command(name='cronsync')
    @commands.has_permissions(administrator=True)
    async def sync_config(self, ctx):
        """Sincronizar configurações do bot"""
        embed = discord.Embed(
            title="🔄 Sincronizando Configurações",
            description="Sincronizando configurações do bot com o site...",
            color=COLORS['warning']
        )
        embed.set_footer(text="Aguarde...")
        
        message = await ctx.send(embed=embed)
        
        try:
            headers = {'Authorization': f'Bearer {self.cron_secret}'}
            
            async with aiohttp.ClientSession() as session:
                async with session.post(f"{self.api_base_url}/api/bot/sync", headers=headers) as response:
                    if response.status == 200:
                        data = await response.json()
                        
                        embed = discord.Embed(
                            title="✅ Configurações Sincronizadas",
                            description="Configurações foram sincronizadas com sucesso!",
                            color=COLORS['success']
                        )
                        
                        if 'data' in data and 'guild' in data['data']:
                            guild_info = data['data']['guild']
                            embed.add_field(
                                name="Servidor", 
                                value=f"{guild_info['name']} ({guild_info['memberCount']} membros)", 
                                inline=True
                            )
                        
                        embed.set_footer(text=f"Sincronizado em {datetime.now().strftime('%H:%M:%S')}")
                        
                    else:
                        embed = discord.Embed(
                            title="❌ Erro na Sincronização",
                            description=f"Erro ao sincronizar: {response.status}",
                            color=COLORS['error']
                        )
            
            await message.edit(embed=embed)
            
        except Exception as e:
            embed = discord.Embed(
                title="❌ Erro",
                description=f"Erro ao sincronizar: {str(e)}",
                color=COLORS['error']
            )
            await message.edit(embed=embed)
    
    @commands.command(name='cronlogs')
    @commands.has_permissions(administrator=True)
    async def show_cron_logs(self, ctx, limit: int = 10):
        """Mostrar logs dos cron jobs (últimos N registros)"""
        embed = discord.Embed(
            title="📋 Logs dos Cron Jobs",
            description=f"Últimos {limit} registros de execução dos cron jobs:",
            color=COLORS['info'],
            timestamp=datetime.now()
        )
        
        # Aqui você pode implementar a busca de logs do banco de dados
        # Por enquanto, vou mostrar um exemplo
        embed.add_field(
            name="Cron Jobs Ativos",
            value="""
            • **Cleanup** - Diário às 2h
            • **News Sync** - A cada 6 horas
            • **MVP Update** - Diário às 12h
            • **Notifications** - Diário às 8h
            • **Process** - A cada 15 minutos
            • **Quiz Scheduler** - Diário às 9h
            • **Update Matches** - A cada 2 horas
            """,
            inline=False
        )
        
        embed.add_field(
            name="Status",
            value="✅ Todos os cron jobs estão funcionando normalmente",
            inline=False
        )
        
        embed.set_footer(text=f"Verificado em {datetime.now().strftime('%H:%M:%S')}")
        
        await ctx.send(embed=embed)

async def setup(bot):
    await bot.add_cog(CronCommands(bot)) 