# Guia de Configuração do Webhook WhatsApp Business

## 🎯 Objetivo
Este guia mostra como configurar e validar o webhook do WhatsApp Business API para receber mensagens em tempo real no PyTake.

## 📋 Pré-requisitos
- Conta no Meta for Developers
- App configurado com WhatsApp Business
- Token de acesso válido
- Domínio com HTTPS (api.pytake.net)

## 🔧 Configuração do Webhook

### 1. No PyTake

#### URLs do Webhook
- **URL do Webhook**: `https://api.pytake.net/webhook/whatsapp`
- **Verificação**: GET request com parâmetros de validação
- **Recebimento**: POST request com mensagens

#### Token de Verificação
Cada configuração tem um `webhook_verify_token` único que deve corresponder ao configurado no Meta.

### 2. No Meta for Developers

1. Acesse [Meta for Developers](https://developers.facebook.com)
2. Selecione seu App
3. No menu lateral: **WhatsApp > Configuração**
4. Na seção **Webhook**:

#### Configurar URL do Webhook:
```
Callback URL: https://api.pytake.net/webhook/whatsapp
Verify Token: [seu_webhook_verify_token]
```

#### Inscrever em Eventos:
Marque os seguintes eventos:
- `messages` - Receber mensagens
- `message_status` - Status de entrega
- `message_template_status_update` - Atualizações de templates

### 3. Validação do Webhook

#### Via Interface PyTake:
1. Acesse **Configurações > WhatsApp**
2. No menu de ações da configuração, clique em **"Validar Webhook"**
3. O sistema verificará:
   - Se o webhook está configurado
   - Se está recebendo eventos
   - URL e token configurados

#### Via cURL:
```bash
curl -X POST https://api.pytake.net/api/v1/whatsapp-configs/{CONFIG_ID}/webhook/validate \
  -H "Authorization: Bearer {SEU_TOKEN}" \
  -H "Content-Type: application/json"
```

### 4. Teste de Verificação

O Meta enviará uma requisição GET para validar:
```
GET https://api.pytake.net/webhook/whatsapp?
  hub.mode=subscribe&
  hub.verify_token={SEU_TOKEN}&
  hub.challenge={CHALLENGE_STRING}
```

O PyTake responderá com o `challenge` se o token estiver correto.

### 5. Recebimento de Mensagens

Quando uma mensagem for recebida, o Meta enviará um POST:
```json
{
  "entry": [{
    "id": "ENTRY_ID",
    "changes": [{
      "value": {
        "messaging_product": "whatsapp",
        "messages": [{
          "from": "5511999999999",
          "id": "MESSAGE_ID",
          "timestamp": "1234567890",
          "type": "text",
          "text": {
            "body": "Mensagem recebida"
          }
        }]
      }
    }]
  }]
}
```

## 🔍 Validação no PyTake

### Funções Disponíveis:

1. **Validar Webhook**: Verifica se está configurado
2. **Inscrever Webhook**: Ativa o recebimento de eventos
3. **Configurar Webhook**: Define tokens e URLs
4. **Ver Logs**: Monitora mensagens recebidas

### Status do Webhook:

- ✅ **Conectado**: Webhook ativo e recebendo
- ⚠️ **Não Inscrito**: Configurado mas não ativo
- ❌ **Erro**: Problema na configuração

## 🐛 Troubleshooting

### Webhook não valida:
1. Verifique se o token está correto
2. Confirme que a URL está acessível (HTTPS obrigatório)
3. Verifique os logs do servidor

### Não recebe mensagens:
1. Confirme que o webhook está inscrito
2. Verifique os eventos selecionados no Meta
3. Teste com mensagem simples primeiro

### Erro 401:
- Token de acesso expirado ou inválido
- Gere um novo token no Meta for Developers

### Erro 403:
- Webhook verify token incorreto
- Permissões insuficientes no App

## 📊 Monitoramento

### Logs de Webhook:
```bash
# Ver últimos logs
curl https://api.pytake.net/api/v1/webhook/logs \
  -H "Authorization: Bearer {TOKEN}"
```

### Verificar Mensagens Recebidas:
```sql
SELECT * FROM whatsapp_messages 
ORDER BY created_at DESC 
LIMIT 10;
```

## 🔐 Segurança

1. **HTTPS Obrigatório**: Meta só aceita webhooks HTTPS
2. **Token Único**: Use tokens fortes e únicos
3. **Validação**: Sempre valide assinatura das requisições
4. **Rate Limiting**: Implemente limites para evitar abuse

## 📚 Links Úteis

- [Webhook Setup - Meta](https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/setup)
- [Webhook Events](https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/events)
- [Security Best Practices](https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/security)

## ⚡ Comandos Rápidos

```bash
# Validar webhook
curl -X POST https://api.pytake.net/api/v1/whatsapp-configs/{ID}/webhook/validate

# Inscrever webhook
curl -X POST https://api.pytake.net/api/v1/whatsapp-configs/{ID}/webhook/subscribe

# Ver logs
curl https://api.pytake.net/api/v1/webhook/logs
```