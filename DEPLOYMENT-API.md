# PyTake API Deployment Guide - api.pytake.net

## 🌐 Configuração do Domínio

Este servidor está configurado para responder no domínio **api.pytake.net**

### URLs de Acesso (SEM PORTAS!):

#### HTTP (Desenvolvimento):
- **API**: http://api.pytake.net
- **Swagger UI**: http://api.pytake.net/docs
- **ReDoc**: http://api.pytake.net/redoc
- **Health Check**: http://api.pytake.net/health
- **WebSocket**: ws://api.pytake.net/ws

#### HTTPS (Produção):
- **API**: https://api.pytake.net
- **Swagger UI**: https://api.pytake.net/docs
- **ReDoc**: https://api.pytake.net/redoc
- **Health Check**: https://api.pytake.net/health
- **WebSocket**: wss://api.pytake.net/ws

## 🚀 Quick Start

### 1. Configurar DNS
Certifique-se de que o domínio `api.pytake.net` está apontando para o IP deste servidor.

```bash
# Verificar DNS
nslookup api.pytake.net
dig api.pytake.net
```

### 2. Iniciar sem SSL (Desenvolvimento)
```bash
# Iniciar todos os serviços
./docker-start.sh start

# Verificar status
./docker-start.sh status

# Ver logs
./docker-start.sh logs
```

### 3. Configurar SSL (Produção)
```bash
# Executar script de configuração SSL
sudo ./setup-ssl.sh

# O script irá:
# - Instalar certbot
# - Obter certificado Let's Encrypt para api.pytake.net
# - Configurar renovação automática
# - Reiniciar serviços com HTTPS
```

## 📊 Portas Configuradas

| Serviço | Porta Externa | Porta Interna | Descrição |
|---------|---------------|---------------|-----------|
| Nginx HTTP | **80** | 80 | Proxy reverso HTTP (padrão) |
| Nginx HTTPS | **443** | 443 | Proxy reverso HTTPS (padrão) |
| API Backend | 8789 | 8789 | API direta (apenas interno) |
| PostgreSQL | 8543 | 5432 | Banco de dados |
| Redis | 6379 | 6379 | Cache e filas |

**Nota**: O sistema usa as portas padrão 80/443, permitindo acesso direto via `api.pytake.net` sem especificar portas!

## 🔧 Configuração de Ambiente

O arquivo `.env` já está configurado com:
- `SERVER_NAME=api.pytake.net`
- `DOMAIN_NAME=api.pytake.net`
- Portas padrão HTTP/HTTPS (80/443)

## 🔒 Configuração SSL/TLS

### Obter Certificado SSL
```bash
# Método automático (recomendado)
sudo ./setup-ssl.sh

# Método manual
sudo certbot certonly --standalone -d api.pytake.net
```

### Renovação do Certificado
O certificado Let's Encrypt é renovado automaticamente via cron job.

Para renovar manualmente:
```bash
sudo certbot renew
# Copiar certificados para ./ssl/
sudo cp /etc/letsencrypt/live/api.pytake.net/fullchain.pem ./ssl/cert.pem
sudo cp /etc/letsencrypt/live/api.pytake.net/privkey.pem ./ssl/key.pem
# Reiniciar nginx
docker-compose restart nginx
```

## 📱 Configuração WhatsApp Webhook

Configure no Meta Business o webhook para:
- **URL**: https://api.pytake.net/api/webhooks/whatsapp
- **Verify Token**: Use o valor de `WHATSAPP_WEBHOOK_VERIFY_TOKEN` do `.env`

## 🧪 Testes

### Teste Local
```bash
# Health check local
curl http://localhost/health

# API local (direta, sem Nginx)
curl http://localhost:8789/health
```

### Teste Remoto (SEM PORTAS!)
```bash
# HTTP
curl http://api.pytake.net/health

# HTTPS
curl https://api.pytake.net/health
```

### Teste de API com Autenticação
```bash
# Login (SEM PORTA!)
curl -X POST http://api.pytake.net/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@pytake.com",
    "password": "admin123"
  }'

# Use o token retornado para chamadas autenticadas
```

## 🐳 Comandos Docker

```bash
# Iniciar sistema
./docker-start.sh start

# Parar sistema
./docker-start.sh stop

# Reiniciar
./docker-start.sh restart

# Reconstruir
./docker-start.sh rebuild

# Ver logs
./docker-start.sh logs [serviço]

# Status
./docker-start.sh status

# Shell em container
./docker-start.sh shell [serviço]

# Limpar tudo
./docker-start.sh clean
```

## 📈 Monitoramento

### Logs em Tempo Real
```bash
# Todos os serviços
docker-compose logs -f

# Serviço específico
docker-compose logs -f backend
docker-compose logs -f nginx
docker-compose logs -f postgres
```

### Métricas (SEM PORTAS!)
- **Health Check**: http://api.pytake.net/health
- **API Metrics**: http://api.pytake.net/api/v1/dashboard/metrics
- **WebSocket Stats**: http://api.pytake.net/api/v1/ws/stats

## 🚨 Troubleshooting

### Problema: Domínio não responde
```bash
# Verificar DNS
nslookup api.pytake.net

# Verificar firewall
sudo ufw status

# Verificar se as portas estão abertas
sudo netstat -tlnp | grep -E '80|443|8789'

# Verificar se o Nginx está escutando
sudo lsof -i :80
sudo lsof -i :443
```

### Problema: SSL não funciona
```bash
# Verificar certificados
sudo certbot certificates

# Verificar nginx
docker-compose logs nginx

# Testar configuração nginx
docker-compose exec nginx nginx -t
```

### Problema: API não responde
```bash
# Verificar backend
docker-compose logs backend

# Verificar conectividade com banco
docker-compose exec backend ping postgres

# Reiniciar serviços
./docker-start.sh restart
```

## 🔐 Segurança

### Firewall
```bash
# Abrir portas necessárias
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw allow 22/tcp   # SSH

# Ativar firewall
sudo ufw enable
```

### Backup
```bash
# Backup do banco de dados
docker-compose exec postgres pg_dump -U pytake pytake > backup.sql

# Backup completo
tar -czf pytake-backup-$(date +%Y%m%d).tar.gz \
  .env \
  ./ssl \
  ./uploads \
  backup.sql
```

## 📞 Suporte

Para problemas ou dúvidas:
- **Email**: admin@pytake.net
- **Documentação API**: http://api.pytake.net/docs
- **GitHub**: https://github.com/pytake/backend

---

## 🎯 Resumo da Configuração

**✅ ACESSO DIRETO SEM PORTAS!**

- ✅ Acesse `http://api.pytake.net` diretamente (porta 80)
- ✅ Acesse `https://api.pytake.net` com SSL (porta 443)
- ✅ Não é necessário especificar portas na URL
- ✅ Sistema configurado nas portas padrão HTTP/HTTPS

**Última atualização**: Configurado para api.pytake.net nas portas padrão (80/443)