# 🔐 Setup Let's Encrypt para Development

Para usar **certificados válidos** do Let's Encrypt em desenvolvimento, você precisa:

## ⚠️ Pré-requisitos

1. **Domínio REAL registrado** (não funciona com localhost ou hosts do /etc/hosts)
2. **DNS apontando para seu servidor** (A record para api-dev.pytake.net, app-dev.pytake.net)
3. **Porta 80 e 443 abertas** para validação ACME

## 📋 Seu Domínio Atualmente

- `api-dev.pytake.net` - Backend API
- `app-dev.pytake.net` - Frontend App

**Eles estão registrados e apontando para este servidor?**

## 🚀 Opção 1: Setup Automático com Script

```bash
chmod +x /home/administrator/pytake/setup-certbot-dev.sh

# Para domínio real:
./setup-certbot-dev.sh api-dev.pytake.net app-dev.pytake.net seu-email@gmail.com

# Depois:
podman compose up -d
```

## 🔧 Opção 2: Setup Manual

```bash
# 1. Parar containers
podman compose down

# 2. Iniciar apenas Nginx (sem containers da app)
podman run --rm -d \
  --name nginx-certbot \
  -p 80:80 -p 443:443 \
  -v /home/administrator/pytake/nginx-dev.conf:/etc/nginx/nginx.conf:ro \
  -v /home/administrator/pytake/certbot/conf:/etc/letsencrypt \
  -v /home/administrator/pytake/certbot/www:/var/www/certbot \
  nginx:1.25-alpine

# 3. Gerar certificado com Certbot
podman run --rm \
  -p 80:80 -p 443:443 \
  -v /home/administrator/pytake/certbot/conf:/etc/letsencrypt \
  -v /home/administrator/pytake/certbot/www:/var/www/certbot \
  certbot/certbot \
  certonly \
  --webroot \
  -w /var/www/certbot \
  -d api-dev.pytake.net \
  -d www.api-dev.pytake.net \
  -d app-dev.pytake.net \
  -d www.app-dev.pytake.net \
  --non-interactive \
  --agree-tos \
  --email seu-email@gmail.com

# 4. Parar Nginx temporário
podman stop nginx-certbot

# 5. Iniciar tudo normalmente
podman compose up -d
```

## ✅ Verificar Certificado

```bash
# Ver informações do certificado
podman exec pytake-nginx-dev openssl x509 -in /etc/letsencrypt/live/api-dev.pytake.net/fullchain.pem -text -noout | grep -E "Subject:|Issuer:|Not Before|Not After"

# Testar HTTPS (sem erro de certificado)
curl -v https://api-dev.pytake.net/nginx-health
curl -v https://app-dev.pytake.net
```

## 🔄 Renovação Automática

Para renovar automaticamente antes de expirar:

```bash
# Adicionar cron job
crontab -e

# Adicionar linha (renovar todo dia às 3:00 AM):
0 3 * * * podman exec pytake-nginx-dev certbot renew --quiet
```

## ❓ Problemas Comuns

### "Domain not validatable"
- Verifique se DNS está apontando para este servidor
- Teste com: `nslookup api-dev.pytake.net`

### "Permission denied"
- Certifique-se que certbot/conf tem permissões: `chmod 755 certbot/conf`

### "Certificate already exists"
- Remova certificado antigo: `rm -rf /home/administrator/pytake/certbot/conf/live/api-dev.pytake.net`

---

**Próximo passo:** Configure seus domínios no registrador de DNS apontando para este servidor, depois execute o setup.

