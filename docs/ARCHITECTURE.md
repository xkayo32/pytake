# PyTake - Arquitetura do Sistema

## Visão Geral

PyTake é um sistema de atendimento multicanal via WhatsApp que permite gerenciamento de conversas entre múltiplos clientes e agentes, com suporte a fluxos automatizados e integrações via REST API.

## Arquitetura de Alto Nível

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                         │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────┐    │
│  │   Dashboard  │  │ Flow Builder │  │  Agent Interface   │    │
│  └─────────────┘  └──────────────┘  └────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ WebSocket + REST API
                                │
┌─────────────────────────────────────────────────────────────────┐
│                      Backend (Rust - Actix)                      │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────┐    │
│  │  API Gateway│  │ Flow Engine  │  │ Message Router     │    │
│  └─────────────┘  └──────────────┘  └────────────────────┘    │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────┐    │
│  │ Auth Service│  │Module System │  │ Queue Manager      │    │
│  └─────────────┘  └──────────────┘  └────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                    │              │              │
    ┌───────────────┴──────┐ ┌────┴────┐ ┌──────┴──────────┐
    │   WhatsApp Cloud API │ │PostgreSQL│ │Redis (Queue/Cache)│
    └──────────────────────┘ └─────────┘ └─────────────────┘
```

## Componentes Principais

### 1. Backend (Rust)

#### Core Services
- **API Gateway**: Gerencia todas as requisições HTTP/WebSocket
- **Auth Service**: Autenticação JWT e controle de acesso baseado em roles
- **Message Router**: Distribui mensagens entre clientes e agentes
- **Flow Engine**: Executa fluxos de conversação configurados
- **Module System**: Sistema de plugins para integrações externas
- **Queue Manager**: Gerencia filas de atendimento com Redis

#### Tecnologias Recomendadas
- **Framework Web**: Actix-web 4.x (alta performance e async)
- **ORM**: SeaORM ou Diesel (type-safe)
- **WebSocket**: actix-ws
- **Serialização**: Serde
- **Async Runtime**: Tokio
- **Cache/Queue**: Redis com redis-rs
- **Logs**: tracing + tracing-subscriber

### 2. Frontend (React)

#### Interfaces
- **Dashboard**: Métricas em tempo real e gestão
- **Flow Builder**: Interface drag-and-drop para criar fluxos
- **Agent Interface**: Chat em tempo real com múltiplas conversas
- **Admin Panel**: Configurações e gestão de usuários

#### Tecnologias Recomendadas
- **Framework**: React 18 com TypeScript
- **Estado**: Zustand ou Redux Toolkit
- **UI**: Tailwind CSS + ShadCN/UI
- **WebSocket**: Socket.io-client
- **Gráficos**: Recharts
- **Flow Builder**: React Flow
- **Formulários**: React Hook Form + Zod

### 3. Banco de Dados

#### PostgreSQL - Estrutura Principal
```sql
-- Tabelas principais
- users (agentes e admins)
- customers (clientes WhatsApp)
- conversations
- messages
- flows
- flow_nodes
- flow_executions
- modules
- module_configurations
- webhooks
- audit_logs
```

#### Redis - Cache e Filas
- Sessões ativas
- Estado de conversas
- Filas de mensagens
- Cache de configurações

## Fluxo de Mensagens

1. **Recepção**: WhatsApp Cloud API → Webhook → Message Router
2. **Processamento**: Flow Engine avalia se há fluxo ativo
3. **Roteamento**: Direciona para agente ou resposta automática
4. **Resposta**: Envia via WhatsApp Cloud API

## Sistema de Módulos

### Estrutura de um Módulo
```rust
pub trait Module: Send + Sync {
    fn name(&self) -> &str;
    fn version(&self) -> &str;
    async fn execute(&self, context: ModuleContext) -> Result<ModuleResponse>;
}
```

### Exemplos de Módulos
- **Boleto Module**: Integração com sistemas de cobrança
- **CRM Module**: Busca dados de clientes
- **API Module**: Chamadas REST genéricas
- **Webhook Module**: Notificações externas

## Segurança

### Medidas Implementadas
1. **Autenticação**: JWT com refresh tokens
2. **Autorização**: RBAC (Role-Based Access Control)
3. **Criptografia**: TLS 1.3 + encriptação de dados sensíveis
4. **Rate Limiting**: Por IP e por usuário
5. **Validação**: Entrada sanitizada em todos endpoints
6. **Auditoria**: Logs completos de todas ações

### Compliance
- LGPD: Anonimização e direito ao esquecimento
- WhatsApp Business API: Seguir políticas oficiais

## Escalabilidade

### Estratégias
1. **Horizontal Scaling**: Backend stateless
2. **Load Balancing**: NGINX ou HAProxy
3. **Message Queue**: Redis Pub/Sub para distribuição
4. **Database**: Read replicas e particionamento
5. **Caching**: Redis com TTL apropriado

## Monitoramento

### Métricas Essenciais
- Latência de mensagens
- Taxa de resolução de fluxos
- Tempo médio de atendimento
- Disponibilidade da API
- Performance dos módulos

### Stack de Observabilidade
- **Logs**: Loki + Grafana
- **Métricas**: Prometheus + Grafana
- **Tracing**: Jaeger
- **Alertas**: AlertManager

## Desenvolvimento

### Ambientes
1. **Local**: Docker Compose
2. **Staging**: Kubernetes (K3s)
3. **Produção**: Kubernetes (EKS/GKE/AKS)

### CI/CD
- GitHub Actions ou GitLab CI
- Testes automatizados
- Deploy com rollback automático