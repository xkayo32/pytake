# Multi-stage Dockerfile for PyTake Frontend (Production Build Mode)
# Stage 1: Dependencies installation
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev for build time)
RUN npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set fetch-retries 3 && \
    npm install

# Stage 2: Build application
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies for build
RUN apk add --no-cache libc6-compat python3 make g++

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the application
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV SKIP_ENV_VALIDATION=1

RUN npm run build

# Stage 3: Production runtime
FROM node:20-alpine AS runner
WORKDIR /app

# Copy built application and minimal dependencies
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Set environment for production
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000 || exit 1

# Create a non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Set permissions
RUN chown -R nextjs:nodejs /app

USER nextjs

# Start production server
CMD ["npm", "start"]