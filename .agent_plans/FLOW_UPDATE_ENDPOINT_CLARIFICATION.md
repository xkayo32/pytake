# 🔍 Esclarecimento: Como Atualizar Flow Completo (Nodes + Edges)

**Data:** 11 de Dezembro de 2025  
**Autor:** Kayo Carvalho Fernandes  
**Status:** Respondido  

---

## ❓ Pergunta Original

> Olhando a documentação, o endpoint PATCH /chatbots/{id} não lista nodes e edges como campos aceitos - apenas name, description, avatar_url, etc. Qual é o endpoint correto para atualizar o fluxo completo com nodes e edges?

---

## ✅ Resposta: O Endpoint Correto

### **PATCH `/chatbots/flows/{flow_id}` é o endpoint correto**

Este endpoint atualiza o flow **completo** (nodes + edges) em **uma única operação**, não o chatbot (`/chatbots/{id}`).

---

## 📋 Estrutura da Requisição

```bash
PATCH /api/v1/chatbots/flows/{flow_id}
Content-Type: application/json
Authorization: Bearer {token}

{
  "name": "Welcome Flow",                    # opcional
  "description": "Flow description",         # opcional
  "canvas_data": {                           # ⭐ CAMPO PRINCIPAL
    "nodes": [
      {
        "id": "node-1",                      # React Flow ID (ex: "node-1")
        "position": { "x": 100, "y": 100 },
        "data": {
          "nodeType": "start",               # Tipo: start, message, question, etc.
          "label": "Início",
          "config": { ... }                  # Configurações específicas do node
        }
      },
      {
        "id": "node-2",
        "position": { "x": 300, "y": 100 },
        "data": {
          "nodeType": "message",
          "label": "Mensagem de Boas-vindas",
          "config": { ... }
        }
      }
    ],
    "edges": [
      {
        "id": "edge-1",
        "source": "node-1",
        "target": "node-2",
        "data": { ... }
      }
    ]
  },
  "variables": { ... },                     # opcional
  "is_main": true,                          # opcional
  "is_active": true                         # opcional
}
```

---

## 🔄 O Que Acontece Internamente

Quando você envia uma requisição PATCH com `canvas_data`:

### **1. Banco de Dados - Tabela `flows`**
- Salva o campo `canvas_data` completo (JSON) em uma coluna JSONB
- Inclui `nodes` e `edges` para ser usado no frontend

### **2. Banco de Dados - Tabela `nodes` (Sincronização Automática)**
O backend extrai os nodes do `canvas_data` e sincroniza para a tabela `nodes`:

```python
# Fluxo interno (chatbot_service.py):
1. Recebe requisição PATCH com canvas_data
2. Deleta todos os nodes existentes da flow
3. Extrai nodes do canvas_data
4. Para cada node do canvas:
   - node_id (React Flow ID ex: "node-1")
   - node_type (start, message, question, etc.)
   - label, position_x, position_y
   - data (JSONB com toda config)
5. Bulk insert na tabela nodes
```

### **3. Edges**
- **NÃO têm tabela separada**
- Armazenados apenas em `flows.canvas_data` (JSONB)
- Usados pelo frontend para renderizar conexões

---

## 📊 Visualizando o Armazenamento

```
┌──────────────────────────────────────────────────────────┐
│                    BANCO DE DADOS                        │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  flows (tabela)                                         │
│  ├── id: UUID                                           │
│  ├── name: string                                       │
│  ├── canvas_data: JSONB ⭐                              │
│  │   ├── nodes: [...] (React Flow format)              │
│  │   └── edges: [...] (React Flow format)              │
│  └── ...                                                │
│                                                          │
│  nodes (tabela - denormalizado)                         │
│  ├── id: UUID                                           │
│  ├── flow_id: UUID (FK)                                 │
│  ├── node_id: string (ex: "node-1")                     │
│  ├── node_type: string (ex: "message")                  │
│  ├── label: string                                      │
│  ├── data: JSONB (config completa)                      │
│  ├── position_x, position_y: int                        │
│  └── ...                                                │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## 🔍 Por Que Duas Tabelas?

| Aspecto | Motivo |
|---------|--------|
| **canvas_data em flows** | Para o frontend renderizar o visual (React Flow) |
| **nodes desnormalizado** | Para queries rápidas (ex: "listar nodes", executar flow, validar estrutura) |
| **sem tabela edges** | Edges são apenas dados de layout, não precisam de queries diretas |

---

## 🚀 Exemplo Prático Completo

### **Request:**
```bash
curl -X PATCH http://localhost:8000/api/v1/chatbots/flows/12345-flow-id \
  -H "Authorization: Bearer seu_token" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Sales Flow Atualizado",
    "canvas_data": {
      "nodes": [
        {
          "id": "node-1",
          "position": {"x": 100, "y": 100},
          "data": {
            "nodeType": "start",
            "label": "Início",
            "config": {}
          }
        },
        {
          "id": "node-2",
          "position": {"x": 300, "y": 100},
          "data": {
            "nodeType": "message",
            "label": "Qual seu nome?",
            "config": {
              "message": "Qual seu nome?",
              "buttons": ["OK"]
            }
          }
        },
        {
          "id": "node-3",
          "position": {"x": 500, "y": 100},
          "data": {
            "nodeType": "end",
            "label": "Fim",
            "config": {}
          }
        }
      ],
      "edges": [
        {
          "id": "edge-1",
          "source": "node-1",
          "target": "node-2"
        },
        {
          "id": "edge-2",
          "source": "node-2",
          "target": "node-3"
        }
      ]
    }
  }'
```

### **Response (200 OK):**
```json
{
  "id": "12345-flow-id",
  "chatbot_id": "chatbot-uuid",
  "name": "Sales Flow Atualizado",
  "canvas_data": {
    "nodes": [...],
    "edges": [...]
  },
  "variables": {},
  "is_main": false,
  "is_active": true,
  "created_at": "2025-01-01T...",
  "updated_at": "2025-12-11T..."
}
```

---

## ❌ O Que NÃO Fazer

| ❌ Erro | ✅ Correto |
|--------|-----------|
| PATCH `/chatbots/{id}` com nodes (para chatbot, não flow) | PATCH `/chatbots/flows/{flow_id}` |
| Envar nodes sem `canvas_data` | Enviar sempre dentro de `canvas_data` |
| Usar POST `/chatbots/{id}/import` para edição normal | Use import apenas para **copiar** flows de outras chatbots |
| Tentar deletar edges diretamente | Edges deletam automaticamente ao atualizar `canvas_data` |

---

## 📌 Opções Alternativas (Raramente Necessárias)

### **1. Endpoints Individuais (Node por Node)**

Se precisar atualizar **apenas um node** em vez do flow completo:

```bash
# Atualizar um node específico
PATCH /api/v1/chatbots/nodes/{node_id}
{
  "label": "Novo rótulo",
  "data": { "config": {...} }
}
```

**Caso de Uso:** Edição granular sem precisar do flow inteiro.

### **2. Export / Import (Para Copiar Flows)**

```bash
# Exportar um flow completo
GET /api/v1/chatbots/flows/{flow_id}/export

# Importar em outro chatbot (cria novo flow)
POST /api/v1/chatbots/{chatbot_id}/import
{
  "name": "...",
  "canvas_data": {...},
  "...": "..."
}
```

**Caso de Uso:** Backup, replicar flow em outro chatbot/organização.

---

## 🎯 Resumo para Frontend

**Implementação recomendada:**

```javascript
// Ao salvar o flow no editor React Flow
async function saveFlow(flowId, nodes, edges) {
  const response = await fetch(`/api/v1/chatbots/flows/${flowId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      canvas_data: {
        nodes: nodes,    // Array de nodes do React Flow
        edges: edges     // Array de edges do React Flow
      }
    })
  });
  
  return response.json();
}
```

---

## ✅ Checklist de Validação

- ✅ Usar **PATCH `/chatbots/flows/{flow_id}`**
- ✅ Enviar **`canvas_data`** com nodes e edges
- ✅ Nodes possuem `id` (React Flow ID), `position`, `data`
- ✅ Edges possuem `id`, `source`, `target`
- ✅ Tabela `nodes` é sincronizada automaticamente
- ✅ Edges armazenados em `canvas_data` (JSONB)
- ✅ Multi-tenancy validado (filtra por `organization_id`)

---

**Implementado por:** Kayo Carvalho Fernandes  
**Última Atualização:** 11 de Dezembro de 2025
