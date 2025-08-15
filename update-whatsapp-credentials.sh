#!/bin/bash

echo "==================================="
echo "  Atualizar Credenciais WhatsApp"
echo "==================================="
echo ""
echo "Este script vai ajudar você a atualizar suas credenciais do WhatsApp Business API."
echo ""
echo "Você precisa das seguintes informações do Facebook Developer Console:"
echo "1. Phone Number ID"
echo "2. Access Token (que começa com EAA...)"
echo "3. Business Account ID (opcional)"
echo ""
echo "Acesse: https://developers.facebook.com/apps/YOUR_APP_ID/whatsapp/getting-started/"
echo ""
echo "-----------------------------------"
echo ""

# Solicitar Phone Number ID
read -p "Digite o Phone Number ID: " PHONE_ID

# Solicitar Access Token
echo ""
echo "Digite o Access Token (será ocultado):"
read -s ACCESS_TOKEN
echo ""

# Solicitar Business Account ID
echo ""
read -p "Digite o Business Account ID (opcional, pressione Enter para pular): " BUSINESS_ID

# Solicitar Webhook Token
echo ""
read -p "Digite o Webhook Verify Token (ou pressione Enter para gerar automaticamente): " WEBHOOK_TOKEN

if [ -z "$WEBHOOK_TOKEN" ]; then
    WEBHOOK_TOKEN=$(openssl rand -hex 16)
    echo "Token gerado automaticamente: $WEBHOOK_TOKEN"
fi

# Validar entrada
if [ -z "$PHONE_ID" ] || [ -z "$ACCESS_TOKEN" ]; then
    echo ""
    echo "❌ Erro: Phone Number ID e Access Token são obrigatórios!"
    exit 1
fi

# Atualizar no banco de dados
echo ""
echo "Atualizando banco de dados..."

docker exec pytake-postgres psql -U pytake_admin -d pytake_production -c "
UPDATE whatsapp_configs 
SET 
    phone_number_id = '$PHONE_ID',
    access_token = '$ACCESS_TOKEN',
    business_account_id = NULLIF('$BUSINESS_ID', ''),
    webhook_verify_token = '$WEBHOOK_TOKEN',
    updated_at = NOW()
WHERE is_default = true
RETURNING name;
"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Credenciais atualizadas com sucesso!"
    echo ""
    echo "Informações importantes:"
    echo "------------------------"
    echo "Webhook URL: https://api.pytake.net/api/v1/whatsapp/webhook"
    echo "Webhook Verify Token: $WEBHOOK_TOKEN"
    echo ""
    echo "Configure estes valores no Facebook Developer Console:"
    echo "1. Vá em WhatsApp → Configuration → Webhooks"
    echo "2. Cole a URL e o Verify Token acima"
    echo "3. Inscreva-se nos campos: messages, message_deliveries, message_reads"
    echo ""
    echo "Agora você pode testar a conexão na interface do PyTake!"
else
    echo ""
    echo "❌ Erro ao atualizar credenciais. Verifique a conexão com o banco de dados."
    exit 1
fi