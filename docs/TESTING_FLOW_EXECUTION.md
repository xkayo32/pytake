# 🧪 Guia de Testes: Flow Execution via WhatsApp Webhook

**Data**: 13 de Dezembro de 2025  
**Commit**: `648a428` - Fix: suportar default_flow_id direto sem default_chatbot_id

---

## 📋 Setup Inicial

### 1. Verificar Configuração do WhatsAppNumber

```bash
# Conectar ao banco de dados
docker exec -it pytake-postgres psql -U pytake_user -d pytake_db

# Query para ver configuração
SELECT 
    id,
    phone_number,
    phone_number_id,
    default_chatbot_id,
    default_flow_id,
    connection_type
FROM whatsapp_number
WHERE organization_id = 'YOUR_ORG_ID'
LIMIT 5;
```

**Procurar por**:
- ✅ `default_flow_id` preenchido (UUID)
- ✅ `connection_type` = `official` (Meta Cloud API)
- ✅ `access_token` válido

### 2. Preparar Backend

```bash
# Terminal 1: Ver logs do backend em tempo real
docker compose logs -f backend --tail 50

# Terminal 2: Entrar no container (se precisar)
docker exec -it pytake-backend bash
```

---

## 🧪 Teste 1: Primeira Mensagem (Inicialização de Flow)

### Passo 1: Enviar Mensagem
```
Telefone: Seu número pessoal
Mensagem para: +5511999999999 (seu WhatsApp Business)
Conteúdo: "Olá" ou qualquer mensagem
```

### Passo 2: Verificar Logs

**Procurar por estes logs (em sequência)**:

```log
1. 📥 [WhatsApp] Message received
   "Processing webhook payload..."
   
2. 🔍 Processa metadata
   "Processing incoming message: wamid.xxx"
   
3. 👤 Cria ou busca Contact
   "get_by_whatsapp_id: +5511999999999"
   "Created new contact: {contact_id}"
   
4. 📞 Cria ou busca Conversation
   "get_by_contact: status=open"
   "Created new conversation: {conversation_id}"
   "✅ Default flow initiated: {flow_name} (ID: {flow_id})"
   
5. 💾 Salva Message
   "Saved message: {message_id} (WhatsApp ID: wamid.xxx)"
   
6. 🤖 Dispara Flow
   "is_bot_active=True, active_chatbot_id or active_flow_id=True"
   "Conversa tem flow ativo mas sem current_node_id" OR
   "🚀 Iniciando fluxo {flow_name} no node {node_type}"
   
7. 📤 Executa Node e Envia Mensagem
   "🎬 Executando node {node_type}"
   "✅ Mensagem enviada via Meta API. ID: {message_id}"
```

### Passo 3: Verificar Banco de Dados

```bash
# Ver Conversation criada
SELECT 
    c.id,
    c.contact_id,
    c.active_flow_id,
    c.current_node_id,
    c.is_bot_active,
    c.status
FROM conversation c
WHERE c.organization_id = 'YOUR_ORG_ID'
ORDER BY c.created_at DESC
LIMIT 1;
```

**Resultado esperado**:
```
id              | UUID
contact_id      | UUID (não NULL)
active_flow_id  | UUID (deve ser o default_flow_id)
current_node_id | UUID (deve ser apontando para um node)
is_bot_active   | true
status          | open
```

### Passo 4: Verificar Mensagens

```bash
# Ver mensagens armazenadas
SELECT 
    id,
    conversation_id,
    direction,
    message_type,
    content,
    status,
    created_at
FROM message
WHERE conversation_id = '{conversation_id_from_above}'
ORDER BY created_at;
```

**Resultado esperado**:
- 1 mensagem `inbound` do contato
- 1+ mensagens `outbound` do bot (respostas)

### Passo 5: Verificar WhatsApp

**Você deve receber**:
- ✅ Mensagem de resposta automática no WhatsApp
- ✅ Resposta corresponde ao primeiro node do flow

---

## 🧪 Teste 2: Mensagens Contínuas (Avanço de Flow)

### Passo 1: Enviar Segunda Mensagem
```
Enviar resposta à mensagem anterior
Exemplo: "Sim" ou número, dependendo do tipo de node
```

### Passo 2: Verificar Logs

**Procurar por**:

```log
1. 📥 Message received
   "Processing incoming message: wamid.yyy"
   
2. 📞 Busca Conversation Existente
   "get_by_contact: status=open" (deve encontrar)
   "Conversation ja existe: {conversation_id}"
   
3. 💾 Salva Message (inbound)
   "Saved message: {message_id}"
   
4. 🤖 Continua Flow (não inicializa!)
   "is_bot_active=True, active_flow_id exists"
   "Conversa tem flow ativo mas sem current_node_id" (normal, vai buscar)
   
5. 📊 Processa Resposta e Avança
   "_process_user_response_and_advance()"
   "Avançando para próximo node..."
   "🎬 Executando node {next_node_type}"
   
6. 📤 Envia Resposta do Próximo Node
   "✅ Mensagem enviada via Meta API"
```

### Passo 3: Verificar Banco de Dados

```bash
# Ver Conversation atualizada
SELECT 
    c.id,
    c.current_node_id,
    c.context_variables,
    c.messages_from_contact,
    c.total_messages
FROM conversation c
WHERE c.id = '{conversation_id}'
LIMIT 1;
```

**Resultado esperado**:
- `current_node_id` mudou para o próximo node
- `messages_from_contact` incrementou
- `total_messages` incrementou

### Passo 4: Verificar Mensagens

```bash
SELECT COUNT(*) as total_messages FROM message
WHERE conversation_id = '{conversation_id}';
```

**Resultado esperado**:
- Deve ter mais mensagens (inbound + outbound)

---

## 🧪 Teste 3: Flow com Condições

### Cenário: Flow com nó Condition

**Flow típico**:
```
[Start] → [Question: "Qual seu segmento?"] → [Condition] → [Path A ou Path B]
```

### Passo 1: Enviar Primeira Mensagem
- Log esperado: Primeiro question node executado

### Passo 2: Responder à Pergunta
- Exemplo: "Segmento A"

### Passo 3: Verificar Path Tomado
```log
Procurar por:
"🔀 Avaliando condições do Condition Node"
"Resultado da condição: true/false"
"Avançando para: {next_node_based_on_condition}"
```

### Passo 4: Verificar Banco
```bash
SELECT 
    c.context_variables,
    c.current_node_id,
    n.label as current_node_label
FROM conversation c
JOIN node n ON c.current_node_id = n.id
WHERE c.id = '{conversation_id}';
```

---

## 🧪 Teste 4: Múltiplos Contatos (Isolamento de Flows)

### Passo 1: Abrir 2 Conversas Simultâneas
- Pessoa A envia: "Olá"
- Pessoa B envia: "Oi"
- (Usar 2 celulares ou 2 números)

### Passo 2: Verificar Logs

**Deve haver 2 Conversations diferentes**:
```log
"Processing incoming message: +5511999999999" → conversation_id_A
"Processing incoming message: +5511888888888" → conversation_id_B
```

### Passo 3: Verificar DB

```bash
SELECT 
    c.id,
    c.contact_id,
    co.whatsapp_id,
    c.current_node_id
FROM conversation c
JOIN contact co ON c.contact_id = co.id
WHERE c.organization_id = 'YOUR_ORG_ID'
ORDER BY c.created_at DESC
LIMIT 2;
```

**Resultado esperado**:
- 2 Conversations diferentes
- 2 Contacts diferentes (whatsapp_ids diferentes)
- Podem ter current_node_ids diferentes se seguirem paths diferentes

### Passo 4: Responder de Maneiras Diferentes
- Pessoa A: Responde opção 1
- Pessoa B: Responde opção 2

**Resultado esperado**:
- Cada uma segue seu próprio path no flow
- Recebem respostas diferentes

---

## 🔍 Troubleshooting

### ❌ Problema: Nenhuma resposta automática

**Checklist**:

```bash
# 1. Verificar se webhook está sendo recebido
docker compose logs -f backend --grep "Processing webhook payload"

# 2. Verificar se message foi armazenada
SELECT COUNT(*) FROM message;

# 3. Verificar conversation
SELECT id, is_bot_active, active_flow_id, active_chatbot_id 
FROM conversation 
ORDER BY created_at DESC LIMIT 1;

# 4. Verificar logs de _trigger_chatbot
docker compose logs -f backend --grep "trigger_chatbot\|flow ativo\|Iniciando fluxo"

# 5. Verificar se flow existe no DB
SELECT id, name FROM flow WHERE id = '{default_flow_id}';

# 6. Verificar se start_node existe
SELECT id, node_type, label FROM node 
WHERE flow_id = '{default_flow_id}' AND node_type = 'start';
```

### ❌ Problema: "Conversa tem flow ativo mas sem current_node_id"

**Causa**: `current_node_id` não foi setado quando conversation foi criada

**Solução**:
```bash
# Manualmente atualizar conversation (debug apenas)
UPDATE conversation
SET current_node_id = (
    SELECT id FROM node 
    WHERE flow_id = active_flow_id 
    AND node_type != 'start'
    LIMIT 1
)
WHERE current_node_id IS NULL;
```

### ❌ Problema: Flow não executa, apenas armazena mensagem

**Checklist**:

```bash
# Verificar se is_bot_active está True
SELECT is_bot_active, active_flow_id, active_chatbot_id 
FROM conversation 
ORDER BY created_at DESC LIMIT 1;

# Se is_bot_active = false, significa que:
# - default_chatbot_id = NULL
# - default_flow_id = NULL

# Verificar WhatsAppNumber
SELECT default_chatbot_id, default_flow_id 
FROM whatsapp_number 
WHERE phone_number = '{seu_numero}';
```

---

## 📊 Expected Flow During Test

```
┌─────────────────────────────────────────┐
│  Usuário envia mensagem via WhatsApp    │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│  Backend recebe webhook POST            │
│  Verifica HMAC signature ✅             │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│  Cria/busca Contact 👤                  │
│  Cria/busca Conversation 📞             │
│  Salva Message 💾                       │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│  is_bot_active = true? ✅               │
│  active_flow_id ou active_chatbot_id? ✅│
└────────────────┬────────────────────────┘
                 │
         ┌───────┴───────┐
         │               │
    Primeira        Próximas
   Mensagem        Mensagens
         │               │
         ▼               ▼
    Inicializa    Continua Flow
    Main Flow     (no current_node)
         │               │
         └───────┬───────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│  Executa Node (text, question, etc)     │
│  Substitui variáveis {{var}}            │
│  Envia via Meta Cloud API 📤            │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│  Usuário recebe mensagem no WhatsApp ✅ │
└─────────────────────────────────────────┘
```

---

## ✅ Sucesso: Sinais de que tudo funciona

- [ ] 1️⃣ Logs mostram "Created new conversation" + "Iniciando fluxo"
- [ ] 2️⃣ Recebe resposta automática no WhatsApp em menos de 3 segundos
- [ ] 3️⃣ Mensagens armazenadas no DB (direction = inbound/outbound)
- [ ] 4️⃣ `current_node_id` muda após responder (avança no flow)
- [ ] 5️⃣ Múltiplos usuários têm flows independentes
- [ ] 6️⃣ Condições funcionam (diferentes paths para diferentes respostas)

---

## 🚀 Deploy em Produção

### Passo 1: Fazer Build
```bash
docker compose build backend
```

### Passo 2: Deploy
```bash
docker compose up -d backend
```

### Passo 3: Monitorar
```bash
# Ver logs por 5 minutos
docker compose logs -f backend --tail 100 | head -100

# Depois deixar rodando em background
docker compose logs -f backend > /tmp/backend.log &
```

### Passo 4: Testes
- Enviar mensagens reais via WhatsApp
- Monitorar logs por 1-2 horas
- Verificar DB para confirmar flows executando

### Passo 5: Validar
- Testar 5+ conversas diferentes
- Testar flows com condições
- Testar flows com múltiplos nodes

---

**Pronto para testar?** 🚀
