# 🚀 Guia de Deploy - Produção, Staging e Desenvolvimento

**Autor:** Kayo Carvalho Fernandes  
**Data:** Dezembro de 2025  
**Versão:** 1.0

---

## 📋 Pre-Deploy Checklist

```bash
# Antes de qualquer deploy, executar:

# 1. Verificar testes
docker exec pytake-backend pytest tests/ -v --tb=short
# Esperado: ALL PASS ✅

# 2. Verificar migrations
docker exec pytake-backend alembic current
# Esperado: (last version)

# 3. Verificar git status
git status
# Esperado: working tree clean

# 4. Verificar branch
git branch --show-current
# Esperado: feature/... ou develop

# 5. Verificar variáveis de ambiente
cat .env | grep -E "DATABASE_URL|REDIS_URL|SECRET_KEY"
# Esperado: todas configuradas
```

---

## 🏠 Ambiente de Desenvolvimento

### Setup Inicial

```bash
# 1. Clone repositório
git clone https://github.com/xkayo32/pytake.git
cd pytake

# 2. Criar .env
cp .env.example .env

# 3. Editar .env
nano .env
# Configurar:
# - DATABASE_URL=postgresql://user:password@postgres:5432/pytake
# - REDIS_URL=redis://redis:6379/0
# - SECRET_KEY=dev-secret-key-123
# - META_API_VERSION=v18.0
# - WHATSAPP_BUSINESS_ACCOUNT_ID=123456789
# - WEBHOOK_VERIFY_TOKEN=verify_token_123

# 4. Subir containers
docker-compose up -d

# 5. Aplicar migrations
docker exec pytake-backend alembic upgrade head

# 6. Rodar testes
docker exec pytake-backend pytest tests/ -v

# 7. Acessar aplicação
# Backend: http://localhost:8000
# Docs: http://localhost:8000/api/v1/docs
# Redis: localhost:6379
# PostgreSQL: localhost:5432
```

### Comandos Úteis em Dev

```bash
# Ver logs
docker compose logs -f backend

# Executar um teste específico
docker exec pytake-backend pytest tests/test_phase_3_1_cost_estimator.py -v

# Executar migrations
docker exec pytake-backend alembic revision --autogenerate -m "describe"
docker exec pytake-backend alembic upgrade head

# Acessar shell Python
docker exec -it pytake-backend python

# Resetar banco (⚠️ APENAS DEV)
docker compose down -v
docker compose up -d
docker exec pytake-backend alembic upgrade head

# Rebuild image
docker compose build --no-cache backend
```

---

## 🔧 Ambiente de Staging

### Deploy para Staging

```bash
# 1. Checkout branch develop
git checkout develop
git pull origin develop

# 2. Verificar testes
docker exec pytake-backend pytest tests/ -v
# ⚠️ Se falhar, voltar e corrigir antes de continuar

# 3. Build da imagem
docker build -f backend/Dockerfile \
  -t pytake-backend:staging \
  --build-arg ENV=staging \
  backend/

# 4. Tag a imagem
docker tag pytake-backend:staging \
  registry.example.com/pytake-backend:staging

# 5. Push para registry
docker push registry.example.com/pytake-backend:staging

# 6. Deploy em Staging (exemplo AWS ECS)
aws ecs update-service \
  --cluster pytake-staging \
  --service pytake-backend-service \
  --force-new-deployment

# 7. Verificar health
curl https://staging.pytake.com/api/v1/health
# Esperado: HTTP 200 OK

# 8. Rodar smoke tests
pytest tests/smoke_tests.py -v
# Esperado: ALL PASS ✅
```

### Staging Environment Variables

```bash
# .env.staging
DATABASE_URL=postgresql://user:password@staging-db:5432/pytake
REDIS_URL=redis://staging-redis:6379/0
SECRET_KEY=staging-secret-key-${RANDOM}
META_API_VERSION=v18.0
ENVIRONMENT=staging
LOG_LEVEL=INFO

# Webhooks
WEBHOOK_URL=https://staging.pytake.com/api/webhooks/meta
WEBHOOK_VERIFY_TOKEN=${SECURE_RANDOM_TOKEN}

# Rate limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_REQUESTS_PER_MINUTE=60

# Database
DB_POOL_SIZE=20
DB_MAX_OVERFLOW=40
```

---

## 🌍 Ambiente de Produção

### Pre-Production Deployment

```bash
# 1. Verificações finais
echo "=== FINAL CHECKS ===" && \
git log -1 --oneline && \
git status && \
pytest tests/ -v --cov=app --cov-report=term-missing && \
pytest tests/smoke_tests.py -v

# 2. Tag release
VERSION=$(date +%Y.%m.%d.%H%M)
git tag -a "v$VERSION" -m "Release $VERSION"
git push origin "v$VERSION"

# 3. Build production image
docker build -f backend/Dockerfile \
  -t pytake-backend:$VERSION \
  --build-arg ENV=production \
  backend/

# 4. Push para ECR
docker tag pytake-backend:$VERSION \
  ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/pytake-backend:$VERSION

docker push \
  ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/pytake-backend:$VERSION

# 5. Backup database
mysqldump -h ${DB_HOST} -u ${DB_USER} -p${DB_PASSWORD} ${DB_NAME} \
  | gzip > backups/pytake_$(date +%Y%m%d_%H%M%S).sql.gz

# 6. Deploy em produção
aws ecs update-service \
  --cluster pytake-production \
  --service pytake-backend-service \
  --force-new-deployment \
  --image ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/pytake-backend:$VERSION

# 7. Monitorar deployment
watch 'aws ecs describe-services --cluster pytake-production --services pytake-backend-service | grep -E "runningCount|desiredCount"'

# 8. Smoke tests em produção
pytest tests/smoke_tests.py -v --prod
```

### Production Architecture

```
┌─────────────────────────────────────────────┐
│        CloudFront CDN                       │
│  - Cache estático (templates, assets)       │
│  - WAF (proteção DDoS)                      │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│     Application Load Balancer (ALB)         │
│  - SSL/TLS termination                      │
│  - Health checks (every 30s)                │
│  - Sticky sessions disabled                 │
└──────────────────┬──────────────────────────┘
         ┌─────────┼─────────┐
         │         │         │
    ┌────▼──┐ ┌────▼──┐ ┌────▼──┐
    │Backend│ │Backend│ │Backend│
    │Pod 1  │ │Pod 2  │ │Pod 3  │
    └────┬──┘ └────┬──┘ └────┬──┘
         └─────────┼─────────┘
                   │
    ┌──────────────┼──────────────┐
    │              │              │
┌───▼────┐  ┌──────▼────┐  ┌─────▼────┐
│RDS     │  │ElastiCache│  │CloudWatch│
│Postgres│  │Redis      │  │Monitoring│
│(Multi- │  │(Cluster)  │  │& Logging │
│AZ)     │  │           │  │          │
└────────┘  └───────────┘  └──────────┘
```

### Production Environment Variables

```bash
# .env.production
DATABASE_URL=postgresql://user:password@prod-db.c.example.com:5432/pytake
REDIS_URL=redis://prod-redis.c.example.com:6379/0
SECRET_KEY=${AWS_SECRETS_MANAGER_SECRET}
META_API_VERSION=v18.0
ENVIRONMENT=production
LOG_LEVEL=WARNING

# Security
ALLOWED_HOSTS=*.pytake.com
CORS_ORIGINS=https://pytake.com,https://app.pytake.com
SECURE_SSL_REDIRECT=true
SESSION_COOKIE_SECURE=true
CSRF_COOKIE_SECURE=true

# Database
DB_POOL_SIZE=50
DB_MAX_OVERFLOW=100
DB_ECHO=false

# Rate limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_REQUESTS_PER_MINUTE=1000

# Monitoring
DATADOG_API_KEY=${DATADOG_API_KEY}
SENTRY_DSN=${SENTRY_DSN}
```

---

## 🔄 Blue-Green Deployment

```bash
# Estratégia para zero-downtime deployment

# 1. Health check atual
curl https://api.pytake.com/health
# Esperado: HTTP 200

# 2. Deploy no "green" (nova versão)
# - Novo set de containers
# - Nova imagem Docker
# - Mesma database
# - Mesma cache

# 3. Smoke tests no green
pytest tests/smoke_tests.py -v --target=green
# ✅ PASS = continuar
# ❌ FAIL = rollback automático

# 4. Switch ALB para green
aws elbv2 modify-target-group \
  --target-group-arn arn:aws:... \
  --targets Id=green-1,Id=green-2,Id=green-3

# 5. Monitor para erros
for i in {1..60}; do
  curl https://api.pytake.com/health
  sleep 1
done

# 6. Se OK: desligar blue
docker scale pytake-backend-blue=0

# 7. Se ERRO: reverter
aws elbv2 modify-target-group \
  --target-group-arn arn:aws:... \
  --targets Id=blue-1,Id=blue-2,Id=blue-3
```

---

## 📊 Monitoring & Alerting

### Datadog Integration

```python
# app/core/monitoring.py
from datadog import api
from pytake.core.config import settings

class MonitoringService:
    def __init__(self):
        self.client = api.Api(
            api_key=settings.DATADOG_API_KEY,
            app_key=settings.DATADOG_APP_KEY
        )
    
    async def track_expense(self, cost: Decimal):
        """Track expense metric"""
        self.client.Metric.send(
            metric="pytake.expense.tracked",
            points=float(cost),
            tags=[f"org_id:{org_id}"]
        )
    
    async def track_template_sent(self, template_id: UUID):
        """Track template send"""
        self.client.Metric.send(
            metric="pytake.template.sent",
            points=1,
            tags=[f"template_id:{template_id}"]
        )
```

### Sentry Error Tracking

```python
# app/core/errors.py
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration

sentry_sdk.init(
    dsn=settings.SENTRY_DSN,
    environment=settings.ENVIRONMENT,
    integrations=[FastApiIntegration()],
    traces_sample_rate=0.1,
    profiles_sample_rate=0.1
)
```

### Alertas

```bash
# Datadog Alert: High error rate
alert_if {
  avg(last_5m):avg:trace.web.request.errors{service:pytake} > 0.05
}

# Datadog Alert: Slow response
alert_if {
  avg(last_5m):avg:trace.web.request.duration{service:pytake} > 1000
}

# Datadog Alert: Database latency
alert_if {
  avg(last_5m):avg:db.postgres.query.duration{service:pytake} > 500
}

# CloudWatch Alert: High CPU
alert_if {
  avg(last_5m):AWS/ECS.CPUUtilization{cluster:pytake-prod} > 80
}
```

---

## 🔄 Rollback Procedure

```bash
# Se deploy em produção falhar:

# 1. Verificar erro
kubectl logs -f deployment/pytake-backend --tail=100

# 2. Reverter para versão anterior
aws ecs update-service \
  --cluster pytake-production \
  --service pytake-backend-service \
  --task-definition pytake-backend:${LAST_STABLE_VERSION}

# 3. Verificar health
curl https://api.pytake.com/health
# Esperado: HTTP 200

# 4. Monitorar
watch 'curl -s https://api.pytake.com/health | jq'

# 5. Post-mortem
# - O que falhou?
# - Por que não foi catch nos testes?
# - Como prevenir?
```

---

## 🧪 Health Check Endpoints

```bash
# Health check simples
curl http://localhost:8000/health
# Resposta: {"status": "healthy"}

# Health check detalhado
curl http://localhost:8000/health/detailed
# Resposta: {
#   "status": "healthy",
#   "database": "connected",
#   "redis": "connected",
#   "uptime_seconds": 12345,
#   "version": "1.0.0"
# }

# Readiness probe (K8s)
curl http://localhost:8000/ready
# Resposta: 200 OK se pronto para receber tráfego
```

---

## 📝 Deployment Checklist

- [ ] Todos os testes passando
- [ ] Code review aprovado
- [ ] Migrations criadas e testadas
- [ ] Secrets/API keys configuradas
- [ ] Environment variables validadas
- [ ] Database backup realizado
- [ ] Load balancer configurado
- [ ] Health checks testados
- [ ] SSL/TLS configurado
- [ ] Rate limiting testado
- [ ] Monitoring ativo
- [ ] Alertas configuradas
- [ ] Runbook de rollback preparado
- [ ] Time de on-call notificado
- [ ] Janela de deploy aprovada

---

**Última atualização:** 16 Dezembro 2025  
**Versão:** 1.0  
**Autor:** Kayo Carvalho Fernandes
