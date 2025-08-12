# PyTake Backend - Production Dockerfile
# Multi-stage build for optimal image size

# Build stage
FROM golang:1.21-alpine AS builder

# Install build dependencies
RUN apk add --no-cache git ca-certificates tzdata

# Set working directory
WORKDIR /app

# Copy go mod files first for better caching
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags='-w -s -extldflags "-static"' \
    -a -installsuffix cgo \
    -o pytake-api ./cmd/api

# Production stage
FROM alpine:latest

# Install runtime dependencies
RUN apk --no-cache add ca-certificates tzdata curl

# Create non-root user for security
RUN addgroup -g 1001 -S pytake && \
    adduser -u 1001 -S pytake -G pytake

# Set working directory
WORKDIR /app

# Copy binary from builder stage
COPY --from=builder /app/pytake-api .

# Copy configuration files
COPY --from=builder /app/.env.production .env

# Create logs directory
RUN mkdir -p logs && chown -R pytake:pytake /app

# Switch to non-root user
USER pytake

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Expose port
EXPOSE 8080

# Command to run
CMD ["./pytake-api"]