#!/bin/bash

# Script de entrypoint para o container backend
# Executa migrations antes de iniciar o servidor

set -e

echo "🔧 PyTake Backend - Inicializando..."

# Aguardar o PostgreSQL estar pronto
echo "⏳ Aguardando PostgreSQL..."
while ! pg_isready -h ${POSTGRES_SERVER:-postgres} -p ${POSTGRES_PORT:-5432} -U ${POSTGRES_USER:-pytake}; do
  sleep 1
done
echo "✅ PostgreSQL está pronto!"

# Executar migrations do Alembic
echo "🔄 Verificando migrations..."
if alembic current 2>/dev/null; then
  echo "📊 Aplicando migrations..."
  alembic upgrade head
  echo "✅ Migrations aplicadas com sucesso!"
else
  echo "⚠️  Erro ao verificar migrations, tentando aplicar mesmo assim..."
  alembic upgrade head || echo "❌ Falha ao aplicar migrations - servidor iniciará mesmo assim"
fi

# Iniciar o servidor
echo "🚀 Iniciando servidor Uvicorn..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
