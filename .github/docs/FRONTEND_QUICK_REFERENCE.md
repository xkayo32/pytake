# 🚀 Frontend Multi-Environment - Quick Reference

**Status:** ✅ Complete  
**Date:** November 2025  
**User Issue:** Frontend routing for staging/dev not documented → RESOLVED

---

## 📌 TL;DR (Too Long; Didn't Read)

3 frontends running simultaneously, each on different port + domain:

| Environment | Domain | Port | API |
|-------------|--------|------|-----|
| Production | `app.pytake.net` | 3000 | `api.pytake.net` |
| Staging | `app-staging.pytake.net` | 3001 | `api-staging.pytake.net` |
| Development | `app-dev.pytake.net` | 3002 | `api-dev.pytake.net` |

---

## 🔧 Quick Setup (Copy-Paste)

### 1. Configure DNS (registrar)
```dns
api.pytake.net              A your.ip
api-staging.pytake.net      A your.ip
api-dev.pytake.net          A your.ip
app.pytake.net              A your.ip
app-staging.pytake.net      A your.ip
app-dev.pytake.net          A your.ip
```

### 2. Generate SSL
```bash
sudo certbot certonly --standalone \
  -d api.pytake.net \
  -d api-staging.pytake.net \
  -d api-dev.pytake.net \
  -d app.pytake.net \
  -d app-staging.pytake.net \
  -d app-dev.pytake.net
```

### 3. Start Services
```bash
cd /home/administrator/pytake
podman compose up -d
```

### 4. Verify
```bash
curl https://app.pytake.net
curl https://app-staging.pytake.net
curl https://app-dev.pytake.net
```

---

## 📖 Documentation

| Document | Purpose |
|----------|---------|
| **MULTI_FRONTEND_SETUP.md** | 👈 Start here (650+ lines) |
| **FRONTEND_ROUTES.md** | Environment variables reference |
| **SETUP_CHECKLIST.md** | Full setup guide with timeline |
| **PHASE_16_FRONTEND_COMPLETION.md** | What was completed |
| **VALIDATION_REPORT_PHASE_16.md** | Validation details |

---

## 🏗️ Architecture

```
Frontend Staging (port 3001)
├─ Domain: app-staging.pytake.net
├─ API: api-staging.pytake.net
├─ Port: 3001 on host → 3000 in container
└─ Container: frontend-staging

       ↓ (Nginx proxy)

Frontend Production (port 3000)
├─ Domain: app.pytake.net
├─ API: api.pytake.net
├─ Port: 3000 on host → 3000 in container
└─ Container: frontend-prod

Backend is similar (8000, 8001, 8002)
```

---

## ⚙️ Environment Variables

Set these in docker-compose for each frontend:

**For frontend-prod:**
```env
NEXT_PUBLIC_API_URL=https://api.pytake.net
NEXT_PUBLIC_WS_URL=wss://api.pytake.net
NEXT_PUBLIC_APP_URL=https://app.pytake.net
```

**For frontend-staging:**
```env
NEXT_PUBLIC_API_URL=https://api-staging.pytake.net
NEXT_PUBLIC_WS_URL=wss://api-staging.pytake.net
NEXT_PUBLIC_APP_URL=https://app-staging.pytake.net
```

**For frontend-dev:**
```env
NEXT_PUBLIC_API_URL=https://api-dev.pytake.net
NEXT_PUBLIC_WS_URL=wss://api-dev.pytake.net
NEXT_PUBLIC_APP_URL=https://app-dev.pytake.net
```

---

## 🔍 Nginx Verification

Check all 6 domains configured:

```bash
# Should show 6 entries (3 APIs + 3 frontends)
grep "server_name" nginx/nginx-subdomains.conf | grep -v "^#"

# Expected (from HTTP redirect block):
# server_name api.pytake.net api-staging.pytake.net api-dev.pytake.net app.pytake.net app-staging.pytake.net app-dev.pytake.net;
```

---

## 🧪 Test Each Frontend

```bash
# Production
curl -i https://app.pytake.net

# Staging
curl -i https://app-staging.pytake.net

# Development
curl -i https://app-dev.pytake.net
```

All should respond with HTTP 200 + HTML content.

---

## 🐛 Troubleshooting

### Frontend not loading
```bash
podman logs pytake-frontend-staging
# Check NEXT_PUBLIC_API_URL is set correctly
podman inspect pytake-frontend-staging | grep -A 5 Env
```

### API not responding
```bash
curl http://localhost:8001  # Direct to backend port
curl https://api-staging.pytake.net  # Through Nginx
```

### Port already in use
```bash
lsof -i :3001
# Kill process if needed
sudo kill -9 <PID>
```

---

## 📊 Files Modified/Created

```
✅ nginx/nginx-subdomains.conf         [Updated - added 2 frontend blocks]
✅ docs/MULTI_FRONTEND_SETUP.md        [NEW - 650+ lines]
✅ docs/FRONTEND_ROUTES.md             [Updated - added reference]
✅ docs/PHASE_16_FRONTEND_COMPLETION.md [NEW - completion summary]
✅ SETUP_CHECKLIST.md                  [Updated - DNS & SSL sections]
✅ docs/DOCUMENTATION_INDEX.md         [Updated - deployment section]
✅ docs/VALIDATION_REPORT_PHASE_16.md  [NEW - this validation]
```

---

## 🎯 What This Solves

**Problem:** "não vejo nas docs... sobre as rotas do front de staging e dev"

**Solution:** All frontend routes now documented:
- ✅ Production frontend: app.pytake.net
- ✅ Staging frontend: app-staging.pytake.net
- ✅ Development frontend: app-dev.pytake.net
- ✅ Port mapping strategy explained
- ✅ Nginx configuration verified
- ✅ Docker Compose examples provided
- ✅ Environment variables documented
- ✅ Troubleshooting guide included

---

## 🚀 Next Step for User

1. Read: `docs/MULTI_FRONTEND_SETUP.md` (complete guide)
2. Config DNS (6 domains)
3. Generate SSL (6 domains)
4. Run: `podman compose up -d`
5. Verify: 6 curl commands
6. Done! 🎉

---

**Everything you need is documented. No more missing frontend routes! 🎊**

