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

# Copy workspace files
COPY backend/Cargo.toml backend/Cargo.lock ./
COPY backend/rust-toolchain.toml ./

# Copy source code
COPY backend/simple_api ./simple_api/
COPY backend/crates ./crates/

# Build the application in release mode
WORKDIR /app/simple_api
RUN cargo build --release

# Stage 2: Runtime
FROM debian:bookworm-slim

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN useradd -m -u 1000 -s /bin/bash pytake

# Create app directory
WORKDIR /app

# Copy the binary from builder
COPY --from=builder /app/simple_api/target/release/simple_api /app/pytake-api

# Create directories for uploads and logs
RUN mkdir -p /app/uploads /app/logs && \
    chown -R pytake:pytake /app

# Switch to non-root user
USER pytake

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Set environment variables
ENV RUST_LOG=info,simple_api=debug \
    BIND_ADDRESS=0.0.0.0:8080

# Run the application
CMD ["./pytake-api"]