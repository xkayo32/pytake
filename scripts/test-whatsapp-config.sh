#!/bin/bash

# Script para testar a configuração do WhatsApp via API

API_URL="http://localhost:8080/api/v1"
TOKEN=""

echo "🔐 Fazendo login como admin..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth-db/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@pytake.com",
    "password": "admin123"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Erro ao fazer login"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Login realizado com sucesso"
echo ""

echo "📱 Configurando Evolution API..."
CONFIG_RESPONSE=$(curl -s -X PUT "$API_URL/settings/whatsapp" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "provider": "evolution",
    "official": {
      "enabled": false,
      "phoneNumberId": "",
      "accessToken": "",
      "webhookVerifyToken": "",
      "businessId": ""
    },
    "evolution": {
      "enabled": true,
      "baseUrl": "http://evolution-api:8084",
      "apiKey": "B6D711FCDE4D4FD5936544120E713976",
      "instanceName": "pytake",
      "webhookUrl": "http://backend-simple:8080/api/v1/webhooks/whatsapp"
    }
  }')

echo "Response: $CONFIG_RESPONSE"
echo ""

echo "🧪 Testando conexão com Evolution API..."
TEST_RESPONSE=$(curl -s -X POST "$API_URL/settings/whatsapp/test" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "provider": "evolution",
    "official": {
      "enabled": false,
      "phoneNumberId": "",
      "accessToken": "",
      "webhookVerifyToken": "",
      "businessId": ""
    },
    "evolution": {
      "enabled": true,
      "baseUrl": "http://localhost:8084",
      "apiKey": "B6D711FCDE4D4FD5936544120E713976",
      "instanceName": "pytake",
      "webhookUrl": "http://localhost:8080/api/v1/webhooks/whatsapp"
    }
  }')

echo "Test Response: $TEST_RESPONSE"
echo ""

if echo "$TEST_RESPONSE" | grep -q '"success":true'; then
  echo "✅ Conexão com Evolution API testada com sucesso!"
else
  echo "❌ Erro ao testar conexão com Evolution API"
fi