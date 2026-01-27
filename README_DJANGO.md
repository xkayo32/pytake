# 🚀 PyTake Django - Iniciar em Produção

## ⚡ Quick Start (Comando Único)

```bash
cd /home/administrator/pytake
./scripts/reset_django.sh
```

**Tempo: ~3-5 minutos** (depende da máquina)

Este script vai:
1. ✅ Parar FastAPI containers
2. ✅ Apagar banco de dados antigo (FastAPI)
3. ✅ Build da imagem Django
4. ✅ Subir todos os serviços (Django + Celery + PostgreSQL + Redis + MongoDB)
5. ✅ Rodar migrations
6. ✅ Criar superuser `admin` / `admin123`

## 📋 O que está rodando

Após executar o script, os seguintes serviços estarão ativos:

| Serviço | Porta | URL |
|---------|-------|-----|
| **Django API** | 8002 | http://localhost:8002/api/v1/ |
| **Admin Panel** | 8002 | http://localhost:8002/admin/ |
| **API Docs** | 8002 | http://localhost:8002/api/schema/ |
| **Health Check** | 8002 | http://localhost:8002/api/v1/health/ |
| PostgreSQL | 5435 | localhost:5435 |
| Redis | 6382 | localhost:6382 |
| MongoDB | 27020 | localhost:27020 |
| Nginx | 80/443 | http://localhost |
| Celery Worker | - | Processando tasks |
| Celery Beat | - | Agendador de tasks |

## 🔑 Credenciais Padrão

```
Admin Login:
  Usuario: admin
  Senha: admin123
```

## 📊 Verificar Status

```bash
# Ver todos os containers
docker-compose ps

# Ver logs em tempo real (Django)
docker-compose logs -f backend

# Ver logs do Celery
docker-compose logs -f celery-worker

# Ver logs de tudo
docker-compose logs -f
```

## 🧪 Testar Endpoints

```bash
# Health check
curl http://localhost:8002/api/v1/health/

# Listar users
curl http://localhost:8002/api/v1/users/ \
  -H "Authorization: Bearer <seu_token>"

# Ver documentação interativa
# Acesse: http://localhost:8002/api/schema/swagger/
```

## 💾 Dados

- **PostgreSQL**: Banco limpo (nenhum dado do FastAPI)
- **MongoDB**: Pronto para receber logs e analytics
- **Redis**: Broker para Celery + cache

## ⚙️ Celery Tasks

Tarefas async estão configuradas e rodando:

```bash
# Ver tasks na fila
docker-compose exec backend celery -A pytake inspect active

# Ver tasks processadas
docker-compose exec backend celery -A pytake inspect stats
```

## 🛑 Parar Tudo

```bash
# Parar sem apagar dados
docker-compose down

# Parar e apagar tudo (CUIDADO!)
docker-compose down -v
```

## 📖 Documentação Completa

Para mais informações, veja:
- **[DJANGO_STARTUP_GUIDE.md](./DJANGO_STARTUP_GUIDE.md)** - Guia detalhado
- **[backend/PHASE_11_12_COMPLETE.md](./backend/PHASE_11_12_COMPLETE.md)** - Detalhes das services
- **[CLAUDE.md](./CLAUDE.md)** - Arquitetura do projeto

## 🐛 Troubleshooting

### Django não sobe

```bash
# Ver erro completo
docker-compose logs backend | tail -50

# Reset completo
docker-compose down -v
./scripts/reset_django.sh
```

### Celery não processa tasks

```bash
# Verificar se broker (Redis) está OK
docker-compose exec redis redis-cli ping

# Reiniciar worker
docker-compose restart celery-worker
```

### Conexão recusada no banco

```bash
# Verificar se PostgreSQL está saudável
docker-compose exec postgres pg_isready

# Reiniciar PostgreSQL
docker-compose restart postgres
```

## 🔍 O que Mudou do FastAPI

| Aspecto | FastAPI | Django |
|---------|---------|--------|
| **Framework** | FastAPI | Django + DRF |
| **WSGI Server** | Uvicorn | Gunicorn |
| **ORM** | SQLAlchemy | Django ORM |
| **Database** | PostgreSQL | PostgreSQL (mesmo) |
| **Cache** | Redis (mesmo) | Redis (mesmo) |
| **Async Tasks** | Celery | Celery (mesmo) |
| **Admin Interface** | Não | ✅ Django Admin |
| **REST API** | Manual | DRF Automated |

## ✨ Features do Django

- ✅ **93+ REST endpoints** (200% mais que FastAPI)
- ✅ **Admin interface** automático
- ✅ **JWT authentication** com refresh tokens
- ✅ **RBAC** (Role-Based Access Control)
- ✅ **WebSocket** com Django Channels
- ✅ **Celery** com 11 async tasks
- ✅ **4 webhook handlers** (Stripe, SendGrid, Twilio, WhatsApp)
- ✅ **MongoDB** para logs e analytics
- ✅ **Rate limiting** built-in
- ✅ **API documentation** automática (Swagger)

## 🎯 Próximos Passos

1. ✅ Rodar `./scripts/reset_django.sh`
2. ✅ Testar endpoints
3. ✅ Acessar admin em http://localhost:8002/admin/
4. ✅ Verificar Celery tasks
5. ⏳ Phase 18: CI/CD Pipeline
6. ⏳ Phase 19: Monitoring & Cutover

## 📈 Status da Migração

```
FastAPI → Django Migration
62% Complete (12 of 19 phases)

Phases Completed:
✅ 1-4: Setup & Models
✅ 5-6: REST API & WebSocket
✅ 7-9: Webhooks, Celery, External APIs
✅ 10: Services & Utilities
✅ 11-12: Additional Services
✅ 16: Docker Infrastructure

Next:
⏳ 18: CI/CD Pipeline
⏳ 19: Monitoring & Cutover
```

## 📞 Suporte

Se algo não funcionar:

1. Ver logs: `docker-compose logs -f backend`
2. Ler [DJANGO_STARTUP_GUIDE.md](./DJANGO_STARTUP_GUIDE.md)
3. Reset: `./scripts/reset_django.sh`

---

**Tempo para produção: ~15-20 horas restantes**

Boa sorte! 🚀
