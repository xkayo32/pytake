# PyTake - Sistema de Atendimento WhatsApp

Sistema robusto e escalável para gerenciamento de atendimento via WhatsApp, com suporte a fluxos automatizados e múltiplos agentes.

## 🚀 Características Principais

- **Multi-tenant**: Suporte para múltiplas empresas/organizações
- **Fluxos Visuais**: Editor drag-and-drop para criar fluxos de atendimento
- **Módulos Extensíveis**: Sistema de plugins para integrações customizadas
- **Real-time**: Comunicação em tempo real via WebSocket
- **Seguro**: Autenticação JWT, RBAC e criptografia de dados
- **Escalável**: Arquitetura preparada para milhares de conversas simultâneas

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
- Frontend: http://localhost:3000
- API: http://localhost:8080
- Documentação API: http://localhost:8080/docs

## 📚 Documentação

- [Arquitetura](docs/ARCHITECTURE.md) - Visão geral da arquitetura
- [Estrutura do Projeto](docs/PROJECT_STRUCTURE.md) - Organização de diretórios
- [Requisitos Técnicos](docs/REQUIREMENTS.md) - Dependências e configurações
- [Roadmap](docs/ROADMAP.md) - Plano de desenvolvimento

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