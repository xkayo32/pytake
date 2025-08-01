#!/bin/bash

# PyTake Development Start Script

set -e

echo "🚀 Starting PyTake Development Environment"
echo "========================================"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠ .env file not found. Running setup...${NC}"
    ./scripts/setup.sh
fi

# Start services
echo -e "\n${YELLOW}Starting services...${NC}"
docker-compose up -d

# Show logs
echo -e "\n${YELLOW}Showing logs (Ctrl+C to exit)...${NC}"
echo -e "${GREEN}Services starting up...${NC}"
echo ""
echo "📍 Frontend: http://localhost:3000"
echo "📍 Backend API: http://localhost:8080"
echo "📍 PostgreSQL: localhost:5432"
echo "📍 Redis: localhost:6379"
echo ""

# Follow logs
docker-compose logs -f