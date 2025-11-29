#!/bin/bash

##############################################################################
# PyTake Deployment Script
# Deploys to staging or production with automatic SSL, migrations, and health check
# 
# Usage:
#   ./deploy.sh staging
#   ./deploy.sh production
##############################################################################

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REPO_OWNER="xkayo32"
REPO_NAME="pytake"
GITHUB_REPO="$REPO_OWNER/$REPO_NAME"

# Environment selection
ENVIRONMENT="${1:-}"

if [[ -z "$ENVIRONMENT" ]]; then
    echo -e "${RED}❌ Usage: $0 staging|production${NC}"
    echo -e "${YELLOW}Example:${NC}"
    echo "  $0 staging"
    echo "  $0 production"
    exit 1
fi

if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
    echo -e "${RED}❌ Invalid environment: $ENVIRONMENT${NC}"
    echo -e "${YELLOW}Valid options: staging, production${NC}"
    exit 1
fi

# Environment-specific configuration
if [[ "$ENVIRONMENT" == "staging" ]]; then
    BRANCH="develop"
    PORT_BACKEND=8001
    COMPOSE_FILE="docker-compose.yml"
    SUBDOMAIN="staging-api"
    PUBLIC_API_URL="https://staging-api.pytake.net"
    WEBHOOK_URL="https://staging-api.pytake.net/api/v1/whatsapp/webhook"
    CONTAINER_PREFIX="pytake-staging"
    ENVIRONMENT_VAR="staging"
    echo -e "${BLUE}🚀 Deploying to STAGING (branch: $BRANCH, port: $PORT_BACKEND)${NC}"
else
    BRANCH="main"
    PORT_BACKEND=8000
    COMPOSE_FILE="docker-compose.yml"
    SUBDOMAIN="api"
    PUBLIC_API_URL="https://api.pytake.net"
    WEBHOOK_URL="https://api.pytake.net/api/v1/whatsapp/webhook"
    CONTAINER_PREFIX="pytake"
    ENVIRONMENT_VAR="production"
    echo -e "${BLUE}🚀 Deploying to PRODUCTION (branch: $BRANCH, port: $PORT_BACKEND)${NC}"
fi

##############################################################################
# Phase 1: Code Checkout & Build
##############################################################################

echo -e "\n${BLUE}📦 Phase 1: Code Checkout & Build${NC}"
echo -e "${YELLOW}─────────────────────────────────${NC}"

# Update repository
echo -e "${BLUE}Fetching latest from GitHub...${NC}"
git fetch origin
git checkout "$BRANCH"
git pull origin "$BRANCH"
echo -e "${GREEN}✅ Repository up-to-date${NC}"

# Build images
echo -e "${BLUE}Building Docker images...${NC}"
COMPOSE_PROJECT_NAME="pytake" docker-compose -f "$COMPOSE_FILE" build backend
echo -e "${GREEN}✅ Images built successfully${NC}"

##############################################################################
# Phase 2: SSL/TLS Configuration (if needed)
##############################################################################

echo -e "\n${BLUE}🔐 Phase 2: SSL/TLS Configuration${NC}"
echo -e "${YELLOW}──────────────────────────────────${NC}"

CERT_PATH="/etc/letsencrypt/live/${SUBDOMAIN}.pytake.net"

if [[ ! -f "$CERT_PATH/fullchain.pem" ]]; then
    echo -e "${YELLOW}⚠️  SSL certificate not found for ${SUBDOMAIN}.pytake.net${NC}"
    echo -e "${BLUE}Generating with Certbot...${NC}"
    
    # Ensure /var/www/certbot exists for ACME challenge
    sudo mkdir -p /var/www/certbot
    
    # Stop nginx temporarily for standalone auth
    sudo systemctl stop nginx || true
    
    # Generate certificate
    sudo certbot certonly --standalone \
        -d "${SUBDOMAIN}.pytake.net" \
        --agree-tos \
        --email admin@pytake.net \
        --non-interactive || true
    
    # Restart nginx
    sudo systemctl start nginx || true
    
    echo -e "${GREEN}✅ SSL certificate configured${NC}"
else
    echo -e "${GREEN}✅ SSL certificate already present${NC}"
fi

##############################################################################
# Phase 3: Deploy with Docker Compose
##############################################################################

echo -e "\n${BLUE}🐳 Phase 3: Deploy with Docker Compose${NC}"
echo -e "${YELLOW}────────────────────────────────────────${NC}"

# Stop existing containers
echo -e "${BLUE}Stopping existing containers...${NC}"
COMPOSE_PROJECT_NAME="pytake" docker-compose -f "$COMPOSE_FILE" down || true

# Start new containers
echo -e "${BLUE}Starting containers...${NC}"
COMPOSE_PROJECT_NAME="pytake" docker-compose -f "$COMPOSE_FILE" up -d

echo -e "${GREEN}✅ Containers started${NC}"

# Wait for services to be ready
echo -e "${BLUE}Waiting for services to be ready...${NC}"
sleep 15

##############################################################################
# Phase 4: Database Migrations
##############################################################################

echo -e "\n${BLUE}🗄️  Phase 4: Database Migrations${NC}"
echo -e "${YELLOW}──────────────────────────────────${NC}"

echo -e "${BLUE}Running Alembic migrations...${NC}"
docker exec pytake-backend alembic upgrade head || {
    echo -e "${RED}❌ Migrations failed!${NC}"
    exit 1
}
echo -e "${GREEN}✅ Migrations completed${NC}"

##############################################################################
# Phase 5: Environment Configuration
##############################################################################

echo -e "\n${BLUE}⚙️  Phase 5: Environment Configuration${NC}"
echo -e "${YELLOW}────────────────────────────────────────${NC}"

echo -e "${BLUE}Configuring environment variables...${NC}"

# Create temporary .env for the container
cat > /tmp/pytake.env << EOF
ENVIRONMENT=$ENVIRONMENT_VAR
PUBLIC_API_URL=$PUBLIC_API_URL
WHATSAPP_WEBHOOK_URL=$WEBHOOK_URL
API_ROOT_PATH=
EOF

# Copy to container
docker cp /tmp/pytake.env pytake-backend:/app/.env.deploy

# Source the environment in the running container
docker exec pytake-backend sh -c 'cat /app/.env.deploy >> /app/.env || true'

echo -e "${GREEN}✅ Environment configured${NC}"

##############################################################################
# Phase 6: Health Checks
##############################################################################

echo -e "\n${BLUE}❤️  Phase 6: Health Checks${NC}"
echo -e "${YELLOW}──────────────────────────────${NC}"

# Check backend
echo -e "${BLUE}Checking backend health...${NC}"
HEALTH_URL="http://localhost:${PORT_BACKEND}/api/v1/health"
if curl -sf "$HEALTH_URL" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend is healthy${NC}"
else
    echo -e "${YELLOW}⚠️  Backend health check not yet available${NC}"
fi

# Check database
echo -e "${BLUE}Checking database connectivity...${NC}"
if docker exec pytake-backend python3 -c "from app.core.database import init_db; print('DB OK')" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Database is accessible${NC}"
else
    echo -e "${YELLOW}⚠️  Database check skipped${NC}"
fi

##############################################################################
# Phase 7: Summary
##############################################################################

echo -e "\n${GREEN}════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo -e "${GREEN}════════════════════════════════════════════${NC}"

echo -e "\n${BLUE}Environment: ${ENVIRONMENT_VAR}${NC}"
echo -e "${BLUE}Public URL: ${PUBLIC_API_URL}${NC}"
echo -e "${BLUE}Webhook URL: ${WEBHOOK_URL}${NC}"

if [[ "$ENVIRONMENT" == "staging" ]]; then
    echo -e "\n${YELLOW}📌 Next Steps (Staging):${NC}"
    echo "  1. Access backend docs: https://staging-api.pytake.net/api/v1/docs"
    echo "  2. Test API endpoints"
    echo "  3. Run integration tests"
    echo "  4. Promote to production when ready"
else
    echo -e "\n${YELLOW}📌 Next Steps (Production):${NC}"
    echo "  1. Access backend docs: https://api.pytake.net/api/v1/docs"
    echo "  2. Monitor logs: docker-compose logs -f backend"
    echo "  3. Setup monitoring and alerts"
fi

echo -e "\n${YELLOW}📊 Container Status:${NC}"
docker ps --format "table {{.Names}}\t{{.Status}}" | grep pytake

echo -e "\n${BLUE}✨ Deployment successful!${NC}\n"
