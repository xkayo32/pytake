#!/bin/bash

# Script para gerar certificados SSL com Certbot

echo "Gerando certificados SSL para PyTake..."

# Instalar certbot se não estiver instalado
if ! command -v certbot &> /dev/null; then
    echo "Instalando Certbot..."
    sudo apt-get update
    sudo apt-get install -y certbot python3-certbot-nginx
fi

# Gerar certificados para os subdomínios
echo "Gerando certificado para api.pytake.net e app.pytake.net..."
sudo certbot certonly \
    --standalone \
    --non-interactive \
    --agree-tos \
    --email admin@pytake.net \
    --domains api.pytake.net,app.pytake.net \
    --pre-hook "docker-compose stop nginx" \
    --post-hook "docker-compose start nginx"

echo "Certificados SSL gerados com sucesso!"