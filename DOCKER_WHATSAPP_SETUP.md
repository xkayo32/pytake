# Configuração WhatsApp com Docker

## Início Rápido

### 1. Iniciar o ambiente com Evolution API:

```bash
# No Windows (PowerShell/Git Bash)
./scripts/start-whatsapp-dev.sh

# Ou diretamente com docker-compose
docker-compose -f docker-compose.dev.yml up -d
```

### 2. Verificar se os serviços estão rodando:

```bash
docker-compose -f docker-compose.dev.yml ps
```

Você deve ver:
- `pytake-postgres` - PostgreSQL
- `pytake-redis` - Redis
- `pytake-backend-simple` - Backend API
- `pytake-evolution-api` - WhatsApp Evolution API
- `pytake-frontend-dev` - Frontend React

### 3. Acessar as interfaces:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8080
- **Evolution API**: http://localhost:8084
- **pgAdmin** (opcional): http://localhost:5050
- **Redis Commander** (opcional): http://localhost:8081

## Configuração do WhatsApp

### Via Interface Web:

1. Acesse http://localhost:3000
2. Faça login como Admin:
   - Email: `admin@pytake.com`
   - Senha: `admin123`
3. Vá para **Configurações > WhatsApp Config** no menu
4. Selecione **Evolution API**
5. Preencha:
   - URL Base: `http://localhost:8084`
   - API Key: `B6D711FCDE4D4FD5936544120E713976`
   - Nome da Instância: `pytake`
   - Webhook URL: `http://backend-simple:8080/api/v1/webhooks/whatsapp`
6. Clique em **Salvar Configurações**
7. Clique em **Testar Conexão**

### Via Script:

```bash
# Testar configuração automaticamente
./scripts/test-whatsapp-config.sh
```

## Área do Agente

### Para acessar a área de atendimento:

1. Faça login como Agent:
   - Email: `agent@pytake.com`
   - Senha: `agent123`
2. Acesse **Atendimento** no menu
3. Você verá:
   - Lista de conversas
   - Filtros (Todas/Aguardando/Minhas)
   - Busca de conversas
   - Botão para puxar atendimento

## Comandos Úteis

### Ver logs em tempo real:
```bash
# Todos os serviços
docker-compose -f docker-compose.dev.yml logs -f

# Apenas backend
docker-compose -f docker-compose.dev.yml logs -f backend-simple

# Apenas Evolution API
docker-compose -f docker-compose.dev.yml logs -f evolution-api
```

### Reiniciar um serviço específico:
```bash
docker-compose -f docker-compose.dev.yml restart backend-simple
```

### Parar todos os serviços:
```bash
docker-compose -f docker-compose.dev.yml down
```

### Limpar tudo (incluindo volumes):
```bash
docker-compose -f docker-compose.dev.yml down -v
```

## Estrutura dos Endpoints

### Configuração WhatsApp:
- `GET /api/v1/settings/whatsapp` - Obter configuração
- `PUT /api/v1/settings/whatsapp` - Salvar configuração
- `POST /api/v1/settings/whatsapp/test` - Testar conexão

### Conversas do Agente:
- `GET /api/v1/conversations/agent` - Listar conversas
- `GET /api/v1/conversations/{id}/messages` - Obter mensagens
- `POST /api/v1/conversations/{id}/assign` - Puxar atendimento
- `POST /api/v1/conversations/{id}/resolve` - Resolver conversa
- `POST /api/v1/conversations/{id}/send` - Enviar mensagem

### WebSocket:
- `ws://localhost:8080/ws` - Conexão WebSocket para eventos em tempo real

## Troubleshooting

### Backend não conecta no PostgreSQL:
```bash
# Verificar se o PostgreSQL está rodando
docker-compose -f docker-compose.dev.yml ps postgres

# Ver logs do PostgreSQL
docker-compose -f docker-compose.dev.yml logs postgres
```

### Evolution API não recebe webhooks:
```bash
# Verificar logs da Evolution API
docker-compose -f docker-compose.dev.yml logs evolution-api

# Testar webhook manualmente
curl -X POST http://localhost:8080/api/v1/webhooks/whatsapp \
  -H "Content-Type: application/json" \
  -d '{"event": "test"}'
```

### Frontend não conecta no backend:
- Verifique se o backend está rodando na porta 8080
- Verifique CORS no console do navegador
- Certifique-se de que `VITE_API_URL` está configurado corretamente

## Desenvolvimento

### Hot Reload:
- Frontend: Alterações são refletidas automaticamente
- Backend: Precisa rebuild e restart:
  ```bash
  docker-compose -f docker-compose.dev.yml up -d --build backend-simple
  ```

### Adicionar ferramentas de debug:
```bash
# Iniciar com pgAdmin e Redis Commander
docker-compose -f docker-compose.dev.yml --profile tools up -d
```

## Segurança

⚠️ **IMPORTANTE**: As configurações atuais são apenas para desenvolvimento!

Para produção, altere:
- JWT_SECRET
- Senhas do banco de dados
- API Keys
- Desabilite CORS permissivo
- Use HTTPS