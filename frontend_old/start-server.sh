#!/bin/bash

# Script para iniciar o servidor Next.js de forma estável
echo "🚀 Iniciando servidor Next.js..."

# Limpar cache se necessário
if [ -d ".next" ]; then
    echo "🧹 Limpando cache anterior..."
    rm -rf .next 2>/dev/null || sudo rm -rf .next
fi

# Configurar variáveis de ambiente
export NODE_ENV=development
export PORT=3009

# Iniciar servidor
echo "📡 Iniciando na porta $PORT..."
exec npx next dev -p $PORT