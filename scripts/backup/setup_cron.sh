#!/bin/bash

################################################################################
# PyTake Automatic Backup Scheduler
# Configura backups automáticos usando cron
#
# Uso:
#   ./setup_cron.sh              # Configurar backups diários às 2:00 AM
#   ./setup_cron.sh --hourly     # Backups a cada hora
#   ./setup_cron.sh --disable    # Desabilitar backups automáticos
#
# Backups antigos (>7 dias) são removidos automaticamente
################################################################################

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)/backups"
CRON_JOB_ID="PYTAKE_AUTO_BACKUP"
CRON_LOG="${BACKUP_DIR}/cron.log"
FREQUENCY="${1:-daily}"

echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  ⏰ PyTake Automatic Backup Setup${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo ""

# Criar diretório de logs se não existir
mkdir -p "$BACKUP_DIR"

# Definir schedule baseado na frequência
case "$FREQUENCY" in
  --hourly|hourly)
    CRON_SCHEDULE="0 * * * *"
    DESC="a cada hora"
    ;;
  --daily|daily|"")
    CRON_SCHEDULE="0 2 * * *"
    DESC="diariamente às 2:00 AM"
    ;;
  --weekly|weekly)
    CRON_SCHEDULE="0 2 * * 0"
    DESC="semanalmente (domingo às 2:00 AM)"
    ;;
  --disable)
    # Remover job do cron
    echo -e "${YELLOW}▶ Desabilitando backups automáticos...${NC}"
    (crontab -l 2>/dev/null | grep -v "$CRON_JOB_ID" || true) | crontab - 2>/dev/null || true
    echo -e "${GREEN}✅ Backups automáticos desabilitados${NC}"
    exit 0
    ;;
  *)
    echo -e "${RED}❌ Frequência desconhecida: $FREQUENCY${NC}"
    echo ""
    echo "Opções disponíveis:"
    echo "  --hourly  : Backups a cada hora"
    echo "  --daily   : Backups diários (padrão, 2:00 AM)"
    echo "  --weekly  : Backups semanais (domingo, 2:00 AM)"
    echo "  --disable : Desabilitar backups automáticos"
    exit 1
    ;;
esac

# Criar script wrapper que roda o backup com limpeza
WRAPPER_SCRIPT="${BACKUP_DIR}/run_backup.sh"
cat > "$WRAPPER_SCRIPT" << 'WRAPPER_EOF'
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
WRAPPER_EOF

chmod +x "$WRAPPER_SCRIPT"

echo -e "${YELLOW}▶ Configurando backup automático ${DESC}...${NC}"
echo ""
echo -e "${YELLOW}📝 Detalhes:${NC}"
echo "  • Schedule: $CRON_SCHEDULE"
echo "  • Frequência: $DESC"
echo "  • Script: $WRAPPER_SCRIPT"
echo "  • Log: $CRON_LOG"
echo "  • Retenção: 7 dias"
echo ""

# Verificar se crontab está disponível
if ! command -v crontab &> /dev/null; then
  echo -e "${RED}❌ crontab não está instalado neste sistema${NC}"
  echo ""
  echo "Você pode fazer backups manuais usando:"
  echo "  bash $SCRIPT_DIR/backup.sh"
  exit 1
fi

# Remover job anterior se existir
(crontab -l 2>/dev/null | grep -v "$CRON_JOB_ID" || true) | crontab - 2>/dev/null || true

# Adicionar novo job
(crontab -l 2>/dev/null || true; echo "# $CRON_JOB_ID"; echo "$CRON_SCHEDULE cd $BACKUP_DIR && bash run_backup.sh") | crontab - 2>/dev/null

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Cron job configurado com sucesso${NC}"
  echo ""
  echo -e "${YELLOW}🔍 Verificar cron jobs:${NC}"
  echo "  crontab -l | grep PYTAKE"
  echo ""
  echo -e "${YELLOW}📊 Ver logs:${NC}"
  echo "  tail -f $CRON_LOG"
  echo ""
else
  echo -e "${RED}❌ Falha ao configurar cron job${NC}"
  exit 1
fi
