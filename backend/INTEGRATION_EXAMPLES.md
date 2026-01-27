"""
Integration Examples
Quick start guide for using integration clients
"""

# Example 1: WhatsApp Business API
from apps.integrations.clients.whatsapp import WhatsAppBusinessClient

# Initialize client
wa_client = WhatsAppBusinessClient(
    phone_number_id="1234567890",
    access_token="your-access-token",
)

# Send text message
response = wa_client.send_text_message(
    recipient_phone="+5511999999999",
    message_body="Hello from PyTake!",
    preview_url=True,
)
print(response)  # {'messages': [{'id': 'wamid...'}]}

# Send template message
response = wa_client.send_template_message(
    recipient_phone="+5511999999999",
    template_name="hello_world",
    language_code="pt_BR",
    parameters=[{"type": "text", "text": "John"}],
)

# Upload media
media_id = wa_client.upload_media("path/to/image.jpg", "image/jpeg")

# Send media
response = wa_client.send_media_message(
    recipient_phone="+5511999999999",
    media_type="image",
    media_url="https://example.com/image.jpg",
    caption="Check this out!",
)

---

# Example 2: AI Providers
from apps.integrations.clients.ai import get_ai_client

# OpenAI
openai_client = get_ai_client("openai", "sk-...", model="gpt-4")
response = openai_client.chat([
    {"role": "user", "content": "What is the capital of France?"}
])
print(response)  # "The capital of France is Paris."

# Anthropic (Claude)
claude_client = get_ai_client("anthropic", "sk-ant-...", model="claude-3-sonnet")
response = claude_client.complete("Say hello in Portuguese")
print(response)

# Google Gemini
gemini_client = get_ai_client("google", "AIzaSy...", model="gemini-pro")
response = gemini_client.chat([
    {"role": "user", "content": "How many planets are in our solar system?"}
])

---

# Example 3: Email (SendGrid)
from apps.integrations.clients.communications import SendGridEmailClient

email_client = SendGridEmailClient(api_key="SG.xxx")
response = email_client.send(
    to="user@example.com",
    subject="Welcome!",
    html="<h1>Welcome to PyTake</h1>",
    from_email="noreply@pytake.net",
    from_name="PyTake",
    cc=["admin@example.com"],
)
print(response)  # {'status': 'sent', 'message_id': '...'}

---

# Example 4: SMS (Twilio)
from apps.integrations.clients.communications import TwilioSMSClient

sms_client = TwilioSMSClient(
    account_sid="ACxxx",
    auth_token="token",
)
response = sms_client.send(
    to="+5511999999999",
    message="Código de verificação: 123456",
    from_number="+551133334444",
)
print(response)  # {'status': 'sent', 'message_id': 'SMxxx'}

# Check status
status = sms_client.get_message_status("SMxxx")
print(status)  # {'status': 'delivered', ...}

---

# Example 5: Payment (Stripe)
from apps.integrations.clients.communications import StripePaymentClient

stripe_client = StripePaymentClient(api_key="sk_test_xxx")

# Create payment intent
intent = stripe_client.create_payment_intent(
    amount=9999,  # $99.99 (in cents)
    currency="usd",
    description="PyTake Premium Subscription",
    customer_email="user@example.com",
    metadata={"organization_id": "org-123"},
)
print(intent)  # {'client_secret': '...', 'payment_intent_id': 'pi_xxx'}

# Create subscription
subscription = stripe_client.create_subscription(
    customer_id="cus_xxx",
    price_id="price_xxx",
    metadata={"org_id": "org-123"},
)

# Cancel subscription
result = stripe_client.cancel_subscription("sub_xxx")

---

# Example 6: Using Celery Tasks (Async)
from apps.integrations.tasks import (
    send_whatsapp_message,
    send_email_via_sendgrid,
    process_ai_completion,
)

# Queue WhatsApp message
send_whatsapp_message.delay(
    phone_number_id="1234567890",
    recipient_phone="+5511999999999",
    message_type="text",
    message_content={"body": "Hello!"},
    organization_id="org-123",
)

# Queue email
send_email_via_sendgrid.delay(
    to_email="user@example.com",
    subject="Welcome!",
    html_content="<h1>Welcome</h1>",
    organization_id="org-123",
)

# Queue AI completion
process_ai_completion.delay(
    text="Summarize this article...",
    provider="openai",
    model="gpt-4",
    temperature=0.7,
    max_tokens=500,
    organization_id="org-123",
    callback_data={"conversation_id": "conv-123"},
)

---

# Example 7: API REST Endpoints
import requests

# List integrations
response = requests.get(
    "http://localhost:8000/api/v1/integrations/providers/",
    headers={"Authorization": "Bearer <token>"},
)

# Create integration
response = requests.post(
    "http://localhost:8000/api/v1/integrations/providers/",
    headers={"Authorization": "Bearer <token>"},
    json={
        "provider": "whatsapp",
        "api_key": "your-api-key",
        "config": {"phone_number_id": "1234567890"},
    },
)

# Test integration
response = requests.post(
    "http://localhost:8000/api/v1/integrations/providers/123/test/",
    headers={"Authorization": "Bearer <token>"},
)

# Create webhook destination
response = requests.post(
    "http://localhost:8000/api/v1/integrations/webhooks/",
    headers={"Authorization": "Bearer <token>"},
    json={
        "name": "My Webhook",
        "url": "https://example.com/webhook",
        "events": ["campaign.sent", "conversation.message"],
    },
)
