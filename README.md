# PyTake - WhatsApp Business Automation Platform

Sistema completo de automação de atendimento via WhatsApp Business com chatbots, multi-atendimento e CRM integrado.

## 🚀 Features Implementadas

✅ Autenticação JWT com refresh tokens  
✅ Multi-tenancy (isolamento por organização)  
✅ RBAC com 4 níveis de acesso  
✅ Gestão de contatos com tags  
✅ Sistema de conversações e mensagens  
✅ Gestão de números WhatsApp  
✅ Gestão de usuários e equipes  
✅ Gestão de organizações  
✅ 50+ endpoints REST  

## 📚 Documentação

- [API Documentation](backend/API.md) - Documentação completa dos endpoints
- [CLAUDE.md](CLAUDE.md) - Guia para desenvolvimento

## 🛠️ Quick Start

### Opção 1: Docker Compose (Recomendado)

```bash
# 1. Clone o repositório
git clone <repo-url>
cd pytake

# 2. Copie o arquivo de ambiente
cp .env.example .env

# 3. Inicie todos os serviços
docker compose up -d

# 4. Aguarde os serviços subirem
docker compose logs -f backend frontend
```

**Acesse:**
- Frontend: http://localhost:3001
- Backend API: http://localhost:8000/api/v1/docs
- Health Check: http://localhost:8000/health

### Opção 2: Desenvolvimento Local

```bash
# 1. Inicie apenas os bancos de dados
docker compose up -d postgres redis mongodb

# 2. Backend
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload

# 3. Frontend (em outro terminal)
cd frontend
npm install
npm run dev
```

## 🔐 Credenciais de Teste

**Usuário Admin:**
```
Email: admin@pytake.com
Senha: Admin123
```

> ⚠️ **Importante:** Altere estas credenciais em produção!

## 📊 Status: Backend 90% Completo

**6 Módulos Implementados:**
- Authentication (6 endpoints)
- Organizations (9 endpoints)  
- Users (10 endpoints)
- Contacts + Tags (15+ endpoints)
- Conversations + Messages (7 endpoints)
- WhatsApp Numbers (5 endpoints)

## 🏗️ Tecnologias

**Backend:**
- FastAPI + SQLAlchemy 2.0
- PostgreSQL + Redis + MongoDB
- JWT + Bcrypt
- Alembic Migrations

**Frontend (Planejado):**
- Next.js 14 + TypeScript
- Tailwind CSS + Shadcn/ui

## 📝 License

MIT
