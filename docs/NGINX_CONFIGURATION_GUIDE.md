# 🔧 Nginx Configuration Guide - PyTake

Guia de instalação e configuração do Nginx para rotear os 3 ambientes.

## 📋 Pré-requisitos

- Nginx instalado (`sudo apt install nginx` ou `brew install nginx`)
- SSL certificates (Let's Encrypt ou auto-assinado)
- 3 ambientes rodando localmente em portas diferentes

## 🚀 Setup

### 1. Verificar Nginx

```bash
# Verificar instalação
nginx -v

# Testar sintaxe
nginx -t

# Status
systemctl status nginx  # Linux
brew services list | grep nginx  # macOS
```

### 2. Copiar Configuração

```bash
# Copiar arquivo nginx.conf para diretório do sistema
# Linux/systemd:
sudo cp /home/administrator/pytake/nginx/nginx.conf /etc/nginx/sites-available/pytake
sudo ln -s /etc/nginx/sites-available/pytake /etc/nginx/sites-enabled/

# macOS (Homebrew):
cp /home/administrator/pytake/nginx/nginx.conf /usr/local/etc/nginx/pytake.conf
# Editar /usr/local/etc/nginx/nginx.conf e adicionar: include pytake.conf;
```

### 3. Configurar SSL (Let's Encrypt)

```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx  # Linux
brew install certbot  # macOS

# Criar certificados (production)
sudo certbot certonly --standalone \
  -d api.pytake.net \
  -d pytake.net \
  -d www.pytake.net

# Criar certificados (staging)
sudo certbot certonly --standalone \
  -d staging-api.pytake.net \
  -d staging.pytake.net

# Auto-renew (Linux - já incluído)
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Check renewal (manual no macOS)
brew services start certbot
sudo certbot renew --dry-run
```

### 4. Verificar e Recarregar

```bash
# Sintaxe
nginx -t  # ou sudo nginx -t

# Reload
sudo systemctl reload nginx  # Linux
sudo brew services reload nginx  # macOS

# Verificar se está rodando
curl -I https://api.pytake.net

# Ver logs
sudo tail -f /var/log/nginx/api_production_access.log
sudo tail -f /var/log/nginx/api_production_error.log
```

## 🔍 Verificação de Rotas

Após setup:

```bash
# Production API
curl -v https://api.pytake.net/api/v1/docs

# Production App
curl -v https://pytake.net

# Staging API
curl -v https://staging-api.pytake.net/api/v1/docs

# Staging App
curl -v https://staging.pytake.net

# Development (local)
curl http://localhost:8002/api/v1/docs
```

## 🔄 Recarregar Configuração

```bash
# Recarregar Nginx (sem restart)
sudo systemctl reload nginx  # Linux
sudo nginx -s reload  # Manual

# Ou apache style:
sudo systemctl restart nginx

# Verificar erros
sudo nginx -t
```

## 📊 Monitoramento

```bash
# Ver requests em tempo real
sudo tail -f /var/log/nginx/access.log | grep pytake

# Ver erros
sudo tail -f /var/log/nginx/error.log

# Estatísticas por domínio
sudo awk '{print $1}' /var/log/nginx/access.log | sort | uniq -c | sort -rn | head -20
```

## 🔐 Segurança

Configurações já incluídas em `nginx.conf`:

- ✅ SSL/TLS 1.2+ obrigatório
- ✅ Ciphers fortes selecionados
- ✅ Prefer server ciphers ativo
- ✅ HSTS header (adicionar se necessário)
- ✅ X-Frame-Options, X-Content-Type-Options (adicionar se necessário)

Para reforçar, adicionar ao bloco `server {}`:

```nginx
# HSTS
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

# Security headers
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "no-referrer-when-downgrade" always;
```

## 🆘 Troubleshooting

### "Connection refused"

```bash
# Verificar se containers estão rodando
podman ps | grep pytake

# Verificar se portas 8000, 8001, 8002 estão ouvindo
netstat -tlnp | grep -E ':800[0-2]'

# Testar conexão local
curl http://localhost:8000/api/v1/docs
```

### "SSL certificate problem"

```bash
# Verificar certificado
sudo openssl x509 -in /etc/letsencrypt/live/api.pytake.net/fullchain.pem -text -noout

# Verificar expiração
sudo certbot certificates

# Renovar manualmente
sudo certbot renew --force-renewal
```

### "Connection timed out"

```bash
# Verificar sintaxe
sudo nginx -t

# Recarregar
sudo systemctl reload nginx

# Ver erro específico
sudo journalctl -u nginx -n 50
```

### "502 Bad Gateway"

- Backend não está rodando → Verificar `podman ps`
- Upstream incorreta → Verificar `localhost:8000/8001/8002`
- Timeout curto → Aumentar `proxy_read_timeout` em nginx.conf

## 📝 Logs Úteis

```bash
# Ver todas requisições para Production API
sudo grep "api.pytake.net" /var/log/nginx/access.log | tail -20

# Ver erros 5xx
sudo grep "5[0-9][0-9]" /var/log/nginx/access.log

# Ver latência alta (requests > 1s)
sudo awk '$NF > 1' /var/log/nginx/access.log | tail -10

# Análise por hora
sudo awk '{print $4}' /var/log/nginx/access.log | uniq -c
```

---

**Última atualização:** 18/11/2025
