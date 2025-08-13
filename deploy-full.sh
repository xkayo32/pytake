#!/bin/bash

# Deploy script for PyTake Full Stack (Backend + Frontend)

set -e

echo "🚀 Starting PyTake Full Stack Deployment..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check requirements
if ! command_exists docker; then
    echo -e "${RED}Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

if ! command_exists docker-compose; then
    echo -e "${RED}Docker Compose is not installed. Please install Docker Compose first.${NC}"
    exit 1
fi

# Stop existing containers
echo -e "${YELLOW}Stopping existing containers...${NC}"
docker-compose -f docker-compose.production.yml down 2>/dev/null || true
docker-compose -f docker-compose.full.yml down 2>/dev/null || true

# Build frontend
echo -e "${GREEN}Building frontend application...${NC}"
cd pytake-frontend
npm install
npm run build
cd ..

# Create SSL certificates directory if not exists
mkdir -p certbot/conf/live/app.pytake.net
mkdir -p certbot/conf/live/api.pytake.net

# Check if SSL certificates exist
if [ ! -f "certbot/conf/live/api.pytake.net/fullchain.pem" ]; then
    echo -e "${YELLOW}SSL certificate for api.pytake.net not found.${NC}"
    echo -e "${YELLOW}Using self-signed certificate for development...${NC}"
    
    # Create self-signed certificate for api.pytake.net
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout certbot/conf/live/api.pytake.net/privkey.pem \
        -out certbot/conf/live/api.pytake.net/fullchain.pem \
        -subj "/C=BR/ST=SP/L=Sao Paulo/O=PyTake/CN=api.pytake.net"
fi

if [ ! -f "certbot/conf/live/app.pytake.net/fullchain.pem" ]; then
    echo -e "${YELLOW}SSL certificate for app.pytake.net not found.${NC}"
    echo -e "${YELLOW}Using self-signed certificate for development...${NC}"
    
    # Create self-signed certificate for app.pytake.net
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout certbot/conf/live/app.pytake.net/privkey.pem \
        -out certbot/conf/live/app.pytake.net/fullchain.pem \
        -subj "/C=BR/ST=SP/L=Sao Paulo/O=PyTake/CN=app.pytake.net"
fi

# Start containers
echo -e "${GREEN}Starting containers...${NC}"
docker-compose -f docker-compose.full.yml up -d --build

# Wait for services to be ready
echo -e "${YELLOW}Waiting for services to be ready...${NC}"
sleep 10

# Check health status
echo -e "${GREEN}Checking service health...${NC}"

# Check backend
if curl -f http://localhost:8080/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend is healthy${NC}"
else
    echo -e "${RED}✗ Backend health check failed${NC}"
fi

# Check frontend
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Frontend is healthy${NC}"
else
    echo -e "${RED}✗ Frontend health check failed${NC}"
fi

# Show running containers
echo -e "${GREEN}Running containers:${NC}"
docker-compose -f docker-compose.full.yml ps

echo -e "${GREEN}✨ Deployment complete!${NC}"
echo ""
echo -e "${GREEN}Access your application:${NC}"
echo -e "  Frontend: ${GREEN}https://app.pytake.net${NC}"
echo -e "  Backend API: ${GREEN}https://api.pytake.net${NC}"
echo -e "  API Docs: ${GREEN}https://api.pytake.net/docs${NC}"
echo ""
echo -e "${YELLOW}Note: If using self-signed certificates, you may see security warnings in your browser.${NC}"
echo -e "${YELLOW}For production, obtain real certificates using:${NC}"
echo -e "  sudo certbot certonly --standalone -d app.pytake.net -d api.pytake.net"