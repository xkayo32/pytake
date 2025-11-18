# 🚀 Configuração Necessária para CI/CD Workflows

Todas as mudanças foram implementadas! Agora precisa-se configurar os **GitHub Actions Secrets** para que os workflows de deploy funcionem.

## 📋 Secrets Necessários

### 1. Repository Secrets (Compartilhados)

GitHub → Settings → Secrets and variables → Actions → New repository secret

```
SECRET_KEY              = [32+ characters random string]
JWT_SECRET_KEY          = [32+ characters random string]
ENCRYPTION_KEY          = [Fernet key from cryptography.fernet.Fernet.generate_key()]
```

**Como gerar:**
```bash
# SECRET_KEY e JWT_SECRET_KEY
python3 -c "import secrets; print(secrets.token_urlsafe(32))"

# ENCRYPTION_KEY
python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

### 2. Environment Secrets - Staging

GitHub → Settings → Environments → Create "staging" → Add secrets

```
DEPLOY_KEY              = [SSH private key]
DEPLOY_HOST             = [seu_servidor_ip ou hostname]
DEPLOY_USER             = [usuario_ssh, ex: pytake]
SLACK_WEBHOOK           = [Webhook URL do Slack - opcional]
```

### 3. Environment Secrets - Production

GitHub → Settings → Environments → Create "production" → Add secrets

```
DEPLOY_KEY              = [SSH private key]
DEPLOY_HOST             = [seu_servidor_ip ou hostname]
DEPLOY_USER             = [usuario_ssh, ex: pytake]
SLACK_WEBHOOK           = [Webhook URL do Slack - opcional]
```

---

## 🔐 Gerando SSH Key para Deploy

```bash
# Gerar SSH key sem passphrase
ssh-keygen -t rsa -b 4096 -f /tmp/deploy_key -N ""

# Copiar chave privada para GitHub Actions
cat /tmp/deploy_key

# Copiar chave pública para servidor
cat /tmp/deploy_key.pub
```

**No servidor (SSH):**
```bash
# Adicionar chave pública ao arquivo authorized_keys
echo "$(cat /tmp/deploy_key.pub)" >> ~/.ssh/authorized_keys

# Definir permissões corretas
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

---

## 🔗 Gerando Slack Webhook (Opcional)

Se quiser notificações no Slack:

1. Ir a: https://api.slack.com/apps
2. Create New App → From scratch
3. Name: "PyTake Deployer", Workspace: seu workspace
4. Features → Incoming Webhooks → Ativar
5. Add New Webhook to Workspace → Selecionar canal (#deployments)
6. Copiar URL do webhook

---

## 📋 Checklist de Setup

- [ ] **Repository Secrets criados:**
  - [ ] `SECRET_KEY`
  - [ ] `JWT_SECRET_KEY`
  - [ ] `ENCRYPTION_KEY`

- [ ] **Staging Environment criado com secrets:**
  - [ ] `DEPLOY_KEY` (SSH private key)
  - [ ] `DEPLOY_HOST` (IP/hostname)
  - [ ] `DEPLOY_USER` (username)
  - [ ] `SLACK_WEBHOOK` (opcional)

- [ ] **Production Environment criado com secrets:**
  - [ ] `DEPLOY_KEY` (SSH private key)
  - [ ] `DEPLOY_HOST` (IP/hostname)
  - [ ] `DEPLOY_USER` (username)
  - [ ] `SLACK_WEBHOOK` (opcional)

- [ ] **DNS configurado:**
  - [ ] `api.pytake.net` → seu servidor
  - [ ] `staging-api.pytake.net` → seu servidor
  - [ ] `dev-api.pytake.net` → seu servidor (opcional)

- [ ] **SSL Certificates (via certbot):**
  - [ ] `/etc/letsencrypt/live/api.pytake.net/fullchain.pem`
  - [ ] `/etc/letsencrypt/live/api.pytake.net/privkey.pem`

- [ ] **Nginx configurado:**
  - [ ] `/etc/nginx/sites-available/pytake` (ou sites-enabled)
  - [ ] Nginx testado: `sudo nginx -t && sudo systemctl restart nginx`

---

## 🧪 Testando o Setup

Depois de configurar os secrets:

### 1. Fazer push para `develop` (teste staging)
```bash
git checkout develop
git pull origin develop
# Fazer uma pequena mudança
echo "# Test" >> docs/TEST.md
git add -A
git commit -m "test: CI/CD test"
git push origin develop
```

**Resultado esperado:** GitHub Actions executa `deploy-staging.yml`

### 2. Merging para `main` (teste production)
```bash
git checkout main
git pull origin main
git merge develop
git push origin main
```

**Resultado esperado:** GitHub Actions executa `deploy-production.yml`

---

## 📊 Workflows Disponíveis

| Workflow | Trigger | Descrição |
|----------|---------|-----------|
| `build.yml` | PR, push | Build backend & frontend |
| `test.yml` | PR, push | Testes críticos |
| `deploy-staging.yml` | Push to `develop` | Deploy automático para staging |
| `deploy-production.yml` | Push to `main` ou tag | Deploy automático para produção |

---

## 🔄 Fluxo de Deployments

```
Feature Branch
    ↓
git push feature/XXX
    ↓
GitHub Actions: build.yml + test.yml (✓ passa)
    ↓
Criar PR para develop
    ↓
Code review + merge
    ↓
Push automático para develop
    ↓
GitHub Actions: deploy-staging.yml 🚀
    ↓
Staging: https://staging-api.pytake.net
    ↓
Validar em staging
    ↓
git checkout main && git merge develop
    ↓
Push para main
    ↓
GitHub Actions: deploy-production.yml 🌍
    ↓
Production: https://api.pytake.net
```

---

## ⚠️ Importante

**NUNCA fazer commit direto em `main` ou `develop`!**

Use sempre:
1. Feature branch a partir de `develop`
2. PR para review
3. Merge após aprovação
4. Deployments automáticos via CI/CD

---

## 📞 Suporte

Se algum secret não funcionar:

1. Verificar GitHub Actions logs: Settings → Actions → Logs
2. Verificar SSH key: `ssh -i deploy_key user@host "echo OK"`
3. Verificar Nginx: `sudo nginx -t`
4. Verificar certificados: `sudo certbot certificates`

---

**Próximo passo:** Configurar os secrets acima e testar deployments!
