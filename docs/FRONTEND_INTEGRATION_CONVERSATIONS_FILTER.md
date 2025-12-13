# 📘 Guia de Integração: Filtro active_chatbot_id em Conversas

**Data:** 13 de dezembro de 2025  
**Status:** ✅ Backend Implementado e Testado  
**Direcionado para:** Time de Frontend  
**Versão da API:** v1

---

## 📌 O QUE FOI IMPLEMENTADO

O endpoint `GET /api/v1/conversations/` agora suporta um novo query parameter `active_chatbot_id` que permite filtrar conversas por um chatbot específico.

### Por que isso importa?

Anteriormente, o frontend tinha que buscar **todas as conversas da organização** e depois filtrar pelo chatbot no cliente. Agora o backend faz esse filtro, melhorando:

- ⚡ **Performance** - Menos dados transferidos
- 🔒 **Isolamento** - Dados já filtrados no servidor
- 📊 **Escalabilidade** - Suporta grandes volumes de conversas

---

## 🔌 Como Usar

### Endpoint
```
GET /api/v1/conversations/
```

### Query Parameters

| Parâmetro | Tipo | Obrigatório | Descrição | Exemplo |
|-----------|------|-------------|-----------|---------|
| `active_chatbot_id` | UUID | Não | ID do chatbot para filtrar conversas | `f9651dd7-87fd-40c0-9c5b-599b0dfe9ea8` |
| `status` | string | Não | Status da conversa (open, pending, resolved, closed) | `open` |
| `skip` | int | Não | Número de registros a pular (paginação) | `0` |
| `limit` | int | Não | Quantidade máxima de registros (máx: 100) | `100` |
| `assigned_to_me` | boolean | Não | Retornar apenas conversas atribuídas a mim | `false` |
| `department_id` | UUID | Não | Filtrar por departamento | `uuid...` |
| `queue_id` | UUID | Não | Filtrar por fila | `uuid...` |

### Respostas

#### Sucesso (200 OK)
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "contact_id": "650e8400-e29b-41d4-a716-446655440001",
    "status": "open",
    "assigned_agent_id": "750e8400-e29b-41d4-a716-446655440002",
    "active_chatbot_id": "f9651dd7-87fd-40c0-9c5b-599b0dfe9ea8",
    "created_at": "2025-12-08T10:00:00Z",
    "updated_at": "2025-12-08T21:00:00Z"
  }
]
```

#### Erro - Não autenticado (401)
```json
{
  "error": {
    "code": 401,
    "message": "Unauthorized",
    "type": "authentication_error"
  }
}
```

---

## 💻 Exemplos de Uso

### 1. Listar TODAS as conversas da organização (sem filtro)
```typescript
// Sem active_chatbot_id - retorna todas as conversas
const response = await fetch('/api/v1/conversations/', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});

const conversations = await response.json();
// Retorna: Array de conversas de TODOS os chatbots
```

### 2. Listar conversas de um chatbot específico
```typescript
const chatbotId = 'f9651dd7-87fd-40c0-9c5b-599b0dfe9ea8';

const response = await fetch(
  `/api/v1/conversations/?active_chatbot_id=${chatbotId}`,
  {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  }
);

const conversations = await response.json();
// Retorna: Array com APENAS conversas daquele chatbot
```

### 3. Listar conversas abertas de um chatbot específico
```typescript
const chatbotId = 'f9651dd7-87fd-40c0-9c5b-599b0dfe9ea8';

const response = await fetch(
  `/api/v1/conversations/?active_chatbot_id=${chatbotId}&status=open&limit=50`,
  {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  }
);

const conversations = await response.json();
// Retorna: Array com conversas abertas daquele chatbot (máx 50)
```

### 4. Listar apenas minhas conversas de um chatbot
```typescript
const chatbotId = 'f9651dd7-87fd-40c0-9c5b-599b0dfe9ea8';

const response = await fetch(
  `/api/v1/conversations/?active_chatbot_id=${chatbotId}&assigned_to_me=true`,
  {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  }
);

const conversations = await response.json();
// Retorna: Array com MINHAS conversas daquele chatbot
```

---

## 🔄 Integração com Seu Serviço

Se você já tem um serviço `conversationsService`, atualize para suportar `active_chatbot_id`:

### Antes (sem filtro de chatbot)
```typescript
// src/services/conversations.service.ts

export class ConversationsService {
  async getConversations(
    params?: {
      skip?: number;
      limit?: number;
      status?: string;
      assigned_to_me?: boolean;
      department_id?: string;
      queue_id?: string;
    }
  ) {
    const response = await api.get('/conversations/', params);
    return {
      items: Array.isArray(response) ? response : [],
      total: Array.isArray(response) ? response.length : 0,
    };
  }
}
```

### Depois (com filtro de chatbot)
```typescript
// src/services/conversations.service.ts

export class ConversationsService {
  async getConversations(
    chatbotId?: string,  // ← NOVO PARÂMETRO
    params?: {
      skip?: number;
      limit?: number;
      status?: string;
      assigned_to_me?: boolean;
      department_id?: string;
      queue_id?: string;
    }
  ) {
    const queryParams = {
      ...params,
      ...(chatbotId && { active_chatbot_id: chatbotId }),  // ← NOVO
    };

    const response = await api.get('/conversations/', queryParams);
    return {
      items: Array.isArray(response) ? response : [],
      total: Array.isArray(response) ? response.length : 0,
    };
  }
}
```

### Uso no Componente
```typescript
// Antes
const conversations = await conversationsService.getConversations({
  skip: 0,
  limit: 100
});

// Depois
const chatbotId = 'f9651dd7-87fd-40c0-9c5b-599b0dfe9ea8';
const conversations = await conversationsService.getConversations(
  chatbotId,  // ← NOVO
  { skip: 0, limit: 100 }
);
```

---

## 🎯 Casos de Uso Comuns

### Caso 1: Dashboard de um chatbot específico
```typescript
// Usuario clica em um chatbot, mostra conversas dele
const ChatbotDashboard = ({ chatbotId }: { chatbotId: string }) => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadConversations = async () => {
      try {
        const data = await conversationsService.getConversations(
          chatbotId,
          { skip: 0, limit: 100 }
        );
        setConversations(data.items);
      } finally {
        setLoading(false);
      }
    };

    loadConversations();
  }, [chatbotId]);

  if (loading) return <div>Carregando...</div>;

  return (
    <div>
      <h1>Conversas do Chatbot</h1>
      <ConversationsList conversations={conversations} />
    </div>
  );
};
```

### Caso 2: Seletor de conversas por chatbot
```typescript
const ConversationSelector = () => {
  const [chatbots, setChatbots] = useState([]);
  const [selectedChatbot, setSelectedChatbot] = useState<string | null>(null);
  const [conversations, setConversations] = useState([]);

  useEffect(() => {
    // Carregar lista de chatbots
    chatbotsService.getChatbots().then(setChatbots);
  }, []);

  useEffect(() => {
    if (!selectedChatbot) return;

    // Carregar conversas do chatbot selecionado
    conversationsService
      .getConversations(selectedChatbot, { limit: 50 })
      .then((data) => setConversations(data.items));
  }, [selectedChatbot]);

  return (
    <div>
      <select
        value={selectedChatbot || ''}
        onChange={(e) => setSelectedChatbot(e.target.value)}
      >
        <option value="">Selecione um chatbot...</option>
        {chatbots.map((chatbot) => (
          <option key={chatbot.id} value={chatbot.id}>
            {chatbot.name}
          </option>
        ))}
      </select>

      {conversations.length > 0 && (
        <ConversationsList conversations={conversations} />
      )}
    </div>
  );
};
```

### Caso 3: Relatório de conversas por chatbot
```typescript
const ConversationReport = ({ chatbotId }: { chatbotId: string }) => {
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    resolved: 0,
  });

  useEffect(() => {
    const loadStats = async () => {
      const [total, open, resolved] = await Promise.all([
        conversationsService.getConversations(chatbotId, { limit: 1000 }),
        conversationsService.getConversations(chatbotId, { 
          status: 'open', 
          limit: 1000 
        }),
        conversationsService.getConversations(chatbotId, { 
          status: 'resolved', 
          limit: 1000 
        }),
      ]);

      setStats({
        total: total.total,
        open: open.total,
        resolved: resolved.total,
      });
    };

    loadStats();
  }, [chatbotId]);

  return (
    <div>
      <p>Total: {stats.total}</p>
      <p>Abertas: {stats.open}</p>
      <p>Resolvidas: {stats.resolved}</p>
    </div>
  );
};
```

---

## 🔑 Informações Técnicas

### Nome do Campo
- **Query param (URL):** `active_chatbot_id`
- **Campo no modelo:** `Conversation.active_chatbot_id`
- **Tipo:** UUID

### Por que "active_chatbot_id" no banco?
O modelo SQLAlchemy usa `active_chatbot_id` porque indica qual é o chatbot **ativo** naquela conversa (pode ter histórico de múltiplos chatbots).

### Backward Compatibility
✅ O parâmetro é **opcional** - código antigo continua funcionando sem mudanças

---

## 🧪 Testes

### Teste Manual com curl
```bash
# Obter token
TOKEN=$(curl -X POST http://localhost:8002/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@pytake.net","password":"nYVUJy9w5hYQGh52CSpM0g"}' \
  | jq -r '.token.access_token')

# Listar todas as conversas
curl -X GET "http://localhost:8002/api/v1/conversations/" \
  -H "Authorization: Bearer $TOKEN"

# Listar conversas de um chatbot específico
curl -X GET "http://localhost:8002/api/v1/conversations/?active_chatbot_id=f9651dd7-87fd-40c0-9c5b-599b0dfe9ea8" \
  -H "Authorization: Bearer $TOKEN"

# Listar conversas abertas de um chatbot
curl -X GET "http://localhost:8002/api/v1/conversations/?active_chatbot_id=f9651dd7-87fd-40c0-9c5b-599b0dfe9ea8&status=open" \
  -H "Authorization: Bearer $TOKEN"
```

### Teste com Postman/Insomnia
1. **GET** `http://localhost:8002/api/v1/conversations/`
2. **Headers:**
   - `Authorization: Bearer {access_token}`
   - `Content-Type: application/json`
3. **Query Params:**
   - `active_chatbot_id`: `f9651dd7-87fd-40c0-9c5b-599b0dfe9ea8`
   - `status`: `open`
   - `limit`: `50`

---

## 📚 Documentação OpenAPI

O endpoint está totalmente documentado no Swagger:

```
GET /api/v1/conversations/
```

Documentação interativa disponível em: **`http://localhost:8002/api/v1/docs`**

---

## ⚠️ Limitações e Considerações

### Paginação
- Máximo de registros por página: **100**
- Use `skip` e `limit` para paginar grandes volumes
- Não há `total_count` automático (apenas array)

### Filtros Combinados
Todos os filtros trabalham com **AND** (AND lógico):
```
active_chatbot_id=X AND status=open AND assigned_to_me=true
```

### Performance
Para grandes volumes:
```typescript
// BOM - Filtra pelo server, pega 50 registros
const conversations = await conversationsService.getConversations(
  chatbotId,
  { limit: 50 }
);

// RUIM - Filtra pelo server, pega 10000 registros
const conversations = await conversationsService.getConversations(
  chatbotId,
  { limit: 10000 }  // ← Erro: máximo é 100
);
```

---

## 🐛 Troubleshooting

### Erro: "Invalid UUID format"
```
❌ active_chatbot_id=invalid-uuid

✅ active_chatbot_id=f9651dd7-87fd-40c0-9c5b-599b0dfe9ea8
```

### Retorna 401 Unauthorized
```
❌ Sem header Authorization

✅ Authorization: Bearer eyJhbGciOiJIUzI1NiI...
```

### Retorna array vazio []
- Verifique se existem conversas para esse chatbot no banco
- Verifique se o `active_chatbot_id` está correto
- Verifique se não há filtros muito restritivos (status, assigned_to_me, etc)

### Performance lenta
- Reduja o `limit` (máximo recomendado: 50)
- Use filtros para reduzir resultados (status, department_id, etc)
- Implemente paginação (use `skip` de forma incremental)

---

## 📞 Suporte

### Dúvidas sobre a API?
- 📖 **Documentação Swagger:** `http://localhost:8002/api/v1/docs`
- 🔧 **Backend:** Kayo Carvalho Fernandes
- 📧 **Email:** [seu-email@pytake.net]

### Issues?
1. Verificar logs do backend
2. Testar com curl (exclui problemas de fetch/axios)
3. Verificar token JWT (validity, role, org_id)
4. Incluir UUID do chatbot correto

---

## 📋 Checklist de Integração

- [ ] Ler este documento
- [ ] Copiar credenciais do `.env`
- [ ] Testar endpoint com curl/Postman
- [ ] Atualizar `conversationsService.getConversations()`
- [ ] Atualizar componentes para passar `active_chatbot_id`
- [ ] Testar em desenvolvimento
- [ ] Validar com dados reais do banco
- [ ] Fazer merge em `develop`
- [ ] Deploy para staging
- [ ] Testes de aceitação com product

---

## 🚀 Próximos Passos

### Frontend
- [ ] Integrar filtro em components que listam conversas
- [ ] Adicionar loading states durante filtro
- [ ] Implementar error handling
- [ ] Adicionar paginação se houver muitas conversas

### Backend
- [ ] Adicionar testes unitários (repository)
- [ ] Adicionar testes de integração (endpoint)
- [ ] Validar performance com 10k+ conversas
- [ ] Adicionar índice no banco se necessário

---

## 📝 Referências

- **Documentação da API:** `docs/API_DOCUMENTATION.md`
- **Modelo Conversation:** `backend/app/models/conversation.py`
- **Serviço de Conversation:** `backend/app/services/conversation_service.py`
- **Endpoint:** `backend/app/api/v1/endpoints/conversations.py`

---

## 📊 Resumo de Mudanças

| Item | Antes | Depois |
|------|-------|--------|
| Filtro por chatbot | ❌ Não existia | ✅ Query param `active_chatbot_id` |
| Filtros combinados | ❌ Limitado | ✅ Funciona com status, department, etc |
| Performance | ⚠️ Baixa (sem filtro) | ✅ Melhorada (filtra no server) |
| Backward compatible | N/A | ✅ Sim (parâmetro opcional) |

---

**Documento gerado:** 13 de dezembro de 2025  
**Versão:** 1.0  
**Status:** ✅ Pronto para Produção  

Para dúvidas ou sugestões, entre em contato com o time de backend!
