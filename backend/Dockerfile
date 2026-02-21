# Use official Python runtime as base image
FROM python:3.12-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_NO_CACHE=1 \
    VIRTUAL_ENV=/app/.venv \
    PATH="/app/.venv/bin:$PATH"

# Set work directory
WORKDIR /app

# Install system dependencies + uv
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    postgresql-client \
    libpq-dev \
    netcat-traditional \
    curl \
    nodejs \
    npm \
    && pip install --no-cache-dir uv \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first (for layer caching)
COPY requirements/ /tmp/requirements/

# Cria venv e instala dependências com uv (muito mais rápido que pip)
RUN uv venv /app/.venv && \
    uv pip install -r /tmp/requirements/development.txt

# Copy project
COPY . .

# Build Tailwind CSS
RUN npm ci --prefer-offline 2>/dev/null || npm install && \
    npx tailwindcss -i ./static/css/tailwind.input.css -o ./static/css/tailwind.css --minify
# Note: Keep node_modules for development (npm run watch:css needs it)
# Production: Delete if needed via docker-compose or build args

# Collect Django static files
RUN python manage.py collectstatic --noinput --settings=pytake.settings.production 2>/dev/null || true

# Create django user for running app
RUN useradd -m -u 1000 django && \
    chown -R django:django /app

# Switch to django user
USER django

# Run migrations and start daphne (ASGI for WebSocket support)
CMD ["sh", "-c", "python manage.py migrate && daphne -b 0.0.0.0 -p 8000 pytake.asgi:application"]
