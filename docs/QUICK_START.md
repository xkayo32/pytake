# Quick Start - PyTake

## 🚀 Início Rápido para Desenvolvedores

Este guia ajudará você a configurar o ambiente de desenvolvimento do PyTake em menos de 15 minutos.

## 1. Pré-requisitos

Certifique-se de ter instalado:
- Git
- Docker Desktop
- Rust (via [rustup](https://rustup.rs/))
- Node.js 20+ e npm
- Visual Studio Code (recomendado)

## 2. Clone e Configure

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/pytake.git
cd pytake

# Configure variáveis de ambiente
cp .env.example .env
# Edite .env com suas configurações do WhatsApp Business API
```

## 3. Inicie com Docker (Recomendado)

```bash
# Inicie todos os serviços
docker-compose up -d

# Verifique se está rodando
docker-compose ps

# Veja os logs
docker-compose logs -f
```

O sistema estará disponível em:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8080
- PostgreSQL: localhost:5432
- Redis: localhost:6379

## 4. Desenvolvimento Local (Alternativo)

### Backend (Rust)

```bash
cd backend

# Instale dependências
cargo build

# Execute migrations
cargo run --bin migrate

# Inicie o servidor
cargo run

# Em outro terminal, execute testes
cargo test
```

### Frontend (React)

```bash
cd frontend

# Instale dependências
npm install

# Inicie o servidor de desenvolvimento
npm run dev

# Em outro terminal, execute testes
npm test
```

## 5. Configuração WhatsApp

1. Acesse [Meta for Developers](https://developers.facebook.com/)
2. Crie um app e configure WhatsApp Business
3. Obtenha:
   - Phone Number ID
   - Business Account ID
   - Permanent Access Token
   - App Secret

4. Configure o webhook:
   - URL: `https://seu-dominio.com/api/webhooks/whatsapp`
   - Verify Token: Use o mesmo do `.env`
   - Inscreva-se nos campos: `messages`, `message_status`

## 6. Primeiro Fluxo

1. Acesse http://localhost:3000
2. Faça login com credenciais padrão:
   - Email: admin@pytake.com
   - Senha: admin123

3. Vá para "Flow Builder"
4. Crie um novo fluxo:
   - Arraste um nó "Trigger" (WhatsApp Message)
   - Adicione um nó "Message" 
   - Configure a mensagem de resposta
   - Conecte os nós
   - Salve e ative o fluxo

## 7. Teste End-to-End

```bash
# Use o script de teste
./scripts/test-e2e.sh

# Ou manualmente, envie uma mensagem para o número configurado
# e verifique se recebe a resposta do fluxo
```

## 8. Estrutura de Branches

```bash
main          # Produção
├── develop   # Desenvolvimento
├── feature/* # Novas funcionalidades
├── bugfix/*  # Correções
└── hotfix/*  # Correções urgentes
```

## 9. Comandos Úteis

```bash
# Backend
cargo fmt           # Formatar código
cargo clippy        # Linter
cargo doc --open    # Documentação

# Frontend  
npm run lint        # Linter
npm run format      # Formatar
npm run build       # Build produção

# Docker
docker-compose down # Parar serviços
docker-compose logs # Ver logs
docker-compose exec backend bash # Acessar container

# Database
./scripts/migrate.sh        # Rodar migrations
./scripts/seed.sh          # Popular dados de teste
./scripts/backup-db.sh     # Backup do banco
```

## 10. Troubleshooting

### Problema: "Connection refused" no backend
```bash
# Verifique se PostgreSQL e Redis estão rodando
docker-compose ps
# Reinicie se necessário
docker-compose restart postgres redis
```

### Problema: "CORS error" no frontend
```bash
# Verifique CORS_ALLOWED_ORIGINS no .env
# Deve incluir http://localhost:3000
```

### Problema: Webhook WhatsApp não funciona
1. Verifique se está usando HTTPS (ngrok para testes locais)
2. Confirme o verify token
3. Veja logs do webhook: `docker-compose logs backend | grep webhook`

## 11. Próximos Passos

1. **Explore a documentação**:
   - [Arquitetura](ARCHITECTURE.md)
   - [Desenvolvimento de Módulos](MODULES.md)
   - [API Reference](API.md)

2. **Contribua**:
   - Veja issues abertas no GitHub
   - Proponha melhorias
   - Compartilhe módulos

3. **Deploy**:
   - Configure CI/CD
   - Deploy em Kubernetes
   - Configure monitoramento

## 💡 Dicas

- Use `cargo watch` para hot reload no backend
- Instale extensões VS Code: rust-analyzer, ESLint, Prettier
- Configure pre-commit hooks para qualidade de código
- Use Docker volumes para persistir dados em desenvolvimento

## 📞 Suporte

- Issues: GitHub Issues
- Discussões: GitHub Discussions
- Email: suporte@pytake.com

---

Bem-vindo ao PyTake! 🚀