# Phase 11-12: Email, SMS, Payment & Reporting Services

## Overview

This document covers the additional business services implemented in Phase 11-12:
- Email sending (SendGrid)
- SMS sending (Twilio)
- Payment processing (Stripe)
- Report generation

## Email Sender Service

### Usage

```python
from apps.services.business.email_sender import EmailSenderService

service = EmailSenderService(organization_id='org-123')

# Send simple email
result = service.send_simple(
    to_email='user@example.com',
    subject='Welcome',
    content='<h1>Welcome!</h1>',
    is_html=True,
    cc=['manager@example.com'],
    bcc=['admin@example.com']
)

# Send from template
result = service.send_template(
    to_email='user@example.com',
    template_id='email-template-123',
    template_data={'name': 'John', 'verification_code': '123456'}
)

# Bulk send
result = service.send_bulk(
    recipients=[
        {'email': 'user1@example.com', 'name': 'User 1', 'vars': {'name': 'User 1'}},
        {'email': 'user2@example.com', 'name': 'User 2', 'vars': {'name': 'User 2'}},
    ],
    subject='Hello {{name}}',
    content='Hi {{name}}, welcome!',
    personalization=True
)

# Send with attachment
result = service.send_with_attachment(
    to_email='user@example.com',
    subject='Your Report',
    content='See attached report',
    attachment_path='/path/to/report.pdf'
)

# Schedule for later
import time
send_at = int(time.time()) + (24 * 3600)  # Tomorrow
result = service.send_scheduled(
    to_email='user@example.com',
    subject='Scheduled Email',
    content='This is scheduled',
    send_at=send_at
)
```

### REST API Endpoints

```
POST /api/v1/email/send-simple/
POST /api/v1/email/send-template/
POST /api/v1/email/send-bulk/
```

**Send Simple Email:**
```bash
curl -X POST http://localhost:8000/api/v1/email/send-simple/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "to_email": "user@example.com",
    "subject": "Welcome",
    "content": "<h1>Hello</h1>",
    "is_html": true,
    "cc": ["cc@example.com"],
    "bcc": ["bcc@example.com"]
  }'
```

**Send Bulk Emails:**
```bash
curl -X POST http://localhost:8000/api/v1/email/send-bulk/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recipients": [
      {"email": "user1@example.com", "name": "User 1"},
      {"email": "user2@example.com", "name": "User 2"}
    ],
    "subject": "Newsletter",
    "content": "Hello {{name}}",
    "is_html": false
  }'
```

---

## SMS Sender Service

### Usage

```python
from apps.services.business.sms_sender import SMSSenderService

service = SMSSenderService(organization_id='org-123')

# Send simple SMS
result = service.send_simple(
    to_number='+55 11 98765-4321',
    message='Your verification code is: 123456'
)

# Send from template
result = service.send_template(
    to_number='+55 11 98765-4321',
    template_id='sms-template-123',
    template_data={'code': '123456'}
)

# Bulk send
result = service.send_bulk(
    recipients=[
        {'phone': '+55 11 98765-4321', 'vars': {'name': 'User 1'}},
        {'phone': '+55 11 87654-3210', 'vars': {'name': 'User 2'}},
    ],
    message='Hi {{name}}, verify: 123456'
)

# Send MMS (SMS with media)
result = service.send_with_media(
    to_number='+55 11 98765-4321',
    message='Check this image',
    media_url='https://example.com/image.jpg'
)

# Check message status
status = service.get_message_status(message_sid='SMxxxxxxxx')

# Check account balance
balance = service.check_balance()
```

### REST API Endpoints

```
POST /api/v1/sms/send-simple/
POST /api/v1/sms/send-template/
POST /api/v1/sms/send-bulk/
GET /api/v1/sms/check-balance/
```

**Send SMS:**
```bash
curl -X POST http://localhost:8000/api/v1/sms/send-simple/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "to_number": "+55 11 98765-4321",
    "message": "Your code is: 123456"
  }'
```

---

## Payment Service

### Usage

```python
from apps.services.business.payment_service import PaymentService

service = PaymentService(organization_id='org-123')

# Create customer
customer_id = service.create_customer(
    email='user@example.com',
    name='John Doe'
)

# Create payment intent
intent = service.create_payment_intent(
    amount=29900,  # $299.00 in cents
    currency='usd',
    customer_id=customer_id,
    description='Premium Plan'
)

# Create subscription
subscription = service.create_subscription(
    customer_id=customer_id,
    price_id='price_123456'
)

# Cancel subscription
result = service.cancel_subscription(
    subscription_id='sub_123456',
    at_period_end=True  # Cancel at end of period
)

# List invoices
invoices = service.list_invoices(
    customer_id=customer_id,
    limit=20
)

# Get invoice
invoice = service.get_invoice(invoice_id='in_123456')

# Get subscription usage
usage = service.get_usage(
    customer_id=customer_id,
    subscription_id='sub_123456'
)

# Create coupon
coupon_id = service.create_coupon(
    percent_off=20,
    duration='repeating',
    duration_in_months=3
)

# Apply coupon
result = service.apply_coupon(
    customer_id=customer_id,
    coupon_id=coupon_id
)
```

### REST API Endpoints

```
POST /api/v1/payments/create-customer/
POST /api/v1/payments/create-payment-intent/
POST /api/v1/payments/create-subscription/
GET /api/v1/payments/invoices/
```

**Create Customer:**
```bash
curl -X POST http://localhost:8000/api/v1/payments/create-customer/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "name": "John Doe"
  }'
```

**Create Payment Intent:**
```bash
curl -X POST http://localhost:8000/api/v1/payments/create-payment-intent/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 29900,
    "currency": "usd",
    "customer_id": "cus_123456",
    "description": "Premium Plan Upgrade"
  }'
```

---

## Reporting Service

### Usage

```python
from apps.services.business.reporting_service import ReportingService

service = ReportingService(organization_id='org-123')

# Campaign report
report = service.generate_campaign_report(
    days=30,
    format='dict'  # or 'csv', 'pdf'
)

# Conversation report
report = service.generate_conversation_report(
    days=30,
    format='csv'
)

# Message report
report = service.generate_message_report(
    days=7,
    format='pdf'
)

# Audit report
report = service.generate_audit_report(
    days=30,
    action_filter='create',  # Optional
    format='dict'
)

# Executive summary
report = service.generate_summary_report(
    days=30,
    format='json'
)

# Schedule report
schedule = service.schedule_report(
    report_type='campaign',
    email='manager@example.com',
    frequency='weekly',  # daily, weekly, monthly
    format='pdf'
)
```

### REST API Endpoints

```
GET /api/v1/reports/campaign/
GET /api/v1/reports/conversation/
GET /api/v1/reports/message/
GET /api/v1/reports/audit/
GET /api/v1/reports/summary/
```

**Query Parameters:**
- `days` (int, default: 30) - Number of days to include
- `format` (string: json, csv, pdf, default: json)
- `action` (string, only for audit) - Filter by action

**Generate Campaign Report:**
```bash
curl http://localhost:8000/api/v1/reports/campaign/?days=30&format=pdf \
  -H "Authorization: Bearer $TOKEN" \
  -o campaign_report.pdf
```

**Generate Conversation Report (CSV):**
```bash
curl http://localhost:8000/api/v1/reports/conversation/?days=7&format=csv \
  -H "Authorization: Bearer $TOKEN" \
  -o conversation_report.csv
```

**Generate Audit Report (JSON):**
```bash
curl http://localhost:8000/api/v1/reports/audit/?days=30&action=create \
  -H "Authorization: Bearer $TOKEN" \
  | jq .
```

---

## Configuration

Add these environment variables to `.env`:

```env
# Email (SendGrid)
SENDGRID_API_KEY=sg_xxxxxxxxxxxx
DEFAULT_FROM_EMAIL=noreply@pytake.com

# SMS (Twilio)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1234567890

# Payment (Stripe)
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxx
```

---

## Features

### Email Service
- ✅ Simple text/HTML emails
- ✅ Template-based emails
- ✅ Bulk sending with personalization
- ✅ Attachments
- ✅ Scheduled delivery
- ✅ CC/BCC support
- ✅ OpenTrack tracking

### SMS Service
- ✅ Simple SMS
- ✅ Template-based SMS
- ✅ Bulk sending
- ✅ MMS (SMS with media)
- ✅ Message status tracking
- ✅ Account balance checking
- ✅ Phone number validation

### Payment Service
- ✅ Customer creation
- ✅ Payment intents
- ✅ Subscriptions
- ✅ Invoicing
- ✅ Coupons & discounts
- ✅ Usage tracking
- ✅ Webhook handlers

### Reporting Service
- ✅ Campaign reports
- ✅ Conversation analytics
- ✅ Message activity
- ✅ Audit trails
- ✅ Executive summaries
- ✅ Export to PDF/CSV
- ✅ Scheduled reports

---

## Error Handling

All services raise exceptions on errors. Wrap calls in try/except:

```python
try:
    result = service.send_simple(
        to_email='user@example.com',
        subject='Test',
        content='Hello'
    )
except Exception as e:
    logger.error(f"Error: {e}")
    # Handle error appropriately
```

REST API endpoints return error responses:

```json
{
  "success": false,
  "message": "Error description"
}
```

---

## Monitoring

All operations are logged to MongoDB:

```python
# Email metrics logged as:
mongo_service.log_metric(
    metric_type='emails_sent',
    value=1,
    tags={'type': 'simple', 'recipient_count': 1}
)

# SMS metrics:
mongo_service.log_metric(
    metric_type='sms_sent',
    value=1,
    tags={'type': 'simple'}
)

# Payment events:
mongo_service.store_event(
    event_type='SubscriptionCreated',
    event_data={...}
)

# Audit trails:
mongo_service.log_action(
    user_id='system',
    action='send',
    resource_type='email'
)
```

Access metrics via:
```bash
curl http://localhost:8000/api/v1/analytics/daily/?metric_type=emails_sent \
  -H "Authorization: Bearer $TOKEN"
```

