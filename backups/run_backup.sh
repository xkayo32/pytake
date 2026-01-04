#!/bin/bash
set -e

BACKUP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPT_DIR="$(cd "$BACKUP_DIR/scripts/backup" && pwd)"
CRON_LOG="${BACKUP_DIR}/cron.log"

{
  echo ""
  echo "========== Backup iniciado em $(date) =========="
  
  # Executar backup
  cd "$SCRIPT_DIR"
  bash backup.sh 2>&1
  
  # Limpeza de backups antigos (>7 dias)
  echo "🧹 Removendo backups com mais de 7 dias..."
  find "$BACKUP_DIR" -name "pytake_db_*.tar.gz" -type f -mtime +7 -delete
  
  echo "========== Backup finalizado em $(date) =========="
  echo ""
} >> "$CRON_LOG" 2>&1
