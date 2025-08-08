# Demonstração Simples do Sistema de Webhooks

Este exemplo mostra como usar o sistema de webhooks do PyTake API de forma prática.

## Exemplo 1: Configurando um Webhook

```bash
curl -X POST http://localhost:8080/api/v1/webhooks/configure \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "minha-empresa",
    "base_url": "https://api.minhaempresa.com/webhooks",
    "secret_key": "minha-chave-super-secreta",
    "retry_policy": {
      "max_retries": 3,
      "initial_delay_seconds": 2,
      "backoff_multiplier": 2.0,
      "max_delay_seconds": 120,
      "jitter": true
    },
    "timeout_seconds": 30,
    "enabled_events": ["user.*", "order.completed"],
    "active": true
  }'
```

## Exemplo 2: Enviando um Evento

```bash
curl -X POST http://localhost:8080/api/v1/webhooks/send \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "minha-empresa",
    "event_type": "user.created",
    "payload": {
      "user_id": "usr_123",
      "email": "novo.usuario@exemplo.com",
      "name": "Novo Usuário",
      "created_at": "2024-01-15T10:30:00Z"
    },
    "severity": "Medium",
    "context": {
      "source": "registration_form",
      "ip_address": "192.168.1.100"
    }
  }'
```

## Exemplo 3: Consultando Métricas

```bash
curl http://localhost:8080/api/v1/webhooks/metrics/minha-empresa
```

Resposta:
```json
{
  "success": true,
  "data": {
    "total_events": 25,
    "successful_events": 23,
    "failed_events": 2,
    "pending_retries": 1,
    "dead_letter_count": 0,
    "avg_response_time_ms": 156.4,
    "last_updated": "2024-01-15T14:30:00Z"
  },
  "timestamp": "2024-01-15T14:30:00Z"
}
```

## Exemplo 4: Listando Configurações

```bash
curl http://localhost:8080/api/v1/webhooks/configs
```

## Exemplo 5: Verificando Dead Letter Queue

```bash
curl http://localhost:8080/api/v1/webhooks/dead-letter?tenant_id=minha-empresa
```

## Exemplo 6: Reprocessando Evento Falhado

```bash
curl -X POST http://localhost:8080/api/v1/webhooks/retry/evt_123456
```

## Estrutura do Payload Recebido

Quando seu endpoint receber um webhook, ele terá esta estrutura:

```json
{
  "event_id": "evt_uuid_here",
  "event_type": "user.created",
  "tenant_id": "minha-empresa",
  "timestamp": 1705320600,
  "data": {
    "user_id": "usr_123",
    "email": "novo.usuario@exemplo.com",
    "name": "Novo Usuário",
    "created_at": "2024-01-15T10:30:00Z"
  },
  "severity": "Medium",
  "context": {
    "source": "registration_form",
    "ip_address": "192.168.1.100"
  }
}
```

## Headers Recebidos

```
Content-Type: application/json
X-Webhook-Signature: sha256=a8b7c6d5e4f3...
X-Event-Type: user.created
X-Event-ID: evt_uuid_here
X-Tenant-ID: minha-empresa
X-Timestamp: 1705320600
```

## Validando a Assinatura (Node.js)

```javascript
const crypto = require('crypto');

function validateWebhook(payload, signature, secret) {
    const expectedSignature = 'sha256=' + 
        crypto.createHmac('sha256', secret)
              .update(payload)
              .digest('hex');
    
    return signature === expectedSignature;
}

// Uso
app.post('/webhook', (req, res) => {
    const signature = req.headers['x-webhook-signature'];
    const payload = JSON.stringify(req.body);
    const secret = 'minha-chave-super-secreta';
    
    if (!validateWebhook(payload, signature, secret)) {
        return res.status(401).json({ error: 'Assinatura inválida' });
    }
    
    console.log('Webhook válido recebido:', req.body);
    res.json({ status: 'ok' });
});
```

## Validando a Assinatura (PHP)

```php
<?php
function validateWebhook($payload, $signature, $secret) {
    $expectedSignature = 'sha256=' . hash_hmac('sha256', $payload, $secret);
    return hash_equals($signature, $expectedSignature);
}

$headers = getallheaders();
$signature = $headers['X-Webhook-Signature'] ?? '';
$payload = file_get_contents('php://input');
$secret = 'minha-chave-super-secreta';

if (!validateWebhook($payload, $signature, $secret)) {
    http_response_code(401);
    echo json_encode(['error' => 'Assinatura inválida']);
    exit;
}

$data = json_decode($payload, true);
error_log('Webhook recebido: ' . print_r($data, true));
?>
```

## Validando a Assinatura (Python)

```python
import hmac
import hashlib
import json

def validate_webhook(payload, signature, secret):
    expected_signature = 'sha256=' + hmac.new(
        secret.encode('utf-8'),
        payload.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(signature, expected_signature)

# Flask
from flask import Flask, request

@app.route('/webhook', methods=['POST'])
def webhook():
    signature = request.headers.get('X-Webhook-Signature', '')
    payload = request.get_data(as_text=True)
    secret = 'minha-chave-super-secreta'
    
    if not validate_webhook(payload, signature, secret):
        return {'error': 'Assinatura inválida'}, 401
    
    data = request.get_json()
    print('Webhook recebido:', data)
    return {'status': 'ok'}
```

## Códigos de Status HTTP

O sistema reconhece os seguintes códigos como sucesso:
- 200-299: Sucesso (não tentará novamente)

Códigos que acionam retry:
- 429: Too Many Requests
- 500-599: Server Errors
- Timeout: Erro de timeout

Códigos que NÃO acionam retry (falha definitiva):
- 400-499 (exceto 429): Client Errors
- 300-399: Redirects (não suportados)

## Melhores Práticas

### 1. Idempotência
Sempre processe o mesmo webhook de forma idempotente usando o `event_id`.

### 2. Resposta Rápida
Responda rapidamente (< 5 segundos) para evitar timeouts.

### 3. Validação de Assinatura
Sempre valide a assinatura antes de processar.

### 4. Logging
Registre todos os webhooks recebidos para auditoria.

### 5. Tratamento de Erros
Retorne códigos HTTP apropriados:
- 200: Processado com sucesso
- 400: Dados inválidos (não tentará novamente)
- 500: Erro temporário (tentará novamente)

### 6. Monitoramento
Configure alertas para:
- Taxa de falha alta
- Muitos eventos na dead letter queue
- Tempo de resposta alto

## Testando Localmente

Para testar webhooks localmente, use ferramentas como:

1. **ngrok**: Expõe seu localhost para a internet
   ```bash
   ngrok http 3000
   # Use a URL gerada como base_url do webhook
   ```

2. **webhook.site**: Serviço online para testar webhooks
   ```bash
   curl -X POST http://localhost:8080/api/v1/webhooks/configure \
     -d '{"tenant_id":"test","base_url":"https://webhook.site/#!/unique-id","secret_key":"test"}'
   ```

3. **RequestBin**: Similar ao webhook.site
   ```bash
   # Configure sua URL do RequestBin como base_url
   ```

## Exemplo Completo de Integração

```javascript
const express = require('express');
const crypto = require('crypto');
const app = express();

app.use(express.json());

// Middleware para validar webhook
const validateWebhook = (req, res, next) => {
    const signature = req.headers['x-webhook-signature'];
    const payload = JSON.stringify(req.body);
    const secret = process.env.WEBHOOK_SECRET;
    
    const expectedSignature = 'sha256=' + 
        crypto.createHmac('sha256', secret)
              .update(payload)
              .digest('hex');
    
    if (signature !== expectedSignature) {
        return res.status(401).json({ error: 'Invalid signature' });
    }
    
    next();
};

// Handler principal do webhook
app.post('/webhooks/pytake', validateWebhook, (req, res) => {
    const { event_type, data, tenant_id, event_id } = req.body;
    
    console.log(`Received webhook: ${event_type} for tenant: ${tenant_id}`);
    
    try {
        switch (event_type) {
            case 'user.created':
                handleUserCreated(data);
                break;
            case 'order.completed':
                handleOrderCompleted(data);
                break;
            case 'whatsapp.message.received':
                handleWhatsAppMessage(data);
                break;
            default:
                console.log(`Unknown event type: ${event_type}`);
        }
        
        res.json({ 
            status: 'ok', 
            event_id: event_id,
            processed_at: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error processing webhook:', error);
        res.status(500).json({ error: 'Processing failed' });
    }
});

function handleUserCreated(data) {
    // Enviar email de boas-vindas
    console.log(`Sending welcome email to: ${data.email}`);
}

function handleOrderCompleted(data) {
    // Atualizar estoque, enviar nota fiscal, etc.
    console.log(`Processing completed order: ${data.order_id}`);
}

function handleWhatsAppMessage(data) {
    // Processar mensagem WhatsApp
    console.log(`New WhatsApp message from: ${data.from}`);
}

app.listen(3000, () => {
    console.log('Webhook server running on port 3000');
});
```

Este sistema de webhooks é production-ready e oferece todas as funcionalidades necessárias para uma integração robusta e confiável!