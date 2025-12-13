# 📋 PLANO DE IMPLEMENTAÇÃO: Filtro `chatbot_id` em GET /conversations/

**Data:** 13 de dezembro de 2025  
**Status:** ✅ **IMPLEMENTAÇÃO COMPLETA**  
**Tempo Total:** ~15 minutos  
**Prioridade:** 🔴 CRÍTICO  

---

## 📊 RESUMO EXECUTIVO

| Componente | Status | Descrição |
|-----------|--------|-----------|
| **Endpoint** | ✅ DONE | `GET /conversations/` com query param `chatbot_id` |
| **Service** | ✅ DONE | `ConversationService.list_conversations()` suporta filtro |
| **Repository** | ✅ DONE | `ConversationRepository.list_conversations()` filtra por `chatbot_id` |
| **Validação API** | ⏳ PRÓXIMO | Testar endpoint com token JWT |
| **Documentation** | ✅ DONE | Swagger docs atualizado |

---

## 🔧 MUDANÇAS IMPLEMENTADAS

### 1️⃣ **Endpoint: `GET /conversations/`**
**Arquivo:** `/home/administrator/pytake/backend/app/api/v1/endpoints/conversations.py` (linhas 31-76)

**Status:** ✅ **IMPLEMENTADO**

Adiciona query param:
```python
chatbot_id: Optional[UUID] = Query(None, description="Filtrar por ID do chatbot")
```

E passa para service:
```python
return await service.list_conversations(
    organization_id=current_user.organization_id,
    chatbot_id=chatbot_id,  # ← PASSADO AQUI
    ...
)
```

---

### 2️⃣ **Service: `ConversationService.list_conversations()`**
**Arquivo:** `/home/administrator/pytake/backend/app/services/conversation_service.py` (linhas 46-64)

**Status:** ✅ **IMPLEMENTADO**

Adiciona parâmetro:
```python
async def list_conversations(
    self,
    organization_id: UUID,
    chatbot_id: Optional[UUID] = None,  # ← ADICIONADO
    ...
) -> List[Conversation]:
```

E passa para repository:
```python
return await self.repo.list_conversations(
    organization_id=organization_id,
    chatbot_id=chatbot_id,  # ← PASSADO AQUI
    ...
)
```

---

### 3️⃣ **Repository: `ConversationRepository.list_conversations()`**
**Arquivo:** `/home/administrator/pytake/backend/app/repositories/conversation.py` (linhas 67-115)

**Status:** ✅ **IMPLEMENTADO**

Adiciona filtro SQL:
```python
if chatbot_id:  # ← FILTRO ADICIONADO
    stmt = stmt.where(Conversation.chatbot_id == chatbot_id)
```

**Segurança:**
- ✅ Filtrada por `organization_id` (multi-tenancy)
- ✅ Filtrada por `deleted_at.is_(None)` (soft delete)
- ✅ SQLAlchemy parameterized queries (SQL injection safe)

---

## 📡 FLUXO DE IMPLEMENTAÇÃO (Layer Stack)

```
Frontend: GET /conversations/?chatbot_id={uuid}
  ↓
Endpoint (conversations.py): list_conversations(chatbot_id)
  ↓
Service (conversation_service.py): list_conversations(chatbot_id)
  ↓
Repository (conversation.py): list_conversations(chatbot_id)
  ↓
SQL: SELECT * FROM conversations 
     WHERE chatbot_id = ? 
     AND organization_id = ? 
     AND deleted_at IS NULL
```

---

## ✅ CHECKLIST DE VALIDAÇÃO

### Fase 1: Code Review ✅
- [x] Endpoint adiciona query param `chatbot_id`
- [x] Service passa `chatbot_id` para repository
- [x] Repository filtra corretamente por `chatbot_id`
- [x] Multi-tenancy preservado (organization_id filter)
- [x] Soft delete preservado (deleted_at filter)
- [x] Docs Swagger atualizado com novo param

### Fase 2: API Testing (PRÓXIMO)
- [ ] Docker container online com código novo
- [ ] Fazer login para obter JWT token
- [ ] Teste 1: GET /conversations/ sem chatbot_id (todos os chatbots)
- [ ] Teste 2: GET /conversations/?chatbot_id={uuid} (apenas daquele chatbot)
- [ ] Teste 3: GET /conversations/?chatbot_id={uuid}&status=open (com outros filtros)
- [ ] Validar multi-tenancy: não vazar dados entre orgs

---

## 🧪 TESTES PLANEJADOS

### Teste 1: Login
```
POST /api/v1/auth/login
Email: admin@pytake.dev
Password: admin123
```

Esperado: JWT access_token válido

---

### Teste 2: GET /conversations/ (sem filtro)
```
GET /api/v1/conversations/
Authorization: Bearer {token}
```

Esperado: Array com conversas de TODOS os chatbots

---

### Teste 3: GET /conversations/?chatbot_id={uuid}
```
GET /api/v1/conversations/?chatbot_id=f9651dd7-87fd-40c0-9c5b-599b0dfe9ea8
Authorization: Bearer {token}
```

Esperado: Array com conversas APENAS daquele chatbot

---

### Teste 4: Combinação de filtros
```
GET /api/v1/conversations/?chatbot_id={uuid}&status=open&limit=10
Authorization: Bearer {token}
```

Esperado: Conversas do chatbot específico COM status open

---

## 🚀 PRÓXIMOS PASSOS

### 1. Verificar Docker Status
```bash
docker ps | grep pytake-backend
# Confirmar container está rodando
```

### 2. Fazer Login
```bash
POST /api/v1/auth/login
Credenciais: admin@pytake.dev / admin123
```

### 3. Testar Endpoint
```bash
GET /api/v1/conversations/?chatbot_id={uuid}
Authorization: Bearer {token}
```

### 4. Validar Response
- ✅ Retorna apenas conversas do chatbot
- ✅ Sem data leaks entre organizações  
- ✅ Sem conversas com deleted_at != NULL

---

## 📚 DOCUMENTAÇÃO SWAGGER

Novo parâmetro documentado em:
```
GET /api/v1/conversations/
  Query Parameters:
    - chatbot_id (UUID, optional): Filtrar por ID do chatbot ← NOVO
    - skip (int, default: 0)
    - limit (int, default: 100)
    - status (string, optional): open|pending|resolved|closed
    - assigned_to_me (boolean, default: false)
    - department_id (UUID, optional)
    - queue_id (UUID, optional)
```

Acesso: http://localhost:8000/api/v1/docs

---

## 🔐 Security Checklist

- ✅ Multi-tenancy: Filtrada por `organization_id`
- ✅ Soft delete: Filtrada por `deleted_at.is_(None)`
- ✅ RBAC: Endpoint requer `get_current_user` dependency
- ✅ UUID validation: Query param é tipo UUID com parsing automático
- ✅ SQL injection: SQLAlchemy parameterized queries

---

## 📊 Impacto & Benefícios

### Antes (Sem filtro)
```
GET /conversations/
→ Retorna TODAS conversas da organização
→ Frontend recebe muitos dados
→ Filtragem ineficiente no frontend
→ Difícil de gerenciar múltiplos chatbots
```

### Depois (Com filtro `chatbot_id`)
```
GET /conversations/?chatbot_id=xxx
→ Retorna APENAS conversas daquele chatbot
→ Filtragem no backend (eficiente)
→ Frontend recebe menos dados (performance)
→ Fácil de gerenciar múltiplos chatbots
→ Alinhado com GET /flows/?chatbot_id
```

---

## ✨ Status Final

| Item | Status |
|------|--------|
| Code Implementation | ✅ COMPLETO |
| Code Review | ✅ COMPLETO |
| Swagger Docs | ✅ COMPLETO |
| Docker Build | ⏳ Precisamos verificar |
| API Testing | ⏳ PRÓXIMO |
| Frontend Integration | ⏳ PRÓXIMO |

---

**Próxima ação:** Fazer login e testar API com novo filtro  
**Estimado:** 5 minutos  
**Autor:** Backend Implementation Agent  
**Data:** 13 de dezembro de 2025
