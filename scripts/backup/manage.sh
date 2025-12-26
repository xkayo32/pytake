#!/bin/bash

################################################################################
# PyTake Backup Management
# Listar, limpar e gerenciar backups
#
# Uso:
#   ./manage.sh status          # Ver status dos backups
#   ./manage.sh list            # Listar todos os backups
#   ./manage.sh cleanup         # Remover backups com >30 dias
#   ./manage.sh cleanup --force # Remover all but last 3 backups
#   ./manage.sh restore <nome>  # Restaurar um backup específico
################################################################################

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

BACKUP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)/backups"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CRON_LOG="${BACKUP_DIR}/cron.log"

# Funções
show_status() {
  echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
  echo -e "${BLUE}  📊 PyTake Backup Status${NC}"
  echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
  echo ""
  
  if [ ! -d "$BACKUP_DIR" ]; then
    echo -e "${YELLOW}⚠️  Diretório de backups não existe: $BACKUP_DIR${NC}"
    return
  fi
  
  # Contar backups
  BACKUP_COUNT=$(find "$BACKUP_DIR" -maxdepth 1 -name "pytake_db_*.tar.gz" -type f 2>/dev/null | wc -l)
  TOTAL_SIZE=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)
  
  echo -e "${YELLOW}📁 Localização:${NC} $BACKUP_DIR"
  echo -e "${YELLOW}📊 Total de backups:${NC} $BACKUP_COUNT"
  echo -e "${YELLOW}💾 Espaço usado:${NC} $TOTAL_SIZE"
  echo ""
  
  # Verificar cron job
  if crontab -l 2>/dev/null | grep -q "PYTAKE_AUTO_BACKUP"; then
    echo -e "${GREEN}✅ Backups automáticos:${NC} ATIVADOS"
    echo -e "${YELLOW}⏰ Schedule:${NC}"
    crontab -l 2>/dev/null | grep "PYTAKE_AUTO_BACKUP" -A1 | tail -1
    echo ""
  else
    echo -e "${YELLOW}⚠️  Backups automáticos:${NC} DESATIVADOS"
    echo "   Use './setup_cron.sh' para ativar"
    echo ""
  fi
  
  # Último backup
  if [ -f "$CRON_LOG" ]; then
    echo -e "${YELLOW}📅 Último backup:${NC}"
    tail -1 "$CRON_LOG" | grep -o "Backup iniciado em.*" || echo "   (nenhum registro)"
    echo ""
  fi
}

list_backups() {
  echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
  echo -e "${BLUE}  📋 PyTake Backups${NC}"
  echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
  echo ""
  
  if [ ! -d "$BACKUP_DIR" ] || [ -z "$(find "$BACKUP_DIR" -maxdepth 1 -name "pytake_db_*.tar.gz" -type f 2>/dev/null)" ]; then
    echo -e "${YELLOW}⚠️  Nenhum backup encontrado${NC}"
    return
  fi
  
  echo -e "${YELLOW}Backups disponíveis:${NC}"
  echo ""
  
  ls -1 "$BACKUP_DIR"/pytake_db_*.tar.gz 2>/dev/null | while read backup; do
    FILENAME=$(basename "$backup")
    FILESIZE=$(du -h "$backup" | cut -f1)
    FILEDATE=$(stat -c %y "$backup" 2>/dev/null | cut -d' ' -f1-2 || stat -f "%Sm" "$backup" 2>/dev/null)
    
    echo "  📦 $FILENAME"
    echo "     Tamanho: $FILESIZE"
    echo "     Data: $FILEDATE"
    echo ""
  done
  
  echo -e "${YELLOW}Para restaurar:${NC}"
  echo "  $SCRIPT_DIR/restore.sh <nome_do_backup>.tar.gz"
  echo ""
}

cleanup_backups() {
  local FORCE="${1:-}"
  
  echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
  echo -e "${BLUE}  🧹 Limpeza de Backups${NC}"
  echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
  echo ""
  
  if [ ! -d "$BACKUP_DIR" ]; then
    echo -e "${YELLOW}⚠️  Diretório de backups não existe${NC}"
    return
  fi
  
  if [ "$FORCE" = "--force" ]; then
    echo -e "${YELLOW}▶ Modo FORCE: Mantendo apenas os 3 backups mais recentes...${NC}"
    echo ""
    
    # Listar e ordenar backups por data
    BACKUPS_TO_DELETE=$(ls -1t "$BACKUP_DIR"/pytake_db_*.tar.gz 2>/dev/null | tail -n +4)
    
    if [ -z "$BACKUPS_TO_DELETE" ]; then
      echo -e "${GREEN}✅ Apenas 3 ou menos backups existem, nada a deletar${NC}"
      return
    fi
    
    echo "$BACKUPS_TO_DELETE" | while read backup; do
      SIZE=$(du -h "$backup" | cut -f1)
      echo "  🗑️  Deletando: $(basename "$backup") ($SIZE)"
      rm -f "$backup"
    done
  else
    echo -e "${YELLOW}▶ Removendo backups com mais de 30 dias...${NC}"
    echo ""
    
    DELETED_COUNT=0
    find "$BACKUP_DIR" -maxdepth 1 -name "pytake_db_*.tar.gz" -type f -mtime +30 | while read backup; do
      SIZE=$(du -h "$backup" | cut -f1)
      echo "  🗑️  Deletando: $(basename "$backup") ($SIZE)"
      rm -f "$backup"
      ((DELETED_COUNT++))
    done
    
    if [ $DELETED_COUNT -eq 0 ]; then
      echo -e "${GREEN}✅ Nenhum backup com mais de 30 dias encontrado${NC}"
    else
      echo -e "${GREEN}✅ $DELETED_COUNT backup(s) deletado(s)${NC}"
    fi
  fi
  
  echo ""
}

restore_backup() {
  local BACKUP="$1"
  
  if [ -z "$BACKUP" ]; then
    echo -e "${RED}❌ Nome do backup não especificado${NC}"
    list_backups
    exit 1
  fi
  
  # Chamar script de restore
  bash "$SCRIPT_DIR/restore.sh" "$BACKUP"
}

# Main
case "${1:-status}" in
  status)
    show_status
    ;;
  list)
    list_backups
    ;;
  cleanup)
    cleanup_backups "$2"
    ;;
  restore)
    restore_backup "$2"
    ;;
  *)
    echo -e "${YELLOW}PyTake Backup Management${NC}"
    echo ""
    echo "Uso: $0 <comando>"
    echo ""
    echo "Comandos:"
    echo "  status              - Ver status dos backups"
    echo "  list                - Listar todos os backups"
    echo "  cleanup             - Remover backups com >30 dias"
    echo "  cleanup --force     - Manter apenas últimos 3 backups"
    echo "  restore <nome>      - Restaurar um backup específico"
    echo ""
    ;;
esac
