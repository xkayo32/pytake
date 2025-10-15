FROM node:20-alpine

# Accept build arguments
ARG NEXT_PUBLIC_API_URL=https://api.pytake.net/api/v1
ARG DOCKER=false

# Set as environment variable (crucial for Next.js build)
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV DOCKER=${DOCKER}

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application code
COPY . .

# Build the application (ENV var will be embedded)
RUN npm run build

# Expose port
EXPOSE 3000

# Start production server
CMD ["npm", "start"]
