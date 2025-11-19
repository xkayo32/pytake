# ✅ Phase 16 - Action Checklist for User

**Date:** November 2025  
**Status:** ✅ Documentation Complete - User Actions Required  
**Estimated Time:** 2-3 hours

---

## 📋 Pre-Deployment Checklist

### Documentation Review (30 min)
- [ ] Read `FRONTEND_QUICK_REFERENCE.md` (5 min)
- [ ] Read `docs/MULTI_FRONTEND_SETUP.md` (25 min)
- [ ] Understand the 3-frontend architecture
- [ ] Review port mapping strategy (3000, 3001, 3002)

### File Verification (10 min)
- [ ] Verify `nginx/nginx-subdomains.conf` has 6 domains
  ```bash
  grep "server_name" nginx/nginx-subdomains.conf | grep -v "^#"
  ```
- [ ] Verify `SETUP_CHECKLIST.md` shows 6 DNS entries
- [ ] Review `docs/PHASE_16_FRONTEND_COMPLETION.md`

---

## 🔧 Deployment Steps

### Step 1: DNS Configuration (1-2 hours)

**What:** Configure 6 subdomains with your registrar  
**Time:** 1-2 hours (DNS propagation takes time)

[ ] Log into your domain registrar (GoDaddy, Cloudflare, Route 53, etc.)

[ ] Add 6 DNS A records:
```
Record Type    Hostname                    Points To
─────────────────────────────────────────────────────────
A              api.pytake.net              YOUR.SERVER.IP
A              api-staging.pytake.net      YOUR.SERVER.IP
A              api-dev.pytake.net          YOUR.SERVER.IP
A              app.pytake.net              YOUR.SERVER.IP
A              app-staging.pytake.net      YOUR.SERVER.IP
A              app-dev.pytake.net          YOUR.SERVER.IP
```

[ ] Wait for DNS propagation (typically 15-30 min, up to 24 hours)

[ ] Verify DNS is working:
```bash
nslookup api.pytake.net
nslookup app.pytake.net
nslookup app-staging.pytake.net
# etc.
```

---

### Step 2: SSL Certificate Generation (15 min)

**What:** Generate single SSL certificate for all 6 domains  
**Time:** 15 minutes

[ ] Ensure port 80 is open on your server

[ ] Run certbot:
```bash
sudo certbot certonly --standalone \
  -d api.pytake.net \
  -d api-staging.pytake.net \
  -d api-dev.pytake.net \
  -d app.pytake.net \
  -d app-staging.pytake.net \
  -d app-dev.pytake.net
```

[ ] Verify certificate was created:
```bash
sudo ls -la /etc/letsencrypt/live/api.pytake.net/
# Should show: fullchain.pem, privkey.pem, etc.
```

---

### Step 3: Start Services (5 min)

**What:** Start all containers with docker-compose  
**Time:** 5 minutes

[ ] Navigate to project root:
```bash
cd /home/administrator/pytake
```

[ ] Start all services:
```bash
podman compose up -d
# Or: docker-compose up -d
```

[ ] Wait for containers to start (30 seconds)

[ ] Verify all containers are running:
```bash
podman ps
# Should show: pytake-frontend-prod, pytake-frontend-staging, 
#              pytake-frontend-dev, pytake-backend-*, nginx, postgres, redis
```

---

### Step 4: Health Checks (10 min)

**What:** Verify all 6 endpoints are responding  
**Time:** 10 minutes

#### Frontend Health Checks
[ ] Test Production Frontend:
```bash
curl -i https://app.pytake.net
# Expected: HTTP 200, HTML content
```

[ ] Test Staging Frontend:
```bash
curl -i https://app-staging.pytake.net
# Expected: HTTP 200, HTML content
```

[ ] Test Development Frontend:
```bash
curl -i https://app-dev.pytake.net
# Expected: HTTP 200, HTML content
```

#### API Health Checks
[ ] Test Production API:
```bash
curl -i https://api.pytake.net/api/v1/docs
# Expected: HTTP 200, Swagger docs
```

[ ] Test Staging API:
```bash
curl -i https://api-staging.pytake.net/api/v1/docs
# Expected: HTTP 200, Swagger docs
```

[ ] Test Development API:
```bash
curl -i https://api-dev.pytake.net/api/v1/docs
# Expected: HTTP 200, Swagger docs
```

---

### Step 5: Functional Testing (30 min)

**What:** Test actual frontend functionality  
**Time:** 30 minutes

#### Production Environment
[ ] Open browser: https://app.pytake.net
- [ ] Page loads without errors
- [ ] Can log in
- [ ] API calls succeed
- [ ] WebSocket connection works (real-time features)

#### Staging Environment
[ ] Open browser: https://app-staging.pytake.net
- [ ] Page loads without errors
- [ ] Can log in with staging credentials
- [ ] API calls succeed
- [ ] WebSocket connection works

#### Development Environment
[ ] Open browser: https://app-dev.pytake.net
- [ ] Page loads without errors
- [ ] Can log in with dev credentials
- [ ] API calls succeed
- [ ] WebSocket connection works

---

### Step 6: Container Logs Review (10 min)

**What:** Check for any errors in container logs  
**Time:** 10 minutes

[ ] Check Nginx logs:
```bash
podman logs pytake-nginx | tail -50
# Should show: proxy pass requests, no 5xx errors
```

[ ] Check Production Frontend logs:
```bash
podman logs pytake-frontend-prod | tail -50
# Should show: Next.js started successfully
```

[ ] Check Staging Frontend logs:
```bash
podman logs pytake-frontend-staging | tail -50
# Should show: Next.js started successfully
```

[ ] Check Development Frontend logs:
```bash
podman logs pytake-frontend-dev | tail -50
# Should show: Next.js started successfully
```

[ ] Check Backend logs:
```bash
podman logs pytake-backend-prod | tail -50
# Should show: FastAPI server started
```

---

## 🐛 Troubleshooting Guide

### Issue: DNS not resolving
```bash
# Clear DNS cache
sudo systemctl restart systemd-resolved

# Or use different DNS
nslookup api.pytake.net 8.8.8.8

# Wait up to 24 hours for propagation
```

### Issue: SSL certificate error
```bash
# Verify certificate exists
sudo ls -la /etc/letsencrypt/live/api.pytake.net/

# Regenerate if needed
sudo certbot delete --cert-name api.pytake.net
# Then run certbot command again
```

### Issue: Container not starting
```bash
# Check logs
podman logs pytake-frontend-staging

# Try rebuilding
podman compose down
podman compose up -d --build

# Check for port conflicts
lsof -i :3001
```

### Issue: API connection failed
```bash
# Verify backend is running
curl http://localhost:8001

# Check Nginx configuration
podman exec pytake-nginx nginx -t

# Restart Nginx
podman restart pytake-nginx
```

### Issue: WebSocket connection failed
```bash
# Check WebSocket endpoint
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" \
  https://api.pytake.net/ws

# Check Nginx WebSocket headers
grep -A 5 "Upgrade" nginx/nginx-subdomains.conf
```

---

## 📊 Monitoring Commands

### Real-time container monitoring
```bash
watch podman ps
watch podman stats
```

### View all logs continuously
```bash
podman compose logs -f
```

### View specific service logs
```bash
podman logs -f pytake-frontend-prod
podman logs -f pytake-backend-prod
podman logs -f pytake-nginx
```

---

## ✅ Post-Deployment Checklist

- [ ] All 6 DNS entries resolving
- [ ] SSL certificate installed
- [ ] All 3 frontend containers running
- [ ] All 3 backend containers running
- [ ] Nginx proxy responding
- [ ] Production frontend accessible
- [ ] Staging frontend accessible
- [ ] Development frontend accessible
- [ ] Production API docs loading
- [ ] Staging API docs loading
- [ ] Development API docs loading
- [ ] User login working on all 3 frontends
- [ ] API calls working on all 3 frontends
- [ ] WebSocket connections working
- [ ] No container errors in logs
- [ ] No SSL certificate warnings
- [ ] Performance acceptable (no timeouts)

---

## �� Scaling Commands (If Needed)

### Restart specific frontend
```bash
podman restart pytake-frontend-staging
```

### Restart specific backend
```bash
podman restart pytake-backend-staging
```

### Rebuild specific service
```bash
podman compose up -d --build frontend-staging
```

### Stop all services
```bash
podman compose down
```

### Start all services
```bash
podman compose up -d
```

---

## 🔐 Security Post-Deployment

- [ ] Update SSL certificate auto-renewal
  ```bash
  sudo systemctl enable certbot-renew.timer
  ```

- [ ] Configure firewall (if applicable)
  ```bash
  sudo ufw allow 80/tcp
  sudo ufw allow 443/tcp
  ```

- [ ] Review Nginx security headers (should already be configured):
  ```bash
  curl -i https://app.pytake.net | grep -i "hsts"
  # Should show: Strict-Transport-Security header
  ```

- [ ] Check for exposed secrets:
  ```bash
  grep -r "SECRET\|PASSWORD\|KEY" .env*
  # Should be empty (secrets in .env not in git)
  ```

---

## 📝 Documentation References

If you need to reference specific parts:

| Document | Purpose | Section |
|----------|---------|---------|
| `FRONTEND_QUICK_REFERENCE.md` | Quick overview | TL;DR |
| `docs/MULTI_FRONTEND_SETUP.md` | Complete setup | Everything |
| `SETUP_CHECKLIST.md` | Full guide | DNS & SSL |
| `docs/FRONTEND_ROUTES.md` | Environment vars | Config |
| `docs/PHASE_16_FRONTEND_COMPLETION.md` | What was done | Architecture |
| `PHASE_16_SUMMARY.txt` | Visual summary | Overview |

---

## 🎯 Success Criteria

### ✅ Deployment is successful when:

1. All 6 DNS entries resolve to your server IP
2. SSL certificate covers all 6 domains
3. All 6 containers are running (3 frontends + 3 backends + nginx/postgres/redis)
4. All 3 frontends load without errors
5. All 3 APIs respond with 200 status
6. User can log in on all 3 frontends
7. API calls work from all 3 frontends
8. WebSocket connections established
9. No 5xx errors in Nginx logs
10. Staging frontend shows staging data
11. Production frontend shows production data
12. Development frontend shows dev data

---

## 📞 Support

If you encounter issues:

1. Check `TROUBLESHOOTING_GUIDE.md` (in MULTI_FRONTEND_SETUP.md)
2. Review container logs:
   ```bash
   podman logs pytake-nginx
   podman logs pytake-frontend-prod
   ```
3. Verify DNS:
   ```bash
   nslookup app.pytake.net
   ```
4. Check port availability:
   ```bash
   lsof -i :3000 :3001 :3002 :8000 :8001 :8002
   ```

---

## 🎉 That's It!

Once all checks pass, your multi-environment frontend deployment is complete and ready for production use!

**Estimated Total Time:** 2-3 hours (mostly waiting for DNS propagation)

**Date Completed:** _________________ (fill in when done)

---

**Questions?** Refer to the comprehensive documentation in `/home/administrator/pytake/docs/`

