FROM node:20-alpine

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
