# Configuração para Usar Porta 80 (sem especificar porta na URL)

## Problema

O Podman em modo rootless não pode expor portas privilegiadas (< 1024) por padrão.

## Solução

Configure o sistema para permitir que usuários não-root usem portas a partir de 80.

## Passo a Passo

### 1. Configure o sysctl (execute no terminal)

```bash
echo "net.ipv4.ip_unprivileged_port_start=80" | sudo tee -a /etc/sysctl.conf
```

Digite sua senha quando solicitado.

### 2. Aplique a configuração

```bash
sudo sysctl -p
```

Você deve ver a saída:
```
net.ipv4.ip_unprivileged_port_start = 80
```

### 3. Reinicie os containers do Podman

```bash
cd /home/administrator/pytake
podman-compose down
podman-compose up -d
```

### 4. Aguarde os containers iniciarem (30 segundos)

```bash
sleep 30
podman ps
```

Você deve ver todos os containers rodando, incluindo:
```
pytake-nginx ... 0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
```

### 5. Configure o arquivo hosts

**Linux:**
```bash
echo "127.0.0.1    app.pytake.net" | sudo tee -a /etc/hosts
echo "127.0.0.1    api.pytake.net" | sudo tee -a /etc/hosts
```

**Windows:**
1. Abra o Notepad como Administrador
2. Abra: `C:\Windows\System32\drivers\etc\hosts`
3. Adicione:
   ```
   127.0.0.1    app.pytake.net
   127.0.0.1    api.pytake.net
   ```

### 6. Teste o acesso SEM porta

Agora você pode acessar sem especificar porta:

```bash
# Frontend
curl http://app.pytake.net

# API
curl http://api.pytake.net

# Documentação
curl http://api.pytake.net/docs
```

Ou no navegador:
- http://app.pytake.net
- http://api.pytake.net

## Troubleshooting

### Erro: "Permission denied" mesmo após configurar

1. Verifique se a configuração foi aplicada:
   ```bash
   sysctl net.ipv4.ip_unprivileged_port_start
   ```
   Deve retornar: `net.ipv4.ip_unprivileged_port_start = 80`

2. Reinicie completamente o Podman:
   ```bash
   podman-compose down
   podman system reset --force
   podman-compose up -d
   ```

### Porta 80 já está em uso

Verifique se outro serviço está usando a porta 80:
```bash
sudo lsof -i :80
# ou
sudo netstat -tulpn | grep :80
```

Se houver, pare o serviço conflitante ou use outra porta.

### Não funciona no Windows

No Windows WSL2, você pode precisar configurar o port forwarding. Use o Docker Desktop em vez do Podman se estiver no Windows.

## Alternativas (se não quiser configurar o sysctl)

### Opção 1: Usar Podman com sudo (rootful)

```bash
sudo docker-compose up -d  # ou sudo podman-compose up -d
```

### Opção 2: Usar proxy reverso no host

Instale nginx no host e configure como proxy reverso para localhost:8080.

### Opção 3: Aceitar usar porta 8080

Simplesmente acesse com a porta:
- http://app.pytake.net:8080
- http://api.pytake.net:8080

## Após Configurar

Depois de configurar tudo corretamente, você terá:

- ✅ `http://app.pytake.net` → Frontend (sem porta)
- ✅ `http://api.pytake.net` → Backend API (sem porta)
- ✅ `http://localhost` → Frontend via Nginx
- ✅ `http://localhost:3001` → Frontend direto
- ✅ `http://localhost:8000` → Backend direto

---

**Importante:** Esta configuração é para desenvolvimento local. Em produção, use um servidor web com permissões adequadas ou configure SSL com Let's Encrypt.
