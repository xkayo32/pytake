# 📋 PHASE 2 - Implementation Plan

**Phase 2 Goal:** Advanced template management with category tracking, quality monitoring, and versioning  
**Total Duration:** 37 hours  
**Branch:** `feature/meta-templates-phase2-enhancements` (to be created)  
**Author:** Kayo Carvalho Fernandes  
**Date Started:** 15 December 2025

---

## 📊 Phase 2 Overview

```
Phase 2.1: allow_category_change Flag      [10h] ▒░░░░░░░░░░░░░░░░░░
├─ 2h: Migration + Model
├─ 3h: CategoryChangeDetectionService
├─ 2h: Webhook handler + Meta integration
├─ 1.5h: REST endpoints
└─ 1.5h: Tests (unit + integration + E2E)

Phase 2.2: Quality Score Monitoring        [12h] ▒░░░░░░░░░░░░░░░░░░
├─ 2h: Migration + Model (quality_score_history)
├─ 3h: TemplateHealthService
├─ 2h: Celery Beat scheduler
├─ 2h: Dashboard/metrics endpoints
├─ 2h: Alert triggering + notification
└─ 1h: Tests

Phase 2.3: Template Versioning             [15h] ▒░░░░░░░░░░░░░░░░░░
├─ 2h: Migrations + Models
├─ 2.5h: TemplateVersioningService
├─ 2.5h: Repository + CRUD
├─ 2h: REST API endpoints
├─ 2h: Version diff/comparison
├─ 2.5h: Tests
└─ 1.5h: Documentation

TOTAL PHASE 2: 37h
```

---

## 🎯 Phase 2.1 - `allow_category_change` Flag (10h)

### Objective
Detect and track template category changes from Meta's Cloud API. Implement flag to allow/disallow category changes with automatic alerting.

### Why This Matters
- Meta templates have categories (MARKETING, TRANSACTIONAL, OTP)
- Categories restrict usage and quotas
- Unexpected category changes indicate API issues or account problems
- Need early warning system

### Deliverables
1. **Migration:** Add `allow_category_change` flag and category tracking fields
2. **Model:** Update `WhatsAppTemplate` with:
   - `allow_category_change: bool` (default: False)
   - `meta_reported_category: str` (last known category from Meta)
   - `category_changed_at: datetime` (tracking)
3. **Service:** `CategoryChangeDetectionService` (new)
   - `detect_category_change()` - compare stored vs Meta category
   - `process_category_change_event()` - webhook handler
   - `validate_category_before_save()` - pre-check
4. **Webhook Handler:** `app/services/webhook_service.py`
   - Event: `message_template_category_update`
   - Validates `allow_category_change` flag
   - Creates HIGH severity alert if change not allowed
5. **REST Endpoints:**
   - `GET /templates/{id}/category-info` - get current category info
   - `PATCH /templates/{id}/allow-category-change` - toggle flag
   - `GET /templates/category-changes-history` - category change audit trail
6. **Tests:**
   - Unit tests for detection logic
   - Webhook integration tests
   - E2E scenarios (flag=true, flag=false cases)
   - Multi-tenancy verification

### Implementation Details

#### Migration (2h)
```python
# Migration: 005_add_category_change_tracking.py
def upgrade():
    op.add_column('whatsapp_template', 
        Column('allow_category_change', Boolean, default=False))
    op.add_column('whatsapp_template', 
        Column('meta_reported_category', String(50), nullable=True))
    op.add_column('whatsapp_template',
        Column('category_changed_at', DateTime(timezone=True), nullable=True))
    op.add_column('whatsapp_template',
        Column('category_change_alert_sent', Boolean, default=False))
    
    # Create index for quick lookups
    op.create_index('ix_whatsapp_template_category_changed_at',
                   'whatsapp_template', ['category_changed_at'])
```

#### Model Updates (included in migration)
```python
class WhatsAppTemplate(Base, SoftDeleteMixin):
    # ... existing fields ...
    allow_category_change: bool = Field(default=False)
    meta_reported_category: str | None = Field(None, max_length=50)
    category_changed_at: datetime | None = Field(None)
    category_change_alert_sent: bool = Field(default=False)
```

#### Service: CategoryChangeDetectionService (3h)
```python
# app/services/category_change_detection_service.py
class CategoryChangeDetectionService:
    async def detect_category_change(self, template: WhatsAppTemplate, 
                                    meta_category: str) -> bool:
        """Compare stored category vs Meta's reported category."""
        
    async def process_category_change_event(self, org_id: UUID,
                                           template_id: UUID,
                                           meta_category: str):
        """Webhook handler for category change events."""
        
    async def validate_category_before_save(self, template: WhatsAppTemplate,
                                           new_category: str) -> bool:
        """Check if category change is allowed before saving."""
        
    async def create_category_change_alert(self, template: WhatsAppTemplate,
                                          old_category: str,
                                          new_category: str):
        """Create HIGH severity alert for category change."""
```

#### Webhook Handler (2h)
Event: `message_template_category_update`
```python
# In webhook_service.py
async def process_message_template_category_update(self, data: dict):
    """
    Process Meta webhook for template category changes.
    Event: message_template_category_update
    """
    template_id = data['template_id']
    new_category = data['category']
    
    template = await template_repo.get_by_id(template_id, org_id)
    if not template.allow_category_change:
        await alert_service.create_alert(
            org_id, "CATEGORY_CHANGE_BLOCKED",
            f"Template {template.name} category changed to {new_category}"
        )
        return  # Don't update
    
    await category_service.process_category_change_event(...)
```

#### REST Endpoints (1.5h)
```python
# app/api/v1/endpoints/templates.py

@router.get("/templates/{id}/category-info")
async def get_template_category_info(
    id: UUID,
    current_org: Organization = Depends(get_current_organization)
):
    """Get template category info and change history."""

@router.patch("/templates/{id}/allow-category-change")
async def toggle_category_change_flag(
    id: UUID,
    allow: bool,
    current_user: User = Depends(require_role(["org_admin"]))
):
    """Toggle allow_category_change flag."""

@router.get("/templates/category-changes")
async def get_category_changes_history(
    org_id: UUID = Depends(get_current_organization),
    skip: int = 0,
    limit: int = 20
):
    """Get category change audit trail for organization."""
```

#### Tests (1.5h)
```python
# backend/tests/test_phase_2_1_category_change.py

class TestCategoryChangeDetection:
    - test_detect_category_change_returns_true_when_different
    - test_detect_category_change_returns_false_when_same
    - test_process_category_change_creates_alert_if_not_allowed
    - test_process_category_change_updates_if_allowed
    
class TestCategoryChangeWebhook:
    - test_webhook_handler_blocks_change_when_flag_false
    - test_webhook_handler_allows_change_when_flag_true
    - test_webhook_handler_validates_org_id
    - test_webhook_handler_error_handling
    
class TestCategoryChangeEndToEnd:
    - test_scenario_flag_false_blocks_change
    - test_scenario_flag_true_allows_change
    - test_audit_trail_tracking
    
class TestCategoryChangeMultiTenancy:
    - test_org_isolation_in_alerts
    - test_org_isolation_in_flag_updates
```

### Success Criteria
- ✅ Migration applies without errors
- ✅ Model fields properly tracked
- ✅ Service detects category changes
- ✅ Webhook handler processes events
- ✅ Alerts created when flag=false
- ✅ All 15+ tests passing
- ✅ Multi-tenancy verified
- ✅ Zero data leakage between orgs

### Timeline
- 1.5h: Migration + Model
- 1h: Service implementation
- 0.5h: Service refinement
- 1.5h: Webhook + endpoints
- 1.5h: Tests
- 0.5h: Documentation + review

---

## 🎯 Phase 2.2 - Quality Score Monitoring (12h)

### Objective
Continuously monitor template quality scores and trigger proactive alerts before templates are disabled.

### Why This Matters
- Quality scores (GREEN/YELLOW/RED) affect message deliverability
- RED scores lead to templates being DISABLED by Meta
- Early warning allows corrective action
- Monitoring trends helps identify spam patterns

### Deliverables
1. **Migration:** Create `quality_score_history` table for temporal tracking
2. **Model:** Add quality tracking fields to `WhatsAppTemplate`
3. **Service:** `TemplateHealthService` for quality analysis
4. **Scheduler:** Celery Beat task (every 6 hours) to check quality
5. **Dashboard Endpoints:** Quality metrics and trends
6. **Alert System:** Automatic alerts for quality degradation
7. **Tests:** Comprehensive test coverage

### Implementation Details
- Quality history snapshots every 6 hours
- Trend analysis: improving vs degrading
- Alert thresholds: GREEN→YELLOW, YELLOW→RED
- Dashboard API for metrics visualization
- Multi-tenancy: Org-level quality aggregation

### Success Criteria
- ✅ Quality scores tracked historically
- ✅ Scheduler runs every 6 hours
- ✅ Alerts triggered for degradation
- ✅ Dashboard endpoints working
- ✅ 15+ tests passing
- ✅ Zero performance impact

---

## 🎯 Phase 2.3 - Template Versioning (15h)

### Objective
Support template versions when content/variables/language changes with rollback capability.

### Why This Matters
- Templates evolve over time
- Need to track what changed and when
- Rollback to previous versions when needed
- Audit trail for compliance

### Deliverables
1. **Migration:** Create `template_version` table
2. **Model:** `TemplateVersion` model with version tracking
3. **Service:** `TemplateVersioningService` for version management
4. **Repository:** `TemplateVersionRepository` for CRUD
5. **API Endpoints:** Version list, get, rollback, compare
6. **Version Diff:** Compare two versions side-by-side
7. **Tests:** Comprehensive test coverage

### Implementation Details
- Auto-version on template content changes
- Version number increments (v1, v2, etc)
- Store full version history with deltas
- Rollback with integrity checks
- Version comparison/diff functionality

### Success Criteria
- ✅ Versions created on changes
- ✅ Rollback working correctly
- ✅ Version comparison working
- ✅ 20+ tests passing
- ✅ Performance acceptable
- ✅ Zero data loss on rollback

---

## 🔄 Integration Points

### Celery Integration
- Phase 2.2 adds new periodic task to beat_schedule
- Reuses existing celery_app and beat scheduler
- Follows Phase 1.3 patterns

### Database
- 3 new migrations: category_change_tracking, quality_score_history, template_versions
- All use organization_id as partition key
- PostgreSQL indexes for performance

### Webhook Handler
- Phase 2.1 adds message_template_category_update event
- Reuses existing webhook processing pattern from Phase 1.2

### Alert System
- Reuses existing alert infrastructure from Phase 1.2
- Creates HIGH/MEDIUM/LOW severity alerts

### Repository Pattern
- Follows existing BaseRepository pattern
- Multi-tenancy filters on all queries
- Soft delete support where applicable

---

## 🧪 Testing Strategy

### Per Sub-Phase Testing
1. **Unit Tests:** Service logic in isolation
2. **Integration Tests:** Service + Repository + Database
3. **E2E Tests:** Full flow scenarios
4. **Multi-tenancy Tests:** Org isolation verification
5. **Performance Tests:** Query optimization

### Test Organization
```
backend/tests/
├── test_phase_2_1_category_change.py       (15 tests)
├── test_phase_2_2_quality_monitoring.py    (16 tests)
├── test_phase_2_3_template_versioning.py   (18 tests)
└── test_phase_2_integration_complete.py    (comprehensive validation)
```

---

## 📝 Documentation

### Per Sub-Phase Documentation
1. Architecture diagrams
2. Implementation guide
3. Deployment instructions
4. Troubleshooting guide
5. API documentation (auto-generated from Swagger)

### Files to Create
```
docs/
├── PHASE_2_1_CATEGORY_CHANGE.md
├── PHASE_2_2_QUALITY_MONITORING.md
├── PHASE_2_3_TEMPLATE_VERSIONING.md
└── PHASE_2_INTEGRATION_GUIDE.md
```

---

## 🚀 Deployment Checklist

### Pre-Deployment
- [ ] All tests passing (100%)
- [ ] Code review approved
- [ ] Database migrations validated
- [ ] Performance tested
- [ ] Multi-tenancy verified
- [ ] Monitoring/alerts configured

### Deployment
- [ ] Create backup of production database
- [ ] Apply migrations in staging
- [ ] Run smoke tests in staging
- [ ] Deploy to production
- [ ] Run migrations in production
- [ ] Verify all services running
- [ ] Monitor for 24 hours

### Post-Deployment
- [ ] Verify metrics in dashboard
- [ ] Check alert system
- [ ] Monitor error logs
- [ ] Validate multi-tenancy isolation
- [ ] Performance metrics within SLAs

---

## 📅 Timeline

**Week 1 (Dec 16-20):**
- Mon-Wed: Phase 2.1 implementation (category change flag)
- Wed-Fri: Phase 2.1 testing + review

**Week 2 (Dec 23-27):**
- Mon-Tue: Phase 2.2 implementation (quality monitoring)
- Wed-Thu: Phase 2.2 testing + review
- Fri: Phase 2.3 kickoff

**Week 3 (Dec 30 - Jan 3):**
- Mon-Wed: Phase 2.3 implementation (template versioning)
- Thu-Fri: Phase 2.3 testing + review + final validation

---

## 🎯 Success Metrics

### Code Quality
- [ ] 100% test coverage for new code
- [ ] Zero critical issues in code review
- [ ] All multi-tenancy checks passing
- [ ] RBAC enforced in all endpoints

### Performance
- [ ] Query response < 200ms (p99)
- [ ] Webhook processing < 1s
- [ ] Scheduler overhead < 5% CPU
- [ ] Database query optimization verified

### Reliability
- [ ] All tests passing (100%)
- [ ] Zero data loss scenarios
- [ ] Error handling comprehensive
- [ ] Monitoring/alerting in place

### Production Readiness
- [ ] Documentation complete
- [ ] Deployment guide tested
- [ ] Rollback procedure verified
- [ ] Team trained on new features

---

## Author & Tracking

**Author:** Kayo Carvalho Fernandes  
**Status:** 🟡 IN PROGRESS - Phase 2.1 Ready to Start  
**Branch:** feature/meta-templates-phase2-enhancements  
**Last Updated:** 15 December 2025
