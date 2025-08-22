#!/bin/bash
# Script para iniciar o frontend em desenvolvimento estável

echo "🚀 Iniciando PyTake Frontend em desenvolvimento..."

# Matar processos anteriores
echo "🔄 Parando servidores Next.js anteriores..."
pkill -f "next dev" 2>/dev/null || true
sleep 2

# Verificar se a porta está livre
PORT=3003
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  Porta $PORT em uso, liberando..."
    kill -9 $(lsof -t -i:$PORT) 2>/dev/null || true
    sleep 2
fi

# Verificar dependências
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependências..."
    npm install
fi

# Configurar ambiente de desenvolvimento
export NODE_ENV=development
export FORCE_COLOR=1
export NEXT_TELEMETRY_DISABLED=1

# Iniciar servidor com configurações otimizadas
echo "🌐 Iniciando servidor na porta $PORT..."
echo "📍 URL local: http://localhost:$PORT"
echo "🌍 URL pública: https://app.pytake.net"
echo ""

# Usar exec para manter o processo principal
exec npm run dev -- --port $PORT --hostname 0.0.0.0