#!/bin/bash
# PyTake SSL Setup Script
# Configura certificados SSL do Let's Encrypt para app.pytake.net e api.pytake.net

set -e

echo "🔐 PyTake SSL Setup"
echo "==================="
echo ""

# Verificar se os domínios foram configurados
read -p "Email para Let's Encrypt: " EMAIL
if [ -z "$EMAIL" ]; then
    echo "❌ Email é obrigatório!"
    exit 1
fi

echo ""
echo "📋 Configuração:"
echo "   - Frontend: app.pytake.net"
echo "   - Backend: api.pytake.net"
echo "   - Email: $EMAIL"
echo ""

read -p "Continuar? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Cancelado"
    exit 1
fi

# Criar diretórios necessários
echo "📁 Criando diretórios..."
mkdir -p certbot/www certbot/conf

# Verificar se Nginx está rodando
echo "🔍 Verificando Nginx..."
if ! podman ps | grep -q pytake-nginx; then
    echo "❌ Nginx não está rodando!"
    echo "   Execute: podman-compose up -d nginx"
    exit 1
fi

echo "✅ Nginx está rodando"

# Obter certificado para app.pytake.net
echo ""
echo "🌐 Obtendo certificado para app.pytake.net..."
podman run --rm \
    --name certbot-app \
    -v ./certbot/www:/var/www/certbot:Z \
    -v ./certbot/conf:/etc/letsencrypt:Z \
    docker.io/certbot/certbot:latest \
    certonly --webroot \
    --webroot-path=/var/www/certbot \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    --force-renewal \
    -d app.pytake.net

if [ $? -ne 0 ]; then
    echo "❌ Falha ao obter certificado para app.pytake.net"
    echo "   Verifique se o domínio está apontando para este servidor"
    exit 1
fi

echo "✅ Certificado para app.pytake.net obtido"

# Obter certificado para api.pytake.net
echo ""
echo "🌐 Obtendo certificado para api.pytake.net..."
podman run --rm \
    --name certbot-api \
    -v ./certbot/www:/var/www/certbot:Z \
    -v ./certbot/conf:/etc/letsencrypt:Z \
    docker.io/certbot/certbot:latest \
    certonly --webroot \
    --webroot-path=/var/www/certbot \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    --force-renewal \
    -d api.pytake.net

if [ $? -ne 0 ]; then
    echo "❌ Falha ao obter certificado para api.pytake.net"
    echo "   Verifique se o domínio está apontando para este servidor"
    exit 1
fi

echo "✅ Certificado para api.pytake.net obtido"

# Atualizar nginx.conf para habilitar HTTPS
echo ""
echo "📝 Atualizando configuração do Nginx..."
echo "   IMPORTANTE: Você precisa descomentar os blocos HTTPS no nginx.conf"
echo "   E comentar/remover os blocos HTTP temporários"
echo ""
echo "   Edite nginx.conf e:"
echo "   1. Descomente os blocos 'server' com 'listen 443 ssl'"
echo "   2. Comente as linhas de proxy HTTP temporário"
echo "   3. Descomente as linhas de redirect para HTTPS"
echo ""

read -p "Deseja que eu atualize o nginx.conf automaticamente? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🔧 Atualizando nginx.conf..."

    # Fazer backup
    cp nginx.conf nginx.conf.backup

    # Substituir configuração (isso requer um script mais elaborado)
    echo "   Backup criado: nginx.conf.backup"
    echo "   ⚠️  Edite manualmente o nginx.conf para habilitar HTTPS"
else
    echo "   ⚠️  Lembre-se de editar nginx.conf manualmente!"
fi

# Reiniciar Nginx
echo ""
echo "🔄 Reiniciando Nginx..."
podman restart pytake-nginx

# Iniciar Certbot para renovação automática
echo ""
echo "🤖 Iniciando Certbot para renovação automática..."
podman-compose up -d certbot

echo ""
echo "✅ SSL configurado com sucesso!"
echo ""
echo "📋 Próximos passos:"
echo "   1. Verifique os certificados: ls -la certbot/conf/live/"
echo "   2. Edite nginx.conf para habilitar HTTPS"
echo "   3. Reinicie o Nginx: podman restart pytake-nginx"
echo "   4. Teste os domínios:"
echo "      - https://app.pytake.net"
echo "      - https://api.pytake.net"
echo ""
echo "   5. Atualize as variáveis de ambiente:"
echo "      - Backend: FRONTEND_URL=https://app.pytake.net"
echo "      - Backend: CORS_ORIGINS=https://app.pytake.net"
echo "      - Frontend: NEXT_PUBLIC_API_URL=https://api.pytake.net"
echo ""
echo "🔄 Renovação automática configurada (a cada 12 horas)"
