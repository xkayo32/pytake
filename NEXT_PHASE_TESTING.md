# 🚀 Next Phase - Unit & Integration Tests

**Status:** Ready to Start  
**Estimated Time:** 4 hours  
**Goal:** Write and run comprehensive tests for Phase 1.2

---

## 📌 Overview

This phase focuses on validating the Phase 1.2 implementation through comprehensive testing. The test framework is already scaffolded; we just need to implement the test logic.

---

## 📋 What Needs to Be Done

### Test File Location
`backend/tests/test_template_status_endpoints.py` (300+ lines scaffolded)

### Test Classes to Implement

#### 1. TestTemplateStatusService (3 test methods)
```python
async def test_get_critical_templates_empty(self):
    """Test: No critical templates when all are healthy"""

async def test_get_critical_templates_with_issues(self):
    """Test: Returns only templates with DISABLED/PAUSED/RED status"""

async def test_get_template_quality_summary(self):
    """Test: Quality summary calculation is accurate"""
```

#### 2. TestTemplateStatusEndpoints (8 test methods)
```python
async def test_get_critical_templates_endpoint(self):
    """Test: GET /templates/critical endpoint"""

async def test_get_critical_templates_cross_org_isolation(self):
    """Test: Organization A cannot see Organization B's templates"""

async def test_get_quality_summary_endpoint(self):
    """Test: GET /templates/quality-summary endpoint"""

async def test_get_quality_summary_requires_admin(self):
    """Test: Requires org_admin or super_admin role"""

async def test_get_status_history_endpoint(self):
    """Test: GET /templates/{id}/status-history endpoint"""

async def test_acknowledge_alert_endpoint(self):
    """Test: POST /templates/{id}/acknowledge-alert endpoint"""

async def test_webhook_approved_event_full_flow(self):
    """Test: Complete flow from webhook → processing → database"""

async def test_webhook_disabled_event_pauses_campaigns(self):
    """Test: DISABLED event triggers campaign auto-pause"""
```

---

## 🧪 Test Structure Template

Each test should follow this pattern:

```python
async def test_example_name(self):
    """
    Test: Brief description of what is tested
    
    Given: Initial state setup
    When: Action is performed
    Then: Expected outcome
    """
    # SETUP: Create test data
    org = await create_organization(self.db)
    user = await create_user(self.db, org)
    number = await create_whatsapp_number(self.db, org)
    template = await create_template(self.db, org, number, status="APPROVED", quality="GREEN")
    
    # ACTION: Call the method being tested
    result = await self.service.get_critical_templates(org.id)
    
    # ASSERT: Verify the result
    assert len(result) == 0  # No critical templates (all healthy)
```

---

## 🛠️ Setup & Fixtures

The test file already has:

```python
@pytest.fixture
async def db_session():
    """Create async test database"""

@pytest.fixture
async def org(db_session):
    """Create test organization"""

@pytest.fixture
async def user(db_session, org):
    """Create test user with org_admin role"""

@pytest.fixture
async def whatsapp_number(db_session, org):
    """Create WhatsApp number for org"""

@pytest.fixture
async def template_approved(db_session, org, whatsapp_number):
    """Create APPROVED template"""

@pytest.fixture
async def template_disabled(db_session, org, whatsapp_number):
    """Create DISABLED template"""

@pytest.fixture
async def template_red_quality(db_session, org, whatsapp_number):
    """Create template with RED quality score"""
```

---

## ✅ Test Checklist

### Unit Tests to Implement

- [ ] `test_get_critical_templates_empty` - No critical templates
- [ ] `test_get_critical_templates_with_disabled` - Find DISABLED templates
- [ ] `test_get_critical_templates_with_red_quality` - Find RED quality templates
- [ ] `test_get_template_quality_summary` - Aggregation calculation
- [ ] `test_quality_change_to_red_creates_alert` - Quality change detection
- [ ] `test_pause_dependent_campaigns` - Campaign auto-pause logic
- [ ] `test_cross_organization_isolation` - Org A can't see Org B
- [ ] `test_webhook_signature_verification` - HMAC verification

### Integration Tests

- [ ] `test_webhook_approved_complete_flow` - Webhook → Service → DB
- [ ] `test_webhook_disabled_campaign_pause` - DISABLED → Pause campaigns
- [ ] `test_quality_alert_creation_on_red` - RED quality → Alert

### Performance Tests

- [ ] `test_query_performance_large_template_set` - Handles 1000+ templates
- [ ] `test_query_performance_large_campaign_pause` - Pauses 100+ campaigns

---

## 🧬 Key Test Cases

### Critical Templates Query
```
Given: 10 approved templates with GREEN quality
When: Call get_critical_templates()
Then: Returns empty list (0 critical)

Given: 1 approved + 1 disabled + 1 red quality
When: Call get_critical_templates()
Then: Returns 2 (disabled + red)
```

### Campaign Auto-Pause
```
Given: Template with 3 active campaigns
When: Template status changes to DISABLED
Then: All 3 campaigns paused (is_active = False)
     AND campaigns log contains pause reason
```

### Quality Summary
```
Given: 10 templates with mixed status/quality
When: Call get_template_quality_summary()
Then: Returns object with:
      - total_templates: 10
      - approved: 7
      - quality_distribution: {GREEN: 5, YELLOW: 2, RED: 1, UNKNOWN: 2}
```

### Cross-Organization Isolation
```
Given: Org A with 5 templates, Org B with 3 templates
When: Query org A's critical templates
Then: Only sees Org A's templates (not Org B's)
```

---

## 🚀 Running Tests

### Run All Tests
```bash
docker exec pytake-backend pytest tests/test_template_status_endpoints.py -v
```

### Run Specific Test
```bash
docker exec pytake-backend pytest \
  tests/test_template_status_endpoints.py::TestTemplateStatusService::test_get_critical_templates_empty \
  -v
```

### Run with Coverage
```bash
docker exec pytake-backend pytest \
  tests/test_template_status_endpoints.py \
  --cov=app.services.template_status_service \
  --cov-report=term-missing
```

### Watch Mode (re-run on changes)
```bash
docker exec pytake-backend pytest-watch tests/test_template_status_endpoints.py -- -v
```

---

## 📊 Expected Coverage

Target: 80%+ code coverage for:
- `app.services.template_status_service` - All event handlers covered
- `app.api.v1.endpoints.whatsapp` - All endpoint methods covered
- `app.services.webhook_service` - Template status method covered

---

## 🔧 Troubleshooting

### Test Error: "organization_id not found"
**Fix:** Ensure all fixture creation includes organization_id

### Test Error: "FK constraint violation"
**Fix:** Create parent objects before child objects (org → number → template → campaign)

### Test Error: "AsyncSession not closed properly"
**Fix:** Use `async with` context manager or fixture cleanup

### Test Error: "Template not found"
**Fix:** Commit changes to session after insert: `await self.db.commit()`

---

## 📝 Test Metrics

After running tests, check:
- [ ] All tests passing (green checkmark)
- [ ] Coverage ≥ 80%
- [ ] No deprecation warnings
- [ ] No SQL errors in logs
- [ ] Execution time < 30 seconds

---

## ✨ Next Steps After Testing

1. **Fix any failing tests** - Debug and correct
2. **Improve coverage** - Add tests for edge cases
3. **Performance optimization** - If tests are slow
4. **Code review** - Self-review test code
5. **Commit** - `git commit -m "test: Phase 1.2 unit and integration tests"`

---

## 📚 Reference

### Test Framework
- **Framework:** pytest + pytest-asyncio
- **Database:** SQLAlchemy async + in-memory SQLite
- **Fixtures:** Factory pattern with auto-cleanup

### Assertions
```python
assert result is not None
assert len(result) == expected_count
assert result[0].status == "DISABLED"
assert result[0].quality_score == "RED"
```

### Common Patterns
```python
# Create and save entity
entity = Model(...)
db.add(entity)
await db.commit()
await db.refresh(entity)

# Query entity
stmt = select(Model).where(Model.id == entity_id)
result = await db.execute(stmt)
entity = result.scalars().first()

# Update entity
entity.status = "NEW_STATUS"
await db.commit()
await db.refresh(entity)
```

---

**Ready to start testing!** 🧪✅

Next: Implement test methods in `backend/tests/test_template_status_endpoints.py`
