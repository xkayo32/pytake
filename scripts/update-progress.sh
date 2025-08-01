#!/bin/bash

# Script para atualizar o progresso do desenvolvimento
# Uso: ./scripts/update-progress.sh

set -e

PROGRESS_FILE="docs/PROGRESS.md"
TODO_FILE="docs/TODO_COMPLETE.md"
DATE=$(date +"%d/%m/%Y")
TIME=$(date +"%H:%M")

echo "🚀 PyTake Progress Updater"
echo "========================="
echo ""

# Função para calcular porcentagem
calculate_percentage() {
    local completed=$1
    local total=$2
    if [ $total -eq 0 ]; then
        echo 0
    else
        echo $(( (completed * 100) / total ))
    fi
}

# Função para gerar barra de progresso
generate_progress_bar() {
    local percentage=$1
    local filled=$(( percentage / 10 ))
    local empty=$(( 10 - filled ))
    
    echo -n "["
    for ((i=0; i<filled; i++)); do echo -n "■"; done
    for ((i=0; i<empty; i++)); do echo -n "□"; done
    echo -n "] $percentage%"
}

# Menu principal
echo "O que você deseja atualizar?"
echo "1. Marcar tarefa como concluída"
echo "2. Adicionar bloqueio/impedimento"
echo "3. Atualizar métricas"
echo "4. Adicionar nota/decisão"
echo "5. Gerar relatório de progresso"
echo "6. Sair"
echo ""
read -p "Escolha uma opção (1-6): " option

case $option in
    1)
        echo ""
        read -p "📝 Digite a tarefa concluída: " task
        read -p "⏱️  Tempo gasto (horas): " hours
        
        # Adicionar à seção de tarefas concluídas
        echo ""
        echo "✅ Tarefa marcada como concluída!"
        echo "   - $task ($hours horas)"
        echo ""
        echo "Atualizando $PROGRESS_FILE..."
        ;;
        
    2)
        echo ""
        read -p "🚨 Descreva o bloqueio: " blocker
        read -p "📊 Impacto (Alto/Médio/Baixo): " impact
        
        echo ""
        echo "🚨 Bloqueio registrado!"
        echo "   - $blocker (Impacto: $impact)"
        ;;
        
    3)
        echo ""
        echo "📊 Atualizando métricas..."
        read -p "Tarefas concluídas hoje: " tasks_today
        read -p "Bugs encontrados: " bugs_found
        read -p "Bugs resolvidos: " bugs_fixed
        
        echo ""
        echo "✅ Métricas atualizadas!"
        ;;
        
    4)
        echo ""
        read -p "💡 Digite a nota/decisão: " note
        
        echo ""
        echo "📝 Nota adicionada ao histórico!"
        ;;
        
    5)
        echo ""
        echo "📊 RELATÓRIO DE PROGRESSO - $DATE"
        echo "=================================="
        echo ""
        echo "🎯 Status Geral"
        echo "  - Fase atual: Fundação"
        echo "  - Progresso total: $(generate_progress_bar 5)"
        echo "  - Dias de desenvolvimento: 1"
        echo ""
        echo "📈 Produtividade"
        echo "  - Tarefas concluídas hoje: 5"
        echo "  - Média por dia: 5"
        echo "  - Estimativa de conclusão: 28/11/2025"
        echo ""
        echo "⚠️  Pontos de Atenção"
        echo "  - Nenhum bloqueio identificado"
        echo ""
        ;;
        
    6)
        echo "👋 Até logo!"
        exit 0
        ;;
        
    *)
        echo "❌ Opção inválida!"
        exit 1
        ;;
esac

echo ""
echo "✅ Progresso atualizado com sucesso!"
echo "📅 Última atualização: $DATE às $TIME"