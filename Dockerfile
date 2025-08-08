# PyTake Backend Production Dockerfile
# Multi-stage build for optimized production image

# Stage 1: Builder
FROM rust:1.75-slim as builder

# Install build dependencies
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy all backend files
COPY backend/ ./backend/

# Build the application in release mode
WORKDIR /app/backend
RUN cargo build --release --package simple_api

# Stage 2: Runtime
FROM debian:bookworm-slim

# Accept build arguments
ARG API_PORT=8080
ARG API_HOST=0.0.0.0

# Install runtime dependencies including envsubst for template processing
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

# Copy the binary from builder
COPY --from=builder /app/backend/target/release/simple_api /app/pytake-api

# Create directories for uploads and logs
RUN mkdir -p /app/uploads /app/logs && \
    chown -R pytake:pytake /app

# Create startup script
RUN echo '#!/bin/bash\n\
# Set bind address from environment variables\n\
export BIND_ADDRESS="${API_HOST:-0.0.0.0}:${API_PORT:-8080}"\n\
echo "Starting PyTake API on $BIND_ADDRESS"\n\
exec ./pytake-api' > /app/start.sh && \
    chmod +x /app/start.sh && \
    chown pytake:pytake /app/start.sh

# Switch to non-root user
USER pytake

# Expose port dynamically (documentation purposes, actual port from env)
EXPOSE ${API_PORT}

# Health check with dynamic port
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${API_PORT:-8080}/health || exit 1

# Default environment variables (can be overridden)
ENV RUST_LOG=info,simple_api=debug \
    API_HOST=0.0.0.0 \
    API_PORT=8080

# Run the application using the startup script
CMD ["/app/start.sh"]