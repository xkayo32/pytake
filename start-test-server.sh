#!/bin/bash

# Script para iniciar servidor de testes do PyTake

echo "🚀 Iniciando servidor de teste do PyTake..."
echo "==========================================="

cd /home/administrator/pytake-backend/frontend

# Limpar diretório .next se tiver problemas de permissão
if [ -d ".next" ]; then
    echo "🧹 Limpando diretório .next..."
    sudo rm -rf .next 2>/dev/null || rm -rf .next
fi

# Verificar porta 3000
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️ Porta 3000 em uso, tentando porta 3002..."
    export PORT=3002
else
    export PORT=3000
fi

echo "📦 Instalando dependências se necessário..."
[ ! -d "node_modules" ] && npm install

echo "🌐 Iniciando servidor na porta $PORT..."
echo ""
echo "📍 URLs disponíveis:"
echo "   - Local: http://localhost:$PORT"
echo "   - Flow de teste: http://localhost:$PORT/flows/a4ac6fc3-ad2d-4125-81fa-9685b88697fc/test"
echo ""

# Iniciar servidor
npm run dev