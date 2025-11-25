# 📊 Análise: O Que Ir Para GitHub Secrets

Guia de decisão para determinar qual variável deve ir para GitHub Secrets, .env ou ser hardcoded.

## 🎯 Regra de Ouro

**Se pode variar por ambiente ou é sensível → GitHub Secrets**  
**Se é padrão e público → .env-example ou hardcode**

---

## TIER 1: 🔴 CRÍTICO - GitHub Secrets OBRIGATÓRIO

### Chaves de Criptografia & Senhas

Nunca em `.env`, nunca em código, sempre em GitHub Secrets.

| Variável | Descrição | Rotação | Status |
|----------|-----------|---------|--------|
| `SECRET_KEY` | Chave secreta da aplicação | 6 meses | ✅ |
| `JWT_SECRET_KEY` | Chave JWT para tokens | 6 meses | ✅ |
| `ENCRYPTION_KEY` | Chave Fernet para encriptação | 3 meses | ✅ |
| `POSTGRES_PASSWORD` | Senha do PostgreSQL | 1 mês | ⏳ TODO |
| `REDIS_PASSWORD` | Senha do Redis | 1 mês | ⏳ TODO |
| `MONGODB_PASSWORD` | Senha do MongoDB | 1 mês | ⏳ TODO |
| `WHATSAPP_API_TOKEN` | Token API WhatsApp | Conforme | ⏳ TODO |
| `WHATSAPP_VERIFY_TOKEN` | Token verificação WhatsApp | Conforme | ⏳ TODO |
| `API_KEYS_*` | Tokens de APIs terceiras | Conforme | ⏳ TODO |

**Por quê?**
- ✅ Nunca aparecem em logs
- ✅ GitHub garante criptografia em repouso
- ✅ Acessíveis apenas em CI/CD com permissão
- ✅ Fácil rotação sem código

---

## TIER 2: 🟡 SENSÍVEL - Secrets SE Mudar por Ambiente

### Hostnames, Domínios, URLs que Variam

Use `environment: production` no workflow para ter secrets específicos por env.

| Variável | DEV | STAGING | PROD | Secrets | Status |
|----------|-----|---------|------|---------|--------|
| `POSTGRES_SERVER` | localhost | postgres.staging.pytake.net | postgres.prod.pytake.net | ⚠️ SIM | ⏳ TODO |
| `POSTGRES_PORT` | 5432 | 5432 | 5432 | ❌ Não | ✅ |
| `REDIS_HOST` | localhost | redis.staging.pytake.net | redis.prod.pytake.net | ⚠️ SIM | ⏳ TODO |
| `REDIS_PORT` | 6379 | 6379 | 6379 | ❌ Não | ✅ |
| `REDIS_DB` | 0 | 1 | 2 | ❌ Não | ✅ |
| `MONGODB_URI` | mongodb://localhost:27017 | staging cluster | prod cluster | ⚠️ SIM | ⏳ TODO |
| `CORS_ORIGINS` | http://localhost:3000,3001 | https://staging.pytake.net | https://app.pytake.net | ⚠️ SIM | ⏳ TODO |
| `WHATSAPP_WEBHOOK_URL` | http://localhost:8000/webhook | https://staging-api.pytake.net/webhook | https://api.pytake.net/webhook | ⚠️ SIM | ⏳ TODO |

**Padrão Recomendado:**

```bash
# Adicionar como environment secret
gh secret set POSTGRES_SERVER --env production -b "postgres.prod.pytake.net"
gh secret set POSTGRES_SERVER --env staging -b "postgres.staging.pytake.net"
gh secret set POSTGRES_SERVER --env development -b "localhost"
```

---

## TIER 3: 🟢 PÚBLICO - .env-example ou Hardcode

### Configurações Não-Sensíveis

Padrões fixos que podem estar no código ou `.env-example`.

| Variável | Valor | Onde | Mudança |
|----------|-------|------|---------|
| `ENVIRONMENT` | development / staging / production | .env-example | Por env |
| `DEBUG` | true (dev/staging) / false (prod) | .env-example | Por env |
| `API_V1_PREFIX` | `/api/v1` | Hardcode OK | Nunca |
| `HOST` | `0.0.0.0` | Hardcode OK | Nunca |
| `PORT` | `8000` | Hardcode OK | Nunca |
| `WORKERS` | `4` | Hardcode OK | Nunca |
| `APP_NAME` | `PyTake` | Hardcode OK | Nunca |
| `APP_VERSION` | `1.0.0` | .env-example | Conforme |
| `POSTGRES_PORT` | `5432` | .env-example | Nunca |
| `POSTGRES_USER` | `pytake` | .env-example | Nunca |
| `POSTGRES_DB` | `pytake_dev` | .env-example | Por env |
| `REDIS_PORT` | `6379` | .env-example | Nunca |
| `REDIS_DB` | `0` (dev) `1` (staging) `2` (prod) | .env-example | Por env |
| `MONGODB_DB` | `pytake_logs` | .env-example | Nunca |
| `JWT_ALGORITHM` | `HS256` | Hardcode OK | Nunca |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `15` | Hardcode OK | Nunca |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `7` | Hardcode OK | Nunca |
| `BCRYPT_ROUNDS` | `12` | Hardcode OK | Nunca |

---

## 📋 Arquivo .env-example (Commitar no Repo)

```bash
# Application
ENVIRONMENT=development
DEBUG=true
API_V1_PREFIX=/api/v1
HOST=0.0.0.0
PORT=8000
WORKERS=4
RELOAD=true

# Application - Metadados
APP_NAME=PyTake
APP_VERSION=1.0.0

# Database - PostgreSQL
POSTGRES_SERVER=localhost
POSTGRES_PORT=5432
POSTGRES_USER=pytake
POSTGRES_DB=pytake_dev
# ⚠️  POSTGRES_PASSWORD vem de GitHub Secrets

# Cache - Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
# ⚠️  REDIS_PASSWORD vem de GitHub Secrets

# Database - MongoDB
MONGODB_DB=pytake_logs
# ⚠️  MONGODB_URI vem de GitHub Secrets

# JWT & Security
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7
BCRYPT_ROUNDS=12
# ⚠️  SECRET_KEY vem de GitHub Secrets
# ⚠️  JWT_SECRET_KEY vem de GitHub Secrets
# ⚠️  ENCRYPTION_KEY vem de GitHub Secrets

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
CORS_CREDENTIALS=true

# WhatsApp
# ⚠️  WHATSAPP_API_TOKEN vem de GitHub Secrets
# ⚠️  WHATSAPP_VERIFY_TOKEN vem de GitHub Secrets
# ⚠️  WHATSAPP_WEBHOOK_URL vem de GitHub Secrets (ou .env)
```

---

## 🚀 Estratégia de Implementação

### Fase 1: Adicionar Secrets Faltantes (Esta Sprint)

```bash
# Repository Secrets (globais)
gh secret set POSTGRES_PASSWORD -b "senha-segura"
gh secret set REDIS_PASSWORD -b "senha-segura"
gh secret set MONGODB_PASSWORD -b "senha-segura"
gh secret set WHATSAPP_API_TOKEN -b "token-whatsapp"
gh secret set WHATSAPP_VERIFY_TOKEN -b "token-verify"
```

### Fase 2: Criar Environments (Próxima Sprint)

```bash
# Criar environments
gh api repos/xkayo32/pytake/environments -f name="production"
gh api repos/xkayo32/pytake/environments -f name="staging"
gh api repos/xkayo32/pytake/environments -f name="development"

# Adicionar environment secrets
gh secret set POSTGRES_SERVER --env production -b "prod.db.pytake.net"
gh secret set POSTGRES_SERVER --env staging -b "staging.db.pytake.net"
gh secret set POSTGRES_SERVER --env development -b "localhost"
```

### Fase 3: Atualizar Config.py (Próxima Sprint)

Remover defaults sensíveis e usar GitHub Secrets:

```python
# ❌ Antes
POSTGRES_PASSWORD: str = Field(default="pytake_dev_password")

# ✅ Depois
POSTGRES_PASSWORD: str = Field(default="", description="Deve vir de GitHub Secrets")
```

---

## ✅ Checklist de Segurança

- [ ] Nenhuma senha em `.env` ou `.env-example`
- [ ] Nenhuma chave de produção em código
- [ ] POSTGRES_PASSWORD em GitHub Secrets
- [ ] REDIS_PASSWORD em GitHub Secrets
- [ ] WHATSAPP tokens em GitHub Secrets
- [ ] POSTGRES_SERVER em environment secrets
- [ ] REDIS_HOST em environment secrets
- [ ] Testes confirmam que CI/CD pega as variáveis
- [ ] `.env-example` é seguro (sem secrets)

---

## 🔗 Referências

- `.github/docs/SECRETS_AND_ENVIRONMENTS/README.md` - Documentação completa
- `.github/docs/SECRETS_AND_ENVIRONMENTS/QUICK_START.md` - Quick start
- GitHub Secrets: https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions
- GitHub Environments: https://docs.github.com/en/actions/deployment/environments

---

**Última atualização:** 2025-11-18  
**Status:** Recomendações prontas para implementar
