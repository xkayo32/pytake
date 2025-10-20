#!/bin/bash

# Script para configurar /etc/hosts com pytake.net

echo "Configurando /etc/hosts para PyTake..."

# Verificar se já existe
if grep -q "pytake.net" /etc/hosts; then
    echo "✓ pytake.net já configurado"
else
    echo "127.0.0.1    pytake.net" | sudo tee -a /etc/hosts
    echo "✓ pytake.net adicionado"
fi

echo ""
echo "Arquivo /etc/hosts atualizado:"
echo "------------------------------"
grep "pytake.net" /etc/hosts

echo ""
echo "Testando conectividade..."
echo "------------------------------"

# Testar pytake.net (frontend)
if curl -s -o /dev/null -w "%{http_code}" http://pytake.net | grep -q "200"; then
    echo "✓ Frontend (http://pytake.net): OK"
else
    echo "✗ Frontend (http://pytake.net): FALHOU"
fi

# Testar pytake.net/api (backend)
if curl -s -o /dev/null -w "%{http_code}" http://pytake.net/api/v1/health | grep -q "200"; then
    echo "✓ Backend API (http://pytake.net/api): OK"
else
    echo "✗ Backend API (http://pytake.net/api): FALHOU"
fi

echo ""
echo "Acesse no navegador:"
echo "  - Frontend: http://pytake.net"
echo "  - API: http://pytake.net/api/v1"
echo "  - Docs: http://pytake.net/api/v1/docs"
echo ""
echo "Login Admin:"
echo "  - Email: admin@pytake.com"
echo "  - Senha: Admin123"
echo "  - URL: http://pytake.net/login"
echo ""
echo "Login Agente:"
echo "  - Email: agente@pytake.com"
echo "  - Senha: Agente123"
echo "  - URL: http://pytake.net/login"
