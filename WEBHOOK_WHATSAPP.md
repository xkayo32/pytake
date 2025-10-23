# Configuração de Webhook do WhatsApp (Meta Cloud API)

## Problema

Você está recebendo o erro: **"Não foi possível validar a URL de callback ou o token de verificação"**

## Solução

### 1. Verifique se o Webhook Está Acessível

O webhook do PyTake está em:
```
http://pytake.net/api/v1/whatsapp/webhook
```

**Teste local:**
```bash
curl "http://pytake.net/api/v1/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=SEU_TOKEN&hub.challenge=test123"
```

Deve retornar: `test123` (se o token estiver correto)

### 2. Obtenha o Token de Verificação

Execute no terminal:
```bash
cd /home/administrator/pytake
podman exec pytake-backend python -c "
import asyncio
from app.core.database import AsyncSessionLocal
from app.models.whatsapp_number import WhatsAppNumber
from sqlalchemy import select

async def show_tokens():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(WhatsAppNumber))
        for num in result.scalars():
            print(f'Número: {num.phone_number}')
            print(f'Token: {num.webhook_verify_token}')
            print('-' * 50)

asyncio.run(show_tokens())
"
```

### 3. Configure no Meta Developers

1. Acesse: https://developers.facebook.com
2. Selecione seu App WhatsApp
3. No menu lateral: **WhatsApp** > **Configuração**
4. Na seção **Webhooks**, clique em **Configurar**
5. Preencha:
   - **URL de retorno de chamada:** `http://pytake.net/api/v1/whatsapp/webhook`
   - **Token de verificação:** (copie do comando acima)
6. Clique em **Verificar e Salvar**

### 4. Se o Token Não Existe

Se não houver token no banco, você precisa:

**Opção A: Gerar token manualmente**
```bash
podman exec pytake-backend python -c "
import asyncio
from app.core.database import AsyncSessionLocal
from app.models.whatsapp_number import WhatsAppNumber
from app.core.security import generate_webhook_secret
from sqlalchemy import select
import uuid

async def add_token():
    async with AsyncSessionLocal() as db:
        # Buscar número (ajuste o phone_number se necessário)
        result = await db.execute(
            select(WhatsAppNumber).limit(1)
        )
        num = result.scalar_one_or_none()

        if num:
            # Gerar token
            token = generate_webhook_secret()
            num.webhook_verify_token = token
            await db.commit()

            print('✅ Token gerado com sucesso!')
            print(f'Número: {num.phone_number}')
            print(f'Token: {token}')
        else:
            print('❌ Nenhum número encontrado')

asyncio.run(add_token())
"
```

**Opção B: Criar número via interface**
1. Acesse: http://pytake.net/admin/whatsapp
2. Clique em **"Adicionar Número"**
3. Preencha os dados do Meta Cloud API
4. O token será gerado automaticamente

### 5. Eventos do Webhook (Assinar)

Após verificar o webhook, você precisa assinar os eventos:

No Meta Developers > WhatsApp > Configuração > Campos do webhook:

✅ Marque estes eventos:
- `messages` - Mensagens recebidas
- `message_status` - Status de entrega
- `messaging_postbacks` - Respostas de botões

### 6. Testar Webhook

Envie uma mensagem de teste pelo WhatsApp e verifique os logs:

```bash
# Ver logs do backend
podman logs pytake-backend --tail 50 -f

# Filtrar apenas webhooks
podman logs pytake-backend --tail 100 | grep -i webhook
```

## Troubleshooting

### Erro: "Invalid token"
- Verifique se o token no Meta é exatamente igual ao do banco de dados
- Tokens são case-sensitive

### Erro: "URL not reachable"
- Certifique-se de que pytake.net está acessível publicamente
- Teste: `curl http://pytake.net/api/v1/health` (deve retornar 200 OK)
- Verifique firewall/DNS

### Erro: "403 Forbidden"
- O webhook está bloqueando a requisição
- Verifique se o `app_secret` está configurado corretamente (se usando signature)

### Webhook não recebe mensagens
1. Verifique se os eventos estão assinados no Meta
2. Verifique se o número está ativo
3. Veja os logs: `podman logs pytake-backend -f`

## Estrutura do Webhook

**Validação (GET):**
```
GET /api/v1/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=TOKEN&hub.challenge=RANDOM
```

**Recebimento (POST):**
```
POST /api/v1/whatsapp/webhook
Headers:
  X-Hub-Signature-256: sha256=...
  Content-Type: application/json
Body:
  { "entry": [...], "object": "whatsapp_business_account" }
```

## Documentação Oficial

- [WhatsApp Cloud API - Webhooks](https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks)
- [Webhook Verification](https://developers.facebook.com/docs/graph-api/webhooks/getting-started#verification-requests)

---

**Última atualização:** 20/10/2025
