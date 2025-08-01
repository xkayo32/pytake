# Build stage
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY frontend/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application files
COPY frontend/. .

# Build the application
RUN npm run build

# Runtime stage
FROM node:20-alpine

# Install serve to run the application
RUN npm install -g serve

# Create non-root user
RUN adduser -D -u 1001 pytake

# Set working directory
WORKDIR /app

# Copy built application
COPY --from=builder /app/dist ./dist

# Change ownership
RUN chown -R pytake:pytake /app

# Switch to non-root user
USER pytake

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000 || exit 1

# Serve the application
CMD ["serve", "-s", "dist", "-l", "3000"]