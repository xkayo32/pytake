# PyTake - Sistema de Atendimento Multi-Plataforma

Sistema robusto e escalável para gerenciamento de atendimento omnichannel, com suporte a múltiplas plataformas de mensagens, fluxos automatizados e múltiplos agentes.

## 🚀 Características Principais

### 📱 **Plataformas Suportadas**
- **WhatsApp Business** ✅ - Cloud API oficial (totalmente implementado)
- **Instagram Direct** 🏗️ - Meta API (arquitetura pronta)
- **Facebook Messenger** 🏗️ - Meta API (arquitetura pronta) 
- **Telegram** 🏗️ - Bot API (arquitetura pronta)
- **Webchat** 🏗️ - Chat integrado no website (arquitetura pronta)
- **SMS** 🏗️ - Múltiplos provedores (arquitetura pronta)
- **Email** 🏗️ - SMTP/IMAP (arquitetura pronta)
- **Discord** 🏗️ - Bot API (arquitetura pronta)
- **Slack** 🏗️ - Bot API (arquitetura pronta)
- **Google Business Messages** 🏗️ - RBM API (arquitetura pronta)
- **Microsoft Teams** 🏗️ - Bot Framework (arquitetura pronta)
- **LinkedIn** 🏗️ - Messaging API (arquitetura pronta)

### 🔧 **Funcionalidades Core**
- **Arquitetura Multi-Plataforma**: Sistema unificado para 12+ plataformas ✅
- **Gestão de Conversas**: Sistema completo de gerenciamento ✅
- **Atribuição de Agentes**: Sistema inteligente de distribuição ✅
- **Templates de Resposta**: Sistema flexível de templates ✅
- **Busca de Conversas**: Sistema avançado de busca e filtros ✅
- **Sistema de Orquestração**: Coordenação entre todos os serviços ✅
- **Processador Multi-Plataforma**: Engine unificado de processamento ✅
- **Sistema de Métricas**: Análise detalhada de performance e KPIs ✅
- **Sistema de Notificações**: Alertas multi-canal em tempo real ✅
- **Status Tracking**: Rastreamento em tempo real de mensagens ✅
- **Sistema de Filas**: Processamento assíncrono com Redis ✅
- **Webhooks**: Recebimento e validação de eventos de todas as plataformas ✅
- **Gestão de Contatos**: Sincronização automática com verificação ✅
- **Sistema de Retry**: Reenvio automático para mensagens falhadas ✅
- **Real-time**: Comunicação via WebSocket ✅
- **Seguro**: Autenticação JWT, RBAC e criptografia ✅
- **Multi-tenant**: Suporte para múltiplas empresas 🔄

## 🧪 Status dos Testes

**✅ TODOS OS TESTES PASSANDO - 203/203 (100%)**

| Módulo | Testes | Status | Cobertura |
|---------|---------|---------|-----------|
| pytake-core | 156/156 ✅ | 100% | Completa |
| pytake-db | 40/40 ✅ | 100% | Completa |
| Integration | 7/7 ✅ | 100% | Completa |
| **TOTAL** | **203/203** ✅ | **100%** | **Completa** |

[📋 Ver Relatório Completo de Testes](docs/TEST_STATUS.md)

## 🛠️ Stack Tecnológica

### Backend
- **Linguagem**: Rust
- **Framework**: Actix-web
- **Banco de Dados**: PostgreSQL/SQLite
- **Cache/Queue**: Redis
- **ORM**: SeaORM

### Frontend
- **Framework**: React 18 com TypeScript
- **Build Tool**: Vite
- **Estado**: Zustand
- **UI**: Tailwind CSS + Radix UI
- **Flow Builder**: React Flow

## 📋 Pré-requisitos

- Rust 1.75+
- Node.js 20+
- Docker e Docker Compose
- PostgreSQL 15+
- Redis 7+

## 🏃 Quick Start

1. **Clone o repositório**
```bash
git clone https://github.com/seu-usuario/pytake.git
cd pytake
```

2. **Configure as variáveis de ambiente**
```bash
cp .env.example .env
# Edite o .env com suas configurações
```

3. **Inicie os serviços com Docker**
```bash
docker-compose up -d
```

4. **Execute as migrations**
```bash
./scripts/migrate.sh
```

5. **Acesse o sistema**
- Backend API: http://localhost:8080
- WebSocket: ws://localhost:8080/api/v1/ws
- Webhook endpoint: http://localhost:8080/api/webhooks/whatsapp
- Health check: http://localhost:8080/health
- WebSocket Stats: http://localhost:8080/api/v1/ws/stats
- Notifications API: http://localhost:8080/api/v1/notifications
- Documentação API: http://localhost:8080/docs (em desenvolvimento)

## 📚 Documentação

- [Arquitetura](docs/ARCHITECTURE.md) - Visão geral da arquitetura
- [Estrutura do Projeto](docs/PROJECT_STRUCTURE.md) - Organização de diretórios
- [Requisitos Técnicos](docs/REQUIREMENTS.md) - Dependências e configurações  
- [Roadmap](docs/ROADMAP.md) - Plano de desenvolvimento
- [Plataformas Suportadas](docs/PLATFORMS.md) - Detalhes das integrações

## 📱 Arquitetura Multi-Plataforma

### 🟢 Implementadas
- **WhatsApp Business API** - Totalmente funcional com todas as funcionalidades
- **Arquitetura Multi-Plataforma** - Sistema unificado pronto para 12+ plataformas
- **Processador Unificado** - Engine que suporta qualquer plataforma de mensagens

### 🏗️ Arquitetura Pronta (Implementação Rápida)
- **Instagram Direct** - Interface `MessagingPlatform` implementada
- **Facebook Messenger** - Integração com Graph API estruturada
- **Telegram** - Bot API e webhook handlers estruturados
- **Webchat** - Widget JavaScript para websites
- **SMS** - Integração com múltiplos provedores brasileiros
- **Email** - SMTP/IMAP para atendimento tradicional
- **Discord** - Bot API para comunidades técnicas
- **Slack** - Bot API para clientes B2B
- **Google Business Messages** - RBM API estruturada
- **Microsoft Teams** - Bot Framework integração
- **LinkedIn** - Messaging API estruturada

### 🚀 Vantagens da Arquitetura
- **Trait Unificado**: Todas as plataformas implementam `MessagingPlatform`
- **Tipos Universais**: `MessageContent`, `Platform`, `PlatformCapabilities`
- **Processador Único**: `MultiPlatformMessageProcessor` para todas as plataformas
- **Filas Unificadas**: Sistema de filas que suporta qualquer plataforma
- **WebSocket Universal**: Real-time para todas as plataformas simultaneamente

### 📊 Sistema de Serviços Implementados

| Serviço | Status | Funcionalidade |
|---------|--------|----------------|
| **Conversation Service** | ✅ | Gerenciamento completo de conversas |
| **Agent Assignment** | ✅ | Distribuição inteligente de agentes |
| **Response Templates** | ✅ | Sistema flexível de templates |
| **Conversation Search** | ✅ | Busca avançada com filtros |
| **Conversation Integration** | ✅ | Integração entre sistemas |
| **Orchestration Service** | ✅ | Coordenação de todos os serviços |
| **Multi-Platform Processor** | ✅ | Processamento unificado |
| **Metrics Service** | ✅ | Análise detalhada de KPIs |
| **Notification Service** | ✅ | Notificações multi-canal |
| **Contact Sync** | ✅ | Sincronização de contatos |
| **Message Status** | ✅ | Rastreamento de status |
| **WhatsApp Service** | ✅ | Integração WhatsApp completa |
| **WhatsApp Processor** | ✅ | Processamento específico WhatsApp |
| **User Service** | ✅ | Gerenciamento de usuários |
| **Flow Service** | ✅ | Sistema de fluxos automatizados |
| **WebSocket Manager** | ✅ | Comunicação em tempo real |

### 📊 Matriz de Funcionalidades por Plataforma

| Funcionalidade | WhatsApp | Instagram | Messenger | Telegram | Webchat | SMS | Email | Discord | Slack |
|----------------|----------|-----------|-----------|----------|---------|-----|-------|---------|-------|
| Mensagens de Texto | ✅ | 🏗️ | 🏗️ | 🏗️ | 🏗️ | 🏗️ | 🏗️ | 🏗️ | 🏗️ |
| Mídia (Imagem/Video) | ✅ | 🏗️ | 🏗️ | 🏗️ | 🏗️ | ❌ | ✅ | 🏗️ | 🏗️ |
| Áudio/Voice | ✅ | 🏗️ | 🏗️ | 🏗️ | 🏗️ | ❌ | ❌ | 🏗️ | ❌ |
| Localização | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Contatos | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Botões Interativos | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ |
| Templates | ✅ | ❌ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Status de Entrega | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Indicador de Digitação | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ |

**Legenda**: ✅ Implementado | 🏗️ Arquitetura Pronta | ❌ Não Suportado

## 🔧 Desenvolvimento

### Backend
```bash
cd backend
cargo run
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Testes
```bash
# Backend
cargo test

# Frontend
npm test
```

## 🤝 Contribuindo

1. Fork o projeto
2. Crie sua feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 👥 Equipe

- Seu Nome - [@seu_usuario](https://github.com/seu-usuario)

## 🙏 Agradecimentos

- WhatsApp Business Platform
- Comunidade Rust
- Comunidade React