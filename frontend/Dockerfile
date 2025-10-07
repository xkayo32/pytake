FROM node:20-alpine

# Accept build arguments
ARG NEXT_PUBLIC_API_URL=https://api.pytake.net/api/v1

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application code
COPY . .

# Create .env.local BEFORE build to ensure variable is available
RUN echo "NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}" > .env.local && cat .env.local

# Build the application (will read from .env.local)
RUN npm run build

# Expose port
EXPOSE 3000

# Start production server
CMD ["npm", "start"]
