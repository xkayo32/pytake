# 📚 Referência Completa de APIs

**Autor:** Kayo Carvalho Fernandes  
**Data:** Dezembro de 2025  
**Versão:** 1.0  
**Total de Endpoints:** 217+

---

## 🎯 Guia de Uso

### Authentication

```bash
# 1. Login e obter token
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "secure_password"
  }'

# Resposta:
# {
#   "access_token": "eyJhbGc...",
#   "token_type": "bearer",
#   "expires_in": 900
# }

# 2. Usar token em requisições
curl -X GET http://localhost:8000/api/v1/templates \
  -H "Authorization: Bearer eyJhbGc..."
```

### Padrões de Resposta

```json
// ✅ Sucesso (2xx)
{
  "data": { ... },
  "message": "Success"
}

// ❌ Erro (4xx/5xx)
{
  "detail": "Error message",
  "error_code": "RESOURCE_NOT_FOUND",
  "status_code": 404
}
```

---

## 📋 Endpoints - Templates

### 1. Listar Templates

```http
GET /api/v1/templates
```

**Query Parameters:**
```
skip=0              (integer, default: 0)
limit=50            (integer, default: 50, max: 100)
category=MARKETING  (string, optional)
status=APPROVED     (string, optional: APPROVED, PAUSED, DISABLED)
search=hello        (string, optional - busca por nome)
```

**Response (200 OK):**
```json
{
  "items": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "welcome_message",
      "language": "pt_BR",
      "category": "MARKETING",
      "status": "APPROVED",
      "quality_score": 85,
      "parameter_format": "NAMED",
      "body": "Bem-vindo {{name}}!",
      "header_type": "TEXT",
      "footer_text": "Powered by PyTake",
      "allow_category_change": false,
      "created_at": "2025-12-16T10:00:00Z",
      "updated_at": "2025-12-16T10:00:00Z"
    }
  ],
  "total": 42,
  "skip": 0,
  "limit": 50
}
```

**Error (401 Unauthorized):**
```json
{
  "detail": "Not authenticated",
  "status_code": 401
}
```

### 2. Obter Template por ID

```http
GET /api/v1/templates/{template_id}
```

**Path Parameters:**
```
template_id: UUID (required)
```

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "welcome_message",
  "language": "pt_BR",
  "category": "MARKETING",
  "status": "APPROVED",
  "quality_score": 85,
  "parameter_format": "NAMED",
  "body": "Bem-vindo {{name}}!",
  "named_variables": ["name"],
  "created_at": "2025-12-16T10:00:00Z",
  "updated_at": "2025-12-16T10:00:00Z"
}
```

### 3. Criar Template

```http
POST /api/v1/templates
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "welcome_message",
  "language": "pt_BR",
  "category": "MARKETING",
  "body": "Bem-vindo {{name}}!",
  "header_type": "TEXT",
  "header_text": "Bem-vindo",
  "footer_text": "Powered by PyTake",
  "allow_category_change": false
}
```

**Response (201 Created):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "welcome_message",
  "status": "PENDING_APPROVAL",
  "parameter_format": "NAMED",
  "named_variables": ["name"],
  "created_at": "2025-12-16T10:00:00Z"
}
```

**Error (409 Conflict):**
```json
{
  "detail": "Template com este nome já existe nesta organização",
  "error_code": "DUPLICATE_TEMPLATE",
  "status_code": 409
}
```

### 4. Atualizar Template

```http
PUT /api/v1/templates/{template_id}
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "welcome_message_v2",
  "body": "Bem-vindo {{name}}! Aproveite {{discount}}% de desconto.",
  "allow_category_change": true
}
```

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "welcome_message_v2",
  "updated_at": "2025-12-16T11:00:00Z"
}
```

### 5. Deletar Template (Soft Delete)

```http
DELETE /api/v1/templates/{template_id}
```

**Response (204 No Content):**
```
(sem body)
```

---

## 📊 Endpoints - Analytics

### 1. Obter Métricas de Template

```http
GET /api/v1/template-analytics/metrics/{template_id}
```

**Query Parameters:**
```
days=30              (integer, 1-365, default: 30)
include_trends=true  (boolean, default: true)
```

**Response (200 OK):**
```json
{
  "template_id": "550e8400-e29b-41d4-a716-446655440000",
  "period_days": 30,
  "metrics": {
    "total_sent": 5000,
    "total_delivered": 4950,
    "total_read": 3500,
    "delivery_rate": 0.99,
    "read_rate": 0.70,
    "success_rate": 0.78,
    "avg_response_time_seconds": 240
  },
  "by_category": {
    "MARKETING": {
      "sent": 3000,
      "delivered": 2970,
      "rate": 0.99
    },
    "TRANSACTIONAL": {
      "sent": 2000,
      "delivered": 1980,
      "rate": 0.99
    }
  },
  "trends": {
    "trend_type": "INCREASING",
    "daily_growth_rate": 0.05,
    "weekly_average": 714
  },
  "generated_at": "2025-12-16T14:00:00Z"
}
```

### 2. Dashboard da Organização

```http
GET /api/v1/template-analytics/dashboard
```

**Query Parameters:**
```
days=30              (integer, 1-365, default: 30)
category=MARKETING   (string, optional)
```

**Response (200 OK):**
```json
{
  "organization_id": "org-123",
  "period_days": 30,
  "summary": {
    "total_templates": 42,
    "active_templates": 38,
    "paused_templates": 2,
    "disabled_templates": 2,
    "total_sent": 50000,
    "avg_success_rate": 0.76,
    "total_cost_usd": 850.00
  },
  "by_category": [
    {
      "category": "MARKETING",
      "template_count": 25,
      "sent": 30000,
      "success_rate": 0.75,
      "cost_usd": 525.00
    },
    {
      "category": "TRANSACTIONAL",
      "template_count": 12,
      "sent": 18000,
      "success_rate": 0.78,
      "cost_usd": 315.00
    }
  ],
  "by_template": [
    {
      "template_id": "550e8400-...",
      "template_name": "welcome_message",
      "sent": 5000,
      "delivered": 4950,
      "read": 3500,
      "success_rate": 0.78,
      "cost_usd": 87.50
    }
  ]
}
```

### 3. Comparar Templates

```http
GET /api/v1/template-analytics/compare
```

**Query Parameters:**
```
template_ids=uuid1,uuid2,uuid3  (string, required - comma-separated)
days=30                         (integer, 1-365, default: 30)
```

**Response (200 OK):**
```json
{
  "comparison": [
    {
      "template_id": "550e8400-e29b-41d4-a716-446655440000",
      "template_name": "welcome_message",
      "sent": 5000,
      "delivered": 4950,
      "read": 3500,
      "success_rate": 0.78,
      "rank": 1
    },
    {
      "template_id": "660e8400-e29b-41d4-a716-446655440001",
      "template_name": "order_status",
      "sent": 3000,
      "delivered": 2850,
      "read": 1500,
      "success_rate": 0.63,
      "rank": 2
    }
  ],
  "best_performer": {
    "template_id": "550e8400-e29b-41d4-a716-446655440000",
    "success_rate": 0.78
  }
}
```

---

## 💰 Endpoints - Expenses

### 1. Dashboard de Despesas

```http
GET /api/v1/expenses/organization
```

**Query Parameters:**
```
days=30              (integer, 1-365, default: 30)
category=MARKETING   (string, optional)
```

**Response (200 OK):**
```json
{
  "organization_id": "org-123",
  "period_days": 30,
  "summary": {
    "total_cost_usd": 1250.50,
    "avg_cost_per_message": 0.025,
    "cost_vs_limit": {
      "limit_usd": 5000.00,
      "used_percentage": 25.01,
      "status": "WITHIN_LIMITS"
    }
  },
  "by_category": [
    {
      "category": "MARKETING",
      "cost_usd": 750.00,
      "percentage": 60.0,
      "message_count": 30000
    },
    {
      "category": "TRANSACTIONAL",
      "cost_usd": 500.50,
      "percentage": 40.0,
      "message_count": 20000
    }
  ],
  "by_template": [
    {
      "template_id": "550e8400-...",
      "template_name": "welcome_message",
      "cost_usd": 125.00,
      "percentage": 10.0,
      "message_count": 5000
    }
  ]
}
```

### 2. Histórico de Despesas por Template

```http
GET /api/v1/expenses/templates/{template_id}
```

**Query Parameters:**
```
days=90              (integer, 1-365, default: 90)
```

**Response (200 OK):**
```json
{
  "template_id": "550e8400-e29b-41d4-a716-446655440000",
  "template_name": "welcome_message",
  "period_days": 90,
  "total_cost_usd": 375.00,
  "cost_per_message": 0.025,
  "weekly_breakdown": [
    {
      "week": 1,
      "start_date": "2025-09-16",
      "end_date": "2025-09-22",
      "cost_usd": 50.00,
      "message_count": 2000
    },
    {
      "week": 2,
      "start_date": "2025-09-23",
      "end_date": "2025-09-29",
      "cost_usd": 52.50,
      "message_count": 2100
    }
  ],
  "trends": {
    "trend_type": "INCREASING",
    "percentage_change": 12.5,
    "forecast_next_week": 62.50
  }
}
```

### 3. Sugestões de Otimização

```http
GET /api/v1/expenses/optimization
```

**Response (200 OK):**
```json
{
  "suggestion_count": 3,
  "organization_id": "org-123",
  "suggestions": [
    {
      "template_id": "550e8400-...",
      "template_name": "old_welcome",
      "type": "LOW_SUCCESS_RATE",
      "priority": "HIGH",
      "rationale": "Template tem taxa de sucesso de 40%, abaixo da média de 75%",
      "estimated_saving_usd": 125.00,
      "action": "Considere atualizar template ou pausar temporariamente"
    },
    {
      "template_id": "660e8400-...",
      "template_name": "newsletter",
      "type": "EXPENSIVE_CATEGORY",
      "priority": "MEDIUM",
      "rationale": "Categoria MARKETING é 40% mais cara que TRANSACTIONAL",
      "estimated_saving_usd": 200.00,
      "action": "Considere consolidar templates ou reclassificar categoria"
    }
  ]
}
```

### 4. Verificar Limites de Custo

```http
POST /api/v1/expenses/alerts/check
```

**Query Parameters:**
```
month=12             (integer, 1-12, optional - default: mês atual)
year=2025            (integer, optional - default: ano atual)
```

**Response (200 OK):**
```json
{
  "organization_id": "org-123",
  "period": {
    "month": 12,
    "year": 2025
  },
  "cost_limit_status": {
    "monthly_limit_usd": 5000.00,
    "current_cost_usd": 1250.50,
    "used_percentage": 25.01,
    "status": "WITHIN_LIMITS",
    "alert_threshold_percentage": 80.0
  },
  "alerts": [
    {
      "alert_type": "THRESHOLD_EXCEEDED",
      "message": "Atenção: Gastos atingiram 80% do limite mensal",
      "created_at": "2025-12-16T14:00:00Z",
      "is_acknowledged": false
    }
  ]
}
```

**Error (404 Not Found):**
```json
{
  "detail": "Nenhum limite de custo configurado para esta organização",
  "error_code": "NO_COST_LIMIT",
  "status_code": 404
}
```

---

## 🔔 Endpoints - Webhooks

### 1. Webhook Meta Cloud API

```http
POST /api/webhooks/meta
Content-Type: application/json
X-Hub-Signature-256: sha256=...
```

**Meta envia (automatically):**
```json
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "123456789",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "meta_data": {
              "display_phone_number": "5511987654321",
              "phone_number_id": "123456789"
            },
            "messages": [
              {
                "from": "551199999999",
                "id": "wamid.123...",
                "timestamp": "1671234567",
                "text": {
                  "body": "User message"
                },
                "type": "text"
              }
            ],
            "message_template_status_update": {
              "message_template_id": 123456789,
              "event": "APPROVED",
              "message_template_language_code": "pt_BR"
            }
          },
          "field": "messages"
        }
      ]
    }
  ]
}
```

**PyTake Response (200 OK):**
```
(empty body)
```

---

## ⚙️ Endpoints - Configurações

### 1. Definir Limite de Custo

```http
POST /api/v1/settings/cost-limit
Content-Type: application/json
```

**Request Body:**
```json
{
  "monthly_limit_usd": 5000.00,
  "alert_threshold_percentage": 80.0,
  "is_active": true
}
```

**Response (201 Created):**
```json
{
  "id": "limit-123",
  "organization_id": "org-123",
  "monthly_limit_usd": 5000.00,
  "alert_threshold_percentage": 80.0,
  "is_active": true,
  "created_at": "2025-12-16T10:00:00Z"
}
```

### 2. Obter Configurações da Organização

```http
GET /api/v1/settings/organization
```

**Response (200 OK):**
```json
{
  "organization_id": "org-123",
  "cost_limit": {
    "monthly_limit_usd": 5000.00,
    "alert_threshold_percentage": 80.0,
    "is_active": true
  },
  "webhook_url": "https://example.com/webhook",
  "webhook_verify_token": "token_123",
  "auto_pause_on_limit_exceeded": true
}
```

---

## 🧪 Exemplos de Código

### Python (usando httpx)

```python
import httpx
import asyncio

async def main():
    # 1. Login
    async with httpx.AsyncClient(base_url="http://localhost:8000") as client:
        login_response = await client.post(
            "/api/v1/auth/login",
            json={
                "email": "user@example.com",
                "password": "password123"
            }
        )
        token = login_response.json()["access_token"]
        
        # 2. Listar templates
        headers = {"Authorization": f"Bearer {token}"}
        templates = await client.get(
            "/api/v1/templates?limit=10",
            headers=headers
        )
        print(templates.json())
        
        # 3. Obter analytics
        analytics = await client.get(
            "/api/v1/template-analytics/dashboard?days=30",
            headers=headers
        )
        print(analytics.json())

asyncio.run(main())
```

### JavaScript (usando fetch)

```javascript
// 1. Login
const loginResponse = await fetch('http://localhost:8000/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123'
  })
});

const { access_token } = await loginResponse.json();

// 2. Listar templates
const templatesResponse = await fetch(
  'http://localhost:8000/api/v1/templates?limit=10',
  { headers: { 'Authorization': `Bearer ${access_token}` } }
);

const templates = await templatesResponse.json();
console.log(templates);
```

### cURL

```bash
# Login
RESPONSE=$(curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}')

TOKEN=$(echo $RESPONSE | jq -r '.access_token')

# Listar templates
curl -X GET http://localhost:8000/api/v1/templates?limit=10 \
  -H "Authorization: Bearer $TOKEN"

# Analytics
curl -X GET http://localhost:8000/api/v1/template-analytics/dashboard \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📋 Status Codes

| Código | Significado | Causa Comum |
|--------|-------------|-----------|
| **200** | OK | Request sucedido |
| **201** | Created | Recurso criado com sucesso |
| **204** | No Content | Sucesso sem resposta (DELETE) |
| **400** | Bad Request | Entrada inválida |
| **401** | Unauthorized | Token ausente/inválido |
| **403** | Forbidden | Sem permissão para recurso |
| **404** | Not Found | Recurso não existe |
| **409** | Conflict | Recurso já existe |
| **422** | Unprocessable Entity | Validação falhou |
| **429** | Too Many Requests | Rate limit excedido |
| **500** | Internal Server Error | Erro no servidor |
| **503** | Service Unavailable | Serviço temporariamente indisponível |

---

**Última atualização:** 16 Dezembro 2025  
**Versão:** 1.0  
**Total de Endpoints Documentados:** 217+
