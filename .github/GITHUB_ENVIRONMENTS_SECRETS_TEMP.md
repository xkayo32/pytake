# 🔐 GitHub Environments & Secrets Setup - PyTake

## ⚠️ IMPORTANTE
Este arquivo contém senhas temporárias para setup dos ambientes.
**NUNCA commitar este arquivo** - use apenas para configuração inicial.
**DELETAR após criar os ambientes no GitHub**.

---

## 📋 SENHAS GERADAS (Use para criar secrets no GitHub)

### Production
```
POSTGRES_PASSWORD: coWmQEybYooOr-KFA_g4Dd7HIAw70ChRm2gNhtkY35E
REDIS_PASSWORD: UHabjEFsMwLXg198YEvfY15JNemMrBF27IHr4jZ-wNw
DEBUG: false
```

### Staging
```
POSTGRES_PASSWORD: LtLVHcRmas9_NaE5R9kqm4EmDFB10XFAOh0zoteiBe0
REDIS_PASSWORD: aOtO2_5WwjcEOZrVVj1ufWT1YSg7DM4yc1thmirELh8
DEBUG: true
```

### Development
```
POSTGRES_PASSWORD: dev-password-local-pytake
REDIS_PASSWORD: dev-redis-password-local
DEBUG: true
```

---

## 🚀 SETUP PASSO A PASSO

### Passo 1: Criar Ambientes no GitHub

Ir para: https://github.com/xkayo32/pytake/settings/environments

Criar 3 ambientes:
1. `production`
2. `staging`
3. `development`

### Passo 2: Adicionar Secrets para Production

Para cada ambiente criado, adicionar os secrets correspondentes:

**Production:**
- Key: `POSTGRES_PASSWORD` | Value: `coWmQEybYooOr-KFA_g4Dd7HIAw70ChRm2gNhtkY35E`
- Key: `REDIS_PASSWORD` | Value: `UHabjEFsMwLXg198YEvfY15JNemMrBF27IHr4jZ-wNw`
- Key: `DEBUG` | Value: `false`

**Staging:**
- Key: `POSTGRES_PASSWORD` | Value: `LtLVHcRmas9_NaE5R9kqm4EmDFB10XFAOh0zoteiBe0`
- Key: `REDIS_PASSWORD` | Value: `aOtO2_5WwjcEOZrVVj1ufWT1YSg7DM4yc1thmirELh8`
- Key: `DEBUG` | Value: `true`

**Development:**
- Key: `POSTGRES_PASSWORD` | Value: `dev-password-local-pytake`
- Key: `REDIS_PASSWORD` | Value: `dev-redis-password-local`
- Key: `DEBUG` | Value: `true`

### Passo 3: Verificar com CLI

```bash
# Verificar que os secrets foram criados
gh secret list --env production
gh secret list --env staging
gh secret list --env development

# Deve mostrar POSTGRES_PASSWORD, REDIS_PASSWORD, DEBUG para cada um
```

### Passo 4: Atualizar .env files locais

Copiar senhas para os arquivos de ambiente local:

```bash
# Production
cp environments/production/.env-example environments/production/.env.production
# Editar e adicionar:
# POSTGRES_PASSWORD=coWmQEybYooOr-KFA_g4Dd7HIAw70ChRm2gNhtkY35E
# REDIS_PASSWORD=UHabjEFsMwLXg198YEvfY15JNemMrBF27IHr4jZ-wNw

# Staging
cp environments/staging/.env-example environments/staging/.env.staging
# Editar e adicionar senhas de staging

# Development
cp environments/development/.env-example environments/development/.env.development
# Editar e adicionar senhas de dev
```

### Passo 5: Deletar este arquivo

⚠️ **DEPOIS DE CRIAR OS AMBIENTES NO GITHUB:**

```bash
rm .github/GITHUB_ENVIRONMENTS_SECRETS_TEMP.md
git add .gitignore
git commit -m "docs: deletar arquivo temporário de senhas"
```

---

## 📚 Referência Rápida

### Repository Secrets (Globais - Já existem)
- `SECRET_KEY`
- `JWT_SECRET_KEY`
- `ENCRYPTION_KEY`

### Environment Secrets (A criar)
- `production`: POSTGRES_PASSWORD, REDIS_PASSWORD, DEBUG
- `staging`: POSTGRES_PASSWORD, REDIS_PASSWORD, DEBUG
- `development`: POSTGRES_PASSWORD, REDIS_PASSWORD, DEBUG

### Documentação
- `.github/docs/SECRETS_AND_ENVIRONMENTS/README.md` - Guia completo
- `docs/DEPLOYMENT_GUIDE.md` - Como usar os secrets

---

**Criado em:** 18/11/2025
**Status:** ⏳ Aguardando configuração manual no GitHub
