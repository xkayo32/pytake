# 📋 PLANO DE IMPLEMENTAÇÃO: Adicionar filtro chatbot_id

**Data:** 13 de dezembro de 2025  
**Objetivo:** Adicionar suporte a filtro `chatbot_id` em GET /conversations/  
**Prioridade:** 🔴 CRÍTICO  
**Tempo Estimado:** 15 minutos

---

## 🎯 ESCOPO

Adicionar capacidade de filtrar conversas por `chatbot_id` em 3 camadas:
1. **Endpoint (Route)** - Aceitar query param
2. **Service** - Passar o parâmetro
3. **Repository** - Implementar filtro na query SQL

---

## 📂 ARQUIVOS A MODIFICAR

### 1️⃣ Backend Endpoint
**Arquivo:** `backend/app/api/v1/endpoints/conversations.py`  
**Função:** `list_conversations`  
**Linhas:** 31-73  
**Tipo de Mudança:** Adicionar 1 query param

### 2️⃣ Backend Service
**Arquivo:** `backend/app/services/conversation_service.py`  
**Função:** `list_conversations`  
**Linhas:** 44-58  
**Tipo de Mudança:** Adicionar 1 parâmetro, passar ao repository

### 3️⃣ Backend Repository
**Arquivo:** `backend/app/repositories/conversation.py`  
**Função:** `list_conversations`  
**Linhas:** 67-102  
**Tipo de Mudança:** Adicionar 1 parâmetro, adicionar 1 filtro na query

---

## 🔧 DETALHAMENTO DAS MUDANÇAS

### PASSO 1: Endpoint (conversations.py)
**O que fazer:** Adicionar `chatbot_id` como query param opcional

```python
# ANTES (linhas 31-47)
@router.get("/", response_model=List[Conversation])
async def list_conversations(
    skip: int = Query(0, ge=0, description="Número de registros para pular (paginação)"),
    limit: int = Query(100, ge=1, le=100, description="Quantidade máxima de registros retornados"),
    status: Optional[str] = Query(
        None, 
        regex="^(open|pending|resolved|closed)$",
        description="Filtrar por status: 'open', 'pending', 'resolved' ou 'closed'"
    ),
    assigned_to_me: bool = Query(
        False,
        description="Se true, retorna apenas conversas atribuídas ao usuário atual"
    ),
    department_id: Optional[UUID] = Query(None, description="Filtrar por ID do departamento"),
    queue_id: Optional[UUID] = Query(None, description="Filtrar por ID da fila"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):

# DEPOIS - ADICIONAR chatbot_id após limit
@router.get("/", response_model=List[Conversation])
async def list_conversations(
    chatbot_id: Optional[UUID] = Query(None, description="Filtrar por ID do chatbot"),  # ← NOVA LINHA
    skip: int = Query(0, ge=0, description="Número de registros para pular (paginação)"),
    limit: int = Query(100, ge=1, le=100, description="Quantidade máxima de registros retornados"),
    status: Optional[str] = Query(
        None, 
        regex="^(open|pending|resolved|closed)$",
        description="Filtrar por status: 'open', 'pending', 'resolved' ou 'closed'"
    ),
    assigned_to_me: bool = Query(
        False,
        description="Se true, retorna apenas conversas atribuídas ao usuário atual"
    ),
    department_id: Optional[UUID] = Query(None, description="Filtrar por ID do departamento"),
    queue_id: Optional[UUID] = Query(None, description="Filtrar por ID da fila"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
```

**Depois (linhas 84-92)** - Atualizar chamada ao service:
```python
# ANTES
return await service.list_conversations(
    organization_id=current_user.organization_id,
    status=status,
    assigned_agent_id=assigned_agent_id,
    assigned_department_id=department_id,
    queue_id=queue_id,
    skip=skip,
    limit=limit,
)

# DEPOIS - ADICIONAR chatbot_id
return await service.list_conversations(
    organization_id=current_user.organization_id,
    chatbot_id=chatbot_id,  # ← NOVA LINHA
    status=status,
    assigned_agent_id=assigned_agent_id,
    assigned_department_id=department_id,
    queue_id=queue_id,
    skip=skip,
    limit=limit,
)
```

**Atualizar docstring (linhas 64-74):**
```python
# ADICIONAR na lista de Query Parameters:
    - `chatbot_id` (UUID, opcional): Filtrar por chatbot
```

---

### PASSO 2: Service (conversation_service.py)
**O que fazer:** Adicionar `chatbot_id` ao método `list_conversations`

```python
# ANTES (linhas 44-58)
async def list_conversations(
    self,
    organization_id: UUID,
    status: Optional[str] = None,
    assigned_agent_id: Optional[UUID] = None,
    assigned_department_id: Optional[UUID] = None,
    queue_id: Optional[UUID] = None,
    skip: int = 0,
    limit: int = 100,
) -> List[Conversation]:
    """List conversations with optional filters"""
    return await self.repo.list_conversations(
        organization_id=organization_id,
        status=status,
        assigned_agent_id=assigned_agent_id,
        assigned_department_id=assigned_department_id,
        queue_id=queue_id,
        skip=skip,
        limit=limit,
    )

# DEPOIS
async def list_conversations(
    self,
    organization_id: UUID,
    chatbot_id: Optional[UUID] = None,  # ← NOVA LINHA
    status: Optional[str] = None,
    assigned_agent_id: Optional[UUID] = None,
    assigned_department_id: Optional[UUID] = None,
    queue_id: Optional[UUID] = None,
    skip: int = 0,
    limit: int = 100,
) -> List[Conversation]:
    """List conversations with optional filters"""
    return await self.repo.list_conversations(
        organization_id=organization_id,
        chatbot_id=chatbot_id,  # ← NOVA LINHA
        status=status,
        assigned_agent_id=assigned_agent_id,
        assigned_department_id=assigned_department_id,
        queue_id=queue_id,
        skip=skip,
        limit=limit,
    )
```

---

### PASSO 3: Repository (conversation.py)
**O que fazer:** Adicionar `chatbot_id` ao método `list_conversations` com filtro SQL

```python
# ANTES (linhas 67-102)
async def list_conversations(
    self,
    organization_id: UUID,
    status: Optional[str] = None,
    assigned_agent_id: Optional[UUID] = None,
    assigned_department_id: Optional[UUID] = None,
    queue_id: Optional[UUID] = None,
    priority: Optional[str] = None,
    unread_only: bool = False,
    skip: int = 0,
    limit: int = 100,
) -> List[Conversation]:
    """List conversations with filters"""
    stmt = (
        select(Conversation)
        .where(
            Conversation.organization_id == organization_id,
            Conversation.deleted_at.is_(None),
        )
        .options(joinedload(Conversation.contact))
    )

    if status:
        stmt = stmt.where(Conversation.status == status)

    if assigned_agent_id:
        stmt = stmt.where(Conversation.current_agent_id == assigned_agent_id)

    if assigned_department_id:
        stmt = stmt.where(Conversation.assigned_department_id == assigned_department_id)

    if queue_id:
        stmt = stmt.where(Conversation.queue_id == queue_id)

    if priority:
        stmt = stmt.where(Conversation.priority == priority)

    if unread_only:
        stmt = stmt.where(Conversation.unread_count > 0)

    stmt = stmt.order_by(desc(Conversation.last_message_at)).offset(skip).limit(limit)

    result = await self.db.execute(stmt)
    return list(result.scalars().all())

# DEPOIS
async def list_conversations(
    self,
    organization_id: UUID,
    chatbot_id: Optional[UUID] = None,  # ← NOVA LINHA
    status: Optional[str] = None,
    assigned_agent_id: Optional[UUID] = None,
    assigned_department_id: Optional[UUID] = None,
    queue_id: Optional[UUID] = None,
    priority: Optional[str] = None,
    unread_only: bool = False,
    skip: int = 0,
    limit: int = 100,
) -> List[Conversation]:
    """List conversations with filters"""
    stmt = (
        select(Conversation)
        .where(
            Conversation.organization_id == organization_id,
            Conversation.deleted_at.is_(None),
        )
        .options(joinedload(Conversation.contact))
    )

    if chatbot_id:  # ← NOVO FILTRO
        stmt = stmt.where(Conversation.chatbot_id == chatbot_id)

    if status:
        stmt = stmt.where(Conversation.status == status)

    if assigned_agent_id:
        stmt = stmt.where(Conversation.current_agent_id == assigned_agent_id)

    if assigned_department_id:
        stmt = stmt.where(Conversation.assigned_department_id == assigned_department_id)

    if queue_id:
        stmt = stmt.where(Conversation.queue_id == queue_id)

    if priority:
        stmt = stmt.where(Conversation.priority == priority)

    if unread_only:
        stmt = stmt.where(Conversation.unread_count > 0)

    stmt = stmt.order_by(desc(Conversation.last_message_at)).offset(skip).limit(limit)

    result = await self.db.execute(stmt)
    return list(result.scalars().all())
```

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

- [ ] **Modificar endpoint** (conversations.py - linhas 31-92)
  - [ ] Adicionar `chatbot_id` query param (linha 33)
  - [ ] Atualizar docstring
  - [ ] Passar `chatbot_id` ao service (linha 86)

- [ ] **Modificar service** (conversation_service.py - linhas 44-58)
  - [ ] Adicionar `chatbot_id` parâmetro
  - [ ] Passar `chatbot_id` ao repository

- [ ] **Modificar repository** (conversation.py - linhas 67-102)
  - [ ] Adicionar `chatbot_id` parâmetro
  - [ ] Adicionar filtro SQL `if chatbot_id:`

- [ ] **Testar implementação**
  - [ ] Testar GET /conversations/ sem chatbot_id (retorna todas da org)
  - [ ] Testar GET /conversations/?chatbot_id=xxx (retorna apenas daquele chatbot)
  - [ ] Testar GET /conversations/?chatbot_id=xxx&status=open (múltiplos filtros)

---

## 🧪 TESTES APÓS IMPLEMENTAÇÃO

### Teste 1: Sem filtro (deve retornar todas as conversas da org)
```bash
curl -X GET "http://localhost:8000/api/v1/conversations/" \
  -H "Authorization: Bearer <token>"

# Esperado: Array com todas as conversas da organização
```

### Teste 2: Com filtro chatbot_id (deve retornar apenas daquele chatbot)
```bash
curl -X GET "http://localhost:8000/api/v1/conversations/?chatbot_id=f9651dd7-87fd-40c0-9c5b-599b0dfe9ea8" \
  -H "Authorization: Bearer <token>"

# Esperado: Array com conversas apenas daquele chatbot
```

### Teste 3: Múltiplos filtros
```bash
curl -X GET "http://localhost:8000/api/v1/conversations/?chatbot_id=f9651dd7-87fd-40c0-9c5b-599b0dfe9ea8&status=open" \
  -H "Authorization: Bearer <token>"

# Esperado: Array com conversas abertas apenas daquele chatbot
```

### Teste 4: Frontend integration
```typescript
// Em frontend (src/services/conversations.service.ts)
const conversations = await conversationsService.getConversations(
  chatbotId,  // ← Agora pode passar chatbotId
  { skip: 0, limit: 100 }
);
```

---

## 📊 IMPACTO

| Aspecto | Impacto |
|---------|---------|
| **Compatibilidade** | ✅ Backward compatible (chatbot_id é opcional) |
| **Performance** | ✅ Sem impacto (apenas adiciona WHERE clause) |
| **Multi-tenancy** | ✅ Reforça isolamento de dados |
| **Frontend** | ✅ Habilita filtro de conversas por chatbot |
| **Testes** | ⚠️ Testar todas as combinações de filtros |

---

## 🚀 ORDEM DE EXECUÇÃO

1. **Começar pelo repository** (mais baixo nível)
2. **Depois o service** (orquestração)
3. **Terminar no endpoint** (camada de apresentação)
4. **Testar a integração** (top-down)

Desta forma, cada camada fica pronta antes de chamar a próxima.

---

**Status:** Pronto para implementação  
**Responsável:** Backend Implementation Agent
