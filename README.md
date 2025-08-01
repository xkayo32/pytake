# PyTake - Sistema de Atendimento Multi-Plataforma

Sistema robusto e escalável para gerenciamento de atendimento omnichannel, com suporte a múltiplas plataformas de mensagens, fluxos automatizados e múltiplos agentes.

## 🚀 Características Principais

### 📱 **Plataformas Suportadas**
- **WhatsApp Business** ✅ - Cloud API oficial (implementado)
- **Instagram Direct** 📋 - Meta API (planejado)
- **Facebook Messenger** 📋 - Meta API (planejado) 
- **Telegram** 📋 - Bot API (planejado)
- **Webchat** 📋 - Chat integrado no website (planejado)
- **SMS** 📋 - Múltiplos provedores (planejado)
- **Email** 📋 - SMTP/IMAP (planejado)

### 🔧 **Funcionalidades Core**
- **Arquitetura Multi-Plataforma**: Sistema unificado para todas as plataformas ✅
- **Status Tracking**: Rastreamento em tempo real de mensagens ✅
- **Sistema de Filas**: Processamento assíncrono com Redis ✅
- **Webhooks**: Recebimento e validação de eventos de todas as plataformas ✅
- **Gestão de Contatos**: Sincronização automática com verificação ✅
- **Sistema de Retry**: Reenvio automático para mensagens falhadas ✅
- **Sistema de Notificações**: Alertas multi-canal em tempo real ✅
- **Dashboard de Métricas**: Análise de performance e KPIs ✅
- **Real-time**: Comunicação via WebSocket ✅
- **Multi-tenant**: Suporte para múltiplas empresas 🔄
- **Seguro**: Autenticação JWT, RBAC e criptografia ✅

## 🛠️ Stack Tecnológica

### Backend
- **Linguagem**: Rust
- **Framework**: Actix-web
- **Banco de Dados**: PostgreSQL
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

## 📱 Plataformas de Comunicação

### 🟢 Implementadas
- **WhatsApp Business API** - Totalmente funcional com todas as funcionalidades

### 🟡 Em Desenvolvimento
- **Instagram Direct** - API Meta em análise
- **Facebook Messenger** - Integração com Graph API  
- **Telegram** - Bot API e webhook handlers

### 🔵 Planejadas (Prioridade)
1. **Webchat** - Widget JavaScript para websites
2. **SMS** - Integração com provedores brasileiros
3. **Email** - SMTP/IMAP para atendimento tradicional
4. **Google Business Messages** - Aparecer no Google Search
5. **Slack** - Para clientes B2B
6. **Discord** - Comunidades técnicas

### 📊 Matriz de Funcionalidades por Plataforma

| Funcionalidade | WhatsApp | Instagram | Messenger | Telegram | Webchat | SMS | Email |
|----------------|----------|-----------|-----------|----------|---------|-----|-------|
| Mensagens de Texto | ✅ | 📋 | 📋 | 📋 | 📋 | 📋 | 📋 |
| Mídia (Imagem/Video) | ✅ | 📋 | 📋 | 📋 | 📋 | ❌ | ✅ |
| Áudio/Voice | ✅ | 📋 | 📋 | 📋 | 📋 | ❌ | ❌ |
| Localização | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Contatos | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Botões Interativos | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Templates | ✅ | ❌ | ✅ | ❌ | ✅ | ✅ | ✅ |
| Status de Entrega | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Indicador de Digitação | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |

**Legenda**: ✅ Implementado | 📋 Planejado | ❌ Não Suportado

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