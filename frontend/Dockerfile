FROM node:20-alpine

# Accept build arguments
ARG NEXT_PUBLIC_API_URL=https://api.pytake.net/api/v1
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Install Next.js globally to avoid symlink issues
RUN npm install -g next

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application code
COPY . .

# Expose port
EXPOSE 3000

# Use globally installed Next.js
CMD ["next", "dev", "--turbopack"]
