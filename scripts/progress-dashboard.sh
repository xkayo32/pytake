#!/bin/bash

# Dashboard de progresso em tempo real
# Uso: ./scripts/progress-dashboard.sh

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Limpar tela
clear

# Função para centralizar texto
center_text() {
    local text="$1"
    local width=$(tput cols)
    local padding=$(( (width - ${#text}) / 2 ))
    printf "%*s%s\n" $padding "" "$text"
}

# Função para desenhar linha
draw_line() {
    printf '%*s\n' "${COLUMNS:-$(tput cols)}" '' | tr ' ' '─'
}

# Cabeçalho
echo -e "${CYAN}"
center_text "╔═══════════════════════════════════════╗"
center_text "║     PyTake Development Dashboard      ║"
center_text "╚═══════════════════════════════════════╝"
echo -e "${NC}"

# Data e hora
echo -e "${YELLOW}📅 $(date '+%d/%m/%Y %H:%M:%S')${NC}"
draw_line

# Progresso Geral
echo -e "\n${GREEN}📊 PROGRESSO GERAL${NC}"
echo -e "MVP: [■□□□□□□□□□] 5% Completo"
echo -e "Fase Atual: ${YELLOW}Fundação${NC}"
echo -e "Tempo Decorrido: 1 dia"
echo -e "Tempo Estimado Restante: 139 dias"

# Progresso por Fase
echo -e "\n${GREEN}🎯 PROGRESSO POR FASE${NC}"
echo -e "Fase 1 - Fundação:     [■□□□□□□□□□] 10% ${YELLOW}▶ Em Andamento${NC}"
echo -e "Fase 2 - Autenticação: [□□□□□□□□□□] 0%  ⏸ Aguardando"
echo -e "Fase 3 - WhatsApp:     [□□□□□□□□□□] 0%  ⏸ Aguardando"
echo -e "Fase 4 - Fluxos:       [□□□□□□□□□□] 0%  ⏸ Aguardando"
echo -e "Fase 5 - Módulos:      [□□□□□□□□□□] 0%  ⏸ Aguardando"
echo -e "Fase 6 - Dashboard:    [□□□□□□□□□□] 0%  ⏸ Aguardando"

# Estatísticas
echo -e "\n${GREEN}📈 ESTATÍSTICAS${NC}"
printf "%-25s %s\n" "Total de Tarefas:" "170"
printf "%-25s %s\n" "Tarefas Concluídas:" "${GREEN}5${NC}"
printf "%-25s %s\n" "Tarefas em Andamento:" "${YELLOW}1${NC}"
printf "%-25s %s\n" "Tarefas Pendentes:" "164"
printf "%-25s %s\n" "Bugs Abertos:" "${RED}0${NC}"
printf "%-25s %s\n" "Velocidade (tasks/dia):" "5"

# Tarefas do Dia
echo -e "\n${GREEN}✅ CONCLUÍDAS HOJE${NC}"
echo "• Criar documentação inicial do projeto"
echo "• Definir arquitetura do sistema"
echo "• Criar estrutura de documentação"
echo "• Definir roadmap de desenvolvimento"
echo "• Criar lista completa de TODOs"

echo -e "\n${YELLOW}🔄 EM ANDAMENTO${NC}"
echo "• Criar repositório Git e fazer commit inicial"

echo -e "\n${BLUE}📋 PRÓXIMAS TAREFAS${NC}"
echo "1. Criar estrutura de diretórios base"
echo "2. Configurar workspace Rust"
echo "3. Configurar Docker e docker-compose"
echo "4. Criar crate pytake-core"
echo "5. Configurar banco de dados"

# Alertas
echo -e "\n${RED}⚠️  ALERTAS${NC}"
echo "• Nenhum alerta no momento"

# Commits
echo -e "\n${PURPLE}💻 ÚLTIMOS COMMITS${NC}"
echo "• [01/08 21:36] Initial commit - Documentation"
echo "• Aguardando primeiro commit de código..."

# Rodapé
draw_line
echo -e "${CYAN}💡 Dica: Execute ${NC}${YELLOW}./scripts/update-progress.sh${NC}${CYAN} para atualizar o progresso${NC}"
echo -e "${CYAN}📊 Relatório completo em: ${NC}${YELLOW}docs/PROGRESS.md${NC}"

# Atualização automática (opcional)
# echo -e "\n${YELLOW}↻ Atualizando em 30 segundos...${NC}"
# sleep 30
# exec "$0"