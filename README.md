# PyTake - WhatsApp Business Automation Platform

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

- **Backend**: Go com Gin framework
- **Frontend**: Next.js 15.4.6 com React Flow
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