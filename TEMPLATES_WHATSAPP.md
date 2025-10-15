# WhatsApp Templates - Implementação Completa ✅

**Data**: 2025-10-10
**Status**: 100% CONCLUÍDO
**Tempo total**: 2 horas

---

## 🎯 OBJETIVO

Permitir que agentes enviem **mensagens template** para reengajar clientes quando a janela de 24 horas do WhatsApp expirar.

### O que são Templates?

Templates são mensagens pré-aprovadas pela Meta que podem ser enviadas **fora da janela de 24h**. São necessárias quando:
- O cliente não enviou mensagem nas últimas 24h
- O agente quer iniciar uma nova conversa
- Campanhas de marketing ou notificações

---

## ✅ IMPLEMENTAÇÃO

### 1. Backend - Listar Templates

**Arquivo**: `backend/app/integrations/meta_api.py`

```python
async def list_templates(
    self,
    waba_id: str,
    status: str = "APPROVED",
    limit: int = 100
) -> List[Dict[str, Any]]:
    """
    Lista templates do WhatsApp Business Account

    GET https://graph.facebook.com/v18.0/{waba_id}/message_templates
    """
```

**Endpoint**: `GET /api/v1/whatsapp/{number_id}/templates?status=APPROVED`

**Resposta**:
```json
[
  {
    "id": "123456",
    "name": "welcome_message",
    "language": "pt_BR",
    "status": "APPROVED",
    "category": "UTILITY",
    "components": [
      {
        "type": "BODY",
        "text": "Olá {{1}}! Bem-vindo à {{2}}."
      },
      {
        "type": "FOOTER",
        "text": "Responda para começar"
      }
    ]
  }
]
```

---

### 2. Frontend - Modal de Seleção

**Arquivo**: `frontend/src/components/chat/TemplateModal.tsx`

**Funcionalidades**:
- ✅ Lista templates aprovados do número WhatsApp
- ✅ Extrai variáveis do template ({{1}}, {{2}}, etc.)
- ✅ Formulário dinâmico para preencher variáveis
- ✅ Preview em tempo real com substituição de variáveis
- ✅ Envio via API de conversações

**Exemplo de Template**:
```
BODY: "Olá {{1}}! Seu pedido {{2}} está pronto."

Variáveis extraídas:
- Variável 1: "João"
- Variável 2: "#12345"

Preview:
"Olá João! Seu pedido #12345 está pronto."
```

---

### 3. Integração no Chat

**Arquivo**: `frontend/src/app/admin/conversations/[id]/page.tsx`

**Comportamento**:
- Quando `window_expires_at < now`: Mostra aviso amarelo + botão "Enviar Template"
- Quando `window_expires_at > now`: Mostra aviso verde com tempo restante
- Input de mensagem desabilitado quando janela expirada
- Botão "Enviar Template" abre o modal

**Interface**:
```
┌─────────────────────────────────────────────────┐
│ ⚠️ Janela de 24h expirada.              [Enviar Template] │
└─────────────────────────────────────────────────┘
```

---

### 4. Envio de Template

**Request Frontend → Backend**:
```typescript
await conversationsAPI.sendMessage(conversationId, {
  message_type: 'template',
  content: {
    name: 'welcome_message',
    language: 'pt_BR',
    components: [{
      type: 'body',
      parameters: [
        { type: 'text', text: 'João' },
        { type: 'text', text: 'PyTake' }
      ]
    }]
  }
});
```

**Backend → Meta API**:
```python
await meta_api.send_template_message(
    to="5511999999999",
    template_name="welcome_message",
    language_code="pt_BR",
    components=[{
        "type": "body",
        "parameters": [
            {"type": "text", "text": "João"},
            {"type": "text", "text": "PyTake"}
        ]
    }]
)
```

**Meta API Response**:
```json
{
  "messaging_product": "whatsapp",
  "messages": [{
    "id": "wamid.HBgLNTUxMTk5OTk5OTk5ORUCABIYFjNFQjBDMDg1QjU4RjREMEE5RTNCAAa="
  }]
}
```

---

## 📁 ARQUIVOS MODIFICADOS/CRIADOS

### Backend
| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `app/integrations/meta_api.py` | ✏️ Modificado | Adicionado `list_templates()` |
| `app/api/v1/endpoints/whatsapp.py` | ✏️ Modificado | Endpoint `/templates` |
| `app/services/whatsapp_service.py` | ✅ Existente | Já suportava `send_template` |

**Linhas adicionadas**: ~100 linhas

### Frontend
| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/components/chat/TemplateModal.tsx` | ✅ Criado | Modal completo (317 linhas) |
| `src/app/admin/conversations/[id]/page.tsx` | ✏️ Modificado | Integração do modal |
| `src/lib/api.ts` | ✏️ Modificado | `whatsappAPI.listTemplates()` |

**Linhas adicionadas**: ~350 linhas

---

## 🧪 COMO TESTAR

### Pré-requisitos

1. **Número WhatsApp configurado** (tipo Official API)
2. **WABA ID** configurado no número
3. **Templates aprovados** na Meta Business Manager

### Passo a Passo

**1. Acesse o sistema**
```
http://localhost:3002/login
Login: admin@pytake.com
Senha: Admin123
```

**2. Abra uma conversa com janela expirada**
- Vá para "Conversas" no menu
- Selecione uma conversa onde `window_expires_at` já passou
- Você verá: "⚠️ Janela de 24h expirada" + botão "Enviar Template"

**3. Clique em "Enviar Template"**
- Modal abre com lista de templates aprovados
- Selecione um template

**4. Preencha as variáveis** (se houver)
- Campos aparecem automaticamente para {{1}}, {{2}}, etc.
- Preview mostra em tempo real como ficará a mensagem

**5. Envie o template**
- Clique em "Enviar Template"
- Modal fecha
- Mensagem aparece no chat
- Cliente recebe no WhatsApp

---

## 🔍 VALIDAÇÃO BACKEND

### Verificar janela de 24h

O backend valida automaticamente:

```python
# whatsapp_service.py linha 705-720
is_within_window = (
    conversation.window_expires_at and
    now < conversation.window_expires_at
)

if not is_within_window and message_type != "template":
    raise ValueError(
        "24-hour window expired. You must use a template message to re-engage."
    )
```

**Comportamento**:
- ✅ **Dentro da janela**: Permite text, image, document
- ⚠️ **Fora da janela**: Só permite template
- ❌ **Erro 400**: Se tentar enviar text quando janela expirada

---

## 📊 ESTRUTURA DE TEMPLATES

### Componentes Meta API

| Tipo | Descrição | Suporta Variáveis |
|------|-----------|-------------------|
| **HEADER** | Título da mensagem | ✅ (texto, imagem, documento) |
| **BODY** | Corpo principal | ✅ ({{1}}, {{2}}, ...) |
| **FOOTER** | Rodapé (texto pequeno) | ❌ |
| **BUTTONS** | Botões de ação | ❌ |

### Exemplo Completo

**Template "order_ready"**:
```json
{
  "name": "order_ready",
  "language": "pt_BR",
  "components": [
    {
      "type": "HEADER",
      "format": "TEXT",
      "text": "Pedido Pronto! 🎉"
    },
    {
      "type": "BODY",
      "text": "Olá {{1}}!\n\nSeu pedido {{2}} está pronto para retirada.\n\nEndereço: {{3}}"
    },
    {
      "type": "FOOTER",
      "text": "Responda para confirmar"
    },
    {
      "type": "BUTTONS",
      "buttons": [
        {"type": "QUICK_REPLY", "text": "Confirmar"},
        {"type": "QUICK_REPLY", "text": "Reagendar"}
      ]
    }
  ]
}
```

**Variáveis necessárias**:
1. Nome do cliente: "João"
2. Número do pedido: "#12345"
3. Endereço: "Rua ABC, 123"

**Payload enviado**:
```json
{
  "message_type": "template",
  "content": {
    "name": "order_ready",
    "language": "pt_BR",
    "components": [{
      "type": "body",
      "parameters": [
        {"type": "text", "text": "João"},
        {"type": "text", "text": "#12345"},
        {"type": "text", "text": "Rua ABC, 123"}
      ]
    }]
  }
}
```

---

## 🚨 ERROS COMUNS

### 1. Template Não Encontrado
**Erro**: `Meta API error: Template not found`

**Causas**:
- Template não aprovado pela Meta
- Nome do template incorreto
- Linguagem incorreta (pt_BR vs en_US)

**Solução**:
- Verificar templates aprovados em Meta Business Manager
- Usar o nome exato retornado pela API de listagem

---

### 2. Número de Variáveis Incorreto
**Erro**: `Invalid parameter count`

**Causa**: Template tem 3 variáveis mas só foram enviadas 2

**Solução**: Preencher TODAS as variáveis do template

---

### 3. WABA ID Não Configurado
**Erro**: `WhatsApp Business Account ID not configured`

**Causa**: Número WhatsApp não tem `whatsapp_business_account_id`

**Solução**:
1. Acesse Meta Business Manager
2. Copie o WABA ID
3. Configure no número WhatsApp do PyTake

---

### 4. Janela Não Expirada
**Erro**: Template enviado mas não era necessário

**Comportamento**: Meta aceita template mesmo dentro da janela

**Recomendação**: Só use templates quando realmente necessário (janela expirada), pois:
- Templates contam como "business-initiated conversation" (pode ser cobrado)
- Mensagens normais são mais flexíveis

---

## 🎨 INTERFACE DO USUÁRIO

### Modal de Templates

```
┌─────────────────────────────────────────────────────────────┐
│  Selecionar Template                                    [X] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────┐  ┌────────────────────────────────┐  │
│  │ Templates        │  │ Preview & Variáveis            │  │
│  │ Aprovados        │  │                                │  │
│  ├──────────────────┤  │  Variável 1                    │  │
│  │ ▸ welcome_msg    │  │  ┌──────────────────────────┐  │  │
│  │   UTILITY • pt_BR│  │  │ João                     │  │  │
│  │                  │  │  └──────────────────────────┘  │  │
│  │ ▸ order_ready    │  │                                │  │
│  │   UTILITY • pt_BR│  │  Variável 2                    │  │
│  │                  │  │  ┌──────────────────────────┐  │  │
│  │ ✓ goodbye        │  │  │ #12345                   │  │  │
│  │   MARKETING • pt │  │  └──────────────────────────┘  │  │
│  └──────────────────┘  │                                │  │
│                        │  ┌──────────────────────────┐  │  │
│                        │  │ PREVIEW                  │  │  │
│                        │  │ Olá João!               │  │  │
│                        │  │ Seu pedido #12345 está  │  │  │
│                        │  │ pronto.                 │  │  │
│                        │  └──────────────────────────┘  │  │
│                        └────────────────────────────────┘  │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                              [Cancelar] [Enviar Template]  │
└─────────────────────────────────────────────────────────────┘
```

---

## 📈 PRÓXIMOS PASSOS (OPCIONAIS)

### 1. Cache de Templates
**Objetivo**: Reduzir chamadas à Meta API

**Implementação**:
```python
# Redis cache
templates_key = f"templates:{waba_id}"
cached = await redis.get(templates_key)
if cached:
    return json.loads(cached)

templates = await meta_api.list_templates(waba_id)
await redis.set(templates_key, json.dumps(templates), ex=3600)  # 1h TTL
```

---

### 2. Template Favoritos
**Objetivo**: Salvar templates mais usados

**Tabela**:
```sql
CREATE TABLE template_favorites (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL,
    template_id VARCHAR(255),
    template_name VARCHAR(255),
    language VARCHAR(10),
    sort_order INTEGER
);
```

---

### 3. Histórico de Templates
**Objetivo**: Ver quais templates foram enviados

**Query MongoDB**:
```javascript
db.messages.find({
  message_type: "template",
  organization_id: "...",
  created_at: { $gte: ISODate("2025-10-01") }
})
```

---

### 4. Suporte a Header Media
**Objetivo**: Templates com imagem/vídeo/documento no cabeçalho

**Payload**:
```json
{
  "type": "template",
  "template": {
    "components": [
      {
        "type": "header",
        "parameters": [{
          "type": "image",
          "image": {
            "link": "https://example.com/image.jpg"
          }
        }]
      },
      {
        "type": "body",
        "parameters": [...]
      }
    ]
  }
}
```

---

## 🏆 CONQUISTAS

✅ **Endpoint de listagem** - Busca templates da Meta API
✅ **Modal completo** - Lista, preview e envio
✅ **Extração de variáveis** - Regex automático
✅ **Preview dinâmico** - Substituição em tempo real
✅ **Validação de janela** - Backend valida 24h
✅ **Integração no chat** - Botão quando janela expirada
✅ **Envio completo** - Backend → Meta API
✅ **Documentação** - Guia completo de uso

---

## 📞 SUPORTE

### Problemas?

1. **Templates não aparecem**: Verifique se o WABA ID está correto
2. **Erro ao enviar**: Verifique logs do backend (`docker logs pytake-backend`)
3. **Modal não abre**: Verifique se `whatsapp_number_id` está disponível na conversation

### Logs Úteis

```bash
# Backend
docker logs pytake-backend -f | grep -i template

# Meta API
# Veja em Meta Business Manager > Configurações > WhatsApp > Qualidade
```

---

**Última atualização**: 2025-10-10
**Autor**: Claude Code
**Versão**: 1.0.0 (Templates Complete)
**Projeto**: PyTake - WhatsApp Automation Platform
