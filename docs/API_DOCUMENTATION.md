# 📚 Documentação da API PyTake

**Autor:** Kayo Carvalho Fernandes
**Data:** 28 de Dezembro de 2025
**Versão:** 1.0

---

## 🚀 Quick Start

### Acessar Documentação Interativa (Swagger UI)

**Desenvolvimento:**
```
http://localhost:8002/api/v1/docs
```

**Produção:**
```
https://seu-dominio.com/api/v1/docs
```

---

## 📖 Tipos de Documentação Disponíveis

### 1. **Swagger UI** (Recomendado)
- **URL**: `/api/v1/docs`
- **Descrição**: Interface interativa para testar APIs
- **Recursos**:
  - Testar endpoints diretamente no navegador
  - Autenticação JWT integrada
  - Exemplos de request/response
  - Download do OpenAPI spec

### 2. **ReDoc**
- **URL**: `/api/v1/redoc`
- **Descrição**: Documentação elegante e responsiva
- **Recursos**:
  - Design limpo e organizado
  - Busca avançada
  - Navegação por tags
  - Excelente para referência

### 3. **OpenAPI JSON**
- **URL**: `/api/v1/openapi.json`
- **Descrição**: Especificação OpenAPI 3.1 completa
- **Uso**:
  - Importar em Postman/Insomnia
  - Gerar SDKs com OpenAPI Generator
  - Integração com ferramentas CI/CD

---

## 🔐 Autenticação

Todas as APIs (exceto endpoints públicos) requerem autenticação via JWT token.

### Obter Token JWT

**Via Swagger UI:**
1. Acesse `/api/v1/docs`
2. Clique em "Authorize" (cadeado verde no topo direito)
3. Use suas credenciais:
   - **Username**: `admin@pytake.net`
   - **Password**: `nYVUJy9w5hYQGh52CSpM0g`
4. Clique em "Authorize" e "Close"
5. Agora todos os endpoints usarão automaticamente o token

**Via cURL:**
```bash
curl -X POST "http://localhost:8002/api/v1/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin@pytake.net&password=nYVUJy9w5hYQGh52CSpM0g"
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

### Usar Token

**Header HTTP:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 📊 Estatísticas da API

- **Total de Endpoints REST**: 217+
- **Versão da API**: v1
- **Protocolo**: HTTPS (produção), HTTP (desenvolvimento)
- **Formato de Data**: ISO 8601 (UTC)
- **Rate Limiting**: Configurável por endpoint

---

## 🆕 Novos Recursos (Dezembro 2025)

### Análise de Templates com IA

Adicionado suporte para análise automática de templates WhatsApp usando IA antes de enviar à Meta.

**Campos Adicionados ao `TemplateResponse`:**

```json
{
  "ai_analysis_score": 85.5,
  "ai_suggested_category": "UTILITY",
  "ai_analyzed_at": "2025-12-28T22:00:00Z"
}
```

**Descrição dos Campos:**

- `ai_analysis_score` (float, nullable): Score de qualidade do template (0-100)
  - < 60 = Crítico (não recomendado enviar)
  - 60-80 = Atenção (pode melhorar)
  - > 80 = Bom (aprovação provável)

- `ai_suggested_category` (string, nullable): Categoria sugerida pela IA
  - Valores: `MARKETING`, `UTILITY`, `AUTHENTICATION`

- `ai_analyzed_at` (datetime, nullable): Data/hora quando foi analisado pela IA

**Providers de IA Suportados:**
- OpenAI (GPT-4o mini, GPT-4o)
- Anthropic (Claude 3.5 Haiku, Claude 3.5 Sonnet)
- Google Gemini (2.0 Flash, 1.5 Pro, 1.5 Flash)

**Configuração:**
Ver `docs/AI_MODELS_GUIDE.md` para mais detalhes.

---

## 📁 Estrutura da API

### Endpoints Principais

#### Autenticação
- `POST /api/v1/auth/login` - Login e obtenção de token
- `POST /api/v1/auth/logout` - Logout
- `POST /api/v1/auth/refresh` - Renovar token

#### Organizações
- `GET /api/v1/organizations` - Listar organizações
- `POST /api/v1/organizations` - Criar organização
- `GET /api/v1/organizations/{id}` - Obter organização
- `PUT /api/v1/organizations/{id}` - Atualizar organização

#### Usuários
- `GET /api/v1/users` - Listar usuários
- `POST /api/v1/users` - Criar usuário
- `GET /api/v1/users/{id}` - Obter usuário
- `PUT /api/v1/users/{id}` - Atualizar usuário

#### WhatsApp - Números
- `GET /api/v1/whatsapp/numbers` - Listar números
- `POST /api/v1/whatsapp/numbers` - Conectar número
- `GET /api/v1/whatsapp/numbers/{id}` - Obter número

#### WhatsApp - Templates
- `GET /api/v1/whatsapp/{number_id}/templates` - Listar templates
- `POST /api/v1/whatsapp/{number_id}/templates` - Criar template
  - **Query Param**: `submit=true` para enviar à Meta automaticamente
  - **Novo**: Análise de IA executada antes do envio
- `GET /api/v1/whatsapp/{number_id}/templates/{id}` - Obter template
- `PUT /api/v1/whatsapp/{number_id}/templates/{id}` - Atualizar template

#### Conversas
- `GET /api/v1/conversations` - Listar conversas
- `GET /api/v1/conversations/{id}` - Obter conversa
- `PUT /api/v1/conversations/{id}` - Atualizar conversa

#### Mensagens
- `POST /api/v1/messages/send` - Enviar mensagem
- `GET /api/v1/messages/{conversation_id}` - Listar mensagens

#### Filas (Queues)
- `GET /api/v1/queues` - Listar filas
- `POST /api/v1/queues` - Criar fila
- `GET /api/v1/queues/{id}` - Obter fila
- `PUT /api/v1/queues/{id}` - Atualizar fila

#### Departamentos
- `GET /api/v1/departments` - Listar departamentos
- `POST /api/v1/departments` - Criar departamento

#### AI Assistant
- `GET /api/v1/ai-assistant/settings` - Obter configurações de IA
- `POST /api/v1/ai-assistant/settings` - Configurar IA
- `POST /api/v1/ai-assistant/generate-flow` - Gerar fluxo com IA

---

## 🔍 Exemplos de Uso

### Exemplo 1: Criar Template com Análise de IA

```bash
# 1. Login e obter token
TOKEN=$(curl -s -X POST "http://localhost:8002/api/v1/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin@pytake.net&password=nYVUJy9w5hYQGh52CSpM0g" \
  | jq -r '.access_token')

# 2. Criar template (com análise de IA automática)
curl -X POST "http://localhost:8002/api/v1/whatsapp/{number_id}/templates?submit=true" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "confirmacao_pedido",
    "category": "UTILITY",
    "language": "pt_BR",
    "components": [
      {
        "type": "HEADER",
        "format": "TEXT",
        "text": "Confirmação do Pedido #{{numero_pedido}}"
      },
      {
        "type": "BODY",
        "text": "Olá {{cliente}}, seu pedido foi confirmado!"
      },
      {
        "type": "FOOTER",
        "text": "Loja XYZ - Compras Seguras"
      }
    ]
  }'
```

**Response (se análise passou):**
```json
{
  "id": "uuid...",
  "name": "confirmacao_pedido",
  "status": "PENDING",
  "category": "UTILITY",
  "ai_analysis_score": 92.5,
  "ai_suggested_category": "UTILITY",
  "ai_analyzed_at": "2025-12-28T22:00:00Z",
  ...
}
```

**Response (se análise detectou problemas):**
```json
{
  "template": {
    "id": "uuid...",
    "name": "confirmacao_pedido",
    "status": "DRAFT",
    "ai_analysis_score": 45.0,
    ...
  },
  "ai_analysis": {
    "overall_score": 45.0,
    "has_critical_issues": true,
    "validations": [
      {
        "severity": "critical",
        "category": "content",
        "message": "Body muito simples",
        "suggestion": "Adicione mais contexto..."
      }
    ],
    ...
  },
  "submitted_to_meta": false,
  "message": "Template não foi enviado à Meta devido a problemas..."
}
```

---

## 🛠️ Ferramentas Recomendadas

### Para Desenvolvimento

1. **Swagger UI** (Integrado)
   - Melhor para testes rápidos
   - URL: `http://localhost:8002/api/v1/docs`

2. **Postman**
   - Importar via OpenAPI: `http://localhost:8002/api/v1/openapi.json`
   - Criar collections
   - Automatizar testes

3. **Insomnia**
   - Alternativa ao Postman
   - Interface mais simples
   - Suporte a GraphQL nativo

4. **cURL**
   - Scripts automatizados
   - CI/CD pipelines
   - Testes básicos

---

## 📱 Rate Limiting

A API possui rate limiting para proteger contra abuso:

**Limites Padrão:**
- **Autenticação**: 5 requests/minuto
- **APIs Gerais**: 100 requests/minuto
- **Webhooks**: Sem limite (autenticados via signature)

**Headers de Rate Limit:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640000000
```

**Response quando excedido (429):**
```json
{
  "detail": "Rate limit exceeded. Try again in 60 seconds."
}
```

---

## 🐛 Códigos de Erro Comuns

| Código | Descrição | Solução |
|--------|-----------|---------|
| 400 | Bad Request | Verificar formato dos dados enviados |
| 401 | Unauthorized | Obter/renovar token JWT |
| 403 | Forbidden | Verificar permissões do usuário |
| 404 | Not Found | Verificar ID/rota do recurso |
| 422 | Validation Error | Verificar campos obrigatórios/formatos |
| 429 | Rate Limit Exceeded | Aguardar e tentar novamente |
| 500 | Internal Server Error | Reportar para suporte |

---

## 📚 Documentação Adicional

- **Guia Completo de APIs**: `docs/API_REFERENCE_COMPLETE.md`
- **Categorias de Templates WhatsApp**: `docs/WHATSAPP_TEMPLATE_CATEGORIES_GUIDE.md`
- **Modelos de IA Disponíveis**: `docs/AI_MODELS_GUIDE.md`
- **Índice de Documentação**: `docs/INDEX.md`
- **Troubleshooting**: `docs/TROUBLESHOOTING_FAQ.md`

---

## 🔗 Links Úteis

- **Swagger UI**: `/api/v1/docs`
- **ReDoc**: `/api/v1/redoc`
- **OpenAPI JSON**: `/api/v1/openapi.json`
- **Health Check**: `/api/v1/health`
- **GraphQL Playground**: `/graphql` (desenvolvimento)

---

## 📧 Suporte

**Dúvidas sobre a API?**

- **Documentação**: Consulte `docs/INDEX.md`
- **GitHub Issues**: https://github.com/pytake/pytake/issues
- **Email**: support@pytake.com
- **Slack**: #pytake-api-support

---

**Última Atualização:** 28 de Dezembro de 2025
**Versão da API:** 1.0.0
**Mantido por:** Kayo Carvalho Fernandes
