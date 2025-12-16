# 🔧 Troubleshooting & FAQ

**Autor:** Kayo Carvalho Fernandes  
**Data:** Dezembro de 2025  
**Versão:** 1.0

---

## 🚨 Problemas Comuns

### 1. Erro: "Connection refused" ao iniciar

**Sintoma:**
```
Error: connection refused
Error connecting to PostgreSQL at postgres:5432
```

**Causa:** Container PostgreSQL não está rodando

**Solução:**
```bash
# Verificar containers
docker ps

# Se não estiver, iniciar
docker-compose up -d

# Verificar logs
docker compose logs postgres

# Se ainda não funcionar, resetar (CUIDADO!)
docker compose down -v
docker compose up -d
```

---

### 2. Erro: "Testes falhando com 'relation ... does not exist'"

**Sintoma:**
```
sqlalchemy.exc.ProgrammingError: relation "whatsapp_template" does not exist
```

**Causa:** Migrations não foram aplicadas

**Solução:**
```bash
# Verificar migrations aplicadas
docker exec pytake-backend alembic current

# Se vazio, aplicar
docker exec pytake-backend alembic upgrade head

# Verificar se funcionou
docker exec pytake-backend alembic current
# Esperado: (head) - número da versão
```

---

### 3. Erro: "Multi-tenancy violation detected"

**Sintoma:**
```
ERROR: Query sem filtro de organization_id detectado
```

**Causa:** Query em alguma camada não está filtrando por organization_id

**Solução:**
```python
# ❌ ERRADO
templates = await self.session.exec(select(WhatsAppTemplate))

# ✅ CORRETO
templates = await self.session.exec(
    select(WhatsAppTemplate)
    .where(WhatsAppTemplate.organization_id == org_id)
)
```

**Buscar no código:**
```bash
# Grep para encontrar queries suspeitas
grep -r "select(.*)" backend/app/repositories/ | grep -v "organization_id"
```

---

### 4. Erro: "Rate limit exceeded"

**Sintoma:**
```
429 Too Many Requests
```

**Causa:** Limite de requisições excedido

**Solução:**
```bash
# Verificar limite configurado
grep RATE_LIMIT .env

# Se está muito restritivo, aumentar
export RATE_LIMIT_REQUESTS_PER_MINUTE=1000

# Ou desabilitar em dev
export RATE_LIMIT_ENABLED=false
```

---

### 5. Erro: "Memory leak / High memory usage"

**Sintoma:**
```
Docker container memory usage: 2GB+ (crescendo)
```

**Causa:** Conexões de banco ou objetos em memória não sendo liberados

**Solução:**
```python
# Verificar se todas as sessions estão sendo closadas
await session.close()

# Usar context managers
async with AsyncSession(engine) as session:
    # Usa session
    # Auto-closes ao sair do bloco
    pass

# Verificar se há circular references
python -m objgraph show_most_common_types --limit 10
```

**Restart container:**
```bash
docker compose restart backend
```

---

### 6. Erro: "JWT token expired"

**Sintoma:**
```
401 Unauthorized: Token expired
```

**Causa:** Token JWT com validade expirada

**Solução:**
```bash
# Obter novo token
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password"
  }'

# Usar novo token
curl -H "Authorization: Bearer NOVO_TOKEN" \
  http://localhost:8000/api/v1/templates
```

---

### 7. Erro: "Database deadlock"

**Sintoma:**
```
psycopg2.errors.DeadlockDetected: Deadlock detected
```

**Causa:** Duas transações tentando modificar mesmos recursos em ordem diferente

**Solução:**
```python
# Usar consistent ordering de locks
# ❌ ERRADO
transaction1: Lock A → Lock B
transaction2: Lock B → Lock A  # Deadlock!

# ✅ CORRETO
transaction1: Lock A → Lock B
transaction2: Lock A → Lock B  # Mesma ordem
```

**No código:**
```bash
# Implementar retry com exponential backoff
async def with_retry(func, max_retries=3):
    for attempt in range(max_retries):
        try:
            return await func()
        except DeadlockDetected:
            if attempt == max_retries - 1:
                raise
            await asyncio.sleep(2 ** attempt)  # Exponential backoff
```

---

### 8. Erro: "Webhook signature validation failed"

**Sintoma:**
```
400 Bad Request: Invalid webhook signature
```

**Causa:** HMAC da Meta não bate com verificação

**Solução:**
```python
# Verificar token
echo $WEBHOOK_VERIFY_TOKEN

# Deve bater com o configurado na Meta App

# Se não souber o correto, gerar novo
python -c "import secrets; print(secrets.token_urlsafe(32))"

# Atualizar no .env
WEBHOOK_VERIFY_TOKEN=novo_token_gerado
```

**Verificar assinatura:**
```python
# app/api/webhooks/meta.py
import hmac
import hashlib

def verify_webhook_signature(body: bytes, x_hub_signature: str):
    """Verifica assinatura HMAC da Meta"""
    expected_signature = "sha256=" + hmac.new(
        WEBHOOK_VERIFY_TOKEN.encode(),
        body,
        hashlib.sha256
    ).hexdigest()
    
    # Debug
    print(f"Expected: {expected_signature}")
    print(f"Got: {x_hub_signature}")
    
    return hmac.compare_digest(expected_signature, x_hub_signature)
```

---

### 9. Erro: "Cost calculation precision lost"

**Sintoma:**
```
Cost: 12.35999999999, Expected: 12.36
```

**Causa:** Usando float em vez de Decimal para cálculos financeiros

**Solução:**
```python
# ❌ ERRADO
cost_usd: float = 12.35

# ✅ CORRETO
from decimal import Decimal
cost_usd: Decimal = Decimal("12.35")

# Em cálculos
cost = Decimal("0.025") * Decimal("500")
# Resultado: Decimal("12.50") (exato)
```

---

### 10. Erro: "Migrations conflict"

**Sintoma:**
```
FAILED target database is ahead of current heads
```

**Causa:** Múltiplas migrations criadas simultaneamente

**Solução:**
```bash
# Ver histórico
alembic log -n 10

# Se conflict, manualmente resolver
# Edit alembic/versions/latest.py

# Depois:
alembic upgrade head
```

---

## 🆘 Debug Tips

### Ver logs em tempo real

```bash
# Backend
docker compose logs -f backend

# Database
docker compose logs -f postgres

# Redis
docker compose logs -f redis

# Tudo
docker compose logs -f
```

### Conectar ao container

```bash
# Shell Python
docker exec -it pytake-backend python

# Shell bash
docker exec -it pytake-backend bash

# Ver arquivos
docker exec pytake-backend ls -la /app
```

### Conectar ao banco

```bash
# PostgreSQL
docker exec -it pytake-postgres psql -U pytake -d pytake

# Listar tabelas
\dt

# Ver schema de tabela
\d whatsapp_template

# Query rápida
SELECT COUNT(*) FROM whatsapp_template;

# Sair
\q
```

### Monitorar performance

```bash
# Ver requisições lentas
docker exec pytake-backend grep "SLOW" app.log

# Ver uso de CPU/memória
docker stats pytake-backend

# Ver queries lentas
docker exec pytake-postgres \
  psql -U pytake -d pytake \
  -c "SELECT * FROM pg_stat_statements \
      ORDER BY total_time DESC LIMIT 10;"
```

---

## ❓ FAQ

### P: Como resetar o banco de dados?

**R:** ⚠️ Isso apagará TODOS os dados!

```bash
docker compose down -v
docker compose up -d
docker exec pytake-backend alembic upgrade head
```

---

### P: Como criar um novo usuário?

**R:**
```python
# Shell Python
from app.services.auth_service import AuthService
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession

service = AuthService(session)
user = await service.create_user(
    email="newuser@example.com",
    password="secure_password",
    organization_id="org-uuid",
    role="AGENT"
)
print(f"User created: {user.id}")
```

---

### P: Como fazer backup do banco?

**R:**
```bash
# PostgreSQL dump
docker exec pytake-postgres pg_dump -U pytake pytake \
  | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz

# Restaurar
gunzip < backup_20251216_100000.sql.gz | \
  docker exec -i pytake-postgres psql -U pytake pytake
```

---

### P: Como aumentar timeout de request?

**R:**
```bash
# .env
REQUEST_TIMEOUT=300  # 5 minutos

# app/core/config.py
class Settings:
    REQUEST_TIMEOUT: int = 300
```

---

### P: Como desabilitar autenticação para dev?

**R:** ⚠️ Apenas em desenvolvimento!

```python
# app/api/deps.py
if settings.ENVIRONMENT == "development":
    async def get_current_user():
        # Retornar usuário fake
        return User(id=UUID("..."), organization_id=UUID("..."))
```

---

### P: Como rodar comando SQL customizado?

**R:**
```bash
# Via shell Python do container
docker exec -it pytake-backend python -c "
from sqlalchemy import text
import asyncio

async def main():
    async with Session() as session:
        result = await session.execute(
            text('SELECT COUNT(*) FROM whatsapp_template')
        )
        print(result.scalar())

asyncio.run(main())
"
```

---

### P: Como ver webhooks recebidos?

**R:**
```bash
# Ver últimos webhooks em logs
docker compose logs backend | grep -i webhook | tail -20

# Se logging detalhado
docker exec pytake-backend grep -r "webhook_received" app.log | tail -10
```

---

### P: Como resetar cache Redis?

**R:**
```bash
# Conectar ao Redis
docker exec -it pytake-redis redis-cli

# Ver chaves
KEYS *

# Limpar tudo
FLUSHALL

# Ou chaves específicas
DEL key1 key2 key3

# Sair
exit
```

---

### P: Como verificar multi-tenancy?

**R:**
```python
# Test script
import httpx
import asyncio

async def test_multi_tenancy():
    org1_token = await login("org1@example.com", "password")
    org2_token = await login("org2@example.com", "password")
    
    # Org1 lista templates
    org1_templates = await get(
        "/api/v1/templates",
        headers={"Authorization": f"Bearer {org1_token}"}
    )
    
    # Org2 lista templates
    org2_templates = await get(
        "/api/v1/templates",
        headers={"Authorization": f"Bearer {org2_token}"}
    )
    
    # Verificar isolamento
    for t1 in org1_templates:
        for t2 in org2_templates:
            assert t1["id"] != t2["id"], "Data leak! Template de outra org visível!"

asyncio.run(test_multi_tenancy())
```

---

### P: Como auditar quem fez o quê?

**R:**
```sql
-- Ver histórico de mudanças (com audit table)
SELECT * FROM audit_log 
WHERE table_name = 'whatsapp_template'
ORDER BY created_at DESC
LIMIT 100;

-- Ver por usuário
SELECT * FROM audit_log 
WHERE user_id = 'uuid'
ORDER BY created_at DESC;
```

---

## 📞 Escalação

**Se o problema persistir:**

1. **Coletar informações:**
   ```bash
   # Log completo
   docker compose logs backend > /tmp/logs.txt
   
   # Info do sistema
   docker compose ps > /tmp/containers.txt
   docker exec pytake-backend python --version > /tmp/version.txt
   
   # Git info
   git log -1 --oneline > /tmp/commit.txt
   ```

2. **Criar issue no GitHub com:**
   - Descrição clara do problema
   - Passos para reproduzir
   - Error messages completas
   - Logs da aplicação
   - Configuração do ambiente

3. **Contatar time:**
   - Slack: #pytake-backend-support
   - Email: backend-team@pytake.com
   - On-call: Verificar schedule

---

**Última atualização:** 16 Dezembro 2025  
**Versão:** 1.0  
**Autor:** Kayo Carvalho Fernandes
