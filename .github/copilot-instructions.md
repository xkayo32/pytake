## Copilot Instructions — PyTake

### 🧠 MCP Tools (MANDATORY)

**MCP Thinking:** Use before complex features/fixes
- Structure: Analysis → Plan → Implementation → Validation

**MCP Memory:** Store critical context that is easily lost:
- API routes (path + method + auth)
- Authentication schemas (header names, token format)
- Critical env vars (exact names, defaults)
- Business rules (validations, limits)
- Multi-tenancy queries (mandatory org_id filters)

**Query memory before:** creating routes, modifying auth, generating migrations

---

### 🎯 Critical Rules

**Multi-tenancy (MANDATORY):**
```python
# ❌ WRONG
users = await db.execute(select(User))

# ✅ CORRECT
users = await db.execute(
  select(User).where(User.organization_id == org_id)
)
```

**Layering:** `Route → Service → Repository`
- Routes: validation + service call
- Services: business logic
- Repositories: pure CRUD

**Migrations:** NEVER edit applied migrations — create new one

---

### 👤 Author Attribution (MANDATORY)

Always attribute to **Kayo Carvalho Fernandes**, NEVER mention AI/Copilot:
- Commits: `feat: ... | Author: Kayo Carvalho Fernandes`
- PRs/Docs: Sign with full name
