# Troubleshooting: Erro 502 Bad Gateway

**Última ocorrência:** 20/10/2025
**Status:** Resolvido ✅

---

## 🐛 Sintoma

Frontend exibe erro:
```
AxiosError: Request failed with status code 502
```

No console do navegador:
```javascript
at async checkAuth (src/store/authStore.ts:144:24)
```

---

## 🔍 Causa Raiz

### Problema: IP do Backend Mudou

Quando o container backend é reiniciado, ele recebe um novo IP na rede interna do Podman. O Nginx, porém, mantém o IP antigo em cache e continua tentando conectar ao IP que não existe mais.

### Exemplo Real:

```bash
# Antes do restart
Backend IP: 10.89.0.28

# Depois do restart
Backend IP: 10.89.0.38

# Nginx ainda tenta conectar:
upstream: "http://10.89.0.28:8000/api/v1/auth/me"  # ❌ Host is unreachable
```

### Logs do Nginx:
```
2025/10/20 19:30:36 [error] 17#17: *134 connect() failed (113: Host is unreachable)
while connecting to upstream, client: 10.89.0.37,
server: app.pytake.net, request: "GET /api/v1/auth/me HTTP/2.0",
upstream: "http://10.89.0.28:8000/api/v1/auth/me"
```

---

## ✅ Solução

### Opção 1: Reiniciar Nginx (Recomendado)

```bash
podman restart pytake-nginx
```

**Por que funciona:**
- Nginx resolve novamente o nome `backend` para o novo IP
- Atualiza o cache de upstream
- Rápido e simples

### Opção 2: Reiniciar Todos os Serviços

```bash
podman-compose restart
```

**Desvantagem:** Causa downtime de todos os serviços.

### Opção 3: Usar Docker Compose `depends_on` (Preventivo)

No `compose.yaml`, o Nginx já tem `depends_on`:
```yaml
nginx:
  depends_on:
    - frontend
    - backend
```

Isso garante que o Nginx inicia **depois** do backend, mas não previne o problema se você reiniciar apenas o backend.

---

## 🔧 Como Diagnosticar

### 1. Verificar Status dos Containers

```bash
podman ps --format "table {{.Names}}\t{{.Status}}"
```

Se o backend foi reiniciado recentemente → Possível causa de 502.

### 2. Verificar Logs do Nginx

```bash
podman logs pytake-nginx 2>&1 | grep -E "error|502|upstream" | tail -20
```

**Procure por:**
- `connect() failed (113: Host is unreachable)`
- `upstream: "http://10.89.0.X:8000/..."`

### 3. Verificar IP Atual do Backend

```bash
podman inspect pytake-backend --format '{{.NetworkSettings.Networks.pytake_default.IPAddress}}'
```

**Compare com o IP nos logs do Nginx.** Se forem diferentes → É esse o problema!

### 4. Testar Endpoint Diretamente

```bash
# Direto no backend (porta 8000)
curl http://localhost:8000/api/v1/auth/login

# Através do Nginx (HTTPS)
curl https://app.pytake.net/api/v1/auth/login
```

Se o primeiro funciona mas o segundo retorna 502 → Nginx não está alcançando o backend.

---

## 🚀 Solução Rápida (Copy/Paste)

```bash
# 1. Verificar se é o problema do IP
echo "IP atual do backend:"
podman inspect pytake-backend --format '{{.NetworkSettings.Networks.pytake_default.IPAddress}}'

echo "Últimos erros do Nginx:"
podman logs pytake-nginx 2>&1 | grep "upstream" | tail -5

# 2. Reiniciar Nginx
podman restart pytake-nginx

# 3. Aguardar 3 segundos
sleep 3

# 4. Testar
curl -I https://app.pytake.net/api/v1/auth/login
```

**Resultado esperado:** HTTP/2 405 (não mais 502) ✅

---

## 📚 Prevenção Futura

### Evitar Reiniciar Apenas o Backend

Sempre que possível, reinicie ambos:
```bash
podman restart pytake-backend pytake-nginx
```

### Automatizar com Script

Crie um script `restart-backend.sh`:
```bash
#!/bin/bash
echo "🔄 Reiniciando backend..."
podman restart pytake-backend

echo "⏳ Aguardando backend..."
sleep 5

echo "🔄 Reiniciando Nginx..."
podman restart pytake-nginx

echo "✅ Pronto! Backend e Nginx reiniciados."
```

Uso:
```bash
chmod +x restart-backend.sh
./restart-backend.sh
```

---

## 🔄 Alternativa: Usar Hostname em vez de IP (DNS Resolver)

### nginx.conf com DNS Resolver

Adicione ao `nginx.conf` (dentro de `http` block):
```nginx
http {
    # ...

    # DNS resolver (resolve nomes dinamicamente)
    resolver 127.0.0.11 valid=10s;  # IP do DNS interno do Podman

    # ...
}

server {
    # Use variável em vez de upstream estático
    set $backend_host backend:8000;

    location /api/ {
        proxy_pass http://$backend_host;
        # ...
    }
}
```

**Vantagem:** Nginx resolve o nome `backend` dinamicamente a cada requisição.

**Desvantagem:** Pequeno overhead de DNS lookup.

---

## 📊 Resumo

| Situação | Causa | Solução |
|----------|-------|---------|
| Backend reiniciado manualmente | IP mudou, Nginx não sabe | `podman restart pytake-nginx` |
| Todos os containers reiniciados | Não ocorre (ordem correta) | N/A |
| Backend travou/crashou | IP mudou após restart automático | `podman restart pytake-nginx` |
| Atualização de código backend | Deploy reinicia backend | Incluir restart do Nginx no deploy |

---

## ✅ Checklist de Diagnóstico

- [ ] Verificar status dos containers (`podman ps`)
- [ ] Verificar logs do Nginx (`podman logs pytake-nginx | grep error`)
- [ ] Verificar IP atual do backend
- [ ] Comparar IP do backend com IP nos logs do Nginx
- [ ] Testar endpoint direto no backend (localhost:8000)
- [ ] Testar endpoint via Nginx (HTTPS)
- [ ] Reiniciar Nginx
- [ ] Testar novamente

---

## 📞 Outros Erros 502

Se reiniciar o Nginx **não resolver**, considere:

1. **Backend não está respondendo**
   ```bash
   podman logs pytake-backend --tail 50
   ```
   Procure por crashes, erros Python, etc.

2. **Backend está lento/travado**
   ```bash
   # Ver processos no container
   podman exec pytake-backend ps aux

   # Ver uso de CPU/Memória
   podman stats pytake-backend --no-stream
   ```

3. **Timeout do Nginx**
   Adicione no `nginx.conf`:
   ```nginx
   location /api/ {
       proxy_pass http://backend;
       proxy_read_timeout 300s;  # 5 minutos
       proxy_connect_timeout 75s;
       # ...
   }
   ```

4. **Limite de Conexões**
   Verifique worker_connections no nginx.conf:
   ```nginx
   events {
       worker_connections 1024;  # Aumente se necessário
   }
   ```

---

**Última atualização:** 20/10/2025
**Resolvido por:** Restart do Nginx após IP do backend mudar
