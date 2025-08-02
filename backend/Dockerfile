# Multi-stage build for Rust backend
# Stage 1: Build
FROM rust:1.75-slim AS builder

# Install build dependencies
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy manifest files
COPY Cargo.toml Cargo.lock ./
COPY crates/ ./crates/

# Build dependencies first (for better caching)
RUN cargo build --release --locked

# Copy source code
COPY . .

# Build the application
RUN cargo build --release --locked

# Stage 2: Runtime
FROM debian:bookworm-slim

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd -m -u 1001 pytake

# Create necessary directories
RUN mkdir -p /app/media && chown -R pytake:pytake /app

WORKDIR /app

# Copy the binary from builder
COPY --from=builder /app/target/release/pytake-api /app/pytake-api

# Copy any static files or migrations if needed
# COPY --from=builder /app/migrations /app/migrations

# Switch to non-root user
USER pytake

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

# Environment variables
ENV RUST_LOG=info
ENV PYTAKE_HOST=0.0.0.0
ENV PYTAKE_PORT=8080

# Run the application
CMD ["./pytake-api"]