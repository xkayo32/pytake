#!/bin/bash

# Development script for PyTake Frontend with hot-reload

echo "🚀 Starting PyTake Frontend Development Environment..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to stop containers
stop_containers() {
    echo -e "${YELLOW}Stopping containers...${NC}"
    docker-compose -f docker-compose.dev.yml down
}

# Trap to ensure containers are stopped on script exit
trap stop_containers EXIT

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "Docker is not running. Please start Docker first."
    exit 1
fi

# Create network if it doesn't exist
docker network create pytake-backend_pytake-network 2>/dev/null || true

# Build and start the container
echo -e "${GREEN}Building and starting frontend container...${NC}"
docker-compose -f docker-compose.dev.yml up --build --force-recreate

echo -e "${GREEN}Frontend stopped.${NC}"