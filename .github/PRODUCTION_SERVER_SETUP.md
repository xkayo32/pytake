# Production Server Setup - Step-by-Step Guide

Este guia fornece instruções precisas para configurar o servidor production para PyTake.

## 📋 Pré-requisitos

- [ ] Servidor Linux (Ubuntu 20.04+ ou similar)
- [ ] Acesso root ou sudo
- [ ] IP público (ex: 209.105.242.206)
- [ ] Domínio configurado (ex: api.pytake.net, app.pytake.net)
- [ ] 4GB RAM mínimo, 20GB SSD
- [ ] SSH acesso disponível

## 🔧 Configuração do Servidor

### Fase 1: Preparação Inicial (como root)

#### 1.1 - Atualizar sistema

```bash
# SSH para servidor
ssh root@209.105.242.206

# Atualizar
apt-get update && apt-get upgrade -y
```

#### 1.2 - Criar usuário de deploy

```bash
# Criar usuário
useradd -m -s /bin/bash deploy

# Definir permissões sudo sem senha (APENAS para docker e compostos)
echo "deploy ALL=(ALL) NOPASSWD: /usr/bin/docker, /usr/local/bin/docker-compose, /bin/systemctl" | sudo tee -a /etc/sudoers.d/deploy-docker

# Adicionar deploy ao grupo docker
usermod -aG docker deploy
```

#### 1.3 - Configurar SSH para deploy user

```bash
# Criar diretório .ssh
mkdir -p /home/deploy/.ssh
chmod 700 /home/deploy/.ssh

# Definir permissions corretas
chown deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh

# Adicionar chave pública (será copiada em 1.4)
# Por enquanto, deixar pronto para receber
touch /home/deploy/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys
chown deploy:deploy /home/deploy/.ssh/authorized_keys
```

#### 1.4 - Copiar chave pública SSH (do seu computador local)

```bash
# NO SEU COMPUTADOR LOCAL:
cat ~/.ssh/pytake_deploy.pub | ssh -i ~/.ssh/pytake_deploy deploy@209.105.242.206 "cat >> ~/.ssh/authorized_keys"

# Validar que funcionou:
ssh -i ~/.ssh/pytake_deploy deploy@209.105.242.206 "echo '✅ SSH funcionando'"
```

### Fase 2: Instalar Docker e Docker Compose (como root)

#### 2.1 - Instalar Docker

```bash
# SSH como root
ssh root@209.105.242.206

# Instalar Docker (Ubuntu 20.04+)
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
rm get-docker.sh

# Validar
docker --version
docker ps
```

#### 2.2 - Instalar Docker Compose

```bash
# Instalar versão latest
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Validar
docker-compose --version

# Criar alias para compatibilidade
ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose
```

#### 2.3 - Adicionar deploy user ao grupo docker

```bash
usermod -aG docker deploy

# Aplicar imediatamente (sem logout)
su - deploy -c "docker ps"
```

### Fase 3: Preparar diretórios e permissões (como deploy user)

#### 3.1 - Criar estrutura de diretórios

```bash
# SSH como deploy user
ssh -i ~/.ssh/pytake_deploy deploy@209.105.242.206

# Criar diretórios
mkdir -p /opt/pytake
mkdir -p /opt/pytake/logs
mkdir -p /opt/pytake/backups
mkdir -p /opt/pytake/config

# Estrutura esperada
tree /opt/pytake -L 1
# /opt/pytake/
# ├── logs/
# ├── backups/
# ├── config/
# ├── docker-compose.yml  (será clonado)
# ├── .env               (será criado)
# └── ... (código do repositório)
```

#### 3.2 - Clone do repositório

```bash
# SSH como deploy user
ssh -i ~/.ssh/pytake_deploy deploy@209.105.242.206

# Entrar no diretório
cd /opt/pytake

# Clonar repositório (usar deploy key se necessário)
git clone https://github.com/xkayo32/pytake.git .

# Ou, se usando SSH key para GitHub:
git clone git@github.com:xkayo32/pytake.git .

# Validar
ls -la
# Deve ter: docker-compose.yml, backend/, frontend/, etc.
```

#### 3.3 - Criar arquivo .env production

```bash
# Criar .env baseado em exemplo
cat > /opt/pytake/.env << 'EOF'
# Backend Configuration
ENVIRONMENT=production
BACKEND_CORS_ORIGINS=https://app.pytake.net,https://api.pytake.net
DATABASE_URL=postgresql://pytake:STRONG_PASSWORD@postgres:5432/pytake
REDIS_URL=redis://redis:6379/0
MONGODB_URL=mongodb://mongodb:27017/pytake

# JWT Configuration
SECRET_KEY=YOUR_RANDOM_SECRET_KEY_HERE
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# WhatsApp Configuration (se configurado)
WHATSAPP_API_KEY=YOUR_KEY_HERE

# Frontend Configuration
NEXT_PUBLIC_API_URL=https://api.pytake.net/api/v1
NEXT_PUBLIC_WS_URL=wss://api.pytake.net

# Logging
LOG_LEVEL=INFO
EOF

# ⚠️ IMPORTANTE: Substituir valores placeholder com dados reais
# Gerar SECRET_KEY:
# openssl rand -hex 32
```

#### 3.4 - Validar arquivo .env

```bash
# Verificar que foi criado
cat /opt/pytake/.env | head -20

# Garantir permissões corretas
chmod 600 /opt/pytake/.env
```

### Fase 4: Configurar Docker Compose e Volumes (como deploy user)

#### 4.1 - Criar volumes persistentes

```bash
# Criar volumes Docker
docker volume create pytake-postgres-data
docker volume create pytake-redis-data
docker volume create pytake-mongodb-data

# Listar volumes criados
docker volume ls | grep pytake
```

#### 4.2 - Validar docker-compose.yml

```bash
# Verificar sintaxe do docker-compose.yml
cd /opt/pytake
docker-compose config > /dev/null && echo "✅ docker-compose.yml válido"

# Ver resumo dos serviços
docker-compose config --services
# Esperado: backend, frontend, postgres, redis, mongodb, nginx
```

#### 4.3 - Build das imagens (se necessário)

```bash
# Opção 1: Usar imagens do GitHub Container Registry
docker-compose pull

# Opção 2: Build local (mais lento, ~10-15 minutos)
docker-compose build --no-cache
```

### Fase 5: Iniciar os serviços

#### 5.1 - Primeira execução

```bash
cd /opt/pytake

# Iniciar todos os serviços
docker-compose up -d

# Acompanhar logs
docker-compose logs -f backend frontend nginx
```

#### 5.2 - Executar migrações

```bash
# Aguardar que banco esteja pronto (30-60 segundos)
sleep 30

# Executar migrações
docker-compose exec backend alembic upgrade head

# Validar que migrações completaram
echo "✅ Migrações executadas"
```

#### 5.3 - Teste de saúde

```bash
# Health check backend
curl -s https://api.pytake.net/api/v1/health | jq .
# Esperado: {"status":"ok"}

# Health check frontend
curl -s -I https://app.pytake.net | head -n 1
# Esperado: HTTP/2 200 OK
```

### Fase 6: Configurar SSL/TLS (se não existente)

#### 6.1 - Instalar Certbot (em docker ou localmente)

```bash
# Opção 1: Dentro do container nginx
docker-compose exec -T nginx certbot certonly --webroot -w /usr/share/nginx/html \
  -d api.pytake.net -d app.pytake.net

# Opção 2: Localmente (no host)
sudo apt-get install certbot python3-certbot-nginx -y
sudo certbot certonly --webroot -w /opt/pytake/certbot/www \
  -d api.pytake.net -d app.pytake.net
```

#### 6.2 - Configurar renovação automática

```bash
# Se SSL via certbot local
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Se SSL em docker, adicionar ao crontab:
(crontab -l 2>/dev/null; echo "0 3 * * * cd /opt/pytake && docker-compose exec -T nginx certbot renew --quiet") | crontab -
```

### Fase 7: Configurar Logs e Monitoramento

#### 7.1 - Configurar rotação de logs

```bash
# Criar arquivo de rotação
sudo tee /etc/logrotate.d/pytake > /dev/null << 'EOF'
/opt/pytake/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 deploy deploy
    sharedscripts
    postrotate
        docker-compose -f /opt/pytake/docker-compose.yml kill -s HUP backend || true
    endscript
}
EOF

# Testar rotação
sudo logrotate -f /etc/logrotate.d/pytake
```

#### 7.2 - Configurar health check automático

```bash
# Criar script de health check
cat > /home/deploy/health-check.sh << 'EOF'
#!/bin/bash
set -e

echo "🏥 PyTake Health Check - $(date)"

cd /opt/pytake

# Check Docker services
for service in backend frontend postgres redis nginx; do
    STATUS=$(docker-compose ps --services --filter "status=running" | grep -c $service || echo "0")
    if [ "$STATUS" -gt 0 ]; then
        echo "✅ $service running"
    else
        echo "❌ $service NOT running"
        docker-compose up -d $service
    fi
done

# Check API health
HEALTH=$(curl -s -m 5 https://api.pytake.net/api/v1/health || echo '{"status":"error"}')
if echo "$HEALTH" | jq -e '.status == "ok"' > /dev/null; then
    echo "✅ Backend API healthy"
else
    echo "⚠️  Backend API not responding: $HEALTH"
fi

# Check frontend
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -m 5 https://app.pytake.net)
if [ "$HTTP_STATUS" = "200" ]; then
    echo "✅ Frontend healthy (HTTP $HTTP_STATUS)"
else
    echo "⚠️  Frontend issue (HTTP $HTTP_STATUS)"
fi

echo "✅ Health check completed"
EOF

chmod +x /home/deploy/health-check.sh

# Adicionar ao crontab (executar a cada 5 minutos)
(crontab -l 2>/dev/null; echo "*/5 * * * * /home/deploy/health-check.sh >> /opt/pytake/logs/health-check.log 2>&1") | crontab -
```

### Fase 8: Backup e Recuperação

#### 8.1 - Script de backup

```bash
# Criar script de backup
cat > /home/deploy/backup-database.sh << 'EOF'
#!/bin/bash
set -e

BACKUP_DIR="/opt/pytake/backups"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="$BACKUP_DIR/pytake-backup-$TIMESTAMP.sql"

cd /opt/pytake

# Backup PostgreSQL
docker-compose exec -T postgres pg_dump -U pytake pytake > "$BACKUP_FILE"

# Compress
gzip "$BACKUP_FILE"

# Keep only last 7 backups
find "$BACKUP_DIR" -name "pytake-backup-*.sql.gz" -mtime +7 -delete

echo "✅ Backup created: $BACKUP_FILE.gz"
EOF

chmod +x /home/deploy/backup-database.sh

# Agendar backup diário às 2 da manhã
(crontab -l 2>/dev/null; echo "0 2 * * * /home/deploy/backup-database.sh >> /opt/pytake/logs/backup.log 2>&1") | crontab -
```

#### 8.2 - Restore de backup (manual)

```bash
# Se necessário restaurar
BACKUP_FILE="/opt/pytake/backups/pytake-backup-20240115-020000.sql.gz"

cd /opt/pytake

# Stop services
docker-compose stop backend

# Restore
gunzip -c "$BACKUP_FILE" | docker-compose exec -T postgres psql -U pytake pytake

# Start services
docker-compose up -d backend

echo "✅ Database restored"
```

## ✅ Checklist de Validação

Após completar todas as fases:

```bash
# 1. Verificar containers rodando
docker-compose ps
# Esperado: 6 containers em estado "Up"

# 2. Verificar volumes
docker volume ls | grep pytake
# Esperado: 3 volumes

# 3. Testar connectivity
curl -I https://api.pytake.net/api/v1/health
curl -I https://app.pytake.net

# 4. Verificar logs
docker-compose logs --tail 50 backend

# 5. Validar banco de dados
docker-compose exec postgres psql -U pytake -d pytake -c "\dt"
# Esperado: Múltiplas tabelas listadas

# 6. Teste de login
curl -X POST https://api.pytake.net/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@pytake.net","password":"YOUR_PASSWORD"}'
```

## 🚨 Troubleshooting

### Serviço não inicia

```bash
# Ver logs detalhados
docker-compose logs backend

# Restart
docker-compose restart backend

# Se ainda falhar, rebuild
docker-compose down
docker-compose up -d
```

### Erro de conexão ao banco

```bash
# Verificar se postgres está rodando
docker-compose ps postgres

# Entrar no container postgres
docker-compose exec postgres psql -U pytake

# Ver variáveis de ambiente
docker-compose config | grep -A5 "postgres:"
```

### SSL certificate inválido

```bash
# Renovar certificado
docker-compose exec nginx certbot renew --force-renewal

# Ou locally
sudo certbot renew --force-renewal -d api.pytake.net -d app.pytake.net
```

## 📞 Suporte

Para problemas na configuração:
1. Verificar `.github/GITHUB_SECRETS_SETUP.md`
2. Consultar logs: `docker-compose logs -f`
3. Validar com script: `bash ~/validate-deployment-setup.sh`
4. Manual SSH troubleshooting conforme necessário
