# Configuração SSL/HTTPS para PyTake

Este guia explica como configurar HTTPS com Let's Encrypt para os domínios **app.pytake.net** (frontend) e **api.pytake.net** (backend).

## 📋 Pré-requisitos

1. **Domínios configurados** - Certifique-se de que os registros DNS apontam para o servidor:
   ```
   app.pytake.net  →  A record  →  SEU_IP_SERVIDOR
   api.pytake.net  →  A record  →  SEU_IP_SERVIDOR
   ```

2. **Portas abertas no firewall**:
   ```bash
   # Permitir HTTP e HTTPS
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw status
   ```

3. **Serviços rodando**:
   ```bash
   podman-compose up -d
   podman ps  # Verificar se todos estão running
   ```

## 🚀 Instalação SSL Automática

### Passo 1: Execute o script de setup

```bash
./setup-ssl.sh
```

O script irá:
- ✅ Solicitar seu email para Let's Encrypt
- ✅ Verificar se Nginx está rodando
- ✅ Obter certificados para app.pytake.net
- ✅ Obter certificados para api.pytake.net
- ✅ Configurar renovação automática

### Passo 2: Habilitar HTTPS no Nginx

Edite o arquivo `nginx.conf`:

```bash
nano nginx.conf
```

**Alterações necessárias:**

1. **Descomente os blocos HTTPS** (linhas ~91-185):
   ```nginx
   # Remover comentário '#' das linhas:
   server {
       listen 443 ssl http2;
       server_name api.pytake.net;
       # ... resto do bloco
   }

   server {
       listen 443 ssl http2;
       server_name app.pytake.net;
       # ... resto do bloco
   }
   ```

2. **Remova/comente os proxies HTTP temporários** (linhas ~38-88):
   ```nginx
   # Comentar as linhas de proxy temporário:
   # location / {
   #     proxy_pass http://backend;
   #     ...
   # }
   ```

3. **Descomente os redirects HTTPS** (linhas ~33-35 e ~65-67):
   ```nginx
   # Descomentar:
   location / {
       return 301 https://$server_name$request_uri;
   }
   ```

### Passo 3: Reiniciar Nginx

```bash
podman restart pytake-nginx

# Verificar logs
podman logs pytake-nginx
```

### Passo 4: Atualizar variáveis de ambiente

**Backend** (`backend/.env.docker`):
```bash
# Já está configurado com CORS para app.pytake.net
CORS_ORIGINS=https://app.pytake.net
```

**Frontend** (`.env`):
```bash
# Alterar para usar HTTPS
NEXT_PUBLIC_API_URL=https://api.pytake.net
```

### Passo 5: Reiniciar serviços

```bash
# Reiniciar frontend para pegar nova URL da API
podman restart pytake-frontend

# Reiniciar backend (opcional, mas recomendado)
podman restart pytake-backend
```

## 🧪 Testar HTTPS

```bash
# Testar frontend
curl -I https://app.pytake.net

# Testar backend API
curl -I https://api.pytake.net/health

# Testar redirect HTTP → HTTPS
curl -I http://app.pytake.net
# Deve retornar: HTTP/1.1 301 Moved Permanently
```

**No navegador:**
1. Acesse https://app.pytake.net
2. Verifique o cadeado 🔒 na barra de endereço
3. Faça login: admin@pytake.com / Admin123

## 🔄 Renovação Automática

O container **Certbot** renova automaticamente os certificados a cada 12 horas:

```bash
# Verificar status do Certbot
podman ps | grep certbot

# Ver logs de renovação
podman logs pytake-certbot

# Forçar renovação manual (se necessário)
podman exec pytake-certbot certbot renew --force-renewal
```

## 📁 Estrutura de Arquivos SSL

```
pytake/
├── certbot/
│   ├── conf/
│   │   ├── live/
│   │   │   ├── app.pytake.net/
│   │   │   │   ├── fullchain.pem
│   │   │   │   ├── privkey.pem
│   │   │   │   └── chain.pem
│   │   │   └── api.pytake.net/
│   │   │       ├── fullchain.pem
│   │   │       ├── privkey.pem
│   │   │       └── chain.pem
│   │   └── renewal/
│   └── www/
│       └── .well-known/acme-challenge/
└── nginx.conf
```

## 🛠️ Troubleshooting

### Erro: "Connection refused"
```bash
# Verificar se Nginx está rodando
podman ps | grep nginx

# Verificar logs
podman logs pytake-nginx
```

### Erro: "Failed to verify certificate"
```bash
# Verificar se domínios apontam para o servidor
nslookup app.pytake.net
nslookup api.pytake.net

# Verificar portas abertas
sudo netstat -tlnp | grep -E ':(80|443)'
```

### Erro: "Rate limit exceeded" (Let's Encrypt)
- Let's Encrypt tem limite de 5 certificados por semana por domínio
- Use flag `--staging` para testar:
  ```bash
  # No setup-ssl.sh, adicione --staging
  certonly --webroot --staging ...
  ```

### Certificados expirados
```bash
# Forçar renovação
podman exec pytake-certbot certbot renew --force-renewal

# Reiniciar Nginx
podman restart pytake-nginx
```

## 📊 Verificar Configuração SSL

Ferramentas online:
- **SSL Labs**: https://www.ssllabs.com/ssltest/
- **SSL Checker**: https://www.sslshopper.com/ssl-checker.html

## 🔙 Reverter para HTTP (Development)

Se precisar voltar para HTTP local:

1. Comentar blocos HTTPS no `nginx.conf`
2. Descomentar proxies HTTP
3. Alterar `.env`:
   ```bash
   NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
   ```
4. Reiniciar:
   ```bash
   podman restart pytake-nginx pytake-frontend
   ```

## 📚 Recursos

- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Certbot Documentation](https://eff-certbot.readthedocs.io/)
- [Nginx SSL Configuration](https://nginx.org/en/docs/http/configuring_https_servers.html)

## ✅ Checklist Final

- [ ] Domínios DNS configurados
- [ ] Portas 80 e 443 abertas no firewall
- [ ] Serviços Podman rodando
- [ ] Script `setup-ssl.sh` executado
- [ ] Certificados obtidos (verificar `certbot/conf/live/`)
- [ ] `nginx.conf` atualizado (HTTPS descomentado)
- [ ] Variáveis de ambiente atualizadas
- [ ] Nginx reiniciado
- [ ] Frontend e backend reiniciados
- [ ] Testes HTTPS funcionando
- [ ] Renovação automática ativa

**Pronto! Seu PyTake está rodando com HTTPS! 🔐✨**
