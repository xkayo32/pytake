# ⚡ Quick Start - Adicionar Secrets

## 1️⃣ Via CLI (Mais Rápido)

```bash
# Repository secret (todos os workflows)
gh secret set MEU_SECRET

# Será pedido o valor
? Paste your secret (it will be hidden): [digita aqui]
✓ Set secret MEU_SECRET for xkayo32/pytake

# Environment secret (só um ambiente)
gh secret set DB_PASSWORD --env production
? Paste your secret: [digita aqui]
✓ Set secret DB_PASSWORD for production environment
```

## 2️⃣ Via GitHub Web

1. Ir para: https://github.com/xkayo32/pytake/settings/secrets/actions
2. Clique em "New repository secret"
3. Nome: `MEU_SECRET`
4. Value: `meu-valor-super-secreto`
5. Click "Add secret"

## 3️⃣ Usar no Workflow

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Usar secret
        env:
          MEU_SECRET: ${{ secrets.MEU_SECRET }}
        run: echo "Secret carregado!"
```

## ⚠️ Lembrar

- ✅ Secrets são criptografados no GitHub
- ✅ Nunca aparecem em logs
- ✅ Nomes são **case-sensitive**
- ❌ Não committar `.env` com secrets reais
- ❌ Não fazer print/echo de secrets

## Exemplo Prático - Flow Automation

```bash
# Adicionar secrets necessários
gh secret set DATABASE_PASSWORD
gh secret set REDIS_PASSWORD
gh secret set JWT_SECRET_KEY --env production

# Verificar
gh secret list
gh secret list --env production
```

Pronto! Agora usar nos workflows.
