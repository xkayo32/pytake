# PyTake Production Deployment Guide

## 🚀 Deploy para api.pytake.net

Este guia mostra como fazer o deploy da aplicação PyTake em produção usando Docker.

## ⚡ Deploy Rápido

### 1. Preparar ambiente

```bash
# Dar permissão para o script (Linux/Mac)
chmod +x deploy-production.sh

# Revisar configurações de produção
nano .env.production
```

### 2. Deploy da aplicação

```bash
# Deploy completo
./deploy-production.sh

# Ou apenas:
./deploy-production.sh deploy
```

### 3. Testar

```bash
# Testar localmente
curl http://localhost/health

# Testar domínio (após configuração DNS)
curl http://api.pytake.net/health

# Ver documentação
open http://api.pytake.net/docs
```

## 📋 Comandos Disponíveis

```bash
./deploy-production.sh deploy    # Deploy completo (padrão)
./deploy-production.sh ssl       # Configurar SSL/HTTPS
./deploy-production.sh logs      # Ver logs
./deploy-production.sh stop      # Parar serviços
./deploy-production.sh restart   # Reiniciar serviços
./deploy-production.sh status    # Status dos containers
./deploy-production.sh test      # Testar endpoints
```

## 🔧 Manual Deploy (Alternativo)

Se o script não funcionar, use os comandos Docker diretamente:

```bash
# 1. Parar containers existentes
docker-compose -f docker-compose.production.yml down

# 2. Build e start
docker-compose -f docker-compose.production.yml --env-file .env.production build --no-cache
docker-compose -f docker-compose.production.yml --env-file .env.production up -d

# 3. Verificar status
docker-compose -f docker-compose.production.yml ps

# 4. Ver logs
docker-compose -f docker-compose.production.yml logs -f
```

## 🌐 URLs de Produção

Após o deploy bem-sucedido:

- **API Principal**: http://api.pytake.net/
- **Health Check**: http://api.pytake.net/health  
- **Swagger UI**: http://api.pytake.net/docs
- **ReDoc**: http://api.pytake.net/redoc
- **RapiDoc**: http://api.pytake.net/rapidoc

## 🔐 Configurar HTTPS (Recomendado)

```bash
# Instalar certificado SSL com Let's Encrypt
./deploy-production.sh ssl

# Inserir email quando solicitado
```

## 🔍 Verificar Deploy

```bash
# Status dos containers
docker ps

# Logs em tempo real
docker-compose -f docker-compose.production.yml logs -f backend

# Testar API
curl -X GET "http://api.pytake.net/health" -H "accept: application/json"
```

## 🛠️ Resolução de Problemas

### Container não inicia

```bash
# Ver logs detalhados
docker-compose -f docker-compose.production.yml logs backend
docker-compose -f docker-compose.production.yml logs nginx
```

### Banco de dados não conecta

```bash
# Verificar PostgreSQL
docker-compose -f docker-compose.production.yml logs postgres

# Testar conexão
docker exec -it pytake-postgres psql -U pytake -d pytake -c "SELECT version();"
```

### Nginx não responde

```bash
# Ver configuração gerada
docker exec pytake-nginx cat /etc/nginx/nginx.conf

# Testar configuração
docker exec pytake-nginx nginx -t
```

## 📂 Estrutura dos Arquivos

```
pytake/
├── docker-compose.production.yml  # Compose para produção
├── .env.production                 # Variáveis de ambiente
├── nginx-http.Dockerfile           # Dockerfile Nginx HTTP
├── nginx-http-only.conf.template   # Template Nginx HTTP
├── deploy-production.sh            # Script de deploy
└── DEPLOY-PRODUCTION.md            # Este guia
```

## 🔄 Atualizações

```bash
# Para atualizar a aplicação:
git pull origin main
./deploy-production.sh deploy
```

## 🚨 Importante

1. **DNS**: Configure o DNS de `api.pytake.net` para apontar para o IP do servidor
2. **Firewall**: Abra as portas 80 e 443 no firewall
3. **SSL**: Configure HTTPS após o deploy HTTP funcionar
4. **Backup**: Faça backup regular do banco de dados
5. **Monitoramento**: Configure monitoramento dos containers

## 📞 Suporte

Em caso de problemas:

1. Verifique os logs: `./deploy-production.sh logs`
2. Teste localmente: `curl http://localhost/health`
3. Verifique o DNS: `nslookup api.pytake.net`
4. Verifique as portas: `netstat -tulpn | grep :80`