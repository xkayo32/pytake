#!/bin/bash

# Script para testar o Sistema Mock do PyTake
# Executa o ambiente de desenvolvimento e abre o flow de teste

echo "🤖 PyTake - Sistema Mock de Teste de Flows"
echo "=========================================="
echo ""

# Verificar se está no diretório correto
if [ ! -f "frontend/package.json" ]; then
    echo "❌ Erro: Execute este script no diretório raiz do projeto PyTake"
    exit 1
fi

# Verificar se Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Erro: Node.js não encontrado. Instale Node.js primeiro."
    exit 1
fi

# Verificar se as dependências estão instaladas
if [ ! -d "frontend/node_modules" ]; then
    echo "📦 Instalando dependências..."
    cd frontend && npm install
    cd ..
fi

echo "🚀 Iniciando servidor de desenvolvimento..."
echo ""

# Iniciar servidor em background
cd frontend
npm run dev &
SERVER_PID=$!

# Aguardar servidor inicializar
echo "⏳ Aguardando servidor inicializar..."
sleep 5

# URL do flow de teste
FLOW_URL="http://localhost:3000/flows/a4ac6fc3-ad2d-4125-81fa-9685b88697fc/test"

echo ""
echo "✅ Servidor iniciado com sucesso!"
echo ""
echo "🎯 FLOW DE TESTE MOCK:"
echo "   URL: $FLOW_URL"
echo "   Flow: Boas-vindas Automáticas"
echo "   ID: a4ac6fc3-ad2d-4125-81fa-9685b88697fc"
echo ""
echo "📱 COMO TESTAR:"
echo "   1. Abra o link acima no navegador"
echo "   2. Clique em 'Iniciar' no painel de debug"
echo "   3. Ou digite: oi, olá, menu, ajuda"
echo "   4. Navegue pelos botões e listas"
echo ""
echo "🐛 DEBUG:"
echo "   • Logs em tempo real no painel lateral"
echo "   • Monitore variáveis e execução"
echo "   • Use breakpoints para pausar"
echo ""

# Tentar abrir no navegador (funciona no Linux com GUI)
if command -v xdg-open &> /dev/null; then
    echo "🌐 Abrindo navegador..."
    xdg-open "$FLOW_URL" 2>/dev/null
elif command -v open &> /dev/null; then
    echo "🌐 Abrindo navegador..."
    open "$FLOW_URL" 2>/dev/null
fi

echo "⌨️  Pressione Ctrl+C para parar o servidor"
echo ""

# Aguardar interrupção
wait $SERVER_PID