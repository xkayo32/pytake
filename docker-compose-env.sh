#!/bin/bash

# ========================================
# Docker Compose Environment Manager
# ========================================
# Gerencia docker-compose para prod/staging/dev
# Uso: ./docker-compose-env.sh [start|stop|logs|down] [prod|staging|dev]
# ========================================

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Validar argumentos
if [[ $# -lt 2 ]]; then
    echo -e "${RED}Uso: $0 [start|stop|logs|down|status] [prod|staging|dev]${NC}"
    echo ""
    echo "Exemplos:"
    echo "  $0 start prod          # Inicia produção"
    echo "  $0 stop staging        # Para staging"
    echo "  $0 logs dev            # Ver logs de desenvolvimento"
    echo "  $0 down prod           # Derruba produção"
    echo "  $0 status dev          # Status de desenvolvimento"
    echo ""
    exit 1
fi

ACTION=$1
ENV=$2

# Validar ambiente
if [[ ! "$ENV" =~ ^(prod|staging|dev)$ ]]; then
    echo -e "${RED}❌ Ambiente inválido: $ENV${NC}"
    echo "Use: prod, staging ou dev"
    exit 1
fi

# Validar ação
if [[ ! "$ACTION" =~ ^(start|stop|logs|down|status|restart)$ ]]; then
    echo -e "${RED}❌ Ação inválida: $ACTION${NC}"
    echo "Use: start, stop, logs, down, status ou restart"
    exit 1
fi

# Definir arquivo correto
if [[ "$ENV" == "dev" ]]; then
    COMPOSE_FILE="docker-compose.yml"
else
    COMPOSE_FILE="docker-compose.${ENV}.yml"
fi

# Verificar se arquivo existe
if [[ ! -f "$COMPOSE_FILE" ]]; then
    echo -e "${RED}❌ Arquivo não encontrado: $COMPOSE_FILE${NC}"
    exit 1
fi

# Executar ação
case $ACTION in
    start)
        echo -e "${BLUE}🚀 Iniciando $ENV...${NC}"
        podman-compose -f "$COMPOSE_FILE" up -d
        sleep 2
        echo -e "${GREEN}✅ $ENV iniciado com sucesso${NC}"
        echo ""
        echo "Containers rodando:"
        podman-compose -f "$COMPOSE_FILE" ps
        ;;

    stop)
        echo -e "${YELLOW}⏸️  Parando $ENV...${NC}"
        podman-compose -f "$COMPOSE_FILE" stop
        echo -e "${GREEN}✅ $ENV parado${NC}"
        ;;

    down)
        echo -e "${RED}🛑 Derrubando $ENV...${NC}"
        podman-compose -f "$COMPOSE_FILE" down
        echo -e "${GREEN}✅ $ENV derrubado${NC}"
        ;;

    logs)
        echo -e "${BLUE}📋 Logs de $ENV:${NC}"
        podman-compose -f "$COMPOSE_FILE" logs -f --tail=50
        ;;

    status)
        echo -e "${BLUE}📊 Status de $ENV:${NC}"
        podman-compose -f "$COMPOSE_FILE" ps
        ;;

    restart)
        echo -e "${YELLOW}🔄 Reiniciando $ENV...${NC}"
        podman-compose -f "$COMPOSE_FILE" restart
        sleep 2
        echo -e "${GREEN}✅ $ENV reiniciado${NC}"
        ;;
esac
