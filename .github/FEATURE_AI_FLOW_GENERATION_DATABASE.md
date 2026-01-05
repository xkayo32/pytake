# ✨ Feature: Geração de Flows por IA com Salvamento Automático

**Data**: 2026-01-05  
**Autor**: Kayo Carvalho Fernandes  
**Status**: ✅ Implementado

---

## 📋 Resumo

Adicionada funcionalidade para **gerar flows pela IA e salvá-los automaticamente no banco de dados**, tornando-os imediatamente usáveis no sistema (não como templates de galeria estáticos).

---

## 🎯 O Que Mudou

### ANTES ❌

```
POST /api/v1/ai-assistant/generate-flow
{
  "description": "Flow de vendas para e-commerce",
  "chatbot_id": "uuid..."
}

→ Retorna: Apenas JSON do flow (flow_data)
→ Usuário precisa: Criar flow manualmente via POST /flows
```

### DEPOIS ✅

```
POST /api/v1/ai-assistant/generate-flow
{
  "description": "Flow de vendas para e-commerce",
  "chatbot_id": "uuid...",
  "save_to_database": true,           ← NOVO
  "flow_name": "Vendas E-commerce"    ← NOVO (opcional)
}

→ Retorna: JSON do flow + flow_id do flow salvo
→ Flow já está PRONTO PARA USO no chatbot!
```

---

## 🔧 Mudanças Técnicas

### 1. Schema: `GenerateFlowRequest` (novos campos)

**Arquivo**: `backend/app/schemas/ai_assistant.py`

```python
class GenerateFlowRequest(BaseModel):
    description: str                 # ✅ Já existia
    industry: Optional[str]          # ✅ Já existia
    language: str = "pt-BR"          # ✅ Já existia
    chatbot_id: Optional[str]        # ✅ Já existia
    save_to_database: bool = False   # 🆕 NOVO: Salvar no banco?
    flow_name: Optional[str]         # 🆕 NOVO: Nome customizado
```

### 2. Schema: `GenerateFlowResponse` (novos campos)

```python
class GenerateFlowResponse(BaseModel):
    flow_id: Optional[str]           # 🆕 NOVO: UUID do flow salvo
    flow_name: Optional[str]         # 🆕 NOVO: Nome do flow salvo
    saved_to_database: bool = False  # 🆕 NOVO: Flag se foi salvo
    status: str                      # ✅ Já existia
    flow_data: Optional[Dict]        # ✅ Já existia
    clarification_questions: ...     # ✅ Já existia
    error_message: Optional[str]     # ✅ Já existia
```

### 3. Service: `FlowGeneratorService.generate_flow_from_description()`

**Arquivo**: `backend/app/services/flow_generator_service.py`

**Novos parâmetros:**
```python
async def generate_flow_from_description(
    self,
    organization_id: UUID,
    description: str,
    industry: Optional[str] = None,
    language: str = "pt-BR",
    clarifications: Optional[Dict[str, str]] = None,
    chatbot_id: Optional[UUID] = None,
    save_to_database: bool = False,   # 🆕 NOVO
    flow_name: Optional[str] = None   # 🆕 NOVO
) -> GenerateFlowResponse:
```

**Lógica adicionada:**
```python
# Após gerar flow_data pela IA...

if save_to_database and chatbot_id:
    # 1. Verifica se chatbot existe e pertence à organização
    chatbot = await self.chatbot_repo.get(chatbot_id)
    if chatbot and chatbot.organization_id == organization_id:
        
        # 2. Gera nome se não fornecido
        if not flow_name:
            flow_name = f"{flow_data.get('name')} - {language}".title()
        
        # 3. Cria FlowCreate object
        flow_create_data = FlowCreate(
            chatbot_id=chatbot_id,
            name=flow_name,
            description=description[:500],
            canvas_data=flow_data,
            is_main=False,
            is_fallback=False,
            is_active=True
        )
        
        # 4. Salva usando FlowService (aplica todas as regras de negócio)
        flow_service = FlowService(self.db)
        saved_flow = await flow_service.create_flow(flow_create_data, organization_id)
        
        # 5. Atualiza resposta com dados do flow salvo
        response.flow_id = str(saved_flow.id)
        response.flow_name = saved_flow.name
        response.saved_to_database = True
```

### 4. Endpoint: `POST /api/v1/ai-assistant/generate-flow`

**Arquivo**: `backend/app/api/v1/endpoints/ai_assistant.py`

```python
response = await service.generate_flow_from_description(
    organization_id=current_user.organization_id,
    description=request.description,
    industry=request.industry,
    language=request.language,
    clarifications=None,
    chatbot_id=chatbot_id,
    save_to_database=request.save_to_database,  # 🆕 NOVO
    flow_name=request.flow_name                 # 🆕 NOVO
)
```

---

## 📚 Exemplos de Uso

### Exemplo 1: Gerar Flow SEM Salvar (comportamento antigo)

**Request:**
```bash
POST /api/v1/ai-assistant/generate-flow
Content-Type: application/json
Authorization: Bearer <token>

{
  "description": "Criar um flow de qualificação de leads para imobiliária. Perguntar nome, telefone, tipo de imóvel desejado e orçamento disponível.",
  "industry": "real_estate",
  "language": "pt-BR",
  "chatbot_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response:**
```json
{
  "saved_to_database": false,
  "status": "success",
  "flow_data": {
    "name": "Qualificador de Leads Imobiliários",
    "nodes": [
      {
        "id": "node_1",
        "type": "start",
        "position": {"x": 250, "y": 50},
        "data": {"label": "Início"}
      },
      {
        "id": "node_2",
        "type": "message",
        "position": {"x": 250, "y": 150},
        "data": {
          "message": "Olá! Vou te ajudar a encontrar o imóvel ideal. Qual seu nome?"
        }
      }
      // ... mais nós
    ],
    "edges": [
      {"source": "node_1", "target": "node_2"}
    ]
  }
}
```

➡️ **Flow NÃO é salvo** - usuário recebe apenas o JSON

---

### Exemplo 2: Gerar Flow E SALVAR (novo comportamento) ✨

**Request:**
```bash
POST /api/v1/ai-assistant/generate-flow
Content-Type: application/json
Authorization: Bearer <token>

{
  "description": "Criar um flow de qualificação de leads para imobiliária. Perguntar nome, telefone, tipo de imóvel desejado e orçamento disponível.",
  "industry": "real_estate",
  "language": "pt-BR",
  "chatbot_id": "550e8400-e29b-41d4-a716-446655440000",
  "save_to_database": true,
  "flow_name": "Qualificador de Leads - Imobiliária XYZ"
}
```

**Response:**
```json
{
  "flow_id": "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d",
  "flow_name": "Qualificador de Leads - Imobiliária XYZ",
  "saved_to_database": true,
  "status": "success",
  "flow_data": {
    "name": "Qualificador de Leads Imobiliários",
    "nodes": [...],
    "edges": [...]
  }
}
```

➡️ **Flow JÁ ESTÁ SALVO no banco!**

✅ Pode ser usado imediatamente no chatbot  
✅ Aparece em `GET /api/v1/chatbots/{chatbot_id}/flows`  
✅ Pode ser editado via `PUT /api/v1/flows/{flow_id}`

---

### Exemplo 3: Gerar com Nome Automático

**Request:**
```bash
{
  "description": "Flow de vendas para e-commerce de moda. Mostrar catálogo, adicionar ao carrinho, processar pagamento.",
  "chatbot_id": "uuid...",
  "save_to_database": true
  // ⚠️ SEM flow_name → será gerado automaticamente
}
```

**Response:**
```json
{
  "flow_id": "...",
  "flow_name": "Flow De Vendas Para E-Commerce - Pt-Br",  // ← Auto-gerado
  "saved_to_database": true,
  "status": "success",
  "flow_data": {...}
}
```

---

## 🔄 Fluxo de Execução

```
┌────────────────────────────────────────────────────────────┐
│  POST /api/v1/ai-assistant/generate-flow                   │
│  {                                                         │
│    "description": "...",                                   │
│    "chatbot_id": "uuid",                                   │
│    "save_to_database": true   ← ATIVA SALVAMENTO          │
│  }                                                         │
└────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────────┐
│  FlowGeneratorService.generate_flow_from_description()     │
│                                                            │
│  1. Busca configurações de IA (OpenAI/Anthropic/Gemini)   │
│  2. Monta prompts (system + user)                         │
│  3. Chama API de IA                                       │
│  4. Parseia resposta JSON                                 │
└────────────────────────────────────────────────────────────┘
                           │
                           ▼
              ┌──────────────────────┐
              │ save_to_database?    │
              └──────────────────────┘
                    │            │
                    NO           YES
                    │            │
                    ▼            ▼
          ┌─────────────┐  ┌────────────────────────┐
          │ Retorna     │  │ Salva no Banco:        │
          │ flow_data   │  │                        │
          │ apenas      │  │ 1. Verifica chatbot    │
          └─────────────┘  │ 2. Gera/usa flow_name  │
                           │ 3. Cria FlowCreate     │
                           │ 4. FlowService.create  │
                           │ 5. Retorna flow_id     │
                           └────────────────────────┘
                                      │
                                      ▼
                           ┌────────────────────────┐
                           │ Response:              │
                           │ - flow_id (UUID)       │
                           │ - flow_name            │
                           │ - saved_to_database: T │
                           │ - flow_data (JSON)     │
                           └────────────────────────┘
```

---

## ✅ Benefícios

1. **Produtividade** - Flow gerado já está pronto para uso
2. **Experiência** - Menos passos manuais (não precisa copiar/colar JSON)
3. **Consistência** - Usa `FlowService.create_flow()` (aplica todas as validações)
4. **Multi-tenancy** - Garante `organization_id` correto
5. **Flexibilidade** - Pode escolher salvar ou não (backward compatible)

---

## 🔒 Segurança & Validações

✅ **Multi-tenancy**: Verifica se `chatbot` pertence à `organization_id`  
✅ **RBAC**: Usa `get_current_user` (qualquer role autenticado)  
✅ **Validação**: `FlowService.create_flow()` aplica todas as regras de negócio  
✅ **Error Handling**: Se salvamento falha, retorna flow_data sem erro  
✅ **Soft Delete**: Flow criado com `deleted_at = None`

---

## 🧪 Como Testar

### 1. Teste Manual via cURL

```bash
# 1. Login para obter token
curl -X POST http://localhost:8002/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@pytake.com",
    "password": "senha123"
  }'

# Salvar token retornado
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# 2. Listar chatbots para pegar ID
curl -X GET http://localhost:8002/api/v1/chatbots \
  -H "Authorization: Bearer $TOKEN"

# Salvar chatbot_id
CHATBOT_ID="550e8400-e29b-41d4-a716-446655440000"

# 3. Gerar flow COM salvamento automático
curl -X POST http://localhost:8002/api/v1/ai-assistant/generate-flow \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Criar flow de boas-vindas simples. Cumprimentar o usuário, perguntar o nome dele e agradecer.",
    "chatbot_id": "'$CHATBOT_ID'",
    "save_to_database": true,
    "flow_name": "Flow de Boas-Vindas Gerado por IA"
  }' | jq '.'

# 4. Verificar se flow foi criado
# Copiar flow_id da resposta anterior
FLOW_ID="a1b2c3d4-..."

curl -X GET http://localhost:8002/api/v1/flows/$FLOW_ID \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

### 2. Teste via Swagger UI

1. Acessar: http://localhost:8002/api/v1/docs
2. Fazer login via `/auth/login`
3. Clicar em "Authorize" e colar token
4. Navegar até `POST /ai-assistant/generate-flow`
5. Testar com:
```json
{
  "description": "Flow de vendas para loja de roupas",
  "chatbot_id": "<uuid-do-seu-chatbot>",
  "save_to_database": true,
  "flow_name": "Vendas Loja de Roupas"
}
```

---

## 🐛 Troubleshooting

### Erro: "chatbot_id is required"
**Causa**: `save_to_database=true` mas sem `chatbot_id`  
**Solução**: Incluir `chatbot_id` na request

### Flow gerado mas não salvo (saved_to_database: false)
**Causas possíveis**:
- Chatbot não existe
- Chatbot pertence a outra organização
- Erro ao salvar (ver logs: `docker logs pytake-backend-dev`)

**Solução**: Verificar `chatbot_id` e logs do backend

### Nome do flow estranho
**Causa**: Nome auto-gerado quando `flow_name` não fornecido  
**Solução**: Sempre passar `flow_name` customizado

---

## 📊 Dados Técnicos

| Métrica | Valor |
|---------|-------|
| Arquivos modificados | 3 |
| Linhas adicionadas | ~80 |
| Backward compatible | ✅ Sim (`save_to_database` default=false) |
| Breaking changes | ❌ Nenhum |
| Testes necessários | Manual (pytest em breve) |
| Impacto performance | Mínimo (1 INSERT extra) |

---

## 🚀 Próximos Passos (Futuro)

- [ ] Testes automatizados (pytest)
- [ ] Suporte a clarification questions com salvamento
- [ ] Histórico de flows gerados por IA
- [ ] Analytics (quantos flows gerados por org)
- [ ] Rate limiting (prevenir abuso de API de IA)
- [ ] Custo tracking (quanto gastou em API calls)

---

## 📝 Commits Relacionados

```
feat: AI flow generation with auto-save to database | Author: Kayo Carvalho Fernandes

- Added save_to_database and flow_name fields to GenerateFlowRequest
- Added flow_id, flow_name, saved_to_database to GenerateFlowResponse  
- Implemented auto-save logic in FlowGeneratorService
- Updated endpoint to pass new parameters
- Updated API documentation with examples
```

---

**Documentação gerada em**: 2026-01-05  
**Autor**: Kayo Carvalho Fernandes
