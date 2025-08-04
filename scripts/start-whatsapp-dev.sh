#!/bin/bash

# Script para iniciar o ambiente de desenvolvimento com WhatsApp Evolution API

echo "🚀 Iniciando PyTake com WhatsApp Evolution API..."

# Para todos os containers se estiverem rodando
echo "🛑 Parando containers existentes..."
docker-compose -f docker-compose.dev.yml down

# Remove volumes antigos para começar limpo (opcional)
# docker-compose -f docker-compose.dev.yml down -v

# Inicia os serviços
echo "🔨 Construindo imagens..."
docker-compose -f docker-compose.dev.yml build

echo "🚀 Iniciando serviços..."
docker-compose -f docker-compose.dev.yml up -d

# Aguarda os serviços ficarem prontos
echo "⏳ Aguardando serviços ficarem prontos..."
sleep 10

# Verifica status dos serviços
echo "✅ Status dos serviços:"
docker-compose -f docker-compose.dev.yml ps

# Mostra logs do backend
echo "📋 Logs do backend (últimas 20 linhas):"
docker-compose -f docker-compose.dev.yml logs --tail=20 backend-simple

echo ""
echo "🎉 Ambiente iniciado com sucesso!"
echo ""
echo "📱 URLs disponíveis:"
echo "   - Frontend: http://localhost:3000"
echo "   - Backend API: http://localhost:8080"
echo "   - Evolution API: http://localhost:8084"
echo "   - pgAdmin: http://localhost:5050 (com --profile tools)"
echo "   - Redis Commander: http://localhost:8081 (com --profile tools)"
echo ""
echo "🔐 Credenciais padrão:"
echo "   - Admin: admin@pytake.com / admin123"
echo "   - Evolution API Key: B6D711FCDE4D4FD5936544120E713976"
echo ""
echo "📝 Para ver logs em tempo real:"
echo "   docker-compose -f docker-compose.dev.yml logs -f"
echo ""
echo "🛑 Para parar os serviços:"
echo "   docker-compose -f docker-compose.dev.yml down"