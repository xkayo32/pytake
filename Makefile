.PHONY: help dev-up dev-down dev-logs rebuild-css watch-css test-login diagnose-502 shell

help:
	@echo "PyTake Development Commands"
	@echo ""
	@echo "  make dev-up          Start development containers (backend, nginx, postgres, redis, etc)"
	@echo "  make dev-down        Stop all containers"
	@echo "  make dev-logs        View backend logs in real-time"
	@echo "  make watch-css       Watch & auto-compile Tailwind CSS (run in separate terminal)"
	@echo "  make rebuild-css     Rebuild Tailwind CSS once"
	@echo "  make test-login      Test login at http://localhost:8002/entrar/"
	@echo "  make diagnose-502    Run 502 diagnosis script (if getting Bad Gateway)"
	@echo "  make shell           Open Django shell"
	@echo "  make shell-py        Open Python shell in container"
	@echo ""
	@echo "IMPORTANT: Run in 2 separate terminals:"
	@echo "  Terminal 1: make dev-up && make dev-logs"
	@echo "  Terminal 2: make watch-css"
	@echo ""

dev-up:
	@echo "🚀 Starting PyTake development services..."
	docker compose --profile dev up -d
	@echo "✓ Services started. Access at http://localhost:8002"
	@echo "  Landing:  http://localhost:8002/"
	@echo "  Login:    http://localhost:8002/entrar/"
	@echo "  Admin:    email: admin@pytake.net / ask for password"

dev-down:
	@echo "⏹️ Stopping PyTake services..."
	docker compose down
	@echo "✓ Stopped"

dev-logs:
	docker logs -f pytake-backend-dev

rebuild-css:
	@echo "🎨 Rebuilding Tailwind CSS..."
	cd ./backend && npm run build:css
	@echo "✓ CSS rebuilt at backend/static/css/tailwind.css ($(shell wc -c < ./backend/static/css/tailwind.css | numfmt --to=iec-i --suffix=B) bytes)"

watch-css:
	@echo "👀 Watching Tailwind CSS for changes (Ctrl+C to stop)..."
	cd ./backend && npm run watch:css

test-login:
	@echo "testing login flow..."
	@bash $(PWD)/scripts/test-login.sh

diagnose-502:
	@bash $(PWD)/scripts/diagnose-502.sh

shell:
	docker exec -it pytake-backend-dev python manage.py shell

shell-py:
	docker exec -it pytake-backend-dev python

# Auto-reload note
info:
	@echo "ℹ️  Auto-reload features:"
	@echo "  • Python code: Uvicorn auto-reloads on file changes"
	@echo "  • Tailwind CSS: npm run watch:css(runs in docker-compose via tailwind-watch service)"
	@echo "  • Templates: Auto-Hot-Reload with HTMX (alpha)"
	@echo ""
	@echo "To use CSS auto-watch, ensure docker-compose.override.yml is loaded:"
	@echo "  docker compose config | grep tailwind-watch"
