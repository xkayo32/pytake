#!/bin/bash

################################################################################
# PyTake Database Backup Script
# Faz backup completo do PostgreSQL e salva em arquivo compactado
# 
# Uso:
#   ./backup.sh                          # Backup normal
#   ./backup.sh --keep-local             # Mantém cópia local descompactada
#   ./backup.sh --with-mongo             # Inclui MongoDB também
#
# Backups são salvos em: /home/administrator/pytake/backups/
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
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="pytake_db_${TIMESTAMP}"
POSTGRES_CONTAINER="pytake-postgres-dev"
POSTGRES_DB="${POSTGRES_DB:-pytake}"
POSTGRES_USER="${POSTGRES_USER:-pytake_user}"
MONGODB_CONTAINER="pytake-mongodb-dev"
MONGODB_DB="${MONGODB_DB:-pytake_logs}"
KEEP_LOCAL=false
WITH_MONGO=false

# Parse argumentos
while [[ $# -gt 0 ]]; do
  case $1 in
    --keep-local) KEEP_LOCAL=true; shift ;;
    --with-mongo) WITH_MONGO=true; shift ;;
    *) echo "Argumento desconhecido: $1"; exit 1 ;;
  esac
done

echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  🔄 PyTake Database Backup${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo ""

# Criar diretório de trabalho temporário
WORK_DIR=$(mktemp -d)
trap "rm -rf $WORK_DIR" EXIT

echo -e "${YELLOW}📁 Diretório de trabalho:${NC} $WORK_DIR"
echo -e "${YELLOW}💾 Diretório de backup:${NC} $BACKUP_DIR"
echo -e "${YELLOW}⏰ Timestamp:${NC} $TIMESTAMP"
echo ""

# ============================================================================
# POSTGRESQL BACKUP
# ============================================================================

echo -e "${BLUE}▶ Iniciando backup PostgreSQL...${NC}"

if ! docker ps | grep -q "$POSTGRES_CONTAINER"; then
  echo -e "${RED}❌ Container PostgreSQL não está rodando!${NC}"
  exit 1
fi

# Executar pg_dump
if docker exec "$POSTGRES_CONTAINER" pg_dump \
  -U "$POSTGRES_USER" \
  -d "$POSTGRES_DB" \
  --format=custom \
  --verbose \
  > "$WORK_DIR/pytake_db.dump"; then
  
  DUMP_SIZE=$(du -h "$WORK_DIR/pytake_db.dump" | cut -f1)
  echo -e "${GREEN}✅ PostgreSQL backup realizado${NC} (${DUMP_SIZE})"
else
  echo -e "${RED}❌ Falha ao fazer backup PostgreSQL!${NC}"
  exit 1
fi

# ============================================================================
# MONGODB BACKUP (opcional)
# ============================================================================

if [ "$WITH_MONGO" = true ]; then
  echo ""
  echo -e "${BLUE}▶ Iniciando backup MongoDB...${NC}"
  
  if ! docker ps | grep -q "$MONGODB_CONTAINER"; then
    echo -e "${RED}❌ Container MongoDB não está rodando!${NC}"
    exit 1
  fi
  
  if docker exec "$MONGODB_CONTAINER" mongodump \
    --authenticationDatabase admin \
    --out=/tmp/mongodump; then
    
    docker cp "$MONGODB_CONTAINER":/tmp/mongodump "$WORK_DIR/mongodb"
    docker exec "$MONGODB_CONTAINER" rm -rf /tmp/mongodump
    
    echo -e "${GREEN}✅ MongoDB backup realizado${NC}"
  else
    echo -e "${RED}❌ Falha ao fazer backup MongoDB!${NC}"
    exit 1
  fi
fi

# ============================================================================
# COMPACTAR BACKUP
# ============================================================================

echo ""
echo -e "${BLUE}▶ Compactando backup...${NC}"

cd "$WORK_DIR"
if tar -czf "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" \
  --transform 's,^,pytake_backup/,' \
  *; then
  
  ARCHIVE_SIZE=$(du -h "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" | cut -f1)
  echo -e "${GREEN}✅ Backup compactado${NC} (${ARCHIVE_SIZE})"
else
  echo -e "${RED}❌ Falha ao compactar backup!${NC}"
  exit 1
fi

# ============================================================================
# COPIAR BACKUP LOCAL (opcional)
# ============================================================================

if [ "$KEEP_LOCAL" = true ]; then
  echo ""
  echo -e "${BLUE}▶ Mantendo cópia local descompactada...${NC}"
  
  LOCAL_BACKUP_DIR="${BACKUP_DIR}/${BACKUP_NAME}"
  mkdir -p "$LOCAL_BACKUP_DIR"
  cp -r "$WORK_DIR"/* "$LOCAL_BACKUP_DIR/"
  
  echo -e "${GREEN}✅ Cópia local salva em${NC} $LOCAL_BACKUP_DIR"
fi

# ============================================================================
# LIMPEZA E RESUMO
# ============================================================================

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ BACKUP CONCLUÍDO COM SUCESSO${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}📊 Resumo:${NC}"
echo "  • Nome do arquivo: ${BACKUP_NAME}.tar.gz"
echo "  • Tamanho compactado: ${ARCHIVE_SIZE}"
echo "  • Localização: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
echo ""
echo -e "${YELLOW}💾 Para restaurar este backup, use:${NC}"
echo "  ./restore.sh ${BACKUP_NAME}.tar.gz"
echo ""
echo -e "${YELLOW}📝 Listar todos os backups:${NC}"
echo "  ls -lh ${BACKUP_DIR}/*.tar.gz"
echo ""
