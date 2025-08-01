#!/bin/bash

# PyTake Development Stop Script

echo "🛑 Stopping PyTake Development Environment"
echo "========================================"

# Stop and remove containers
docker-compose down

echo ""
echo "✅ All services stopped"
echo ""
echo "Note: Data in PostgreSQL and Redis is preserved in Docker volumes"
echo "To remove all data, run: docker-compose down -v"