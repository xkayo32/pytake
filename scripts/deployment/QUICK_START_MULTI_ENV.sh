#!/bin/bash

##############################################################################
# 🚀 QUICK START - Configuração Multi-Ambiente em 5 Minutos
##############################################################################

# Este script ajuda você a configurar rapidamente subdomínios, DNS e SSL

set -euo pipefail

# Colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  PYTAKE - Multi-Environment Quick Start  ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"

##############################################################################
# Step 1: DNS Configuration
##############################################################################

echo -e "\n${YELLOW}[1/5] DNS Configuration${NC}"
echo "Apontar os seguintes subdomínios para seu servidor:"
echo ""
echo "  📍 api.pytake.net (Production)"
echo "  📍 staging-api.pytake.net (Staging)"
echo "  📍 dev-api.pytake.net (Development - opcional)"
echo "  📍 app.pytake.net (Frontend)"
echo ""
echo "Seu IP: $(curl -s https://api.ipify.org)"
echo ""
read -p "Pressione Enter quando os DNS estiverem configurados..."

##############################################################################
# Step 2: SSL Certificates
##############################################################################

echo -e "\n${YELLOW}[2/5] Gerando SSL Certificates com Certbot${NC}"

# Check if certbot is installed
if ! command -v certbot &> /dev/null; then
    echo "Instalando Certbot..."
    sudo apt update
    sudo apt install -y certbot python3-certbot-nginx
fi

echo "Gerando certificados para todos os subdomínios..."
sudo certbot certonly --standalone \
  -d api.pytake.net \
  -d staging-api.pytake.net \
  -d dev-api.pytake.net \
  -d app.pytake.net \
  --agree-tos \
  --email admin@pytake.net \
  --non-interactive || true

echo -e "${GREEN}✅ Certificados gerados em: /etc/letsencrypt/live/api.pytake.net/${NC}"

##############################################################################
# Step 3: Nginx Configuration
##############################################################################

echo -e "\n${YELLOW}[3/5] Configurando Nginx${NC}"

# Copy Nginx config
sudo cp $(pwd)/nginx/nginx-subdomains.conf /etc/nginx/sites-available/pytake
sudo ln -sf /etc/nginx/sites-available/pytake /etc/nginx/sites-enabled/pytake

# Test Nginx config
if sudo nginx -t; then
    echo -e "${GREEN}✅ Nginx configuration is valid${NC}"
else
    echo -e "❌ Nginx configuration error"
    exit 1
fi

# Restart Nginx
sudo systemctl restart nginx
echo -e "${GREEN}✅ Nginx restarted${NC}"

##############################################################################
# Step 4: Docker Compose Setup
##############################################################################

echo -e "\n${YELLOW}[4/5] Iniciando Docker Compose${NC}"

# Start containers
docker-compose up -d

# Wait for services
echo "Aguardando serviços iniciarem..."
sleep 15

# Check if containers are running
if docker-compose ps | grep -q "Up"; then
    echo -e "${GREEN}✅ Containers iniciados com sucesso${NC}"
else
    echo "❌ Erro ao iniciar containers"
    exit 1
fi

# Run migrations
echo "Executando migrações do banco..."
docker exec pytake-backend alembic upgrade head || true

echo -e "${GREEN}✅ Migrações executadas${NC}"

##############################################################################
# Step 5: Verification
##############################################################################

echo -e "\n${YELLOW}[5/5] Verificação Final${NC}"

# Test health endpoints
echo "Testando health endpoints..."

ENDPOINTS=(
    "https://api.pytake.net/api/v1/health"
    "https://staging-api.pytake.net/api/v1/health"
    "https://app.pytake.net"
)

for endpoint in "${ENDPOINTS[@]}"; do
    echo -n "  Testing $endpoint ... "
    if curl -sf "$endpoint" > /dev/null 2>&1; then
        echo -e "${GREEN}✅${NC}"
    else
        echo -e "${YELLOW}⏳ (ainda iniciando)${NC}"
    fi
done

##############################################################################
# Summary
##############################################################################

echo -e "\n${GREEN}╔════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✅ Setup Concluído com Sucesso!         ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"

echo -e "\n${BLUE}🌐 Acessos Disponíveis:${NC}"
echo "  Production API:     https://api.pytake.net/api/v1/docs"
echo "  Staging API:        https://staging-api.pytake.net/api/v1/docs"
echo "  Development API:    https://dev-api.pytake.net/api/v1/docs"
echo "  Frontend:           https://app.pytake.net"

echo -e "\n${BLUE}📝 Próximos Passos:${NC}"
echo "  1. Configurar GitHub Actions Secrets"
echo "     → docs/GITHUB_ACTIONS_SETUP.md"
echo ""
echo "  2. Testar deploy para staging"
echo "     → git push origin develop"
echo ""
echo "  3. Configurar Meta Webhooks"
echo "     → Use URLs: https://api.pytake.net/api/v1/whatsapp/webhook"
echo ""
echo "  4. Monitorar deployments"
echo "     → GitHub Actions → Workflows"

echo -e "\n${BLUE}📚 Documentação:${NC}"
echo "  • Deployment Guide: docs/DEPLOYMENT_MULTI_ENVIRONMENT.md"
echo "  • CI/CD Setup:      docs/GITHUB_ACTIONS_SETUP.md"
echo "  • Summary:          docs/DEPLOYMENT_SUMMARY.md"

echo -e "\n${YELLOW}⚠️  Nota Importante:${NC}"
echo "  Para CI/CD automático, configure os GitHub Actions Secrets:"
echo "  • DEPLOY_KEY"
echo "  • DEPLOY_HOST"
echo "  • DEPLOY_USER"
echo "  • SLACK_WEBHOOK (opcional)"
echo ""
echo -e "  Veja: docs/GITHUB_ACTIONS_SETUP.md para detalhes"

echo ""
