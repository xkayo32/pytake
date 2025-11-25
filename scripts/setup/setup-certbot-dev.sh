#!/bin/bash
# Setup Certbot with Let's Encrypt for development

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check parameters
if [ -z "$1" ] || [ -z "$2" ]; then
    echo -e "${RED}Uso: $0 <domínio_api> <domínio_app> [email]${NC}"
    echo -e "${YELLOW}Exemplo: $0 api-dev.pytake.net app-dev.pytake.net seu-email@gmail.com${NC}"
    exit 1
fi

DOMAIN_API="${1}"
DOMAIN_APP="${2}"
EMAIL="${3:-admin@pytake.net}"
CERT_DIR="/home/administrator/pytake/certbot"

echo -e "${YELLOW}📋 Configurando Let's Encrypt para DEV${NC}"
echo "Domínio API: $DOMAIN_API"
echo "Domínio APP: $DOMAIN_APP"
echo "Email: $EMAIL"
echo ""

# Criar estrutura de diretórios
echo -e "${YELLOW}📁 Criando estrutura de diretórios...${NC}"
mkdir -p "$CERT_DIR/conf"
mkdir -p "$CERT_DIR/www"

# Iniciar Nginx temporário para desafio ACME
echo -e "${YELLOW}🚀 Iniciando Nginx temporário para validação ACME...${NC}"

podman run --rm -d \
  --name nginx-certbot-temp \
  -p 80:80 \
  -p 443:443 \
  -v "$CERT_DIR/conf:/etc/letsencrypt" \
  -v "$CERT_DIR/www:/var/www/certbot" \
  nginx:1.25-alpine \
  sh -c "mkdir -p /var/www/certbot && nginx -g 'daemon off;'" &

NGINX_PID=$!
sleep 5

# Gerar certificado com Certbot
echo -e "${YELLOW}🔐 Gerando certificado Let's Encrypt...${NC}"

podman run --rm \
  --name certbot-temp \
  -p 80:80 \
  -p 443:443 \
  -v "$CERT_DIR/conf:/etc/letsencrypt" \
  -v "$CERT_DIR/www:/var/www/certbot" \
  certbot/certbot \
  certonly \
  --webroot \
  -w /var/www/certbot \
  -d "$DOMAIN_API" \
  -d "www.$DOMAIN_API" \
  -d "$DOMAIN_APP" \
  -d "www.$DOMAIN_APP" \
  --non-interactive \
  --agree-tos \
  --email "$EMAIL" \
  --force-renewal

# Parar Nginx temporário
echo -e "${YELLOW}🛑 Parando Nginx temporário...${NC}"
podman stop nginx-certbot-temp 2>/dev/null || true

echo -e "${GREEN}✅ Certificado gerado com sucesso!${NC}"
echo ""
echo -e "${GREEN}📍 Certificados localizados em:${NC}"
ls -la "$CERT_DIR/conf/live/" | grep -E "api-dev|app-dev" || echo "Verifique se os domínios foram validados"

echo ""
echo -e "${GREEN}✨ Próximo passo: rodar 'podman compose up -d'${NC}"
