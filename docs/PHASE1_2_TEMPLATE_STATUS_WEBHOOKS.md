<!-- markdownlint-disable MD033 -->

# Phase 1.2 - Template Status Webhooks Implementation

**Status:** IN PROGRESS  
**Started:** 2025-01-15  
**Last Updated:** 2025-01-15  
**Author:** Kayo Carvalho Fernandes  

## 📋 Overview

Phase 1.2 implements real-time webhook handling for Meta template status updates. When templates are approved, rejected, disabled, or paused by Meta, the system responds automatically with:

- **Auto-pause campaigns** using disabled/paused templates
- **Quality score tracking** (GREEN/YELLOW/RED)
- **Alert generation** for critical issues
- **API endpoints** for monitoring template health
- **Audit trail** for compliance

## 🎯 Objectives

| # | Objective | Status | Owner |
|---|-----------|--------|-------|
| 1 | Process template status webhooks from Meta | ✅ | Done |
| 2 | Handle all event types (APPROVED, REJECTED, DISABLED, PAUSED, QUALITY_CHANGE) | ✅ | Done |
| 3 | Auto-pause campaigns on template issues | ✅ | Done |
| 4 | Create monitoring API endpoints | ✅ | Done |
| 5 | Create webhook tests | 🟡 | In Progress |
| 6 | Alert system integration | 🔴 | Not Started |
| 7 | Notification system (email/Slack) | 🔴 | Not Started |
| 8 | Audit logging | 🔴 | Not Started |
| 9 | Documentation | 🟡 | In Progress |

## 🏗️ Architecture

### Data Flow

```
Meta Cloud API
    ↓
    [POST /api/v1/whatsapp/webhook]
    ↓
meta.py (webhook handler)
    ├─ Signature verification (HMAC-SHA256)
    ├─ Parse event: message_template_status_update
    ├─ Extract: WABA ID, template name, event type, quality score
    ↓
WebhookService.process_template_status_update()
    ├─ Look up WhatsAppNumber by WABA ID
    ├─ Get organization context
    ├─ Delegate to TemplateStatusService
    ↓
TemplateStatusService.process_template_status_update()
    ├─ Find template by name in organization
    ├─ Event-specific handler (APPROVED, DISABLED, etc)
    ├─ Handle side effects (pause campaigns, create alerts)
    ├─ Persist changes to database
    ├─ Broadcast WebSocket updates
    ↓
Database Updates
    └─ WhatsAppTemplate: status, quality_score, timestamps
    └─ Campaign: is_active (pause if needed)
    └─ Alert: New alert if quality is RED or template disabled
```

### Event Types

| Event | Trigger | Action |
|-------|---------|--------|
| **APPROVED** | Template passes Meta approval | Set status=APPROVED, quality=UNKNOWN (24h evaluation) |
| **REJECTED** | Template fails Meta approval | Set status=REJECTED, store rejection reason |
| **DISABLED** | Meta disables template (compliance issue) | Set status=DISABLED, pause dependent campaigns, alert |
| **PAUSED** | Meta pauses template (quality issue) | Set status=PAUSED, pause dependent campaigns |
| **PENDING** | Awaiting Meta approval | Set status=PENDING (auto-set on template creation) |
| **QUALITY_CHANGE** | Quality score changes (GREEN→YELLOW→RED) | Update quality_score, alert if RED |

## 📁 Files Created/Modified

### Created Files

| File | Purpose | Lines |
|------|---------|-------|
| `backend/app/services/template_status_service.py` | Core webhook processing service | 580+ |
| `backend/tests/test_template_status_endpoints.py` | Endpoint tests (scaffold) | 300+ |

### Modified Files

| File | Changes | Lines Added |
|------|---------|------------|
| `backend/app/services/webhook_service.py` | Added `process_template_status_update()` method | 90+ |
| `backend/app/api/v1/endpoints/whatsapp.py` | Replaced TODO, added 4 monitoring endpoints | 350+ |
| `backend/app/api/webhooks/meta.py` | Updated `message_template_status_update` handler | 25+ |

## 🔌 API Endpoints

### GET /api/v1/whatsapp/templates/critical

Get all templates requiring immediate attention.

**Parameters:**
- None (organization_id from current user)

**Response:**
```json
{
  "critical_templates": [
    {
      "id": "template-uuid",
      "name": "template_name",
      "status": "DISABLED",
      "quality_score": "RED",
      "disabled_reason": "QUALITY_ISSUES",
      "disabled_at": "2025-01-15T14:30:00Z",
      "sent_count": 1250,
      "failed_count": 45,
      "failure_rate": 0.036,
      "campaigns_affected": 3,
      "action_required": "Review template quality metrics and resubmit"
    }
  ],
  "total_critical": 1,
  "timestamp": "2025-01-15T15:00:00Z"
}
```

**Status Codes:**
- 200: Success
- 401: Unauthorized
- 403: Forbidden

---

### GET /api/v1/whatsapp/templates/quality-summary

Get quality metrics summary for all templates.

**Parameters:**
- None (organization_id from current user)

**Response:**
```json
{
  "quality_summary": {
    "total_templates": 45,
    "approved": 40,
    "pending": 2,
    "rejected": 1,
    "disabled": 2,
    "paused": 0,
    "quality_distribution": {
      "GREEN": 35,
      "YELLOW": 4,
      "RED": 1,
      "UNKNOWN": 5
    },
    "avg_success_rate": 0.98,
    "avg_failure_rate": 0.02,
    "total_messages_sent": 125400,
    "total_messages_failed": 2450
  },
  "recent_quality_changes": [],
  "timestamp": "2025-01-15T15:00:00Z"
}
```

**Requirements:**
- Requires: org_admin or super_admin

---

### GET /api/v1/whatsapp/{number_id}/templates/{template_id}/status-history

Get status change history for a template.

**Parameters:**
- `number_id`: WhatsApp number UUID
- `template_id`: Template UUID
- `limit`: Max results (1-1000, default: 100)
- `offset`: Pagination offset (default: 0)

**Response:**
```json
{
  "template": {
    "id": "template-uuid",
    "name": "template_name",
    "current_status": "APPROVED",
    "current_quality": "GREEN"
  },
  "history": [
    {
      "timestamp": "2025-01-15T14:30:00Z",
      "event_type": "APPROVED",
      "previous_status": "PENDING",
      "new_status": "APPROVED",
      "quality_score": "UNKNOWN",
      "reason": "Template approved by Meta"
    }
  ],
  "total": 1,
  "limit": 100,
  "offset": 0,
  "note": "Full history requires AuditLog implementation"
}
```

**Note:** Currently returns limited history. Full audit trail requires `AuditLog` model implementation.

---

### POST /api/v1/whatsapp/{number_id}/templates/{template_id}/acknowledge-alert

Mark template alert as acknowledged.

**Parameters:**
- `number_id`: WhatsApp number UUID
- `template_id`: Template UUID

**Request Body:**
```json
{}
```

**Response:**
```json
{
  "message": "Alert acknowledged",
  "template_id": "uuid",
  "acknowledged_at": "2025-01-15T15:05:00Z",
  "acknowledged_by": "user@example.com"
}
```

**Requirements:**
- Requires: org_admin or super_admin

---

## 🔧 Service Methods

### TemplateStatusService

#### `process_template_status_update()`

Main entry point for webhook processing.

```python
async def process_template_status_update(
    self,
    waba_id: str,
    template_name: str,
    organization_id: UUID,
    webhook_data: Dict[str, Any]
) -> Optional[WhatsAppTemplate]:
    """
    Process template status update from Meta webhook.
    
    Args:
        waba_id: WhatsApp Business Account ID from webhook
        template_name: Template name from webhook
        organization_id: Organization UUID
        webhook_data: Webhook payload with event, quality_score, etc
    
    Returns:
        Updated WhatsAppTemplate or None if not found
    
    Raises:
        TemplateNotFoundError: If template not found
    """
```

**Logic:**
1. Find template by name in organization
2. Delegate to event-specific handler (APPROVED, DISABLED, etc)
3. Handle side effects (pause campaigns, create alerts)
4. Commit changes to database
5. Broadcast WebSocket update

**Event Handlers:**
- `_handle_approval()` - Set status=APPROVED, quality=UNKNOWN
- `_handle_rejection()` - Set status=REJECTED, store reason
- `_handle_pending()` - Set status=PENDING
- `_handle_disabled()` - Set status=DISABLED, pause campaigns, alert
- `_handle_paused()` - Set status=PAUSED, pause campaigns
- `_handle_quality_change()` - Update quality_score, alert if RED

#### `_pause_dependent_campaigns()`

Auto-pause campaigns using affected template.

```python
async def _pause_dependent_campaigns(self, template: WhatsAppTemplate) -> None:
    """
    Pause all campaigns using this template.
    
    Called when template is disabled or paused by Meta.
    Prevents campaigns from trying to send with disabled templates.
    """
```

**Logic:**
1. Query all ACTIVE campaigns using this template
2. Set `is_active = False` on each campaign
3. Commit changes
4. Log action with campaign IDs

#### `get_critical_templates()`

Query templates requiring attention.

```python
async def get_critical_templates(
    self,
    organization_id: UUID
) -> List[WhatsAppTemplate]:
    """
    Get all templates with status or quality issues.
    
    Returns templates where:
    - status in (DISABLED, PAUSED, REJECTED)
    - quality_score == RED
    - status == PENDING and pending > 48h
    """
```

#### `get_template_quality_summary()`

Get quality metrics summary.

```python
async def get_template_quality_summary(
    self,
    organization_id: UUID
) -> Dict[str, Any]:
    """
    Calculate quality metrics for organization.
    
    Returns:
    {
        "total_templates": int,
        "approved": int,
        "pending": int,
        "rejected": int,
        "disabled": int,
        "paused": int,
        "quality_distribution": {
            "GREEN": int,
            "YELLOW": int,
            "RED": int,
            "UNKNOWN": int
        },
        "avg_success_rate": float,
        "avg_failure_rate": float,
        "total_messages_sent": int,
        "total_messages_failed": int
    }
    """
```

## 📊 Database Queries

### Query: Find template by name

```python
query = select(WhatsAppTemplate).where(
    and_(
        WhatsAppTemplate.name == template_name,
        WhatsAppTemplate.organization_id == organization_id,
        WhatsAppTemplate.deleted_at.is_(None),
    )
)
```

### Query: Find campaigns using template

```python
query = select(Campaign).where(
    and_(
        Campaign.template_id == template_id,
        Campaign.status == "ACTIVE",
        Campaign.deleted_at.is_(None),
    )
)
```

### Query: Get critical templates

```python
query = select(WhatsAppTemplate).where(
    and_(
        WhatsAppTemplate.organization_id == organization_id,
        WhatsAppTemplate.deleted_at.is_(None),
        or_(
            WhatsAppTemplate.status.in_([
                TemplateStatus.DISABLED,
                TemplateStatus.PAUSED,
                TemplateStatus.REJECTED
            ]),
            WhatsAppTemplate.quality_score == QualityScore.RED,
            # pending > 48h
        )
    )
)
```

## ⚙️ Configuration

### Environment Variables

```bash
# Already set in .env
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your_token
WHATSAPP_WEBHOOK_APP_SECRET=your_secret
```

### Webhook Verification

Meta sends signature in header: `X-Hub-Signature-256`

Verification process:
1. Extract signature from header
2. Hash webhook payload with app_secret using SHA256
3. Compare calculated hash with received signature

```python
# Implemented in meta.py line 201-210
def verify_signature(payload: bytes, signature: str, secret: str) -> bool:
    hash_obj = hmac.new(
        secret.encode('utf-8'),
        payload,
        hashlib.sha256
    )
    calculated = f"sha256={hash_obj.hexdigest()}"
    return hmac.compare_digest(calculated, signature)
```

## 🧪 Testing

### Test Coverage Needed

- [ ] Unit tests for each event handler
- [ ] Unit tests for campaign auto-pause logic
- [ ] Integration tests with mock webhooks
- [ ] Test cross-organization isolation
- [ ] Test webhook signature verification
- [ ] Test error handling on missing templates
- [ ] Test failure rate calculations
- [ ] Test quality summary aggregations

### Running Tests

```bash
# All template tests
docker exec pytake-backend pytest tests/test_template_status_endpoints.py -v

# Specific test
docker exec pytake-backend pytest tests/test_template_status_endpoints.py::TestTemplateStatusEndpoints::test_get_critical_templates_empty -v

# With coverage
docker exec pytake-backend pytest tests/test_template_status_endpoints.py --cov=app.services.template_status_service
```

## 🔄 Integration Points

### CampaignService Integration

When template is disabled/paused:
1. Find all active campaigns using template
2. Call `CampaignService.pause_campaign(campaign_id)`
3. Log action in campaign audit trail

```python
# In TemplateStatusService._pause_dependent_campaigns()
from app.services.campaign_service import CampaignService

campaign_service = CampaignService(self.db)
for campaign in campaigns:
    await campaign_service.pause_campaign(
        campaign_id=campaign.id,
        reason=f"Template {template.name} was {event}",
    )
```

### AlertService Integration

When quality score is RED or template is disabled:
1. Create alert with severity=CRITICAL
2. Set organization_id for scoping
3. Include template info in alert data

```python
# In TemplateStatusService._create_quality_alert()
from app.services.alert_service import AlertService

alert_service = AlertService(self.db)
await alert_service.create_alert(
    organization_id=template.organization_id,
    alert_type="TEMPLATE_QUALITY_RED",
    severity="CRITICAL",
    data={
        "template_id": template.id,
        "template_name": template.name,
        "quality_score": template.quality_score,
    },
)
```

### WebSocket Broadcasting

Broadcast real-time updates to connected users:

```python
# In meta.py webhook handler
from app.core.websocket_manager import websocket_manager

await websocket_manager.broadcast_to_organization(
    organization_id=organization_id,
    message={
        "type": "template_status_update",
        "template_id": template.id,
        "status": template.status,
        "quality_score": template.quality_score,
    },
)
```

## 📝 Implementation Checklist

### Phase 1.2 - Core Webhook Processing

- [x] Create TemplateStatusService with event handlers
- [x] Create WebhookService integration method
- [x] Update webhook handler (meta.py)
- [x] Implement campaign auto-pause logic
- [x] Create API endpoints for monitoring
- [x] Create test scaffolds
- [ ] Complete tests (unit + integration)
- [ ] Implement AuditLog for full history
- [ ] Test all event types thoroughly

### Phase 1.2.1 - Alert System Integration

- [ ] Create AlertService
- [ ] Implement RED quality alert creation
- [ ] Implement disabled template alert creation
- [ ] Test alert creation on webhook events
- [ ] Create alert management endpoints

### Phase 1.2.2 - Notifications

- [ ] Implement email notifications
- [ ] Implement Slack notifications
- [ ] Test notification delivery
- [ ] Create notification preferences endpoint

### Phase 1.2.3 - Audit & Compliance

- [ ] Create AuditLog model
- [ ] Log all template status changes
- [ ] Create audit trail query methods
- [ ] Test audit logging accuracy

## 🐛 Known Issues & TODOs

| Issue | Severity | Action |
|-------|----------|--------|
| AuditLog not implemented | Medium | Needed for full status history |
| AlertService not integrated | Medium | Implement after Phase 1.2.1 |
| Notification system missing | Medium | Implement after 1.2.2 |
| Campaign auto-pause not tested | High | Write integration tests |
| WABA ID lookup edge cases | Medium | Handle missing numbers gracefully |

## 📞 Webhook Examples

### Example 1: Template Approved

```json
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "123456789",
      "changes": [
        {
          "value": {
            "event": "APPROVED",
            "message_template_id": "1234567890",
            "message_template_name": "hello_world",
            "waba_id": "987654321"
          },
          "field": "message_template_status_update"
        }
      ]
    }
  ]
}
```

### Example 2: Template Quality Change

```json
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "123456789",
      "changes": [
        {
          "value": {
            "event": "QUALITY_CHANGE",
            "quality_score": "RED",
            "quality_score_reason": ["HIGH_FAILURE_RATE"],
            "message_template_id": "1234567890",
            "message_template_name": "hello_world",
            "waba_id": "987654321"
          },
          "field": "message_template_status_update"
        }
      ]
    }
  ]
}
```

### Example 3: Template Disabled

```json
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "123456789",
      "changes": [
        {
          "value": {
            "event": "DISABLED",
            "reason": "QUALITY_ISSUES",
            "message_template_id": "1234567890",
            "message_template_name": "hello_world",
            "waba_id": "987654321"
          },
          "field": "message_template_status_update"
        }
      ]
    }
  ]
}
```

## 🔐 Security Considerations

### Multi-Tenancy

All queries filter by `organization_id`:
```python
WhatsAppTemplate.organization_id == organization_id
```

### RBAC

- Critical endpoints require `org_admin` or `super_admin` role
- User can only access templates from their organization
- Verified via `get_current_user` and `get_current_admin` dependencies

### Webhook Verification

- HMAC-SHA256 signature verification on every webhook
- Timestamp validation (future)
- Replay attack prevention (future)

## 📈 Performance Considerations

### Database Queries

- Indexed queries on `organization_id`, `template_id`, `status`
- Bulk campaign pause operation (batch update)
- Cached quality summary (consider Redis)

### Webhooks

- Process webhooks asynchronously (Celery task)
- Batch process multiple template updates
- Implement exponential backoff on DB errors

## 🚀 Next Steps

1. **Complete tests** - Write and run full test suite
2. **Alert integration** - Connect to AlertService (Phase 1.2.1)
3. **Notification system** - Email/Slack notifications (Phase 1.2.2)
4. **Audit logging** - Implement AuditLog model (Phase 1.2.3)
5. **Dashboard** - Create UI for monitoring
6. **Phase 1.3** - 24h window validation

## 📚 References

- [Meta Cloud API Webhooks](https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/overview)
- [Template Status Update Events](https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/components)
- [Quality Score Documentation](https://developers.facebook.com/docs/whatsapp/cloud-api/phone-numbers/manage-quality-rating)

---

**Last Updated:** 2025-01-15 15:30 UTC  
**Version:** 1.0  
**Author:** Kayo Carvalho Fernandes
