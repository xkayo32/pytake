# WhatsApp Webhook Token - Problema & Solução

## 🔴 Problema Identificado

**Issue:** Ao cadastrar um novo número WhatsApp via `AddWhatsAppNumberModal`, o `webhook_verify_token` é gerado e salvo no banco, mas **não é exibido ao usuário** após o cadastro ser concluído.

**Impacto:** O usuário não consegue copiar o token para configurar no Meta Developers.

### Fluxo Atual (Com Problema)

```
1. ✅ Frontend gera token: generateWebhookVerifyToken() → "pytake_xxxxx"
2. ✅ Backend recebe token no POST /whatsapp/
3. ✅ Backend salva no banco: whatsapp_number.webhook_verify_token = "pytake_xxxxx"
4. ✅ Backend retorna resposta (com token no schema)
5. ❌ Frontend fecha modal e retorna à lista (token fica escondido)
6. ❌ Usuário não consegue copiar/usar o token
```

---

## ✅ Solução Implementada

### A. Criar Modal de Sucesso com Exibição do Token

**Arquivo:** `frontend/src/components/admin/WhatsAppTokenModal.tsx`

Novo modal que exibe após cadastro bem-sucedido:
- Mostra o token gerado
- Botão "Copiar" para clipboard
- Botão "Copiar URL do Webhook"
- Instruções rápidas para configuração no Meta
- Link para documentação

### B. Integrar ao AddWhatsAppNumberModal

**Arquivo:** `frontend/src/components/admin/AddWhatsAppNumberModal.tsx`

Modificações:
1. Adicionar estado `showTokenModal: boolean`
2. Na resposta de sucesso, passar o token recebido do backend
3. Exibir `<WhatsAppTokenModal>` com os dados

### C. Ajustar Endpoint POST para Garantir Token na Resposta

**Arquivo:** `backend/app/api/v1/endpoints/whatsapp.py`

Verificar se o endpoint `POST /whatsapp/` retorna o `webhook_verify_token` na resposta:

```python
@router.post("/", response_model=WhatsAppNumber, status_code=status.HTTP_201_CREATED)
async def create_whatsapp_number(
    data: WhatsAppNumberCreate,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Register a new WhatsApp number"""
    service = WhatsAppService(db)
    return await service.create_number(
        data=data,
        organization_id=current_user.organization_id,
    )
    # Schema WhatsAppNumber já inclui webhook_verify_token ✅
```

---

## 📋 Checklist de Implementação

- [ ] Criar `WhatsAppTokenModal.tsx` com UI para exibir token
- [ ] Integrar modal ao `AddWhatsAppNumberModal.tsx`
- [ ] Testar fluxo: Cadastro → Modal de sucesso → Copiar token
- [ ] Testar no Meta: Usar token copiado para configurar webhook
- [ ] Adicionar feature para "Ver token" na lista de números (ícone 👁️)
- [ ] Documentar no README do usuário

---

## 🔐 Segurança

- ✅ Token gerado com 32 bytes de entropia (256 bits)
- ✅ Armazenado encriptado no banco (se configurado)
- ✅ Exibido apenas ao criador/admin
- ✅ Nunca logado em console ou traces públicas

---

## 📚 Documentação para Usuário

**Como usar o token após cadastro:**

1. ✅ Número registrado com sucesso
2. ✅ Modal exibe o **Webhook Token** e **Webhook URL**
3. 📋 Copie ambos
4. 🔗 Acesse: https://developers.facebook.com → Seu App → WhatsApp → Configuração
5. 📌 Cole nos campos:
   - **Callback URL:** (seu URL do webhook)
   - **Verify Token:** (seu token)
6. ✅ Clique em "Verificar e Salvar"
7. 🎉 Pronto! Webhook configurado

---

**Autor:** Kayo Carvalho Fernandes  
**Data:** 2025-11-19  
**Status:** Em Implementação
