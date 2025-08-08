# Sistema de Webhooks Avançado - PyTake API

## Visão Geral

O PyTake API possui um sistema de webhooks robusto e completo que permite:

- ✅ **Retry automático** com backoff exponencial
- ✅ **Assinatura HMAC-SHA256** para segurança
- ✅ **Logging detalhado** de todas tentativas
- ✅ **Configuração por cliente/tenant**
- ✅ **Dead letter queue** para webhooks falhados
- ✅ **Métricas em tempo real**
- ✅ **Autenticação configurável**
- ✅ **Headers personalizados**
- ✅ **Filtros de evento com wildcards**

## Arquitetura

### Componentes Principais

1. **WebhookManager**: Coordena todas as operações
2. **WebhookConfig**: Configuração por tenant
3. **WebhookEvent**: Estrutura do evento a ser enviado
4. **RetryPolicy**: Define políticas de retry
5. **DeadLetterQueue**: Gerencia webhooks que falharam definitivamente
6. **WebhookMetrics**: Coleta métricas em tempo real

### Fluxo de Funcionamento

```
Evento → Configuração → Tentativa → Sucesso/Falha
                           ↓
                       Retry Policy
                           ↓
                    Dead Letter Queue
```

## API Endpoints

### Configuração de Webhooks

#### POST /api/v1/webhooks/configure

Configura webhook para um tenant específico.

```json
{
  "tenant_id": "empresa-123",
  "base_url": "https://api.empresa.com/webhooks",
  "secret_key": "super-secret-key-123",
  "default_headers": {
    "X-API-Version": "v2",
    "User-Agent": "PyTake-Webhook/1.0"
  },
  "retry_policy": {
    "max_retries": 5,
    "initial_delay_seconds": 1,
    "backoff_multiplier": 2.0,
    "max_delay_seconds": 300,
    "jitter": true
  },
  "timeout_seconds": 30,
  "enabled_events": ["user.*", "payment.completed", "order.*"],
  "active": true,
  "auth_config": {
    "auth_type": "Bearer",
    "token": "sk_live_123456789",
    "header_name": "Authorization"
  }
}
```

### Envio de Eventos

#### POST /api/v1/webhooks/send

Envia um evento de webhook.

```json
{
  "tenant_id": "empresa-123",
  "event_type": "user.created",
  "payload": {
    "user_id": "usr_12345",
    "email": "joao@empresa.com",
    "name": "João Silva",
    "created_at": "2024-01-15T10:30:00Z"
  },
  "target_url": "https://webhook.especifico.com/endpoint",
  "custom_headers": {
    "X-Event-Priority": "high"
  },
  "severity": "Medium",
  "context": {
    "transaction_id": "txn_abc123",
    "source": "api_v1"
  }
}
```

### Gerenciamento

#### GET /api/v1/webhooks/configs
Lista todas as configurações de webhook.

#### GET /api/v1/webhooks/metrics/{tenant_id}
Obtém métricas de um tenant específico.

#### GET /api/v1/webhooks/dead-letter?tenant_id={tenant_id}
Lista eventos na dead letter queue.

#### POST /api/v1/webhooks/retry/{event_id}
Reprocessa um evento da dead letter queue.

#### DELETE /api/v1/webhooks/config/{tenant_id}
Remove configuração de um tenant.

#### POST /api/v1/webhooks/receive
Endpoint para receber callbacks (exemplo de validação).

## Configuração Avançada

### Políticas de Retry

```rust
RetryPolicy {
    max_retries: 5,           // Máximo de tentativas
    initial_delay_seconds: 1, // Delay inicial
    backoff_multiplier: 2.0,  // Multiplicador exponencial
    max_delay_seconds: 300,   // Delay máximo (5 minutos)
    jitter: true,             // Adiciona jitter para evitar thundering herd
}
```

### Tipos de Autenticação

1. **Bearer Token**:
   ```json
   {
     "auth_type": "Bearer",
     "token": "sk_live_123456789"
   }
   ```

2. **API Key**:
   ```json
   {
     "auth_type": "ApiKey",
     "token": "api_key_123456789",
     "header_name": "X-API-Key"
   }
   ```

3. **Basic Auth**:
   ```json
   {
     "auth_type": "Basic",
     "token": "username:password"
   }
   ```

### Filtros de Eventos

- `"*"`: Todos os eventos
- `"user.*"`: Todos os eventos de usuário (user.created, user.updated, etc.)
- `"payment.completed"`: Evento específico
- `["user.created", "order.*", "payment.failed"]`: Múltiplos padrões

## Segurança

### Assinatura HMAC-SHA256

Todos os webhooks incluem uma assinatura no header `X-Webhook-Signature`:

```
X-Webhook-Signature: sha256=a8b7c6d5e4f3...
```

**Verificação no destino:**

```javascript
const crypto = require('crypto');

function verifySignature(payload, signature, secret) {
    const expectedSignature = 'sha256=' + 
        crypto.createHmac('sha256', secret)
              .update(payload)
              .digest('hex');
    
    return signature === expectedSignature;
}
```

### Headers de Segurança

Cada webhook inclui:

- `X-Webhook-Signature`: Assinatura HMAC-SHA256
- `X-Event-Type`: Tipo do evento
- `X-Event-ID`: ID único do evento
- `X-Tenant-ID`: ID do tenant
- `X-Timestamp`: Timestamp UNIX

## Monitoramento e Métricas

### Métricas Coletadas

```json
{
  "total_events": 1250,
  "successful_events": 1180,
  "failed_events": 70,
  "pending_retries": 15,
  "dead_letter_count": 3,
  "avg_response_time_ms": 245.7,
  "last_updated": "2024-01-15T14:30:00Z"
}
```

### Dead Letter Queue

Eventos que falharam após múltiplas tentativas são movidos para a dead letter queue:

```json
{
  "event": { /* evento original */ },
  "attempts": [ /* todas as tentativas */ ],
  "failed_at": "2024-01-15T14:30:00Z",
  "failure_reason": "Máximo de 5 tentativas excedido",
  "can_retry": true
}
```

## Exemplos de Uso

### 1. Configuração Simples

```rust
use simple_api::webhook_manager::{WebhookManager, WebhookConfig};

let manager = WebhookManager::new();

let config = WebhookConfig::new(
    "minha-empresa".to_string(),
    "https://api.minhaempresa.com/webhooks".to_string(),
    "minha-chave-secreta".to_string(),
);

manager.configure_tenant(config).await?;
```

### 2. Envio de Evento

```rust
use simple_api::webhook_manager::WebhookEvent;
use serde_json::json;

let event = WebhookEvent::new(
    "minha-empresa".to_string(),
    "user.created".to_string(),
    json!({
        "user_id": "usr_123",
        "email": "usuario@exemplo.com"
    }),
);

let event_id = manager.send_event(event).await?;
```

### 3. Verificação de Assinatura

```rust
let payload = r#"{"event":"test","data":"example"}"#;
let secret = "minha-chave-secreta";
let signature = "sha256=a8b7c6d5e4f3...";

let is_valid = manager.verify_signature(payload, signature, secret);
```

## Logs e Debugging

### Níveis de Log

- **INFO**: Operações normais (configuração, envios bem-sucedidos)
- **WARN**: Falhas temporárias, tentativas de retry
- **ERROR**: Falhas críticas, problemas de configuração
- **DEBUG**: Detalhes de cada tentativa

### Exemplo de Logs

```
2024-01-15T14:30:00Z INFO  Configurando webhook para tenant: empresa-123
2024-01-15T14:30:01Z INFO  Enviando webhook - Event: evt_123, Tenant: empresa-123, Type: user.created
2024-01-15T14:30:01Z INFO  Webhook enviado com sucesso - Event: evt_123, Status: 200, Time: 245ms
2024-01-15T14:30:02Z WARN  Webhook falhou - Event: evt_124, Status: 500, Time: 1200ms
2024-01-15T14:30:02Z INFO  Webhook falhou, adicionando à fila de retry - Event: evt_124
2024-01-15T14:30:05Z DEBUG Tentativa 2 para evento evt_124
2024-01-15T14:30:05Z INFO  Webhook reenviado com sucesso após 2 tentativas - Event: evt_124
```

## Performance

### Otimizações

- ✅ **Connection pooling** HTTP reutilizável
- ✅ **Processamento assíncrono** com Tokio
- ✅ **Retry em background** sem bloquear novos eventos
- ✅ **Jitter** para evitar thundering herd
- ✅ **Timeouts configuráveis** por tenant
- ✅ **Métricas em memória** para performance

### Capacidade

- **Throughput**: Milhares de eventos por segundo
- **Concurrent requests**: Limitado apenas pelo sistema
- **Memory usage**: ~1MB por 10.000 eventos em fila
- **Retry workers**: Um worker assíncrono global

## Exemplo Completo

Ver arquivo `examples/webhook_usage.rs` para um exemplo completo demonstrando todas as funcionalidades.

## Testes

```bash
cd /home/administrator/pytake-backend/backend/simple_api
cargo test webhook_manager
```

## Integração com WhatsApp

O sistema de webhooks se integra perfeitamente com o módulo WhatsApp do PyTake:

```rust
// Exemplo: Notificar sobre nova mensagem WhatsApp
let whatsapp_event = WebhookEvent::new(
    tenant_id,
    "whatsapp.message.received".to_string(),
    json!({
        "message_id": message.id,
        "from": message.from,
        "body": message.body,
        "timestamp": message.timestamp,
        "instance": instance_name
    }),
)
.with_severity(EventSeverity::Medium)
.with_context("instance".to_string(), instance_name)
.with_context("platform".to_string(), "whatsapp".to_string());

webhook_manager.send_event(whatsapp_event).await?;
```

## Considerações de Produção

### Segurança
- ✅ Use HTTPS sempre
- ✅ Mantenha secret keys seguras
- ✅ Implemente rate limiting no destino
- ✅ Valide sempre as assinaturas

### Monitoramento
- ✅ Configure alertas para métricas
- ✅ Monitore dead letter queue
- ✅ Acompanhe tempo de resposta
- ✅ Configure logs estruturados

### Escalabilidade
- ✅ Configure timeouts adequados
- ✅ Ajuste políticas de retry por caso de uso
- ✅ Monitore uso de memória
- ✅ Implemente circuit breakers se necessário

## Conclusão

O sistema de webhooks do PyTake API é uma solução completa e production-ready que atende todos os requisitos de um sistema moderno de webhooks. Com retry automático, segurança robusta e monitoramento detalhado, ele garante a entrega confiável de eventos mesmo em cenários adversos.