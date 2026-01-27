# 🚀 Guia: Iniciar Django em Produção

## Pré-requisitos

✅ Docker e Docker Compose instalados
✅ Branch `refactor/django-backend` checked out
✅ Arquivos `.env` configurados
✅ Código Django validado (system check passing)

## Passo 1: Parar FastAPI (se ainda estiver rodando)

```bash
# Parar container FastAPI
docker-compose down backend

# Ou parar tudo e remover volumes (CUIDADO: apaga dados!)
# docker-compose down -v
```

## Passo 2: Build da imagem Django

```bash
# Build apenas do backend Django
docker-compose build backend

# Ou rebuild tudo
docker-compose build
```

## Passo 3: Iniciar todos os serviços

```bash
# Subir todos os serviços em background
docker-compose up -d

# Ver logs em tempo real
docker-compose logs -f backend

# Ver logs do Celery worker
docker-compose logs -f celery-worker

# Ver logs do Celery beat
docker-compose logs -f celery-beat
```

## Passo 4: Verificar se tudo está rodando

```bash
# Ver status dos containers
docker-compose ps

# Esperado:
# pytake-postgres-dev       - Up
# pytake-redis-dev          - Up
# pytake-mongodb-dev        - Up
# pytake-backend-dev        - Up (healthy)
# pytake-celery-worker-dev  - Up
# pytake-celery-beat-dev    - Up
# pytake-nginx-dev          - Up (healthy)
```

## Passo 5: Executar migrações (se necessário)

```bash
# Django migrations
docker-compose exec backend python manage.py migrate

# Criar superuser
docker-compose exec backend python manage.py createsuperuser

# Carregar dados de teste (opcional)
docker-compose exec backend python manage.py loaddata fixtures/users.json
```

## Passo 6: Verificar endpoints

```bash
# Health check
curl http://localhost:8002/api/v1/health/

# Admin panel
curl http://localhost:8002/admin/

# API docs
curl http://localhost:8002/api/schema/
```

## Monitoramento

```bash
# Ver processoscelery
docker-compose exec backend celery -A pytake inspect active

# Ver tasks fila
docker-compose exec backend celery -A pytake inspect reserved

# Ver estatísticas
docker-compose exec redis redis-cli INFO

# Conexão MongoDB
docker-compose exec mongodb mongosh -u pytake_user -p pytake_mongo_password
```

## Troubleshooting

### Django não sobe (errors em migrations)

```bash
# Ver erro completo
docker-compose logs backend | tail -50

# Re-criar banco de dados
docker-compose down -v
docker-compose up -d postgres mongodb redis
docker-compose up -d backend
```

### Celery workers não estão processando tasks

```bash
# Verificar se broker (Redis) está respondendo
docker-compose exec redis redis-cli ping

# Reiniciar worker
docker-compose restart celery-worker
```

### Conexão com banco recusada

```bash
# Verificar health do PostgreSQL
docker-compose exec postgres pg_isready

# Verificar variáveis de ambiente
docker-compose exec backend env | grep POSTGRES
```

### Memory leak ou slow performance

```bash
# Ver consumo de recursos
docker stats

# Aumentar workers do Celery
# Editar docker-compose.yml, linha do celery-worker:
# command: celery -A pytake worker --concurrency=8 (aumentar de 4 para 8)
```

## Logs e Debugging

```bash
# Ver logs com timestamp
docker-compose logs --timestamps backend

# Ver últimas 100 linhas
docker-compose logs --tail=100 backend

# Ver logs desde 10 minutos atrás
docker-compose logs --since 10m backend

# Salvar logs em arquivo
docker-compose logs > pytake.logs
```

## Backup e Restore

```bash
# Backup do PostgreSQL
docker-compose exec postgres pg_dump -U pytake_user pytake > backup.sql

# Restore do PostgreSQL
docker-compose exec -T postgres psql -U pytake_user pytake < backup.sql

# Backup do MongoDB
docker-compose exec mongodb mongodump --out /backup/

# Restore do MongoDB
docker-compose exec mongodb mongorestore /backup/
```

## Escala (Múltiplos Workers)

```bash
# Aumentar workers do Celery
docker-compose up -d --scale celery-worker=3

# Verificar workers conectados
docker-compose exec backend celery -A pytake inspect active_queues
```

## Para produção (recomendações)

1. Usar `.env.production` em vez de `.env`
2. Configurar SSL/TLS no Nginx
3. Usar gunicorn com mais workers (baseado em CPU cores)
4. Configurar logging centralizado (ELK stack, CloudWatch)
5. Setup de monitoring (Prometheus, Grafana)
6. Alertas para erros (Sentry)
7. Backup automático dos bancos de dados
8. Load balancer para alta disponibilidade

## Rollback (voltar para FastAPI)

Se algo der errado:

```bash
# Parar Django
docker-compose down backend celery-worker celery-beat

# Voltar para FastAPI
git checkout main
docker-compose up -d backend

# FastAPI estará rodando novamente na porta 8002
```

## Checklist pré-production

- [ ] Testes passando
- [ ] Django system check passing
- [ ] Database migrations OK
- [ ] Celery tasks processando
- [ ] Webhooks recebendo eventos
- [ ] Rate limiting funcionando
- [ ] MongoDB coletando logs
- [ ] Nginx redirecionando corretamente
- [ ] SSL/TLS configurado
- [ ] Variáveis de ambiente seguras
- [ ] Backup strategy implementada
- [ ] Monitoring configurado

---

**Comandos úteis:**

```bash
# Rebuild + start
docker-compose up -d --build

# Stop + remove volumes (reset completo)
docker-compose down -v

# Ver stats em tempo real
docker stats

# Entrar no container Django
docker-compose exec backend bash

# Run Django command
docker-compose exec backend python manage.py <command>
```

**Tempo estimado para primeiro start: 2-3 minutos** (dependendo da máquina)

Bom deploy! 🚀
