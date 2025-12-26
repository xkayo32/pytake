#!/bin/bash

################################################################################
# PyTake Database Restore Script
# Restaura backup PostgreSQL completo
# 
# Uso:
#   ./restore.sh pytake_db_20251226_120000.tar.gz
#   ./restore.sh /path/to/pytake_db_20251226_120000.tar.gz
#   ./restore.sh pytake_db_20251226_120000.tar.gz --with-mongo  # Restaura MongoDB também
#
# ⚠️  CUIDADO: Isso sobrescreve o banco de dados atual!
################################################################################

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configurações
BACKUP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)/backups"
POSTGRES_CONTAINER="pytake-postgres-dev"
POSTGRES_DB="${POSTGRES_DB:-pytake}"
POSTGRES_USER="${POSTGRES_USER:-pytake_user}"
MONGODB_CONTAINER="pytake-mongodb-dev"
MONGODB_DB="${MONGODB_DB:-pytake_logs}"
WITH_MONGO=false

# Validar argumentos
if [ $# -lt 1 ]; then
  echo -e "${RED}❌ Erro: Nenhum arquivo de backup especificado!${NC}"
  echo ""
  echo "Uso: $0 <backup_file> [--with-mongo]"
  echo ""
  echo "Exemplos:"
  echo "  $0 pytake_db_20251226_120000.tar.gz"
  echo "  $0 /path/to/pytake_db_20251226_120000.tar.gz"
  echo ""
  echo "Backups disponíveis:"
  ls -1 "${BACKUP_DIR}"/*.tar.gz 2>/dev/null || echo "  (nenhum backup encontrado)"
  exit 1
fi

BACKUP_FILE="$1"
shift

# Parse argumentos adicionais
while [[ $# -gt 0 ]]; do
  case $1 in
    --with-mongo) WITH_MONGO=true; shift ;;
    *) echo "Argumento desconhecido: $1"; exit 1 ;;
  esac
done

# Normalizar caminho do backup
if [[ ! "$BACKUP_FILE" = /* ]]; then
  BACKUP_FILE="${BACKUP_DIR}/${BACKUP_FILE}"
fi

# Validar arquivo de backup
if [ ! -f "$BACKUP_FILE" ]; then
  echo -e "${RED}❌ Arquivo de backup não encontrado: $BACKUP_FILE${NC}"
  exit 1
fi

BACKUP_NAME=$(basename "$BACKUP_FILE" .tar.gz)
ARCHIVE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)

echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  ⚙️  PyTake Database Restore${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}📂 Backup: ${NC}$BACKUP_NAME"
echo -e "${YELLOW}📊 Tamanho: ${NC}$ARCHIVE_SIZE"
echo -e "${YELLOW}🔗 Caminho: ${NC}$BACKUP_FILE"
echo ""
echo -e "${RED}⚠️  AVISO: Esta operação vai SOBRESCREVER o banco de dados atual!${NC}"
echo -e "${RED}    Todos os dados não salvos serão PERDIDOS!${NC}"
echo ""
read -p "Tem certeza que deseja continuar? (s/N): " -r CONFIRM
echo ""

if [[ ! "$CONFIRM" =~ ^[Ss]$ ]]; then
  echo -e "${YELLOW}❌ Restauração cancelada pelo usuário${NC}"
  exit 0
fi

# Criar diretório temporário
WORK_DIR=$(mktemp -d)
trap "rm -rf $WORK_DIR" EXIT

echo -e "${BLUE}▶ Extraindo backup...${NC}"

if tar -xzf "$BACKUP_FILE" -C "$WORK_DIR"; then
  echo -e "${GREEN}✅ Backup extraído${NC}"
else
  echo -e "${RED}❌ Falha ao extrair backup!${NC}"
  exit 1
fi

# ============================================================================
# POSTGRESQL RESTORE
# ============================================================================

echo ""
echo -e "${BLUE}▶ Iniciando restauração PostgreSQL...${NC}"

if ! docker ps | grep -q "$POSTGRES_CONTAINER"; then
  echo -e "${RED}❌ Container PostgreSQL não está rodando!${NC}"
  exit 1
fi

# Verificar e fazer backup do banco atual (safety)
echo -e "${YELLOW}  💾 Fazendo backup de segurança do banco atual...${NC}"
docker exec "$POSTGRES_CONTAINER" pg_dump \
  -U "$POSTGRES_USER" \
  -d "$POSTGRES_DB" \
  --format=custom \
  > "$WORK_DIR/backup_anterior_$(date +%s).dump" 2>/dev/null || true

# Desconectar todas as conexões
echo -e "${YELLOW}  🔌 Desconectando usuários do banco...${NC}"
docker exec "$POSTGRES_CONTAINER" psql \
  -U "$POSTGRES_USER" \
  -d postgres \
  -c "SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = '$POSTGRES_DB' AND pid <> pg_backend_pid();" \
  2>/dev/null || true

# Dropar banco antigo
echo -e "${YELLOW}  🗑️  Removendo banco de dados antigo...${NC}"
docker exec "$POSTGRES_CONTAINER" psql \
  -U "$POSTGRES_USER" \
  -d postgres \
  -c "DROP DATABASE IF EXISTS \"$POSTGRES_DB\";" \
  2>/dev/null || true

# Criar banco novo
echo -e "${YELLOW}  📦 Criando banco de dados novo...${NC}"
docker exec "$POSTGRES_CONTAINER" psql \
  -U "$POSTGRES_USER" \
  -d postgres \
  -c "CREATE DATABASE \"$POSTGRES_DB\";" \
  2>/dev/null || true

# Restaurar do backup
echo -e "${YELLOW}  ⏳ Restaurando dados (pode levar alguns minutos)...${NC}"
if docker exec -i "$POSTGRES_CONTAINER" pg_restore \
  -U "$POSTGRES_USER" \
  -d "$POSTGRES_DB" \
  --verbose \
  < "$WORK_DIR/pytake_backup/pytake_db.dump"; then
  
  echo -e "${GREEN}✅ PostgreSQL restaurado com sucesso${NC}"
else
  echo -e "${RED}❌ Falha ao restaurar PostgreSQL!${NC}"
  exit 1
fi

# ============================================================================
# MONGODB RESTORE (opcional)
# ============================================================================

if [ "$WITH_MONGO" = true ] && [ -d "$WORK_DIR/pytake_backup/mongodb" ]; then
  echo ""
  echo -e "${BLUE}▶ Iniciando restauração MongoDB...${NC}"
  
  if ! docker ps | grep -q "$MONGODB_CONTAINER"; then
    echo -e "${RED}❌ Container MongoDB não está rodando!${NC}"
    exit 1
  fi
  
  docker cp "$WORK_DIR/pytake_backup/mongodb" "$MONGODB_CONTAINER":/tmp/mongorestore
  
  if docker exec "$MONGODB_CONTAINER" mongorestore \
    --authenticationDatabase admin \
    --drop \
    /tmp/mongorestore; then
    
    docker exec "$MONGODB_CONTAINER" rm -rf /tmp/mongorestore
    echo -e "${GREEN}✅ MongoDB restaurado com sucesso${NC}"
  else
    echo -e "${RED}❌ Falha ao restaurar MongoDB!${NC}"
    exit 1
  fi
fi

# ============================================================================
# FINALIZAÇÃO
# ============================================================================

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ RESTAURAÇÃO CONCLUÍDA COM SUCESSO${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}📝 Próximos passos:${NC}"
echo "  1. Reiniciar o backend para aplicar as migrações:"
echo "     docker compose restart backend"
echo ""
echo "  2. Verificar saúde da aplicação:"
echo "     curl http://localhost:8002/api/v1/health"
echo ""
echo -e "${YELLOW}📚 Para listar todos os backups:${NC}"
echo "  ls -lh ${BACKUP_DIR}/*.tar.gz"
echo ""
