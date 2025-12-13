# 📢 Comunicado ao Time de Frontend

## ✅ Nova Funcionalidade Disponível: Filtro de Conversas por Chatbot

**De:** Backend Team  
**Para:** Frontend Team  
**Data:** 13 de dezembro de 2025  
**Status:** ✅ Pronto para Integração  

---

## 🎯 O QUE MUDOU?

O endpoint `GET /api/v1/conversations/` agora aceita um novo parâmetro:

```
?active_chatbot_id={uuid}
```

Isso permite filtrar conversas por um **chatbot específico** diretamente no backend, melhorando performance e isolamento de dados.

---

## 🚀 COMO USAR (Rápido)

### Antes (todos os dados)
```typescript
// Carrega TODAS as conversas da organização
const conversations = await api.get('/conversations/');
```

### Depois (filtrado por chatbot)
```typescript
// Carrega apenas conversas de um chatbot específico
const conversations = await api.get('/conversations/?active_chatbot_id=f9651dd7-87fd-40c0-9c5b-599b0dfe9ea8');
```

---

## 📚 DOCUMENTAÇÃO COMPLETA

**Arquivo:** `docs/FRONTEND_INTEGRATION_CONVERSATIONS_FILTER.md`

Contém:
- ✅ Exemplos de código TypeScript
- ✅ Casos de uso reais (dashboard, relatório, seletor)
- ✅ Troubleshooting
- ✅ Checklist de integração
- ✅ Referências técnicas

---

## 🔄 INTEGRAÇÃO RECOMENDADA

### 1. Atualizar seu serviço
```typescript
// conversationsService.getConversations() 
// Adicionar parâmetro: chatbotId?: string
```

### 2. Usar em componentes
```typescript
const conversations = await conversationsService.getConversations(
  chatbotId,  // ← NOVO
  { skip: 0, limit: 100 }
);
```

### 3. Testar
```bash
# Testar manualmente
curl -X GET "http://localhost:8002/api/v1/conversations/?active_chatbot_id=UUID" \
  -H "Authorization: Bearer TOKEN"
```

---

## ⏱️ Tempo de Integração

- **Leitura da doc:** 10 min
- **Atualizar serviço:** 15 min
- **Testar e validar:** 20 min
- **Total:** ~45 min

---

## 🧪 Dados para Teste

Use um desses `chatbot_id`:

```
f9651dd7-87fd-40c0-9c5b-599b0dfe9ea8  (Suporte N1)
7908b8b9-18a7-4fc3-b34a-e86f9775f8b8  (Build)
405d9522-e557-408c-9f2f-6f053201bcf8  (Suporte)
3d72efe6-e2de-41e2-9256-ec517cdfcedb  (Kayo)
88aba8ca-2758-4b12-952a-250f7f2ce087  (Test Chatbot)
```

Credenciais para testar:
```
Email: admin@pytake.net
Password: nYVUJy9w5hYQGh52CSpM0g
```

---

## ❓ DÚVIDAS FREQUENTES

### P: É obrigatório passar `active_chatbot_id`?
**R:** Não, é opcional. Sem passar, retorna todas as conversas (comportamento antigo).

### P: Funciona com outros filtros?
**R:** Sim! Combina com `status`, `assigned_to_me`, `department_id`, `limit`, etc.

### P: Qual o impacto no meu código?
**R:** Mínimo! Basta adicionar um parâmetro opcional ao seu serviço.

### P: Preciso fazer alterações no banco de dados?
**R:** Não! O campo já existe no modelo (`active_chatbot_id`).

---

## 📋 PRÓXIMOS PASSOS

### Hoje/Amanhã
- [ ] Ler `FRONTEND_INTEGRATION_CONVERSATIONS_FILTER.md`
- [ ] Testar com curl/Postman
- [ ] Atualizar seu serviço

### Esta Semana
- [ ] Integrar em componentes principais
- [ ] Testes em dev/staging
- [ ] Validação com product

### Antes do Deploy
- [ ] Testes de aceitação
- [ ] Performance check
- [ ] Documentação do código

---

## 🔗 Links Rápidos

| Recurso | Link |
|---------|------|
| **Doc Completa** | `docs/FRONTEND_INTEGRATION_CONVERSATIONS_FILTER.md` |
| **API Docs (Swagger)** | `http://localhost:8002/api/v1/docs` |
| **Código Backend** | `backend/app/api/v1/endpoints/conversations.py` |
| **Modelo** | `backend/app/models/conversation.py` |

---

## 💬 Contato

**Dúvidas?** Entre em contato com:
- **Backend Lead:** Kayo Carvalho Fernandes
- **Canal:** Slack / GitHub Issues
- **Prioridade:** Media (implementação pronta, apenas integração)

---

**Boa integração! 🚀**
