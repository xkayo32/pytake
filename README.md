# PyTake - WhatsApp Business Automation Platform

Sistema completo de automação para WhatsApp Business com suporte a fluxos visuais, IA e integrações ERP.

## 🚀 Início Rápido

### Pré-requisitos
- Docker e Docker Compose instalados
- Domínios configurados (app.pytake.net e api.pytake.net)
- Portas 80 e 443 liberadas

### Instalação

1. **Clone o repositório**
```bash
git clone https://github.com/pytake/pytake-backend.git
cd pytake-backend
```

2. **Configure as variáveis de ambiente**
```bash
cp .env.example .env
# Edite .env com suas configurações
```

3. **Inicie os serviços**
```bash
./deploy.sh
```

4. **Gere certificados SSL (produção)**
```bash
./generate-ssl.sh
```

## 📁 Estrutura do Projeto

```
pytake-backend/
├── pytake-frontend/     # Frontend Next.js 15
├── mock-api/           # API mock para desenvolvimento
├── certbot/            # Certificados SSL Let's Encrypt
├── docker-compose.yml  # Orquestração de containers
├── nginx.conf         # Proxy reverso e SSL
├── init-db.sql        # Schema PostgreSQL
├── deploy.sh          # Script de deploy automatizado
└── .env.example       # Template de configuração
```

## 🛠️ Comandos Úteis

```bash
# Status dos serviços
docker-compose ps

# Logs em tempo real
docker-compose logs -f

# Reiniciar serviços
docker-compose restart

# Parar todos os serviços
docker-compose down

# Rebuild do frontend
docker-compose up -d --build frontend

# Backup do banco
docker exec pytake-postgres pg_dump -U pytake_admin pytake_production > backup.sql
```

## 🌐 URLs de Acesso

- **Frontend**: https://app.pytake.net
- **API**: https://api.pytake.net
- **Documentação API**: https://api.pytake.net/docs
- **Health Check**: https://api.pytake.net/health

## 🔧 Stack Tecnológica

- **Frontend**: Next.js 15, React 18, Tailwind CSS
- **Backend**: Node.js (Mock API - Rust em desenvolvimento)
- **Banco de Dados**: PostgreSQL 15
- **Cache**: Redis 7
- **Proxy**: Nginx
- **SSL**: Let's Encrypt (Certbot)
- **Container**: Docker & Docker Compose

## 📊 Recursos Principais

- ✅ Multi-tenant com isolamento por UUID
- ✅ Autenticação JWT RS256
- ✅ WhatsApp Business API (Oficial + Evolution)
- ✅ Editor visual de fluxos drag-and-drop
- ✅ IA integrada (ChatGPT/Claude)
- ✅ Integrações ERP (HubSoft, IxcSoft, MkSolutions)
- ✅ Dashboard com analytics em tempo real
- ✅ WebSocket para atualizações real-time
- ✅ LGPD/GDPR compliance

## 🔒 Segurança

- SSL/TLS obrigatório em produção
- Senhas hasheadas com Argon2id
- Rate limiting configurável
- Validação de webhooks WhatsApp
- Auditoria completa de ações

## 📚 Documentação

- [Guia de Desenvolvimento](CLAUDE.md) - Instruções para IA
- [API Reference](https://api.pytake.net/docs) - Swagger/OpenAPI

## 🤝 Contribuindo

1. Fork o projeto
2. Crie sua feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📝 Licença

Proprietário - PyTake © 2024. Todos os direitos reservados.

## 📞 Suporte

- Email: suporte@pytake.net
- WhatsApp: +55 (11) 99999-9999
- Site: https://pytake.net