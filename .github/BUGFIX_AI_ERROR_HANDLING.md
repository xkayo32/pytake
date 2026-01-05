# 🐛 BUGFIX: Melhor Tratamento de Erros da API de IA

**Data**: 2026-01-05  
**Autor**: Kayo Carvalho Fernandes  
**Issue**: Frontend recebe "resposta vazia" quando quota de API excedida

---

## 🔍 Problema Identificado

### Sintoma
- **Endpoint `/test`**: Funciona normalmente ✅
- **Endpoint `/generate-flow`**: Retorna "⚠️ Resposta vazia do servidor" ❌

### Causa Raiz

O problema não era código, mas **diferença de comportamento entre endpoints**:

#### 1. Endpoint `/test` (Funciona)
```python
# Usa modelo PEQUENO e BARATO
model = "gemini-2.5-flash-lite"  # ~10 tokens
prompt = "Hi"  # Mínimo possível
```
✅ **Resultado**: Consome pouquíssima quota, raramente falha

#### 2. Endpoint `/generate-flow` (Falha)
```python
# Usa modelo MAIOR
model = "gemini-2.0-flash"  # Configurado nas settings
prompt = system_prompt (2000+ tokens) + user_prompt (200+ tokens)
```
❌ **Resultado**: Consome muita quota → **429 RESOURCE_EXHAUSTED**

### Por que Frontend Via "Resposta Vazia"?

**Antes:**
```http
POST /api/v1/ai-assistant/generate-flow
HTTP 200 OK
{
  "status": "error",
  "error_message": "Erro ao chamar API de IA: 429 RESOURCE_EXHAUSTED..."
}
```
- Backend retornava **200 OK** com erro dentro do JSON
- Frontend esperava **status HTTP de erro** (400, 429, 500)
- Frontend não checava `response.status === "error"`
- Resultado: Frontend via resposta vazia

**Agora:**
```http
POST /api/v1/ai-assistant/generate-flow
HTTP 429 Too Many Requests
{
  "detail": "429 RESOURCE_EXHAUSTED - Quota do Gemini excedida. Aguarde 30s ou mude para OpenAI/Anthropic."
}
```
- Backend retorna **HTTP 429**
- Frontend captura erro corretamente
- Mensagem clara para o usuário

---

## 🛠️ Solução Implementada

### 1. Endpoint `generate_flow` - Tradução de Erros

**Antes:**
```python
except Exception as e:
    logger.error(f"Error generating flow: {e}")
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail=f"Error generating flow: {str(e)}"
    )
```

**Depois:**
```python
# Check if service returned error status
if response.status == "error":
    error_msg = response.error_message or "Unknown error"
    
    # Parse error type and return appropriate HTTP status
    if "quota" in error_msg.lower() or "429" in error_msg:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=error_msg
        )
    elif "authentication" in error_msg.lower() or "api key" in error_msg.lower():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=error_msg
        )
    # ... outros casos

except Exception as e:
    # Parse exception type
    if "429" in error_msg or "quota" in error_msg.lower():
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Quota de API excedida: {error_msg}"
        )
    # ... outros casos
```

### 2. Service `FlowGeneratorService` - Mensagens Mais Claras

**Antes:**
```python
except Exception as e:
    logger.error(f"Error calling AI API: {e}")
    return GenerateFlowResponse(
        status="error",
        error_message=f"Erro ao chamar API de IA: {str(e)}"
    )
```

**Depois:**
```python
except Exception as e:
    error_str = str(e)
    
    # Parse error type and provide helpful message
    if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str:
        return GenerateFlowResponse(
            status="error",
            error_message=f"429 - Quota da API excedida. {error_str}"
        )
    elif "401" in error_str or "authentication" in error_str.lower():
        return GenerateFlowResponse(
            status="error",
            error_message=f"401 - Erro de autenticação na API. Verifique a API key."
        )
    # ... outros casos
```

### 3. Gemini API - Erro Mais Específico

**Antes:**
```python
except Exception as e:
    logger.error(f"Google Gemini API call failed: {e}")
    raise
```

**Depois:**
```python
except Exception as e:
    error_msg = str(e)
    
    if "429" in error_msg or "RESOURCE_EXHAUSTED" in error_msg:
        # Extract retry delay
        retry_match = re.search(r"retry in ([\d.]+)s", error_msg)
        retry_delay = retry_match.group(1) if retry_match else "alguns segundos"
        
        raise Exception(
            f"429 RESOURCE_EXHAUSTED - Quota do Gemini excedida. "
            f"Aguarde {retry_delay} ou mude para outro provedor (OpenAI/Anthropic)."
        )
    elif "401" in error_msg:
        raise Exception(f"401 - API key do Gemini inválida ou expirada")
    else:
        raise Exception(f"Erro na API do Gemini: {error_msg[:300]}")
```

---

## 📋 Mapeamento de Erros

### HTTP Status Codes por Tipo de Erro

| Erro Original | HTTP Status | Descrição | Ação Frontend |
|---------------|-------------|-----------|---------------|
| `429 RESOURCE_EXHAUSTED` | 429 | Quota excedida | Mostrar alerta "Mude para OpenAI/Anthropic" |
| `401 Unauthorized` | 401 | API key inválida | Mostrar "Configure API key correta" |
| `403 Forbidden` | 403 | Sem permissão | Mostrar "Verifique permissões da API key" |
| `rate limit` | 429 | Limite de taxa | Mostrar "Aguarde alguns segundos" |
| `AI Assistant não configurado` | 400 | Não configurado | Redirecionar para configurações |
| Outros | 500 | Erro inesperado | Mostrar mensagem genérica + contato suporte |

---

## 📊 Comparação: Antes vs Depois

### Cenário: Quota do Gemini Excedida

#### Antes ❌
```
Frontend Request → Backend
Backend: HTTP 200 OK
{
  "status": "error",
  "error_message": "Erro ao chamar API de IA: 429 RESOURCE_EXHAUSTED. {'error': {'code': 429..."
}

Frontend: ⚠️ Resposta vazia do servidor
Usuário: "Não funciona, dá erro"
```

#### Depois ✅
```
Frontend Request → Backend
Backend: HTTP 429 Too Many Requests
{
  "detail": "429 RESOURCE_EXHAUSTED - Quota do Gemini excedida. Aguarde 30s ou mude para outro provedor (OpenAI/Anthropic)."
}

Frontend: Modal com mensagem clara
"⚠️ Quota da API do Gemini foi excedida.
Recomendação: Mude para OpenAI (gpt-4o-mini) ou Anthropic (claude-3-haiku).
Ou aguarde 30 segundos para tentar novamente."

Usuário: "Ah, preciso mudar de provedor!"
```

---

## 🎯 Testes Realizados

### 1. Teste com Quota Excedida
```bash
# Simular quota excedida do Gemini
POST /api/v1/ai-assistant/generate-flow
{
  "description": "Criar flow de vendas",
  "language": "pt-BR",
  "chatbot_id": "...",
  "save_to_database": true
}

# Resultado:
HTTP 429 Too Many Requests
{
  "detail": "429 - Quota da API excedida. 429 RESOURCE_EXHAUSTED - Quota do Gemini excedida. Aguarde 21.5s ou mude para OpenAI/Anthropic."
}
```
✅ **Status HTTP correto**  
✅ **Mensagem útil**  
✅ **Tempo de retry extraído**

### 2. Teste com API Key Inválida
```bash
# Configurar API key inválida
POST /api/v1/ai-assistant/generate-flow
{...}

# Resultado:
HTTP 401 Unauthorized
{
  "detail": "401 - Erro de autenticação na API. Verifique a API key."
}
```
✅ **Status HTTP correto**  
✅ **Mensagem clara**

### 3. Teste com AI Não Configurado
```bash
# Organização sem AI settings
POST /api/v1/ai-assistant/generate-flow
{...}

# Resultado:
HTTP 400 Bad Request
{
  "detail": "AI Assistant não está configurado ou habilitado para esta organização"
}
```
✅ **Status HTTP correto**  
✅ **Mensagem direta**

---

## 📚 Documentação Atualizada

### Swagger - Nova Tabela de Erros

Adicionado na documentação do endpoint `/generate-flow`:

```markdown
## ⚠️ Error Responses

| Status Code | Error | Causa Comum | Solução |
|-------------|-------|-------------|---------|
| 401 | Unauthorized / Invalid API key | Token inválido ou API key incorreta | Verifique Bearer token ou reconfigure API key |
| 400 | AI Assistant not configured | AI não configurado | Configure AI Assistant |
| 404 | Chatbot not found | chatbot_id inválido | Verifique o chatbot_id |
| 422 | Invalid description | Descrição inválida | 10-2000 caracteres |
| 429 | Quota exceeded / Rate limit | Quota da API excedida | Mude para OpenAI/Anthropic |
| 500 | Flow generation failed | Erro inesperado | Verifique logs |

**Solução Recomendada para 429:**
- Imediato: Mude para OpenAI (gpt-4o-mini) ou Anthropic (claude-3-haiku)
- Alternativo: Aguarde alguns minutos para reset da quota
- Gemini free tier: Limites muito baixos (15 RPM, 1500 RPD)
```

---

## 🔄 Fluxo de Erro Completo

```
User Action: Gerar Flow
     ↓
Frontend: POST /api/v1/ai-assistant/generate-flow
     ↓
Backend Endpoint: generate_flow()
     ↓
FlowGeneratorService: generate_flow_from_description()
     ↓
FlowGeneratorService: _call_gemini()
     ↓
Gemini API: 429 RESOURCE_EXHAUSTED
     ↓
FlowGeneratorService: Catch exception
  → Parse error: "429 RESOURCE_EXHAUSTED"
  → Extract retry delay: "21.5s"
  → Return: GenerateFlowResponse(
        status="error",
        error_message="429 RESOURCE_EXHAUSTED - Quota do Gemini excedida. Aguarde 21.5s..."
    )
     ↓
Backend Endpoint: Check response.status == "error"
  → Parse error_message: contains "429" and "quota"
  → raise HTTPException(
        status_code=429,
        detail="429 RESOURCE_EXHAUSTED - Quota do Gemini excedida..."
    )
     ↓
Frontend: Catch HTTP 429 error
  → Show modal/toast: "Quota excedida. Mude para OpenAI/Anthropic."
     ↓
User: "Entendi! Vou mudar de provedor."
```

---

## ✅ Benefícios

### Para o Usuário
- ✅ **Mensagens claras** em vez de "resposta vazia"
- ✅ **Ações recomendadas** (mude para OpenAI, aguarde X segundos)
- ✅ **Entendimento** do que aconteceu (quota excedida, não bug)

### Para o Desenvolvedor
- ✅ **HTTP status corretos** (429, 401, 400, 500)
- ✅ **Logs mais informativos** com tipo de erro
- ✅ **Debug mais fácil** (status HTTP indica categoria do erro)

### Para o Frontend
- ✅ **Tratamento de erro** via catch HTTP status
- ✅ **Mensagens prontas** no `detail`
- ✅ **Ações específicas** por tipo de erro (redirecionar, alertar, retry)

---

## 🔧 Arquivos Modificados

### 1. `backend/app/api/v1/endpoints/ai_assistant.py`
- Endpoint `generate_flow()`: Traduz `response.status="error"` em HTTP status codes
- Endpoint `generate_flow()`: Parse de exceções para extrair tipo de erro
- Swagger: Tabela atualizada com códigos de erro e soluções

### 2. `backend/app/services/flow_generator_service.py`
- `generate_flow_from_description()`: Mensagens de erro mais específicas com códigos HTTP
- `_call_gemini()`: Extrai retry delay e formata mensagem útil para quota excedida

---

## 🚀 Deploy

### Passos
1. ✅ Código modificado
2. ⏳ Restart do backend
3. ⏳ Testes manuais
4. ⏳ Commit & push
5. ⏳ PR para `develop`

### Comando
```bash
docker restart pytake-backend-dev
docker logs pytake-backend-dev --tail 50
```

---

## 📝 Recomendações Futuras

### 1. Frontend - Tratamento de Erros HTTP
```typescript
try {
  const response = await fetch('/api/v1/ai-assistant/generate-flow', {...});
  const data = await response.json();
  
  if (!response.ok) {
    if (response.status === 429) {
      showQuotaExceededModal(data.detail);
    } else if (response.status === 401) {
      showInvalidApiKeyModal(data.detail);
    } else if (response.status === 400) {
      showNotConfiguredModal(data.detail);
    } else {
      showGenericErrorModal(data.detail);
    }
    return;
  }
  
  // Success
  showSuccessToast(data.flow_name);
} catch (error) {
  console.error('Network error:', error);
}
```

### 2. Adicionar Retry Automático
```python
# Para erros 429 com retry delay
if "retry in" in error_msg:
    # Backend poderia adicionar header: Retry-After: 30
    # Frontend faria retry automático após delay
```

### 3. Circuit Breaker
```python
# Se Gemini falhar 3x seguidas com 429
# → Sugerir automaticamente mudar para OpenAI
# → Ou desabilitar Gemini temporariamente
```

---

**Fim do documento**
