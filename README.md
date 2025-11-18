# PyTake - WhatsApp Business Automation Platform

> ⚠️ **Atenção**: Este repositório está em processo de migração para arquitetura multi-repositório.  
> Consulte [.github/MIGRATION_GUIDE.md](.github/MIGRATION_GUIDE.md) para detalhes.

> 🔐 **Secrets & Environments**: Consulte `.github/docs/SECRETS_AND_ENVIRONMENTS/README.md` para gerenciar credenciais com segurança.

## 🚀 Visão Geral

PyTake é uma plataforma completa para automação de WhatsApp Business API, permitindo criar flows visuais, gerenciar conversas e automatizar atendimento ao cliente.

### ✨ Funcionalidades Principais

- **Editor Visual de Flows**: Interface drag-and-drop para criar automações
- **WhatsApp Business API**: Integração completa com envio de mensagens
- **Gestão de Conversas**: Dashboard para acompanhar todas as conversas
- **Templates**: Criação e gestão de templates aprovados
- **Analytics**: Relatórios e métricas de desempenho
- **Multi-tenant**: Suporte para múltiplos clientes

## 🛠 Stack Tecnológica

- **Backend**: Python (FastAPI + SQLAlchemy + Alembic)
- **Frontend**: Next.js 15 com React 19 + TypeScript
- **Database**: PostgreSQL 15 com JSONB
- **Cache**: Redis 7
- **Proxy**: Nginx com SSL
- **Containerização**: Podman/Docker Compose

## 📚 Documentação

### 🚀 Deployment & Infrastructure
- 📖 [Guia de Deployment](./docs/DEPLOYMENT_GUIDE.md) - Setup e operação de ambientes (prod/staging/dev)
- ⚙️ [Configuração Nginx](./docs/NGINX_CONFIGURATION_GUIDE.md) - Rotear domínios e SSL/TLS
- 📋 [Índice de Docs](./docs/README.md) - Documentação completa do projeto

### 🔐 Segurança & Configuração
- 🔐 [Secrets & Environments](.github/docs/SECRETS_AND_ENVIRONMENTS/README.md) - Gerenciar credenciais com segurança

### Essenciais
- 📖 [Guia de Migração Multi-repo](.github/MIGRATION_GUIDE.md) - Transição para arquitetura separada
- 📐 [Decisões de Arquitetura](.github/ARCHITECTURE_DECISIONS.md) - ADRs e justificativas técnicas
- 📋 [Contrato de API v1](.github/API_CONTRACT.md) - Documentação completa dos endpoints

### GitFlow & CI/CD
- 🔀 [Git Workflow](.github/GIT_WORKFLOW.md) - Processo de branches e PRs
- 🤖 [Instruções para Agentes](.github/AGENT_INSTRUCTIONS.md) - Guia para IA/automações
- 🚀 [Quick Start](.github/QUICK_START.md) - Comece em 5 minutos

## 🏃‍♂️ Início Rápido

### ⚙️ Setup Atual (Monorepo)

**Pré-requisitos:**
- Podman ou Docker + Docker Compose
- Python 3.11+
- Node.js 20+

**Instalação:**

```bash
# 1. Clone o repositório
git clone https://github.com/xkayo32/pytake
cd pytake

# 2. Configure variáveis de ambiente
cp .env.example .env
# Edite .env conforme necessário

# 3. Inicie os serviços
podman-compose up -d
# ou: docker-compose up -d

# 4. Aplique migrations
podman exec pytake-backend alembic upgrade head

# 5. Verifique status
podman-compose ps
```

**Acesso:**
- Frontend: http://localhost:3001
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/api/v1/docs

---

### 🔄 Setup Futuro (Multi-repo)

**Após migração, use o script automatizado:**

```bash
# Download do script de setup
curl -O https://raw.githubusercontent.com/xkayo32/pytake/develop/setup-multi-repo.sh
chmod +x setup-multi-repo.sh

# Executar setup automático
./setup-multi-repo.sh

# Ou manualmente:
bash setup-multi-repo.sh
```

Consulte [.github/MIGRATION_GUIDE.md](.github/MIGRATION_GUIDE.md) para detalhes completos.

## 📊 Arquitetura

### Atual (Monorepo)
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Next.js App   │────│  FastAPI Backend│────│  PostgreSQL DB  │
│  (Frontend)     │    │     (Python)    │    │   + Redis       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                        │                        │
         └──────────── Nginx Proxy ──────────────────────────┘
```

### Futura (Multi-repo)
```
pytake-backend/          pytake-frontend/
       │                        │
       ├── CI/CD ──────┬────── CI/CD
       │               │        │
       ▼               ▼        ▼
   [Staging]      [Integration Test]
       │               │        │
       ▼               ▼        ▼
   [Production] ◄──── Deploy ────►
```

Consulte [.github/ARCHITECTURE_DECISIONS.md](.github/ARCHITECTURE_DECISIONS.md) para detalhes.
         └──────────── Nginx Proxy ──────────────────────────┘
```

## � GitFlow & CI/CD

Este projeto segue **GitFlow Workflow** com CI/CD automático.

**⚠️ IMPORTANTE:**
- ❌ NUNCA fazer `git push origin main` ou `develop`
- ✅ SEMPRE criar branches: `feature/TICKET-XXX`, `hotfix/TICKET-XXX`
- ✅ SEMPRE fazer PRs (Pull Requests)
- ✅ CI/CD automático: lint, tests, build

**Documentação:**
- 📖 [.github/QUICK_START.md](.github/QUICK_START.md) - Comece aqui (5 min)
- 🤖 [.github/AGENT_INSTRUCTIONS.md](.github/AGENT_INSTRUCTIONS.md) - Para agentes IA
- 📚 [.github/GIT_WORKFLOW.md](.github/GIT_WORKFLOW.md) - Workflow completo
- 📋 [.github/INDEX.md](.github/INDEX.md) - Índice de todos os documentos

**Setup inicial:**
```bash
bash setup-git-config.sh
cat .copilot-instructions
```

## 🔧 Desenvolvimento

### Estrutura do Projeto

```
pytake/
├── backend/             # API FastAPI (Python)
├── frontend/            # Next.js App (TypeScript)
├── migrations/          # Scripts SQL
├── docker-compose.yml   # Orquestração Podman/Docker
├── nginx.conf          # Configuração Nginx
├── .github/            # Documentação e workflows CI/CD
├── .copilot-instructions # Instruções do Copilot (em todas as branches)
├── setup-git-config.sh # Setup de Git
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

## 📡 API Endpoints

### Flows
- `GET /api/v1/flows` - Listar flows
- `POST /api/v1/flows` - Criar flow
- `GET /api/v1/flows/{id}` - Obter flow
- `POST /api/v1/flows/{id}/test` - Testar flow

### WhatsApp
- `GET /api/v1/whatsapp/numbers` - Listar números
- `GET /api/v1/whatsapp/templates` - Listar templates

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