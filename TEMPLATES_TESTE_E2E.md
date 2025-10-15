# WhatsApp Templates - Guia de Teste End-to-End

**Objetivo**: Validar que o sistema de templates funciona corretamente do início ao fim.

---

## 🎯 CENÁRIOS DE TESTE

### ✅ Teste 1: Listar Templates da Meta API

**Objetivo**: Verificar se o backend consegue buscar templates aprovados.

**Pré-requisito**:
- Número WhatsApp cadastrado (tipo Official API)
- WABA ID configurado
- Pelo menos 1 template aprovado na Meta Business Manager

**Passo a passo**:

1. **Faça login no sistema**
   ```
   http://localhost:3002/login
   Email: admin@pytake.com
   Senha: Admin123
   ```

2. **Obtenha o whatsapp_number_id**
   - Vá para "WhatsApp" → "Números"
   - Copie o ID do número (ex: `a1b2c3d4-...`)

3. **Teste via Postman/cURL**
   ```bash
   curl -X GET "http://localhost:8000/api/v1/whatsapp/{number_id}/templates?status=APPROVED" \
     -H "Authorization: Bearer {seu_access_token}"
   ```

**Resultado esperado**:
```json
{
  "data": [
    {
      "id": "123456",
      "name": "welcome_message",
      "language": "pt_BR",
      "status": "APPROVED",
      "category": "UTILITY",
      "components": [...]
    }
  ]
}
```

**Validação**:
- ✅ Status 200 OK
- ✅ Array com templates
- ✅ Cada template tem: id, name, language, status, components

**Se falhar**:
- Erro 400 "WhatsApp Business Account ID not configured" → Configure WABA ID no número
- Erro 401 → Token expirado, faça login novamente
- Erro 500 → Verifique logs do backend

---

### ✅ Teste 2: Modal de Seleção de Template

**Objetivo**: Verificar se o modal abre e lista templates corretamente.

**Pré-requisito**: Teste 1 passou

**Passo a passo**:

1. **Abra uma conversa qualquer**
   - Vá para "Conversas" → Selecione qualquer conversa

2. **Simule janela expirada** (temporariamente)
   - Abra DevTools (F12) → Console
   - Execute:
     ```javascript
     // Força window_expires_at para o passado
     const now = new Date();
     const past = new Date(now.getTime() - 25 * 60 * 60 * 1000); // 25h atrás
     // Recarregue a página e observe o aviso amarelo
     ```

3. **Clique em "Enviar Template"**
   - Botão roxo aparece ao lado do aviso
   - Modal abre com lista de templates

**Resultado esperado**:
- ✅ Modal abre com título "Selecionar Template"
- ✅ Lista de templates à esquerda
- ✅ Cada template mostra: nome, categoria, linguagem
- ✅ Mensagem "Nenhum template aprovado encontrado" se não houver templates

**Validação**:
- ✅ Modal responsivo (largura máxima 4xl)
- ✅ Templates clicáveis
- ✅ Loading spinner enquanto carrega
- ✅ Botão "X" fecha o modal

**Se falhar**:
- Modal não abre → Verifique console do navegador
- Templates não aparecem → Verifique rede (Network tab) → Endpoint `/templates`
- Erro "Erro ao carregar templates" → Verifique logs do backend

---

### ✅ Teste 3: Seleção e Preview de Template

**Objetivo**: Verificar extração de variáveis e preview em tempo real.

**Pré-requisito**: Modal aberto (Teste 2)

**Passo a passo**:

1. **Selecione um template com variáveis**
   - Clique em um template que tenha {{1}}, {{2}}, etc.

2. **Verifique campos de variáveis**
   - Painel direito mostra "Preview & Variáveis"
   - Para cada {{N}}, deve haver um input "Variável N"

3. **Preencha as variáveis**
   - Exemplo:
     - Variável 1: "João Silva"
     - Variável 2: "PyTake"

4. **Observe o preview**
   - Preview atualiza em tempo real
   - Variáveis substituídas pelos valores digitados

**Resultado esperado**:

Template original:
```
Olá {{1}}! Bem-vindo à {{2}}.
```

Preview após preencher:
```
Olá João Silva! Bem-vindo à PyTake.
```

**Validação**:
- ✅ Extração automática de variáveis (regex `/\{\{(\d+)\}\}/g`)
- ✅ Inputs ordenados (1, 2, 3, ...)
- ✅ Preview mostra HEADER em negrito (*texto*)
- ✅ Preview mostra FOOTER em itálico (_texto_)
- ✅ Placeholders mantidos se campo vazio

**Se falhar**:
- Variáveis não extraídas → Verifique regex em `extractVariables()`
- Preview não atualiza → Verifique `getTemplatePreview()`
- Formatação errada → Verifique componentes HEADER/BODY/FOOTER

---

### ✅ Teste 4: Envio de Template (Sucesso)

**Objetivo**: Enviar template e verificar se mensagem aparece no chat.

**Pré-requisito**: Variáveis preenchidas (Teste 3)

**Passo a passo**:

1. **Clique em "Enviar Template"**
   - Botão roxo no footer do modal

2. **Aguarde envio**
   - Botão mostra "Enviando..."
   - Modal fecha automaticamente

3. **Verifique o chat**
   - Mensagem aparece na lista
   - Tipo: `template`
   - Status: `pending` → `sent` → `delivered`

4. **Verifique o WhatsApp do cliente**
   - Cliente deve receber a mensagem formatada

**Resultado esperado (Frontend)**:
```typescript
// Mensagem adicionada à lista
{
  id: "...",
  message_type: "template",
  direction: "outbound",
  sender_type: "agent",
  content: {
    name: "welcome_message",
    language: "pt_BR",
    components: [...]
  },
  status: "sent"
}
```

**Resultado esperado (Backend)**:
```
[INFO] Sending template message to conversation ...
[INFO] ✅ Message sent successfully. WhatsApp ID: wamid.xxx
[WebSocket] Emitted message:new to conversation ...
```

**Resultado esperado (Meta)**:
```json
{
  "messaging_product": "whatsapp",
  "messages": [{
    "id": "wamid.HBgLNTUxMTk5OTk5OTk5..."
  }]
}
```

**Validação**:
- ✅ Modal fecha após envio
- ✅ Mensagem aparece no chat
- ✅ Status atualiza via WebSocket
- ✅ Cliente recebe no WhatsApp
- ✅ `loadMessages()` chamado após sucesso

**Se falhar**:
- Modal não fecha → Erro no envio, verifique console
- Mensagem não aparece → Verifique callback `onTemplateSent`
- Erro 400 "24-hour window expired" → Janela NÃO está expirada (use template de teste)
- Erro 400 "Template not found" → Nome ou linguagem incorreta

---

### ✅ Teste 5: Validação de Janela de 24h

**Objetivo**: Verificar que backend bloqueia mensagens normais quando janela expirada.

**Passo a passo**:

1. **Abra conversa com janela expirada**
   - `window_expires_at` < agora

2. **Tente enviar mensagem de texto normal**
   - Digite mensagem no input
   - Input deve estar desabilitado
   - Placeholder: "Janela de 24h expirada. Use mensagens template."

3. **Teste forçando via API (Postman)**
   ```bash
   curl -X POST "http://localhost:8000/api/v1/conversations/{id}/messages" \
     -H "Authorization: Bearer {token}" \
     -H "Content-Type: application/json" \
     -d '{
       "message_type": "text",
       "content": {"text": "Teste"}
     }'
   ```

**Resultado esperado**:
```json
{
  "detail": "24-hour window expired. You must use a template message to re-engage."
}
```

**Validação**:
- ✅ Input desabilitado no frontend
- ✅ Backend retorna erro 400
- ✅ Mensagem de erro clara
- ✅ Template permitido mesmo com janela expirada

**Se falhar**:
- Input não desabilitado → Verifique `isWindowExpired` em `page.tsx`
- Backend aceita mensagem → Verifique validação linha 705-720 em `whatsapp_service.py`

---

### ✅ Teste 6: Template sem Variáveis

**Objetivo**: Verificar envio de template que não tem variáveis.

**Exemplo de template**:
```json
{
  "name": "goodbye",
  "components": [{
    "type": "BODY",
    "text": "Obrigado por entrar em contato! Até breve."
  }]
}
```

**Passo a passo**:

1. **Abra modal de templates**
2. **Selecione template sem variáveis**
3. **Verifique painel direito**
   - Não deve mostrar campos de variáveis
   - Preview mostra texto fixo
4. **Envie o template**

**Resultado esperado**:
```json
{
  "message_type": "template",
  "content": {
    "name": "goodbye",
    "language": "pt_BR",
    "components": []  // Array vazio, sem parameters
  }
}
```

**Validação**:
- ✅ Sem inputs de variáveis
- ✅ Preview correto
- ✅ Envio bem-sucedido
- ✅ `components` pode ser array vazio

---

### ✅ Teste 7: Múltiplos Usuários (WebSocket)

**Objetivo**: Verificar que template enviado aparece para todos os agentes.

**Pré-requisito**: WebSocket funcionando

**Passo a passo**:

1. **Abra mesma conversa em 2 navegadores**
   - Navegador 1: Chrome
   - Navegador 2: Modo anônimo ou Firefox

2. **No Navegador 1: Envie template**
3. **No Navegador 2: Observe chat**

**Resultado esperado**:
- ✅ Mensagem aparece instantaneamente no Navegador 2
- ✅ Sem reload necessário
- ✅ Status atualiza em tempo real

**Validação**:
- ✅ WebSocket event `message:new` emitido
- ✅ Ambos navegadores escutando room `conversation:{id}`
- ✅ Latência < 1 segundo

---

## 🐛 TROUBLESHOOTING

### Erro: "Templates are only available for Official API connections"

**Causa**: Número WhatsApp tipo `qrcode` (Evolution API)

**Solução**: Templates só funcionam com Official API (Meta Cloud). Use número com `connection_type='official'`.

---

### Erro: "WhatsApp Business Account ID not configured"

**Causa**: Campo `whatsapp_business_account_id` vazio

**Solução**:
1. Acesse Meta Business Manager
2. WhatsApp → Configurações
3. Copie o WABA ID (ex: `102901234567890`)
4. Configure no número WhatsApp:
   ```sql
   UPDATE whatsapp_numbers
   SET whatsapp_business_account_id = '102901234567890'
   WHERE id = '...';
   ```

---

### Erro: "Invalid parameter count"

**Causa**: Número de variáveis diferente do esperado

**Template tem**: {{1}}, {{2}}, {{3}} (3 variáveis)
**Você enviou**: 2 variáveis

**Solução**: Preencha TODAS as variáveis

---

### Erro: "Template not found"

**Causa**: Template não aprovado ou nome incorreto

**Solução**:
1. Verifique Meta Business Manager → WhatsApp → Modelos de mensagem
2. Confirme status = "Aprovado"
3. Use nome exato (case-sensitive)
4. Linguagem correta (pt_BR, não pt ou pt-BR)

---

## 📊 CHECKLIST COMPLETO

- [ ] **Teste 1**: Listagem de templates (API)
- [ ] **Teste 2**: Modal abre e lista templates
- [ ] **Teste 3**: Seleção e preview de template
- [ ] **Teste 4**: Envio de template com sucesso
- [ ] **Teste 5**: Validação de janela de 24h
- [ ] **Teste 6**: Template sem variáveis
- [ ] **Teste 7**: Múltiplos usuários (WebSocket)

**Critério de Aceitação**: 7/7 testes passam ✅

---

## 🎓 CONHECIMENTO ADQUIRIDO

### Meta Cloud API - Endpoints Usados

1. **Listar templates**:
   ```
   GET https://graph.facebook.com/v18.0/{waba_id}/message_templates
   ```

2. **Enviar template**:
   ```
   POST https://graph.facebook.com/v18.0/{phone_number_id}/messages
   {
     "messaging_product": "whatsapp",
     "to": "5511999999999",
     "type": "template",
     "template": {
       "name": "welcome_message",
       "language": {"code": "pt_BR"},
       "components": [...]
     }
   }
   ```

---

### Regex para Extração de Variáveis

```javascript
const matches = text.match(/\{\{(\d+)\}\}/g);
// Encontra: {{1}}, {{2}}, {{10}}
// Não encontra: {{name}}, {{abc}}
```

---

### Fluxo Completo

```
┌─────────┐      ┌──────────┐      ┌─────────┐      ┌──────┐
│ Cliente │      │ Frontend │      │ Backend │      │ Meta │
└────┬────┘      └────┬─────┘      └────┬────┘      └───┬──┘
     │                │                 │                │
     │  24h window    │                 │                │
     │  expired       │                 │                │
     ├───────────────>│                 │                │
     │                │                 │                │
     │                │ GET /templates  │                │
     │                ├────────────────>│                │
     │                │                 │ GET WABA/temps │
     │                │                 ├───────────────>│
     │                │                 │<───────────────┤
     │                │<────────────────┤                │
     │                │ [templates]     │                │
     │                │                 │                │
     │  [Modal opens] │                 │                │
     │  User selects  │                 │                │
     │  & fills vars  │                 │                │
     │                │                 │                │
     │                │ POST /messages  │                │
     │                ├────────────────>│                │
     │                │ type: template  │                │
     │                │                 │ POST send_temp │
     │                │                 ├───────────────>│
     │                │                 │<───────────────┤
     │                │                 │ wamid.xxx      │
     │                │<────────────────┤                │
     │                │ [message saved] │                │
     │                │                 │                │
     │  WhatsApp msg  │                 │  Meta delivers │
     │<────────────────────────────────────────────────────┤
     │  [Template]    │                 │                │
```

---

**Última atualização**: 2025-10-10
**Autor**: Claude Code
**Status**: Pronto para Teste
