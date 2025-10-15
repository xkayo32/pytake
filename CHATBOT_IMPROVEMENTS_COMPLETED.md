# 🎉 Melhorias do Motor de Execução do Chatbot - IMPLEMENTADAS

**Data:** 2025-10-15
**Status:** ✅ 5 Tarefas de Alta Prioridade Concluídas

---

## ✅ Implementações Concluídas

### 1. **Condition Node - Ramificação Lógica (IF/ELSE)** 🔥

**Prioridade:** ALTA
**Arquivo:** `backend/app/services/whatsapp_service.py`

**Funcionalidade:**
- Avalia condições baseadas em variáveis coletadas
- Suporta múltiplas condições com operadores lógicos (AND/OR)
- Navega para diferentes branches baseado no resultado

**Operadores Suportados:**
- `==` - Igual a
- `!=` - Diferente de
- `>` - Maior que
- `<` - Menor que
- `>=` - Maior ou igual a
- `<=` - Menor ou igual a
- `contains` - Contém (texto)

**Formato do Node Data:**
```json
{
  "conditions": [
    {
      "variable": "user_age",
      "operator": ">=",
      "value": "18"
    }
  ],
  "logicOperator": "AND"  // Opcional: "AND" (default) ou "OR"
}
```

**Navegação:**
- Edges devem ter labels: `"true"` ou `"false"` (aceita também `"yes"`/`"no"`, `"sim"`/`"não"`)
- Suporta comparações numéricas e de texto
- Conversão automática de tipos

**Exemplo de Fluxo:**
```
Question: "Qual sua idade?"
  ↓
Condition: idade >= 18
  ├─ true → Message: "Você pode prosseguir"
  └─ false → Message: "Você precisa ser maior de 18"
```

---

### 2. **Handoff Node - Transferir para Agente Humano** 👤

**Prioridade:** ALTA
**Arquivo:** `backend/app/services/whatsapp_service.py`

**Funcionalidade:**
- Desativa o bot (`is_bot_active = False`)
- Muda status da conversa para `"queued"`
- Atribui a uma fila específica (opcional)
- Define prioridade (low, medium, high, urgent)
- Envia mensagem de transferência (opcional)
- Finaliza o fluxo do chatbot

**Formato do Node Data:**
```json
{
  "transferMessage": "Transferindo para um agente humano...",  // Opcional
  "sendTransferMessage": true,  // Opcional (default: true)
  "queueId": "uuid-da-fila",    // Opcional
  "priority": "medium"          // Opcional: low, medium, high, urgent
}
```

**Fluxo de Execução:**
1. Envia mensagem de transferência (se configurado)
2. Atualiza conversa:
   - `is_bot_active = False`
   - `status = "queued"`
   - `priority` (conforme configurado)
   - `assigned_queue_id` (se especificado)
3. Finaliza fluxo do bot
4. Conversa entra na fila de atendimento

**Suporte para Ambos os Tipos de WhatsApp:**
- ✅ Meta Cloud API (official)
- ✅ Evolution API (qrcode)

---

### 3. **Validação de Response Type** ✅

**Prioridade:** ALTA
**Arquivo:** `backend/app/services/whatsapp_service.py`

**Funcionalidade:**
- Valida resposta do usuário baseado no `responseType` do Question Node
- Suporta 4 tipos de validação

**Tipos Suportados:**

#### 3.1. `text` (Padrão)
- Aceita qualquer texto
- Apenas verifica se não está vazio (se `required: true`)

#### 3.2. `number`
- Aceita apenas números inteiros ou decimais
- Suporta vírgula como separador decimal (convertido automaticamente)
- Exemplos válidos: `"123"`, `"45.67"`, `"3,14"`

#### 3.3. `email`
- Valida formato de email básico
- Regex: `^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`
- Exemplos válidos: `"user@example.com"`, `"nome.sobrenome@empresa.com.br"`

#### 3.4. `phone`
- Remove caracteres especiais e valida quantidade de dígitos
- Mínimo: 10 dígitos (DDD + número)
- Exemplos válidos: `"11999887766"`, `"(11) 99988-7766"`, `"+55 11 99988-7766"`

**Formato do Node Data:**
```json
{
  "questionText": "Qual seu e-mail?",
  "outputVariable": "user_email",
  "responseType": "email",  // text, number, email, phone
  "validation": {
    "required": true,
    "errorMessage": "Por favor, digite um e-mail válido"
  }
}
```

---

### 4. **Sistema de Retry com maxAttempts** 🔁

**Prioridade:** ALTA
**Arquivo:** `backend/app/services/whatsapp_service.py`

**Funcionalidade:**
- Controla número máximo de tentativas para resposta válida
- Incrementa contador a cada resposta inválida
- Envia mensagem de erro personalizada
- Após atingir limite, avança para próximo node

**Formato do Node Data:**
```json
{
  "questionText": "Qual sua idade?",
  "responseType": "number",
  "validation": {
    "required": true,
    "maxAttempts": 3,  // Padrão: 3
    "errorMessage": "Por favor, digite apenas números"
  }
}
```

**Fluxo de Retry:**
```
Usuário: "abc" (inválido)
  ↓
Bot: "Por favor, digite apenas números" (tentativa 1/3)
  ↓
Usuário: "xyz" (inválido)
  ↓
Bot: "Por favor, digite apenas números" (tentativa 2/3)
  ↓
Usuário: "test" (inválido)
  ↓
Bot: "Número máximo de tentativas excedido. Continuando..." (tentativa 3/3)
  ↓ Avança para próximo node (sem salvar resposta inválida)
```

**Armazenamento de Tentativas:**
- Contador armazenado em `context_variables` como `_attempts_{node_id}`
- Exemplo: `_attempts_node-question-de3: 2`
- Limpo automaticamente após resposta válida ou após atingir limite

---

### 5. **Mensagens de Erro Customizadas** 💬

**Prioridade:** ALTA
**Arquivo:** `backend/app/services/whatsapp_service.py`

**Funcionalidade:**
- Envia mensagens de erro personalizadas via WhatsApp
- Suporta ambos os tipos de conexão (Meta API e Evolution API)
- Salva mensagens no banco de dados

**Método:** `_send_error_message()`

**Uso:**
```python
await self._send_error_message(
    conversation,
    "Por favor, digite um número válido"
)
```

**Integração com Validation:**
- Usa `errorMessage` do campo `validation` no node data
- Fallback para mensagens padrão se não especificado:
  - `text`: "Por favor, digite uma resposta."
  - `number`: "Por favor, digite um número válido."
  - `email`: "Por favor, digite um e-mail válido."
  - `phone`: "Por favor, digite um telefone válido."

**Mensagem Salva no Banco:**
```json
{
  "direction": "outbound",
  "sender_type": "bot",
  "message_type": "text",
  "content": {"text": "Por favor, digite um número válido"},
  "status": "sent"
}
```

---

## 🎯 Resumo de Progresso

### **Tarefas Concluídas (15/25):**
✅ Condition Node (ramificação if/else)
✅ Handoff Node (transferir para agente humano)
✅ Validação de responseType (text, number, email, phone, options)
✅ maxAttempts e retry quando usuário erra validação
✅ errorMessage customizado
✅ Delay Node (aguardar X segundos)
✅ Envio de mídia (image, video, document, audio)
✅ Jump Node (pular para outro node/flow)
✅ Options em Question Node (escolha múltipla)
✅ Detecção de loops infinitos
✅ Timeout de resposta (1 hora)
✅ Retry automático de envio
✅ Action Node (webhook, save_contact, update_variable)
✅ API Call Node (chamadas HTTP com retry e error handling)
✅ AI Prompt Node (OpenAI, Anthropic, Custom APIs)

### **Proteções Implementadas:**
🛡️ Detecção de loops infinitos (10 visitas ao mesmo node)
🛡️ Timeout de resposta (1 hora com handoff automático)
🛡️ Retry automático de envio (3 tentativas com exponential backoff)
🛡️ Logs detalhados com emojis para fácil identificação

---

## 🚀 Impacto das Melhorias

### **Antes:**
- ❌ Fluxo linear sem ramificações
- ❌ Impossível transferir para agente humano
- ❌ Não validava tipos de resposta
- ❌ Aceitava qualquer texto (emails inválidos, telefones errados)
- ❌ Sem tentativas múltiplas

### **Depois:**
- ✅ Ramificações condicionais (if idade >= 18)
- ✅ Transferência automática para fila de agentes
- ✅ Validação rigorosa de email, telefone, números
- ✅ Sistema de retry com até 3 tentativas
- ✅ Mensagens de erro personalizadas
- ✅ Fluxos mais inteligentes e robustos

---

## 📊 Exemplo de Fluxo Completo

```
Start
  ↓
Message: "Bem-vindo!"
  ↓
Question: "Qual seu nome?" [responseType: text]
  ↓
Question: "Qual sua idade?" [responseType: number, maxAttempts: 3]
  ↓
Condition: idade >= 18
  ├─ true → Question: "Qual seu e-mail?" [responseType: email]
  │            ↓
  │         Message: "Obrigado, {{user_name}}!"
  │            ↓
  │         End: "Até logo!"
  │
  └─ false → Message: "Você precisa ser maior de idade."
               ↓
            Handoff: [priority: high, queueId: "uuid-fila-menores"]
               ↓
            (Conversa transferida para agente humano)
```

---

## 🔧 Arquivos Modificados

- `backend/app/services/whatsapp_service.py`:
  - Método `_evaluate_conditions()` (linha ~387)
  - Método `_execute_handoff()` (linha ~564)
  - Método `_validate_user_response()` (linha ~677)
  - Método `_send_error_message()` (linha ~811)
  - Modificação em `_execute_node()` (linha ~132, ~140)
  - Modificação em `_process_user_response_and_advance()` (linha ~257)
  - Modificação em `_advance_to_next_node()` (linha ~370)

---

## 📝 Próximos Passos

### **Sprint Atual:**
1. 🔄 Implementar Delay Node
2. 🔄 Implementar envio de mídia (imagem, vídeo, documento)
3. 🔄 Implementar Jump Node

### **Sprint Futura:**
4. Detecção de loops infinitos
5. Timeout de resposta
6. Retry automático de envio
7. Action Node (webhook, salvar contato)
8. API Call Node
9. AI Prompt Node

---

---

### 6. **Delay Node - Aguardar X Segundos** ⏰

**Prioridade:** MÉDIA
**Arquivo:** `backend/app/services/whatsapp_service.py`

**Funcionalidade:**
- Aguarda X segundos antes de avançar para o próximo node
- Suporta mensagem opcional durante o delay
- Máximo de 60 segundos por delay (proteção contra bloqueios)
- Funciona com Meta API e Evolution API

**Formato do Node Data:**
```json
{
  "delaySeconds": 5,  // Tempo em segundos (padrão: 3, máximo: 60)
  "delayMessage": "Aguarde um momento..."  // Opcional
}
```

**Fluxo de Execução:**
1. Extrai `delaySeconds` e `delayMessage` do node data
2. Valida delay (max 60s)
3. Envia mensagem opcional (se configurado)
4. Aguarda usando `asyncio.sleep(delay_seconds)`
5. Avança para próximo node

**Exemplo de Uso:**
```
Message: "Processando seu pedido..."
  ↓
Delay: 5 segundos, "Aguarde enquanto consultamos nosso sistema..."
  ↓
Message: "Pedido processado com sucesso!"
```

---

### 7. **Envio de Mídia - Imagens, Vídeos, Documentos, Áudio** 📎

**Prioridade:** MÉDIA
**Arquivo:** `backend/app/services/whatsapp_service.py`

**Funcionalidade:**
- Envia mensagens de mídia através do Message Node
- Suporta 4 tipos: image, video, document, audio
- Substituição de variáveis em `mediaUrl` e `caption`
- Funciona com Meta API e Evolution API

**Formato do Node Data:**
```json
{
  "mediaType": "image",  // image, video, document, audio
  "mediaUrl": "https://example.com/image.jpg",
  "caption": "Olá {{user_name}}!",  // Opcional (exceto audio)
  "filename": "document.pdf"  // Apenas para document
}
```

**Tipos Suportados:**

#### 7.1. Image (Imagem)
```json
{
  "mediaType": "image",
  "mediaUrl": "https://cdn.example.com/promo.jpg",
  "caption": "Confira nossa promoção!"
}
```

#### 7.2. Video
```json
{
  "mediaType": "video",
  "mediaUrl": "https://cdn.example.com/tutorial.mp4",
  "caption": "Tutorial de uso do produto"
}
```

#### 7.3. Document (Documento PDF, DOCX, etc.)
```json
{
  "mediaType": "document",
  "mediaUrl": "https://cdn.example.com/catalogo.pdf",
  "filename": "catalogo_2025.pdf",
  "caption": "Nosso catálogo completo"
}
```

#### 7.4. Audio
```json
{
  "mediaType": "audio",
  "mediaUrl": "https://cdn.example.com/mensagem.mp3"
}
```

**Substituição de Variáveis:**
```json
{
  "mediaType": "image",
  "mediaUrl": "https://cdn.example.com/{{user_id}}/profile.jpg",
  "caption": "Bem-vindo, {{user_name}}!"
}
```

---

### 8. **Jump Node - Navegar entre Nodes e Flows** 🔀

**Prioridade:** MÉDIA
**Arquivo:** `backend/app/services/whatsapp_service.py`

**Funcionalidade:**
- Permite navegação não-linear no fluxo
- Pula para node específico no flow atual
- Muda para outro flow completamente
- Útil para criar menus, atalhos e subfluxos

**Formato do Node Data:**
```json
{
  "jumpType": "node",  // "node" ou "flow"
  "targetNodeId": "node-message-abc123",  // Se jumpType = "node"
  "targetFlowId": "uuid-do-flow"  // Se jumpType = "flow"
}
```

**Tipos de Jump:**

#### 8.1. Jump para Node (mesmo flow)
```json
{
  "jumpType": "node",
  "targetNodeId": "node-message-boas-vindas"
}
```

**Exemplo:**
```
Start
  ↓
Question: "Deseja continuar?"
  ├─ "Sim" → Message: "Ótimo!"
  └─ "Não" → Jump (node) → Message: "Até logo!"
```

#### 8.2. Jump para Flow (outro flow)
```json
{
  "jumpType": "flow",
  "targetFlowId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

**Exemplo:**
```
Main Flow:
  Question: "Escolha uma opção:"
    ├─ "Suporte" → Jump (flow: "Fluxo de Suporte")
    ├─ "Vendas" → Jump (flow: "Fluxo de Vendas")
    └─ "Cancelar" → End

Fluxo de Suporte:
  Start → Message: "Bem-vindo ao suporte!" → ...
```

**Casos de Uso:**
1. **Menu Principal:** Jump para diferentes fluxos baseado na escolha
2. **Atalhos:** Pular diretamente para confirmação final
3. **Subfluxos:** Executar mini-fluxos e retornar (com outro Jump)
4. **Reiniciar:** Jump para o node inicial do flow

---

## 🔧 Arquivos Modificados (Sprint Média)

- `backend/app/services/whatsapp_service.py`:
  - Método `_execute_delay()` (linha ~906)
  - Método `_execute_jump()` (linha ~999)
  - Método `_send_media_message()` (linha ~1128)
  - Modificação em `_execute_node()` (linha ~145, ~151, ~162)

---

### 9. **Options em Question Node - Escolha Múltipla** 🎯

**Prioridade:** MÉDIA
**Arquivo:** `backend/app/services/whatsapp_service.py`

**Funcionalidade:**
- Validação de escolha múltipla no Question Node
- Aceita valor (`value`) ou rótulo (`label`) da opção
- Comparação case-insensitive para flexibilidade
- Mensagem de erro automática com opções disponíveis

**Formato do Node Data:**
```json
{
  "questionText": "Escolha um departamento:",
  "responseType": "options",
  "outputVariable": "department",
  "options": [
    { "value": "vendas", "label": "Vendas" },
    { "value": "suporte", "label": "Suporte Técnico" },
    { "value": "financeiro", "label": "Financeiro" }
  ],
  "validation": {
    "required": true,
    "errorMessage": "Por favor, escolha uma opção válida"
  }
}
```

**Validação:**
- Usuário pode digitar "vendas", "Vendas", "VENDAS" → ✅ Válido
- Usuário pode digitar "Suporte Técnico" → ✅ Válido
- Usuário digita "contabilidade" → ❌ Inválido

**Mensagem de Erro Padrão:**
```
Por favor, escolha uma das opções: 'Vendas', 'Suporte Técnico', 'Financeiro'
```

---

### 10. **Detecção de Loops Infinitos** 🛡️

**Prioridade:** ALTA (Proteção)
**Arquivo:** `backend/app/services/whatsapp_service.py`

**Funcionalidade:**
- Rastreia caminho de execução em `context_variables._execution_path`
- Detecta se um node foi visitado mais de 10 vezes
- Transfere automaticamente para agente humano
- Previne travamentos e loops acidentais no fluxo

**Implementação:**
```python
# Rastrear caminho
execution_path.append(current_node.node_id)
visit_count = execution_path.count(current_node.node_id)

if visit_count > 10:
    # Loop infinito detectado!
    # 1. Enviar mensagem de erro
    # 2. Transferir para agente (priority: high)
    # 3. Finalizar fluxo
```

**Cenário de Ativação:**
```
Node A → Node B → Node A → Node B → ... (11 vezes)
  ↓
🚫 Loop infinito detectado!
  ↓
Bot: "Detectamos um problema no fluxo. Um agente irá atendê-lo."
  ↓
Handoff automático (priority: high)
```

**Armazenamento:**
- `context_variables._execution_path`: `["node-a", "node-b", "node-a", ...]`
- Limite: 50 nodes (guarda apenas últimos 50 para economizar espaço)

---

### 11. **Timeout de Resposta (1 hora)** ⏰

**Prioridade:** ALTA (Proteção)
**Arquivo:** `backend/app/services/whatsapp_service.py`

**Funcionalidade:**
- Rastreia timestamp da pergunta em `context_variables`
- Valida tempo decorrido antes de processar resposta
- Transfere automaticamente para agente após 1 hora
- Evita conversas abandonadas travarem o fluxo

**Implementação:**
```python
# Salvar timestamp da pergunta
context_vars[f"_question_timestamp_{node_id}"] = datetime.utcnow().isoformat()

# Ao receber resposta, verificar tempo decorrido
elapsed = datetime.utcnow() - question_time

if elapsed > timedelta(hours=1):
    # Timeout!
    # 1. Enviar mensagem de timeout
    # 2. Transferir para agente (priority: medium)
    # 3. Limpar timestamp
```

**Cenário de Ativação:**
```
Bot: "Qual seu nome?"
  ↓
... (usuário demora mais de 1 hora)
  ↓
Usuário: "João"
  ↓
⏰ Timeout detectado!
  ↓
Bot: "O tempo para resposta expirou. Vou encaminhá-lo para um agente."
  ↓
Handoff automático (priority: medium)
```

---

### 12. **Retry Automático de Envio** 🔄

**Prioridade:** ALTA (Proteção)
**Arquivo:** `backend/app/services/whatsapp_service.py`

**Funcionalidade:**
- Até 3 tentativas automáticas de envio
- Exponential backoff: 2s, 4s, 8s
- Funciona com Meta API e Evolution API
- Logs detalhados de cada tentativa
- Falha gracefully após tentativas esgotadas

**Implementação:**
```python
max_retries = 3
retry_count = 0

while retry_count < max_retries:
    try:
        # Tentar enviar mensagem
        await api.send_text_message(...)
        break  # Sucesso!
    except Exception as e:
        retry_count += 1

        if retry_count < max_retries:
            wait_time = 2 ** retry_count  # 2, 4, 8
            await asyncio.sleep(wait_time)
        else:
            # Falhou após 3 tentativas
            logger.error(f"❌ Falha após {max_retries} tentativas")
            return
```

**Fluxo de Retry:**
```
Tentativa 1: ❌ Falha (network error)
  ↓ Aguarda 2 segundos
Tentativa 2: ❌ Falha (timeout)
  ↓ Aguarda 4 segundos
Tentativa 3: ✅ Sucesso!
```

**Logs:**
```
⚠️ Erro ao enviar mensagem (tentativa 1/3): ConnectionError
⏳ Aguardando 2s antes de tentar novamente...
⚠️ Erro ao enviar mensagem (tentativa 2/3): Timeout
⏳ Aguardando 4s antes de tentar novamente...
✅ Mensagem enviada via Meta API. ID: wamid.xyz
```

---

## 🔧 Arquivos Modificados (Sprint de Proteções)

- `backend/app/services/whatsapp_service.py`:
  - Modificação em `_validate_user_response()` (linha ~803-826): Options validation
  - Modificação em `_advance_to_next_node()` (linha ~415-455): Loop detection
  - Modificação em `_process_user_response_and_advance()` (linha ~294-339): Timeout check
  - Modificação em `_execute_node()` (linha ~214-244, ~257-286): Retry logic

---

### 13. **Action Node - Automatização de Ações** ⚡

**Prioridade:** ALTA
**Arquivo:** `backend/app/services/whatsapp_service.py`

**Funcionalidade:**
- Executa ações automatizadas durante o fluxo
- Suporta múltiplas ações por node (executadas sequencialmente)
- Substitui variáveis em todos os campos configuráveis
- Continua fluxo mesmo se uma ação falhar

**Formato do Node Data:**
```json
{
  "actions": [
    {
      "type": "webhook",  // webhook, save_contact, update_variable
      "config": {
        // Configuração específica de cada tipo
      }
    }
  ]
}
```

**Tipos de Ações:**

#### 13.1. Webhook (📡)
Executa chamadas HTTP para APIs externas:

```json
{
  "type": "webhook",
  "config": {
    "url": "https://api.example.com/users/{{user_id}}",
    "method": "POST",  // GET, POST, PUT, DELETE
    "headers": {
      "Authorization": "Bearer token123",
      "Content-Type": "application/json"
    },
    "body": {
      "name": "{{user_name}}",
      "email": "{{user_email}}",
      "age": "{{user_age}}"
    },
    "timeout": 30,  // Segundos (padrão: 30)
    "saveResponseTo": "api_response"  // Opcional: salvar resposta em variável
  }
}
```

**Recursos:**
- Substitui `{{variáveis}}` em URL, headers e body
- Suporta body como string ou objeto
- Timeout configurável
- Salva resposta JSON em variável (se `saveResponseTo` configurado)
- Logs detalhados: `📡 Chamando webhook: POST https://...`

**Exemplo de Uso:**
```
Question: "Qual seu email?"
  ↓ (salva em user_email)
Action: Webhook
  - URL: https://crm.com/api/leads
  - Body: {"email": "{{user_email}}", "source": "whatsapp"}
  - Salva resposta em: crm_lead_id
  ↓
Message: "Cadastro realizado! ID: {{crm_lead_id}}"
```

#### 13.2. Save Contact (👤)
Atualiza informações do contato no banco de dados:

```json
{
  "type": "save_contact",
  "config": {
    "fields": {
      "name": "user_name",        // Mapeia variável → campo do contato
      "email": "user_email",
      "phone": "user_phone",
      "company": "user_company",
      "position": "user_position",
      "custom_field": "variable_name"  // Campos customizados
    }
  }
}
```

**Campos Padrão:**
- `name` - Nome do contato
- `email` - Email
- `phone` - Telefone
- `company` - Empresa
- `position` - Cargo

**Campos Customizados:**
- Qualquer campo não-padrão vai para `custom_fields` (JSONB)

**Exemplo de Uso:**
```
Question: "Qual seu nome?" → user_name
  ↓
Question: "Qual seu email?" → user_email
  ↓
Question: "Qual sua empresa?" → user_company
  ↓
Action: Save Contact
  - name: user_name
  - email: user_email
  - company: user_company
  ↓
Message: "Cadastro atualizado, {{user_name}}!"
```

#### 13.3. Update Variable (💾)
Atualiza ou cria variáveis no contexto:

```json
{
  "type": "update_variable",
  "config": {
    "variableName": "total_score",
    "value": "100",
    "operation": "set"  // set, append, increment
  }
}
```

**Operações:**

1. **set** - Define valor (sobrescreve):
```json
{
  "variableName": "status",
  "value": "approved",
  "operation": "set"
}
```

2. **append** - Concatena strings:
```json
{
  "variableName": "full_message",
  "value": " - Obrigado!",
  "operation": "append"
}
// Se full_message = "Olá" → Resultado: "Olá - Obrigado!"
```

3. **increment** - Incrementa números:
```json
{
  "variableName": "points",
  "value": "50",
  "operation": "increment"
}
// Se points = 100 → Resultado: 150
```

**Substituição de Variáveis:**
```json
{
  "variableName": "greeting",
  "value": "Olá, {{user_name}}! Você tem {{points}} pontos.",
  "operation": "set"
}
```

**Exemplo de Uso:**
```
Action: Update Variable
  - variableName: attempts
  - value: 0
  - operation: set
  ↓
Question: "Adivinhe o número"
  ↓
Action: Update Variable
  - variableName: attempts
  - value: 1
  - operation: increment
  ↓
Condition: attempts >= 3
  ├─ true → Message: "Máximo de tentativas!"
  └─ false → (volta para Question)
```

**Múltiplas Ações:**
```json
{
  "actions": [
    {
      "type": "save_contact",
      "config": {
        "fields": {
          "name": "user_name",
          "email": "user_email"
        }
      }
    },
    {
      "type": "webhook",
      "config": {
        "url": "https://crm.com/api/leads",
        "method": "POST",
        "body": {
          "name": "{{user_name}}",
          "email": "{{user_email}}"
        }
      }
    },
    {
      "type": "update_variable",
      "config": {
        "variableName": "registration_complete",
        "value": "true",
        "operation": "set"
      }
    }
  ]
}
```

**Tratamento de Erros:**
- Cada ação executa independentemente
- Se uma ação falhar, continua com as próximas
- Logs detalhados: `❌ Erro ao executar ação webhook: ConnectionError`

**Logs:**
```
⚡ Executando Action Node
  Ação 1/3: save_contact
  ✅ Contato atualizado: ['name', 'email']
  Ação 2/3: webhook
  📡 Chamando webhook: POST https://crm.com/api/leads
  ✅ Webhook respondeu: 200
  💾 Resposta salva em 'crm_response'
  Ação 3/3: update_variable
  ✅ Variável 'registration_complete' definida como: true
✅ Action Node concluído
```

---

## 🔧 Arquivos Modificados (Action Node)

- `backend/app/services/whatsapp_service.py`:
  - Método `_execute_action()` (linha ~1457-1665)
  - Modificação em `_execute_node()` (linha ~157-161)

---

### 14. **API Call Node - Chamadas HTTP para APIs Externas** 🌐

**Prioridade:** ALTA
**Arquivo:** `backend/app/services/whatsapp_service.py`

**Funcionalidade:**
- Faz chamadas HTTP para APIs externas (GET, POST, PUT, PATCH, DELETE)
- Salva resposta da API em variável para uso no fluxo
- Suporta headers customizados, query params e body
- Sistema de retry automático com backoff
- Tratamento de erro configurável (continue, stop, retry)
- Substituição de variáveis em todos os campos

**Diferença entre Action Node (webhook) e API Call Node:**
- **Action Webhook:** Fire-and-forget (envia dados, não espera/processa resposta)
- **API Call Node:** Busca dados da API e os disponibiliza no fluxo via variáveis

**Formato do Node Data:**
```json
{
  "url": "https://api.example.com/users/{{user_id}}",
  "method": "GET",  // GET, POST, PUT, DELETE, PATCH
  "headers": {
    "Authorization": "Bearer {{api_token}}",
    "Content-Type": "application/json"
  },
  "queryParams": {
    "limit": "10",
    "offset": "{{page_offset}}"
  },
  "body": {
    "name": "{{user_name}}",
    "email": "{{user_email}}"
  },
  "timeout": 30,  // Segundos (padrão: 30)
  "responseVariable": "api_response",  // Nome da variável para salvar resposta
  "errorHandling": {
    "onError": "continue",  // continue, stop, retry
    "maxRetries": 3,
    "retryDelay": 2,
    "fallbackValue": null
  }
}
```

**Métodos HTTP Suportados:**

#### 14.1. GET - Buscar dados
```json
{
  "url": "https://api.weather.com/v1/current",
  "method": "GET",
  "queryParams": {
    "city": "{{user_city}}",
    "units": "metric"
  },
  "responseVariable": "weather_data"
}
```

**Uso no fluxo:**
```
Question: "Qual sua cidade?" → user_city
  ↓
API Call: GET weather API
  ↓ Salva em: weather_data
Message: "Temperatura em {{user_city}}: {{weather_data.temp}}°C"
```

#### 14.2. POST - Enviar dados
```json
{
  "url": "https://crm.example.com/api/leads",
  "method": "POST",
  "headers": {
    "Authorization": "Bearer secret_token"
  },
  "body": {
    "name": "{{user_name}}",
    "email": "{{user_email}}",
    "source": "whatsapp"
  },
  "responseVariable": "lead_id"
}
```

#### 14.3. PUT/PATCH - Atualizar dados
```json
{
  "url": "https://api.example.com/users/{{user_id}}",
  "method": "PATCH",
  "body": {
    "status": "active",
    "last_interaction": "{{current_date}}"
  }
}
```

#### 14.4. DELETE - Deletar dados
```json
{
  "url": "https://api.example.com/temp-users/{{session_id}}",
  "method": "DELETE"
}
```

**Substituição de Variáveis:**
- ✅ URL: `https://api.com/users/{{user_id}}`
- ✅ Headers: `"Authorization": "Bearer {{api_token}}"`
- ✅ Query Params: `"city": "{{user_city}}"`
- ✅ Body (string): `"Hello {{user_name}}"`
- ✅ Body (object): `{"name": "{{user_name}}"}`

**Tratamento de Erros:**

#### Estratégia: `continue` (padrão)
```json
{
  "errorHandling": {
    "onError": "continue",
    "fallbackValue": {"error": "API indisponível"}
  }
}
```
- Continua fluxo mesmo se API falhar
- Usa `fallbackValue` como resposta (se configurado)
- Ideal para APIs não-críticas

#### Estratégia: `stop`
```json
{
  "errorHandling": {
    "onError": "stop"
  }
}
```
- Para o fluxo em caso de erro
- Transfere conversa para agente humano (priority: high)
- Ideal para APIs críticas para o fluxo

#### Estratégia: `retry` (com maxRetries)
```json
{
  "errorHandling": {
    "onError": "retry",
    "maxRetries": 3,
    "retryDelay": 2
  }
}
```
- Tenta novamente após falha
- Aguarda `retryDelay` segundos entre tentativas
- Após esgotar tentativas, usa estratégia fallback

**Logs Detalhados:**
```
🌐 Executando API Call Node
  📡 GET https://api.weather.com/v1/current?city=S%C3%A3o%20Paulo
  🔍 Query Params: {'city': 'São Paulo', 'units': 'metric'}
  ✅ API respondeu: 200
  📥 Resposta JSON recebida
  💾 Resposta salva em 'weather_data'
✅ API Call Node concluído
```

**Exemplo de Fluxo Completo:**
```
Start
  ↓
Question: "Qual seu CEP?" [responseType: text]
  ↓ Salva em: user_cep
API Call: GET https://viacep.com.br/ws/{{user_cep}}/json/
  ↓ Salva em: address_data
Condition: address_data.erro == null
  ├─ true → Message: "Você mora em {{address_data.localidade}}, {{address_data.uf}}"
  │            ↓
  │         Action: Save Contact
  │            - city: address_data.localidade
  │            - state: address_data.uf
  │
  └─ false → Message: "CEP inválido. Por favor, tente novamente."
               ↓
            Jump (node: Question CEP)
```

**Casos de Uso:**

1. **Consulta de CEP (ViaCEP API):**
```json
{
  "url": "https://viacep.com.br/ws/{{user_cep}}/json/",
  "method": "GET",
  "responseVariable": "address"
}
```

2. **Consulta de Preço (API interna):**
```json
{
  "url": "https://api.mystore.com/products/{{product_id}}/price",
  "method": "GET",
  "headers": {
    "Authorization": "Bearer {{store_api_key}}"
  },
  "responseVariable": "product_price"
}
```

3. **Validação de Cupom:**
```json
{
  "url": "https://api.mystore.com/coupons/validate",
  "method": "POST",
  "body": {
    "code": "{{coupon_code}}",
    "user_id": "{{user_id}}"
  },
  "responseVariable": "coupon_validation",
  "errorHandling": {
    "onError": "continue",
    "fallbackValue": {"valid": false, "discount": 0}
  }
}
```

4. **Consulta de Status de Pedido:**
```json
{
  "url": "https://api.mystore.com/orders/{{order_id}}",
  "method": "GET",
  "responseVariable": "order_status"
}
```

---

## 🔧 Arquivos Modificados (API Call Node)

- `backend/app/services/whatsapp_service.py`:
  - Método `_execute_api_call()` (linha ~1673-1929)
  - Modificação em `_execute_node()` (linha ~163-167)

---

### 15. **AI Prompt Node - Integração com Modelos de IA** 🤖

**Prioridade:** ALTA
**Arquivo:** `backend/app/services/whatsapp_service.py`

**Funcionalidade:**
- Integração com modelos de IA (OpenAI GPT, Anthropic Claude, APIs customizadas)
- Processamento de linguagem natural no fluxo do chatbot
- Classificação, análise de sentimento, extração de entidades, etc.
- Substituição de variáveis no prompt e system prompt
- Suporte a múltiplos provedores (openai, anthropic, custom)
- Temperature e max_tokens configuráveis

**Formato do Node Data:**
```json
{
  "provider": "openai",  // openai, anthropic, custom
  "model": "gpt-4",  // gpt-4, gpt-3.5-turbo, claude-3-opus, claude-3-sonnet, etc.
  "prompt": "Classifique o seguinte problema: {{user_message}}",
  "systemPrompt": "Você é um assistente de atendimento ao cliente.",  // Opcional
  "temperature": 0.7,  // 0.0 (determinístico) - 1.0 (criativo)
  "maxTokens": 500,  // Máximo de tokens na resposta
  "responseVariable": "ai_response",  // Variável para salvar resposta
  "apiKey": "{{openai_api_key}}",  // API key (pode usar variável)
  "timeout": 60,  // Timeout em segundos (padrão: 60)
  "errorHandling": {
    "onError": "continue",  // continue, stop
    "fallbackValue": "Não foi possível processar"
  }
}
```

**Provedores Suportados:**

#### 15.1. OpenAI (GPT-3.5, GPT-4)
```json
{
  "provider": "openai",
  "model": "gpt-4",
  "prompt": "Analise o sentimento desta mensagem: {{user_message}}",
  "systemPrompt": "Você é um analisador de sentimento. Responda apenas: positivo, negativo ou neutro.",
  "temperature": 0.3,
  "maxTokens": 50,
  "apiKey": "sk-...",
  "responseVariable": "sentiment"
}
```

**Modelos OpenAI:**
- `gpt-4` - Mais inteligente, melhor raciocínio
- `gpt-3.5-turbo` - Mais rápido e econômico
- `gpt-4-turbo` - GPT-4 otimizado

#### 15.2. Anthropic (Claude)
```json
{
  "provider": "anthropic",
  "model": "claude-3-opus-20240229",
  "prompt": "Extraia as seguintes informações: nome, email, telefone\n\n{{user_message}}",
  "systemPrompt": "Retorne apenas um JSON com as informações extraídas.",
  "temperature": 0.5,
  "maxTokens": 300,
  "apiKey": "sk-ant-...",
  "responseVariable": "extracted_data"
}
```

**Modelos Anthropic:**
- `claude-3-opus-20240229` - Mais poderoso
- `claude-3-sonnet-20240229` - Balanceado
- `claude-3-haiku-20240307` - Mais rápido

#### 15.3. Custom API (Ollama, LocalAI, etc.)
```json
{
  "provider": "custom",
  "customUrl": "http://localhost:11434/v1/chat/completions",
  "model": "llama2",
  "prompt": "Responda de forma concisa: {{user_question}}",
  "apiKey": "not-required-for-ollama",
  "responseVariable": "ai_answer"
}
```

**Substituição de Variáveis:**
- ✅ Prompt: `"Classifique: {{user_message}}"`
- ✅ System Prompt: `"Nome do atendente: {{agent_name}}"`
- ✅ API Key: `"{{openai_api_key}}"` (pode vir de variável)

**Parâmetros de Configuração:**

**Temperature (0.0 - 1.0):**
- `0.0` - Determinístico, sempre mesma resposta
- `0.3` - Pouca variação, bom para classificação
- `0.7` - Padrão, balanceado
- `1.0` - Criativo, respostas variadas

**Max Tokens:**
- Controla tamanho máximo da resposta
- `50` - Respostas curtas (classificação)
- `500` - Respostas médias (padrão)
- `2000` - Respostas longas (explicações detalhadas)

**Casos de Uso:**

#### Caso 1: Classificação de Problema
```
Question: "Descreva seu problema" → user_message
  ↓
AI Prompt:
  - Provider: openai
  - Model: gpt-3.5-turbo
  - Prompt: "Classifique o problema em uma categoria: técnico, financeiro, comercial\n\n{{user_message}}"
  - Temperature: 0.3
  ↓ Salva em: problem_category
Condition: problem_category == "técnico"
  ├─ true → Jump (flow: "Suporte Técnico")
  └─ false → Continue
```

#### Caso 2: Análise de Sentimento
```
AI Prompt:
  - Prompt: "Analise o sentimento: {{user_message}}"
  - System: "Responda apenas: positivo, negativo, neutro"
  - Temperature: 0.2
  ↓ Salva em: sentiment
Condition: sentiment == "negativo"
  ├─ true → Handoff (priority: high)
  └─ false → Continue com bot
```

#### Caso 3: Extração de Dados
```
Question: "Me passe seus dados" → user_message
  ↓
AI Prompt:
  - Prompt: "Extraia nome, email e telefone:\n\n{{user_message}}"
  - System: "Retorne JSON: {\"name\": \"\", \"email\": \"\", \"phone\": \"\"}"
  ↓ Salva em: extracted_data
Action: Save Contact
  - name: extracted_data.name
  - email: extracted_data.email
  - phone: extracted_data.phone
```

#### Caso 4: Geração de Resposta Personalizada
```
AI Prompt:
  - Provider: anthropic
  - Model: claude-3-sonnet
  - Prompt: "O cliente perguntou: {{user_question}}\n\nHistórico: {{conversation_history}}"
  - System: "Você é um atendente experiente. Responda de forma clara e profissional."
  - Temperature: 0.8
  ↓ Salva em: ai_response
Message: "{{ai_response}}"
```

#### Caso 5: Resumo de Conversa
```
AI Prompt:
  - Prompt: "Resuma esta conversa em 2 frases:\n\n{{conversation_history}}"
  - Max Tokens: 100
  ↓ Salva em: conversation_summary
Action: Save Contact
  - custom_fields.last_summary: conversation_summary
```

**Tratamento de Erros:**

#### Estratégia: `continue`
```json
{
  "errorHandling": {
    "onError": "continue",
    "fallbackValue": "não classificado"
  }
}
```
- Continua fluxo se IA falhar
- Usa valor fallback na variável
- Ideal para recursos não-críticos

#### Estratégia: `stop`
```json
{
  "errorHandling": {
    "onError": "stop"
  }
}
```
- Para fluxo e transfere para agente
- Ideal para recursos críticos

**Logs Detalhados:**
```
🤖 Executando AI Prompt Node
  🔮 Provider: openai
  🎯 Model: gpt-4
  💬 Prompt: Classifique o seguinte problema: Meu sistema está lento...
  ✅ Resposta da IA: técnico
  💾 Resposta salva em 'problem_category'
✅ AI Prompt Node concluído
```

**Exemplo de Fluxo Completo com IA:**
```
Start
  ↓
Message: "Olá! Como posso ajudar?"
  ↓
Question: "Descreva seu problema" → user_message
  ↓
AI Prompt: Classificar problema
  ↓ Salva em: category
Condition: category == "urgente"
  ├─ true → Handoff (priority: high)
  │
  └─ false → AI Prompt: Gerar resposta personalizada
              ↓ Salva em: ai_answer
           Message: "{{ai_answer}}"
              ↓
           Question: "Isso resolveu?" → satisfied
              ↓
           Condition: satisfied == "sim"
              ├─ true → End: "Ótimo! Até logo!"
              └─ false → Handoff (priority: medium)
```

**Vantagens:**
- 🎯 Classificação automática de problemas
- 🧠 Análise de sentimento em tempo real
- 📊 Extração de dados estruturados
- 💬 Respostas personalizadas por IA
- 🔀 Roteamento inteligente baseado em IA
- 📝 Resumo automático de conversas

**Segurança:**
- API keys podem vir de variáveis (não hardcoded)
- Timeout configurável previne travamentos
- Fallback values em caso de erro
- Logs não expõem API keys

---

## 🔧 Arquivos Modificados (AI Prompt Node)

- `backend/app/services/whatsapp_service.py`:
  - Método `_execute_ai_prompt()` (linha ~1937-2117)
  - Método `_call_openai()` (linha ~2119-2150)
  - Método `_call_anthropic()` (linha ~2152-2184)
  - Método `_call_custom_ai()` (linha ~2186-2215)
  - Modificação em `_execute_node()` (linha ~169-173)

---

**Status Final:** 🟢 15/25 tarefas concluídas (60% de progresso)
**Próximo Milestone:** 20/25 tarefas (80%)
