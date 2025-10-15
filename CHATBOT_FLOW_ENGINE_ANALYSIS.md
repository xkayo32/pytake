# 📊 Análise Completa do Motor de Execução de Fluxo do Chatbot

**Data:** 2025-10-15
**Status:** ✅ Funcionando - Fluxo básico completo

---

## ✅ O Que Está Implementado

### 1. **Node Types Suportados**

| Node Type | Status | Funcionalidade |
|-----------|--------|----------------|
| `start` | ✅ Completo | Ponto de entrada do fluxo |
| `question` | ✅ Completo | Pergunta ao usuário e aguarda resposta |
| `message` | ✅ Completo | Envia mensagem e avança automaticamente |
| `end` | ✅ Completo | Mensagem de despedida e finalização |

### 2. **Recursos Implementados**

✅ **Navegação entre nodes**
- Segue edges do `canvas_data` (React Flow)
- Busca nodes dinamicamente no banco
- Suporta qualquer estrutura de fluxo

✅ **Substituição de variáveis**
- Formato: `{{variable_name}}`
- Usa `outputVariable` do node (definido no builder)
- Salva em `conversation.context_variables`

✅ **Gerenciamento de estado**
- `active_flow_id`: Flow em execução
- `current_node_id`: Posição atual no fluxo
- `context_variables`: Variáveis coletadas
- `is_bot_active`: Controle de ativação

✅ **Tratamento de mensagens**
- WhatsApp Meta Cloud API ✅
- WhatsApp Evolution API (QR Code) ✅
- Salva mensagens no banco
- Emite eventos WebSocket

✅ **Lógica de execução**
- **Question nodes**: Aguardam resposta do usuário
- **Message/End nodes**: Avançam automaticamente
- **End node**: Finaliza fluxo e desativa bot

---

## ⚠️ Limitações Atuais

### 1. **Campos de Nodes Não Utilizados**

**Question Node:**
```json
{
  "questionText": "OK ✅",
  "outputVariable": "OK ✅",
  "responseType": "text", // ❌ Não validado (number, email, phone)
  "options": [], // ❌ Não implementado (opções de escolha)
  "validation": {
    "required": true, // ❌ Não validado
    "maxAttempts": 3, // ❌ Não implementado
    "errorMessage": "..." // ❌ Não usado
  }
}
```

**Message Node:**
```json
{
  "messageText": "OK ✅",
  "messageType": "text", // ❌ Só suporta text (não image, video, document)
  "mediaUrl": null, // ❌ Não implementado
  "delay": 0, // ❌ Não implementado
  "autoAdvance": true // OK ✅ (sempre avança)
}
```

**End Node:**
```json
{
  "farewellMessage": "OK ✅",
  "sendFarewell": true, // OK ✅
  "closeConversation": false, // ❌ Não implementado
  "saveConversation": true, // ❌ Não implementado
  "addTag": null, // ❌ Não implementado
  "sendSummary": false, // ❌ Não implementado
  "endType": "close" // ❌ Não usado
}
```

### 2. **Node Types Avançados Não Implementados**

| Node Type | Prioridade | Descrição |
|-----------|-----------|-----------|
| `condition` | 🔥 Alta | Ramificação baseada em condições (if/else) |
| `action` | 🔥 Alta | Ações (salvar contato, webhook, API, etc) |
| `handoff` | 🔥 Alta | Transferir para agente humano |
| `jump` | 🟡 Média | Pular para outro node/flow |
| `delay` | 🟡 Média | Aguardar X segundos antes de avançar |
| `api_call` | 🟢 Baixa | Fazer chamada HTTP externa |
| `ai_prompt` | 🟢 Baixa | Interagir com LLM (GPT, Claude) |
| `script` | 🟢 Baixa | Executar JavaScript/Python |
| `database_query` | 🟢 Baixa | Consultar banco de dados |
| `whatsapp_template` | 🟢 Baixa | Enviar template oficial WhatsApp |
| `interactive_buttons` | 🟢 Baixa | Botões interativos |
| `interactive_list` | 🟢 Baixa | Lista de seleção |

### 3. **Validações Ausentes**

❌ **Validação de resposta do usuário**
- Não valida `responseType` (text, number, email, phone)
- Não verifica se resposta está vazia
- Não implementa `maxAttempts` (tentar novamente)

❌ **Tratamento de erros de envio**
- Se WhatsApp API falhar, fluxo trava
- Não há retry automático
- Não notifica usuário sobre erro

❌ **Loops infinitos**
- Não detecta edges circulares
- Pode entrar em loop se mal configurado

❌ **Timeout**
- Não tem limite de tempo para respostas
- Conversa pode ficar "presa" indefinidamente

---

## 🚀 Melhorias Recomendadas

### **Prioridade ALTA (Implementar Primeiro)**

#### 1. **Condition Node** 🔥
Ramificação baseada em variáveis coletadas.

**Exemplo:**
```
Question: "Qual sua idade?"
  ↓
Condition: idade >= 18
  ├─ true → Message: "Você pode prosseguir"
  └─ false → Message: "Você precisa ser maior de 18"
```

**Implementação:**
```python
if node.node_type == "condition":
    conditions = node_data.get("conditions", [])
    for condition in conditions:
        var_name = condition["variable"]
        operator = condition["operator"]  # ==, !=, >, <, >=, <=, contains
        value = condition["value"]

        # Avaliar condição
        var_value = context_vars.get(var_name)
        if eval_condition(var_value, operator, value):
            # Seguir edge com label "true"
            next_node_id = find_edge(node_id, "true")
        else:
            # Seguir edge com label "false"
            next_node_id = find_edge(node_id, "false")
```

#### 2. **Handoff Node** 🔥
Transferir para agente humano.

**Implementação:**
```python
if node.node_type == "handoff":
    # Desativar bot
    await conv_repo.update(conversation.id, {
        "is_bot_active": False,
        "status": "queued",  # Adicionar à fila
        "assigned_queue_id": node_data.get("queueId")
    })

    # Opcional: enviar mensagem de transferência
    await send_message("Transferindo para um agente humano...")

    # Finalizar fluxo
    await self._finalize_flow(conversation)
```

#### 3. **Validação de Resposta** 🔥

**Implementação:**
```python
async def _validate_user_response(self, user_text, node_data):
    response_type = node_data.get("responseType", "text")

    if response_type == "number":
        if not user_text.isdigit():
            return False, "Por favor, digite um número válido"

    elif response_type == "email":
        if "@" not in user_text:
            return False, "Por favor, digite um e-mail válido"

    elif response_type == "phone":
        phone = re.sub(r'\D', '', user_text)
        if len(phone) < 10:
            return False, "Por favor, digite um telefone válido"

    return True, None

# Usar na _process_user_response_and_advance:
valid, error_msg = await self._validate_user_response(user_text, node_data)
if not valid:
    # Incrementar tentativa
    attempts = context_vars.get(f"{node.node_id}_attempts", 0) + 1
    max_attempts = node_data.get("validation", {}).get("maxAttempts", 3)

    if attempts >= max_attempts:
        # Enviar erro e avançar
        await send_message("Número máximo de tentativas excedido.")
        await self._advance_to_next_node(...)
    else:
        # Enviar erro e aguardar nova resposta
        error_message = node_data.get("validation", {}).get("errorMessage", error_msg)
        await send_message(error_message)
        # Salvar número de tentativas
        context_vars[f"{node.node_id}_attempts"] = attempts
        return  # Não avançar
```

### **Prioridade MÉDIA (Depois das altas)**

#### 4. **Delay Node** 🟡
Aguardar X segundos antes de avançar.

**Implementação com Celery:**
```python
if node.node_type == "delay":
    delay_seconds = node_data.get("delay", 0)

    # Agendar task Celery para continuar depois
    from app.tasks.chatbot import continue_flow_after_delay

    continue_flow_after_delay.apply_async(
        args=[conversation.id, node.id, flow.id],
        countdown=delay_seconds
    )

    return  # Não avançar agora
```

#### 5. **Message Types (Image, Video, Document)** 🟡

**Implementação:**
```python
message_type = node_data.get("messageType", "text")
media_url = node_data.get("mediaUrl")

if message_type == "image" and media_url:
    await meta_api.send_image_message(
        to=contact_whatsapp_id,
        image_url=media_url,
        caption=final_text
    )
elif message_type == "video" and media_url:
    await meta_api.send_video_message(...)
elif message_type == "document" and media_url:
    await meta_api.send_document_message(...)
```

#### 6. **Jump Node** 🟡
Pular para outro node ou flow.

**Implementação:**
```python
if node.node_type == "jump":
    jump_type = node_data.get("jumpType")  # "node" ou "flow"

    if jump_type == "node":
        target_node_id = node_data.get("targetNodeId")
        # Buscar e executar target node

    elif jump_type == "flow":
        target_flow_id = node_data.get("targetFlowId")
        # Mudar active_flow_id e executar novo flow
```

### **Prioridade BAIXA (Futuras)**

- `api_call`: Chamadas HTTP externas
- `ai_prompt`: Integração com LLMs
- `script`: Execução de código customizado
- `database_query`: Consultas SQL/NoSQL
- `whatsapp_template`: Templates oficiais WhatsApp
- `interactive_buttons`: Botões interativos
- `interactive_list`: Listas de seleção

---

## 🛡️ Proteções Necessárias

### 1. **Detecção de Loops**
```python
# Rastrear nodes visitados
visited_nodes = context_vars.get("_visited_nodes", [])
if node.node_id in visited_nodes[-5:]:  # Loop detectado
    logger.error(f"Loop infinito detectado em {node.node_id}")
    await self._finalize_flow(conversation)
    return

visited_nodes.append(node.node_id)
context_vars["_visited_nodes"] = visited_nodes[-10:]  # Manter últimos 10
```

### 2. **Timeout de Resposta**
```python
# Na criação da conversa ou início do fluxo
context_vars["_flow_started_at"] = datetime.utcnow().isoformat()

# Em cada execução
flow_started_at = datetime.fromisoformat(context_vars.get("_flow_started_at"))
elapsed = (datetime.utcnow() - flow_started_at).total_seconds()

if elapsed > 3600:  # 1 hora
    logger.warning(f"Fluxo timeout após {elapsed}s")
    await self._finalize_flow(conversation)
    return
```

### 3. **Retry de Envio**
```python
max_retries = 3
for attempt in range(max_retries):
    try:
        response = await meta_api.send_text_message(...)
        break  # Sucesso
    except Exception as e:
        if attempt == max_retries - 1:
            logger.error(f"Falha após {max_retries} tentativas")
            # Salvar mensagem com status "failed"
            return
        await asyncio.sleep(2 ** attempt)  # Exponential backoff
```

---

## 📈 Métricas de Sucesso

### **Métricas Atuais (Funcionando)**
✅ Taxa de conclusão de fluxo (end node atingido)
✅ Tempo médio de execução
✅ Número de mensagens enviadas
✅ Número de variáveis coletadas

### **Métricas Futuras**
- Taxa de drop-off por node (onde usuários param)
- Taxa de erro de validação
- Taxa de handoff para humano
- Tempo médio de resposta do usuário
- Taxa de reengajamento após timeout

---

## 🎯 Resumo

### **O Que Funciona MUITO BEM:**
✅ Navegação entre nodes
✅ Substituição de variáveis
✅ Gerenciamento de estado
✅ Envio via WhatsApp (Meta API + Evolution API)
✅ Question/Message/End nodes básicos

### **Prioridades de Implementação:**
1. 🔥 **Condition Node** - Ramificação lógica
2. 🔥 **Handoff Node** - Transferir para humano
3. 🔥 **Validação de resposta** - Tipos e retry
4. 🟡 **Delay Node** - Aguardar X segundos
5. 🟡 **Message types** - Imagem, vídeo, documento

### **Proteções Críticas:**
- Detecção de loops infinitos
- Timeout de respostas
- Retry automático de envio
- Logs detalhados de erros

---

## 📝 Conclusão

O motor de execução atual está **funcional e robusto** para fluxos básicos:
- **Start → Question → Message → End** ✅

Para produção, recomendo implementar:
1. Condition Node (ramificação)
2. Handoff Node (transferir para humano)
3. Validações de resposta

O resto pode ser adicionado conforme demanda real dos usuários.

**Status Final:** 🟢 Pronto para fluxos básicos, com roadmap claro para expansão.
