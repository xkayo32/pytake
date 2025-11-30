# 🚀 PyTake - WhatsApp Business Automation Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104.1-green.svg)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue.svg)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-red.svg)](https://redis.io/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7-green.svg)](https://www.mongodb.com/)

> ⚠️ **Atenção**: Este repositório está em processo de migração para arquitetura multi-repositório.
> Consulte [.github/MIGRATION_GUIDE.md](.github/MIGRATION_GUIDE.md) para detalhes.

> 🔐 **Secrets & Environments**: Consulte `.github/docs/SECRETS_AND_ENVIRONMENTS/README.md` para gerenciar credenciais com segurança.

---

## 📋 O que é o PyTake?

**PyTake** é uma plataforma completa e robusta para **automação de WhatsApp Business API**, desenvolvida para empresas que precisam de soluções avançadas de atendimento ao cliente e marketing via WhatsApp.

### 🎯 **Para quem é indicado:**

- **Empresas B2B/B2C** que precisam automatizar atendimento ao cliente
- **Agências de marketing** que fazem campanhas via WhatsApp
- **Equipes de suporte** que querem reduzir tempo de resposta
- **Desenvolvedores** que precisam integrar WhatsApp em seus sistemas

### 💡 **Casos de Uso:**

- 🤖 **Chatbots inteligentes** com flows visuais
- 📢 **Campanhas de marketing** segmentadas
- 🎧 **Atendimento ao cliente** 24/7
- 📊 **Analytics e relatórios** de conversas
- 🔄 **Integrações** com CRMs e ERPs
- 📱 **Multi-canal** (WhatsApp + outros canais)

---

## ✨ Funcionalidades Principais

### 🤖 **Editor Visual de Flows (Flow Builder)**
- Interface **drag-and-drop** intuitiva
- **Automação complexa** sem código
- **Condicionais avançadas** (if/else, switch)
- **Integrações** com APIs externas
- **Templates pré-configurados**

### 📱 **WhatsApp Business API Completa**
- **Envio de mensagens** (texto, mídia, templates)
- **Recebimento em tempo real** via webhooks
- **Templates aprovados** pelo WhatsApp
- **QR Code** para conexão Evolution API
- **Rate limiting** automático
- **Status de mensagens** (enviado, entregue, lido)

### 👥 **Gestão de Conversas**
- **Dashboard em tempo real** de todas as conversas
- **Atribuição automática** por departamento/fila
- **Transferência** entre agentes
- **Histórico completo** de mensagens
- **SLA (Service Level Agreement)** configurável
- **Tags e categorização**

### 👤 **Gestão de Contatos**
- **Base de dados** organizada por organização
- **Segmentação avançada** (tags, filtros)
- **VIP e bloqueio** de contatos
- **Histórico de interações**
- **Importação/exportação** em massa

### 📊 **Analytics e Relatórios**
- **Métricas em tempo real** (conversas, mensagens, tempo de resposta)
- **Relatórios por período** (diário, semanal, mensal)
- **Performance por agente** e departamento
- **Taxa de conversão** de campanhas
- **Dashboard executivo** com KPIs

### 🏢 **Multi-tenancy Completo**
- **Isolamento total** entre organizações
- **RBAC (Role-Based Access Control)** granular
- **Configurações por organização**
- **Limites e quotas** customizáveis
- **White-label** opcional

### 🔧 **APIs e Integrações**
- **REST API completa** documentada
- **Webhooks** para eventos externos
- **WebSocket** para tempo real
- **SDKs** para diferentes linguagens
- **Zapier/IFTTT** integration ready

---

## 🛠 Stack Tecnológica

### **Backend**
- **Framework:** [FastAPI](https://fastapi.tiangolo.com/) - Alto desempenho, auto-documentação
- **Linguagem:** Python 3.11+ com type hints
- **ORM:** SQLAlchemy 2.0 com async/await
- **Migrations:** Alembic para controle de versão do banco
- **Validação:** Pydantic v2 para schemas robustos

### **Banco de Dados**
- **Primário:** PostgreSQL 15 com JSONB para dados flexíveis
- **Cache:** Redis 7 para sessões e cache de alta performance
- **Logs:** MongoDB 7 para armazenamento de logs e analytics
- **Busca:** Índices full-text e GIN para consultas rápidas

### **Infraestrutura**
- **Containerização:** Docker/Podman com multi-stage builds
- **Orquestração:** Docker Compose para desenvolvimento
- **Proxy Reverso:** Nginx com SSL/TLS automático
- **Certificados:** Let's Encrypt com renovação automática
- **Monitoramento:** Health checks e métricas integradas

### **Segurança**
- **Autenticação:** JWT com refresh tokens
- **Criptografia:** Fernet para dados sensíveis
- **Rate Limiting:** Por IP e usuário
- **CORS:** Configurado para domínios específicos
- **HTTPS:** Forçado em produção

---

## 📁 Estrutura do Projeto

```
pytake/
├── backend/                    # 🐍 API FastAPI (Python)
│   ├── app/
│   │   ├── api/v1/            # Endpoints da API
│   │   │   ├── endpoints/     # Módulos de endpoints (20 módulos)
│   │   │   └── router.py      # Router principal
│   │   ├── core/              # Configurações core
│   │   ├── models/            # Modelos SQLAlchemy
│   │   ├── schemas/           # Schemas Pydantic
│   │   ├── services/          # Lógica de negócio
│   │   └── utils/             # Utilitários
│   ├── alembic/               # Migrations do banco
│   └── requirements.txt       # Dependências Python
├── docs/                      # 📚 Documentação da API
├── scripts/                   # 🔧 Scripts de automação
├── docker-compose.yml         # 🐳 Orquestração de containers
├── nginx-dev.conf            # 🌐 Configuração Nginx
├── .github/                   # 🤖 CI/CD e documentação
└── certbot/                   # 🔒 Certificados SSL
```

---

## 🚀 Início Rápido

### ⚡ **Pré-requisitos**
- Docker/Podman + Docker Compose
- Python 3.11+ (opcional, para desenvolvimento local)
- 4GB RAM mínimo, 8GB recomendado
- Conexão com internet para WhatsApp API

### 📦 **Instalação em 5 Minutos**

```bash
# 1. Clone o repositório
git clone https://github.com/xkayo32/pytake.git
cd pytake

# 2. Configure variáveis de ambiente
cp .env.example .env
# Edite .env com suas configurações

# 3. Inicie todos os serviços
docker compose up -d

# 4. Aplique as migrations do banco
docker compose exec backend alembic upgrade head

# 5. Verifique se está funcionando
curl https://localhost/api/v1/health
```

### 🌐 **Acesso aos Serviços**

- **API Base:** `https://localhost/api/v1`
- **Documentação Swagger:** `https://localhost/api/v1/docs`
- **Documentação ReDoc:** `https://localhost/api/v1/redoc`
- **Admin Panel:** Em desenvolvimento
- **Logs:** `docker compose logs -f`

---

## 📚 Documentação Completa

### 📖 **Documentação Técnica**
- **[API Documentation](docs/API_DOCUMENTATION.md)** - Todos os 145+ endpoints documentados
- **[Architecture Decisions](.github/ARCHITECTURE_DECISIONS.md)** - Decisões técnicas e ADRs
- **[Migration Guide](.github/MIGRATION_GUIDE.md)** - Guia de migração multi-repo

### 🚀 **Guias de Setup**
- **[Quick Start](.github/docs/GUIDES/QUICK_START_MULTI_ENV.md)** - Setup completo
- **[Production Deployment](.github/docs/GUIDES/PRODUCTION_DEPLOYMENT_GUIDE.md)** - Deploy em produção
- **[Nginx Configuration](.github/docs/GUIDES/NGINX_ROUTING_COMPLETE.md)** - Configuração avançada

### 🔐 **Segurança**
- **[Secrets Management](.github/docs/SECRETS_AND_ENVIRONMENTS/README.md)** - Gerenciamento de credenciais ⭐ **OBRIGATÓRIO**
- **[Security Analysis](.github/docs/SECRETS_AND_ENVIRONMENTS/SECURITY_ANALYSIS.md)** - Análise de segurança

### 📋 **Checklists**
- **[Setup Checklist](.github/docs/CHECKLISTS/SETUP_CHECKLIST.md)** - Checklist de instalação
- **[Action Checklist](.github/docs/CHECKLISTS/PHASE_16_ACTION_CHECKLIST.md)** - Checklist de ações

---

## 🔧 Desenvolvimento

### 🐍 **Backend Local (Opcional)**

```bash
# Instalar dependências
cd backend
python -m venv venv
source venv/bin/activate  # Linux/Mac
# ou: venv\Scripts\activate  # Windows
pip install -r requirements.txt

# Executar migrations
alembic upgrade head

# Iniciar servidor de desenvolvimento
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 🧪 **Testes**

```bash
# Executar todos os testes
docker compose exec backend pytest

# Executar testes específicos
docker compose exec backend pytest tests/test_auth.py

# Com coverage
docker compose exec backend pytest --cov=app --cov-report=html
```

### 📊 **Monitoramento**

```bash
# Logs em tempo real
docker compose logs -f backend

# Status dos containers
docker compose ps

# Uso de recursos
docker stats

# Health checks
curl https://localhost/api/v1/health
```

---

## 🔄 Arquitetura

### **Atual (Backend-Only)**
```
┌─────────────────┐    ┌─────────────────┐
│   FastAPI       │────│  PostgreSQL     │
│   Backend       │    │   + Redis       │
│   (Python)      │    │   + MongoDB     │
└─────────────────┘    └─────────────────┘
         │                        │
         └──────────── Nginx ──────────────┘
                          │
                          ▼
                   WhatsApp Business API
```

### **Futura (Multi-repo)**
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

---

## 🔒 WhatsApp Business API Setup

### 1. **Conta Meta Business**
- Acesse [Meta Business](https://business.facebook.com/)
- Crie ou conecte sua conta Business

### 2. **WhatsApp Business API**
- Acesse [WhatsApp Business API](https://developers.facebook.com/products/whatsapp/)
- Crie um app e habilite WhatsApp
- Obtenha o **Access Token** permanente

### 3. **Configuração no PyTake**
```bash
# No arquivo .env
WHATSAPP_API_TOKEN=your_permanent_token_here
META_WEBHOOK_VERIFY_TOKEN=your_webhook_verify_token
WHATSAPP_WEBHOOK_URL=https://api.yourdomain.com/api/v1/whatsapp/webhook
```

### 4. **Templates e Mensagens**
- Crie templates aprovados no Meta
- Configure webhooks para receber mensagens
- Teste a conectividade

---

## 🚢 Produção & Deploy

### **Pré-requisitos de Produção**
- Servidor VPS/Cloud (AWS, DigitalOcean, etc.)
- Domínio próprio
- SSL certificate (Let's Encrypt automático)
- Backup automático configurado

### **Deploy Automático**

```bash
# Usando os scripts incluídos
bash scripts/deployment/deploy.sh

# Ou manualmente
docker compose -f docker-compose.prod.yml up -d
```

### **Monitoramento em Produção**
- **Uptime monitoring** com health checks
- **Log aggregation** com ELK stack
- **Metrics** com Prometheus/Grafana
- **Backup automático** diário
- **SSL renewal** automático

---

## 🤝 Contribuição

### **Como Contribuir**

1. **Fork** o projeto
2. **Clone** seu fork: `git clone https://github.com/your-username/pytake.git`
3. **Crie uma branch**: `git checkout -b feature/AmazingFeature`
4. **Commit suas mudanças**: `git commit -m 'Add some AmazingFeature'`
5. **Push para a branch**: `git push origin feature/AmazingFeature`
6. **Abra um Pull Request**

### **Padrões de Código**
- **Python**: PEP 8, type hints obrigatórios
- **Commits**: Conventional Commits
- **Branches**: GitFlow (feature/, hotfix/, release/)
- **Testes**: pytest com coverage mínimo 80%
- **Documentação**: Docstrings em todas as funções

### **Issues e Bugs**
- Use os templates de issue disponíveis
- Descreva o problema com detalhes
- Inclua logs e screenshots quando possível
- Sugira soluções quando tiver ideias

---

## 📄 Licença

Este projeto está licenciado sob a **MIT License** - veja o arquivo [LICENSE](LICENSE) para detalhes.

---

## 🆘 Suporte & Comunidade

### **Canais de Suporte**
- 📧 **Email**: support@pytake.net
- 💬 **Discord**: [PyTake Community](https://discord.gg/pytake)
- 📖 **Documentação**: [docs.pytake.net](https://docs.pytake.net)
- 🐛 **Issues**: [GitHub Issues](https://github.com/xkayo32/pytake/issues)

### **Recursos Adicionais**
- 🎓 **Tutoriais**: [YouTube Channel](https://youtube.com/@pytake)
- 📚 **Blog**: [blog.pytake.net](https://blog.pytake.net)
- 📰 **Newsletter**: Assine para updates

---

## 🙏 Agradecimentos

- **Meta/WhatsApp** pela Business API
- **FastAPI** pela melhor framework Python
- **Comunidade Open Source** por todas as ferramentas
- **Contribuidores** que ajudam a melhorar o projeto

---

## 📈 Roadmap

### **Próximas Features (2025)**
- [ ] **Frontend React/Next.js** completo
- [ ] **Integração com CRMs** (HubSpot, Pipedrive)
- [ ] **IA Conversacional** avançada
- [ ] **Multi-idioma** completo
- [ ] **Mobile App** React Native
- [ ] **Video calls** via WhatsApp
- [ ] **E-commerce** integration

### **Visão 2025**
- **10.000+ usuários ativos**
- **Integração com 50+ plataformas**
- **Suporte 24/7 enterprise**
- **SLA garantido 99.9% uptime**

---

**PyTake** - Transformando atendimento ao cliente com WhatsApp Business API 🚀

*Desenvolvido com ❤️ por [Kayo Carvalho Fernandes](https://github.com/xkayo32)*