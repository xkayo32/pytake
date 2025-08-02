#!/bin/bash

# PyTake Docker Startup Script

echo "🚀 Starting PyTake with Docker..."

# Copy environment file if it doesn't exist
if [ ! -f .env ]; then
    echo "📋 Creating environment file..."
    cp .env.docker .env
fi

# Stop any running containers
echo "🛑 Stopping existing containers..."
docker-compose down

# Remove old containers and networks
echo "🧹 Cleaning up..."
docker-compose down --remove-orphans

# Build and start services
echo "🔨 Building and starting services..."
docker-compose up --build -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
sleep 10

# Check service status
echo "📊 Service Status:"
docker-compose ps

# Show logs
echo "📝 Showing recent logs..."
docker-compose logs --tail=20

echo ""
echo "✅ PyTake is starting up!"
echo ""
echo "🌐 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:8080"
echo "🗄️  pgAdmin: http://localhost:5050 (admin@pytake.com / admin)"
echo "📊 Redis Commander: http://localhost:8081"
echo ""
echo "📋 Useful commands:"
echo "  docker-compose logs -f          # Follow logs"
echo "  docker-compose ps               # Service status"
echo "  docker-compose down             # Stop services"
echo "  docker-compose exec backend sh  # Access backend container"
echo "  docker-compose exec frontend sh # Access frontend container"
echo ""