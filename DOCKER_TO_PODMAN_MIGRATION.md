# Docker to Podman Migration Guide

Este guia ajuda você a migrar do Docker para o Podman no projeto PyTake.

## 🎯 Por que migrar para Podman?

- **Rootless por padrão**: Mais seguro, não requer privilégios de root
- **Daemonless**: Não há daemon em background, melhor gerenciamento de recursos
- **Compatível com Docker**: Drop-in replacement, usa as mesmas imagens e Dockerfiles
- **Pods nativos**: Suporte nativo para pods do Kubernetes
- **Open Source**: 100% open source, sem licenças corporativas

## 📋 Pré-requisitos

### Windows
1. Desinstalar Docker Desktop (opcional, mas recomendado)
2. Instalar **Podman Desktop**: https://podman-desktop.io/downloads
3. Após instalação, inicializar o Podman Machine:
   ```powershell
   podman machine init
   podman machine start
   ```

### Linux
1. Instalar Podman:
   ```bash
   # Ubuntu/Debian
   sudo apt-get update
   sudo apt-get install -y podman

   # Fedora/RHEL
   sudo dnf install -y podman

   # Arch Linux
   sudo pacman -S podman
   ```

2. Instalar podman-compose:
   ```bash
   pip install podman-compose
   ```

### macOS
1. Desinstalar Docker Desktop (opcional)
2. Instalar **Podman Desktop**: https://podman-desktop.io/downloads
3. Ou instalar via Homebrew:
   ```bash
   brew install podman
   brew install podman-compose
   ```
4. Inicializar Podman Machine:
   ```bash
   podman machine init
   podman machine start
   ```

## 🔄 Processo de Migração

### Passo 1: Parar containers Docker

```bash
# Parar todos os containers
docker compose down

# Ou (se usar docker-compose legado)
docker-compose down

# Remover volumes (CUIDADO: Isso apaga os dados!)
docker compose down -v
```

### Passo 2: Backup dos dados (Opcional mas Recomendado)

```bash
# Backup do PostgreSQL
docker exec pytake-postgres pg_dump -U pytake pytake > backup_postgres.sql

# Backup do MongoDB
docker exec pytake-mongodb mongodump --archive=backup_mongodb.archive --db=pytake_logs

# Backup do Redis (opcional, cache é regenerável)
docker exec pytake-redis redis-cli SAVE
docker cp pytake-redis:/data/dump.rdb backup_redis.rdb
```

### Passo 3: Usar o novo compose.yaml

O projeto agora usa `compose.yaml` (compatível com Podman e Docker Compose v2+):

```bash
# Iniciar com Podman
podman-compose up -d
# OU
podman compose up -d

# Verificar se os containers estão rodando
podman ps
```

### Passo 4: Executar migrações

```bash
# Executar migrações do banco
podman exec pytake-backend alembic upgrade head

# Verificar logs
podman-compose logs -f backend
```

### Passo 5: Testar a aplicação

Acesse:
- Frontend: http://localhost:3001
- Backend API Docs: http://localhost:8000/docs
- Login: admin@pytake.com / Admin123

## 🔧 Comandos Equivalentes

| Docker | Podman | Descrição |
|--------|--------|-----------|
| `docker compose up -d` | `podman-compose up -d` ou `podman compose up -d` | Iniciar serviços |
| `docker compose down` | `podman-compose down` ou `podman compose down` | Parar serviços |
| `docker ps` | `podman ps` | Listar containers |
| `docker exec -it <container> bash` | `podman exec -it <container> bash` | Acessar shell |
| `docker logs <container>` | `podman logs <container>` | Ver logs |
| `docker build -t <tag> .` | `podman build -t <tag> .` | Build de imagem |
| `docker images` | `podman images` | Listar imagens |
| `docker rm <container>` | `podman rm <container>` | Remover container |
| `docker rmi <image>` | `podman rmi <image>` | Remover imagem |

## 🐛 Troubleshooting

### Erro: "permission denied" ao montar volumes

**Solução (Linux com SELinux):**
O `compose.yaml` já inclui flags `:Z` e `:z` nos volumes para compatibilidade com SELinux.

Se ainda tiver problemas:
```bash
# Verificar se SELinux está ativo
getenforce

# Temporariamente desabilitar (não recomendado para produção)
sudo setenforce 0

# Ou ajustar contexto manualmente
chcon -Rt svirt_sandbox_file_t ./backend
chcon -Rt svirt_sandbox_file_t ./frontend
```

### Erro: "no podman socket found"

**Solução (macOS/Windows):**
```bash
# Verificar status do Podman Machine
podman machine list

# Iniciar se necessário
podman machine start

# Verificar conexão
podman info
```

### Containers não se comunicam entre si

**Solução:**
```bash
# Verificar rede
podman network ls

# Recriar rede se necessário
podman network rm pytake_default
podman-compose down
podman-compose up -d
```

### Performance lenta (macOS/Windows)

**Solução:**
```bash
# Aumentar recursos da Podman Machine
podman machine stop
podman machine set --cpus 4 --memory 8192
podman machine start
```

### Porta já em uso

**Solução:**
```bash
# Verificar o que está usando a porta
# Linux/macOS:
sudo lsof -i :8000
# Windows (PowerShell):
netstat -ano | findstr :8000

# Parar containers antigos do Docker
docker ps -a
docker rm -f <container_id>

# Ou mudar a porta no arquivo .env
echo "BACKEND_PORT=8001" >> .env
```

## 🔄 Restaurar Backup (Se necessário)

### PostgreSQL
```bash
# Copiar backup para dentro do container
podman cp backup_postgres.sql pytake-postgres:/tmp/

# Restaurar
podman exec -it pytake-postgres psql -U pytake pytake < /tmp/backup_postgres.sql
```

### MongoDB
```bash
# Copiar backup para dentro do container
podman cp backup_mongodb.archive pytake-mongodb:/tmp/

# Restaurar
podman exec -it pytake-mongodb mongorestore --archive=/tmp/backup_mongodb.archive --db=pytake_logs
```

### Redis
```bash
# Copiar backup
podman cp backup_redis.rdb pytake-redis:/data/dump.rdb

# Reiniciar container
podman restart pytake-redis
```

## ✅ Verificação Final

```bash
# 1. Verificar todos os containers
podman ps

# 2. Testar backend
curl http://localhost:8000/health

# 3. Testar frontend
curl http://localhost:3001

# 4. Verificar logs
podman-compose logs backend frontend

# 5. Acessar banco de dados
podman exec -it pytake-postgres psql -U pytake -d pytake
```

## 📚 Recursos Adicionais

- **Podman Documentation**: https://docs.podman.io/
- **Podman Desktop**: https://podman-desktop.io/
- **Podman Compose**: https://github.com/containers/podman-compose
- **Migration Guide (Official)**: https://podman.io/getting-started/migration

## 🆘 Suporte

Se encontrar problemas durante a migração:

1. Verifique os logs: `podman-compose logs -f`
2. Verifique o status: `podman ps -a`
3. Consulte o [CLAUDE.md](CLAUDE.md) para comandos específicos
4. Abra uma issue no repositório

## 🔙 Reverter para Docker (Se necessário)

Se precisar voltar para Docker:

```bash
# 1. Parar Podman
podman-compose down

# 2. Iniciar com Docker
docker compose up -d

# 3. Executar migrações
docker exec pytake-backend alembic upgrade head
```

O `compose.yaml` é compatível com ambos!
