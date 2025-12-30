import requests
import json
from hmac import new
from hashlib import sha256

webhook_url = "http://localhost:8002/api/v1/webhooks/meta"
app_secret = "N123PfjIgcm6044Dz1W8A637OM6q5lIb"

payload = {
    "object": "whatsapp_business_account",
    "entry": [{
        "id": "123",
        "changes": [{
            "value": {
                "messaging_product": "whatsapp",
                "metadata": {
                    "display_phone_number": "+556181277787",
                    "phone_number_id": "574293335763643"
                },
                "messages": [{
                    "from": "556194013828",
                    "id": "wamid.TESTFLOW123",
                    "timestamp": "1735599600",
                    "type": "text",
                    "text": {
                        "body": "teste flow"
                    }
                }]
            }
        }]
    }]
}

payload_str = json.dumps(payload)
signature = "sha256=" + new(app_secret.encode(), payload_str.encode(), sha256).hexdigest()

headers = {
    "Content-Type": "application/json",
    "X-Hub-Signature-256": signature
}

print("📤 Enviando webhook...")
print(f"📞 Phone: 574293335763643")
print(f"👤 Contact: 556194013828")
response = requests.post(webhook_url, headers=headers, data=payload_str, timeout=5)
print(f"\n✅ Status: {response.status_code}")
if response.status_code == 200:
    print("🎉 Webhook processado!")
else:
    print(f"❌ Erro: {response.text[:300]}")
