#!/bin/bash

# PyTake Setup Script
# This script sets up the development environment

set -e

echo "🚀 PyTake Development Setup"
echo "=========================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check prerequisites
echo -e "\n${YELLOW}Checking prerequisites...${NC}"

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    echo "Please install Docker from https://www.docker.com/"
    exit 1
fi
echo -e "${GREEN}✓ Docker installed${NC}"

# Check Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed${NC}"
    echo "Please install Docker Compose"
    exit 1
fi
echo -e "${GREEN}✓ Docker Compose installed${NC}"

# Check Rust (optional for local development)
if command -v rustc &> /dev/null; then
    echo -e "${GREEN}✓ Rust installed ($(rustc --version))${NC}"
else
    echo -e "${YELLOW}⚠ Rust not installed (optional for containerized development)${NC}"
fi

# Check Node.js (optional for local development)
if command -v node &> /dev/null; then
    echo -e "${GREEN}✓ Node.js installed ($(node --version))${NC}"
else
    echo -e "${YELLOW}⚠ Node.js not installed (optional for containerized development)${NC}"
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo -e "\n${YELLOW}Creating .env file from template...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✓ .env file created${NC}"
    echo -e "${YELLOW}⚠ Please edit .env with your configuration${NC}"
else
    echo -e "${GREEN}✓ .env file exists${NC}"
fi

# Create necessary directories
echo -e "\n${YELLOW}Creating directories...${NC}"
mkdir -p uploads logs
echo -e "${GREEN}✓ Directories created${NC}"

# Pull Docker images
echo -e "\n${YELLOW}Pulling Docker images...${NC}"
docker-compose pull
echo -e "${GREEN}✓ Docker images pulled${NC}"

# Start services
echo -e "\n${YELLOW}Starting services...${NC}"
docker-compose up -d postgres redis
echo -e "${GREEN}✓ Database services started${NC}"

# Wait for PostgreSQL to be ready
echo -e "\n${YELLOW}Waiting for PostgreSQL to be ready...${NC}"
sleep 5
until docker-compose exec postgres pg_isready -U pytake > /dev/null 2>&1; do
    echo -n "."
    sleep 1
done
echo -e "\n${GREEN}✓ PostgreSQL is ready${NC}"

# Run migrations (when backend is ready)
# echo -e "\n${YELLOW}Running database migrations...${NC}"
# docker-compose run --rm backend cargo run --bin migrate
# echo -e "${GREEN}✓ Migrations completed${NC}"

echo -e "\n${GREEN}🎉 Setup completed!${NC}"
echo -e "\nNext steps:"
echo -e "1. Edit ${YELLOW}.env${NC} with your configuration"
echo -e "2. Run ${YELLOW}docker-compose up${NC} to start all services"
echo -e "3. Access the application at ${YELLOW}http://localhost:3000${NC}"
echo -e "4. Access the API at ${YELLOW}http://localhost:8080${NC}"
echo -e "\nOptional tools (use --profile tools):"
echo -e "- pgAdmin at ${YELLOW}http://localhost:5050${NC}"
echo -e "- Redis Commander at ${YELLOW}http://localhost:8081${NC}"

echo -e "\n${YELLOW}Happy coding! 🚀${NC}"