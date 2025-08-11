#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}PyTake Backend - Test Runner${NC}"
echo -e "${YELLOW}========================================${NC}"

# Check if Docker services are running
echo -e "\n${GREEN}Checking Docker services...${NC}"
docker-compose ps | grep -q "pytake_postgres" && docker-compose ps | grep -q "pytake_redis"
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}Starting Docker services...${NC}"
    docker-compose up -d
    sleep 5
fi

# Create test database if it doesn't exist
echo -e "\n${GREEN}Setting up test database...${NC}"
docker exec pytake_postgres psql -U pytake -c "CREATE DATABASE pytake_test_db;" 2>/dev/null || true

# Run unit tests
echo -e "\n${GREEN}Running unit tests...${NC}"
go test -v -cover ./internal/...

# Run integration tests
echo -e "\n${GREEN}Running integration tests...${NC}"
go test -v -tags=integration ./tests/integration/...

# Generate coverage report
echo -e "\n${GREEN}Generating coverage report...${NC}"
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out -o coverage.html

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}Tests completed successfully!${NC}"
echo -e "${GREEN}Coverage report: coverage.html${NC}"
echo -e "${GREEN}========================================${NC}"