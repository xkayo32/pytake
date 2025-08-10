# PyTake Backend - Production Ready Docker Image
FROM debian:bookworm-slim

# Accept build arguments from .env
ARG API_PORT=8789
ARG API_HOST=0.0.0.0
ARG RUST_LOG=info
ARG APP_ENV=production

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    curl \
    gettext-base \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN useradd -m -u 1000 -s /bin/bash pytake

# Create app directory
WORKDIR /app

# Copy the pre-compiled binary
COPY ./simple_api_binary /app/pytake-api

# Make sure binary is executable
RUN chmod +x /app/pytake-api

# Create directories for uploads and logs
RUN mkdir -p /app/uploads /app/logs && \
    chown -R pytake:pytake /app

# Switch to non-root user
USER pytake

# Expose port (configurable via env)
EXPOSE ${API_PORT}

# Health check using env variables
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${API_PORT:-8789}/health || exit 1

# Environment variables from .env
ENV RUST_LOG=${RUST_LOG} \
    API_HOST=${API_HOST} \
    API_PORT=${API_PORT} \
    APP_ENV=${APP_ENV}

# Run the application
CMD ["/app/pytake-api"]