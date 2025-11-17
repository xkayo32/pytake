# SSH Deployment Troubleshooting Guide

Guia de diagnóstico e resolução de problemas com SSH deployment.

## 🔍 Diagnostic Workflow

### 1. Verificar SSH Keys Localmente

```bash
# Verificar que a chave privada existe
ls -la ~/.ssh/pytake_deploy
# Esperado: -rw------- (permissões 600)

# Verificar conteúdo (primeiro linha)
head -1 ~/.ssh/pytake_deploy
# Esperado: -----BEGIN OPENSSH PRIVATE KEY----- ou -----BEGIN RSA PRIVATE KEY-----

# Verificar chave pública
ls -la ~/.ssh/pytake_deploy.pub
cat ~/.ssh/pytake_deploy.pub
```

### 2. Testar Conectividade SSH Básica

```bash
# Test de conectividade simples
ssh -i ~/.ssh/pytake_deploy deploy@209.105.242.206 "echo '✅ Connected'"

# Se falhar, debug com verbose:
ssh -vv -i ~/.ssh/pytake_deploy deploy@209.105.242.206 "echo '✅ Connected'" 2>&1 | head -50
```

### 3. Verificar Permissões no Servidor

```bash
# SSH no servidor como deploy user
ssh -i ~/.ssh/pytake_deploy deploy@209.105.242.206

# Uma vez conectado, verificar:
ls -la ~/.ssh/
# Esperado: drwx------ .ssh
#         -rw------- authorized_keys

# Verificar se sua chave pública está lá
cat ~/.ssh/authorized_keys | grep "pytake-github"

# Se não estiver, adicionar:
echo "YOUR_PUBLIC_KEY_HERE" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

---

## ❌ Problemas Comuns e Soluções

### Problema 1: "Permission denied (publickey)"

#### Causa Raiz
- Chave pública não está em `~/.ssh/authorized_keys`
- Permissões incorretas em `.ssh/` ou `authorized_keys`
- Chave privada local não corresponde à pública no servidor

#### Diagnóstico
```bash
# Local: Verificar permissões da chave privada
stat ~/.ssh/pytake_deploy
# Esperado: Access: (0600/-rw-------)

# Servidor: Verificar authorized_keys
ssh root@209.105.242.206
cat /home/deploy/.ssh/authorized_keys | grep "pytake"

# Ou via SSH com força bruta:
ssh -i ~/.ssh/pytake_deploy deploy@209.105.242.206 cat ~/.ssh/authorized_keys
```

#### Solução
```bash
# Opção 1: Via ssh-copy-id (recomendado)
ssh-copy-id -i ~/.ssh/pytake_deploy.pub deploy@209.105.242.206

# Opção 2: Manual (se ssh-copy-id não funciona)
# Gerar arquivo temporário
cat ~/.ssh/pytake_deploy.pub > /tmp/temp_key.pub

# SSH como root
ssh root@209.105.242.206

# Dentro do servidor:
cat /tmp/temp_key.pub >> /home/deploy/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys
chown deploy:deploy /home/deploy/.ssh/authorized_keys

# Fora do servidor, limpar
rm /tmp/temp_key.pub
```

### Problema 2: "SSH timeout" ou "No route to host"

#### Causa Raiz
- IP do servidor incorreto
- Firewall bloqueando SSH (porta 22)
- Servidor não está disponível
- Network routing problema

#### Diagnóstico
```bash
# Testar ping
ping 209.105.242.206

# Testar SSH port
nc -zv 209.105.242.206 22
# Ou:
telnet 209.105.242.206 22

# Testar DNS (se usando hostname)
nslookup api.pytake.net
ping api.pytake.net

# Testar com timeout explícito
ssh -o ConnectTimeout=10 -i ~/.ssh/pytake_deploy deploy@209.105.242.206
```

#### Solução
```bash
# 1. Verificar que PROD_HOST está correto
echo $PROD_HOST  # Deve retornar IP ou hostname

# 2. Se hostname, resolver DNS
nslookup PROD_HOST

# 3. Se IP, verificar reachability
mtr PROD_HOST  # More comprehensive than ping

# 4. Se firewall, abrir SSH port (no servidor):
sudo ufw allow 22/tcp
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --reload

# 5. Testar novamente
ssh -i ~/.ssh/pytake_deploy deploy@209.105.242.206 "echo OK"
```

### Problema 3: GitHub Actions Workflow Fails on SSH

#### Causa Raiz
- Secret PROD_SSH_KEY não configurado
- Secret contém caracteres especiais mal escapados
- Secret PROD_HOST ou PROD_USER incorretos

#### Diagnóstico
```bash
# No GitHub, verificar secrets:
# Settings → Secrets and variables → Actions

# Validar que secrets existem:
# - PROD_HOST ✓
# - PROD_USER ✓
# - PROD_SSH_KEY ✓

# Verificar conteúdo da chave (localmente):
cat ~/.ssh/pytake_deploy | wc -c
# Retorna número de caracteres (geralmente 1500-3000)

# Comparar com o secret no GitHub (copiar e colar):
# Devem ter mesmo tamanho e linhas BEGIN/END
```

#### Solução
```bash
# 1. Remover secret antigo
# GitHub: Settings → Secrets → Delete PROD_SSH_KEY

# 2. Recre com conteúdo correto
cat ~/.ssh/pytake_deploy

# 3. Copiar TODO o conteúdo (Ctrl+C)
# 4. GitHub: Create new secret → PROD_SSH_KEY → Paste
# 5. Save

# 6. Testar workflow novamente
# Actions → deploy.yml → Run workflow → production
```

### Problema 4: Docker Commands Not Found on Server

#### Causa Raiz
- Docker não instalado no servidor
- Docker não no PATH
- Deploy user sem acesso a docker

#### Diagnóstico
```bash
# SSH no servidor
ssh -i ~/.ssh/pytake_deploy deploy@209.105.242.206

# Testar Docker
docker --version
docker ps

# Testar docker-compose
docker-compose --version
which docker-compose

# Verificar grupo docker
groups deploy
# Esperado: deploy docker (ou equivalente)

# Testar acesso real
docker run hello-world
```

#### Solução
```bash
# Se Docker não instalado, instalar (como root):
ssh root@209.105.242.206
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
rm get-docker.sh

# Adicionar deploy ao grupo docker
usermod -aG docker deploy

# Instalar docker-compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" \
  -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Testar como deploy user
su - deploy
docker --version
docker-compose --version
```

### Problema 5: "docker-compose: command not found" in Workflow

#### Causa Raiz
- docker-compose não está no PATH do shell SSH
- Aliases não carregados no SSH não-interativo
- Versão velha do docker-compose

#### Diagnóstico
```bash
# Testar PATH completo
ssh -i ~/.ssh/pytake_deploy deploy@209.105.242.206 "echo $PATH"
# Esperado: includes /usr/local/bin

# Testar comando completo
ssh -i ~/.ssh/pytake_deploy deploy@209.105.242.206 "/usr/local/bin/docker-compose --version"

# Testar com source bashrc
ssh -i ~/.ssh/pytake_deploy deploy@209.105.242.206 "source ~/.bashrc && docker-compose --version"
```

#### Solução
```bash
# No workflow deploy.yml, usar caminho completo:
script: |
  cd /opt/pytake
  /usr/local/bin/docker-compose pull
  /usr/local/bin/docker-compose up -d --remove-orphans

# Ou criar symlink
ssh root@209.105.242.206
ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose

# Verificar
which docker-compose  # Deve retornar /usr/bin/docker-compose
```

### Problema 6: Database Connection Fails During Migration

#### Causa Raiz
- Postgres container ainda iniciando
- DATABASE_URL no .env incorreto
- Postgres user/password incorretos
- Network docker misconfigured

#### Diagnóstico
```bash
# SSH no servidor
ssh -i ~/.ssh/pytake_deploy deploy@209.105.242.206
cd /opt/pytake

# Ver status dos containers
docker-compose ps
# Esperado: postgres em estado Up

# Testar conectividade ao postgres
docker-compose exec postgres psql -U pytake -d pytake -c "SELECT 1"

# Ver logs do postgres
docker-compose logs postgres | tail -20

# Verificar .env
grep DATABASE_URL .env

# Testar URL
docker-compose exec backend python -c "import asyncpg; print('✅ asyncpg ready')"
```

#### Solução
```bash
# 1. Aguardar Postgres inicializar (adicionar sleep)
sleep 30

# 2. Verificar DATABASE_URL
DATABASE_URL=postgresql://pytake:PASSWORD@postgres:5432/pytake
# Validar: user, password, host (postgres), database name

# 3. Se modificou, atualizar .env
cd /opt/pytake
echo "DATABASE_URL=postgresql://pytake:CORRECT_PASSWORD@postgres:5432/pytake" >> .env

# 4. Reiniciar backend
docker-compose restart backend

# 5. Rodar migrations novamente
docker-compose exec backend alembic upgrade head
```

### Problema 7: Timeout in Health Check

#### Causa Raiz
- Backend ainda iniciando
- Health endpoint não respondendo
- Nginx não rotacionando para backend
- Network issue

#### Diagnóstico
```bash
# SSH no servidor
ssh -i ~/.ssh/pytake_deploy deploy@209.105.242.206
cd /opt/pytake

# Testar health endpoint internamente
docker-compose exec backend python -c "
import urllib.request
resp = urllib.request.urlopen('http://localhost:8000/api/v1/health', timeout=5)
print(f'Status: {resp.status}')
"

# Testar via nginx externally
curl -v https://api.pytake.net/api/v1/health

# Ver logs do backend
docker-compose logs backend -f | grep -i health

# Ver logs do nginx
docker-compose logs nginx | tail -20
```

#### Solução
```bash
# 1. Aumentar timeout no deploy.yml
sleep 30  # em vez de sleep 5

# 2. Verificar backend logs
docker-compose logs backend | grep "Uvicorn running"

# 3. Se backend não inicia, ver erro
docker-compose logs backend | tail -50

# 4. Reiniciar backend
docker-compose restart backend

# 5. Testar após cada restart
sleep 10
curl https://api.pytake.net/api/v1/health
```

---

## 🛠️ Manual Testing Steps

### Test 1: SSH Connection

```bash
# Simulação do que workflow faz
export PROD_HOST="209.105.242.206"
export PROD_USER="deploy"
export PROD_SSH_KEY_PATH="$HOME/.ssh/pytake_deploy"

ssh -i "$PROD_SSH_KEY_PATH" "$PROD_USER@$PROD_HOST" << 'EOF'
  echo "✅ SSH connection established"
  whoami
  pwd
  docker-compose --version
EOF
```

### Test 2: Git Pull

```bash
ssh -i ~/.ssh/pytake_deploy deploy@209.105.242.206 << 'EOF'
  cd /opt/pytake
  echo "📥 Pulling latest code..."
  git fetch origin
  git checkout origin/main
  git log --oneline | head -5
EOF
```

### Test 3: Docker Compose Up

```bash
ssh -i ~/.ssh/pytake_deploy deploy@209.105.242.206 << 'EOF'
  cd /opt/pytake
  echo "🚀 Starting services..."
  docker-compose pull
  docker-compose up -d --remove-orphans
  docker-compose ps
EOF
```

### Test 4: Migrations

```bash
ssh -i ~/.ssh/pytake_deploy deploy@209.105.242.206 << 'EOF'
  cd /opt/pytake
  echo "🔄 Running migrations..."
  docker-compose exec -T backend alembic upgrade head
  echo "✅ Migrations complete"
EOF
```

### Test 5: Health Check

```bash
ssh -i ~/.ssh/pytake_deploy deploy@209.105.242.206 << 'EOF'
  sleep 5
  echo "🏥 Checking health..."
  curl -s https://api.pytake.net/api/v1/health | jq .
  curl -s -I https://app.pytake.net | head -1
EOF
```

---

## 📋 Full Workflow Test (Local)

```bash
#!/bin/bash
# Simula exatamente o que GitHub Actions faz

PROD_HOST="209.105.242.206"
PROD_USER="deploy"
SSH_KEY="$HOME/.ssh/pytake_deploy"

echo "🧪 Starting full deployment test..."

# Test 1: SSH Connection
echo "[1/5] Testing SSH connection..."
if ssh -i "$SSH_KEY" "$PROD_USER@$PROD_HOST" "echo OK" > /dev/null 2>&1; then
    echo "✅ SSH OK"
else
    echo "❌ SSH Failed"
    exit 1
fi

# Test 2: Docker Available
echo "[2/5] Testing Docker..."
if ssh -i "$SSH_KEY" "$PROD_USER@$PROD_HOST" "docker-compose --version" > /dev/null 2>&1; then
    echo "✅ Docker OK"
else
    echo "❌ Docker Failed"
    exit 1
fi

# Test 3: Directory Exists
echo "[3/5] Checking /opt/pytake..."
if ssh -i "$SSH_KEY" "$PROD_USER@$PROD_HOST" "test -d /opt/pytake && echo OK" | grep -q OK; then
    echo "✅ Directory OK"
else
    echo "⚠️  /opt/pytake not found (first deployment)"
fi

# Test 4: Git Available
echo "[4/5] Testing Git..."
if ssh -i "$SSH_KEY" "$PROD_USER@$PROD_HOST" "git --version" > /dev/null 2>&1; then
    echo "✅ Git OK"
else
    echo "❌ Git Failed"
    exit 1
fi

# Test 5: Database Connection
echo "[5/5] Testing database..."
if ssh -i "$SSH_KEY" "$PROD_USER@$PROD_HOST" \
    "cd /opt/pytake && docker-compose exec -T postgres psql -U pytake -d pytake -c 'SELECT 1'" \
    > /dev/null 2>&1; then
    echo "✅ Database OK"
else
    echo "⚠️  Database connection failed (may not be running)"
fi

echo ""
echo "✅ All tests passed! Ready for deployment"
```

---

## 🆘 Get Help

Se nenhuma solução acima funcionar:

1. **Collect diagnostic info**:
   ```bash
   bash scripts/validate-deployment-setup.sh > diagnostics.log 2>&1
   ```

2. **Check logs**:
   ```bash
   # Local SSH test
   ssh -vv -i ~/.ssh/pytake_deploy deploy@209.105.242.206 "echo OK" 2>&1 > ssh_debug.log
   
   # GitHub Actions logs
   # Visit: https://github.com/xkayo32/pytake/actions/workflows/deploy.yml
   # Click failed workflow → Deploy to production via SSH → See full logs
   ```

3. **Share diagnostics** with team:
   - `diagnostics.log`
   - `ssh_debug.log`
   - GitHub Actions workflow logs (full output)
   - Error messages from `docker-compose logs`
