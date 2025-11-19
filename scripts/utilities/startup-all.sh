#!/bin/bash

# ========================================
# Startup All Environments Script
# ========================================
# Sobe prod, staging e dev simultaneamente
# Uso: ./startup-all.sh
# ========================================

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
cat << 'EOF'
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║                     🚀 STARTUP - TODOS OS AMBIENTES 🚀                      ║
║                                                                              ║
║                     Subindo: PRODUÇÃO + STAGING + DEV                       ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

# Verificar se os arquivos existem
echo -e "${YELLOW}📋 Verificando arquivos...${NC}"
for file in docker-compose.prod.yml docker-compose.staging.yml docker-compose.dev.yml; do
    if [[ ! -f "$file" ]]; then
        echo -e "${RED}❌ Arquivo não encontrado: $file${NC}"
        exit 1
    fi
done
echo -e "${GREEN}✅ Todos os arquivos encontrados${NC}"
echo ""

# Iniciar PRODUÇÃO
echo -e "${CYAN}═══════════════════════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}🔴 PRODUÇÃO${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}📦 Iniciando containers de produção...${NC}"
podman-compose -f docker-compose.prod.yml up -d
echo -e "${GREEN}✅ Produção iniciada${NC}"
echo ""

# Iniciar STAGING
echo -e "${CYAN}═══════════════════════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}🟠 STAGING${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}📦 Iniciando containers de staging...${NC}"
podman-compose -f docker-compose.staging.yml up -d
echo -e "${GREEN}✅ Staging iniciado${NC}"
echo ""

# Iniciar DESENVOLVIMENTO
echo -e "${CYAN}═══════════════════════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}🟢 DESENVOLVIMENTO${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}📦 Iniciando containers de desenvolvimento...${NC}"
podman-compose -f docker-compose.dev.yml up -d
echo -e "${GREEN}✅ Desenvolvimento iniciado${NC}"
echo ""

# Aguardar um pouco para os containers iniciarem
echo -e "${YELLOW}⏳ Aguardando inicialização dos containers (30 segundos)...${NC}"
sleep 30

# Mostrar status
echo -e "${CYAN}═══════════════════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}📊 STATUS DOS CONTAINERS${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════════════════════${NC}"
podman ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""

# Verificar health checks
echo -e "${CYAN}═══════════════════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}🏥 HEALTH CHECKS${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════════════════════${NC}"

# Produção
echo -e "${YELLOW}Produção:${NC}"
echo -n "  API: "
curl -s -k https://api.pytake.net/api/v1/health > /dev/null 2>&1 && echo -e "${GREEN}✅ OK${NC}" || echo -e "${RED}❌ ERRO${NC}"
echo -n "  Frontend: "
curl -s -k https://app.pytake.net/ > /dev/null 2>&1 && echo -e "${GREEN}✅ OK${NC}" || echo -e "${RED}❌ ERRO${NC}"

# Staging
echo -e "${YELLOW}Staging:${NC}"
echo -n "  API: "
curl -s -k https://api-staging.pytake.net/api/v1/health > /dev/null 2>&1 && echo -e "${GREEN}✅ OK${NC}" || echo -e "${RED}❌ ERRO${NC}"
echo -n "  Frontend: "
curl -s -k https://app-staging.pytake.net/ > /dev/null 2>&1 && echo -e "${GREEN}✅ OK${NC}" || echo -e "${RED}❌ ERRO${NC}"

# Desenvolvimento
echo -e "${YELLOW}Desenvolvimento:${NC}"
echo -n "  API: "
curl -s -k https://api-dev.pytake.net/api/v1/health > /dev/null 2>&1 && echo -e "${GREEN}✅ OK${NC}" || echo -e "${RED}❌ ERRO${NC}"
echo -n "  Frontend: "
curl -s -k https://app-dev.pytake.net/ > /dev/null 2>&1 && echo -e "${GREEN}✅ OK${NC}" || echo -e "${RED}❌ ERRO${NC}"
echo ""

# Informações úteis
echo -e "${CYAN}═══════════════════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}📝 INFORMAÇÕES ÚTEIS${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}PRODUÇÃO:${NC}"
echo "  Frontend:  ${CYAN}https://app.pytake.net${NC}"
echo "  Backend:   ${CYAN}https://api.pytake.net/api/v1/docs${NC}"
echo "  Local:     ${CYAN}localhost:3000${NC}"
echo ""
echo -e "${YELLOW}STAGING:${NC}"
echo "  Frontend:  ${CYAN}https://app-staging.pytake.net${NC}"
echo "  Backend:   ${CYAN}https://api-staging.pytake.net/api/v1/docs${NC}"
echo "  Local:     ${CYAN}localhost:3001${NC}"
echo ""
echo -e "${YELLOW}DESENVOLVIMENTO:${NC}"
echo "  Frontend:  ${CYAN}https://app-dev.pytake.net${NC}"
echo "  Backend:   ${CYAN}https://api-dev.pytake.net/api/v1/docs${NC}"
echo "  Local:     ${CYAN}localhost:3002${NC}"
echo ""

# Comandos úteis
echo -e "${CYAN}═══════════════════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}💡 COMANDOS ÚTEIS${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════════════════════${NC}"
echo ""
echo "Ver logs:"
echo "  ${CYAN}./docker-compose-env.sh logs prod${NC}"
echo "  ${CYAN}./docker-compose-env.sh logs staging${NC}"
echo "  ${CYAN}./docker-compose-env.sh logs dev${NC}"
echo ""
echo "Parar um ambiente:"
echo "  ${CYAN}./docker-compose-env.sh stop prod${NC}"
echo "  ${CYAN}./docker-compose-env.sh stop staging${NC}"
echo "  ${CYAN}./docker-compose-env.sh stop dev${NC}"
echo ""
echo "Ver status:"
echo "  ${CYAN}./docker-compose-env.sh status prod${NC}"
echo ""
echo "Testar rotas:"
echo "  ${CYAN}bash scripts/test-domains-routing.sh${NC}"
echo ""

echo -e "${GREEN}"
cat << 'EOF'
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║                    ✅ TODOS OS AMBIENTES INICIADOS! ✅                      ║
║                                                                              ║
║                  PRODUÇÃO + STAGING + DESENVOLVIMENTO                        ║
║                                                                              ║
║                  Acesse os serviços nas URLs acima.                          ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"
