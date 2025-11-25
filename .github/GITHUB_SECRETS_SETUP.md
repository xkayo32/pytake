# GitHub Secrets Configuration for Production Deployment

Este arquivo documenta todos os secrets necessários para ativar o deployment automático.

## 🔐 Secrets Necessários

### Production Deployment

Configure os seguintes secrets em: **Settings → Secrets and variables → Actions**

| Secret Name | Description | Example / How to Get |
|---|---|---|
| `PROD_HOST` | IP ou hostname do servidor production | `209.105.242.206` ou `api.pytake.net` |
| `PROD_USER` | Usuário SSH (sem passphrase necessária) | `deploy` |
| `PROD_SSH_KEY` | Chave privada SSH (formato PEM) | Veja "Generating SSH Keys" abaixo |
| `PROD_DATABASE_URL` | URL PostgreSQL completa | `postgresql://user:pass@localhost:5432/pytake` |
| `PROD_REDIS_URL` | URL Redis | `redis://localhost:6379/0` |
| `PROD_MONGODB_URL` | URL MongoDB (se usar) | `mongodb://localhost:27017/pytake` |
| `PROD_SECRET_KEY` | JWT secret key (gerar com `openssl rand -hex 32`) | `a1b2c3d4e5f6...` |
| `PROD_ENVIRONMENT` | Environment identifier | `production` |

### Optional: Notifications

| Secret Name | Description | Example |
|---|---|---|
| `SLACK_WEBHOOK_URL` | Slack webhook para notificações | `https://hooks.slack.com/services/T.../B.../X...` |
| `DISCORD_WEBHOOK_URL` | Discord webhook | `https://discord.com/api/webhooks/...` |

## 🔑 Generating SSH Keys

Execute no seu computador local (NÃO no servidor production):

```bash
# Gerar novo par de chaves
ssh-keygen -t ed25519 -C "pytake-github-actions" -f ~/.ssh/pytake_deploy -N ""

# Ou com RSA (mais compatível com sistemas antigos):
ssh-keygen -t rsa -b 4096 -C "pytake-github-actions" -f ~/.ssh/pytake_deploy -N ""
```

**Saída esperada:**
```
Generating public/private ed25519 key pair.
Your identification has been saved in /home/user/.ssh/pytake_deploy.
Your public key has been saved in /home/user/.ssh/pytake_deploy.pub.
```

### Adicionar chave pública ao servidor production:

```bash
# 1. Copiar conteúdo da chave pública
cat ~/.ssh/pytake_deploy.pub

# 2. No servidor production (como deploy user):
mkdir -p ~/.ssh
cat >> ~/.ssh/authorized_keys  # Cole o conteúdo aqui
chmod 600 ~/.ssh/authorized_keys
```

### Adicionar chave privada ao GitHub:

```bash
# 1. Copiar chave privada
cat ~/.ssh/pytake_deploy

# 2. Em GitHub:
#    - Settings → Secrets and variables → Actions → New repository secret
#    - Name: PROD_SSH_KEY
#    - Value: [Cole todo o conteúdo da chave privada, incluindo linhas BEGIN/END]
```

## 🧪 Teste da Chave SSH

Antes de adicionar ao GitHub, valide que funciona:

```bash
# Test connection
ssh -i ~/.ssh/pytake_deploy deploy@209.105.242.206 "echo '✅ SSH connected successfully'"

# Test on production server
ssh -i ~/.ssh/pytake_deploy deploy@209.105.242.206 << 'EOF'
cd /opt/pytake
docker-compose ps
EOF
```

Se receber `Permission denied`, verifique:
- Arquivo `~/.ssh/authorized_keys` no servidor (permissões 600)
- IP/hostname correto em PROD_HOST
- Usuário correto em PROD_USER

## 📋 Configuração do .env production

O arquivo `.env` pode ser gerenciado de 2 formas:

### Opção 1: Via GitHub Secret (Recomendado)

```bash
# Crie um secret chamado PROD_ENV_FILE com todo o conteúdo do .env
# No deploy script, pode fazer:
echo "${{ secrets.PROD_ENV_FILE }}" > .env.production
```

### Opção 2: Variables individuais

```bash
# Criar secrets para cada variável sensível:
PROD_DATABASE_URL=postgresql://...
PROD_SECRET_KEY=...
PROD_JWT_SECRET=...
```

## ✅ Validação de Secrets

### Script para validar secrets antes do deploy:

```bash
#!/bin/bash
# validate-secrets.sh

REQUIRED_SECRETS=(
  "PROD_HOST"
  "PROD_USER"
  "PROD_SSH_KEY"
  "PROD_DATABASE_URL"
  "PROD_SECRET_KEY"
)

echo "🔍 Validando GitHub Secrets..."

for secret in "${REQUIRED_SECRETS[@]}"; do
  if [ -z "${!secret}" ]; then
    echo "❌ Missing secret: $secret"
    exit 1
  fi
  echo "✅ $secret (configured)"
done

echo ""
echo "🎯 All required secrets are configured!"
```

## 🚀 Próximos Passos

1. **Gerar SSH keys** (execute localmente):
   ```bash
   ssh-keygen -t ed25519 -C "pytake-github-actions" -f ~/.ssh/pytake_deploy -N ""
   ```

2. **Configurar servidor production** (execute no servidor):
   ```bash
   # Como deploy user:
   mkdir -p ~/.ssh
   chmod 700 ~/.ssh
   cat >> ~/.ssh/authorized_keys  # Cole chave pública
   chmod 600 ~/.ssh/authorized_keys
   ```

3. **Adicionar secrets no GitHub**:
   - Abrir: https://github.com/xkayo32/pytake/settings/secrets/actions
   - Adicionar PROD_HOST, PROD_USER, PROD_SSH_KEY (chave privada completa)
   - Adicionar PROD_DATABASE_URL, PROD_SECRET_KEY, etc.

4. **Testar SSH localmente**:
   ```bash
   ssh -i ~/.ssh/pytake_deploy deploy@PROD_HOST "docker-compose ps"
   ```

5. **Triggerar deploy workflow**:
   - Ir a: https://github.com/xkayo32/pytake/actions/workflows/deploy.yml
   - Click "Run workflow"
   - Selecionar environment: "production"
   - Conferir logs na aba "Deploy to production via SSH"

## 🔒 Security Best Practices

1. **SSH Key Security**:
   - ✅ Usar ed25519 (mais seguro, menor)
   - ✅ Sem passphrase (GitHub Actions não pode interagir)
   - ✅ Permissões 600 no ~/.ssh/authorized_keys
   - ❌ NÃO compartilhar chave privada em repositório público

2. **Least Privilege**:
   - Deploy user deve ter acesso apenas a `/opt/pytake`
   - Não usar root para deploy
   - Limitar comandos que deploy user pode executar

3. **Secret Rotation**:
   - Regenerar SSH keys a cada 6-12 meses
   - Rotar PROD_SECRET_KEY anualmente
   - Log todas as mudanças de secrets

4. **Audit Trail**:
   - GitHub Actions logs salvam comando executado
   - Manter histórico de deployments
   - Revisar logs para acessos incomuns

## 🐛 Troubleshooting

### "SSH connection refused"
```bash
# Validar conectividade
ping PROD_HOST
telnet PROD_HOST 22
ssh -vv -i ~/.ssh/pytake_deploy deploy@PROD_HOST
```

### "Permission denied (publickey)"
```bash
# Verificar chave pública no servidor
cat ~/.ssh/authorized_keys | grep "pytake-github"
# Restaurar se necessário:
cat ~/.ssh/pytake_deploy.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

### "docker-compose: command not found"
```bash
# Instalar no servidor (como deploy user):
which docker-compose
docker-compose version
# Se não existir, instalar conforme PRODUCTION_DEPLOYMENT.md
```

### Deployment fails silently
```bash
# Verificar logs no GitHub Actions
# Ou SSH diretamente:
ssh -i ~/.ssh/pytake_deploy deploy@PROD_HOST
cd /opt/pytake
docker-compose logs -f backend
```

## 📞 Support

Para problemas com setup:
1. Consultar `PRODUCTION_DEPLOYMENT.md`
2. Verificar GitHub Actions logs: https://github.com/xkayo32/pytake/actions
3. SSH para servidor e validar manualmente
