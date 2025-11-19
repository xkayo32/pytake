# ✅ CHECKLIST - Próximas Ações Obrigatórias

## 🎯 Objetivo
Finalizar a configuração para ativar CI/CD automático e webhooks do Meta

---

## ✅ FASE 1: Configuração Técnica (48 Horas)

### DNS Configuration
- [ ] Apontar `api.pytake.net` para seu servidor IP
- [ ] Apontar `api-staging.pytake.net` para seu servidor IP
- [ ] Apontar `api-dev.pytake.net` para seu servidor IP (opcional)
- [ ] Apontar `app.pytake.net` para seu servidor IP (Frontend Production)
- [ ] Apontar `app-staging.pytake.net` para seu servidor IP (Frontend Staging - recomendado)
- [ ] Apontar `app-dev.pytake.net` para seu servidor IP (Frontend Dev - opcional)
- [ ] Testar resolução: `nslookup api.pytake.net`

**Tempo estimado:** 15 minutos  
**Verificação:** `dig api.pytake.net` e `dig app.pytake.net` devem retornar seu IP

**ℹ️ Nota sobre Frontend:**
- Production: `app.pytake.net` (Nginx → localhost:3000)
- Staging: `app-staging.pytake.net` (Nginx → localhost:3001)
- Development: `localhost:3000` ou `localhost:3002` (sem Nginx)

---

### SSL/TLS Certificates
- [ ] Instalar Certbot: `sudo apt install -y certbot python3-certbot-nginx`
- [ ] Gerar certificado unificado (cobre todos os subdomínios):
  ```bash
  sudo certbot certonly --standalone \
    -d api.pytake.net \
    -d api-staging.pytake.net \
    -d api-dev.pytake.net \
    -d app.pytake.net \
    -d app-staging.pytake.net \
    -d app-dev.pytake.net
  ```
- [ ] Verificar certificados: `sudo certbot certificates`
- [ ] Configurar auto-renewal: `sudo systemctl enable certbot.timer`

**Tempo estimado:** 10 minutos  
**Verificação:** `sudo certbot certificates` deve listar **todos os 6 domínios**

**ℹ️ Nota:** Um único certificado pode ter múltiplos domínios (SAN - Subject Alternative Names)

---

### Nginx Configuration
- [ ] Copiar config: `sudo cp nginx/nginx-subdomains.conf /etc/nginx/sites-available/pytake`
- [ ] Criar symlink: `sudo ln -sf /etc/nginx/sites-available/pytake /etc/nginx/sites-enabled/pytake`
- [ ] Testar sintaxe: `sudo nginx -t` (deve retornar OK)
- [ ] Reinicar Nginx: `sudo systemctl restart nginx`
- [ ] Testar endpoints:
  ```bash
  curl https://api.pytake.net
  curl https://api-staging.pytake.net
  ```

**Tempo estimado:** 5 minutos  
**Verificação:** Todos os `curl` devem retornar response (não connection refused)

---

### Docker & Containers
- [ ] Verificar containers rodando: `docker-compose ps`
- [ ] Backend em porta 8000: `curl http://localhost:8000/api/v1/health`
- [ ] Staging em porta 8001: `curl http://localhost:8001/api/v1/health`
- [ ] Database conectado: `docker exec pytake-backend alembic current`

**Tempo estimado:** 10 minutos  
**Verificação:** `docker-compose ps` mostra todos os containers com status UP

---

## ✅ FASE 2: GitHub Actions Secrets (30 Minutos)

### 1. Repository Secrets
Ir em: GitHub → Repository → Settings → Secrets and variables → Actions

**Criar 3 Repository Secrets:**

- [ ] **SECRET_KEY**
  ```bash
  python3 -c "import secrets; print(secrets.token_urlsafe(32))"
  ```
  Copiar saída para GitHub secret

- [ ] **JWT_SECRET_KEY**
  ```bash
  python3 -c "import secrets; print(secrets.token_urlsafe(32))"
  ```
  Copiar saída para GitHub secret

- [ ] **ENCRYPTION_KEY**
  ```bash
  python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
  ```
  Copiar saída para GitHub secret

**Verificação:** GitHub mostra "SECRET_KEY", "JWT_SECRET_KEY", "ENCRYPTION_KEY" na lista

---

### 2. Gerar SSH Key para Deploy

```bash
# Gerar SSH key
ssh-keygen -t rsa -b 4096 -f ~/.ssh/pytake_deploy -N ""

# Copiar chave PRIVADA para GitHub (⚠️ Nunca compartilhar!)
cat ~/.ssh/pytake_deploy

# Copiar chave PÚBLICA para servidor
cat ~/.ssh/pytake_deploy.pub
```

---

### 3. Environment "staging"
Ir em: GitHub → Repository → Settings → Environments

- [ ] **Criar novo Environment: "staging"**

- [ ] **Configurar Deployment branches:**
  - Selecionar: "Deployments to any branch, environment, or ref"

- [ ] **Criar 4 Environment Secrets para staging:**

  1. **DEPLOY_KEY**
     ```bash
     cat ~/.ssh/pytake_deploy  # Copiar saída completa
     ```
     Cole o conteúdo da chave PRIVADA

  2. **DEPLOY_HOST**
     Seu IP ou hostname do servidor staging  
     Exemplo: `192.168.1.100` ou `staging.sua-empresa.com`

  3. **DEPLOY_USER**
     Seu usuário SSH no servidor  
     Exemplo: `pytake` ou `ubuntu` ou `root`

  4. **SLACK_WEBHOOK** (Opcional)
     Se tiver Slack, criar webhook e colar URL  
     Deixar em branco se não tiver

**Verificação:** Environment "staging" mostra 4 secrets na list

---

### 4. Environment "production"
Ir em: GitHub → Repository → Settings → Environments

- [ ] **Criar novo Environment: "production"**

- [ ] **Configurar Deployment branches:**
  - Selecionar: "Deployments to any branch, environment, or ref"

- [ ] **Criar 4 Environment Secrets para production:**

  1. **DEPLOY_KEY**
     (Mesma chave SSH de staging, ou diferente se quiser)

  2. **DEPLOY_HOST**
     Seu IP ou hostname do servidor production  
     Exemplo: `api.pytake.net` ou IP do servidor

  3. **DEPLOY_USER**
     Seu usuário SSH no servidor production

  4. **SLACK_WEBHOOK** (Opcional)

**Verificação:** Environment "production" mostra 4 secrets na list

---

## ✅ FASE 3: Testar CI/CD (15 Minutos)

### Teste 1: Deploy para Staging
```bash
# Fazer commit pequeno
git checkout develop
echo "# Test" >> docs/TEST_CI_CD.md

# Commit com Conventional Commits
git add docs/TEST_CI_CD.md
git commit -m "test: CI/CD pipeline verification"

# Push para develop (vai trigger deploy-staging.yml)
git push origin develop
```

**Verificação:**
1. Ir em GitHub → Actions
2. Ver workflow "🚀 Deploy to Staging" executando
3. Aguardar conclusão (deve mostrar ✅ em verde)
4. Acessar: https://api-staging.pytake.net/api/v1/health
5. Deve retornar JSON com status

**Tempo:** ~5 minutos para deploy completar

---

### Teste 2: Deploy para Production
```bash
# Fazer merge para main (vai trigger deploy-production.yml)
git checkout main
git pull origin main
git merge develop
git push origin main
```

**Verificação:**
1. Ir em GitHub → Actions
2. Ver workflow "🌍 Deploy to Production" executando
3. Aguardar conclusão (deve mostrar ✅ em verde)
4. Acessar: https://api.pytake.net/api/v1/health
5. Deve retornar JSON com status

**Tempo:** ~5 minutos para deploy completar

---

## ✅ FASE 4: Meta WhatsApp Webhook (30 Minutos)

### Setup Meta Business Manager

- [ ] **Ir para Meta Business Manager:** https://business.facebook.com

- [ ] **Selecionar seu App (PyTake)**

- [ ] **Ir em:** Apps & assets → Apps → (Selecione PyTake)

- [ ] **Ir em:** Settings → Basic

- [ ] **Procurar por "Webhooks" ou "Webhooks & Events"**

- [ ] **Configurar Webhook URL:**
  - **Callback URL:** `https://api.pytake.net/api/v1/whatsapp/webhook`
  - **Verify Token:** Mesmo valor de `META_WEBHOOK_VERIFY_TOKEN` no .env

- [ ] **Configurar eventos a receber:**
  - [ ] messages
  - [ ] message_status
  - [ ] message_template_change
  - [ ] message_template_status_update

- [ ] **Salvar e testar**

- [ ] **Verificar logs:**
  ```bash
  docker-compose logs -f backend | grep webhook
  ```

**Verificação:** Meta dashboard mostra "Webhook subscriptions active" ✅

---

### Para Development (ngrok - Opcional)

Se quiser testar webhooks localmente:

```bash
# Instalar ngrok
brew install ngrok  # macOS
# ou: wget https://bin.equinox.io/c/4VmDzA7iaHb/ngrok-stable-linux-amd64.zip

# Expor port 8002
ngrok http 8002
# Output: Forwarding https://abc123.ngrok.io -> http://localhost:8002

# Atualizar .env
DEV_PUBLIC_API_URL=https://abc123.ngrok.io
DEV_WHATSAPP_WEBHOOK_URL=https://abc123.ngrok.io/api/v1/whatsapp/webhook

# Configurar em Meta com URL ngrok
# Callback URL: https://abc123.ngrok.io/api/v1/whatsapp/webhook
```

---

## ✅ FASE 5: Validação Final (30 Minutos)

### Endpoints API

- [ ] Production Health:
  ```bash
  curl https://api.pytake.net/api/v1/health
  ```
  ✅ Deve retornar: `{"status":"healthy"}`

- [ ] Staging Health:
  ```bash
  curl https://api-staging.pytake.net/api/v1/health
  ```
  ✅ Deve retornar: `{"status":"healthy"}`

- [ ] API Docs:
  - [ ] Production: https://api.pytake.net/api/v1/docs
  - [ ] Staging: https://api-staging.pytake.net/api/v1/docs
  - [ ] Frontend: https://app.pytake.net

- [ ] Database connectivity:
  ```bash
  docker exec pytake-backend alembic current
  ```
  ✅ Deve retornar a última migration

---

### SSL/TLS Verification

- [ ] Certificados válidos:
  ```bash
  sudo certbot certificates
  ```
  ✅ Todos os domínios devem estar listados

- [ ] Testar HTTPS:
  ```bash
  curl -v https://api.pytake.net/api/v1/health
  ```
  ✅ Deve retornar HTTP/2 ou HTTP/1.1 com status 200

- [ ] Verificar HSTS:
  ```bash
  curl -I https://api.pytake.net | grep Strict-Transport-Security
  ```
  ✅ Deve retornar header HSTS

---

### Logs & Monitoring

- [ ] Nginx logs:
  ```bash
  sudo tail -f /var/log/nginx/api.pytake.net.access.log
  ```
  ✅ Deve mostrar requisições

- [ ] Backend logs:
  ```bash
  docker-compose logs -f backend
  ```
  ✅ Deve mostrar requests sendo processados

- [ ] GitHub Actions:
  - [ ] Nenhum workflow em estado de erro
  - [ ] Último deploy foi bem-sucedido

---

## 📋 Resumo do Checklist

| Fase | Status | Tempo | Crítica |
|------|--------|-------|---------|
| DNS Configuration | ⬜ | 15 min | 🔴 Sim |
| SSL Certificates | ⬜ | 10 min | 🔴 Sim |
| Nginx Setup | ⬜ | 5 min | 🔴 Sim |
| Docker Verification | ⬜ | 10 min | 🟡 Importante |
| Repository Secrets | ⬜ | 10 min | 🔴 Sim |
| SSH Key Setup | ⬜ | 5 min | 🔴 Sim |
| Environment Secrets | ⬜ | 10 min | 🔴 Sim |
| Test Staging Deploy | ⬜ | 5 min | 🟡 Importante |
| Test Production Deploy | ⬜ | 5 min | 🟡 Importante |
| Meta Webhook Setup | ⬜ | 20 min | 🟡 Importante |
| Final Validation | ⬜ | 15 min | 🟡 Importante |

**TOTAL: ~125 minutos (~2 horas)**

---

## 🆘 Troubleshooting

### Erro: "Connection refused" na URL
- [ ] Verificar DNS: `nslookup api.pytake.net`
- [ ] Verificar Nginx: `sudo systemctl status nginx`
- [ ] Verificar containers: `docker-compose ps`
- [ ] Verificar logs: `docker-compose logs -f backend`

### Erro: "SSL certificate problem"
- [ ] Verificar certificado: `sudo certbot certificates`
- [ ] Testar validade: `echo | openssl s_client -connect api.pytake.net:443`
- [ ] Renovar manual: `sudo certbot renew --force-renewal`

### Erro: "GitHub Actions Secrets not found"
- [ ] Verificar secrets foram criados: Settings → Secrets and variables
- [ ] Verificar nome exato do secret (case-sensitive)
- [ ] Verificar environment correto (staging vs production)

### Erro: "SSH connection failed"
- [ ] Testar conexão SSH: `ssh -i ~/.ssh/pytake_deploy usuario@host`
- [ ] Verificar authorized_keys no servidor: `cat ~/.ssh/authorized_keys`
- [ ] Verificar permissões: `chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys`

---

## 📞 Contato & Suporte

Se encontrar problemas:

1. **Verificar documentação:**
   - `docs/DEPLOYMENT_MULTI_ENVIRONMENT.md`
   - `docs/GITHUB_ACTIONS_SETUP.md`

2. **Ver logs do GitHub Actions:**
   - Repository → Actions → Workflow runs

3. **Testar manualmente:**
   - `./deploy.sh staging`
   - `docker-compose logs -f`

---

## 🎉 Após Completar

Quando tudo estiver configurado:

1. ✅ Feature branches → Merge para develop → Deploy automático em staging
2. ✅ Staging validado → Merge para main → Deploy automático em production
3. ✅ Webhooks funcionando → Meta consegue chamar sua API
4. ✅ Monitoramento ativo → Logs, alerts, health checks

**Parabéns! Seu CI/CD multi-ambiente está pronto para produção! 🚀**

---

**Última atualização:** 2025-11-18  
**Status:** Implementação completa, aguardando configuração de secrets  
