# WebSocket / Socket.IO - Documentação Completa

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura](#arquitetura)
3. [Implementação Backend](#implementação-backend)
4. [Implementação Frontend](#implementação-frontend)
5. [Fluxo de Comunicação](#fluxo-de-comunicação)
6. [Autenticação e Segurança](#autenticação-e-segurança)
7. [Eventos](#eventos)
8. [Integrações Pendentes](#integrações-pendentes)
9. [Testes](#testes)
10. [Produção](#produção)

---

## Visão Geral

### O que é?

Sistema de comunicação em tempo real usando **Socket.IO** para substituir polling e fornecer atualizações instantâneas no chat.

### Por que Socket.IO?

- ✅ **Fallback automático**: WebSocket → Long Polling → Polling
- ✅ **Reconexão automática**: Mantém conexão mesmo com problemas de rede
- ✅ **Rooms/Namespaces**: Facilita broadcast para grupos específicos
- ✅ **Event-driven**: API simples baseada em eventos
- ✅ **Suporte amplo**: Funciona em todos navegadores e mobile
- ✅ **Python async**: Integração nativa com FastAPI/AsyncIO

### Benefícios

**Antes (Polling):**
- ❌ Polling a cada 5 segundos
- ❌ Delay de até 5s para mensagens
- ❌ Overhead de requisições HTTP constantes
- ❌ Maior uso de banda e recursos

**Depois (WebSocket):**
- ✅ Mensagens instantâneas (<100ms)
- ✅ Conexão persistente (menor overhead)
- ✅ Polling reduzido a 30s (apenas fallback)
- ✅ Melhor experiência do usuário

---

## Arquitetura

### Diagrama de Comunicação

```
┌─────────────┐                    ┌─────────────┐
│   Browser   │                    │   Backend   │
│  (Client)   │                    │  (Server)   │
└──────┬──────┘                    └──────┬──────┘
       │                                  │
       │  1. Connect (JWT token)          │
       │─────────────────────────────────>│
       │                                  │ Verify JWT
       │  2. Connected + user_id          │ Store session
       │<─────────────────────────────────│
       │                                  │
       │  3. join_conversation            │
       │    {conversation_id: "uuid"}     │
       │─────────────────────────────────>│
       │                                  │ Enter room
       │  4. joined_conversation          │
       │<─────────────────────────────────│
       │                                  │
       │                                  │
       │         Real-time Events         │
       │  <──────────────────────────────>│
       │   - message:new                  │
       │   - message:status               │
       │   - user_typing                  │
       │                                  │
       │  5. leave_conversation           │
       │─────────────────────────────────>│
       │                                  │ Leave room
       │  6. Disconnect                   │
       │<─────────────────────────────────│
       │                                  │
```

### Estrutura de Rooms

```
Socket.IO Server
├── conversation:158803db-...   (Room da conversa 1)
│   ├── socket-abc123           (Admin João)
│   ├── socket-def456           (Agente Maria)
│   └── socket-ghi789           (Admin Pedro)
│
├── conversation:7f22a9c1-...   (Room da conversa 2)
│   ├── socket-jkl012           (Agente Ana)
│   └── socket-mno345           (Admin João)
│
└── user:6ae9ebac-...           (Room do usuário específico)
    ├── socket-abc123           (Admin João - desktop)
    └── socket-pqr678           (Admin João - mobile)
```

**Conceitos:**
- **Room de Conversa** (`conversation:{id}`): Todos conectados àquela conversa
- **Room de Usuário** (`user:{id}`): Todos devices de um usuário específico
- **Broadcast**: Emitir para todos em uma room (exceto sender, se desejado)

---

## Implementação Backend

### 1. Estrutura de Arquivos

```
backend/app/websocket/
├── __init__.py         # Exports principais
├── manager.py          # Socket.IO server + autenticação
└── events.py           # Event handlers
```

### 2. Socket.IO Manager (`manager.py`)

```python
import socketio
from jose import jwt, JWTError
from app.core.config import settings

# Criar servidor Socket.IO
sio = socketio.AsyncServer(
    async_mode='asgi',           # Modo ASGI para FastAPI
    cors_allowed_origins='*',    # ⚠️ Ajustar para produção
    logger=True,                 # Logs de debug
    engineio_logger=False        # Desabilitar logs verbosos
)

# Criar ASGI app
sio_app = socketio.ASGIApp(
    sio,
    socketio_path='socket.io'    # Path padrão
)

def get_sio_app():
    """Retorna ASGI app para montar no FastAPI"""
    return sio_app

async def verify_token(token: str) -> Optional[dict]:
    """Verifica JWT e retorna payload"""
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM]
        )
        return payload
    except JWTError:
        return None

@sio.event
async def connect(sid, environ, auth):
    """
    Handles client connection
    - Verifica JWT token
    - Armazena user_id, organization_id, role na sessão
    - Retorna True para aceitar, False para rejeitar
    """
    if not auth or 'token' not in auth:
        return False

    payload = await verify_token(auth['token'])
    if not payload:
        return False

    # Armazena info do usuário na sessão do socket
    async with sio.session(sid) as session:
        session['user_id'] = payload.get('sub')
        session['organization_id'] = payload.get('organization_id')
        session['role'] = payload.get('role')

    # Emite confirmação
    await sio.emit('connected', {
        'message': 'Connected to PyTake WebSocket',
        'user_id': payload.get('sub')
    }, room=sid)

    return True

@sio.event
async def disconnect(sid):
    """
    Handles client disconnect
    - Limpa todas as rooms
    """
    rooms = sio.rooms(sid)
    for room in rooms:
        if room != sid:  # Não sair da própria room
            await sio.leave_room(sid, room)

# Helper functions
async def emit_to_conversation(
    conversation_id: str,
    event: str,
    data: dict,
    exclude_sid: Optional[str] = None
):
    """Emite evento para todos em uma conversa"""
    room = f"conversation:{conversation_id}"
    await sio.emit(event, data, room=room, skip_sid=exclude_sid)

async def emit_to_user(user_id: str, event: str, data: dict):
    """Emite evento para um usuário específico"""
    room = f"user:{user_id}"
    await sio.emit(event, data, room=room)
```

### 3. Event Handlers (`events.py`)

```python
from uuid import UUID
from .manager import sio

@sio.event
async def join_conversation(sid, data):
    """Cliente quer entrar em uma sala de conversa"""
    conversation_id = data.get('conversation_id')
    if not conversation_id:
        await sio.emit('error', {'message': 'conversation_id required'}, room=sid)
        return

    # Validar UUID
    try:
        UUID(conversation_id)
    except ValueError:
        await sio.emit('error', {'message': 'Invalid conversation_id'}, room=sid)
        return

    # Verificar autenticação
    async with sio.session(sid) as session:
        user_id = session.get('user_id')
        organization_id = session.get('organization_id')

    if not user_id or not organization_id:
        await sio.emit('error', {'message': 'Not authenticated'}, room=sid)
        return

    # TODO: Verificar permissão do usuário para acessar esta conversa
    # (verificar se conversa pertence à organização do usuário)

    # Entrar na room
    room = f"conversation:{conversation_id}"
    await sio.enter_room(sid, room)

    # Confirmar
    await sio.emit('joined_conversation', {
        'conversation_id': conversation_id,
        'message': f'Joined conversation {conversation_id}'
    }, room=sid)

@sio.event
async def leave_conversation(sid, data):
    """Cliente quer sair de uma sala"""
    conversation_id = data.get('conversation_id')
    if not conversation_id:
        return

    room = f"conversation:{conversation_id}"
    await sio.leave_room(sid, room)

    await sio.emit('left_conversation', {
        'conversation_id': conversation_id
    }, room=sid)

@sio.event
async def typing_start(sid, data):
    """Usuário começou a digitar"""
    conversation_id = data.get('conversation_id')
    if not conversation_id:
        return

    async with sio.session(sid) as session:
        user_id = session.get('user_id')

    if not user_id:
        return

    # Broadcast para todos na conversa (exceto sender)
    room = f"conversation:{conversation_id}"
    await sio.emit('user_typing', {
        'conversation_id': conversation_id,
        'user_id': user_id,
        'typing': True
    }, room=room, skip_sid=sid)

@sio.event
async def typing_stop(sid, data):
    """Usuário parou de digitar"""
    conversation_id = data.get('conversation_id')
    if not conversation_id:
        return

    async with sio.session(sid) as session:
        user_id = session.get('user_id')

    if not user_id:
        return

    room = f"conversation:{conversation_id}"
    await sio.emit('user_typing', {
        'conversation_id': conversation_id,
        'user_id': user_id,
        'typing': False
    }, room=room, skip_sid=sid)

@sio.event
async def ping(sid):
    """Health check"""
    await sio.emit('pong', {'timestamp': 'now'}, room=sid)
```

### 4. Integração no FastAPI (`main.py`)

```python
# ... imports ...
from app.websocket import get_sio_app
import app.websocket.events  # ⚠️ IMPORTANTE: Import para registrar handlers

# Criar FastAPI app
app = FastAPI(...)

# ... middlewares, routers ...

# Montar Socket.IO
sio_asgi_app = get_sio_app()
app.mount("/socket.io", sio_asgi_app)

print("✅ WebSocket/Socket.IO mounted at /socket.io")
```

**⚠️ Importante:**
- O `import app.websocket.events` é **obrigatório** mesmo sem usar
- Isso registra os decorators `@sio.event` no servidor
- Sem esse import, os handlers não funcionam

---

## Implementação Frontend

### 1. Socket Client (`lib/socket.ts`)

```typescript
import { io, Socket } from 'socket.io-client';

class SocketClient {
  private socket: Socket | null = null;
  private token: string | null = null;

  /**
   * Conecta ao servidor WebSocket
   * @param accessToken - JWT access token
   */
  connect(accessToken: string) {
    if (this.socket?.connected) {
      return; // Já conectado
    }

    this.token = accessToken;

    // Obter URL base do backend
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
    const baseUrl = apiUrl.replace('/api/v1', '');

    console.log('[WebSocket] Connecting to:', baseUrl);

    this.socket = io(baseUrl, {
      path: '/socket.io',
      auth: { token: accessToken },        // JWT enviado no handshake
      transports: ['websocket', 'polling'], // WebSocket primeiro
      reconnection: true,                   // Auto-reconexão
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    // Event listeners
    this.socket.on('connect', () => {
      console.log('[WebSocket] Connected:', this.socket?.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[WebSocket] Disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('[WebSocket] Connection error:', error);
    });

    this.socket.on('connected', (data) => {
      console.log('[WebSocket] Server confirmed connection:', data);
    });

    this.socket.on('error', (error) => {
      console.error('[WebSocket] Error:', error);
    });
  }

  /**
   * Desconecta do servidor
   */
  disconnect() {
    if (this.socket) {
      console.log('[WebSocket] Disconnecting...');
      this.socket.disconnect();
      this.socket = null;
      this.token = null;
    }
  }

  /**
   * Entra em uma sala de conversa
   */
  joinConversation(conversationId: string) {
    if (!this.socket?.connected) {
      console.warn('[WebSocket] Not connected. Cannot join conversation.');
      return;
    }

    console.log('[WebSocket] Joining conversation:', conversationId);
    this.socket.emit('join_conversation', { conversation_id: conversationId });
  }

  /**
   * Sai de uma sala de conversa
   */
  leaveConversation(conversationId: string) {
    if (!this.socket?.connected) {
      return;
    }

    console.log('[WebSocket] Leaving conversation:', conversationId);
    this.socket.emit('leave_conversation', { conversation_id: conversationId });
  }

  /**
   * Escuta novas mensagens
   */
  onNewMessage(callback: (message: any) => void) {
    if (!this.socket) return;
    this.socket.on('message:new', callback);
  }

  /**
   * Escuta atualizações de status de mensagem
   */
  onMessageStatus(callback: (data: any) => void) {
    if (!this.socket) return;
    this.socket.on('message:status', callback);
  }

  /**
   * Escuta indicadores de digitação
   */
  onTyping(callback: (data: any) => void) {
    if (!this.socket) return;
    this.socket.on('user_typing', callback);
  }

  /**
   * Emite evento de digitação iniciada
   */
  startTyping(conversationId: string) {
    if (!this.socket?.connected) return;
    this.socket.emit('typing_start', { conversation_id: conversationId });
  }

  /**
   * Emite evento de digitação parada
   */
  stopTyping(conversationId: string) {
    if (!this.socket?.connected) return;
    this.socket.emit('typing_stop', { conversation_id: conversationId });
  }

  /**
   * Remove event listener
   */
  off(event: string, callback?: any) {
    if (!this.socket) return;
    this.socket.off(event, callback);
  }

  /**
   * Verifica se está conectado
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

// Exporta instância singleton
export const socketClient = new SocketClient();
export default socketClient;
```

### 2. Integração em Página de Chat

```typescript
// app/admin/conversations/[id]/page.tsx

import { socketClient } from '@/lib/socket';
import { useAuthStore } from '@/store/authStore';

export default function ChatPage() {
  // ... states e outros hooks ...

  // WebSocket connection
  useEffect(() => {
    const accessToken = useAuthStore.getState().accessToken;

    if (!accessToken) {
      console.warn('[WebSocket] No access token available');
      return;
    }

    // Conectar ao WebSocket
    if (!socketClient.isConnected()) {
      socketClient.connect(accessToken);
    }

    // Entrar na sala da conversa
    socketClient.joinConversation(conversationId);

    // Listener: novas mensagens
    const handleNewMessage = (message: Message) => {
      console.log('[WebSocket] New message received:', message);
      setMessages((prev) => {
        // Previne duplicatas
        const exists = prev.some((m) => m.id === message.id);
        if (exists) return prev;
        return [...prev, message];
      });
    };

    // Listener: status updates
    const handleMessageStatus = (data: any) => {
      console.log('[WebSocket] Message status update:', data);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === data.message_id ? { ...msg, status: data.status } : msg
        )
      );
    };

    socketClient.onNewMessage(handleNewMessage);
    socketClient.onMessageStatus(handleMessageStatus);

    // Cleanup
    return () => {
      socketClient.leaveConversation(conversationId);
      socketClient.off('message:new', handleNewMessage);
      socketClient.off('message:status', handleMessageStatus);
    };
  }, [conversationId]);

  // ... resto do componente ...
}
```

---

## Fluxo de Comunicação

### 1. Conexão Inicial

```
Cliente                         Servidor
  │                               │
  │  HTTP Upgrade Request         │
  │  GET /socket.io/?token=...    │
  │─────────────────────────────>│
  │                               │
  │                               │ Verify JWT
  │                               │ Create session
  │                               │
  │  101 Switching Protocols      │
  │<─────────────────────────────│
  │                               │
  │  WebSocket established        │
  │<═════════════════════════════>│
  │                               │
  │  Event: connected             │
  │  {user_id: "..."}             │
  │<─────────────────────────────│
```

### 2. Join Conversation

```
Cliente                         Servidor
  │                               │
  │  Event: join_conversation     │
  │  {conversation_id: "uuid"}    │
  │─────────────────────────────>│
  │                               │
  │                               │ Validate UUID
  │                               │ Check permissions
  │                               │ Enter room
  │                               │
  │  Event: joined_conversation   │
  │  {conversation_id: "uuid"}    │
  │<─────────────────────────────│
```

### 3. Real-time Message

```
Cliente A                  Servidor                  Cliente B
  │                          │                          │
  │  POST /messages          │                          │
  │─────────────────────────>│                          │
  │                          │                          │
  │  201 Created             │                          │
  │<─────────────────────────│                          │
  │                          │                          │
  │                          │ Emit: message:new        │
  │                          │ Room: conversation:uuid  │
  │  Event: message:new      │─────────────────────────>│
  │<─────────────────────────│                          │
  │                          │                          │
```

---

## Autenticação e Segurança

### 1. JWT no Handshake

O token JWT é enviado no **handshake inicial**, não em cada evento:

```typescript
// Frontend
io(baseUrl, {
  auth: { token: accessToken }  // ← Enviado aqui
});

// Backend
@sio.event
async def connect(sid, environ, auth):
    token = auth['token']  # ← Recebido aqui
    payload = verify_token(token)
    # ... armazena na sessão ...
```

**Vantagens:**
- Token validado uma vez na conexão
- Não precisa enviar em cada evento
- Session persiste info do usuário

### 2. Validação de Permissões

**TODO:** Implementar verificação de permissões:

```python
@sio.event
async def join_conversation(sid, data):
    conversation_id = data.get('conversation_id')

    # Pegar info do usuário da sessão
    async with sio.session(sid) as session:
        user_id = session.get('user_id')
        organization_id = session.get('organization_id')

    # TODO: Verificar se usuário pode acessar esta conversa
    # Opções:
    # 1. Consultar banco: conversation.organization_id == user_organization_id
    # 2. Cache Redis com permissões
    # 3. Service layer com business logic

    # Se não autorizado:
    # await sio.emit('error', {'message': 'Forbidden'}, room=sid)
    # return

    # Se autorizado:
    await sio.enter_room(sid, f"conversation:{conversation_id}")
```

### 3. Rate Limiting

**TODO:** Implementar rate limiting para prevenir spam:

```python
from collections import defaultdict
from time import time

# Rate limiter simples (em produção, usar Redis)
rate_limits = defaultdict(list)

@sio.event
async def typing_start(sid, data):
    now = time()

    # Limpar timestamps antigos (>5s)
    rate_limits[sid] = [t for t in rate_limits[sid] if now - t < 5]

    # Verificar limite (max 10 eventos em 5s)
    if len(rate_limits[sid]) >= 10:
        await sio.emit('error', {
            'message': 'Rate limit exceeded'
        }, room=sid)
        return

    # Adicionar timestamp
    rate_limits[sid].append(now)

    # Processar evento...
```

### 4. CORS

**Desenvolvimento:**
```python
sio = socketio.AsyncServer(
    cors_allowed_origins='*'  # Aceita qualquer origem
)
```

**Produção:**
```python
sio = socketio.AsyncServer(
    cors_allowed_origins=[
        'https://app.pytake.com',
        'https://admin.pytake.com',
    ]
)
```

---

## Eventos

### Eventos do Cliente → Servidor

| Evento | Payload | Descrição | Resposta |
|--------|---------|-----------|----------|
| `join_conversation` | `{conversation_id: "uuid"}` | Entrar em sala | `joined_conversation` |
| `leave_conversation` | `{conversation_id: "uuid"}` | Sair de sala | `left_conversation` |
| `typing_start` | `{conversation_id: "uuid"}` | Começou a digitar | Broadcast `user_typing` |
| `typing_stop` | `{conversation_id: "uuid"}` | Parou de digitar | Broadcast `user_typing` |
| `ping` | `{}` | Health check | `pong` |

### Eventos do Servidor → Cliente

| Evento | Payload | Quando | Para quem |
|--------|---------|--------|-----------|
| `connected` | `{message, user_id}` | Após connect | Só para o cliente |
| `joined_conversation` | `{conversation_id, message}` | Após join | Só para o cliente |
| `left_conversation` | `{conversation_id}` | Após leave | Só para o cliente |
| `message:new` | `Message` object | Nova mensagem enviada/recebida | Toda a room |
| `message:status` | `{message_id, status, timestamp}` | Status atualizado (sent→delivered→read) | Toda a room |
| `user_typing` | `{conversation_id, user_id, typing: bool}` | Digitação iniciada/parada | Room (exceto sender) |
| `error` | `{message}` | Erro em qualquer operação | Só para o cliente |
| `pong` | `{timestamp}` | Resposta ao ping | Só para o cliente |

### Estrutura de Mensagem

```typescript
interface Message {
  id: string;                    // UUID
  conversation_id: string;       // UUID
  direction: 'inbound' | 'outbound';
  sender_type: 'contact' | 'agent' | 'bot';
  message_type: 'text' | 'image' | 'video' | 'audio' | 'document';
  content: {
    text?: string;
    media_url?: string;
    filename?: string;
    caption?: string;
    // ...
  };
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  whatsapp_message_id: string | null;
  created_at: string;            // ISO 8601
  sent_at: string | null;
  // ...
}
```

---

## Integrações Pendentes

### 1. Emitir Eventos no Backend

**Arquivo:** `backend/app/services/whatsapp_service.py`

#### A. Ao enviar mensagem (linha ~787)

```python
async def send_message(
    self,
    conversation_id: UUID,
    message_data: dict,
) -> Message:
    # ... código existente ...

    # Após commit
    db.commit()
    db.refresh(message)

    # 🆕 ADICIONAR: Emitir WebSocket event
    from app.websocket.manager import emit_to_conversation

    message_dict = {
        "id": str(message.id),
        "conversation_id": str(conversation_id),
        "direction": message.direction,
        "sender_type": message.sender_type,
        "message_type": message.message_type,
        "content": message.content,
        "status": message.status,
        "whatsapp_message_id": message.whatsapp_message_id,
        "created_at": message.created_at.isoformat() if message.created_at else None,
        "sent_at": message.sent_at.isoformat() if message.sent_at else None,
    }

    await emit_to_conversation(
        conversation_id=str(conversation_id),
        event="message:new",
        data=message_dict
    )

    return message
```

#### B. Ao processar status update (linha ~388)

```python
async def _process_message_status(self, status_data: dict):
    # ... código existente ...

    # Após atualizar status
    message.status = message_status
    # ... commit ...

    # 🆕 ADICIONAR: Emitir WebSocket event
    from app.websocket.manager import emit_to_conversation
    from datetime import datetime, timezone

    await emit_to_conversation(
        conversation_id=str(message.conversation_id),
        event="message:status",
        data={
            "message_id": str(message.id),
            "status": message_status,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    )
```

#### C. Ao receber mensagem (linha ~310)

```python
async def _process_incoming_message(self, message_data: dict):
    # ... código existente ...
    # Após criar new_message

    # 🆕 ADICIONAR: Emitir WebSocket event
    from app.websocket.manager import emit_to_conversation

    message_dict = {
        "id": str(new_message.id),
        "conversation_id": str(conversation.id),
        "direction": new_message.direction,
        "sender_type": new_message.sender_type,
        "message_type": new_message.message_type,
        "content": new_message.content,
        "status": new_message.status,
        "whatsapp_message_id": new_message.whatsapp_message_id,
        "created_at": new_message.created_at.isoformat() if new_message.created_at else None,
        "sent_at": new_message.sent_at.isoformat() if new_message.sent_at else None,
    }

    await emit_to_conversation(
        conversation_id=str(conversation.id),
        event="message:new",
        data=message_dict
    )
```

### 2. Integrar Chat do Agente

**Arquivo:** `frontend/src/app/agent/conversations/[id]/page.tsx`

Copiar a mesma lógica WebSocket do chat admin:
- Import `socketClient` e `useAuthStore`
- useEffect para conexão WebSocket
- Handlers para `message:new` e `message:status`
- Cleanup no unmount

### 3. Indicadores de Digitação (UI)

**Arquivo:** `frontend/src/components/chat/MessageInput.tsx`

```typescript
import { socketClient } from '@/lib/socket';
import { useDebounce } from '@/hooks/useDebounce'; // TODO: criar

export default function MessageInput({ conversationId, ... }) {
  const [isTyping, setIsTyping] = useState(false);

  // Emitir typing_start quando começar a digitar
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);

    if (!isTyping) {
      setIsTyping(true);
      socketClient.startTyping(conversationId);
    }

    // Reset timer
    debouncedStopTyping();
  };

  // Emitir typing_stop após 2s sem digitar
  const stopTyping = () => {
    setIsTyping(false);
    socketClient.stopTyping(conversationId);
  };

  const debouncedStopTyping = useDebounce(stopTyping, 2000);

  // ... resto do componente ...
}
```

**Arquivo:** `frontend/src/components/chat/MessageList.tsx`

```typescript
export default function MessageList({ conversationId, ... }) {
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  useEffect(() => {
    const handleTyping = (data: any) => {
      if (data.typing) {
        setTypingUsers((prev) => [...new Set([...prev, data.user_id])]);
      } else {
        setTypingUsers((prev) => prev.filter((id) => id !== data.user_id));
      }

      // Auto-remove após 5s (caso não receba typing_stop)
      setTimeout(() => {
        setTypingUsers((prev) => prev.filter((id) => id !== data.user_id));
      }, 5000);
    };

    socketClient.onTyping(handleTyping);

    return () => {
      socketClient.off('user_typing', handleTyping);
    };
  }, []);

  return (
    <div>
      {/* ... mensagens ... */}

      {typingUsers.length > 0 && (
        <div className="px-4 py-2 text-sm text-gray-500 italic">
          {typingUsers.length === 1
            ? 'Alguém está digitando...'
            : `${typingUsers.length} pessoas estão digitando...`}
        </div>
      )}
    </div>
  );
}
```

---

## Testes

### 1. Teste de Conexão

```bash
# Console do navegador (F12)
# Logs esperados:
[WebSocket] Connecting to: http://localhost:8000
[WebSocket] Connected: abc123def456
[WebSocket] Server confirmed connection: {user_id: "..."}
```

### 2. Teste de Join/Leave

```javascript
// DevTools Console
socketClient.joinConversation('158803db-8e37-421b-b6ba-4df94d82ba9e');
// Log: [WebSocket] Joining conversation: 158803db-...

socketClient.leaveConversation('158803db-8e37-421b-b6ba-4df94d82ba9e');
// Log: [WebSocket] Leaving conversation: 158803db-...
```

### 3. Teste End-to-End (Mensagem Real-time)

**Setup:**
1. Abrir chat em 2 navegadores diferentes (Chrome + Firefox)
2. Login com mesmo usuário em ambos
3. Abrir mesma conversa

**Teste:**
1. Enviar mensagem no navegador A
2. Verificar que aparece instantaneamente no navegador B
3. Console B deve mostrar: `[WebSocket] New message received: {...}`

**Resultado esperado:**
- Delay < 100ms entre envio e recebimento
- Sem duplicatas
- Status atualizado em ambos navegadores

### 4. Teste de Reconexão

```javascript
// DevTools Console
socketClient.disconnect();
// Log: [WebSocket] Disconnecting...

// Aguardar 2 segundos...

// Socket.IO tentará reconectar automaticamente
// Logs esperados:
[WebSocket] Attempting reconnection (1/5)
[WebSocket] Connected: xyz789
```

### 5. Teste de Fallback (Polling)

**Como testar:**
1. Bloquear WebSocket no DevTools:
   - F12 → Network → WS tab
   - Throttle ou disable WebSocket
2. Socket.IO deve automaticamente usar polling
3. Verificar no Network tab: requisições GET/POST para `/socket.io/`

---

## Produção

### 1. Checklist de Segurança

- [ ] **CORS:** Ajustar `cors_allowed_origins` para domínios específicos
- [ ] **SSL/TLS:** Configurar WSS (WebSocket Secure) via NGINX/proxy
- [ ] **Rate Limiting:** Implementar limites por IP/usuário
- [ ] **Permissions:** Validar acesso a conversas no `join_conversation`
- [ ] **Token Expiry:** Lidar com JWT expirado (forçar reconexão)
- [ ] **Logs:** Desabilitar logs verbosos (`logger=False`)

### 2. NGINX Reverse Proxy

```nginx
# /etc/nginx/sites-available/pytake

upstream backend {
    server backend:8000;
}

server {
    listen 443 ssl http2;
    server_name api.pytake.com;

    # SSL config
    ssl_certificate /etc/letsencrypt/live/pytake.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/pytake.com/privkey.pem;

    # WebSocket upgrade
    location /socket.io/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
    }

    # API endpoints
    location / {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 3. Load Balancing

**Problema:** Socket.IO com múltiplos servidores backend

**Solução 1: Sticky Sessions (NGINX)**

```nginx
upstream backend {
    ip_hash;  # Mesma IP sempre vai para mesmo servidor
    server backend1:8000;
    server backend2:8000;
}
```

**Solução 2: Redis Adapter (Recomendado)**

```python
# backend/app/websocket/manager.py
import socketio

# Criar Redis adapter
sio = socketio.AsyncServer(
    async_mode='asgi',
    client_manager=socketio.AsyncRedisManager('redis://redis:6379')
)
```

Com Redis Adapter:
- Eventos são transmitidos entre todos servidores backend
- Cliente conectado ao servidor A recebe eventos emitidos pelo servidor B
- Permite horizontal scaling sem sticky sessions

### 4. Monitoramento

**Métricas para monitorar:**
- Conexões ativas (`sio.manager.rooms`)
- Eventos por segundo
- Latência de eventos (emit → receive)
- Taxa de reconexão
- Erros de autenticação

**Prometheus + Grafana:**

```python
# backend/app/websocket/manager.py
from prometheus_client import Counter, Gauge

websocket_connections = Gauge('websocket_connections', 'Active WebSocket connections')
websocket_events = Counter('websocket_events', 'WebSocket events', ['event_type'])

@sio.event
async def connect(sid, environ, auth):
    websocket_connections.inc()
    # ...

@sio.event
async def disconnect(sid):
    websocket_connections.dec()
    # ...

@sio.event
async def join_conversation(sid, data):
    websocket_events.labels(event_type='join_conversation').inc()
    # ...
```

### 5. Performance

**Otimizações:**

1. **Connection Pooling:** Limitar conexões simultâneas por usuário
2. **Message Batching:** Agrupar status updates
3. **Compression:** Habilitar gzip para payloads grandes
4. **Redis Pub/Sub:** Para broadcast eficiente entre servers

```python
# Limitar conexões por usuário
MAX_CONNECTIONS_PER_USER = 3

@sio.event
async def connect(sid, environ, auth):
    payload = await verify_token(auth['token'])
    user_id = payload['sub']

    # Contar conexões existentes
    user_sockets = [
        s for s in sio.manager.rooms.get(f'user:{user_id}', [])
    ]

    if len(user_sockets) >= MAX_CONNECTIONS_PER_USER:
        # Desconectar socket mais antigo
        oldest_sid = user_sockets[0]
        await sio.disconnect(oldest_sid)

    # ... continuar com conexão ...
```

---

## Troubleshooting

### Problema: WebSocket não conecta

**Sintomas:**
- Console mostra: `[WebSocket] Connection error: ...`
- Não recebe evento `connected`

**Soluções:**
1. Verificar que backend está rodando: `curl http://localhost:8000/health`
2. Verificar logs do backend: `docker-compose logs backend | grep -i websocket`
3. Verificar CORS no `manager.py`
4. Verificar que access token é válido (F12 → Application → Local Storage)
5. Testar com `transports: ['polling']` primeiro (desabilitar WebSocket temporariamente)

### Problema: Eventos não chegam

**Sintomas:**
- WebSocket conectado, mas `message:new` não é recebido
- Console não mostra logs de novos eventos

**Soluções:**
1. Verificar que `import app.websocket.events` está no `main.py`
2. Verificar logs do backend para confirmar emissão: `Emitted message:new to room ...`
3. Verificar que cliente fez `joinConversation()` antes de escutar eventos
4. Verificar que `conversation_id` é o mesmo (UUID exato)
5. Usar `ping/pong` para testar conexão bidirecional

### Problema: Mensagens duplicadas

**Sintomas:**
- Mesma mensagem aparece 2x no chat

**Causas e soluções:**
1. **WebSocket + Polling:** Normal durante transição
   - Solução: Código já previne (verifica `message.id`)
2. **Múltiplos listeners:** Component montou/desmontou incorretamente
   - Solução: Verificar cleanup no useEffect
3. **Backend emite múltiplas vezes:** Bug no código de emissão
   - Solução: Adicionar logs e verificar fluxo

### Problema: Desconexões frequentes

**Sintomas:**
- `[WebSocket] Disconnected: ...` a cada poucos minutos
- Reconexões constantes

**Causas e soluções:**
1. **Token expirado:** JWT expirou durante sessão
   - Solução: Implementar refresh no frontend
2. **Timeout de proxy:** NGINX/CloudFlare mata conexão idle
   - Solução: Implementar ping/pong periódico (keepalive)
3. **Limite de conexões:** Backend atingiu limite
   - Solução: Aumentar limites no uvicorn/gunicorn

### Problema: Typing indicators não funcionam

**Sintomas:**
- Emite `typing_start`, mas outro usuário não vê

**Soluções:**
1. Verificar que evento usa `skip_sid=sid` (não emitir para si mesmo)
2. Verificar que ambos usuários estão na mesma room
3. Verificar que `user_id` está correto na sessão
4. Adicionar logs no handler de `typing_start` no backend

---

## Resumo Executivo

### ✅ O que temos

- Backend Socket.IO completo com autenticação JWT
- Event handlers para join/leave/typing
- Frontend SocketClient wrapper singleton
- Integração no chat admin com listeners em tempo real
- Documentação completa

### ❌ O que falta

- Emitir eventos do backend quando mensagens são enviadas/recebidas
- Integrar WebSocket no chat do agente
- UI para indicadores de digitação
- Validação de permissões no `join_conversation`
- Testes automatizados

### 📊 Métricas de Sucesso

| Métrica | Antes (Polling) | Depois (WebSocket) |
|---------|-----------------|---------------------|
| Latência média | ~2500ms | <100ms |
| Requisições HTTP/min | ~12 | ~0 |
| Uso de banda | Alto | Baixo |
| Experiência usuário | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

### 🚀 Roadmap

**Fase 1 (Atual - 75% completo):**
- ✅ Infraestrutura WebSocket
- ✅ Autenticação
- ✅ Frontend client
- ✅ Integração básica

**Fase 2 (1-2 dias):**
- [ ] Emitir eventos do backend
- [ ] Integrar chat do agente
- [ ] Testes end-to-end

**Fase 3 (1 semana):**
- [ ] Indicadores de digitação
- [ ] Validação de permissões
- [ ] Rate limiting
- [ ] Monitoramento

**Fase 4 (Produção):**
- [ ] SSL/WSS
- [ ] Redis Adapter para scaling
- [ ] Otimizações de performance
- [ ] Documentação de deploy

---

## Links Úteis

- [Socket.IO Docs](https://socket.io/docs/v4/)
- [Socket.IO Python](https://python-socketio.readthedocs.io/)
- [FastAPI WebSocket](https://fastapi.tiangolo.com/advanced/websockets/)
- [Redis Adapter](https://socket.io/docs/v4/redis-adapter/)

---

**Última atualização:** 2025-10-09
**Status:** Em desenvolvimento (Fase 1 - 75% completo)
