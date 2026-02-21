# PyTake Development Workflow

## Quick Start (2 Terminals)

**Terminal 1 — Backend & Services:**
```bash
make dev-up
make dev-logs  # See Python auto-reload and other logs
```

**Terminal 2 — CSS Auto-Watch:**
```bash
make watch-css  # Watch for template changes and auto-compile CSS (Ctrl+C to stop)
```

Now edit files and they auto-reload:
- Python code: auto-reloads via uvicorn --reload (~1s)
- Templates: refresh page (instant)
- Tailwind CSS: auto-compiles via npm watch (~1-2s)

Test login: `make test-login`

Stop: `Ctrl+C` on both terminals, or `make dev-down`

## How It Works

### Auto-Reload Features

1. **Python Code Reload (Uvicorn)** ✅
   - Monitors `backend/` directory via bind-mount
   - Reloads when `.py` files change
   - Takes ~1 second
   - Check logs: `make dev-logs`

2. **Tailwind CSS Auto-Compile (npm watch)** ✅
   - Command: `make watch-css` (runs locally on host, not in container)
   - Monitors local templates and CSS input files
   - Recompiles automatically when you edit templates or write new Tailwind classes
   - Output: `backend/static/css/tailwind.css` (nano-bundled for your templates only)
   - Takes ~1-2 seconds per compile

3. **Django Templates** ✅
   - Automatically reloaded (no special action needed)
   - Refresh your browser to see changes

### Current Issues & Solutions

#### Issue: 502 Bad Gateway (Nginx)

**Cause**: Nginx can timeout when backend restarts during development  
**Solution**:
```bash
# Quick fix: restart nginx
docker restart pytake-nginx-dev

# Or run diagnosis
make diagnose-502
```

#### Issue: Changes don't appear

**For Python changes**: Check logs with `make dev-logs`. Uvicorn should auto-reload.

**For CSS changes**: 
- Check that `tailwind-watch` is running: `docker logs pytake-tailwind-watch-dev`
- Manually trigger rebuild: `make rebuild-css`

**For template changes**: Just refresh your browser.

### Available Commands

```bash
make help          # Show all commands
make dev-up        # Start all containers (postgres, redis, backend, nginx, etc)
make dev-down      # Stop all containers
make dev-logs      # View backend logs in real-time
make watch-css     # Watch & auto-compile Tailwind CSS (NEW terminal)
make rebuild-css   # Manual one-time CSS rebuild
make test-login    # Test authentication flow (admin@pytake.net)
make diagnose-502  # Run 502 diagnosis
make shell         # Django management shell
make shell-py      # Python REPL
```

### Why 2 Terminals?

- **Terminal 1**: Containers run, you see real-time logs
- **Terminal 2**: CSS watch process, instantly recompiles on template changes

You can use just 1 terminal but you won't see CSS compilation unless you manually run `make rebuild-css`

### File Structure for Editing

- **Add page**: Create `backend/templates/web/my-page.html` + add route in `backend/apps/web/views.py`
- **Add API**: Create endpoint in `backend/apps/*/views.py`
- **Custom CSS**: Edit templates, then Tailwind compiles utility classes automatically
- **Static files**: Place in `backend/static/` (favicon, images, etc.)

### Rebuilding Containers

Only needed if:
- You modify `requirements/base.txt` or `requirements/development.txt`
- You change `Dockerfile`
- You install new npm packages

```bash
docker compose up -d --build backend
```

### Docker Compose Override

The `docker-compose.override.yml` file:
- Automatically merged with `docker-compose.yml`
- Adds volume bind-mounts for live code reload
- Adds `tailwind-watch` service for CSS auto-compile
- Only used in development (not in production)

---

**Need help?** Run `make diagnose-502` or check `docker logs pytake-backend-dev`
