# MongoDB Integration Guide

## Overview

PyTake uses **MongoDB** for:
- Message logging (all WhatsApp messages)
- Audit trails (compliance)
- Analytics data (aggregated metrics)
- Event sourcing (system events)

## Collections

### 1. message_logs
Stores all WhatsApp messages for history and replay.

```json
{
  "organization_id": "uuid",
  "conversation_id": "uuid",
  "sender_id": "uuid",
  "receiver_id": "uuid",
  "message_content": "text",
  "message_type": "text|image|document|audio|video",
  "media_url": "https://...",
  "status": "sent|delivered|read|failed",
  "metadata": { "custom": "data" },
  "created_at": "2026-01-27T10:30:00Z",
  "updated_at": "2026-01-27T10:32:00Z"
}
```

**Indexes:**
- `(organization_id, created_at)`
- `(organization_id, conversation_id)`
- Text index on `message_content`

**TTL:** 90 days (messages auto-expire)

### 2. audit_logs
Tracks all user actions for compliance and debugging.

```json
{
  "organization_id": "uuid",
  "user_id": "uuid",
  "action": "create|update|delete|view|execute",
  "resource_type": "campaign|contact|conversation|chatbot",
  "resource_id": "uuid",
  "changes": {
    "before": { "field": "old_value" },
    "after": { "field": "new_value" }
  },
  "ip_address": "192.168.1.1",
  "user_agent": "Mozilla/5.0...",
  "created_at": "2026-01-27T10:30:00Z"
}
```

**Indexes:**
- `(organization_id, created_at)`
- `(organization_id, user_id)`
- `(organization_id, action)`

**TTL:** 365 days (1 year for compliance)

### 3. analytics
Aggregated metrics for dashboards.

```json
{
  "organization_id": "uuid",
  "metric_type": "messages_sent|campaigns_executed|conversations_closed",
  "value": 123.45,
  "tags": {
    "campaign_id": "uuid",
    "agent_id": "uuid"
  },
  "metadata": { "custom": "data" },
  "date": "2026-01-27",
  "timestamp": "2026-01-27T10:30:00Z"
}
```

**Indexes:**
- `(organization_id, metric_type, date)`
- `(organization_id, date)`

**TTL:** 180 days (6 months)

### 4. events
Event sourcing for replay and audit.

```json
{
  "organization_id": "uuid",
  "event_type": "MessageSent|CampaignExecuted|ConversationClosed",
  "event_data": { "field": "value" },
  "aggregate_id": "uuid",
  "aggregate_type": "campaign|conversation|contact",
  "created_at": "2026-01-27T10:30:00Z",
  "version": 1
}
```

**Indexes:**
- `(organization_id, event_type)`
- `(organization_id, created_at)`

**TTL:** 365 days (1 year)

## Usage

### Initialize MongoDB

```bash
python manage.py init_mongodb
```

### MessageLogger - Logging Messages

```python
from apps.services.database.mongodb_service import MongoDBService

# Initialize with organization context
mongo_service = MongoDBService(organization_id='org-123')

# Log a sent message
message_id = mongo_service.log_message(
    conversation_id='conv-456',
    sender_id='agent-789',
    receiver_id='contact-012',
    message_content='Hello, how can I help?',
    message_type='text',
    status='sent'
)

# Update message status
mongo_service.update_message_status(message_id, status='delivered')

# Get conversation history
history = mongo_service.get_conversation_history(
    conversation_id='conv-456',
    limit=50
)

# Search messages
results = mongo_service.search_messages(
    query='help OR support',
    limit=20
)
```

### AuditLogger - Logging Actions

```python
# Log a user action
audit_id = mongo_service.log_action(
    user_id='user-123',
    action='execute',
    resource_type='campaign',
    resource_id='campaign-456',
    changes={
        'before': {'status': 'draft'},
        'after': {'status': 'executed'}
    },
    ip_address='192.168.1.1'
)

# Get user activity
activity = mongo_service.get_user_activity(
    user_id='user-123',
    days=7,
    limit=100
)

# Get resource history
history = mongo_service.get_resource_history(
    resource_id='campaign-456',
    limit=50
)
```

### AnalyticsLogger - Logging Metrics

```python
# Log a metric
metric_id = mongo_service.log_metric(
    metric_type='messages_sent',
    value=150,
    tags={'campaign_id': 'campaign-456'},
    metadata={'channel': 'whatsapp'}
)

# Get daily stats
daily = mongo_service.get_daily_stats(
    metric_type='messages_sent',
    days=30
)
# Returns: [
#   {'_id': '2026-01-27', 'total': 1500, 'count': 12, 'average': 125},
#   ...
# ]

# Get hourly stats
hourly = mongo_service.get_hourly_stats(
    metric_type='campaigns_executed',
    hours=24
)
```

### EventStore - Event Sourcing

```python
# Store an event
event_id = mongo_service.store_event(
    event_type='CampaignExecuted',
    event_data={
        'campaign_id': 'campaign-456',
        'contacts_count': 5000,
        'status': 'completed'
    },
    aggregate_id='campaign-456',
    aggregate_type='campaign'
)

# Get events for aggregate
events = mongo_service.get_aggregate_events(
    aggregate_id='campaign-456',
    aggregate_type='campaign',
    limit=100
)

# Get events by type
events = mongo_service.get_events_by_type(
    event_type='CampaignExecuted',
    limit=100
)
```

### Batch Operations

```python
# Log campaign execution (audit + metric + event)
result = mongo_service.log_campaign_execution(
    user_id='user-123',
    campaign_id='campaign-456',
    contacts_count=5000,
    ip_address='192.168.1.1'
)
# Returns: {
#   'audit_id': '...',
#   'metric_id': '...',
#   'event_id': '...'
# }

# Log conversation closure (audit + metric + event)
result = mongo_service.log_conversation_closed(
    user_id='user-123',
    conversation_id='conv-456',
    resolution_time_seconds=3600,
    ip_address='192.168.1.1'
)
```

## Integration with Django Views

```python
from rest_framework.views import APIView
from rest_framework.response import Response
from apps.services.database.mongodb_service import MongoDBService

class CampaignExecuteView(APIView):
    def post(self, request, campaign_id):
        mongo_service = MongoDBService(
            organization_id=request.user.organization_id
        )
        
        # Execute campaign
        campaign = Campaign.objects.get(id=campaign_id)
        
        # Log to MongoDB
        result = mongo_service.log_campaign_execution(
            user_id=str(request.user.id),
            campaign_id=campaign_id,
            contacts_count=campaign.contacts.count(),
            ip_address=request.META.get('REMOTE_ADDR')
        )
        
        return Response({
            'status': 'executed',
            'audit_id': result['audit_id'],
            'metric_id': result['metric_id']
        })
```

## Integration with Celery Tasks

```python
from celery import shared_task
from apps.services.database.mongodb_service import MongoDBService

@shared_task
def send_campaign_messages(campaign_id):
    campaign = Campaign.objects.get(id=campaign_id)
    mongo_service = MongoDBService(
        organization_id=str(campaign.organization_id)
    )
    
    for contact in campaign.contacts.all():
        # Send message
        response = send_whatsapp_message(contact)
        
        # Log to MongoDB
        mongo_service.log_message(
            conversation_id=str(contact.conversation_id),
            sender_id=str(campaign.id),
            receiver_id=str(contact.id),
            message_content=campaign.content,
            status='sent'
        )
```

## Performance Considerations

### Indexes
All collections have optimized indexes. Use `init_mongodb` to create them.

### TTL (Time-To-Live)
- Messages: 90 days (auto-delete)
- Audit logs: 365 days (compliance)
- Analytics: 180 days
- Events: 365 days

### Queries
- Use indexed fields in $match
- Aggregate for reports
- Use pagination for large result sets

### Connection Pooling
```python
# Configured in django settings:
MONGODB_CONFIG = {
    'MAX_POOL_SIZE': 50,
    'MIN_POOL_SIZE': 10,
}
```

## Monitoring

### Check MongoDB Status
```bash
python manage.py shell
>>> from apps.services.utils.mongodb import get_mongo_client
>>> mongo = get_mongo_client()
>>> mongo.db.list_collection_names()
```

### Collection Sizes
```javascript
// In MongoDB shell
db.message_logs.stats()
db.audit_logs.stats()
db.analytics.stats()
```

## Backup & Restore

```bash
# Backup
mongodump --uri="mongodb://localhost:27017" --out=/backup

# Restore
mongorestore --uri="mongodb://localhost:27017" /backup
```

## Troubleshooting

### Connection Error
```
❌ MongoDB connection failed: ...
```

Check:
1. MongoDB service is running: `docker-compose logs mongodb`
2. Connection URI in `.env`: `MONGODB_URI=mongodb://localhost:27017`
3. Database name in `.env`: `MONGODB_DB=pytake_logs`

### Index Creation Error
```
⚠️ Index creation warning: ...
```

Usually safe to ignore. Re-run `python manage.py init_mongodb` to retry.

### Memory Usage
If MongoDB uses too much RAM:
1. Check collection sizes: `db.collection.stats()`
2. Apply TTL settings: auto-delete old records
3. Archive old data to S3 or backup storage

