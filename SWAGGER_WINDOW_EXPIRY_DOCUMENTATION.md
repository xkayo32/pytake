# Documentação Swagger - Sistema de Window Expiry

## 📋 Resumo das Atualizações

Este documento descreve todas as atualizações feitas no Swagger/OpenAPI para documentar o sistema configurável de janela de 24h do WhatsApp e timeout de inatividade.

---

## 🆕 Novos Schemas Pydantic

### 1. WindowExpirySettings (`app/schemas/chatbot.py`)

Schema para configuração de janela de 24h do WhatsApp:

```python
{
  "action": "transfer" | "send_template" | "wait_customer",
  "template_name": "string (opcional)",
  "send_warning": boolean,
  "warning_at_hours": 1-23,
  "warning_template_name": "string (opcional)"
}
```

**Campos:**
- `action`: Ação quando janela expirar
  - `transfer`: Transfere para agente humano silenciosamente
  - `send_template`: Envia template aprovado + transfere para humano
  - `wait_customer`: Apenas finaliza fluxo, aguarda cliente reabrir janela

- `template_name`: Nome do template aprovado pela Meta (obrigatório se action='send_template')
- `send_warning`: Se deve enviar aviso antes de expirar
- `warning_at_hours`: Horas antes do vencimento para enviar aviso (1-23)
- `warning_template_name`: Template para aviso de vencimento

**Exemplo:**
```json
{
  "action": "send_template",
  "template_name": "janela_expirada",
  "send_warning": true,
  "warning_at_hours": 22,
  "warning_template_name": "aviso_janela_expirando"
}
```

---

### 2. InactivitySettings (`app/schemas/chatbot.py`)

Schema para configuração de timeout de inatividade:

```python
{
  "enabled": boolean,
  "timeout_minutes": number,
  "send_warning_at_minutes": number (opcional),
  "warning_message": "string (opcional)",
  "action": "transfer" | "close" | "send_reminder" | "fallback_flow",
  "fallback_flow_id": "UUID (opcional)"
}
```

**Campos:**
- `enabled`: Habilitar timeout de inatividade
- `timeout_minutes`: Minutos de inatividade antes de tomar ação
- `send_warning_at_minutes`: Minutos antes do timeout para enviar aviso
- `warning_message`: Mensagem de aviso de inatividade
- `action`: Ação quando timeout
  - `transfer`: Transfere para agente humano
  - `close`: Fecha a conversa
  - `send_reminder`: Envia mensagem lembrando usuário
  - `fallback_flow`: Redireciona para fluxo de fallback
- `fallback_flow_id`: UUID do fluxo de fallback (obrigatório se action='fallback_flow')

**Exemplo:**
```json
{
  "enabled": true,
  "timeout_minutes": 60,
  "send_warning_at_minutes": 50,
  "warning_message": "Você ainda está aí? Posso ajudar em algo mais?",
  "action": "transfer",
  "fallback_flow_id": null
}
```

---

### 3. OrganizationWindowExpirySettings (`app/schemas/organization.py`)

Schema para configuração global de janela 24h (nível organização).

Mesma estrutura de `WindowExpirySettings`, mas aplicada a TODOS os fluxos da organização por padrão.

---

### 4. OrganizationInactivitySettings (`app/schemas/organization.py`)

Schema para configuração global de inatividade (nível organização).

Mesma estrutura de `InactivitySettings`, mas aplicada a TODOS os fluxos da organização por padrão.

---

## 📝 Schemas Atualizados

### FlowBase, FlowCreate, FlowUpdate (`app/schemas/chatbot.py`)

Adicionados campos:

```python
inactivity_settings: Optional[InactivitySettings] = None
window_expiry_settings: Optional[WindowExpirySettings] = None
```

Esses campos permitem **override** das configurações globais da organização para um fluxo específico.

---

### OrganizationSettingsUpdate (`app/schemas/organization.py`)

Adicionados campos:

```python
window_expiry: Optional[OrganizationWindowExpirySettings] = None
inactivity: Optional[OrganizationInactivitySettings] = None
```

**Estrutura completa do settings:**
```json
{
  "window_expiry": {
    "action": "send_template",
    "template_name": "janela_expirada",
    "send_warning": true,
    "warning_at_hours": 22,
    "warning_template_name": "aviso_janela_expirando"
  },
  "inactivity": {
    "enabled": true,
    "timeout_minutes": 60,
    "action": "transfer",
    "send_warning_at_minutes": 50,
    "warning_message": "Você ainda está aí?"
  },
  "timezone": "America/Sao_Paulo",
  "language": "pt-BR",
  "currency": "BRL"
}
```

---

### OrganizationInDB (`app/schemas/organization.py`)

Adicionado campo `settings` com documentação:

```python
settings: Optional[dict] = Field(
    default_factory=dict,
    description=(
        "Configurações flexíveis da organização (JSONB). Campos principais:\n"
        "- window_expiry: Configuração global de janela 24h WhatsApp\n"
        "- inactivity: Configuração global de timeout de inatividade\n"
        "- business_hours: Horário de funcionamento\n"
        "- timezone: Fuso horário\n"
        "- language: Idioma padrão\n"
        "- currency: Moeda padrão"
    )
)
```

---

## 🔗 Endpoints Atualizados

### 1. PUT `/api/v1/organizations/me/settings`

**Documentação atualizada com:**

#### WhatsApp & Flow Settings:
- `window_expiry`: Configuração global de janela 24h WhatsApp
- `inactivity`: Configuração global de timeout de inatividade

#### Exemplo de Request:
```json
{
  "window_expiry": {
    "action": "send_template",
    "template_name": "janela_expirada",
    "send_warning": true,
    "warning_at_hours": 22,
    "warning_template_name": "aviso_janela"
  },
  "inactivity": {
    "enabled": true,
    "timeout_minutes": 60,
    "action": "transfer"
  },
  "timezone": "America/Sao_Paulo",
  "language": "pt-BR"
}
```

---

### 2. POST `/api/v1/flows/`

**Documentação atualizada com:**

#### Configuration Overrides (optional):

**inactivity_settings:**
```json
{
  "enabled": true,
  "timeout_minutes": 60,
  "action": "transfer",
  "send_warning_at_minutes": 50,
  "warning_message": "Você ainda está aí?"
}
```

**window_expiry_settings:**
```json
{
  "action": "send_template",
  "template_name": "janela_expirada",
  "send_warning": true,
  "warning_at_hours": 22,
  "warning_template_name": "aviso_janela"
}
```

**Hierarquia:** Organization settings (global) → Flow settings (override)

---

### 3. PUT `/api/v1/flows/{flow_id}`

**Documentação atualizada com:**

Mesmos campos de configuração do POST, com nota adicional:

**Note:** Setting configuration to `null` removes flow-specific override, falling back to organization defaults.

**Exemplo:**
```json
{
  "window_expiry_settings": null  // Remove override, usa configuração da organização
}
```

---

## 🎯 Como Usar

### Cenário 1: Configurar Comportamento Global (Organização)

**Endpoint:** `PUT /api/v1/organizations/me/settings`

```bash
curl -X PUT "http://localhost:8002/api/v1/organizations/me/settings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "window_expiry": {
      "action": "transfer",
      "template_name": null,
      "send_warning": false
    },
    "inactivity": {
      "enabled": true,
      "timeout_minutes": 60,
      "action": "transfer"
    }
  }'
```

**Efeito:** TODOS os fluxos da organização usarão essas configurações por padrão.

---

### Cenário 2: Override para Fluxo Específico

**Endpoint:** `PUT /api/v1/flows/{flow_id}`

```bash
curl -X PUT "http://localhost:8002/api/v1/flows/$FLOW_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "window_expiry_settings": {
      "action": "send_template",
      "template_name": "janela_expirada_vip",
      "send_warning": true,
      "warning_at_hours": 23,
      "warning_template_name": "aviso_janela_vip"
    }
  }'
```

**Efeito:** Este fluxo específico usará configuração própria, outros fluxos continuam usando a configuração global.

---

### Cenário 3: Remover Override e Voltar ao Padrão

**Endpoint:** `PUT /api/v1/flows/{flow_id}`

```bash
curl -X PUT "http://localhost:8002/api/v1/flows/$FLOW_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "window_expiry_settings": null
  }'
```

**Efeito:** Remove configuração específica do fluxo, volta a usar configuração global da organização.

---

## 📊 Hierarquia de Configurações

```
┌─────────────────────────────────────┐
│   Default Hard-coded (Fallback)    │
│   action: "transfer"                │
│   (se nada estiver configurado)    │
└─────────────────────────────────────┘
              ↓ (override)
┌─────────────────────────────────────┐
│   Organization Settings (Global)    │
│   organization.settings.window_expiry│
│   (configuração padrão da org)      │
└─────────────────────────────────────┘
              ↓ (override)
┌─────────────────────────────────────┐
│   Flow Settings (Específico)        │
│   flow.window_expiry_settings       │
│   (override por fluxo)              │
└─────────────────────────────────────┘
```

**Ordem de prioridade (maior para menor):**
1. Flow-specific settings (flow.window_expiry_settings)
2. Organization settings (organization.settings.window_expiry)
3. Hard-coded defaults (action: "transfer")

---

## 🔍 Como Testar no Swagger UI

### Acessar Swagger:
```
http://localhost:8002/docs
```

### 1. Configurar Organização:

1. Vá para `Organizations` → `PUT /api/v1/organizations/me/settings`
2. Click em "Try it out"
3. Cole o JSON de exemplo:
```json
{
  "window_expiry": {
    "action": "send_template",
    "template_name": "janela_expirada",
    "send_warning": true,
    "warning_at_hours": 22,
    "warning_template_name": "aviso_janela"
  }
}
```
4. Execute

### 2. Criar/Atualizar Fluxo com Override:

1. Vá para `Flow Builder` → `PUT /api/v1/flows/{flow_id}`
2. Click em "Try it out"
3. Digite o flow_id
4. Cole o JSON de exemplo:
```json
{
  "window_expiry_settings": {
    "action": "wait_customer",
    "send_warning": false
  }
}
```
5. Execute

### 3. Verificar Configuração:

1. Vá para `Flow Builder` → `GET /api/v1/flows/{flow_id}`
2. Verifique que o campo `window_expiry_settings` aparece na resposta
3. Vá para `Organizations` → `GET /api/v1/organizations/me`
4. Verifique que o campo `settings.window_expiry` aparece na resposta

---

## ✅ Validações Automáticas

O Pydantic valida automaticamente:

### WindowExpirySettings:
- `action` deve ser: "transfer", "send_template", ou "wait_customer"
- `warning_at_hours` deve estar entre 1 e 23
- `template_name` é obrigatório se `action="send_template"`

### InactivitySettings:
- `action` deve ser: "transfer", "close", "send_reminder", ou "fallback_flow"
- `timeout_minutes` deve ser >= 1
- `fallback_flow_id` é obrigatório se `action="fallback_flow"`

### Erros de Validação:

Se enviar dados inválidos, você receberá:
```json
{
  "detail": [
    {
      "loc": ["body", "window_expiry", "action"],
      "msg": "unexpected value; permitted: 'transfer', 'send_template', 'wait_customer'",
      "type": "value_error.const"
    }
  ]
}
```

---

## 📚 Arquivos Modificados

### Schemas:
1. `backend/app/schemas/chatbot.py` - Adicionado WindowExpirySettings, InactivitySettings, atualizados Flow schemas
2. `backend/app/schemas/organization.py` - Adicionado Organization*Settings, atualizado OrganizationSettingsUpdate

### Endpoints:
1. `backend/app/api/v1/endpoints/organizations.py` - Atualizada documentação de `/me/settings`
2. `backend/app/api/v1/endpoints/flows.py` - Atualizada documentação de POST/PUT flows

### Models:
1. `backend/app/models/chatbot.py` - Adicionado campo `window_expiry_settings` (JSONB)

### Services:
1. `backend/app/services/whatsapp_service.py` - Implementada lógica de merge de configurações

---

## 🎉 Resultado Final

O Swagger agora documenta completamente:

✅ **Schemas detalhados** com tipos, validações e exemplos
✅ **Endpoints documentados** com descrições completas
✅ **Hierarquia de configurações** claramente explicada
✅ **Exemplos de uso** em cada endpoint
✅ **Validações automáticas** via Pydantic
✅ **Tipos literais** para valores permitidos (Literal["transfer", "send_template", "wait_customer"])

Agora qualquer desenvolvedor pode:
- Ver todos os campos disponíveis no Swagger UI
- Entender a hierarquia de configurações
- Testar os endpoints diretamente no Swagger
- Validar automaticamente os dados enviados
- Gerar clientes automaticamente usando o OpenAPI schema

---

**Acesso ao Swagger:**
http://localhost:8002/docs

**Acesso ao OpenAPI Schema:**
http://localhost:8002/openapi.json
