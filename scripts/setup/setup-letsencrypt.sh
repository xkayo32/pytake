#!/bin/bash

# Script para configurar certificados Let's Encrypt

echo "=== Configuração de SSL com Let's Encrypt ==="
echo ""
echo "Este script irá gerar certificados SSL válidos para:"
echo "  - api.pytake.net"
echo "  - app.pytake.net"
echo ""

# Verificar se os domínios estão apontando para este servidor
echo "Verificando DNS..."
API_IP=$(dig +short api.pytake.net)
APP_IP=$(dig +short app.pytake.net)
SERVER_IP=$(curl -s ifconfig.me)

echo "IP do servidor: $SERVER_IP"
echo "api.pytake.net aponta para: $API_IP"
echo "app.pytake.net aponta para: $APP_IP"

if [ "$API_IP" != "$SERVER_IP" ] || [ "$APP_IP" != "$SERVER_IP" ]; then
    echo ""
    echo "⚠️  AVISO: Os domínios não estão apontando para este servidor!"
    echo "Configure o DNS antes de continuar."
    exit 1
fi

echo ""
echo "✓ DNS configurado corretamente!"
echo ""

# Parar nginx temporariamente
echo "Parando nginx..."
docker-compose stop nginx

# Gerar certificados
echo "Gerando certificados Let's Encrypt..."
docker-compose run --rm certbot certonly \
    --standalone \
    --email admin@pytake.net \
    --agree-tos \
    --no-eff-email \
    --force-renewal \
    -d api.pytake.net \
    -d app.pytake.net

# Reiniciar nginx
echo "Reiniciando nginx..."
docker-compose start nginx

echo ""
echo "✅ Configuração SSL concluída!"
echo ""
echo "Acesse:"
echo "  https://api.pytake.net"
echo "  https://app.pytake.net"