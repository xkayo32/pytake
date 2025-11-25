# Deployment: Sistema de Notificações

## Pre-requisitos

- PostgreSQL 15+ com migrations aplicadas
- Redis 7+ para Celery broker
- SMTP configurado (Gmail, SendGrid, etc)

## Environment Variables

```bash
# SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=seu-email@gmail.com
SMTP_PASSWORD=sua-app-password  # Use GitHub Secrets!
SMTP_FROM_EMAIL=noreply@pytake.com
SMTP_FROM_NAME=PyTake
SMTP_USE_TLS=true
SMTP_TIMEOUT=10

# Celery
CELERY_BROKER_URL=redis://default:password@redis:6379/1
CELERY_RESULT_BACKEND=redis://default:password@redis:6379/2

# Rate Limiting
EMAIL_RATE_LIMIT_PER_HOUR=100
EMAIL_BATCH_SIZE=50
```

## Celery Worker

```bash
# Development
podman exec pytake-backend celery -A app.tasks.celery_app worker --loglevel=info --concurrency=4

# Production (systemd)
# /etc/systemd/system/pytake-celery.service
[Unit]
Description=PyTake Celery Worker
After=network.target redis.service

[Service]
Type=forking
User=pytake
ExecStart=/path/to/venv/bin/celery -A app.tasks.celery_app worker --logfile=/var/log/pytake-celery.log

[Install]
WantedBy=multi-user.target
```

## Migrations

```bash
# Apply all pending migrations
podman exec pytake-backend alembic upgrade head

# Verify tables created
podman exec pytake-postgres psql -U pytake_user -d pytake -c "\dt notification*"
```

## Testing

```bash
# Run notification tests
podman exec pytake-backend pytest tests/test_notification_service.py -v
podman exec pytake-backend pytest tests/test_notification_repository.py -v

# With coverage
podman exec pytake-backend pytest tests/test_notification*.py --cov=app.services.notification_service
```

## Monitoring

```bash
# Check Celery tasks via Flower
podman exec pytake-backend pip install flower
podman exec pytake-backend celery -A app.tasks.celery_app flower --port=5555
# Access: http://localhost:5555

# Check notification logs
podman exec pytake-postgres psql -U pytake_user -d pytake -c "SELECT * FROM notification_logs ORDER BY created_at DESC LIMIT 10;"
```

## Troubleshooting

```bash
# Check Redis connection
podman exec pytake-redis redis-cli PING

# View Celery broker queue
podman exec pytake-redis redis-cli LRANGE celery 0 -1

# Clear failed tasks
podman exec pytake-redis redis-cli FLUSHDB

# Check SMTP connection
python -c "import smtplib; smtplib.SMTP('smtp.gmail.com', 587).starttls(); print('OK')"
```

---

**Implementado por:** Kayo Carvalho Fernandes
