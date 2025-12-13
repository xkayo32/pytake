# 🎨 VISUALIZAÇÕES: SISTEMA DE FILAS

---

## 1. DIAGRAMA COMPLETO: CAMINHO DO NÚMERO PELO FLUXO ATÉ FILA

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                              CLIENTE ENVIA NÚMERO                                     │
│                            (ou Flow Automation dispara)                               │
└──────────────────────────────────┬───────────────────────────────────────────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │   Meta Cloud API Webhook    │
                    │   (POST /webhooks/whatsapp)  │
                    └──────────────┬───────────────┘
                                   │
              ┌────────────────────▼────────────────────┐
              │  WhatsAppService.process_webhook()      │
              │  ✓ Extrair: org_id, phone_number_id     │
              │  ✓ Validar HMAC signature               │
              │  ✓ Parse JSON da mensagem               │
              └────────────────┬─────────────────────────┘
                               │
        ┌──────────────────────▼──────────────────────┐
        │  WhatsAppService._process_incoming_message()│
        │  ✓ Buscar/criar Contact                     │
        │  ✓ Buscar/criar Conversation                │
        │  ✓ Se default_flow_id: inicializar fluxo    │
        │  ✓ Criar Message (inbound)                  │
        └──────────────────┬───────────────────────────┘
                           │
           ┌───────────────▼────────────────┐
           │  is_bot_active && flow_id?     │
           │  (CONDIÇÃO CORRIGIDA)          │
           └───────────────┬────────────────┘
                    SIM   │   NÃO
         ┌──────────────┬──┴─────────────┐
         │              │                 │
    ┌────▼────┐    ┌────▼────┐      ┌────▼────────┐
    │ Handoff │    │ Continue │      │  Sem fluxo  │
    │  Node?  │    │  fluxo   │      │  continua   │
    │   SIM   │    │  (outro  │      │  (aguarda   │
    │         │    │  node)   │      │   entrada)  │
    └────┬────┘    └────┬────┘      └─────────────┘
         │              │
         │         ┌─────▼──────────────┐
         │         │  Próximo node?     │
         │         │  ✓ question        │
         │         │  ✓ text            │
         │         │  ✓ condition       │
         │         │  ✓ action          │
         │         │  ✓ api_call        │
         │         │  ✓ ... (11+ tipos) │
         │         └─────┬──────────────┘
         │               │
         │          ┌────▼────────────────────┐
         │          │  _execute_node()        │
         │          │  ✓ Execute lógica       │
         │          │  ✓ Enviar resposta      │
         │          │  ✓ Atualizar state      │
         │          │  ✓ Próximo node ID      │
         │          └────┬────────────────────┘
         │               │
         └───────────────┘
                 │
    ┌────────────▼────────────────────┐
    │  _execute_handoff() ACIONADO     │  ← 🔴 VOCÊ ESTÁ AQUI
    │  (Handoff Node - Ir para Fila)   │
    └────────────┬────────────────────┘
                 │
    ┌────────────▼──────────────────────────────────────────────┐
    │  Extrair configurações do Handoff Node:                   │
    │  ├─ handoffType: "queue" | "department" | "agent"         │
    │  ├─ queueId: UUID (se queue)                              │
    │  ├─ departmentId: UUID (se department)                    │
    │  ├─ agentId: UUID (se agent)                              │
    │  ├─ priority: "low"|"normal"|"high"|"urgent"              │
    │  ├─ contextMessage: "Contexto do handoff..."              │
    │  ├─ sendTransferMessage: true/false                       │
    │  └─ transferMessage: "Texto para cliente..."              │
    └────────────┬────────────────────────────────────────────┘
                 │
    ┌────────────▼──────────────────────────────────────────────┐
    │  3 CAMINHOS POSSÍVEIS:                                    │
    │  ├─ PATH A: handoffType = "queue" → Vai direto           │
    │  ├─ PATH B: handoffType = "department" → Busca fila ativa │
    │  └─ PATH C: handoffType = "agent" → Atribui direto        │
    └────────────┬────────────────────────────────────────────────┘
                 │
   ┌─────────────┼─────────────┐
   │             │             │
   │ PATH A      │ PATH B      │ PATH C
   │ (Queue)     │ (Depto)     │ (Agent)
   │             │             │
┌──▼──┐   ┌─────▼──────────┐ ┌─▼─────────┐
│UUID │   │ Buscar PRIMEIRA│ │ UUID do   │
│da   │   │ FILA ATIVA do  │ │ agente    │
│fila │   │ departamento   │ │ específico│
│     │   │ (by priority)  │ │           │
└──┬──┘   └────────┬───────┘ └─┬─────────┘
   │               │           │
   └───────────────┬───────────┘
                   │
        ┌──────────▼──────────┐
        │  Validar UUIDs      │
        │  (try/except)       │
        │  if inválido:       │
        │    logger.error()   │
        │    return None      │
        └──────────┬──────────┘
                   │
        ┌──────────▼──────────────────────┐
        │  Enviar mensagem ao cliente?    │
        │  (sendTransferMessage = true)   │
        │  ✓ Meta Cloud API ou            │
        │  ✓ Evolution API                │
        │  ✓ Salvar no banco (Message)    │
        └──────────┬──────────────────────┘
                   │
        ┌──────────▼───────────────────────┐
        │  Se é Handoff para FILA:         │
        │  → ConversationService.          │
        │    assign_to_queue_with_overflow │
        └──────────┬───────────────────────┘
                   │
        ┌──────────▼────────────────────────────────┐
        │  check_and_apply_overflow() EXECUTA:      │
        │  ─────────────────────────────────────    │
        │  IF queue.max_queue_size? AND             │
        │     queue.overflow_queue_id? AND          │
        │     queue.queued_conversations            │
        │     >= queue.max_queue_size THEN          │
        │    ✓ Redirecionar para overflow_queue_id  │
        │    ✓ Log no extra_data["overflow_history"]│
        │  ELSE                                      │
        │    ✓ Manter na fila original              │
        └──────────┬────────────────────────────────┘
                   │
        ┌──────────▼────────────────────────────┐
        │  Atualizar Conversation:               │
        │  ├─ queue_id = final_queue_id          │
        │  ├─ status = "queued"                  │
        │  ├─ queued_at = datetime.utcnow()      │
        │  ├─ queue_priority = priority_map[...] │
        │  ├─ is_bot_active = FALSE  ← 🔴 CRÍTICO│
        │  └─ extra_data.handoff_context = "..." │
        └──────────┬────────────────────────────┘
                   │
        ┌──────────▼────────────────────────────┐
        │  Se Handoff direto para AGENTE:        │
        │  ├─ assigned_agent_id = agent_id      │
        │  ├─ status = "active"                 │
        │  ├─ queued_at = NULL  ← Sem espera    │
        │  └─ is_bot_active = FALSE             │
        └──────────┬────────────────────────────┘
                   │
        ┌──────────▼────────────────────────────┐
        │  _finalize_flow()                      │
        │  ✓ Limpar estado do fluxo              │
        │  ✓ Emitir WebSocket event              │
        │  ✓ Log final                           │
        └──────────┬────────────────────────────┘
                   │
    ┌──────────────▼──────────────────┐
    │  🎯 CONVERSA ENTRA NA FILA      │
    │  ├─ Visível em GET /queue       │
    │  ├─ Pronta para agente puxar    │
    │  ├─ Contexto em extra_data      │
    │  ├─ Bot DESATIVADO              │
    │  └─ Aguardando human agent      │
    └─────────────────────────────────┘
```

---

## 2. DIAGRAMA: OVERFLOW AUTOMÁTICO

```
QUEUE SUPORTE
└─ max_queue_size: 50
└─ overflow_queue_id: QUEUE_OVERFLOW

QUEUE OVERFLOW
└─ max_queue_size: 25
└─ overflow_queue_id: NULL (fim da linha)


CENÁRIO: Entram 70 conversas

┌──────────────────────────────────────┐
│  Conversa 1-50 entram                │
│  ✓ queue_id = QUEUE SUPORTE          │
│  ✓ queued_conversations = 50         │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│  Conversa 51 tenta entrar            │
│                                      │
│  check_and_apply_overflow():         │
│  IF 50 >= 50? ✓ SIM (fila cheia)    │
│    IF overflow_queue has space?      │
│      queued_conv (0) < max (25)? ✓   │
│      → Retorna QUEUE_OVERFLOW.id     │
│                                      │
│  ✓ queue_id = QUEUE OVERFLOW         │
│  ✓ overflow_history = [{             │
│      original_queue_id: SUPORTE,     │
│      overflow_queue_id: OVERFLOW,    │
│      overflowed_at: <datetime>       │
│    }]                                │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│  Conversa 52-75 entram (até 25)      │
│  ✓ queue_id = QUEUE OVERFLOW         │
│  ✓ queued_conversations (OVERFLOW) = 25
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│  Conversa 76 tenta entrar            │
│                                      │
│  check_and_apply_overflow():         │
│  IF 50 >= 50? ✓ SIM                 │
│    IF overflow_queue.queued (25)     │
│       < max_queue_size (25)? ✗ NÃO  │
│      → Overflow queue também cheio   │
│      → Retorna None                  │
│                                      │
│  assign_to_queue_with_overflow():    │
│  overflow_queue_id = None            │
│  → final_queue_id = queue_id         │
│  → Coloca na QUEUE SUPORTE mesmo     │
│     (sem overflow, fica na original) │
│                                      │
│  ✓ queue_id = QUEUE SUPORTE          │
│  ✓ queued_conversations (SUPORTE)    │
│    agora = 51 (excede max_size!)    │
└──────────────────────────────────────┘

RESULTADO FINAL:
┌──────────────────────────────────────┐
│ QUEUE SUPORTE: 51 conversas (cheia)  │
│ QUEUE OVERFLOW: 25 conversas (cheia) │
│ Próximas entram mesmo que acima do   │
│ limite (overflow esgotado)           │
└──────────────────────────────────────┘
```

---

## 3. DIAGRAMA: PULL FROM QUEUE (AGENTE PEGANDO CONVERSA)

```
QUEUE SUPORTE (50 conversas em espera)
├─ João Silva      (priority: 100, queued_at: 14:30:00)  ← PRIMEIRO
├─ Maria Santos    (priority: 100, queued_at: 14:30:45)
├─ Pedro Costa     (priority: 80,  queued_at: 14:31:00)
├─ Ana Silva       (priority: 80,  queued_at: 14:31:15)
├─ Felipe Oliveira (priority: 50,  queued_at: 14:32:00)
├─ Carlos Mendes   (priority: 50,  queued_at: 14:32:30)
├─ ... (44 mais)   (vários)


AGENTE A entra no sistema → pull_from_queue()

┌────────────────────────────────────────────────────────┐
│  FILTRO 1: BÁSICO                                      │
│  ├─ status = "queued" ✓                                │
│  ├─ organization_id = agentA.org ✓                     │
│  ├─ deleted_at IS NULL ✓                               │
│  │                                                     │
│  └─ RETÉM: Todos os 50 na fila                         │
└────────────────────────────────────────────────────────┘
                      │
                      ▼
┌────────────────────────────────────────────────────────┐
│  ORDEM: queue_priority DESC, queued_at ASC             │
│  ├─ João Silva (100, 14:30:00)   ← Agora é o primeiro │
│  ├─ Maria Santos (100, 14:30:45) ← Segundo             │
│  ├─ Pedro Costa (80, 14:31:00)                         │
│  ├─ ...                                                │
│  └─ RETÉM: Mesmos 50, mas ordenados                    │
└────────────────────────────────────────────────────────┘
                      │
                      ▼
┌────────────────────────────────────────────────────────┐
│  FILTRO 2: allowed_agent_ids                           │
│  queue.settings.get("allowed_agent_ids") = ?           │
│                                                        │
│  CASO A: Sem restrição (vazio ou None)                │
│  │  ✓ PASSA: Agente A pode puxar                       │
│  │                                                     │
│  CASO B: ["agentB", "agentC"]                         │
│  │  ✗ FALHA: Agente A NÃO está na lista               │
│  │  continue → Próxima conversa                        │
│  │                                                     │
│  RESULTADO: João Silva volta para fila                 │
│             Maria Santos é checada...                  │
└────────────────────────────────────────────────────────┘
                      │
                      ▼
┌────────────────────────────────────────────────────────┐
│  FILTRO 3: skills_required                             │
│  queue.settings.get("skills_required") = ?             │
│                                                        │
│  CASO A: Sem skills requerida (vazio)                 │
│  │  ✓ PASSA: Agente A pode puxar                       │
│  │                                                     │
│  CASO B: ["billing", "english"]                       │
│  │  Buscar AgentSkills de Agente A:                    │
│  │  agentA.skills = ["suporte", "español"]             │
│  │  REQUIRED: {billing, english}                       │
│  │  AGENT HAS: {suporte, español}                      │
│  │  required ⊆ agent_has? ✗ NÃO                       │
│  │  continue → Próxima conversa                        │
│  │                                                     │
│  RESULTADO: Maria Santos volta para fila               │
│             Pedro Costa é checado...                   │
└────────────────────────────────────────────────────────┘
                      │
                      ▼
┌────────────────────────────────────────────────────────┐
│  FILTRO 4: business_hours                              │
│  queue.settings.get("business_hours") = ?              │
│                                                        │
│  CASO A: Sem horário definido                         │
│  │  ✓ PASSA: Fila sempre aberta                        │
│  │                                                     │
│  CASO B: {"timezone": "America/Sao_Paulo",            │
│         "schedule": {"friday": {"enabled": false}}}   │
│  │  current_time = 14:35 (sexta-feira)                │
│  │  day_config.enabled = false                         │
│  │  ✗ FALHA: Fila está fechada na sexta               │
│  │  continue → Próxima conversa                        │
│  │                                                     │
│  RESULTADO: Pedro Costa volta para fila                │
│             Ana Silva é checada...                     │
└────────────────────────────────────────────────────────┘
                      │
                      ▼
┌────────────────────────────────────────────────────────┐
│  FILTRO 5: agent_capacity                              │
│  max_conversations_per_agent = 10                      │
│  agentA.current_conversations = 7                      │
│                                                        │
│  agentA pode pegar: 10 - 7 = 3 mais conversas          │
│  ✓ PASSA: Agente A não está no limite                  │
│                                                        │
│  RESULTADO: Ana Silva é checada...                     │
└────────────────────────────────────────────────────────┘
                      │
                      ▼
┌────────────────────────────────────────────────────────┐
│  🎯 ANA SILVA PASSOU EM TODOS OS FILTROS!              │
│                                                        │
│  Atualizar Conversation:                               │
│  ├─ assigned_agent_id = "agentA"                       │
│  ├─ status = "active"  ← Sai da fila!                  │
│  ├─ queued_at = NULL   ← Remove timestamp da fila      │
│  ├─ assigned_at = datetime.utcnow()                    │
│  └─ COMMIT                                             │
│                                                        │
│  return conversation  ← Retorna para Agente A          │
└────────────────────────────────────────────────────────┘
                      │
                      ▼
┌────────────────────────────────────────────────────────┐
│  AGENTE A RECEBE ANA SILVA                             │
│  ├─ Mostra na tela: "Conversa assignada!"              │
│  ├─ extra_data mostra contexto: handoff_context        │
│  ├─ Agente A começa a conversar                        │
│  └─ Bot está DESATIVADO (is_bot_active = false)        │
│                                                        │
│  Fila agora tem 49 conversas                           │
└────────────────────────────────────────────────────────┘
```

---

## 4. DIAGRAMA: ESTADOS DA CONVERSA NO FLUXO

```
CONVERSA LIFECYCLE

┌─────────────────────────────────────────────────────────┐
│ INICIAL: Conversa criada via webhook                    │
│                                                         │
│ status: "pending" ou "active"                           │
│ is_bot_active: TRUE (se flow_id ou chatbot_id)         │
│ queue_id: NULL                                          │
│ assigned_agent_id: NULL                                 │
│ queued_at: NULL                                         │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│ FLUXO EXECUTANDO: Bot responde nós (question, text)    │
│                                                         │
│ status: "active"                                        │
│ is_bot_active: TRUE ← Bot controlando conversa          │
│ queue_id: NULL                                          │
│ assigned_agent_id: NULL                                 │
│ Messages: trocadas entre bot e cliente                  │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│ HANDOFF NODE ACIONADO: "Vou pedir para humano"          │
│                                                         │
│ (1) Enviar msg: "Transferindo para agente..."           │
│ (2) Determinar queue/dept/agent                         │
│ (3) Atualizar campos                                    │
└─────────────────────────────────────────────────────────┘
                          │
         ┌────────────────┼────────────────┐
         │                │                │
      QUEUE           DEPARTMENT          AGENT
         │                │                │
         ▼                ▼                ▼
    ┌────────────┐   ┌──────────┐   ┌──────────────┐
    │ NA FILA    │   │Busca 1ª  │   │DIRETO AGENTE │
    │            │   │fila ativa│   │              │
    │status:     │   │          │   │status: active│
    │"queued"    │   └─────┬────┘   │assigned_agent│
    │is_bot_     │         │        │_id: agentId  │
    │active:     │    ┌────▼───┐    │is_bot_active:│
    │FALSE       │    │NA FILA │    │FALSE         │
    │queue_id:   │    │        │    └──────────────┘
    │UUID        │    │status: │         │
    │queued_at:  │    │"queued"│         ▼
    │datetime    │    │is_bot_ │   ┌──────────────┐
    └─────┬──────┘    │active: │   │AGENTE ATIVO  │
         │           │FALSE   │   │              │
         │           │queue_  │   │status: active│
         ▼           │id: UUID│   │assigned_     │
    ┌──────────┐    │queued_ │   │agent_id:     │
    │OVERFLOW? │    │at:date │   │agentId       │
    │          │    └────┬───┘   │              │
    │max_queue │         ▼       │1-on-1 msg    │
    │_size?    │    ┌──────────┐ │exchange      │
    │exceeded? │    │OVERFLOW? │ └──────────────┘
    │          │    │          │
    └─┬────┬───┘    └────┬─────┘
      │ SIM│ NÃO          │ ...continua
    ┌─▼┐  │              │
    │ Y│  │          ┌───▼─────┐
    │ E│  │          │AGENTE   │
    │ S│  │          │PUXA FLA │
    │  │  │          │DA FILA  │
    └─┬┘  │          │         │
      │   │          │assigned_│
    ┌─▼───▼──┐       │agent_id:│
    │OVERFLOW│       │gets     │
    │QUEUE   │       │set now  │
    │        │       └────┬────┘
    │queue_id       status:
    │= overflow     "active"
    └────┬──────┘   queued_at:
         │          null
         ▼          │
    ┌──────────────┐▼
    │AGUARDANDO    │ (Ambos convergem)
    │AGENTE        │
    │(em overflow) │
    │              │
    │Visível em    │
    │GET /queue    │
    │              │
    │Agente puxa   │
    └──────────────┘
```

---

## 5. DIAGRAMA: DECISÃO DE OVERFLOW

```
CONVERSA CHEGA PARA ENTRAR NA FILA

┌─────────────────────────────────────┐
│ Verificar capacidade atual           │
│                                     │
│ queue.queued_conversations = N      │
│ queue.max_queue_size = M            │
└─────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────┐
│ M está configurado?                  │
│ (max_queue_size != NULL)             │
└─────────────────────────────────────┘
      SIM     │    NÃO
      ▼       └──────────────────┐
    ┌──┐                        │
    │ Y│                        │
    │ E│                        ▼
    │ S│                    ┌───────────┐
    │  │                    │ MANTER NA │
    │  │                    │ FILA      │
    └─┬┘                    │ ORIGINAL  │
      │                     │ N/M = N%  │
      │                     │ (não há   │
      │                     │  limite)  │
      ▼                     └───────────┘
┌──────────────────────┐
│ N >= M?              │
│ (fila cheia/excesso?)│
└──────────────────────┘
   SIM      │    NÃO
   ▼        └──────────────┐
 ┌──┐                      │
 │ Y│                      ▼
 │ E│              ┌───────────┐
 │ S│              │ MANTER NA │
 │  │              │ FILA      │
 └─┬┘              │ ORIGINAL  │
   │               │ Espaço    │
   │               │ disponível│
   ▼               └───────────┘
┌──────────────────────────────┐
│ overflow_queue_id            │
│ está configurado?            │
└──────────────────────────────┘
     SIM     │    NÃO
     ▼       └──────────┐
   ┌──┐                 │
   │ Y│                 │
   │ E│                 ▼
   │ S│          ┌───────────────┐
   │  │          │ MANTER NA     │
   └─┬┘          │ FILA ORIGINAL │
     │           │ (overflow não  │
     │           │  configurado)  │
     ▼           └───────────────┘
┌────────────────────────────┐
│ overflow_queue.             │
│ queued_conversations < max? │
│ (overflow_queue tem espaço?)│
└────────────────────────────┘
    SIM     │    NÃO
    ▼       └──────────┐
  ┌──┐                 │
  │ Y│                 │
  │ E│                 ▼
  │ S│        ┌───────────────┐
  │  │        │ MANTER NA     │
  └─┬┘        │ FILA ORIGINAL │
    │         │ (overflow     │
    │         │  também cheia)│
    ▼         └───────────────┘
┌──────────────────┐
│ ✅ REDIRECIONAR  │
│ PARA OVERFLOW    │
│                  │
│ queue_id =       │
│ overflow_queue.id│
│                  │
│ Log overflow_    │
│ history          │
└──────────────────┘
```

---

## 6. DIAGRAMA: ROUTING MODES VISUAIS

```
ROUND ROBIN (Cíclico)
═════════════════════════════════════════

Agente A  Agente B  Agente C
  │ 1       │ 2       │ 3
  │ 4       │ 5       │ 6
  │ 7       │ 8       │ 9
  ▼         ▼         ▼
[1,4,7]   [2,5,8]   [3,6,9]

Cada agente recebe na sequência.
Sistema: pull_from_queue() retorna próxima.


LOAD BALANCE (Menos carregado)
═════════════════════════════════════════

Agente A  Agente B  Agente C
  8         3         2     ← conversas ativas

Próxima vai para C (menos carregado):

Agente A  Agente B  Agente C
  8         3         3     ← balanceado


MANUAL (Escolher)
═════════════════════════════════════════

Fila Central:
  [Conversa 1]
  [Conversa 2]
  [Conversa 3]

Agente A: "Quero a #2"
Agente B: "Quero a #1"
Agente C: "Quero a #3"

pull_from_queue(queue_id=specific)


SKILLS-BASED (Por Habilidade)
═════════════════════════════════════════

Queue "Billing":
  Skills: ["billing", "payment_systems"]

Agente A: ✓ billing ✓ payment_systems ✓ English
  → Pode puxar

Agente B: ✓ support ✗ billing
  → Não pode puxar

Agente C: ✓ billing ✗ payment_systems
  → Não pode puxar (incompleto)

Só A consegue puxar da "Billing" queue
```

---

## 7. DIAGRAMA: ESTADO DA CONVERSA - CAMPOS CRÍTICOS

```
┌──────────────────────────────────────────────────────────┐
│                   CONVERSATION OBJECT                     │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  FLUXO EXECUTANDO                                        │
│  ─────────────────────────────────────────────────────  │
│  status: "active"                                        │
│  is_bot_active: ✅ TRUE                                  │
│  queue_id: NULL                                          │
│  assigned_agent_id: NULL                                 │
│  queued_at: NULL                                         │
│  assigned_at: NULL                                       │
│                                                          │
└──────────────────────────────────────────────────────────┘
                         │
                    [HANDOFF]
                         │
                         ▼
┌──────────────────────────────────────────────────────────┐
│               APÓS HANDOFF PARA FILA                      │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  status: "queued"          ← MUDA de "active"           │
│  is_bot_active: ❌ FALSE    ← 🔴 CRÍTICO!               │
│  queue_id: "uuid-fila"     ← Qual fila?                 │
│  queue_priority: 50        ← Prioridade (10|50|80|100)  │
│  queued_at: datetime       ← QUANDO entrou na fila      │
│  assigned_agent_id: NULL   ← Ainda sem agente           │
│  assigned_at: NULL                                       │
│                                                          │
│  extra_data:                                             │
│  ├─ "handoff_context": "Cliente VIP..."                │
│  ├─ "overflow_history": [  ← Se overflow               │
│  │   {                                                   │
│  │     "original_queue_id": "uuid",                     │
│  │     "overflow_queue_id": "uuid",                     │
│  │     "overflowed_at": "2025-01-17T14:30:00"          │
│  │   }                                                   │
│  │ ]                                                     │
│  └─ (outros dados contexto)                            │
│                                                          │
└──────────────────────────────────────────────────────────┘
                         │
                    [AGENTE PULL]
                         │
                         ▼
┌──────────────────────────────────────────────────────────┐
│              APÓS AGENTE PUXAR DA FILA                    │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  status: "active"          ← MUDA de "queued"           │
│  is_bot_active: ❌ FALSE    ← Permanece FALSE           │
│  queue_id: "uuid-fila"     ← Permanece igual            │
│  queue_priority: 50        ← Permanece igual            │
│  queued_at: NULL           ← ❌ REMOVIDO!               │
│  assigned_agent_id: "uuid-agente" ← AGORA TEM AGENTE    │
│  assigned_at: datetime     ← QUANDO foi assignada       │
│                                                          │
│  extra_data:               ← Histórico preservado        │
│  ├─ "handoff_context": "Cliente VIP..."                │
│  ├─ "overflow_history": [...]                          │
│  └─ (outros dados)                                      │
│                                                          │
│  👥 Agente consegue ver:                                │
│  ├─ Histórico de mensagens                              │
│  ├─ Contexto do fluxo                                   │
│  ├─ Dados coletados pelo bot                            │
│  └─ Mensagem de handoff (contextMessage)                │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

**Visualizações completas!** 🎨
