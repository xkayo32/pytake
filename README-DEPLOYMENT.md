# PyTake Production Deployment Guide

Este guia fornece instruções completas para fazer deploy do PyTake em um servidor de produção.

## 🚀 Quick Start

### Pré-requisitos
- Servidor Ubuntu/Debian 20.04+ com IP público
- Acesso root/sudo ao servidor
- Domínio apontando para o IP do servidor (opcional, mas recomendado)

### Deploy Rápido

1. **Preparar o servidor:**
```bash
# Execute no servidor como root
wget https://raw.githubusercontent.com/your-repo/pytake/main/server-setup.sh
chmod +x server-setup.sh
sudo ./server-setup.sh
```

2. **Fazer deploy da aplicação:**
```bash
# Execute como usuário pytake (criado pelo script anterior)
git clone https://github.com/your-repo/pytake.git
cd pytake
cp .env.production .env.production.local
nano .env.production.local  # Configure suas credenciais
chmod +x deploy.sh
./deploy.sh deploy
```

3. **Acesse sua aplicação:**
```
http://SEU_IP_DO_SERVIDOR
```

## 📋 Configuração Detalhada

### 1. Preparação do Servidor

O script `server-setup.sh` instala e configura:
- Docker e Docker Compose
- Nginx
- PostgreSQL e Redis (via Docker)
- Firewall (UFW)
- Fail2ban para segurança
- Certificados SSL via Let's Encrypt
- Usuário não-root para deploy
- Otimizações de sistema

### 2. Configuração de Ambiente

Copie e configure o arquivo de ambiente:
```bash
cp .env.production .env.production.local
```

**Variáveis importantes para alterar:**
```bash
# Segurança - ALTERE OBRIGATORIAMENTE!
POSTGRES_PASSWORD=sua_senha_super_forte_aqui
REDIS_PASSWORD=sua_senha_redis_aqui
JWT_SECRET=uma_string_muito_longa_e_aleatoria_de_pelo_menos_64_caracteres
WHATSAPP_WEBHOOK_VERIFY_TOKEN=seu_token_verificacao_webhook

# WhatsApp Business API
WHATSAPP_PHONE_NUMBER_ID=574293335763643
WHATSAPP_ACCESS_TOKEN=seu_token_permanente_whatsapp

# Domínio (se tiver)
CORS_ALLOWED_ORIGINS=https://seudominio.com
```

### 3. Deploy da Aplicação

```bash
./deploy.sh deploy
```

Este comando:
- Para containers existentes
- Constrói nova imagem Docker
- Inicia todos os serviços
- Executa health checks
- Mostra informações de acesso

## 🔧 Comandos de Gerenciamento

```bash
# Deploy/Redeploy
./deploy.sh deploy

# Ver logs em tempo real
./deploy.sh logs

# Parar serviços
./deploy.sh stop

# Reiniciar serviços
./deploy.sh restart

# Status dos serviços
./deploy.sh status

# Criar backup
./deploy.sh backup

# Configurar SSL
./deploy.sh ssl

# Atualizar do Git
./deploy.sh update
```

## 🏗️ Arquitetura de Deploy

```
Internet
    ↓
[Nginx Reverse Proxy] :80, :443
    ↓
[PyTake Backend API] :8080
    ↓
[PostgreSQL] :5432
[Redis] :6379
```

### Componentes

1. **Nginx**: Reverse proxy, SSL termination, rate limiting
2. **PyTake Backend**: API Rust compilada para produção
3. **PostgreSQL**: Banco de dados principal
4. **Redis**: Cache e filas de mensagens

## 🔒 Segurança

### Configurações de Segurança Implementadas

- **Firewall**: Apenas portas 22, 80, 443 abertas
- **Fail2ban**: Proteção contra ataques de força bruta
- **Non-root containers**: Aplicação roda como usuário não-privilegiado
- **Rate limiting**: Nginx limita requisições por IP
- **CORS**: Configurado para domínios específicos
- **SSL/TLS**: Suporte a Let's Encrypt

### Senha Padrão
```
Email: admin@pytake.com
Senha: admin123
```
**⚠️ IMPORTANTE: Altere esta senha imediatamente após o primeiro login!**

## 🔄 Configuração do WhatsApp

### 1. Configurar Webhook

No Meta Business Dashboard:
```
URL do Webhook: https://seudominio.com/api/webhooks/whatsapp
Verify Token: o_valor_que_você_colocou_no_WHATSAPP_WEBHOOK_VERIFY_TOKEN
```

### 2. Testar Integração

```bash
# Health check
curl https://seudominio.com/health

# Teste de envio de mensagem
curl -X POST https://seudominio.com/api/v1/whatsapp/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_JWT_TOKEN" \
  -d '{
    "to": "+5561994013828",
    "message": "Teste do PyTake em produção!",
    "type": "text"
  }'
```

## 📊 Monitoramento

### Logs
```bash
# Ver logs de todos os serviços
docker-compose -f docker-compose.production.yml logs -f

# Logs específicos
docker logs pytake-backend -f
docker logs pytake-nginx -f
docker logs pytake-postgres -f
```

### Métricas

- **Health Check**: `GET /health`
- **WebSocket Stats**: `GET /api/v1/ws/stats`
- **Sistema**: `htop`, `docker stats`

## 💾 Backup e Restauração

### Backup Automático
```bash
./deploy.sh backup
```

Cria backup em `./backups/YYYYMMDD_HHMMSS/`:
- Database dump (PostgreSQL)
- Arquivos de upload
- Configurações

### Restauração
```bash
# Restaurar database
docker-compose -f docker-compose.production.yml exec postgres psql -U pytake -d pytake_production < backup/database.sql

# Restaurar uploads
cp -r backup/uploads/* ./uploads/
```

## 🚨 Troubleshooting

### Problemas Comuns

1. **Containers não startam**
   ```bash
   docker-compose -f docker-compose.production.yml logs
   ```

2. **Erro de conexão com banco**
   - Verifique se PostgreSQL está rodando
   - Confira credenciais no .env

3. **WhatsApp webhook falha**
   - Verifique se o verify token está correto
   - Teste conectividade: `curl https://seudominio.com/api/webhooks/whatsapp`

4. **SSL não funciona**
   - Execute: `./deploy.sh ssl`
   - Verifique DNS do domínio

### Debug Mode

Para mais logs detalhados:
```bash
# No .env.production.local
RUST_LOG=debug,simple_api=trace
```

## 📈 Otimizações de Performance

### Configurações Aplicadas

- **Nginx**: Gzip, keepalive, cache
- **PostgreSQL**: Conexões otimizadas
- **Redis**: Memory policies configuradas
- **Docker**: Limites de recursos

### Monitoramento de Performance

```bash
# CPU e Memória
htop
docker stats

# Rede
nethogs
iotop

# Aplicação
curl https://seudominio.com/api/v1/ws/stats
```

## 🔄 Atualizações

### Atualização Automática
```bash
./deploy.sh update
```

### Atualização Manual
```bash
git pull origin main
./deploy.sh deploy
```

## 📞 Suporte

### Logs Importantes
- Application: `docker logs pytake-backend`
- Nginx: `docker logs pytake-nginx`
- Database: `docker logs pytake-postgres`

### Contatos
- Email: admin@pytake.com
- WhatsApp Test: +5561994013828

---

**✅ Checklist Final de Deploy:**

- [ ] Servidor configurado com `server-setup.sh`
- [ ] Arquivo `.env.production.local` configurado
- [ ] Senhas padrão alteradas
- [ ] Deploy executado com sucesso
- [ ] Health check respondendo
- [ ] WhatsApp webhook configurado
- [ ] SSL configurado (se usando domínio)
- [ ] Backup testado
- [ ] Monitoramento verificado

🎉 **PyTake está pronto para produção!**