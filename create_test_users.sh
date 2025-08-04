#!/bin/bash

echo "🔐 Criando usuários de teste para PyChat"
echo "========================================"

# Admin User
echo -e "\n👤 Criando usuário Admin..."
curl -X POST http://localhost:8080/api/v1/auth-db/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@pychat.com",
    "password": "admin123456",
    "name": "Admin PyChat"
  }' 2>/dev/null | grep -q "error" && echo "❌ Admin já existe" || echo "✅ Admin criado!"

# Supervisor User
echo -e "\n👤 Criando usuário Supervisor..."
curl -X POST http://localhost:8080/api/v1/auth-db/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "supervisor@pychat.com",
    "password": "super123456",
    "name": "Supervisor PyChat"
  }' 2>/dev/null | grep -q "error" && echo "❌ Supervisor já existe" || echo "✅ Supervisor criado!"

# Agent User
echo -e "\n👤 Criando usuário Agent..."
curl -X POST http://localhost:8080/api/v1/auth-db/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "agent@pychat.com",
    "password": "agent123456",
    "name": "Agent PyChat"
  }' 2>/dev/null | grep -q "error" && echo "❌ Agent já existe" || echo "✅ Agent criado!"

# Viewer User
echo -e "\n👤 Criando usuário Viewer..."
curl -X POST http://localhost:8080/api/v1/auth-db/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "viewer@pychat.com",
    "password": "viewer123456",
    "name": "Viewer PyChat"
  }' 2>/dev/null | grep -q "error" && echo "❌ Viewer já existe" || echo "✅ Viewer criado!"

echo -e "\n✅ Processo concluído!"
echo -e "\n📋 Usuários disponíveis:"
echo "========================"
echo "Admin:      admin@pychat.com / admin123456"
echo "Supervisor: supervisor@pychat.com / super123456"
echo "Agent:      agent@pychat.com / agent123456"
echo "Viewer:     viewer@pychat.com / viewer123456"
echo "Test:       test@pychat.com / test123456"