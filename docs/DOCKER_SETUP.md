# 🐳 Docker Setup - PyTake

Guia para executar o PyTake com Docker Compose.

## 📋 Pré-requisitos

- Docker 20.10+
- Docker Compose V2+

## 🚀 Início Rápido

```bash
# 1. Iniciar todos os serviços
docker compose up -d

# 2. Executar migrations do banco de dados (IMPORTANTE - primeira vez)
docker compose exec backend alembic upgrade head

# 3. Verificar status
docker compose ps
```

## 🌐 URLs de Acesso

- **Frontend (Next.js)**: http://localhost:3001
- **Backend API (FastAPI)**: http://localhost:8000
- **API Docs (Swagger)**: http://localhost:8000/docs
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379
- **MongoDB**: localhost:27018

## 📦 Serviços

| Serviço | Container | Porta | Status |
|---------|-----------|-------|--------|
| Frontend | pytake-frontend | 3001 | ✅ |
| Backend | pytake-backend | 8000 | ✅ |
| PostgreSQL | pytake-postgres | 5432 | ✅ |
| Redis | pytake-redis | 6379 | ✅ |
| MongoDB | pytake-mongodb | 27018 | ✅ |

## 🔧 Comandos Úteis

### Gerenciamento de Serviços

```bash
# Iniciar todos os serviços
docker compose up -d

# Ver logs em tempo real
docker compose logs -f

# Ver logs de um serviço específico
docker compose logs -f backend
docker compose logs -f frontend

# Parar todos os serviços
docker compose down

# Parar e remover volumes (CUIDADO: apaga dados)
docker compose down -v

# Reiniciar um serviço
docker compose restart backend
```

### Migrations do Banco de Dados

```bash
# Ver versão atual da migration
docker compose exec backend alembic current

# Aplicar todas as migrations
docker compose exec backend alembic upgrade head

# Criar nova migration (auto-detect mudanças)
docker compose exec backend alembic revision --autogenerate -m "descrição"

# Voltar uma migration
docker compose exec backend alembic downgrade -1

# Ver histórico de migrations
docker compose exec backend alembic history
```

### Desenvolvimento

```bash
# Reconstruir imagens (após mudanças no Dockerfile ou requirements)
docker compose build

# Reconstruir sem cache
docker compose build --no-cache

# Executar comando no backend
docker compose exec backend python -c "from app.main import app; print(app.title)"

# Acessar shell do backend
docker compose exec backend bash

# Instalar nova dependência no backend
docker compose exec backend pip install nome-pacote
# Depois adicionar ao requirements.txt e rebuild

# Acessar shell do frontend
docker compose exec frontend sh

# Instalar nova dependência no frontend
docker compose exec frontend npm install nome-pacote
```

### Banco de Dados

```bash
# Conectar ao PostgreSQL
docker compose exec postgres psql -U pytake -d pytake_dev

# Conectar ao Redis CLI
docker compose exec redis redis-cli

# Conectar ao MongoDB
docker compose exec mongodb mongosh
```

## 🐛 Troubleshooting

### Backend não inicia - Erro de CORS

Se ver erro relacionado a `CORS_ORIGINS`:
- Verificar que `backend/.env.docker` existe
- O Docker Compose usa `.env.docker` em vez de `.env`

### Erro "relation does not exist"

Significa que as migrations não foram executadas:

```bash
docker compose exec backend alembic upgrade head
```

### Porta já em uso

Se a porta 3000 ou 8000 já estiver em uso:

```bash
# Verificar o que está usando a porta
lsof -i :3000
lsof -i :8000

# Matar processo ou mudar porta no docker-compose.yml
```

### Resetar tudo

```bash
# Parar e remover tudo
docker compose down -v

# Reconstruir e iniciar
docker compose build --no-cache
docker compose up -d

# Executar migrations
docker compose exec backend alembic upgrade head
```

## 📝 Variáveis de Ambiente

### Backend (.env.docker)

As principais variáveis estão em `backend/.env.docker`:

```bash
# Database
POSTGRES_SERVER=postgres
POSTGRES_PORT=5432
POSTGRES_USER=pytake
POSTGRES_PASSWORD=pytake_dev_password
POSTGRES_DB=pytake_dev

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# MongoDB
MONGODB_URL=mongodb://mongodb:27017
MONGODB_DB=pytake_logs

# Security
SECRET_KEY=your-secret-key
JWT_SECRET_KEY=your-jwt-secret
```

### Frontend (.env.local)

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

## 🔐 Primeiro Acesso

1. Acesse http://localhost:3001/register
2. Crie uma conta (será criada uma organização automaticamente)
3. Faça login em http://localhost:3001/login
4. Comece a usar!

## 🏗️ Arquitetura

```
┌─────────────┐     ┌─────────────┐
│  Frontend   │────▶│   Backend   │
│  Next.js    │     │   FastAPI   │
│   :3001     │     │    :8000    │
└─────────────┘     └─────────────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
         ┌─────────┐  ┌────────┐  ┌─────────┐
         │PostgreSQL│  │ Redis  │  │ MongoDB │
         │  :5432   │  │ :6379  │  │ :27018  │
         └─────────┘  └────────┘  └─────────┘
```

## 📚 Próximos Passos

- Ver [CLAUDE.md](CLAUDE.md) para detalhes de desenvolvimento
- Ver [API_DOCUMENTATION.md](API_DOCUMENTATION.md) para referência da API
- Ver [ARCHITECTURE.md](ARCHITECTURE.md) para arquitetura detalhada
