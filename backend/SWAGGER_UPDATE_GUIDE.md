# Guia de Atualização Swagger - PyTake API

## 📋 Resumo da Atualização

A documentação do Swagger foi significativamente enriquecida para refletir:

✅ **Parâmetros detalhados** - Cada parâmetro com tipo, validação e descrição  
✅ **Respostas com exemplos** - HTTP 200, 201, 400, 401, 404, 429 com exemplos JSON  
✅ **Códigos de erro** - Tratamento explícito de erro com mensagens  
✅ **Exemplos cURL** - Todos os endpoints com exemplos práticos de uso  
✅ **Autenticação** - Documentação clara de como usar JWT tokens  
✅ **Rate limiting** - Informações de limites em cada endpoint  
✅ **Tags de agrupamento** - Endpoints organizados por categoria  

---

## 🔧 Arquivos Criados/Modificados

### 1. **app/core/openapi_schema.py** (NOVO)
Configuração centralizada do schema OpenAPI com:
- Informações completas da API (título, versão, descrição)
- Lista de servidores (dev, staging, prod)
- Descrição markdown com guia de quick start
- Documentação de rate limiting
- Formato de respostas padronizado
- Solução de problemas comuns

### 2. **app/core/swagger_examples.py** (NOVO)
Exemplos reutilizáveis para toda a API:
- `AUTH_EXAMPLES` - Login, registro, tokens
- `CONTACT_EXAMPLES` - Criação, listagem, detalhes
- `CONVERSATION_EXAMPLES` - Conversas e threads
- `MESSAGE_EXAMPLES` - Mensagens enviadas/recebidas
- `FLOW_EXAMPLES` - Fluxos de automação
- `WHATSAPP_EXAMPLES` - Conexões e webhooks
- `ERROR_EXAMPLES` - 401, 403, 404, 429, 500

### 3. **app/main.py** (MODIFICADO)
Integração do schema customizado:
```python
from app.core.openapi_schema import custom_openapi

app.openapi = lambda: custom_openapi(app)
```

### 4. **app/api/v1/endpoints/auth.py** (MODIFICADO)
Documentação enriquecida com:
- Summaries em cada endpoint
- Descrições markdown detalhadas
- Request/Response examples
- Rate limit info
- Validações explicadas
- Exemplos cURL

### 5. **app/api/v1/endpoints/contacts.py** (MODIFICADO - PARCIAL)
Iniciado com:
- Tag automática de agrupamento
- Import de exemplos
- Documentação estruturada pronta

---

## 📝 Estrutura Padrão para Cada Endpoint

```python
@router.post(
    "/rota",
    response_model=ResponseModel,
    status_code=status.HTTP_201_CREATED,
    summary="Resumo do que faz",
    responses={
        201: {
            "description": "Sucesso",
            "content": {
                "application/json": {
                    "example": EXAMPLES["key"]
                }
            },
        },
        400: {
            "description": "Validação falhou",
            "content": {
                "application/json": {
                    "example": ERROR_EXAMPLES["validation_error"]
                }
            },
        },
        401: {
            "description": "Não autenticado",
            "content": {
                "application/json": {
                    "example": ERROR_EXAMPLES["unauthorized"]
                }
            },
        },
    },
)
async def endpoint_name(
    param1: str = Query(..., description="Descrição do parâmetro"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    # Título da Operação

    **Descrição breve do que faz**

    Explicação mais detalhada se necessário.

    ### Request Parameters:
    - **param1** (type, required): Descrição
    - **param2** (type, optional): Descrição

    ### Response:
    - **field1**: Descrição
    - **field2**: Descrição

    ### Authentication:
    Requer token de acesso válido

    ### Rate Limit:
    - **X requests per minute** per user/IP

    ### Errors:
    - `400 Bad Request`: Detalhes
    - `401 Unauthorized`: Detalhes
    - `404 Not Found`: Detalhes

    ### Example cURL:
    ```bash
    curl -X POST http://localhost:8000/api/v1/rota \\
      -H "Authorization: Bearer token..." \\
      -H "Content-Type: application/json" \\
      -d '{ "field": "value" }'
    ```
    """
    # Implementação
    pass
```

---

## 🚀 Próximas Etapas para Completar

### Endpoints que Faltam Documentação (por arquivo):

#### **conversations.py**
- GET `/conversations` - List conversations
- GET `/conversations/{id}` - Get conversation
- POST `/conversations/{id}/messages` - Send message
- GET `/conversations/{id}/messages` - Get messages
- PUT `/conversations/{id}/status` - Update status

#### **flow_automations.py**
- GET `/flows` - List flows
- POST `/flows` - Create flow
- GET `/flows/{id}` - Get flow
- PUT `/flows/{id}` - Update flow
- DELETE `/flows/{id}` - Delete flow
- POST `/flows/{id}/execute` - Trigger execution

#### **whatsapp.py**
- POST `/whatsapp/connections` - Create connection
- GET `/whatsapp/connections` - List connections
- GET `/whatsapp/connections/{id}` - Get connection
- PUT `/whatsapp/connections/{id}` - Update connection
- POST `/whatsapp/webhook` - Webhook receiver (public)

#### **users.py**
- GET `/users` - List users
- POST `/users` - Create user
- GET `/users/{id}` - Get user
- PUT `/users/{id}` - Update user
- DELETE `/users/{id}` - Delete user

#### **organizations.py**
- GET `/organizations/me` - Get current org
- PUT `/organizations/me` - Update settings
- GET `/organizations/members` - List members
- POST `/organizations/members` - Invite member

#### **analytics.py**
- GET `/analytics/dashboard` - Dashboard stats
- GET `/analytics/messages` - Message analytics
- GET `/analytics/conversations` - Conversation analytics
- GET `/analytics/export` - Export data

---

## 📊 Exemplo Completo - Antes vs Depois

### ANTES (auth.py)
```python
@router.post("/login", response_model=dict)
@limiter.limit("5/minute")
async def login(request: Request, data: UserLogin, ...):
    """Authenticate user and get access token"""
    user, token = await auth_service.login(data, ip_address)
    return {"user": user, "token": token, "message": "Login successful"}
```

**Swagger gerado:**
- ❌ Sem exemplos
- ❌ Sem detalhes de resposta
- ❌ Sem informações de rate limit
- ❌ Sem cURL example

### DEPOIS (auth.py melhorado)
```python
@router.post(
    "/login",
    response_model=dict,
    summary="Authenticate user and get tokens",
    responses={
        200: {
            "description": "Login successful",
            "content": {
                "application/json": {
                    "example": AUTH_EXAMPLES["login_success"]
                }
            },
        },
        401: {
            "description": "Invalid credentials",
            "content": {
                "application/json": {
                    "example": AUTH_EXAMPLES["invalid_credentials"]
                }
            },
        },
    },
)
@limiter.limit("5/minute")
async def login(request: Request, data: UserLogin, ...):
    """
    Authenticate user and get JWT tokens

    **Authenticates user credentials and returns access/refresh tokens.**

    ### Request Parameters:
    - **email** (string, required): User's email
    - **password** (string, required): User's password

    ### Response:
    - **access_token**: JWT token (valid 1 hour)
    - **refresh_token**: Token to refresh (valid 30 days)
    - **token_type**: Always "bearer"

    ### Rate Limit:
    - **5 login attempts per minute** per IP

    ### Example cURL:
    ```bash
    curl -X POST http://localhost:8000/api/v1/auth/login \\
      -H "Content-Type: application/json" \\
      -d '{"email": "user@example.com", "password": "SecurePass123"}'
    ```
    """
    user, token = await auth_service.login(data, ip_address)
    return {"user": user, "token": token, "message": "Login successful"}
```

**Swagger gerado:**
- ✅ Exemplos JSON completos
- ✅ Códigos de erro com exemplos
- ✅ Documentação de rate limit
- ✅ Comando cURL pronto para usar
- ✅ Descrição clara e estruturada

---

## 🎯 Como Usar os Exemplos

### Adicionar Tags de Agrupamento

```python
router = APIRouter(tags=["NomeCategoria"])
```

Categorias sugeridas:
- `Authentication` - Auth endpoints
- `Contacts` - Contact management
- `Conversations` - Message threads
- `Flows` - Automation flows
- `WhatsApp` - WhatsApp connections
- `Users` - User management
- `Organizations` - Org settings
- `Analytics` - Analytics & reports

### Importar Exemplos

```python
from app.core.swagger_examples import (
    AUTH_EXAMPLES,
    CONTACT_EXAMPLES,
    CONVERSATION_EXAMPLES,
    MESSAGE_EXAMPLES,
    FLOW_EXAMPLES,
    WHATSAPP_EXAMPLES,
    ERROR_EXAMPLES,
)
```

### Usar em Decorador

```python
responses={
    200: {
        "description": "Success",
        "content": {
            "application/json": {
                "example": CONTACT_EXAMPLES["contact_created"]
            }
        },
    },
}
```

---

## 🔐 Matriz de HTTP Status Codes

| Código | Uso | Exemplo |
|--------|-----|---------|
| **200** | GET, PUT bem-sucedido | Contato retornado |
| **201** | POST bem-sucedido | Contato criado |
| **204** | DELETE bem-sucedido | Sem conteúdo |
| **400** | Validação falhou | Email inválido |
| **401** | Token inválido/expirado | Não autenticado |
| **403** | Sem permissão | Não autorizado |
| **404** | Recurso não existe | Contato não encontrado |
| **429** | Rate limit excedido | Muitas requisições |
| **500** | Erro do servidor | Erro interno |

---

## 📋 Checklist para Cada Endpoint

- [ ] **Summary** - Frase curta descrevendo a operação
- [ ] **Description** - Markdown com título, descrição, seções
- [ ] **Parameters** - Cada param documentado com tipo e validação
- [ ] **Request Body** - Seção "Request Parameters" no markdown
- [ ] **Response** - Seção "Response" com campos explicados
- [ ] **Status Codes** - Pelo menos 200/201, 400, 401, 404 se aplicável
- [ ] **Examples JSON** - Exemplo para cada status code
- [ ] **cURL Example** - Comando pronto para copiar/colar
- [ ] **Authentication** - Se precisa token, documentar
- [ ] **Rate Limit** - Informar limite se houver

---

## 🧪 Testando no Swagger

1. **Iniciar servidor:**
   ```bash
   docker-compose up backend
   ```

2. **Acessar Swagger UI:**
   ```
   http://localhost:8000/api/v1/docs
   ```

3. **Expandir endpoint** e ver:
   - ✅ Descrição completa
   - ✅ Parâmetros com tipos
   - ✅ Exemplo de request
   - ✅ Exemplo de response
   - ✅ Códigos de erro
   - ✅ Botão "Try it out"

---

## 💡 Dicas Importantes

1. **Manter exemplos realistas** - Use dados que fazem sentido
2. **Usar UUIDs válidos** - Use valores que parecem reais
3. **Timestamps ISO 8601** - Use formato completo: `2025-11-30T10:00:00Z`
4. **Documentar todos os erros** - Incluir 400, 401, 404, 429
5. **Exemplos cURL** - Use `\\` para quebra de linha no bash
6. **Seções markdown claras** - Use `###` para subseções

---

## 🔗 Referências

- **OpenAPI 3.0**: https://spec.openapis.org/oas/v3.0.3
- **FastAPI Docs**: https://fastapi.tiangolo.com/
- **JSON Schema**: https://json-schema.org/

**Versão:** 1.0.0 | **Implementado por:** Kayo Carvalho Fernandes | **Data:** Novembro 2025
