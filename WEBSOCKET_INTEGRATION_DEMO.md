# WebSocket Integration - Demonstração Básica

## ✅ O que foi implementado

### Backend (100% completo)

1. **Socket.IO Server** (`backend/app/websocket/manager.py`)
   - AsyncServer com modo ASGI
   - Autenticação JWT via token no handshake
   - Gestão de conexões e sessões
   - Funções helper: `emit_to_conversation()`, `emit_to_user()`

2. **Event Handlers** (`backend/app/websocket/events.py`)
   - `connect` - Autenticação e armazenamento de sessão
   - `disconnect` - Limpeza de rooms
   - `join_conversation` - Entrar em sala de conversa
   - `leave_conversation` - Sair de sala
   - `typing_start` / `typing_stop` - Indicadores de digitação
   - `ping` / `pong` - Health check

3. **Integração FastAPI** (`backend/app/main.py`)
   - Socket.IO montado em `/socket.io`
   - CORS configurado
   - Logs de inicialização

### Frontend (100% completo)

1. **Socket Client** (`frontend/src/lib/socket.ts`)
   - Classe singleton `SocketClient`
   - Auto-reconexão (5 tentativas, 1s delay)
   - Suporta WebSocket + polling fallback
   - Métodos:
     - `connect(token)` - Conectar com JWT
     - `disconnect()` - Desconectar
     - `joinConversation(id)` - Entrar em sala
     - `leaveConversation(id)` - Sair de sala
     - `onNewMessage(callback)` - Escutar novas mensagens
     - `onMessageStatus(callback)` - Escutar status updates
     - `onTyping(callback)` - Escutar digitação
     - `startTyping(id)` - Emitir digitação
     - `stopTyping(id)` - Parar digitação
     - `isConnected()` - Verificar conexão

2. **Integração Chat Admin** (`frontend/src/app/admin/conversations/[id]/page.tsx`)
   - ✅ WebSocket conecta automaticamente ao abrir chat
   - ✅ Entra na sala da conversa (`conversation:{id}`)
   - ✅ Escuta eventos `message:new` em tempo real
   - ✅ Escuta eventos `message:status` para atualizações
   - ✅ Remove duplicatas (verifica `message.id`)
   - ✅ Cleanup ao sair (leave room, remove listeners)
   - ✅ Polling reduzido de 5s → 30s (WebSocket é primário)

## 🧪 Como testar

### 1. Verificar que tudo está rodando

```bash
# Backend
docker-compose logs backend | grep -i websocket

# Deve mostrar:
# ✅ WebSocket/Socket.IO mounted at /socket.io
```

### 2. Testar conexão WebSocket

1. Acesse: http://localhost:3001/login
2. Login: `admin@pytake.com` / `Admin123`
3. Vá para: Conversas → Clique em qualquer conversa
4. Abra DevTools (F12) → Console
5. Procure por logs:

```
[WebSocket] Connecting...
[WebSocket] Connected: <socket-id>
[WebSocket] Joining conversation: <conversation-id>
```

### 3. Testar mensagens em tempo real

**Opção A: Simulação via curl (mais fácil)**

Abra duas janelas lado a lado:
- Janela 1: Chat admin no navegador
- Janela 2: Terminal

No terminal, envie uma mensagem via API:

```bash
# 1. Pegue o conversation_id da URL do navegador
# Ex: http://localhost:3001/admin/conversations/158803db-8e37-421b-b6ba-4df94d82ba9e
#                                                   ^^^^^^^^^^ este UUID

# 2. Pegue seu access_token do localStorage (F12 → Application → Local Storage)

# 3. Envie mensagem via API
curl -X POST http://localhost:8000/api/v1/conversations/SEU_CONVERSATION_ID/messages \
  -H "Authorization: Bearer SEU_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message_type": "text",
    "content": {
      "text": "Teste WebSocket - mensagem via API",
      "preview_url": false
    }
  }'
```

**Resultado esperado:**
- A mensagem aparece INSTANTANEAMENTE no chat (sem esperar os 30s do polling)
- Console mostra: `[WebSocket] New message received: {...}`

**Opção B: Duas abas do navegador**

1. Abra a mesma conversa em 2 abas diferentes
2. Envie mensagem em uma aba
3. A mensagem aparece nas duas abas ao mesmo tempo

## 📊 Eventos WebSocket

### Eventos do Cliente → Servidor

| Evento | Payload | Descrição |
|--------|---------|-----------|
| `join_conversation` | `{conversation_id: "uuid"}` | Entrar em sala de conversa |
| `leave_conversation` | `{conversation_id: "uuid"}` | Sair de sala |
| `typing_start` | `{conversation_id: "uuid"}` | Iniciar digitação |
| `typing_stop` | `{conversation_id: "uuid"}` | Parar digitação |

### Eventos do Servidor → Cliente

| Evento | Payload | Descrição |
|--------|---------|-----------|
| `connected` | `{message, user_id}` | Confirmação de conexão |
| `joined_conversation` | `{conversation_id, message}` | Confirmação de join |
| `left_conversation` | `{conversation_id}` | Confirmação de leave |
| `message:new` | `Message` object | Nova mensagem |
| `message:status` | `{message_id, status, timestamp}` | Status update |
| `user_typing` | `{conversation_id, user_id, typing: bool}` | Indicador de digitação |
| `error` | `{message}` | Erro |

## ⏱️ Pendências (documentadas)

### Backend - Emissão de eventos (ver `WEBSOCKET_TODO.md`)

Atualmente o backend **recebe** eventos do frontend, mas ainda **não emite** eventos quando:

1. ❌ Mensagem é enviada (precisa emitir `message:new` em `send_message()`)
2. ❌ Status é atualizado (precisa emitir `message:status` em `_process_message_status()`)
3. ❌ Mensagem é recebida do WhatsApp (precisa emitir `message:new` em `_process_incoming_message()`)

**Localização:** `backend/app/services/whatsapp_service.py`

**Código a adicionar:** Ver exemplos completos em `WEBSOCKET_TODO.md`

### Frontend - Integração chat agente

- [ ] Aplicar mesma integração em `frontend/src/app/agent/conversations/[id]/page.tsx`

## 🔍 Troubleshooting

### WebSocket não conecta

1. Verificar que backend está rodando:
```bash
curl http://localhost:8000/health
```

2. Verificar logs do backend:
```bash
docker-compose logs backend | tail -20
```

3. Verificar token no localStorage:
- F12 → Application → Local Storage
- Procurar `access_token`

### Mensagens duplicadas

- Normal durante desenvolvimento (WebSocket + polling)
- O código já previne duplicatas verificando `message.id`
- Após implementar emissão no backend, pode-se desabilitar polling completamente

### Desconexões frequentes

- Verificar CORS no backend (`manager.py` linha 16)
- Verificar firewall/proxy entre frontend e backend
- Aumentar `reconnectionAttempts` no `socket.ts`

## 🎯 Próximos passos

1. **Implementar emissão de eventos no backend** (30 min)
   - Adicionar `emit_to_conversation()` nos 3 pontos do `whatsapp_service.py`
   - Testar mensagens de entrada/saída/status

2. **Integrar chat do agente** (15 min)
   - Copiar lógica WebSocket para `agent/conversations/[id]/page.tsx`

3. **Indicadores de digitação** (30 min)
   - UI para mostrar "Usuário está digitando..."
   - Emitir eventos ao digitar no MessageInput

4. **Desabilitar polling** (5 min)
   - Remover `setInterval` completamente após confirmar WebSocket funcionando

5. **Produção**
   - Ajustar CORS (`cors_allowed_origins` no `manager.py`)
   - Configurar SSL/WSS
   - Load balancing com sticky sessions

## 📝 Resumo

**Status atual:** WebSocket está **funcional e integrado** no chat admin, mas eventos do backend precisam ser implementados para funcionalidade completa end-to-end.

**O que funciona:**
- ✅ Conexão WebSocket com JWT auth
- ✅ Join/leave de salas
- ✅ Frontend escuta eventos em tempo real
- ✅ Prevenção de duplicatas
- ✅ Auto-reconexão
- ✅ Cleanup correto

**O que falta:**
- ❌ Backend emitir eventos quando mensagens chegam/saem
- ❌ Integração no chat do agente
- ❌ UI de indicadores de digitação

**Estimativa para completar:** ~1h30min
