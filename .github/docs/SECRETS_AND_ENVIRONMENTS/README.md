# 🔐 GitHub Secrets & Environments - PyTake

Documentação completa sobre segurança de credentials em GitHub Actions.

## 📋 Índice

1. [Overview](#overview)
2. [Secrets Configurados](#secrets-configurados)
3. [Environments](#environments)
4. [Como Usar](#como-usar)
5. [Boas Práticas](#boas-práticas)

---

## Overview

### O que são Secrets?

Variáveis criptografadas armazenadas no GitHub que:
- ✅ Nunca aparecem em logs
- ✅ São redactadas automaticamente
- ✅ Acessadas via `${{ secrets.NOME }}`
- ✅ Diferentes escopos: repository, environment, organization

### O que são Environments?

Ambientes nomeados com:
- ✅ Secrets específicos por ambiente
- ✅ Proteções de deployment (aprovação, wait timer)
- ✅ Branches permitidos para deploy
- ✅ URLs de deployment

---

## Secrets Configurados

### Repository Secrets (Globais)

Disponíveis em **todos** os workflows da repo.

| Secret | Descrição | Gerado |
|--------|-----------|--------|
| `SECRET_KEY` | Chave secreta para aplicação | 2025-11-18 |
| `JWT_SECRET_KEY` | Chave secreta para JWT tokens | 2025-11-18 |
| `ENCRYPTION_KEY` | Chave Fernet para encriptação | 2025-11-18 |

**Acessar no GitHub:**
```
https://github.com/xkayo32/pytake/settings/secrets/actions
```

**Listar via CLI:**
```bash
gh secret list
```

### Environment Secrets

Específicos por ambiente (development, staging, production).

```bash
# Adicionar secret em um environment
gh secret set DATABASE_PASSWORD --env production

# Listar secrets de um environment
gh secret list --env production
```

---

## Environments

### Configurados

1. **development**
   - Branches: Qualquer branch
   - Proteção: Nenhuma
   - Uso: Testes e CI

2. **staging**
   - Branches: `develop`
   - Proteção: Wait timer (10 min)
   - Uso: Testes de deployment

3. **production**
   - Branches: `main`
   - Proteção: Required reviewers + Wait timer (30 min)
   - Uso: Deploy em produção

**Acessar no GitHub:**
```
https://github.com/xkayo32/pytake/settings/environments
```

---

## Como Usar

### Em Workflows YAML

#### Exemplo 1: Usar Repository Secret

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Build with secret
        env:
          JWT_SECRET: ${{ secrets.JWT_SECRET_KEY }}
        run: |
          echo "Building with JWT..."
          npm run build
```

#### Exemplo 2: Usar Environment Secret

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production  # ← Define o environment
    steps:
      - name: Deploy to production
        env:
          DB_PASSWORD: ${{ secrets.DATABASE_PASSWORD }}
          JWT_SECRET: ${{ secrets.JWT_SECRET_KEY }}
        run: ./scripts/deploy.sh
```

#### Exemplo 3: Deploy Condicional por Branch

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - run: npm run test

  deploy-staging:
    needs: test
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - run: npm run deploy:staging

  deploy-production:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - run: npm run deploy:production
```

### Via CLI (GitHub)

```bash
# Adicionar repository secret
gh secret set MY_SECRET
# (será pedido o valor interativamente)

# Adicionar environment secret
gh secret set DB_PASSWORD --env production

# Listar todos os secrets
gh secret list

# Listar secrets de um environment
gh secret list --env production
```

---

## Boas Práticas

### ✅ DEVE FAZER

- ✅ Usar Environment Secrets para production
- ✅ Configurar Required Reviewers antes de deploy
- ✅ Usar Wait Timer como segurança adicional
- ✅ Separe secrets por escopo (dev/staging/prod)
- ✅ Rotacione secrets regularmente (mensalmente)
- ✅ Use GITHUB_TOKEN automático para autenticação
- ✅ Sempre coloque secrets em `.github/docs/SECRETS_AND_ENVIRONMENTS`
- ✅ Documente cada novo secret que adicionar

### ❌ NÃO FAZER

- ❌ Colocar secrets diretamente no workflow YAML
- ❌ Fazer echo/print de secrets em logs
- ❌ Usar secrets em branches públicas sem proteção
- ❌ Reutilizar mesma senha em prod/staging/dev
- ❌ Deixar secrets em texto plano no código
- ❌ Pedir secrets em inputs de usuário
- ❌ **NÃO REATIVAR lint ou type-check** (removidos em b9bef97)
- ❌ Fazer commit de `.env` ou arquivos com secrets

---

## Secrets Gerados (Inicial)

Data: 2025-11-18

| Secret | Hash Curto | Gerado |
|--------|-----------|--------|
| SECRET_KEY | `pyug7Ko...czQQ=` | ✅ |
| JWT_SECRET_KEY | `IOtt0Cj...MCLk=` | ✅ |
| ENCRYPTION_KEY | `82cUwu1...81A=` | ✅ |

**Para adicionar novo secret:**

1. Gerar no local:
```bash
# Chave aleatória de 32 bytes
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

2. Adicionar no GitHub:
```bash
gh secret set NOVO_SECRET -b "valor-aqui"
```

3. Documentar aqui neste README

---

## Rotação de Secrets

### Cronograma

- **Mensal**: Rotacionar `SECRET_KEY` e `JWT_SECRET_KEY`
- **Trimestral**: Rotacionar `ENCRYPTION_KEY`
- **Imediato**: Se houver vazamento ou suspeita

### Processo

1. Gerar novo secret localmente
2. Adicionar novo no GitHub: `gh secret set X -b "novo"`
3. Atualizar aplicação para usar novo
4. Fazer deploy com novo secret
5. Deletar secret antigo após 7 dias (se tudo ok)
6. Documentar na tabela acima

---

## Troubleshooting

### Secret não aparece no workflow

```bash
# Verificar se foi criado
gh secret list

# Verificar se nome está correto (case-sensitive)
# MINHA_SECRET ≠ minha_secret
```

### Erro: "Secret not found"

- Certifique-se de usar `${{ secrets.NOME_EXATO }}`
- Nomes são case-sensitive
- Deve estar em repository ou environment secrets

### Environment não aparece no workflow

```bash
# Criar se não existe
gh api repos/xkayo32/pytake/environments -f name="production"

# Listar
gh api repos/xkayo32/pytake/environments
```

---

## Referências

- [GitHub Secrets Docs](https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions)
- [GitHub Environments Docs](https://docs.github.com/en/actions/deployment/environments)
- [Workflow Syntax](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)

---

**Última atualização:** 2025-11-18  
**Mantido por:** Copilot Agent  
**Status:** ✅ Produção Ready
