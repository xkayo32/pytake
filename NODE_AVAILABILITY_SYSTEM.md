# Sistema de Disponibilidade de Nodes por Tipo de Conexão WhatsApp

**Data:** 2025-10-15
**Status:** ✅ Implementado

---

## 📋 Visão Geral

Sistema que gerencia quais nodes do chatbot estão disponíveis baseado no **tipo de conexão WhatsApp** (Official API vs Evolution API).

**Problema resolvido:**
- WhatsApp Template Node requer Meta Cloud API oficial (não funciona com Evolution API)
- Interactive Buttons e List Nodes são experimentais na Evolution API (usam Baileys)
- Necessário desabilitar/alertar sobre nodes incompatíveis no chatbot builder

---

## 🏗️ Arquitetura

### Backend

#### 1. **NodeAvailability Helper** (`backend/app/utils/node_availability.py`)

Classe centralizada que gerencia disponibilidade de nodes:

```python
from app.utils.node_availability import NodeAvailability

# Obter nodes disponíveis para um tipo de conexão
available = NodeAvailability.get_available_nodes("official")
# ['start', 'message', ..., 'whatsapp_template', ...]

available = NodeAvailability.get_available_nodes("qrcode")
# ['start', 'message', ..., 'interactive_buttons', ...]
# (sem 'whatsapp_template')

# Checar se node específico está disponível
is_available = NodeAvailability.is_node_available("whatsapp_template", "qrcode")
# False

# Obter metadados completos
metadata = NodeAvailability.get_node_metadata("qrcode")
# {
#   "whatsapp_template": {
#     "available": False,
#     "status": "unavailable",
#     "warning": "Este node não está disponível para conexões Evolution API",
#     "connection_type": "qrcode"
#   },
#   "interactive_buttons": {
#     "available": True,
#     "status": "experimental",
#     "warning": "Este node é experimental na Evolution API. Funcionalidade pode ser limitada.",
#     "connection_type": "qrcode"
#   }
# }
```

**Classificação de Nodes:**

- **UNIVERSAL_NODES** - Funcionam em ambos os tipos:
  - start, message, question, condition, end
  - handoff, delay, jump, action
  - api_call, ai_prompt, database_query, script

- **OFFICIAL_ONLY_NODES** - Exclusivos para Meta Cloud API:
  - ❌ **whatsapp_template** (requer aprovação Meta)

- **EXPERIMENTAL_NODES** - Funcionam mas são experimentais na Evolution API:
  - ⚠️ **interactive_buttons** (via Baileys, não-oficial)
  - ⚠️ **interactive_list** (via Baileys, não-oficial)

#### 2. **Schema WhatsAppNumber** (`backend/app/schemas/whatsapp.py`)

Adiciona campos calculados no response schema:

```python
class WhatsAppNumber(WhatsAppNumberInDB):
    """Public WhatsApp number schema"""
    available_node_types: List[str] = Field(default_factory=list)
    node_metadata: Optional[Dict] = Field(default_factory=dict)
```

#### 3. **WhatsAppService** (`backend/app/services/whatsapp_service.py`)

**a) Enriquecimento de Response:**

```python
def _enrich_number_with_node_info(
    self,
    number: WhatsAppNumber
) -> WhatsAppNumber:
    """Enrich WhatsApp number with available node types and metadata."""
    connection_type = number.connection_type.value if hasattr(number.connection_type, 'value') else str(number.connection_type)

    # Get available nodes for this connection type
    available_nodes = NodeAvailability.get_available_nodes(connection_type)
    node_metadata = NodeAvailability.get_node_metadata(connection_type)

    # Add to model
    number.available_node_types = available_nodes
    number.node_metadata = node_metadata

    return number
```

Usado em todos os métodos que retornam WhatsAppNumber:
- `get_by_id()` → enriquece antes de retornar
- `list_numbers()` → enriquece cada número da lista
- `create_number()` → enriquece após criar
- `update_number()` → enriquece após atualizar

**b) Validação em Runtime:**

```python
async def _execute_node(self, conversation, node, flow, incoming_message):
    """Executa um node do fluxo e envia mensagem via WhatsApp."""
    logger.info(f"🎬 Executando node {node.node_type}: {node.label}")

    # Validar compatibilidade do node com o tipo de conexão WhatsApp
    whatsapp_number = await self.repo.get(conversation.whatsapp_number_id)
    if whatsapp_number:
        connection_type = whatsapp_number.connection_type.value if hasattr(whatsapp_number.connection_type, 'value') else str(whatsapp_number.connection_type)
        is_available = NodeAvailability.is_node_available(node.node_type, connection_type)

        if not is_available:
            logger.error(
                f"❌ Node '{node.node_type}' não está disponível para conexão '{connection_type}'. "
                f"Este node requer Meta Cloud API (official)."
            )
            # Transferir para agente humano
            await self._execute_handoff(
                conversation,
                {
                    "transferMessage": (
                        "Desculpe, esta funcionalidade não está disponível "
                        "no momento. Vou transferir você para um agente humano."
                    ),
                    "sendTransferMessage": True,
                    "priority": "high"
                }
            )
            return

        # Log warning for experimental nodes
        warning = NodeAvailability.get_node_warning(node.node_type, connection_type)
        if warning:
            logger.warning(f"⚠️ {warning}")

    # Continuar execução normal...
```

---

### Frontend

#### 1. **Helper de Disponibilidade** (`frontend/src/lib/nodeAvailability.ts`)

Funções utilitárias para gerenciar disponibilidade no frontend:

```typescript
import {
  isNodeAvailable,
  getNodeStatus,
  getNodeWarning,
  filterAvailableNodes,
  getExperimentalNodes,
  getUnavailableNodes
} from '@/lib/nodeAvailability';

// Exemplo de uso:
const availabilityInfo = whatsappNumber.node_metadata;

// Checar se node está disponível
if (isNodeAvailable('whatsapp_template', availabilityInfo)) {
  // Habilitar node
} else {
  // Desabilitar node
}

// Obter status
const status = getNodeStatus('interactive_buttons', availabilityInfo);
// 'available' | 'experimental' | 'unavailable'

// Obter warning
const warning = getNodeWarning('interactive_list', availabilityInfo);
// "Este node é experimental na Evolution API..."

// Filtrar apenas nodes disponíveis
const allNodes = ['start', 'message', 'whatsapp_template', 'end'];
const availableNodes = filterAvailableNodes(allNodes, availabilityInfo);
// ['start', 'message', 'end'] (sem 'whatsapp_template')
```

#### 2. **Componente Badge** (`frontend/src/components/chatbot/NodeStatusBadge.tsx`)

Badge visual para mostrar status do node:

```tsx
import { NodeStatusBadge } from '@/components/chatbot/NodeStatusBadge';

// Exemplo:
<NodeStatusBadge status="experimental" />
// Renderiza: 🟡 Experimental

<NodeStatusBadge status="unavailable" />
// Renderiza: 🔴 Indisponível
```

---

## 📊 Exemplo de Response do Endpoint

```http
GET /api/v1/whatsapp/numbers/123
```

**Response (Official API):**
```json
{
  "id": "123",
  "phone_number": "+5511999887766",
  "connection_type": "official",
  "available_node_types": [
    "start",
    "message",
    "question",
    "condition",
    "end",
    "handoff",
    "delay",
    "jump",
    "action",
    "api_call",
    "ai_prompt",
    "database_query",
    "script",
    "whatsapp_template",
    "interactive_buttons",
    "interactive_list"
  ],
  "node_metadata": {
    "whatsapp_template": {
      "available": true,
      "status": "available",
      "warning": null,
      "connection_type": "official"
    },
    "interactive_buttons": {
      "available": true,
      "status": "available",
      "warning": null,
      "connection_type": "official"
    }
  }
}
```

**Response (Evolution API):**
```json
{
  "id": "456",
  "phone_number": "+5511988776655",
  "connection_type": "qrcode",
  "available_node_types": [
    "start",
    "message",
    "question",
    "condition",
    "end",
    "handoff",
    "delay",
    "jump",
    "action",
    "api_call",
    "ai_prompt",
    "database_query",
    "script",
    "interactive_buttons",
    "interactive_list"
  ],
  "node_metadata": {
    "whatsapp_template": {
      "available": false,
      "status": "unavailable",
      "warning": "Este node não está disponível para conexões Evolution API",
      "connection_type": "qrcode"
    },
    "interactive_buttons": {
      "available": true,
      "status": "experimental",
      "warning": "Este node é experimental na Evolution API. Funcionalidade pode ser limitada.",
      "connection_type": "qrcode"
    },
    "interactive_list": {
      "available": true,
      "status": "experimental",
      "warning": "Este node é experimental na Evolution API. Funcionalidade pode ser limitada.",
      "connection_type": "qrcode"
    }
  }
}
```

---

## 🎯 Casos de Uso

### Caso 1: Chatbot Builder - Desabilitar Nodes Incompatíveis

```tsx
// ChatbotBuilder.tsx
import { isNodeAvailable } from '@/lib/nodeAvailability';

function ChatbotBuilder() {
  const whatsappNumber = useWhatsAppNumber(); // Fetch from API
  const availabilityInfo = whatsappNumber?.node_metadata;

  const nodeTypes = [
    { type: 'message', label: 'Message' },
    { type: 'whatsapp_template', label: 'WhatsApp Template' },
    { type: 'interactive_buttons', label: 'Buttons' },
  ];

  return (
    <div>
      {nodeTypes.map(node => {
        const available = isNodeAvailable(node.type, availabilityInfo);
        const status = getNodeStatus(node.type, availabilityInfo);

        return (
          <button
            key={node.type}
            disabled={!available}
            className={!available ? 'opacity-50 cursor-not-allowed' : ''}
          >
            {node.label}
            <NodeStatusBadge status={status} />
          </button>
        );
      })}
    </div>
  );
}
```

### Caso 2: Validação em Tempo de Execução (Backend)

Quando um usuário interage com o chatbot:

1. Usuário envia mensagem
2. Backend executa node atual
3. **Antes de executar**, valida compatibilidade
4. Se incompatível:
   - ❌ Loga erro
   - 👤 Transfere para agente humano
   - 📤 Envia mensagem explicativa
5. Se compatível:
   - ✅ Executa normalmente
   - ⚠️ Loga warning se experimental

### Caso 3: Frontend - Mostrar Avisos Visuais

```tsx
// NodePalette.tsx
import { getNodeWarning, NodeStatusBadge } from '@/components/chatbot';

function NodePalette({ whatsappNumber }) {
  const warning = getNodeWarning('interactive_buttons', whatsappNumber.node_metadata);

  return (
    <div className="node-item">
      <span>Interactive Buttons</span>
      <NodeStatusBadge status="experimental" />
      {warning && (
        <div className="warning-tooltip">
          ⚠️ {warning}
        </div>
      )}
    </div>
  );
}
```

---

## 🔧 Como Adicionar Novo Node com Restrições

1. **Backend** - Atualizar `NodeAvailability`:

```python
# backend/app/utils/node_availability.py

class NodeAvailability:
    ALL_NODES = [
        # ... existing nodes
        "new_node_type",  # Adicionar aqui
    ]

    # Classificar:
    UNIVERSAL_NODES = [...]  # Se funciona em ambos
    OFFICIAL_ONLY_NODES = [...]  # Se exclusivo Official
    EXPERIMENTAL_NODES = [...]  # Se experimental Evolution
```

2. **Frontend** - Atualizar helper:

```typescript
// frontend/src/lib/nodeAvailability.ts

export function formatNodeType(nodeType: string): string {
  const typeMap: Record<string, string> = {
    // ... existing types
    new_node_type: 'New Node',  // Adicionar label
  };
  return typeMap[nodeType] || nodeType;
}
```

---

## 📝 Testes

### Testar Backend

```python
# Test node availability logic
def test_node_availability():
    # Official should have all nodes
    official_nodes = NodeAvailability.get_available_nodes("official")
    assert "whatsapp_template" in official_nodes
    assert "interactive_buttons" in official_nodes

    # QR Code should not have whatsapp_template
    qrcode_nodes = NodeAvailability.get_available_nodes("qrcode")
    assert "whatsapp_template" not in qrcode_nodes
    assert "interactive_buttons" in qrcode_nodes  # Experimental, but available

    # Check experimental nodes have warnings
    metadata = NodeAvailability.get_node_metadata("qrcode")
    assert metadata["interactive_buttons"]["status"] == "experimental"
    assert metadata["interactive_buttons"]["warning"] is not None
```

### Testar Endpoint

```bash
# Obter número WhatsApp (Official)
curl -X GET http://localhost:8000/api/v1/whatsapp/numbers/123 \
  -H "Authorization: Bearer $TOKEN" | jq '.available_node_types'

# Deve retornar array com todos os nodes, incluindo "whatsapp_template"

# Obter número WhatsApp (Evolution)
curl -X GET http://localhost:8000/api/v1/whatsapp/numbers/456 \
  -H "Authorization: Bearer $TOKEN" | jq '.available_node_types'

# Deve retornar array SEM "whatsapp_template"
```

---

## ✅ Checklist de Implementação

Backend:
- [x] Criar `NodeAvailability` helper
- [x] Adicionar `available_node_types` e `node_metadata` no schema
- [x] Enriquecer response do endpoint com node info
- [x] Validar compatibilidade em runtime (`_execute_node`)
- [x] Transferir para agente se node incompatível

Frontend:
- [x] Criar helper `nodeAvailability.ts`
- [x] Criar componente `NodeStatusBadge`
- [ ] Integrar no Chatbot Builder (desabilitar nodes incompatíveis)
- [ ] Adicionar tooltips com avisos
- [ ] Adicionar filtro visual para nodes experimentais

---

## 🚀 Próximos Passos

1. **Integrar no Chatbot Builder UI:**
   - Desabilitar nodes incompatíveis no painel lateral
   - Adicionar badges visuais (Experimental/Indisponível)
   - Tooltips explicando restrições

2. **Melhorias Futuras:**
   - Permitir admin forçar uso de node experimental
   - Dashboard mostrando quais nodes são usados em quais chatbots
   - Alertas quando número mudar de official → qrcode (chatbots podem quebrar)

---

## 📚 Arquivos Modificados

**Backend:**
- `backend/app/utils/node_availability.py` (NOVO)
- `backend/app/schemas/whatsapp.py`
- `backend/app/services/whatsapp_service.py`

**Frontend:**
- `frontend/src/lib/nodeAvailability.ts` (NOVO)
- `frontend/src/components/chatbot/NodeStatusBadge.tsx` (NOVO)

**Documentação:**
- `NODE_AVAILABILITY_SYSTEM.md` (ESTE ARQUIVO)
