# PyTake Development Server Deployment Guide

Este guia fornece instruções para fazer deploy do PyTake em servidor de desenvolvimento com hostname e SSL.

## 🚀 Quick Start

### Pré-requisitos
- Servidor Ubuntu/Debian 20.04+ com IP público
- Domínio/hostname apontando para o IP do servidor
- Acesso root/sudo ao servidor

### Deploy Rápido

1. **Preparar o servidor:**
```bash
# Execute no servidor como root
wget https://raw.githubusercontent.com/xkayo32/pytake-backend/main/server-setup.sh
chmod +x server-setup.sh
sudo ./server-setup.sh
```

2. **Configurar hostname:**
```bash
# Definir hostname do servidor
echo 'seu-hostname.com' > /etc/hostname
hostnamectl set-hostname seu-hostname.com
```

3. **Fazer deploy da aplicação:**
```bash
# Execute como usuário pytake
cd /home/pytake
git clone https://github.com/xkayo32/pytake-backend.git pytake
cd pytake
cp .env.development .env.development.local
nano .env.development.local  # Configure seu hostname
./deploy.sh ssl              # Configurar SSL primeiro
./deploy.sh deploy          # Deploy da aplicação
```

4. **Acesse sua aplicação:**
```
https://seu-hostname.com
```

## 📋 Configuração Detalhada

### 1. Configuração de Environment

Edite `.env.development.local`:
```bash
# Hostname/Domain Configuration
SERVER_IP=SEU_IP_DO_SERVIDOR
DOMAIN_NAME=seu-hostname.com

# Database (já configurado para desenvolvimento)
POSTGRES_USER=pytake_dev
POSTGRES_PASSWORD=pytake_dev_password_123
POSTGRES_DB=pytake_development

# Redis (já configurado)
REDIS_PASSWORD=redis_dev_password_123

# WhatsApp (credenciais reais já configuradas)
WHATSAPP_PHONE_NUMBER_ID=574293335763643
WHATSAPP_ACCESS_TOKEN=EAAJLLK95RIUBPBxhYMQQGrHFhhVTgGrdMKLDbTXK3p1udVslhZBkVMgzF4MfBIklsRVZAKXu9sHqpELTaZAZAEDuctKSFFGnPYDXQUU1tq9fa2M20vGtApxp5zdIH39pQyIxEUwm4Mm2e7EfNTOtqnNVSoZAFoJZBv0sheUaMyCXSKzOhr0U9vQMCrN1kBiRMkqQZDZD
WHATSAPP_WEBHOOK_VERIFY_TOKEN=verify_token_dev_123

# CORS (permissivo para desenvolvimento)
CORS_ALLOWED_ORIGINS=*

# Logs (verbose para desenvolvimento)
RUST_LOG=debug,simple_api=trace
```

### 2. Configurar SSL com Let's Encrypt

```bash
./deploy.sh ssl
```

O script irá:
- Parar temporariamente o nginx
- Obter certificado SSL via certbot
- Configurar certificados
- Reiniciar nginx com HTTPS

### 3. Configurar Nginx para seu Hostname

Edite `nginx.conf` e altere:
```nginx
server_name your-hostname.com;  # Mude para seu hostname real
```

## 🔧 Comandos de Gerenciamento

```bash
# Deploy/Redeploy
./deploy.sh deploy

# Configurar SSL
./deploy.sh ssl

# Ver logs em tempo real
./deploy.sh logs

# Status dos serviços
./deploy.sh status

# Backup
./deploy.sh backup

# Parar/Reiniciar
./deploy.sh stop
./deploy.sh restart
```

## 📱 Configuração do WhatsApp

### 1. Configurar Webhook no Meta Business

```
URL do Webhook: https://seu-hostname.com/api/webhooks/whatsapp
Verify Token: verify_token_dev_123
```

**⚠️ IMPORTANTE: WhatsApp exige HTTPS para webhooks!**

### 2. Testar Integração

```bash
# Health check
curl https://seu-hostname.com/health

# Teste de envio (precisa de JWT token)
curl -X POST https://seu-hostname.com/api/v1/whatsapp/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_JWT_TOKEN" \
  -d '{
    "to": "+5561994013828",
    "message": "Teste do servidor de desenvolvimento!",
    "type": "text"
  }'

# Login para obter token
curl -X POST https://seu-hostname.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@pytake.com",
    "password": "admin123"
  }'
```

## 🏗️ Arquitetura de Deploy

```
Internet (HTTPS)
    ↓
[Nginx SSL Termination] :443, :80
    ↓
[PyTake Backend API] :8080
    ↓
[PostgreSQL] :5432
[Redis] :6379
```

### Componentes

1. **Nginx**: SSL termination, reverse proxy, rate limiting
2. **PyTake Backend**: API Rust com logs debug
3. **PostgreSQL**: Banco de desenvolvimento
4. **Redis**: Cache e filas
5. **Let's Encrypt**: SSL gratuito

## 🔒 Segurança Configurada

- **SSL/TLS**: Certificados Let's Encrypt automáticos
- **Firewall**: Apenas 22, 80, 443 abertas
- **Fail2ban**: Proteção contra brute force
- **Rate limiting**: Nginx limita requests
- **Non-root**: Containers rodam sem privilégios

## 📊 Endpoints Disponíveis

### Desenvolvimento
- `GET https://seu-hostname.com/health` - Health check
- `GET https://seu-hostname.com/api/v1/ws/stats` - WebSocket stats
- `POST https://seu-hostname.com/api/v1/auth/login` - Login

### WhatsApp
- `POST https://seu-hostname.com/api/webhooks/whatsapp` - Webhook
- `POST https://seu-hostname.com/api/v1/whatsapp/send` - Enviar mensagem
- `GET https://seu-hostname.com/api/v1/whatsapp/config` - Config

### WebSocket
- `wss://seu-hostname.com/ws` - Conexão WebSocket

## 🚨 Troubleshooting

### SSL não funciona
```bash
# Verificar certificados
sudo certbot certificates

# Renovar certificados
sudo certbot renew

# Verificar nginx config
sudo nginx -t

# Reconfigurar SSL
./deploy.sh ssl
```

### Webhook WhatsApp falha
1. Verificar se webhook URL está com HTTPS
2. Testar manualmente:
   ```bash
   curl -X POST https://seu-hostname.com/api/webhooks/whatsapp \
     -H "Content-Type: application/json" \
     -d '{"test": "webhook"}'
   ```
3. Verificar logs: `./deploy.sh logs`

### Containers não startam
```bash
# Ver logs detalhados
docker-compose logs backend
docker-compose logs postgres
docker-compose logs nginx

# Recriar containers
docker-compose down
docker-compose up -d --build
```

## 🔄 Atualizações

```bash
# Atualizar código
git pull origin master
./deploy.sh deploy

# Ou usar comando direto
./deploy.sh update
```

## 📋 Checklist de Deploy

- [ ] ✅ Servidor configurado com `server-setup.sh`
- [ ] ✅ Hostname configurado no sistema
- [ ] ✅ DNS apontando para IP do servidor
- [ ] ✅ Arquivo `.env.development.local` configurado
- [ ] ✅ SSL configurado com `./deploy.sh ssl`
- [ ] ✅ Deploy realizado com `./deploy.sh deploy`
- [ ] ✅ Health check respondendo: `curl https://seu-hostname.com/health`
- [ ] ✅ WhatsApp webhook configurado no Meta Business
- [ ] ✅ Teste de envio de mensagem funcionando
- [ ] ✅ Login admin testado: admin@pytake.com / admin123

## 📞 Credenciais de Desenvolvimento

### Login Admin
- **Email**: admin@pytake.com
- **Senha**: admin123

### WhatsApp Test
- **Número**: +5561994013828
- **Phone ID**: 574293335763643
- **Webhook Token**: verify_token_dev_123

### Banco de Dados
- **Usuário**: pytake_dev
- **Senha**: pytake_dev_password_123
- **Database**: pytake_development

---

🎉 **Servidor de desenvolvimento PyTake pronto com SSL!**

Acesse: `https://seu-hostname.com`