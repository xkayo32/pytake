# 📋 Lista de Tarefas - Sistema de Transferência de Conversas com RBAC

**Status:** 🚀 Em Desenvolvimento
**Data de Início:** 13/12/2025
**Estimativa Total:** ~2h 55m
**Branch:** `develop`
**Progresso:** 5/16 completas (31.2%)

---

## 🔴 PRIORIDADE 1: Validações RBAC (Segurança)

### Tarefa 1.1: Adicionar RBAC na rota `/assign`
- [x] **Arquivo:** `backend/app/api/v1/endpoints/conversations.py` (linha ~340)
- [x] **Ação:** Trocar `Depends(get_current_user)` por `Depends(require_permission_dynamic("assign_conversation"))`
- [ ] **Validações:**
  - [ ] Testar que admin consegue fazer assign
  - [ ] Testar que viewer é bloqueado (403)
  - [ ] Testar que agent consegue fazer assign
- [x] **Tempo:** ~10 min (realizado)
- [x] **Status:** ✅ Completo

### Tarefa 1.2: Adicionar RBAC na rota `/transfer`
- [x] **Arquivo:** `backend/app/api/v1/endpoints/conversations.py` (linha ~365)
- [x] **Ação:** Trocar `Depends(get_current_user)` por `Depends(require_permission_dynamic("assign_conversation"))`
- [ ] **Validações:**
  - [ ] Testar que admin consegue fazer transfer
  - [ ] Testar que viewer é bloqueado (403)
- [x] **Tempo:** ~10 min (realizado)
- [x] **Status:** ✅ Completo

---

## 🟠 PRIORIDADE 2: Nova Rota - Transfer to Agent

### Tarefa 2.1: Criar schema para request/response
- [x] **Arquivo:** `backend/app/schemas/conversation.py`
- [x] **Ações:**
  - [x] Criar `ConversationTransferToAgent` com campos:
    - [x] `agent_id: UUID` (required)
    - [x] `note: Optional[str]` (max_length=500)
  - [x] Validar que agent_id é UUID válido
- [x] **Tempo:** ~10 min (realizado)
- [x] **Status:** ✅ Completo

### Tarefa 2.2: Criar método `transfer_to_agent()` na Service
- [x] **Arquivo:** `backend/app/services/conversation_service.py`
- [x] **Ações completadas:**
  - [x] Método com assinatura correta
  - [x] Validações: conversa existe, agente existe, agente ativo, status "available", pertence ao dept, capacidade ok
  - [x] Atualiza conversa: assigned_agent_id, status="active", assigned_at, queued_at=null
  - [x] Armazena histórico em extra_data["transfers"] com from_agent_id, to_agent_id, note, transferred_at
- [x] **Tempo:** ~25 min (realizado)
- [x] **Status:** ✅ Completo

### Tarefa 2.3: Criar rota POST `/transfer-to-agent`
- [x] **Arquivo:** `backend/app/api/v1/endpoints/conversations.py`
- [x] **Ações completadas:**
  - [x] Rota POST /{conversation_id}/transfer-to-agent
  - [x] Request: ConversationTransferToAgent
  - [x] Response: Conversation
  - [x] Auth: require_permission_dynamic("assign_conversation")
  - [x] Chamada service.transfer_to_agent(...)
  - [x] Documentação com validações explicadas
- [ ] **Testes:**
  - [ ] Transfer válido retorna 200
  - [ ] Sem permissão retorna 403
  - [ ] Agente inválido retorna 404
  - [ ] Agente sem capacidade retorna 409/400
- [x] **Tempo:** ~10 min (realizado)
- [x] **Status:** ✅ Completo

### Tarefa 2.4: Criar método helper para contar conversas do agente
- [x] **Arquivo:** `backend/app/repositories/conversation.py`
- [x] **Método:** `count_active_conversations_by_agent(organization_id, agent_id) -> int`
- [x] **Query:** COUNT WHERE assigned_agent_id=?, status='active', org_id=?, deleted_at IS NULL
- [x] **Tempo:** ~8 min (realizado junto com 2.2)
- [x] **Status:** ✅ Completo
  - [ ] Retornar count (int)
  - [ ] Teste: validar que retorna número correto
- [ ] **Tempo:** ~10 min
- [ ] **Status:** ⏳ Pendente

---

## 🟡 PRIORIDADE 3: Listagem - Agentes Disponíveis

### Tarefa 3.1: Criar schema para resposta de agentes
- [ ] **Arquivo:** `backend/app/schemas/user.py`
- [ ] **Ações:**
  - [ ] Criar `AgentAvailable` com campos:
    - [ ] `id: UUID`
    - [ ] `full_name: str`
    - [ ] `agent_status: str` (available, busy, away, offline)
    - [ ] `current_conversations: int` (count ativo)
    - [ ] `max_conversations: int` (do department)
    - [ ] `is_available: bool` (computed: current < max AND is_active AND status=available)
    - [ ] `last_activity: Optional[datetime]`
    - [ ] `skills: List[str]` (de AgentSkill)
- [ ] **Tempo:** ~15 min
- [ ] **Status:** ⏳ Pendente

### Tarefa 3.2: Criar método na Service para listar agentes disponíveis
- [ ] **Arquivo:** `backend/app/services/conversation_service.py` ou `user_service.py`
- [ ] **Ações:**
  - [ ] Criar método: `get_available_agents_for_conversation(conversation_id, organization_id)`
  - [ ] **Lógica:**
    - [ ] Buscar conversa
    - [ ] Extrair `assigned_department_id`
    - [ ] Se não tiver departamento, retornar lista vazia (ou todos?)
    - [ ] Buscar departamento
    - [ ] Para cada agent_id no department:
      - [ ] Buscar User
      - [ ] Contar conversas ativas
      - [ ] Montar AgentAvailable
    - [ ] Filtrar apenas agentes com capacidade (`current < max`)
    - [ ] Filtrar apenas `is_active = true`
    - [ ] Ordenar por:
      1. `agent_status` (available first)
      2. `current_conversations` (ascending - menos carga first)
  - [ ] Retornar List[AgentAvailable]
- [ ] **Tempo:** ~20 min
- [ ] **Status:** ⏳ Pendente

### Tarefa 3.3: Criar rota GET `/available-agents`
- [ ] **Arquivo:** `backend/app/api/v1/endpoints/conversations.py`
- [ ] **Ações:**
  - [ ] Criar nova rota:
    - [ ] Path: `GET /{conversation_id}/available-agents`
    - [ ] Response: `List[AgentAvailable]`
    - [ ] Auth: `Depends(get_current_user)` (só read, menos restritivo)
  - [ ] **Documentação:**
    - [ ] Descrição
    - [ ] Path parameters
    - [ ] Response (com exemplos)
    - [ ] Possíveis erros (404)
  - [ ] **Testes:**
    - [ ] Retorna lista de agentes do department
    - [ ] Agentes sem capacidade estão filtrados
    - [ ] Agentes inativos estão filtrados
    - [ ] Lista está ordenada corretamente
    - [ ] Conversa sem department retorna lista vazia
- [ ] **Tempo:** ~15 min
- [ ] **Status:** ⏳ Pendente

---

## 💚 PRIORIDADE 4: Melhorias Adicionais (Nice to Have)

### Tarefa 4.1: Validação de department no `/assign`
- [ ] **Arquivo:** `backend/app/services/conversation_service.py`
- [ ] **Dentro de:** `assign_to_agent()`
- [ ] **Ações:**
  - [ ] Após buscar conversa e agente
  - [ ] Se conversa tem `assigned_department_id`:
    - [ ] Buscar department
    - [ ] Validar que `agent_id in department.agent_ids`
    - [ ] Se não, lançar `BadRequestException`
  - [ ] Testes: validar erro 400 quando agent não está no dept
- [ ] **Tempo:** ~10 min
- [ ] **Status:** ⏳ Pendente

### Tarefa 4.2: Criar rota GET `/departments/{department_id}/agents`
- [ ] **Arquivo:** `backend/app/api/v1/endpoints/departments.py`
- [ ] **Ações:**
  - [ ] Criar nova rota:
    - [ ] Path: `GET /{department_id}/agents`
    - [ ] Query params:
      - [ ] `status: Optional[str]` (available, busy, away, offline)
      - [ ] `include_stats: bool = false`
    - [ ] Response: `List[AgentAvailable]`
  - [ ] **Lógica:**
    - [ ] Buscar department
    - [ ] Validar que pertence à org do user
    - [ ] Para cada agent_id:
      - [ ] Buscar User + contar conversas
      - [ ] Se `status` param, filtrar
      - [ ] Montar AgentAvailable com stats opcionais
    - [ ] Retornar lista
  - [ ] **Testes:**
    - [ ] Retorna agentes do department
    - [ ] Filtro por status funciona
    - [ ] Stats incluem dados corretos
- [ ] **Tempo:** ~15 min
- [ ] **Status:** ⏳ Pendente

### Tarefa 4.3: Adicionar métrica de carga ao modelo User
- [ ] **Arquivo:** `backend/app/models/user.py`
- [ ] **Ações:**
  - [ ] Adicionar property: `current_conversation_count: int`
  - [ ] Ou criar método para contar dinamicamente
  - [ ] Usar em serialização quando needed
- [ ] **Tempo:** ~5 min
- [ ] **Status:** ⏳ Pendente

---

## 🧪 Testes Integrados (Executar ao Final)

### Tarefa 5.1: Teste de fluxo completo
- [ ] **Cenário:** Agent faz transfer de conversa para outro agent
- [ ] **Passos:**
  1. [ ] Criar conversa em queue no department A
  2. [ ] Chamar `/available-agents` → retorna lista
  3. [ ] Selecionar agente disponível
  4. [ ] Chamar `/transfer-to-agent` → sucesso
  5. [ ] Validar conversa tem novo agent_id
  6. [ ] Validar histórico foi armazenado
  7. [ ] Validar RBAC bloqueou viewer
- [ ] **Tempo:** ~15 min
- [ ] **Status:** ⏳ Pendente

### Tarefa 5.2: Teste de validações
- [ ] **Cenário 1:** Agent sem capacidade
  - [ ] Agent já tem max_conversations
  - [ ] Transfer falha com 409
- [ ] **Cenário 2:** Agent wrong department
  - [ ] Tentar transferir para agent de outro dept
  - [ ] Falha com 400
- [ ] **Cenário 3:** Agent inativo
  - [ ] Agent tem `is_active = false`
  - [ ] Falha com 400
- [ ] **Tempo:** ~15 min
- [ ] **Status:** ⏳ Pendente

---

## 📦 Entrega Final

### Tarefa 6.1: Git commit e push
- [ ] **Branch:** `feature/conversation-transfer-rbac`
- [ ] **Commit message template:**
  ```
  feat: add conversation transfer with rbac and agent availability | Author: Kayo Carvalho Fernandes
  
  - PRIORIDADE 1: Add RBAC validation to assign/transfer routes
  - PRIORIDADE 2: Add transfer-to-agent endpoint with validations
  - PRIORIDADE 3: Add available-agents endpoint for UI
  - PRIORIDADE 4: Add department validation and metrics
  ```
- [ ] **Checklist:**
  - [ ] Todos os testes passam
  - [ ] Sem erros de import
  - [ ] Documentação completa
  - [ ] Sem breaking changes
- [ ] **Tempo:** ~10 min
- [ ] **Status:** ⏳ Pendente

### Tarefa 6.2: Documentação API
- [ ] **Arquivo:** `docs/API_DOCUMENTATION.md`
- [ ] **Adicionar:**
  - [ ] Endpoint `/conversations/{id}/transfer-to-agent`
  - [ ] Endpoint `/conversations/{id}/available-agents`
  - [ ] Endpoint `/departments/{id}/agents`
- [ ] **Tempo:** ~10 min
- [ ] **Status:** ⏳ Pendente

---

## 📊 Resumo de Progresso

| Prioridade | Tarefas | Status | Tempo |
|----------|---------|--------|--------|
| 1 (RBAC) | 2 | 2/2 ✅ | 20 min |
| 2 (Transfer) | 4 | 0/4 ⏳ | 65 min |
| 3 (Available) | 3 | 0/3 ⏳ | 50 min |
| 4 (Extras) | 3 | 0/3 ⏳ | 30 min |
| 5 (Tests) | 2 | 0/2 ⏳ | 30 min |
| 6 (Delivery) | 2 | 0/2 ⏳ | 20 min |
| **TOTAL** | **16** | **2/16** | **~3h 00m** |

---

## 🚀 Como Usar Esta Lista

1. **Clicar na checkbox** conforme completa cada tarefa
2. **Manter tempo atualizado** se diferente da estimativa
3. **Adicionar observações** em caso de problemas
4. **Mover para Tarefa seguinte** quando completar milestone

**Sugestão:** Implementar na ordem: **1 → 2 → 3 → 5 → 6**

Pular Prioridade 4 inicialmente (nice to have).

---

**Criado em:** 13/12/2025 23:45
**Próximo passo:** Começar com Tarefa 1.1 (RBAC no /assign)
