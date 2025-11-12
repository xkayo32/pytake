# 🐛 Análise de Erros e Soluções Aplicadas

## Problemas Identificados

### 1. ❌ Erro 500 no Endpoint de Transfer de Conversa
**Localização:** `POST /api/v1/conversations/{id}/transfer`

**Causa Raiz:**
- Campo incorreto na atualização do banco de dados
- A função `transfer_to_department()` em `conversation_service.py` linha 443 estava tentando atualizar `"assigned_department_id"` mas o modelo `Conversation` usa `"department_id"`
- Erro SQLAlchemy: `Unconsumed column names: assigned_department_id`

**Solução Aplicada:**
```python
# Arquivo: backend/app/services/conversation_service.py (linha 443)
# ANTES:
update_data = {
    "assigned_department_id": department_id,  # ❌ Campo não existe
    ...
}

# DEPOIS:
update_data = {
    "department_id": department_id,  # ✅ Nome correto do campo
    ...
}
```

**Status:** ✅ Resolvido

---

### 2. ⚠️ WebSocket Conectando Sem Token de Acesso
**Localização:** 
- `frontend/src/app/agent/conversations/[id]/page.tsx` (linha 92)
- `frontend/src/app/admin/conversations/[id]/page.tsx` (linha 168)

**Problema:**
- Código tentava acessar `useAuthStore.getState().accessToken` que não existe
- O atributo `accessToken` não está definido no estado do auth store
- Resultado: Warning `[WebSocket] No access token available` repetidamente

**Solução Aplicada:**
```typescript
// ANTES:
const accessToken = useAuthStore.getState().accessToken;

// DEPOIS:
const accessToken = typeof window !== 'undefined' 
  ? localStorage.getItem('access_token')
  : null;
```

**Benefício:** Garante que o token seja lido do localStorage onde realmente está armazenado

**Status:** ✅ Resolvido

---

### 3. 🎯 Sistema de Notificação Usando alert()
**Localização:** Múltiplos arquivos frontend

**Problema:**
- Uso indiscriminado de `alert()` nativo do navegador
- Não oferece boa UX (bloqueante, pouco flexível, sem estilo)
- Arquivos afetados:
  - `frontend/src/app/chatbots/page.tsx` (7 ocorrências)
  - `frontend/src/app/analytics/page.tsx` (3 ocorrências)
  - `frontend/src/app/agent/conversations/[id]/page.tsx` (1 ocorrência)
  - `frontend/src/components/admin/conversations/QuickActions.tsx` (2 ocorrências)

**Solução Aplicada:**
Substituição de todos os `alert()` por `toast` usando o hook `useToast()`:

```typescript
// ANTES:
alert('Erro ao atualizar chatbot');

// DEPOIS:
toast.error('Erro ao atualizar chatbot');

// Para avisos informativos:
toast.info('Funcionalidade em desenvolvimento');

// Para sucessos:
toast.success('Operação realizada com sucesso');

// Para avisos:
toast.warning('Ação requer confirmação');
```

**Importação necessária:**
```typescript
import { useToast } from '@/store/notificationStore';
```

**Status:** ✅ Resolvido (13 ocorrências substituídas)

---

## 4. 🔧 Tratamento Genérico de Erros de API

**Novo Utilitário Criado:** `frontend/src/lib/errorHandler.ts`

**Funções Implementadas:**

### `extractErrorMessage(error, defaultMessage)`
Extrai mensagens de erro de vários formatos de resposta API:
```typescript
const message = extractErrorMessage(error, 'Erro padrão');
```

### `handleApiError(error, defaultMessage)`
Cria notificações toast automáticas baseadas no tipo de erro:
```typescript
try {
  await apiCall();
} catch (error) {
  handleApiError(error, 'Erro ao salvar dados');
  // Mostra toast apropriado automaticamente (401, 403, 404, 500, etc)
}
```

### `withErrorHandling(asyncFn, errorMessage)`
Wrapper para operações assíncronas com tratamento automático:
```typescript
const data = await withErrorHandling(
  () => apiCall(),
  'Erro ao carregar dados'
);
```

**Status:** ✅ Implementado e pronto para uso

---

## 📊 Resumo das Alterações

| Arquivo | Alterações | Status |
|---------|-----------|--------|
| `backend/app/services/conversation_service.py` | Fix: `assigned_department_id` → `department_id` | ✅ |
| `frontend/src/app/agent/conversations/[id]/page.tsx` | Fix WebSocket + Add useToast | ✅ |
| `frontend/src/app/admin/conversations/[id]/page.tsx` | Fix WebSocket + Add toast | ✅ |
| `frontend/src/app/chatbots/page.tsx` | Add useToast + Replace 7 alerts | ✅ |
| `frontend/src/app/analytics/page.tsx` | Add useToast + Replace 3 alerts | ✅ |
| `frontend/src/components/admin/conversations/QuickActions.tsx` | Add useToast + Replace 2 alerts | ✅ |
| `frontend/src/lib/errorHandler.ts` | New file com utilities | ✅ |

---

## 🧪 Como Testar

### Teste 1: Transfer de Conversa
1. Abrir conversa no admin
2. Clicar em "Encaminhar"
3. Selecionar departamento e clique em "Encaminhar"
4. **Esperado:** Conversa transferida sem erro 500
5. **Notificação:** Toast de sucesso (após implementação)

### Teste 2: WebSocket Connection
1. Abrir console do browser (DevTools)
2. Abrir página de conversa (agent ou admin)
3. **Esperado:** Sem warnings `[WebSocket] No access token available`
4. **Esperado:** WebSocket conecta corretamente

### Teste 3: Notificações
1. Em qualquer página com actions
2. Disparar um erro (ex: atualizar/deletar algo)
3. **Esperado:** Toast notification aparece em vez de alert

---

## 📝 Próximas Ações Recomendadas

1. **Converter mais catches para toast:**
   - Páginas de contatos, campaigns, etc
   - Usar o novo `errorHandler.ts` como padrão

2. **Implementar retry automático:**
   - Especialmente para WebSocket
   - Backoff exponencial para reconexões

3. **Adicionar loading states:**
   - Desabilitar botões durante operações
   - Mostrar spinners em listas

4. **Validação de token antes de WebSocket:**
   - Implementar refresh automático de token
   - Retry de conexão se token expirar

---

## 📚 Referências

- **Toast Store:** `frontend/src/store/notificationStore.ts`
- **Toast Component:** `frontend/src/components/ui/Toast.tsx`
- **Error Handler:** `frontend/src/lib/errorHandler.ts` (novo)
- **API Client:** `frontend/src/lib/api.ts`

