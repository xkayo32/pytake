# PyTake Backend

Sistema multi-tenant para automação WhatsApp Business API.

## Stack

- **Backend**: Node.js Mock API (Rust em desenvolvimento)
- **Frontend**: Next.js 15
- **Database**: PostgreSQL 15
- **Cache**: Redis 7
- **Proxy**: Nginx

## Subdomínios

- **api.pytake.net** - Backend API
- **app.pytake.net** - Frontend Application

## Início Rápido

```bash
# Iniciar todos os serviços
docker-compose up -d

# Verificar status
docker-compose ps

# Ver logs
docker-compose logs -f

# Parar serviços
docker-compose down
```

## Portas

- Backend API: 8080
- Frontend: 3001
- PostgreSQL: 5433
- Redis: 6380

## Desenvolvimento

Branch principal: `main`
Branch de desenvolvimento: `develop`