# Separação de Filas e Departamentos

## Visão Geral

Este documento descreve a refatoração que separa o conceito de **Filas** (Queues) e **Departamentos** (Departments) no PyTake, permitindo uma organização mais flexível e poderosa do atendimento.

## Problema Original

Antes desta refatoração:
- **Fila** era apenas um estado da conversa (`status="queued"`)
- Não havia tabela `queues` separada
- Cada departamento tinha uma "fila implícita" (conversas com `department_id` + `status="queued"`)
- **Limitações:**
  - ❌ Não permitia múltiplas filas por departamento
  - ❌ Configurações de fila misturadas em Department
  - ❌ Sem filas especializadas (VIP, Normal, Técnico)
  - ❌ Difícil rastrear métricas por tipo de fila

## Nova Arquitetura

### Hierarquia

```
Organization (Empresa)
  └─> Department (Departamento: "Vendas", "Suporte", "Financeiro")
        ├─> Queue 1 (Fila: "VIP")
        │     ├─> priority: 100
        │     ├─> sla_minutes: 5
        │     ├─> auto_assign: true
        │     └─> routing_mode: "round_robin"
        ├─> Queue 2 (Fila: "Normal")
        │     ├─> priority: 50
        │     ├─> sla_minutes: 30
        │     └─> auto_assign: true
        └─> Queue 3 (Fila: "Técnica")
              ├─> priority: 75
              ├─> sla_minutes: 15
              └─> routing_mode: "load_balance"
```

### Relacionamentos

```
Organization 1:N Department 1:N Queue

Conversation:
  - department_id → Qual departamento (Vendas, Suporte)
  - queue_id → Qual fila dentro do departamento (VIP, Normal, Técnica)
```

## Modelo Queue

### Campos Principais

```python
class Queue:
    # Identificação
    id: UUID
    organization_id: UUID  # FK para organizations
    department_id: UUID    # FK para departments
    name: str              # "Fila VIP"
    slug: str              # "fila-vip"
    description: str       # Descrição da fila

    # Aparência
    color: str             # "#10B981" (hex)
    icon: str              # Ícone (opcional)

    # Status
    is_active: bool        # Fila ativa?

    # Prioridade
    priority: int          # 0-100 (maior = mais prioritária)

    # SLA (Service Level Agreement)
    sla_minutes: int       # Tempo máximo de espera (min)

    # Roteamento
    routing_mode: str      # round_robin, load_balance, manual, skills_based
    auto_assign_conversations: bool
    max_conversations_per_agent: int

    # Estatísticas (atualizadas periodicamente)
    total_conversations: int
    active_conversations: int
    queued_conversations: int
    completed_conversations: int

    # Métricas
    average_wait_time_seconds: int
    average_response_time_seconds: int
    average_resolution_time_seconds: int
    customer_satisfaction_score: int  # 0-100

    # Configurações flexíveis (JSONB)
    settings: dict
    # Exemplos:
    # - allowed_agent_ids: [uuid1, uuid2] - Apenas agentes específicos
    # - skills_required: ["python", "billing"] - Skills-based routing
    # - overflow_queue_id: uuid - Fila de overflow quando cheia
```

## API Endpoints

### Gerenciamento de Filas

```bash
# Criar fila
POST /api/v1/queues
{
  "department_id": "uuid-departamento",
  "name": "Fila VIP",
  "slug": "fila-vip",
  "description": "Fila prioritária para clientes VIP",
  "priority": 100,
  "sla_minutes": 5,
  "routing_mode": "round_robin",
  "color": "#10B981"
}

# Listar filas
GET /api/v1/queues?department_id=uuid&is_active=true&search=vip

# Obter fila
GET /api/v1/queues/{queue_id}

# Obter fila por slug
GET /api/v1/queues/by-slug/fila-vip?department_id=uuid

# Atualizar fila
PUT /api/v1/queues/{queue_id}
{
  "name": "Fila VIP Premium",
  "priority": 100,
  "sla_minutes": 3
}

# Deletar fila (soft delete)
DELETE /api/v1/queues/{queue_id}

# Deletar múltiplas filas
POST /api/v1/queues/bulk-delete
{
  "queue_ids": ["uuid1", "uuid2", "uuid3"]
}
```

### Endpoints de Atendimento (Queue Pull)

```bash
# Listar conversas na fila (com filtros opcionais)
GET /api/v1/queue?department_id=uuid&queue_id=uuid&skip=0&limit=100

# Pegar próxima conversa da fila
POST /api/v1/queue/pull?department_id=uuid&queue_id=uuid
# Retorna a conversa com maior prioridade da fila especificada
```

## Exemplos de Uso

### Cenário 1: E-commerce com Filas VIP e Normal

```python
# Departamento: Vendas
department_id = "uuid-vendas"

# Fila VIP (clientes premium)
queue_vip = {
    "department_id": department_id,
    "name": "Fila VIP",
    "slug": "vip",
    "priority": 100,
    "sla_minutes": 5,
    "color": "#FFD700",  # Dourado
    "routing_mode": "round_robin",
}

# Fila Normal (clientes comuns)
queue_normal = {
    "department_id": department_id,
    "name": "Fila Normal",
    "slug": "normal",
    "priority": 50,
    "sla_minutes": 30,
    "color": "#10B981",  # Verde
    "routing_mode": "load_balance",
}
```

### Cenário 2: Suporte Técnico com Especialização

```python
# Departamento: Suporte
department_id = "uuid-suporte"

# Fila: Problemas de Rede
queue_network = {
    "department_id": department_id,
    "name": "Problemas de Rede",
    "slug": "rede",
    "priority": 75,
    "sla_minutes": 15,
    "settings": {
        "skills_required": ["networking", "infrastructure"],
        "allowed_agent_ids": ["uuid-agente1", "uuid-agente2"]
    }
}

# Fila: Problemas de Software
queue_software = {
    "department_id": department_id,
    "name": "Problemas de Software",
    "slug": "software",
    "priority": 60,
    "sla_minutes": 20,
    "settings": {
        "skills_required": ["development", "debugging"]
    }
}
```

### Cenário 3: Agente pegando conversa de fila específica

```python
# Agente quer pegar próxima conversa da Fila VIP do departamento Vendas
POST /api/v1/queue/pull?department_id=uuid-vendas&queue_id=uuid-fila-vip

# Sistema retorna conversa com:
# 1. Maior queue_priority
# 2. Mais tempo em fila (queued_at mais antigo)
# 3. Atribui automaticamente ao agente
```

## Migrações de Dados

### Migration Aplicada

**Arquivo:** `20251020_1952_3f9622b72418_add_queues_table.py`

**Mudanças:**
1. ✅ Cria tabela `queues`
2. ✅ Adiciona coluna `queue_id` em `conversations`
3. ✅ Cria índices para performance
4. ✅ Foreign keys com CASCADE/SET NULL

**Aplicar:**
```bash
podman exec pytake-backend alembic upgrade head
```

**Rollback (se necessário):**
```bash
podman exec pytake-backend alembic downgrade -1
```

## Benefícios

### 1. Filas Especializadas
- ✅ Múltiplas filas por departamento
- ✅ Priorização granular (VIP, Normal, Urgente)
- ✅ Configurações específicas por tipo de atendimento

### 2. SLA Diferenciado
- ✅ Tempo máximo de espera por fila
- ✅ Alertas quando SLA está sendo violado
- ✅ Métricas de compliance por fila

### 3. Roteamento Inteligente
- ✅ Round-robin (distribuição igual)
- ✅ Load balance (balanceamento por carga)
- ✅ Skills-based (baseado em habilidades)
- ✅ Manual (agente escolhe)

### 4. Métricas Detalhadas
- ✅ Estatísticas por fila
- ✅ Tempo médio de espera por tipo
- ✅ Taxa de resolução por especialização
- ✅ Satisfação do cliente por fila

### 5. Flexibilidade
- ✅ Overflow entre filas (se uma estiver cheia)
- ✅ Restrição de agentes por fila
- ✅ Requisitos de skills
- ✅ Configurações customizáveis (JSONB)

## Próximos Passos

### Backend (Completo ✅)
- [x] Modelo Queue
- [x] Migration para tabela queues
- [x] QueueRepository
- [x] QueueService
- [x] Endpoints CRUD /api/v1/queues
- [x] Atualizar ConversationService
- [x] Atualizar endpoints /api/v1/queue

### Frontend (Pendente)
- [ ] Página de gerenciamento de filas (/admin/queues)
- [ ] UI para criar/editar filas
- [ ] Filtros de fila na página de atendimento
- [ ] Seletor de fila no "Pegar Próxima"
- [ ] Dashboard de métricas por fila
- [ ] Indicadores de SLA

## Compatibilidade Retroativa

- ✅ **queue_id é opcional** em Conversation
- ✅ Endpoints antigos continuam funcionando (sem queue_id)
- ✅ Sistema funciona com ou sem filas definidas
- ✅ Migration é reversível (downgrade seguro)

## Conclusão

Esta refatoração permite que o PyTake ofereça um sistema de filas muito mais poderoso e flexível, alinhado com as necessidades de empresas que precisam de:

- **Priorização de clientes** (VIP, Normal, Urgente)
- **Especialização de atendimento** (Técnico, Vendas, Billing)
- **Gestão de SLA** (tempos diferentes por tipo de fila)
- **Métricas detalhadas** (performance por fila)

O sistema agora está pronto para escalar e atender desde pequenas empresas até grandes operações de atendimento com centenas de agentes.

---

**Implementado em:** 2025-10-20
**Migration:** 3f9622b72418
**Commit:** 4a41e52
