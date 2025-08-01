# Build stage
FROM rust:1.75-slim AS builder

# Install build dependencies
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy manifests
COPY backend/Cargo.toml backend/Cargo.lock* ./
COPY backend/crates ./crates

# Build dependencies (this is cached)
RUN cargo build --release --workspace || true

# Copy source code
COPY backend/. .

# Build application
RUN cargo build --release --bin pytake-api

# Runtime stage
FROM debian:bookworm-slim

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd -m -u 1001 pytake

# Copy binary from builder
COPY --from=builder /app/target/release/pytake-api /usr/local/bin/pytake-api

# Change ownership
RUN chown pytake:pytake /usr/local/bin/pytake-api

# Switch to non-root user
USER pytake

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Run the binary
CMD ["pytake-api"]