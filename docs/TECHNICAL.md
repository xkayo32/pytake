# Documentação Técnica - PyTake

## 🏗️ Arquitetura Geral

### Visão Geral do Sistema
```
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│                     │    │                     │    │                     │
│   Frontend React    │    │   Backend Go API    │    │   PostgreSQL +      │
│   Next.js 15.4.6    │◄──►│   Gin Framework     │◄──►│   Redis Cache       │
│   + TypeScript      │    │   + WebSocket       │    │                     │
│                     │    │                     │    │                     │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
           │                          │                          │
           │                          │                          │
           └────────── Nginx Reverse Proxy ─────────────────────┘
                              │
                              ▼
                    ┌─────────────────────┐
                    │                     │
                    │   WhatsApp Business │
                    │        API          │
                    │                     │
                    └─────────────────────┘
```

### Componentes Principais

#### Frontend (Next.js + TypeScript)
- **Framework**: Next.js 15.4.6 com App Router
- **UI Library**: shadcn/ui + Tailwind CSS
- **State Management**: React Hooks + Context API
- **Real-time**: WebSocket customizado
- **Forms**: React Hook Form + Zod validation
- **Charts**: Recharts para analytics

#### Backend (Go + Gin)
- **Framework**: Gin para API REST
- **WebSocket**: Gorilla WebSocket
- **Database**: GORM para PostgreSQL
- **Cache**: Redis para sessões e cache
- **Auth**: JWT com refresh tokens
- **Validation**: Gin validator

#### Database (PostgreSQL 15)
- **JSONB**: Para dados flexíveis (flows, metadata)
- **Indexes**: Otimizados para consultas frequentes
- **Migrations**: Scripts SQL versionados
- **Partitioning**: Para tabelas de logs e histórico

## 🔌 Sistema de Tempo Real

### WebSocket Implementation

#### Backend (Go)
```go
type WebSocketHub struct {
    clients    map[*Client]bool
    broadcast  chan []byte
    register   chan *Client
    unregister chan *Client
}

type Client struct {
    hub      *WebSocketHub
    conn     *websocket.Conn
    send     chan []byte
    userID   string
    tenantID string
}

// Hub principal para gerenciar conexões
func (h *WebSocketHub) Run() {
    for {
        select {
        case client := <-h.register:
            h.clients[client] = true
            
        case client := <-h.unregister:
            if _, ok := h.clients[client]; ok {
                delete(h.clients, client)
                close(client.send)
            }
            
        case message := <-h.broadcast:
            for client := range h.clients {
                select {
                case client.send <- message:
                default:
                    close(client.send)
                    delete(h.clients, client)
                }
            }
        }
    }
}
```

#### Frontend (TypeScript)
```typescript
interface WebSocketMessage {
  event: WebSocketEvent
  data: any
  timestamp: string
  conversation_id?: string
}

const useWebSocket = (options: UseWebSocketOptions) => {
  const [isConnected, setIsConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectAttempts = useRef(0)
  
  const connect = useCallback(() => {
    const ws = new WebSocket(wsUrl)
    
    ws.onopen = () => {
      setIsConnected(true)
      // Enviar token de autenticação
      ws.send(JSON.stringify({
        type: 'auth',
        token: getAuthToken(),
        user_id: userId
      }))
    }
    
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data)
      options.onMessage?.(message)
    }
    
    ws.onclose = () => {
      setIsConnected(false)
      if (options.autoReconnect) {
        attemptReconnect()
      }
    }
  }, [])
}
```

### Event System

#### Tipos de Eventos
```typescript
type WebSocketEvent = 
  | 'message_received'      // Nova mensagem do cliente
  | 'message_sent'         // Mensagem enviada pelo agente  
  | 'message_status_updated' // Atualização de status
  | 'conversation_updated'   // Mudança na conversa
  | 'typing_start'          // Cliente digitando
  | 'typing_stop'           // Cliente parou de digitar
  | 'agent_assigned'        // Agente atribuído
  | 'conversation_closed'   // Conversa fechada
```

#### Broadcasting Strategy
```go
// Broadcast para usuários específicos
func (h *WebSocketHub) BroadcastToTenant(tenantID string, message []byte) {
    for client := range h.clients {
        if client.tenantID == tenantID {
            select {
            case client.send <- message:
            default:
                // Cliente não responsivo, remover
                h.removeClient(client)
            }
        }
    }
}

// Broadcast para conversa específica
func (h *WebSocketHub) BroadcastToConversation(conversationID string, message []byte) {
    // Buscar agentes envolvidos na conversa
    agents := getConversationAgents(conversationID)
    
    for client := range h.clients {
        if contains(agents, client.userID) {
            client.send <- message
        }
    }
}
```

## 🗄️ Database Schema

### Conversas e Mensagens
```sql
-- Tabela principal de conversas
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    contact_id UUID NOT NULL REFERENCES contacts(id),
    whatsapp_config_id UUID REFERENCES whatsapp_configs(id),
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    unread_count INTEGER DEFAULT 0,
    last_message TEXT,
    last_message_time TIMESTAMPTZ,
    assigned_to UUID REFERENCES users(id),
    tags TEXT[],
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para otimização
CREATE INDEX idx_conversations_tenant_status ON conversations(tenant_id, status);
CREATE INDEX idx_conversations_assigned ON conversations(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX idx_conversations_last_message_time ON conversations(last_message_time DESC);

-- Tabela de mensagens
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_type VARCHAR(20) NOT NULL, -- 'contact', 'agent', 'system', 'bot'
    sender_id UUID REFERENCES users(id),
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text', -- 'text', 'image', 'document', etc.
    whatsapp_message_id VARCHAR(100),
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'read', 'failed'
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para mensagens
CREATE INDEX idx_messages_conversation_created ON messages(conversation_id, created_at);
CREATE INDEX idx_messages_whatsapp_id ON messages(whatsapp_message_id) WHERE whatsapp_message_id IS NOT NULL;
CREATE INDEX idx_messages_status ON messages(status) WHERE status != 'read';
```

### Particionamento de Mensagens
```sql
-- Particionamento por mês para performance
CREATE TABLE messages (
    -- campos...
) PARTITION BY RANGE (created_at);

-- Partições mensais
CREATE TABLE messages_2024_01 PARTITION OF messages
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE messages_2024_02 PARTITION OF messages  
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
```

## 🔧 Configurações e Deploy

### Variáveis de Ambiente

#### Backend (.env)
```bash
# Database
DB_HOST=postgres
DB_PORT=5432
DB_NAME=pytake
DB_USER=pytake_user
DB_PASSWORD=secure_password

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=redis_password

# JWT
JWT_SECRET=ultra_secure_jwt_secret_key_256_bits
JWT_EXPIRY=24h
JWT_REFRESH_EXPIRY=168h

# WhatsApp
WHATSAPP_API_URL=https://graph.facebook.com/v18.0
WHATSAPP_WEBHOOK_VERIFY_TOKEN=webhook_verify_token
WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id

# WebSocket
WEBSOCKET_ENABLED=true
WEBSOCKET_ALLOWED_ORIGINS=https://app.pytake.net,http://localhost:3001
WEBSOCKET_PING_INTERVAL=30s
WEBSOCKET_PONG_TIMEOUT=60s

# Server
SERVER_PORT=8080
GIN_MODE=release
CORS_ENABLED=true
LOG_LEVEL=info
```

#### Frontend (.env.local)
```bash
# API Configuration
NEXT_PUBLIC_API_URL=https://api.pytake.net
NEXT_PUBLIC_WS_URL=wss://api.pytake.net

# App Configuration
NEXT_PUBLIC_APP_NAME=PyTake
NEXT_PUBLIC_APP_VERSION=1.0.0
NEXT_PUBLIC_ENVIRONMENT=production

# Features
NEXT_PUBLIC_ENABLE_WEBSOCKET=true
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_DEBUG_MODE=false
```

### Docker Configuration

#### docker-compose.yml
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: pytake
      POSTGRES_USER: pytake_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./migrations:/docker-entrypoint-initdb.d
    ports:
      - "5432:5432"
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    restart: unless-stopped

  backend:
    build: 
      context: ./backend-go
      dockerfile: Dockerfile
    environment:
      - DB_HOST=postgres
      - REDIS_HOST=redis
      - WEBSOCKET_ENABLED=true
    ports:
      - "8080:8080"
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:8080
      - NEXT_PUBLIC_WS_URL=ws://backend:8080
    ports:
      - "3001:3000"
    depends_on:
      - backend
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./certbot/conf:/etc/letsencrypt
      - ./certbot/www:/var/www/certbot
    depends_on:
      - frontend
      - backend
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

#### Nginx Configuration
```nginx
# nginx.conf
events {
    worker_connections 1024;
}

http {
    upstream frontend {
        server frontend:3000;
    }
    
    upstream backend {
        server backend:8080;
    }

    # WebSocket proxy configuration
    map $http_upgrade $connection_upgrade {
        default upgrade;
        '' close;
    }

    server {
        listen 80;
        server_name app.pytake.net api.pytake.net;
        
        # Redirect HTTP to HTTPS
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name app.pytake.net;
        
        ssl_certificate /etc/letsencrypt/live/app.pytake.net/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/app.pytake.net/privkey.pem;
        
        location / {
            proxy_pass http://frontend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }

    server {
        listen 443 ssl http2;
        server_name api.pytake.net;
        
        ssl_certificate /etc/letsencrypt/live/api.pytake.net/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/api.pytake.net/privkey.pem;
        
        # API routes
        location / {
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
        
        # WebSocket specific configuration
        location /api/v1/conversations/ws {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection $connection_upgrade;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # WebSocket specific timeouts
            proxy_connect_timeout 7d;
            proxy_send_timeout 7d;
            proxy_read_timeout 7d;
        }
    }
}
```

## 🧪 Testing Strategy

### Backend Tests (Go)
```go
// Test WebSocket connection
func TestWebSocketConnection(t *testing.T) {
    server := httptest.NewServer(setupWebSocketHandler())
    defer server.Close()
    
    url := "ws" + server.URL[4:] + "/ws"
    ws, _, err := websocket.DefaultDialer.Dial(url, nil)
    require.NoError(t, err)
    defer ws.Close()
    
    // Test authentication
    authMsg := map[string]interface{}{
        "type":    "auth",
        "token":   "test-token",
        "user_id": "test-user",
    }
    
    err = ws.WriteJSON(authMsg)
    require.NoError(t, err)
    
    // Verify response
    var response map[string]interface{}
    err = ws.ReadJSON(&response)
    require.NoError(t, err)
    assert.Equal(t, "auth_success", response["type"])
}
```

### Frontend Tests (Jest + Testing Library)
```typescript
// Test useWebSocket hook
describe('useWebSocket', () => {
  test('should connect and authenticate', async () => {
    const mockOnMessage = jest.fn()
    const { result } = renderHook(() =>
      useWebSocket({ onMessage: mockOnMessage })
    )
    
    // Wait for connection
    await waitFor(() => {
      expect(result.current.isConnected).toBe(true)
    })
    
    // Test message handling
    act(() => {
      mockWebSocket.simulateMessage({
        event: 'message_received',
        data: { content: 'Test message' }
      })
    })
    
    expect(mockOnMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'message_received'
      })
    )
  })
})
```

### Integration Tests
```bash
# Test complete conversation flow
curl -X POST http://localhost:8080/api/v1/conversations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "contact_id": "test-contact-id",
    "initial_message": "Hello from test"
  }'

# Test WebSocket connection
wscat -c ws://localhost:8080/api/v1/conversations/ws \
  -H "Authorization: Bearer $TOKEN"
```

## 📊 Monitoring e Observability

### Métricas WebSocket
```go
// Prometheus metrics
var (
    wsConnections = prometheus.NewGaugeVec(
        prometheus.GaugeOpts{
            Name: "websocket_connections_active",
            Help: "Number of active WebSocket connections",
        },
        []string{"tenant_id"},
    )
    
    wsMessages = prometheus.NewCounterVec(
        prometheus.CounterOpts{
            Name: "websocket_messages_total",
            Help: "Total number of WebSocket messages",
        },
        []string{"event_type", "tenant_id"},
    )
)
```

### Health Checks
```go
// Health check endpoint
func healthCheck(c *gin.Context) {
    health := map[string]interface{}{
        "status":    "healthy",
        "timestamp": time.Now(),
        "services": map[string]bool{
            "database":  isDatabaseHealthy(),
            "redis":     isRedisHealthy(),
            "websocket": isWebSocketHealthy(),
        },
    }
    
    c.JSON(http.StatusOK, health)
}
```

### Logging
```go
// Structured logging
log := logrus.WithFields(logrus.Fields{
    "user_id":         userID,
    "tenant_id":       tenantID,
    "conversation_id": conversationID,
    "event":          "message_received",
})
log.Info("Processing WebSocket message")
```

## 🔒 Security Considerations

### WebSocket Security
- **Autenticação obrigatória** via JWT token
- **Validação de tenant** para isolamento
- **Rate limiting** para prevenir spam
- **Input sanitization** em todas as mensagens
- **CORS configurado** para domínios permitidos

### API Security
- **JWT com refresh tokens** para autenticação
- **RBAC** (Role-Based Access Control)
- **Input validation** com Gin validator
- **SQL injection protection** via GORM
- **HTTPS obrigatório** em produção

Esta documentação técnica serve como referência para desenvolvedores trabalhando no sistema PyTake, cobrindo desde a arquitetura até deployment e monitoramento.