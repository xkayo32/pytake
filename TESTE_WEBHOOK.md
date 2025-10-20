# ✅ Webhook Aprovado no Meta - Guia de Testes

**Data:** 20/10/2025
**Status:** ✅ Webhook APROVADO e ATIVO no Meta
**URL:** https://app.pytake.net/api/v1/whatsapp/webhook
**Token:** pytake_ee3e8ebd04df357b887aa4790b3930f5
**Número:** +55 61 98128-7787

---

## 🎉 Configuração Completa!

### ✅ Checklist de Configuração

- [x] Certificados SSL obtidos (Let's Encrypt)
- [x] HTTPS configurado e funcionando
- [x] Webhook testado localmente
- [x] Webhook configurado no Meta
- [x] Webhook APROVADO pelo Meta
- [x] Eventos assinados (messages, message_status)
- [ ] Teste de recebimento de mensagens (próximo passo)

---

## 🧪 Testar Recebimento de Mensagens

### Passo 1: Abrir Logs em Tempo Real

No terminal do servidor, execute:

```bash
# Ver logs do backend em tempo real
podman logs pytake-backend -f
```

**OU** se preferir ver apenas logs relacionados a webhook:

```bash
# Filtrar logs de webhook
podman logs pytake-backend -f | grep -i "webhook\|whatsapp\|message"
```

Deixe esse terminal aberto para monitorar as mensagens que chegarem.

### Passo 2: Enviar Mensagem de Teste

1. **Abra o WhatsApp no seu celular**
2. **Envie uma mensagem para:** +55 61 98128-7787
3. **Mensagem sugerida:** "Olá, teste de webhook"

### Passo 3: Verificar Logs

No terminal que você abriu no Passo 1, você deve ver algo como:

```
INFO:     POST /api/v1/whatsapp/webhook
INFO:     Webhook recebido do número: +5561981234567
INFO:     Tipo de mensagem: text
INFO:     Conteúdo: "Olá, teste de webhook"
INFO:     Status: 200 OK
```

**Se você vir isso:** ✅ Webhook está funcionando perfeitamente!

---

## 📊 O Que Esperar

### Quando uma Mensagem É Recebida:

1. **Meta envia POST para seu webhook**
   ```
   POST https://app.pytake.net/api/v1/whatsapp/webhook
   ```

2. **PyTake processa a mensagem:**
   - Valida assinatura HMAC
   - Identifica remetente (número do cliente)
   - Extrai conteúdo da mensagem
   - Processa através do chatbot (se configurado)
   - Salva no banco de dados

3. **Você vê nos logs:**
   - Informações da mensagem recebida
   - Processamento do chatbot
   - Resposta enviada (se houver)

### Tipos de Mensagens Suportadas:

- ✅ **Text** - Mensagens de texto simples
- ✅ **Image** - Fotos enviadas pelo cliente
- ✅ **Document** - Documentos (PDF, DOC, etc.)
- ✅ **Audio** - Mensagens de áudio
- ✅ **Video** - Vídeos
- ✅ **Location** - Localização compartilhada
- ✅ **Interactive** - Respostas de botões/listas

---

## 🔍 Comandos Úteis de Monitoramento

### Ver Logs do Backend

```bash
# Últimas 100 linhas
podman logs pytake-backend --tail 100

# Tempo real
podman logs pytake-backend -f

# Filtrar apenas webhooks
podman logs pytake-backend --tail 200 | grep webhook

# Filtrar apenas mensagens recebidas
podman logs pytake-backend -f | grep "message\|texto\|recebida"
```

### Ver Logs do Nginx

```bash
# Ver requisições HTTPS
podman logs pytake-nginx -f

# Filtrar requisições ao webhook
podman logs pytake-nginx | grep "/api/v1/whatsapp/webhook"
```

### Verificar Mensagens no Banco de Dados

```bash
# Ver últimas mensagens recebidas
podman exec pytake-backend python -c "
import asyncio
from app.core.database import AsyncSessionLocal
from app.models.message import Message
from sqlalchemy import select, desc

async def show_messages():
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Message)
            .order_by(desc(Message.created_at))
            .limit(10)
        )
        messages = result.scalars().all()

        if not messages:
            print('❌ Nenhuma mensagem encontrada')
            return

        print('📨 Últimas 10 mensagens recebidas:')
        print('=' * 70)
        for msg in messages:
            print(f'Data: {msg.created_at}')
            print(f'De: {msg.from_number}')
            print(f'Tipo: {msg.message_type}')
            print(f'Conteúdo: {msg.content[:100] if msg.content else \"N/A\"}')
            print('-' * 70)

asyncio.run(show_messages())
"
```

### Verificar Conversas Ativas

```bash
podman exec pytake-backend python -c "
import asyncio
from app.core.database import AsyncSessionLocal
from app.models.conversation import Conversation
from sqlalchemy import select

async def show_conversations():
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Conversation)
            .where(Conversation.status == 'active')
        )
        convs = result.scalars().all()

        print(f'💬 Conversas ativas: {len(convs)}')
        for conv in convs:
            print(f'  - ID: {conv.id}')
            print(f'    Contato: {conv.contact_id}')
            print(f'    Status: {conv.status}')
            print(f'    Criada em: {conv.created_at}')
            print()

asyncio.run(show_conversations())
"
```

---

## 🐛 Troubleshooting

### Não Recebo Mensagens

**1. Verificar se eventos estão assinados no Meta**

- Acesse: https://developers.facebook.com
- Vá em: WhatsApp > Configuração > Webhooks
- Verifique se `messages` está marcado

**2. Verificar logs do Nginx**

```bash
podman logs pytake-nginx --tail 50
```

Se o Meta está enviando requisições, você verá:
```
POST /api/v1/whatsapp/webhook HTTP/2.0
```

**3. Verificar se backend está rodando**

```bash
podman ps | grep backend
```

Deve mostrar: `pytake-backend ... Up`

**4. Testar endpoint manualmente**

```bash
curl -X POST https://app.pytake.net/api/v1/whatsapp/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": "message"}'
```

### Erro: "Signature verification failed"

**Problema:** App Secret não configurado ou incorreto

**Solução:**

1. Obter App Secret no Meta Developers:
   - Configurações > Básico > App Secret

2. Atualizar no banco de dados:
```bash
podman exec pytake-backend python -c "
import asyncio
from app.core.database import AsyncSessionLocal
from app.models.whatsapp_number import WhatsAppNumber
from sqlalchemy import select

async def update_secret():
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(WhatsAppNumber).where(
                WhatsAppNumber.phone_number == '+5561981287787'
            )
        )
        num = result.scalar_one_or_none()

        if num:
            num.app_secret = 'SEU_APP_SECRET_AQUI'
            await db.commit()
            print('✅ App Secret atualizado')
        else:
            print('❌ Número não encontrado')

asyncio.run(update_secret())
"
```

### Mensagens Aparecem nos Logs mas Não no Sistema

**Possíveis causas:**

1. **Contato não existe no banco**
   - O sistema cria automaticamente, mas pode haver erro
   - Verifique: `SELECT * FROM contacts WHERE whatsapp_id = '+5561...';`

2. **Conversa não foi criada**
   - O sistema deve criar automaticamente
   - Verifique: `SELECT * FROM conversations WHERE contact_id = ...;`

3. **Erro ao salvar mensagem**
   - Verifique logs: `podman logs pytake-backend | grep ERROR`

---

## 📈 Próximos Passos

### 1. ✅ Testar Recebimento de Mensagens
Envie uma mensagem e verifique nos logs

### 2. Configurar Chatbot
- Acesse: https://app.pytake.net/admin/chatbots
- Crie um novo chatbot
- Configure fluxo de atendimento
- Vincule ao número WhatsApp

### 3. Testar Envio de Mensagens
```bash
# Testar envio via API
curl -X POST https://app.pytake.net/api/v1/messages/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{
    "to": "+5561987654321",
    "type": "text",
    "text": {
      "body": "Olá! Esta é uma mensagem de teste do PyTake."
    }
  }'
```

### 4. Monitorar Métricas
- Acesse: https://app.pytake.net/admin/analytics
- Veja mensagens recebidas/enviadas
- Monitore taxa de resposta
- Analise horários de pico

### 5. Configurar Agentes
- Acesse: https://app.pytake.net/admin/users
- Adicione agentes de atendimento
- Configure departamentos
- Defina filas de atendimento

---

## 🎯 Comandos Rápidos

### Monitoramento em Tempo Real

```bash
# Terminal 1: Logs do Backend
podman logs pytake-backend -f

# Terminal 2: Logs do Nginx
podman logs pytake-nginx -f

# Terminal 3: Status dos Containers
watch -n 5 'podman ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"'
```

### Reiniciar Serviços

```bash
# Reiniciar apenas backend
podman restart pytake-backend

# Reiniciar nginx
podman restart pytake-nginx

# Reiniciar todos os serviços
podman-compose restart
```

### Backup do Banco de Dados

```bash
# Exportar banco PostgreSQL
podman exec pytake-postgres pg_dump -U pytake pytake > backup_$(date +%Y%m%d_%H%M%S).sql

# Listar backups
ls -lh backup_*.sql
```

---

## 📞 Informações do Webhook

**URL:** https://app.pytake.net/api/v1/whatsapp/webhook
**Método GET:** Verificação do webhook (hub.mode, hub.verify_token, hub.challenge)
**Método POST:** Recebimento de mensagens e eventos

**Headers esperados do Meta:**
- `X-Hub-Signature-256`: Assinatura HMAC SHA256
- `Content-Type`: application/json

**Eventos assinados:**
- `messages` - Mensagens recebidas
- `message_status` - Status de entrega
- `messaging_postbacks` - Respostas de botões

---

## ✅ Status Atual

| Item | Status |
|------|--------|
| SSL/HTTPS | ✅ Configurado |
| Webhook URL | ✅ Acessível |
| Webhook no Meta | ✅ APROVADO |
| Eventos Assinados | ✅ Configurado |
| Backend Rodando | ✅ Ativo |
| Nginx Rodando | ✅ Ativo |
| Banco de Dados | ✅ Ativo |
| Certbot Auto-Renewal | ✅ Ativo |

**Próximo passo:** Enviar mensagem de teste e verificar logs! 🚀

---

**Criado em:** 20/10/2025 às 19:20 BRT
**Webhook aprovado em:** 20/10/2025 às 19:20 BRT
