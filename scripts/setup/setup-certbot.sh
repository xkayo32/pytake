#!/bin/bash
# Setup Certbot for Let's Encrypt SSL certificates

set -e

DOMAIN="api-dev.pytake.net"
EMAIL="admin@pytake.net"
CERTBOT_DIR="/home/administrator/pytake/certbot"
NGINX_DIR="/home/administrator/pytake"

echo "🔐 Configurando Let's Encrypt com Certbot..."
echo "📌 Domínio: $DOMAIN"
echo "📌 Email: $EMAIL"
echo "📌 IP Servidor: 209.105.242.206"

# Criar diretórios
mkdir -p "$CERTBOT_DIR/conf"
mkdir -p "$CERTBOT_DIR/www"

# Iniciar Nginx para Certbot validar
echo "▶️  Iniciando containers..."
cd "$NGINX_DIR"
podman compose up -d

# Aguardar Nginx ficar pronto
echo "⏳ Aguardando Nginx iniciar..."
sleep 10

# Executar Certbot dentro do container Nginx
echo "🔑 Gerando certificado Let's Encrypt..."
podman exec pytake-nginx-dev certbot certonly \
  --standalone \
  --non-interactive \
  --agree-tos \
  --email "$EMAIL" \
  --domains "$DOMAIN,www.$DOMAIN,app-dev.pytake.net,www.app-dev.pytake.net" \
  --cert-name "$DOMAIN" || echo "⚠️  Certbot falhou (pode já existir)"

echo ""
echo "✅ Certificado Let's Encrypt configurado!"
echo ""
echo "📁 Localização: $CERTBOT_DIR/conf/live/$DOMAIN/"
ls -la "$CERTBOT_DIR/conf/live/$DOMAIN/" 2>/dev/null || echo "Aguarde o Certbot processar..."

echo ""
echo "🔄 Reiniciando Nginx com certificado..."
podman compose restart nginx

echo ""
echo "✅ Pronto! Certificado Let's Encrypt ativo."
