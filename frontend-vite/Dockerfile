FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application code
COPY . .

# Build arguments
ARG VITE_API_URL=https://api.pytake.net/api/v1

# Set environment variable for build
ENV VITE_API_URL=${VITE_API_URL}

# Build the application (super fast with Vite!)
RUN npm run build

# Expose port
EXPOSE 3000

# Serve the built files with Vite preview
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "3000"]
