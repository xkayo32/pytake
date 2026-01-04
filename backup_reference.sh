#!/bin/bash

################################################################################
# PyTake Quick Backup Reference
# Atalhos para operações comuns de backup
#
# Execute este arquivo para ver opções rápidas:
#   bash backup_reference.sh
################################################################################

clear

cat << 'EOF'

╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║                   🔄 PyTake Database Backup System                           ║
║                                                                              ║
║                      System de Backup Automático & Manual                    ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚀 ATALHOS RÁPIDOS

  # Ver status dos backups
  bash scripts/backup/manage.sh status

  # Listar todos os backups
  bash scripts/backup/manage.sh list

  # Fazer backup AGORA
  bash scripts/backup/backup.sh

  # Restaurar último backup
  bash scripts/backup/manage.sh restore <nome_do_arquivo>

  # Ver logs de backups automáticos
  tail -f backups/cron.log

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 OPERAÇÕES COMUNS

  1️⃣  Fazer backup manual AGORA
      cd scripts/backup
      ./backup.sh

  2️⃣  Restaurar um backup anterior
      cd scripts/backup
      ./manage.sh list              # Ver backups disponíveis
      ./restore.sh pytake_db_20251226_030000.tar.gz

  3️⃣  Ver status do sistema de backup
      cd scripts/backup
      ./manage.sh status

  4️⃣  Configurar backups automáticos (já configurado)
      cd scripts/backup
      ./setup_cron.sh --daily       # Diariamente às 2:00 AM
      ./setup_cron.sh --hourly      # A cada hora
      ./setup_cron.sh --weekly      # Semanalmente

  5️⃣  Desabilitar backups automáticos
      cd scripts/backup
      ./setup_cron.sh --disable

  6️⃣  Limpar backups antigos
      cd scripts/backup
      ./manage.sh cleanup           # Remove >30 dias
      ./manage.sh cleanup --force   # Mantém apenas últimos 3

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💾 LOCALIZAÇÃO DOS ARQUIVOS

  Backups:        /home/administrator/pytake/backups/
  Scripts:        /home/administrator/pytake/scripts/backup/
  Documentação:   /home/administrator/pytake/scripts/backup/README.md
  Logs:           /home/administrator/pytake/backups/cron.log

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚡ OPERAÇÕES RÁPIDAS (copiar e colar)

  # Backup + listar
  bash scripts/backup/backup.sh && bash scripts/backup/manage.sh list

  # Restaurar + reiniciar backend
  cd scripts/backup && ./restore.sh pytake_db_20251226_030000.tar.gz && \
    docker compose restart backend

  # Ver últimos 50 logs de backup
  tail -50 backups/cron.log

  # Monitorar backup em tempo real
  tail -f backups/cron.log

  # Ver cron jobs ativos
  crontab -l | grep PYTAKE

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ℹ️  STATUS ATUAL

EOF

cd /home/administrator/pytake/scripts/backup
bash manage.sh status

cat << 'EOF'

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📚 LEIA A DOCUMENTAÇÃO COMPLETA

  cat scripts/backup/README.md

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EOF
