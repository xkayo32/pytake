#!/bin/bash

# Script para iniciar o sistema sem Docker (temporário)

echo "================================"
echo "PyTake - Iniciando sem Docker"
echo "================================"
echo ""
echo "⚠️  ATENÇÃO: Este é um modo de emergência!"
echo "Use Docker para produção com: ./docker-start.sh start"
echo ""

# Verificar se o PostgreSQL está rodando
if ! pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
    echo "❌ PostgreSQL não está rodando!"
    echo "Instale e inicie o PostgreSQL primeiro:"
    echo "  sudo apt install postgresql"
    echo "  sudo systemctl start postgresql"
    exit 1
fi

# Verificar se o Redis está rodando
if ! redis-cli ping > /dev/null 2>&1; then
    echo "❌ Redis não está rodando!"
    echo "Instale e inicie o Redis primeiro:"
    echo "  sudo apt install redis-server"
    echo "  sudo systemctl start redis-server"
    exit 1
fi

echo "✅ PostgreSQL está rodando"
echo "✅ Redis está rodando"
echo ""

# Carregar variáveis de ambiente
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
    echo "✅ Variáveis de ambiente carregadas de .env"
else
    echo "❌ Arquivo .env não encontrado!"
    exit 1
fi

# Criar diretórios necessários
mkdir -p uploads logs ssl

echo ""
echo "📌 Para compilar e rodar o backend Rust:"
echo ""
echo "cd backend/simple_api"
echo "cargo run --release"
echo ""
echo "📌 URLs de acesso (quando o backend estiver rodando):"
echo "  http://api.pytake.net (requer Nginx)"
echo "  http://localhost:8789 (direto)"
echo ""
echo "📌 Para usar com domínio api.pytake.net:"
echo "  1. Configure o DNS para apontar para este servidor"
echo "  2. Instale e configure o Nginx como proxy reverso"
echo "  3. Ou use Docker: ./docker-start.sh start"
echo ""