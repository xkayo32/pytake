#!/bin/bash
# 🚀 PyTake Development Setup - Multi-repo Helper
# Este script facilita o setup local após migração para multi-repositório

set -e

WORKSPACE_DIR="${WORKSPACE_DIR:-$HOME/pytake-workspace}"
BACKEND_REPO="https://github.com/xkayo32/pytake-backend.git"
FRONTEND_REPO="https://github.com/xkayo32/pytake-frontend.git"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 PyTake Multi-repo Setup${NC}"
echo ""

# Verificar dependências
check_dependencies() {
    echo -e "${YELLOW}Verificando dependências...${NC}"
    
    local missing_deps=()
    
    command -v git >/dev/null 2>&1 || missing_deps+=("git")
    command -v docker >/dev/null 2>&1 || missing_deps+=("docker")
    command -v docker-compose >/dev/null 2>&1 || command -v docker compose >/dev/null 2>&1 || missing_deps+=("docker-compose")
    command -v node >/dev/null 2>&1 || missing_deps+=("node")
    command -v python3 >/dev/null 2>&1 || missing_deps+=("python3")
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        echo -e "${RED}❌ Dependências faltando: ${missing_deps[*]}${NC}"
        echo ""
        echo "Instale as dependências necessárias:"
        echo "  - Git: https://git-scm.com/"
        echo "  - Docker: https://docs.docker.com/get-docker/"
        echo "  - Node.js: https://nodejs.org/"
        echo "  - Python 3.11+: https://www.python.org/"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Todas as dependências instaladas${NC}"
    echo ""
}

# Criar workspace
create_workspace() {
    echo -e "${YELLOW}Criando workspace em: $WORKSPACE_DIR${NC}"
    
    if [ -d "$WORKSPACE_DIR" ]; then
        echo -e "${YELLOW}⚠️  Workspace já existe. Deseja sobrescrever? (y/N)${NC}"
        read -r response
        if [[ ! "$response" =~ ^[Yy]$ ]]; then
            echo "Abortado."
            exit 0
        fi
        rm -rf "$WORKSPACE_DIR"
    fi
    
    mkdir -p "$WORKSPACE_DIR"
    cd "$WORKSPACE_DIR"
    echo -e "${GREEN}✅ Workspace criado${NC}"
    echo ""
}

# Clonar repositórios
clone_repos() {
    echo -e "${YELLOW}Clonando repositórios...${NC}"
    
    echo "📦 Clonando backend..."
    git clone "$BACKEND_REPO" backend || {
        echo -e "${RED}❌ Falha ao clonar backend${NC}"
        exit 1
    }
    
    echo "📦 Clonando frontend..."
    git clone "$FRONTEND_REPO" frontend || {
        echo -e "${RED}❌ Falha ao clonar frontend${NC}"
        exit 1
    }
    
    echo -e "${GREEN}✅ Repositórios clonados${NC}"
    echo ""
}

# Setup backend
setup_backend() {
    echo -e "${YELLOW}Configurando backend...${NC}"
    
    cd "$WORKSPACE_DIR/backend"
    
    # Copiar .env
    if [ ! -f .env ]; then
        if [ -f .env.example ]; then
            cp .env.example .env
            echo "✅ Arquivo .env criado (edite conforme necessário)"
        else
            echo -e "${YELLOW}⚠️  .env.example não encontrado${NC}"
        fi
    fi
    
    # Criar venv
    if [ ! -d venv ]; then
        echo "🐍 Criando virtualenv..."
        python3 -m venv venv
    fi
    
    # Instalar dependências
    echo "📦 Instalando dependências..."
    source venv/bin/activate
    pip install -r requirements.txt 2>/dev/null || echo "⚠️  Falha ao instalar algumas dependências"
    deactivate
    
    echo -e "${GREEN}✅ Backend configurado${NC}"
    echo ""
}

# Setup frontend
setup_frontend() {
    echo -e "${YELLOW}Configurando frontend...${NC}"
    
    cd "$WORKSPACE_DIR/frontend"
    
    # Copiar .env
    if [ ! -f .env.local ]; then
        if [ -f .env.example ]; then
            cp .env.example .env.local
            echo "✅ Arquivo .env.local criado"
        else
            echo -e "${YELLOW}⚠️  .env.example não encontrado${NC}"
        fi
    fi
    
    # Instalar dependências
    echo "📦 Instalando dependências do Node.js..."
    npm install || {
        echo -e "${RED}❌ Falha ao instalar dependências do frontend${NC}"
        exit 1
    }
    
    echo -e "${GREEN}✅ Frontend configurado${NC}"
    echo ""
}

# Criar docker-compose orquestrado
create_docker_compose() {
    echo -e "${YELLOW}Criando docker-compose orquestrado...${NC}"
    
    cd "$WORKSPACE_DIR"
    
    cat > docker-compose.dev.yml <<'EOF'
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: pytake-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-pytake_user}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-pytake_password}
      POSTGRES_DB: ${POSTGRES_DB:-pytake}
    ports:
      - "5433:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - pytake-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-pytake_user}"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: pytake-redis
    restart: unless-stopped
    ports:
      - "6380:6379"
    volumes:
      - redis_data:/data
    networks:
      - pytake-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: pytake-backend
    restart: unless-stopped
    ports:
      - "8000:8000"
    volumes:
      - ./backend:/app
      - /app/venv
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER:-pytake_user}:${POSTGRES_PASSWORD:-pytake_password}@postgres:5432/${POSTGRES_DB:-pytake}
      REDIS_URL: redis://redis:6379
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - pytake-network
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    container_name: pytake-frontend
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - ./frontend:/app
      - /app/node_modules
      - /app/.next
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:8000
    depends_on:
      - backend
    networks:
      - pytake-network
    command: npm run dev

volumes:
  postgres_data:
  redis_data:

networks:
  pytake-network:
    driver: bridge
EOF

    echo -e "${GREEN}✅ docker-compose.dev.yml criado${NC}"
    echo ""
}

# Mostrar próximos passos
show_next_steps() {
    echo ""
    echo -e "${GREEN}🎉 Setup concluído com sucesso!${NC}"
    echo ""
    echo -e "${YELLOW}📋 Próximos passos:${NC}"
    echo ""
    echo "1️⃣  Editar variáveis de ambiente:"
    echo "   cd $WORKSPACE_DIR/backend && nano .env"
    echo "   cd $WORKSPACE_DIR/frontend && nano .env.local"
    echo ""
    echo "2️⃣  Iniciar serviços com Docker:"
    echo "   cd $WORKSPACE_DIR"
    echo "   docker-compose -f docker-compose.dev.yml up -d"
    echo ""
    echo "3️⃣  Aplicar migrations (backend):"
    echo "   docker exec pytake-backend alembic upgrade head"
    echo ""
    echo "4️⃣  Acessar aplicação:"
    echo "   - Frontend: http://localhost:3000"
    echo "   - Backend API: http://localhost:8000"
    echo "   - API Docs: http://localhost:8000/api/v1/docs"
    echo ""
    echo "5️⃣  Ver logs:"
    echo "   docker-compose -f docker-compose.dev.yml logs -f backend frontend"
    echo ""
    echo -e "${GREEN}Happy coding! 🚀${NC}"
}

# Executar setup
main() {
    check_dependencies
    create_workspace
    clone_repos
    setup_backend
    setup_frontend
    create_docker_compose
    show_next_steps
}

# Executar se script for chamado diretamente
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
