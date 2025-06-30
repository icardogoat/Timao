import os
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv()

# Configurações do Bot
BOT_TOKEN = os.getenv('DISCORD_BOT_TOKEN')
CLIENT_ID = os.getenv('DISCORD_CLIENT_ID')
GUILD_ID = int(os.getenv('DISCORD_GUILD_ID', 0))

# Configurações da API
API_BASE_URL = os.getenv('API_BASE_URL', 'http://localhost:3000')
CRON_SECRET = os.getenv('CRON_SECRET')

# Configurações do Webhook (opcional)
WEBHOOK_URL = os.getenv('WEBHOOK_URL', '')

# Cores para embeds
COLORS = {
    'success': 0x00ff00,
    'error': 0xff0000,
    'warning': 0xffff00,
    'info': 0x0099ff,
    'bet': 0xff6b35,
    'mvp': 0xffd700,
    'quiz': 0x9b59b6,
    'cron': 0x8b5cf6
}

# Configurações dos Cron Jobs
CRON_JOBS = {
    'cleanup': {
        'name': 'Cleanup',
        'path': '/api/cron/cleanup',
        'schedule': '0 2 * * *',
        'description': 'Limpeza diária do sistema'
    },
    'news': {
        'name': 'News Sync',
        'path': '/api/cron/news',
        'schedule': '0 */6 * * *',
        'description': 'Sincronização de notícias'
    },
    'mvp': {
        'name': 'MVP Update',
        'path': '/api/cron/mvp',
        'schedule': '0 12 * * *',
        'description': 'Atualização de MVP'
    },
    'notify': {
        'name': 'Notifications',
        'path': '/api/cron/notify',
        'schedule': '0 8 * * *',
        'description': 'Envio de notificações'
    },
    'process': {
        'name': 'Process',
        'path': '/api/cron/process',
        'schedule': '*/15 * * * *',
        'description': 'Processamento de dados'
    },
    'quiz': {
        'name': 'Quiz Scheduler',
        'path': '/api/cron/quiz-scheduler',
        'schedule': '0 9 * * *',
        'description': 'Agendamento de quiz'
    },
    'matches': {
        'name': 'Update Matches',
        'path': '/api/cron/update-matches',
        'schedule': '0 */2 * * *',
        'description': 'Atualização de partidas'
    }
}

# Configurações de permissões
ADMIN_ROLES = ['Admin', 'Moderador', 'Bot Manager']

# Configurações de logs
LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
LOG_FILE = os.getenv('LOG_FILE', 'bot.log')

# Configurações de timeout
REQUEST_TIMEOUT = 30  # segundos
RETRY_ATTEMPTS = 3

# Configurações de cache
CACHE_DURATION = 300  # 5 minutos

# Validação de configuração
def validate_config():
    """Validar se todas as configurações necessárias estão presentes"""
    required_vars = ['DISCORD_BOT_TOKEN', 'DISCORD_CLIENT_ID', 'CRON_SECRET']
    missing_vars = []
    
    for var in required_vars:
        if not os.getenv(var):
            missing_vars.append(var)
    
    if missing_vars:
        print(f"❌ Variáveis de ambiente faltando: {', '.join(missing_vars)}")
        return False
    
    print("✅ Configuração válida!")
    return True

# Função para obter headers de autenticação
def get_auth_headers():
    """Retornar headers de autenticação para API"""
    return {'Authorization': f'Bearer {CRON_SECRET}'} 