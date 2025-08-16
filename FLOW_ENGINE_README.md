# PyTake Flow Engine

Sistema de execução de flows conversacionais para WhatsApp Business API, desenvolvido em Rust.

## 🚀 Funcionalidades

- **Execução de Flows**: Motor de execução robusto para automações conversacionais
- **Sessões Redis**: Gerenciamento de estado com persistência em Redis
- **WhatsApp Integration**: Integração completa com WhatsApp Business API
- **Mensagens Interativas**: Suporte para botões, listas e formulários
- **AI Integration**: Classificação inteligente e respostas automáticas
- **Multi-tenant**: Arquitetura preparada para múltiplos clientes
- **API RESTful**: Endpoints completos para gerenciamento de flows

## 📋 Pré-requisitos

- Rust 1.70+
- Redis 6.0+
- WhatsApp Business API Account
- Chaves de APIs de IA (opcional)

## 🛠️ Instalação

1. **Clone o repositório**:
```bash
git clone <repository-url>
cd pytake-backend
```

2. **Configure as variáveis de ambiente**:
```bash
cp .env.flow-engine .env
# Edite o arquivo .env com suas configurações
```

3. **Instale as dependências e compile**:
```bash
cargo build --release
```

4. **Execute o servidor**:
```bash
cargo run --release
```

O servidor estará disponível em `http://localhost:8080`

## 🔧 Configuração

### Variáveis de Ambiente

```env
# Server
PORT=8080
REDIS_URL=redis://localhost:6379

# WhatsApp
WHATSAPP_ACCESS_TOKEN=seu-token
WHATSAPP_PHONE_NUMBER_ID=seu-phone-id
WHATSAPP_WEBHOOK_VERIFY_TOKEN=seu-verify-token

# JWT
JWT_SECRET=sua-chave-secreta
```

### Redis Setup

```bash
# Docker
docker run -d --name redis -p 6379:6379 redis:7-alpine

# ou instale localmente
sudo apt-get install redis-server
redis-server
```

## 📡 API Endpoints

### Flow Management

```bash
# Iniciar flow
POST /api/v1/flows/start
{
  "flow_id": "main_menu",
  "contact_id": "5511999999999",
  "trigger_data": {}
}

# Processar resposta
POST /api/v1/flows/process
{
  "session_id": "session-uuid",
  "user_input": "texto do usuário",
  "selection_id": "opcao_selecionada"
}

# Status da sessão
GET /api/v1/flows/sessions/{session_id}

# Sessões ativas
GET /api/v1/flows/sessions/active

# Estatísticas
GET /api/v1/flows/sessions/stats
```

### Webhook WhatsApp

```bash
# Verificação do webhook
GET /api/v1/webhook/whatsapp?hub.mode=subscribe&hub.challenge=123&hub.verify_token=token

# Receber mensagens
POST /api/v1/webhook/whatsapp
{
  "object": "whatsapp_business_account",
  "entry": [...]
}

# Simular interação (desenvolvimento)
POST /api/v1/webhook/simulate-interactive
{
  "contact_id": "5511999999999",
  "text": "mensagem",
  "selection_id": "opcao"
}
```

## 🔄 Tipos de Nodes

### 1. Message Node
Enviar mensagem de texto simples:
```json
{
  "id": "welcome",
  "type": "message",
  "config": {
    "content": "Bem-vindo ao PyTake!"
  },
  "next": "menu"
}
```

### 2. Buttons Node
Mensagem com botões interativos:
```json
{
  "id": "menu",
  "type": "buttons", 
  "config": {
    "message": "Como posso ajudar?",
    "buttons": [
      {"id": "support", "text": "Suporte"},
      {"id": "sales", "text": "Vendas"}
    ]
  }
}
```

### 3. Interactive List Node
Lista interativa com múltiplas opções:
```json
{
  "id": "categories",
  "type": "interactive_list",
  "config": {
    "content": {
      "header": "Categorias",
      "body": "Escolha uma categoria:",
      "sections": [{
        "title": "Produtos",
        "rows": [
          {"id": "eletronicos", "title": "Eletrônicos"},
          {"id": "moda", "title": "Moda"}
        ]
      }]
    }
  }
}
```

### 4. Input Node
Coletar entrada do usuário:
```json
{
  "id": "ask_name",
  "type": "input",
  "config": {
    "message": "Digite seu nome:",
    "variable": "name",
    "validation": "min:2,max:50"
  },
  "next": "ask_email"
}
```

### 5. Switch Node
Decisão baseada em variáveis:
```json
{
  "id": "route",
  "type": "switch",
  "config": {
    "condition": "{{selected_option}}",
    "cases": {
      "support": "support_flow",
      "sales": "sales_flow",
      "default": "main_menu"
    }
  }
}
```

### 6. AI Classifier Node
Classificação inteligente:
```json
{
  "id": "classify_intent",
  "type": "ai_classifier",
  "config": {
    "model": "gpt-4",
    "prompt": "Classifique a intenção: suporte, vendas, financeiro",
    "input": "{{user_message}}",
    "output": "intent"
  }
}
```

## 🎯 Exemplos de Uso

### 1. Flow de Menu Principal

```rust
// O sistema automaticamente carrega flows padrão:
// - main_menu: Menu principal com botões
// - smart_support: Suporte inteligente com IA
```

### 2. Testando o Sistema

```bash
# 1. Simular mensagem inicial
curl -X POST http://localhost:8080/api/v1/webhook/simulate-interactive \
  -H "Content-Type: application/json" \
  -d '{
    "contact_id": "5511999999999",
    "text": "oi"
  }'

# 2. Simular clique em botão
curl -X POST http://localhost:8080/api/v1/webhook/simulate-interactive \
  -H "Content-Type: application/json" \
  -d '{
    "contact_id": "5511999999999",
    "selection_id": "support"
  }'
```

### 3. Verificar Sessões Ativas

```bash
curl http://localhost:8080/api/v1/flows/sessions/active
```

## 🔍 Monitoramento

### Health Check
```bash
curl http://localhost:8080/health
```

### Logs
```bash
# Logs detalhados
RUST_LOG=debug cargo run

# Logs de produção
RUST_LOG=info cargo run
```

### Métricas Redis
```bash
# Conectar ao Redis
redis-cli

# Ver sessões ativas
KEYS flow_session:*

# Ver sessões por contato
KEYS flow_session_by_contact:*
```

## 🧪 Desenvolvimento

### Executar Testes
```bash
cargo test
```

### Executar com Hot Reload
```bash
cargo install cargo-watch
cargo watch -x run
```

### Linting
```bash
cargo clippy
cargo fmt
```

## 🚀 Deploy

### Docker
```dockerfile
FROM rust:1.70 as builder
WORKDIR /app
COPY . .
RUN cargo build --release

FROM debian:bookworm-slim
WORKDIR /app
COPY --from=builder /app/target/release/pytake-flow-engine .
CMD ["./pytake-flow-engine"]
```

### Docker Compose
```yaml
version: '3.8'
services:
  flow-engine:
    build: .
    ports:
      - "8080:8080"
    environment:
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis
  
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

## 🔒 Segurança

- **JWT Authentication**: Tokens JWT para autenticação
- **Webhook Validation**: Validação de assinatura do WhatsApp
- **Rate Limiting**: Controle de taxa por IP
- **Environment Variables**: Configurações sensíveis em variáveis de ambiente

## 📚 Documentação API

Acesse a documentação interativa:
- **Health**: `GET /health`
- **API Info**: `GET /`
- **Flows**: `/api/v1/flows/*`
- **Webhook**: `/api/v1/webhook/*`

## 🐛 Troubleshooting

### Problemas Comuns

1. **Redis Connection Failed**:
   - Verifique se o Redis está rodando
   - Confirme a URL do Redis no .env

2. **WhatsApp API Error**:
   - Verifique o token de acesso
   - Confirme o phone_number_id
   - Teste a conectividade com a API

3. **Session Not Found**:
   - Verifique se o Redis está persistindo dados
   - Confirme se a sessão não expirou

### Debug Mode
```bash
RUST_LOG=debug cargo run
```

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit as mudanças (`git commit -am 'Adicionar nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está licenciado sob a licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.

## 📞 Suporte

- **Email**: suporte@pytake.com
- **Discord**: [PyTake Community](https://discord.gg/pytake)
- **Documentação**: [docs.pytake.com](https://docs.pytake.com)

---

**PyTake Flow Engine** - Automação conversacional de próxima geração 🚀