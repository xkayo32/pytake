# PyTake - WhatsApp Business Automation Platform

## 🚀 Visão Geral

PyTake é uma plataforma completa para automação de WhatsApp Business API, permitindo criar flows visuais, gerenciar conversas e automatizar atendimento ao cliente.

### ✨ Funcionalidades Principais

- **Editor Visual de Flows**: Interface drag-and-drop para criar automações
- **Sistema de Filas de Atendimento**: Gerenciamento completo de filas e agentes
- **Transfer to Queue**: Componente para transferir conversas para atendimento humano
- **Fluxos Universais**: Automação que responde a qualquer mensagem automaticamente
- **Sistema de Prioridades**: Template direto > Palavra-chave > Fluxo universal
- **Verificação Janela 24h**: Detecção inteligente de janela de mensagem ativa
- **WhatsApp Business API**: Integração completa com envio de mensagens e templates
- **Conversas em Tempo Real**: Sistema completo de chat com WebSocket
- **Gestão de Conversas**: Dashboard para acompanhar todas as conversas
- **Templates**: Criação e gestão de templates aprovados
- **Analytics**: Relatórios e métricas de desempenho
- **Multi-tenant**: Suporte para múltiplos clientes

## 🛠 Stack Tecnológica

- **Backend**: Go com Gin framework
- **Frontend**: Next.js 15.4.6 com React Flow + TypeScript
- **Real-time**: WebSocket para comunicação bidirecional
- **Database**: PostgreSQL 15 com JSONB
- **Cache**: Redis 7
- **Proxy**: Nginx com SSL
- **Containerização**: Docker + Docker Compose

## 🏃‍♂️ Início Rápido

### Pré-requisitos
- Docker e Docker Compose
- Domínio configurado (opcional para desenvolvimento)

### Instalação

1. **Clone o repositório**
```bash
git clone <repository-url>
cd pytake-backend
```

2. **Configure as variáveis de ambiente**
```bash
cp .env.example .env
# Edite o arquivo .env com suas configurações
```

3. **Inicie os serviços**
```bash
docker-compose up -d
```

4. **Verifique o status**
```bash
docker-compose ps
```

### Acesso
- **Frontend**: http://localhost:3001 ou https://app.pytake.net
- **API**: http://localhost:8080 ou https://api.pytake.net

## 📊 Arquitetura

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Next.js App   │────│   Go Backend    │────│  PostgreSQL DB  │
│  (Frontend)     │    │     (API)       │    │   + Redis       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                        │                        │
         └──────────── Nginx Proxy ──────────────────────────┘
```

## 🔧 Desenvolvimento

### Estrutura do Projeto

```
pytake-backend/
├── backend-go/          # API Go
├── frontend/            # Next.js App
├── migrations/          # Scripts SQL
├── docker-compose.yml   # Orquestração Docker
├── nginx.conf          # Configuração Nginx
└── certbot/            # Certificados SSL
```

### Scripts Úteis

```bash
# Ver logs em tempo real
docker-compose logs -f

# Rebuild de um serviço específico
docker-compose up -d --build frontend

# Executar migrations
docker exec pytake-postgres psql -U pytake_user -d pytake -f /migrations/script.sql

# Backup do banco
docker exec pytake-postgres pg_dump -U pytake_user pytake > backup.sql
```

## 🔄 Fluxos Universais

### Como Funcionam

Os **Fluxos Universais** são uma funcionalidade avançada que permite resposta automática a qualquer mensagem recebida no WhatsApp, seguindo uma hierarquia de prioridades:

#### Sistema de Prioridades
1. **Templates Diretos** (Prioridade Máxima)
   - Fluxos iniciados por templates enviados diretamente
   - Têm precedência sobre todos os outros tipos

2. **Fluxos por Palavra-chave** (Prioridade Alta)  
   - Ativados quando mensagem contém palavras-chave específicas
   - Exemplo: "ajuda", "suporte", "vendas"

3. **Fluxos Universais** (Fallback)
   - Executados quando não há template ativo nem palavra-chave
   - Resposta padrão para qualquer mensagem

#### Recursos Avançados

- **Verificação de Janela 24h**: Sistema detecta automaticamente se há janela ativa para envio direto
- **Fallback para Templates**: Usuários fora da janela recebem templates aprovados
- **Configuração de Expiração**: Tempo configurável (padrão: 10 minutos)
- **Logs Detalhados**: Rastreamento completo da execução dos fluxos

### Configuração

1. **Criar Fluxo Universal**
   - Acesse o editor de flows
   - Selecione "Fluxo Universal" como tipo
   - Configure nós: Trigger Universal → Verificação Janela → Mensagem/Template

2. **Componentes Disponíveis**
   - `trigger_universal`: Gatilho para qualquer mensagem
   - `logic_window_check`: Verificação da janela 24h
   - `msg_text`: Envio de mensagem direta
   - `msg_template`: Envio de template aprovado
   - `action_transfer_to_queue`: Transferência para fila de atendimento

## 🗄️ Estrutura do Banco de Dados

### Tabelas do Sistema de Filas

#### `queues`
Armazena configurações das filas de atendimento
- Configurações de tempo máximo e tamanho
- Horário de funcionamento
- Mensagens personalizadas

#### `agents`
Informações dos agentes/atendentes
- Status (online/offline/busy/away/break)
- Capacidade de atendimento simultâneo
- Skills e departamentos

#### `queue_items`
Itens aguardando ou em atendimento
- Posição na fila
- Prioridade e status
- Tempos de espera e atendimento

#### `queue_history`
Histórico completo de atendimentos
- Ações realizadas (entered/assigned/completed/abandoned)
- Métricas de tempo
- Avaliações e feedback

#### `queue_metrics`
Métricas agregadas por hora
- Total de entradas/saídas
- Tempos médios
- Taxa de abandono

## 📡 API Endpoints

### Conversas
- `GET /api/v1/conversations` - Listar conversas com filtros
- `GET /api/v1/conversations/{id}` - Obter conversa específica
- `GET /api/v1/conversations/{id}/messages` - Listar mensagens da conversa
- `POST /api/v1/conversations/{id}/messages` - Enviar mensagem
- `PATCH /api/v1/conversations/{id}/read` - Marcar como lida
- `PATCH /api/v1/conversations/{id}/status` - Atualizar status
- `GET /api/v1/conversations/stats` - Estatísticas de conversas
- `WS /api/v1/conversations/ws` - WebSocket para tempo real

### Flows
- `GET /api/v1/flows` - Listar flows
- `POST /api/v1/flows` - Criar flow
- `GET /api/v1/flows/{id}` - Obter flow
- `POST /api/v1/flows/{id}/test` - Testar flow

### WhatsApp
- `GET /api/v1/whatsapp/numbers` - Listar números
- `GET /api/v1/whatsapp/templates` - Listar templates
- `POST /api/v1/whatsapp/webhook` - Receber mensagens (interno)

### Filas de Atendimento
- `GET /api/v1/queues` - Listar todas as filas
- `POST /api/v1/queues` - Criar nova fila
- `GET /api/v1/queues/{id}` - Detalhes da fila
- `PUT /api/v1/queues/{id}` - Atualizar fila
- `GET /api/v1/queues/{id}/items` - Listar itens na fila
- `POST /api/v1/queues/{id}/assign` - Atribuir item a agente
- `GET /api/v1/queues/dashboard` - Métricas do dashboard

### Agentes
- `GET /api/v1/agents` - Listar agentes
- `PUT /api/v1/agents/{id}/status` - Atualizar status do agente
- `GET /api/v1/agents/{id}/queues` - Filas do agente

## 💬 Sistema de Conversas em Tempo Real

### Visão Geral
Sistema completo de chat em tempo real com WebSocket para comunicação bidirecional entre agentes e clientes WhatsApp.

### Funcionalidades

#### 🔄 WebSocket Integration
- **Conexão Persistente**: Mantém conexão ativa com auto-reconexão
- **Autenticação Automática**: Token JWT enviado na conexão
- **Eventos em Tempo Real**: Mensagens, status e notificações instantâneas
- **Fallback Inteligente**: Atualização via polling quando WebSocket falha

#### 📱 Interface de Conversas
- **Lista de Conversas**: Visão geral com filtros e busca
- **Chat Individual**: Interface completa de mensagens
- **Indicadores Visuais**: Status de conexão, entrega e leitura
- **Sincronização**: Estado consistente entre múltiplas abas/dispositivos

#### 🚀 Recursos Avançados
- **Filtros Inteligentes**: Por status, agente, período
- **Busca Rápida**: Nome, telefone ou conteúdo das mensagens  
- **Contadores**: Mensagens não lidas em tempo real
- **Auto-scroll**: Scroll automático para novas mensagens
- **Estados de Mensagem**: Pending → Sent → Delivered → Read

### Arquitetura WebSocket

```javascript
// Eventos suportados pelo WebSocket
{
  "message_received": "Nova mensagem do cliente",
  "message_sent": "Mensagem enviada pelo agente",
  "message_status_updated": "Atualização de status da mensagem",
  "conversation_updated": "Mudança no status da conversa",
  "typing_start": "Cliente começou a digitar",
  "typing_stop": "Cliente parou de digitar"
}
```

### Fluxo de Mensagens

```mermaid
graph LR
    A[Cliente WhatsApp] --> B[Webhook Backend]
    B --> C[WebSocket Server]
    C --> D[Frontend Agent]
    D --> E[API Send Message]
    E --> F[WhatsApp API]
    F --> A
```

## 🎯 Sistema de Filas de Atendimento

### Visão Geral
O sistema de filas permite gerenciar atendimento humano integrado com automações WhatsApp.

### Funcionalidades

#### 📊 Dashboard de Filas
- **Visão em tempo real**: Monitor com métricas atualizadas
- **Gerenciamento de agentes**: Status online/offline/ocupado
- **Distribuição automática**: Algoritmo inteligente de distribuição
- **Priorização**: Suporte a níveis de prioridade (Normal, Alta, Urgente)

#### 🔄 Transfer to Queue
Componente no editor de fluxos para transferir conversas automaticamente:

1. **Configurações disponíveis**:
   - Seleção de fila de destino
   - Nível de prioridade
   - Mensagem personalizada ao transferir
   - Timeout e ações de fallback
   - Metadata adicional

2. **Uso no Flow**:
```javascript
// Exemplo de configuração do nó Transfer to Queue
{
  type: "action_transfer_to_queue",
  config: {
    queueId: "uuid-da-fila",
    queueName: "Suporte Técnico",
    priority: 1, // 0=Normal, 1=Alta, 2=Urgente
    message: "Você está sendo transferido para nosso suporte...",
    waitTimeoutMinutes: 30,
    fallbackAction: "abandon"
  }
}
```

#### 🎮 Monitor de Filas
Interface de 3 colunas para gerenciar atendimentos:
- **Coluna 1**: Lista de espera com posições
- **Coluna 2**: Atendimentos em andamento
- **Coluna 3**: Histórico recente

### Fluxo de Atendimento

```mermaid
graph LR
    A[Conversa WhatsApp] --> B[Flow Automático]
    B --> C{Precisa Humano?}
    C -->|Sim| D[Transfer to Queue]
    D --> E[Fila de Espera]
    E --> F[Distribuição Automática]
    F --> G[Agente Disponível]
    G --> H[Atendimento]
    C -->|Não| I[Continua Automação]
```

## 🔒 Configuração WhatsApp

1. **Obter Token**: Meta Business > WhatsApp Business API
2. **Configurar Webhook**: URL: `https://api.pytake.net/webhook/whatsapp`
3. **Verificar Token**: Configure no arquivo `.env`

## 🚢 Produção

### SSL/HTTPS
```bash
# Gerar certificados Let's Encrypt
./setup-letsencrypt.sh
```

### Monitoramento
```bash
# Status dos containers
docker stats

# Logs de erro
docker-compose logs --tail=100 backend
```

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está licenciado sob a MIT License - veja o arquivo [LICENSE](LICENSE) para detalhes.

## 🆘 Suporte

- **Documentação**: [Docs](https://docs.pytake.net)
- **Issues**: [GitHub Issues](https://github.com/your-org/pytake-backend/issues)
- **Email**: support@pytake.net