# 🤖 Bot do Discord - Sistema de Cron Jobs

Este bot gerencia automaticamente os cron jobs do site Timão Cord através de comandos do Discord.

## 📋 Comandos Disponíveis

### Comandos de Cron Jobs (Apenas Administradores)

| Comando | Descrição |
|---------|-----------|
| `!cron` | Verificar status de todos os cron jobs |
| `!cronrun <job>` | Executar um cron job manualmente |
| `!cronupdate` | Atualizar comandos slash do bot |
| `!cronsync` | Sincronizar configurações do bot |
| `!cronlogs [limite]` | Ver logs dos cron jobs |

### Cron Jobs Disponíveis

- `cleanup` - Limpeza diária do sistema
- `news` - Sincronização de notícias
- `mvp` - Atualização de MVP
- `notify` - Envio de notificações
- `process` - Processamento de dados
- `quiz` - Agendamento de quiz
- `matches` - Atualização de partidas

## 🚀 Instalação

1. **Instalar dependências:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Configurar variáveis de ambiente:**
   ```bash
   cp .env.example .env
   # Editar .env com suas configurações
   ```

3. **Executar o bot:**
   ```bash
   python main.py
   ```

## ⚙️ Configuração

### Variáveis de Ambiente Obrigatórias

- `DISCORD_BOT_TOKEN` - Token do seu bot do Discord
- `DISCORD_CLIENT_ID` - ID da aplicação do Discord
- `CRON_SECRET` - Chave secreta para autenticação com a API

### Variáveis Opcionais

- `API_BASE_URL` - URL base da API (padrão: http://localhost:3000)
- `DISCORD_GUILD_ID` - ID do servidor Discord
- `WEBHOOK_URL` - URL do webhook para notificações
- `LOG_LEVEL` - Nível de log (padrão: INFO)

## 🔧 Como Usar

### 1. Verificar Status dos Cron Jobs
```
!cron
```
Mostra o status de todos os cron jobs do site.

### 2. Executar Cron Job Manualmente
```
!cronrun news
```
Executa o cron job de sincronização de notícias.

### 3. Atualizar Comandos do Bot
```
!cronupdate
```
Atualiza os comandos slash do bot no Discord.

### 4. Sincronizar Configurações
```
!cronsync
```
Sincroniza as configurações do bot com o site.

### 5. Ver Logs
```
!cronlogs 10
```
Mostra os últimos 10 registros de execução.

## 🔄 Funcionalidades Automáticas

### Sincronização Automática
- O bot sincroniza comandos a cada hora
- Health check a cada 30 minutos
- Notificações automáticas de status

### Integração com o Site
- Comunicação via API REST
- Autenticação segura com CRON_SECRET
- Logs detalhados de execução

## 🛠️ Estrutura do Projeto

```
bot/
├── main.py              # Arquivo principal do bot
├── config.py            # Configurações centralizadas
├── requirements.txt     # Dependências Python
├── .env.example         # Exemplo de configuração
├── README.md           # Este arquivo
└── comandos/
    ├── __init__.py     # Módulo de comandos
    └── cron.py         # Comandos de cron jobs
```

## 🔐 Permissões

Todos os comandos de cron jobs requerem permissão de **Administrador** no servidor Discord.

## 📝 Logs

O bot registra todas as operações de cron jobs e pode enviar notificações para:
- Canal de logs configurado
- Webhook personalizado
- Console do bot

## 🆘 Suporte

Para problemas ou dúvidas:
1. Verifique os logs do bot
2. Confirme se as variáveis de ambiente estão corretas
3. Teste a conectividade com a API do site
4. Verifique as permissões do bot no Discord 