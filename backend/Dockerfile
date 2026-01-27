# Use official Python runtime as base image
FROM python:3.12-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

# Set work directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    postgresql-client \
    libpq-dev \
    netcat-traditional \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first (for layer caching)
COPY requirements/ /tmp/requirements/

# Install Python dependencies
RUN pip install --upgrade pip setuptools wheel && \
    pip install -r /tmp/requirements/base.txt

# Copy project
COPY . .

# Create django user for running app
RUN useradd -m -u 1000 django && \
    chown -R django:django /app

# Switch to django user
USER django

# Run migrations and start gunicorn
CMD ["sh", "-c", "python manage.py migrate && gunicorn pytake.wsgi:application --bind 0.0.0.0:8000 --workers 4 --worker-class sync --timeout 120"]
