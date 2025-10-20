# Acesso Local - Testes de Conectividade

## Status dos Containers ✅

Todos os serviços estão rodando corretamente:

```
NAMES            STATUS                    PORTS
pytake-postgres  Up (healthy)              0.0.0.0:5432->5432/tcp
pytake-redis     Up (healthy)              0.0.0.0:6379->6379/tcp
pytake-mongodb   Up (healthy)              0.0.0.0:27018->27017/tcp
pytake-backend   Up                        0.0.0.0:8000->8000/tcp
pytake-frontend  Up                        0.0.0.0:3001->3000/tcp
pytake-nginx     Up                        0.0.0.0:8080->80/tcp, 0.0.0.0:8443->443/tcp
pytake-certbot   Up
```

## Testes de Conectividade ✅

### 1. Acesso via Localhost (Funcionando)

```bash
# Frontend via Nginx
http://localhost:8080
Status: 200 OK - Landing page do PyTake

# API via Nginx (usando header Host)
curl -H "Host: api.pytake.net" http://localhost:8080/
Status: 200 OK
Response: {"app":"PyTake","version":"1.0.0","environment":"development","status":"healthy","docs":"/api/v1/docs"}

# Frontend via Nginx (usando header Host)
curl -H "Host: app.pytake.net" http://localhost:8080
Status: 200 OK - Landing page do PyTake
```

### 2. Acesso Direto aos Serviços (Funcionando)

```bash
# Frontend direto
http://localhost:3001
Status: 200 OK

# Backend direto
http://localhost:8000
Status: OK - API FastAPI

# Documentação da API
http://localhost:8000/docs
Status: 200 OK - Swagger UI
```

## Como Acessar com Domínios Personalizados

Para acessar usando `app.pytake.net` e `api.pytake.net` localmente, você precisa adicionar entradas no arquivo **hosts** do sistema.

### No Linux/macOS

1. Edite o arquivo hosts:
   ```bash
   sudo nano /etc/hosts
   ```

2. Adicione as seguintes linhas:
   ```
   127.0.0.1    app.pytake.net
   127.0.0.1    api.pytake.net
   ```

3. Salve o arquivo (Ctrl+O, Enter, Ctrl+X)

### No Windows

1. Abra o Notepad como **Administrador**

2. Abra o arquivo:
   ```
   C:\Windows\System32\drivers\etc\hosts
   ```

3. Adicione as seguintes linhas ao final do arquivo:
   ```
   127.0.0.1    app.pytake.net
   127.0.0.1    api.pytake.net
   ```

4. Salve o arquivo

### Testando Após Configurar o Hosts

Após adicionar as entradas no arquivo hosts, você poderá acessar:

```bash
# Frontend
http://app.pytake.net:8080

# API
http://api.pytake.net:8080

# Documentação da API
http://api.pytake.net:8080/docs
```

**Nota:** Por enquanto, use a porta **8080** (HTTP). As portas 80 e 443 requerem privilégios de root ou configuração adicional do Podman.

## Resumo de Portas

| Serviço    | Porta Host | Porta Container | Acesso                          |
|------------|------------|-----------------|----------------------------------|
| Frontend   | 3001       | 3000            | http://localhost:3001            |
| Backend    | 8000       | 8000            | http://localhost:8000            |
| Nginx      | 8080       | 80              | http://localhost:8080            |
| Nginx SSL  | 8443       | 443             | https://localhost:8443 (futuro)  |
| PostgreSQL | 5432       | 5432            | localhost:5432                   |
| Redis      | 6379       | 6379            | localhost:6379                   |
| MongoDB    | 27018      | 27017           | localhost:27018                  |

## Configuração do Nginx

O Nginx está configurado para:

1. **Server Name: `app.pytake.net`**
   - Proxy para o frontend (port 3000)
   - Suporte a WebSocket para Next.js HMR

2. **Server Name: `api.pytake.net`**
   - Proxy para o backend (port 8000)
   - Suporte a WebSocket
   - Rate limiting: 10 req/s

3. **Server Name: `localhost` (default)**
   - `/api/` → Proxy para backend
   - `/` → Proxy para frontend

## Próximos Passos (SSL em Produção)

Para configurar SSL com Let's Encrypt em produção:

1. Configure DNS apontando para o servidor
2. Execute o script de setup: `./setup-ssl.sh`
3. O Certbot obterá certificados SSL automaticamente
4. Descomente os blocos HTTPS no `nginx.conf`
5. Reinicie o Nginx: `podman restart pytake-nginx`

Veja **SSL_SETUP.md** para instruções detalhadas.

## Troubleshooting

### Erro: "Failed to connect"
- Verifique se os containers estão rodando: `podman ps`
- Reinicie os containers: `podman-compose restart`

### Erro: "Connection refused" na porta 80
- Podman rootless não pode usar portas < 1024
- Use a porta 8080 em vez de 80
- Ou configure: `net.ipv4.ip_unprivileged_port_start=80` no `/etc/sysctl.conf`

### Nginx não consegue conectar ao backend
- Verifique os logs: `podman logs pytake-nginx`
- Reinicie a stack: `podman-compose down && podman-compose up -d`
- Todos os containers devem estar na mesma rede (`pytake_default`)

## Comandos Úteis

```bash
# Ver status dos containers
podman ps

# Ver logs
podman logs pytake-nginx
podman logs pytake-backend
podman logs pytake-frontend

# Reiniciar um serviço específico
podman restart pytake-nginx
podman restart pytake-backend

# Reiniciar toda a stack
podman-compose restart

# Parar tudo
podman-compose down

# Iniciar tudo
podman-compose up -d
```

---

**Data do Teste:** 20/10/2025
**Status Geral:** ✅ Todos os serviços funcionando corretamente
