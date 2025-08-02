# Multi-stage Dockerfile for PyTake Backend

# Build stage
FROM rust:1.78-slim AS builder

# Install build dependencies
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy manifests first for better caching
COPY backend/Cargo.toml backend/Cargo.lock* ./

# Copy all backend structure
COPY backend/crates ./crates/
COPY backend/simple_api ./simple_api/

# Build dependencies (cached layer)
RUN cargo build --release || true

# Copy remaining source code
COPY backend/. .

# Build application
RUN cargo build --release --bin simple_api || cargo build --release

# Runtime stage
FROM debian:bookworm-slim AS runtime

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd -m -u 1001 pytake

# Copy binary from builder (try simple_api first, then pytake-api)
COPY --from=builder /app/target/release/simple_api /usr/local/bin/simple_api

# Change ownership
RUN chown pytake:pytake /usr/local/bin/simple_api

# Switch to non-root user
USER pytake

# Create uploads directory
RUN mkdir -p /home/pytake/uploads

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Run the binary
CMD ["simple_api"]

# Development stage (for hot reload)
FROM builder AS development

# Install additional development tools
RUN cargo install cargo-watch

# Set working directory
WORKDIR /app

# Development command will be overridden by docker-compose
CMD ["simple_api"]