# 🔌 Guia de Integrações - PyTake

## 📋 Índice
- [WhatsApp Cloud API](#whatsapp-cloud-api)
- [Webhooks](#webhooks)
- [API REST](#api-rest)
- [Zapier](#zapier)
- [E-commerce](#e-commerce)
- [CRMs](#crms)

---

## 📱 WhatsApp Cloud API

### Setup Inicial

#### 1. Criar App no Meta for Developers

1. Acesse https://developers.facebook.com
2. Criar novo app → **Business** type
3. Adicionar produto **WhatsApp**
4. Selecionar ou criar **Business Account**

#### 2. Obter Credenciais

**Phone Number ID:**
```
WhatsApp → API Setup → Phone Number ID
Copiar: waba_id_xxxxxxx
```

**Access Token:**
```
WhatsApp → API Setup → Temporary Access Token (24h)

Para produção - gerar System User Token:
1. Business Settings → System Users
2. Create System User
3. Assign WhatsApp permissions
4. Generate Token (nunca expira)
```

**Webhook Verify Token:**
```
Criar token aleatório seguro:
openssl rand -hex 32
```

#### 3. Configurar no PyTake

**Dashboard:**
```
Settings → WhatsApp Business
├─ Phone Number ID: waba_id_xxxxxxx
├─ Access Token: EAAG... (token gerado)
└─ Webhook Verify Token: abc123xyz (criado por você)
```

**Teste de conexão** para validar credenciais.

#### 4. Configurar Webhook

**Meta Console:**
```
WhatsApp → Configuration → Webhook

Callback URL: https://api.seudominio.com/webhooks/whatsapp
Verify Token: abc123xyz (mesmo do PyTake)

Subscribe to:
✓ messages
✓ message_status (sent, delivered, read)
```

**Teste:**
- Meta enviará GET com `hub.challenge`
- PyTake deve responder com mesmo valor
- Se validado, webhook fica ativo ✅

---

### Enviar Mensagens

#### Texto Simples

```python
import requests

url = "https://graph.facebook.com/v18.0/{phone_number_id}/messages"
headers = {
    "Authorization": f"Bearer {access_token}",
    "Content-Type": "application/json"
}

payload = {
    "messaging_product": "whatsapp",
    "to": "5511999999999",  # formato: código_país + número
    "type": "text",
    "text": {
        "body": "Olá! Como posso ajudar?"
    }
}

response = requests.post(url, json=payload, headers=headers)
print(response.json())
```

#### Imagem

```python
payload = {
    "messaging_product": "whatsapp",
    "to": "5511999999999",
    "type": "image",
    "image": {
        "link": "https://example.com/image.jpg",
        "caption": "Confira nossa promoção!"
    }
}
```

#### Botões Interativos

```python
payload = {
    "messaging_product": "whatsapp",
    "to": "5511999999999",
    "type": "interactive",
    "interactive": {
        "type": "button",
        "body": {
            "text": "Escolha uma opção:"
        },
        "action": {
            "buttons": [
                {
                    "type": "reply",
                    "reply": {
                        "id": "btn_yes",
                        "title": "Sim"
                    }
                },
                {
                    "type": "reply",
                    "reply": {
                        "id": "btn_no",
                        "title": "Não"
                    }
                }
            ]
        }
    }
}
```

#### Template Aprovado

```python
payload = {
    "messaging_product": "whatsapp",
    "to": "5511999999999",
    "type": "template",
    "template": {
        "name": "welcome_message",  # nome do template
        "language": {
            "code": "pt_BR"
        },
        "components": [
            {
                "type": "body",
                "parameters": [
                    {
                        "type": "text",
                        "text": "João"  # variável {{1}}
                    }
                ]
            }
        ]
    }
}
```

---

### Receber Mensagens (Webhook)

**Payload de mensagem recebida:**

```json
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "WHATSAPP_BUSINESS_ACCOUNT_ID",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "5511999999999",
              "phone_number_id": "PHONE_NUMBER_ID"
            },
            "contacts": [
              {
                "profile": {
                  "name": "João Silva"
                },
                "wa_id": "5511888888888"
              }
            ],
            "messages": [
              {
                "from": "5511888888888",
                "id": "wamid.HBgNNTUxMTk5OTk5OTk5ORUCABIYIDNBQjBDMDhGNzQ4QzQxODk5OUYyRjk3MzY0QkE3N0M0AA==",
                "timestamp": "1696348200",
                "type": "text",
                "text": {
                  "body": "Olá, preciso de ajuda"
                }
              }
            ]
          },
          "field": "messages"
        }
      ]
    }
  ]
}
```

**Processar no PyTake:**

```python
# app/integrations/whatsapp/webhook_handler.py
async def handle_webhook(payload: dict):
    entry = payload.get("entry", [])[0]
    changes = entry.get("changes", [])[0]
    value = changes.get("value", {})

    # Extrair mensagem
    messages = value.get("messages", [])
    if not messages:
        return

    message = messages[0]
    from_number = message.get("from")
    message_type = message.get("type")
    message_id = message.get("id")

    # Processar mensagem
    if message_type == "text":
        text = message["text"]["body"]
        await process_text_message(from_number, text, message_id)

    elif message_type == "image":
        image_id = message["image"]["id"]
        await download_media(image_id)

    # Responder (via bot ou enfileirar para agente)
```

---

## 🪝 Webhooks

### Criar Webhook no PyTake

**Dashboard:**
```
Settings → Webhooks → Create Webhook

Name: My Integration
URL: https://seu-sistema.com/api/webhook
Events:
  ✓ message.received
  ✓ conversation.resolved
Secret: abc123 (para validar assinatura)
```

### Receber Eventos

**Exemplo de payload:**

```json
{
  "event": "message.received",
  "timestamp": "2025-10-03T16:30:00Z",
  "organization_id": "uuid",
  "data": {
    "message": {
      "id": "uuid",
      "type": "text",
      "content": {
        "text": "Olá"
      }
    },
    "contact": {
      "id": "uuid",
      "name": "João",
      "whatsapp_id": "+5511999999999"
    },
    "conversation": {
      "id": "uuid",
      "status": "open"
    }
  }
}
```

### Validar Assinatura

**Python:**

```python
import hmac
import hashlib

def validate_webhook(payload: str, signature: str, secret: str) -> bool:
    expected_signature = hmac.new(
        secret.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()

    received_signature = signature.replace("sha256=", "")

    return hmac.compare_digest(expected_signature, received_signature)

# No endpoint
@app.post("/webhook")
async def receive_webhook(request: Request):
    payload = await request.body()
    signature = request.headers.get("X-PyTake-Signature")

    if not validate_webhook(payload.decode(), signature, SECRET):
        raise HTTPException(401, "Invalid signature")

    # Processar evento
    data = json.loads(payload)
    event = data["event"]

    if event == "message.received":
        # Fazer algo com mensagem
        pass
```

**Node.js:**

```javascript
const crypto = require('crypto');

function validateWebhook(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  const receivedSignature = signature.replace('sha256=', '');

  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(receivedSignature)
  );
}

app.post('/webhook', (req, res) => {
  const signature = req.headers['x-pytake-signature'];
  const payload = JSON.stringify(req.body);

  if (!validateWebhook(payload, signature, SECRET)) {
    return res.status(401).send('Invalid signature');
  }

  const { event, data } = req.body;

  if (event === 'message.received') {
    // Processar mensagem
  }

  res.sendStatus(200);
});
```

---

## 🔗 API REST

### Autenticação

```python
import requests

API_KEY = "pytake_live_abc123"
BASE_URL = "https://api.pytake.com/v1"

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}
```

### Casos de Uso

#### 1. Criar Contato Automaticamente

```python
def create_contact(whatsapp_id: str, name: str, email: str = None):
    response = requests.post(
        f"{BASE_URL}/contacts",
        headers=headers,
        json={
            "whatsapp_id": whatsapp_id,
            "name": name,
            "email": email,
            "tags": ["new_lead"]
        }
    )
    return response.json()
```

#### 2. Enviar Mensagem Transacional

```python
def send_order_update(phone: str, order_id: str, status: str):
    response = requests.post(
        f"{BASE_URL}/messages",
        headers=headers,
        json={
            "to": phone,
            "type": "template",
            "template": {
                "name": "order_update",
                "language": {"code": "pt_BR"},
                "components": [
                    {
                        "type": "body",
                        "parameters": [
                            {"type": "text", "text": order_id},
                            {"type": "text", "text": status}
                        ]
                    }
                ]
            }
        }
    )
    return response.json()
```

#### 3. Adicionar Tag após Compra

```python
def tag_customer_on_purchase(contact_id: str):
    response = requests.patch(
        f"{BASE_URL}/contacts/{contact_id}",
        headers=headers,
        json={
            "tags": ["customer", "purchased"],
            "attributes": {
                "last_purchase": "2025-10-03",
                "total_spent": 150.00
            }
        }
    )
    return response.json()
```

---

## ⚡ Zapier

### Triggers Disponíveis

1. **New Message Received**
   - Dispara quando nova mensagem chega
   - Dados: message, contact, conversation

2. **New Contact Created**
   - Dispara quando novo contato é adicionado
   - Dados: contact info

3. **Conversation Resolved**
   - Dispara quando conversa é resolvida
   - Dados: conversation, resolution_time, satisfaction

### Actions Disponíveis

1. **Send Message**
   - Enviar mensagem para contato
   - Inputs: phone, message, type

2. **Create Contact**
   - Criar novo contato
   - Inputs: name, phone, email, tags

3. **Add Tag to Contact**
   - Adicionar tag a contato existente
   - Inputs: contact_id, tags

### Exemplos de Zaps

**Zap 1: WhatsApp → Google Sheets**
```
Trigger: New Message Received
Action: Create Spreadsheet Row
Map:
  - Column A: Contact Name
  - Column B: Message Text
  - Column C: Timestamp
```

**Zap 2: Google Forms → WhatsApp**
```
Trigger: New Form Response
Action: Send Message
Map:
  - Phone: Form field "Telefone"
  - Message: "Obrigado por responder! Em breve entraremos em contato."
```

**Zap 3: Shopify → WhatsApp**
```
Trigger: New Order (Shopify)
Action: Send Message
Map:
  - Phone: Customer Phone
  - Template: "order_confirmation"
  - Variables: Order Number, Total
```

---

## 🛒 E-commerce

### Shopify

#### Webhook de Novo Pedido

```javascript
// Configurar webhook na Shopify:
// Settings → Notifications → Webhooks
// Event: Order creation
// URL: https://seu-backend.com/shopify/webhook

app.post('/shopify/webhook', async (req, res) => {
  const order = req.body;

  // Enviar confirmação via PyTake
  await pytake.messages.send({
    to: order.customer.phone,
    type: 'template',
    template: {
      name: 'order_confirmation',
      language: { code: 'pt_BR' },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: order.order_number },
            { type: 'text', text: order.total_price }
          ]
        }
      ]
    }
  });

  res.sendStatus(200);
});
```

### WooCommerce

```php
// functions.php (WordPress)
add_action('woocommerce_order_status_completed', 'send_whatsapp_notification');

function send_whatsapp_notification($order_id) {
    $order = wc_get_order($order_id);
    $phone = $order->get_billing_phone();

    $response = wp_remote_post('https://api.pytake.com/v1/messages', [
        'headers' => [
            'Authorization' => 'Bearer ' . PYTAKE_API_KEY,
            'Content-Type' => 'application/json'
        ],
        'body' => json_encode([
            'to' => $phone,
            'type' => 'text',
            'text' => [
                'body' => 'Seu pedido #' . $order_id . ' foi concluído!'
            ]
        ])
    ]);
}
```

---

## 💼 CRMs

### HubSpot

#### Sincronizar Contatos

```python
import requests

HUBSPOT_API_KEY = "your_key"
PYTAKE_API_KEY = "pytake_key"

# Webhook do HubSpot para novo contato
@app.post("/hubspot/webhook")
async def hubspot_contact_created(payload: dict):
    contact = payload["objectId"]

    # Buscar dados do HubSpot
    hs_contact = requests.get(
        f"https://api.hubapi.com/crm/v3/objects/contacts/{contact}",
        headers={"Authorization": f"Bearer {HUBSPOT_API_KEY}"}
    ).json()

    # Criar no PyTake
    pytake_contact = requests.post(
        "https://api.pytake.com/v1/contacts",
        headers={"Authorization": f"Bearer {PYTAKE_API_KEY}"},
        json={
            "whatsapp_id": hs_contact["properties"]["phone"],
            "name": f"{hs_contact['properties']['firstname']} {hs_contact['properties']['lastname']}",
            "email": hs_contact["properties"]["email"],
            "attributes": {
                "hubspot_id": contact
            }
        }
    )

    return {"status": "synced"}
```

### Salesforce

```python
from simple_salesforce import Salesforce

sf = Salesforce(username='user', password='pass', security_token='token')

# Quando mensagem é recebida no PyTake, criar Lead no Salesforce
@app.post("/pytake/webhook")
async def message_received(payload: dict):
    if payload["event"] == "message.received":
        contact = payload["data"]["contact"]

        # Criar Lead no Salesforce
        sf.Lead.create({
            "FirstName": contact["name"].split()[0],
            "LastName": contact["name"].split()[-1],
            "Phone": contact["whatsapp_id"],
            "Company": "Unknown",
            "Status": "Open - Not Contacted",
            "LeadSource": "WhatsApp"
        })
```

---

## 🔧 Ferramentas Úteis

### Postman Collection

Import: `https://www.postman.com/pytake/pytake-api`

### SDK Python

```bash
pip install pytake-sdk
```

```python
from pytake import PyTake

client = PyTake(api_key="pytake_live_abc123")

# Enviar mensagem
message = client.messages.send(
    to="+5511999999999",
    text="Olá!"
)

# Listar contatos
contacts = client.contacts.list(limit=100)

# Criar chatbot
bot = client.chatbots.create(
    name="Atendimento",
    welcome_message="Olá! Como posso ajudar?"
)
```

---

**Versão:** 1.0.0
**Última atualização:** 2025-10-03
