# 🎯 Guia Rápido de Implementação

## 📍 Status Atual
- **Arquivos modificados:** 0
- **Testes criados:** 0
- **Endpoints novos:** 0
- **Progresso:** 0%

---

## 🚀 Começar Agora

### Pré-requisitos (Fazer ANTES de começar)
```bash
# 1. Verificar git status
cd /home/administrator/pytake
git status

# 2. Criar branch de feature
git checkout -b feature/conversation-transfer-rbac

# 3. Verificar que backend está rodando
docker compose logs backend --tail 10
```

---

## 📋 Ordem de Execução Recomendada

### **Fase 1: RBAC (30 min)** ✅ Segurança
1. ✏️ Tarefa 1.1: Adicionar RBAC em `/assign`
2. ✏️ Tarefa 1.2: Adicionar RBAC em `/transfer`

### **Fase 2: Transfer to Agent (65 min)** 🎯 Core Feature
1. ✏️ Tarefa 2.1: Criar schema `ConversationTransferToAgent`
2. ✏️ Tarefa 2.2: Criar método `transfer_to_agent()` com validações
3. ✏️ Tarefa 2.4: Criar método `count_active_conversations_by_agent()`
4. ✏️ Tarefa 2.3: Criar rota POST `/transfer-to-agent`

### **Fase 3: Available Agents (50 min)** 💡 UX
1. ✏️ Tarefa 3.1: Criar schema `AgentAvailable`
2. ✏️ Tarefa 3.2: Criar método `get_available_agents_for_conversation()`
3. ✏️ Tarefa 3.3: Criar rota GET `/available-agents`

### **Fase 4: Testes & Entrega (50 min)** ✨ Qualidade
1. 🧪 Tarefa 5.1: Teste de fluxo completo
2. 🧪 Tarefa 5.2: Teste de validações
3. 📝 Tarefa 6.1: Git commit
4. 📚 Tarefa 6.2: Documentação

---

## 📁 Arquivos Principais a Modificar

```
backend/app/
├── api/v1/endpoints/
│   └── conversations.py          ← Adicionar 2 rotas novas
├── services/
│   └── conversation_service.py   ← Adicionar 1 método novo
├── repositories/
│   └── conversation.py           ← Adicionar 1 método helper
└── schemas/
    ├── conversation.py           ← Adicionar 1 schema novo
    └── user.py                   ← Adicionar 1 schema novo
```

---

## 🔐 Imports Necessários (Adicionar conforme precisa)

```python
# Em conversations.py - rotas
from app.api.deps import require_permission_dynamic, require_role

# Em conversation_service.py - service
from app.core.exceptions import BadRequestException, ConflictException
from app.repositories.conversation import ConversationRepository
from app.repositories.department import DepartmentRepository
from app.repositories.user import UserRepository
from datetime import datetime
from uuid import UUID

# Em conversation.py - schema
from pydantic import BaseModel, Field
from typing import Optional, List
from uuid import UUID
from datetime import datetime

# Em user.py - schema
from pydantic import BaseModel, computed_field
from typing import List
from uuid import UUID
from datetime import datetime
```

---

## 💾 Padrões de Código a Seguir

### Pattern: Method Signature
```python
async def method_name(
    self,
    conversation_id: UUID,
    organization_id: UUID,
    additional_param: str,
) -> ReturnType:
    """
    Brief description.
    
    Args:
        conversation_id: Description
        organization_id: Description
        additional_param: Description
        
    Returns:
        Description
        
    Raises:
        NotFoundException: When X
        BadRequestException: When Y
    """
```

### Pattern: Validação em Service
```python
# 1. Buscar entidade
entity = await self.repo.get_by_id(id, organization_id)
if not entity:
    raise NotFoundException("Entity not found")

# 2. Validar lógica
if not entity.is_active:
    raise BadRequestException("Entity is inactive")

# 3. Validar relacionamento
if entity.department_id != other.department_id:
    raise BadRequestException("Entities in different departments")

# 4. Executar ação
update_data = {"field": value}
updated = await self.repo.update(id, update_data)
return updated
```

### Pattern: Rota com RBAC
```python
@router.post("/{id}/action", response_model=ResponseSchema)
async def action(
    id: UUID,
    data: RequestSchema,
    current_user: User = Depends(require_permission_dynamic("permission_name")),
    db: AsyncSession = Depends(get_db),
):
    """
    Action description.
    
    **Permissions:** permission_name
    **Roles:** org_admin, super_admin
    """
    service = ConversationService(db)
    return await service.method(
        id=id,
        organization_id=current_user.organization_id,
        param=data.param,
    )
```

---

## 🧪 Como Testar Sem Pytest

### Teste Manual via cURL
```bash
# 1. RBAC Test - Sem permissão
curl -X POST http://localhost:8000/api/v1/conversations/{id}/assign \
  -H "Authorization: Bearer $VIEWER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"agent_id":"..."}' \
  # Esperado: 403 Forbidden

# 2. Transfer to Agent Test
curl -X POST http://localhost:8000/api/v1/conversations/{id}/transfer-to-agent \
  -H "Authorization: Bearer $AGENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"agent_id":"uuid-aqui","note":"Test"}' \
  # Esperado: 200 OK

# 3. Available Agents Test
curl -X GET http://localhost:8000/api/v1/conversations/{id}/available-agents \
  -H "Authorization: Bearer $AGENT_TOKEN" \
  # Esperado: 200 OK com lista
```

### Teste via Python Requests
```python
import requests

# Setup
token = "bearer-token-aqui"
headers = {"Authorization": f"Bearer {token}"}
base_url = "http://localhost:8000/api/v1"

# Test 1: RBAC
response = requests.post(
    f"{base_url}/conversations/{conv_id}/assign",
    json={"agent_id": agent_id},
    headers=headers
)
assert response.status_code == 403  # ou 200 se tiver permissão

# Test 2: Transfer to Agent
response = requests.post(
    f"{base_url}/conversations/{conv_id}/transfer-to-agent",
    json={"agent_id": agent_id, "note": "Teste"},
    headers=headers
)
assert response.status_code == 200
assert response.json()["assigned_agent_id"] == agent_id

# Test 3: Available Agents
response = requests.get(
    f"{base_url}/conversations/{conv_id}/available-agents",
    headers=headers
)
assert response.status_code == 200
assert isinstance(response.json(), list)
```

---

## 🛠️ Troubleshooting Comum

### Erro: "Module not found"
**Solução:** Adicionar import no topo do arquivo
```python
from app.models.department import Department  # Add this
```

### Erro: "ConflictException não foi importado"
**Solução:** Importar de core.exceptions
```python
from app.core.exceptions import ConflictException, BadRequestException
```

### Erro: Query retorna None
**Solução:** Verificar se filtered by organization_id
```python
# ❌ Errado
stmt = select(Conversation).where(Conversation.id == id)

# ✅ Correto
stmt = select(Conversation).where(
    Conversation.id == id,
    Conversation.organization_id == org_id
)
```

### Erro: RBAC test falha
**Solução:** Verificar que user tem role_id preenchido
```python
# Debug
print(current_user.role)  # String role (legacy)
print(current_user.role_id)  # UUID role (new)
print(current_user.role_obj)  # Role object
```

---

## 📚 Referências Úteis

### Arquivos de Exemplo no Projeto
- **RBAC:** `backend/app/api/v1/endpoints/chatbots.py` (linha ~50)
- **Service com validações:** `backend/app/services/conversation_service.py` (linha ~420)
- **Schema com Field:** `backend/app/schemas/conversation.py`
- **Repository:** `backend/app/repositories/conversation.py`

### Documentação
- **RBAC:** `backend/app/api/deps.py` (linhas 210-240)
- **Exceptions:** `backend/app/core/exceptions.py`
- **Models:** `backend/app/models/`

---

## ✅ Checklist Final

Antes de fazer commit:

- [ ] Todos os imports estão presentes
- [ ] Sem erros de syntax
- [ ] RBAC foi testado (403 para viewers)
- [ ] Validações lançam exceções corretas
- [ ] Histórico de transfers está sendo armazenado
- [ ] Available agents está ordenado corretamente
- [ ] Documentação das rotas está completa
- [ ] Sem breaking changes
- [ ] Backend ainda está rodando

```bash
# Quick check
docker compose logs backend --tail 20 | grep -i error
```

---

## 🚀 Próximo Passo

👉 **Começar com Tarefa 1.1**

Abra `backend/app/api/v1/endpoints/conversations.py` na linha 340 e:
1. Encontre a função `assign_conversation()`
2. Troque `get_current_user` por `require_permission_dynamic("assign_conversation")`
3. Teste que funciona

**Tempo estimado:** 15 minutos

---

**Dúvidas ou problemas?** Consulte a lista completa em `LISTA_TAREFAS_IMPLEMENTACAO.md`
