# PyTake Docker Setup

Este guia explica como executar o PyTake usando Docker e Docker Compose.

## Pré-requisitos

- Docker Engine 20.10+
- Docker Compose 2.0+
- 4GB de RAM disponível
- 10GB de espaço em disco

## Configuração Rápida

### 1. Clone o repositório

```bash
git clone https://github.com/seu-usuario/pytake.git
cd pytake
```

### 2. Configure as variáveis de ambiente

```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas configurações:

```env
# Configurações essenciais
POSTGRES_PASSWORD=senha_segura_aqui
REDIS_PASSWORD=outra_senha_segura
JWT_SECRET=chave_jwt_de_64_caracteres_aleatórios

# WhatsApp Business API
WHATSAPP_PHONE_NUMBER_ID=seu_numero_id
WHATSAPP_ACCESS_TOKEN=seu_token_de_acesso
```

### 3. Inicie os serviços

#### Ambiente de Desenvolvimento

```bash
# Inicia todos os serviços com hot reload
docker compose up -d

# Visualiza os logs
docker compose logs -f

# Para apenas backend e banco de dados
docker compose up -d postgres redis backend
```

#### Ambiente de Produção

```bash
# Build das imagens otimizadas
docker compose -f docker-compose.production.yml build

# Inicia os serviços
docker compose -f docker-compose.production.yml up -d

# Executa migrações do banco
docker compose -f docker-compose.production.yml run --rm backend /app/pytake-api migrate
```

## Comandos Úteis

### Gerenciamento de Containers

```bash
# Parar todos os serviços
docker compose down

# Parar e remover volumes (CUIDADO: apaga dados)
docker compose down -v

# Reiniciar um serviço específico
docker compose restart backend

# Ver status dos serviços
docker compose ps

# Executar comando em container
docker compose exec backend bash
```

### Logs e Monitoramento

```bash
# Ver logs de todos os serviços
docker compose logs

# Logs de um serviço específico
docker compose logs backend -f

# Últimas 100 linhas
docker compose logs --tail=100 backend
```

### Banco de Dados

```bash
# Acessar PostgreSQL
docker compose exec postgres psql -U pytake -d pytake

# Backup do banco
docker compose exec postgres pg_dump -U pytake pytake > backup.sql

# Restaurar backup
docker compose exec -T postgres psql -U pytake pytake < backup.sql
```

### Redis

```bash
# Acessar Redis CLI
docker compose exec redis redis-cli -a $REDIS_PASSWORD

# Monitorar comandos Redis
docker compose exec redis redis-cli -a $REDIS_PASSWORD monitor
```

## Ferramentas Adicionais

### PgAdmin (Interface para PostgreSQL)

```bash
# Iniciar PgAdmin
docker compose --profile tools up -d pgadmin

# Acesse: http://localhost:5050
# Login com credenciais do .env
```

### Redis Commander (Interface para Redis)

```bash
# Iniciar Redis Commander
docker compose --profile tools up -d redis-commander

# Acesse: http://localhost:8081
```

## Estrutura de Volumes

```
pytake/
├── postgres_data/     # Dados do PostgreSQL
├── redis_data/        # Dados do Redis
├── media/            # Arquivos de mídia enviados
├── logs/             # Logs da aplicação
└── backups/          # Backups automáticos
```

## Portas Padrão

- **3000**: Frontend (desenvolvimento)
- **8080**: Backend API
- **5432**: PostgreSQL
- **6379**: Redis
- **5050**: PgAdmin (opcional)
- **8081**: Redis Commander (opcional)
- **80/443**: Nginx (produção)

## Troubleshooting

### Container não inicia

```bash
# Verifique os logs
docker compose logs [serviço]

# Verifique se as portas estão disponíveis
netstat -tulpn | grep [porta]
```

### Erro de permissão

```bash
# Ajustar permissões dos volumes
sudo chown -R 1001:1001 ./media ./logs
```

### Banco de dados não conecta

```bash
# Verificar se o PostgreSQL está pronto
docker compose exec postgres pg_isready

# Resetar o banco (CUIDADO: apaga dados)
docker compose down -v
docker compose up -d postgres
```

### Limpar cache Docker

```bash
# Remover imagens não utilizadas
docker image prune -a

# Limpar sistema completo
docker system prune -a --volumes
```

## Segurança

1. **Sempre** altere as senhas padrão no `.env`
2. Use HTTPS em produção (configure no Nginx)
3. Limite acesso aos bancos de dados
4. Faça backups regulares
5. Monitore logs de segurança

## Backup e Restauração

### Backup Automático

```bash
# Ativar serviço de backup (roda diariamente)
docker compose --profile backup up -d backup
```

### Backup Manual

```bash
# Script de backup completo
./scripts/backup.sh

# Backup apenas do banco
docker compose exec postgres pg_dump -U pytake pytake | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

### Restauração

```bash
# Restaurar banco de dados
gunzip -c backup_20240115_120000.sql.gz | docker compose exec -T postgres psql -U pytake pytake
```

## Performance

### Otimizações Recomendadas

1. **PostgreSQL**: Ajuste `shared_buffers` e `work_mem`
2. **Redis**: Configure `maxmemory` e política de evição
3. **Docker**: Use `--cpus` e `--memory` para limitar recursos

### Monitoramento

```bash
# Stats de containers
docker stats

# Uso de disco
df -h
docker system df
```

## Atualização

```bash
# Pull das últimas mudanças
git pull origin main

# Rebuild das imagens
docker compose build --no-cache

# Restart com novas imagens
docker compose up -d

# Executar migrações
docker compose exec backend /app/pytake-api migrate
```