#!/bin/bash

# PyTake Docker Startup Script
# This script manages the Docker environment for PyTake

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if .env file exists
check_env_file() {
    if [ ! -f ".env" ]; then
        log_error ".env file not found!"
        log_info "Creating .env from .env.example..."
        
        if [ -f ".env.example" ]; then
            cp .env.example .env
            log_success ".env file created from .env.example"
            log_warning "Please edit .env file with your configuration"
            exit 1
        else
            log_error "No .env.example file found. Please create .env file manually."
            exit 1
        fi
    fi
}

# Create necessary directories
create_directories() {
    log_info "Creating necessary directories..."
    mkdir -p uploads logs ssl
    log_success "Directories created"
}

# Display configuration
show_config() {
    source .env
    echo ""
    echo "========================================="
    echo "         PyTake Docker Configuration"
    echo "========================================="
    echo ""
    echo "📍 API Configuration:"
    echo "   Host: ${API_HOST}"
    echo "   Port: ${API_PORT}"
    echo ""
    echo "🌐 Nginx Configuration:"
    echo "   HTTP Port: ${NGINX_HTTP_PORT}"
    echo "   HTTPS Port: ${NGINX_HTTPS_PORT}"
    echo "   Server Name: ${SERVER_NAME}"
    echo ""
    echo "🗄️  Database:"
    echo "   Host: ${POSTGRES_HOST}"
    echo "   Port: ${POSTGRES_PORT}"
    echo "   Database: ${POSTGRES_DB}"
    echo "   External Port: ${POSTGRES_EXTERNAL_PORT}"
    echo ""
    echo "📦 Redis:"
    echo "   Host: ${REDIS_HOST}"
    echo "   Port: ${REDIS_PORT}"
    echo "   External Port: ${REDIS_EXTERNAL_PORT}"
    echo ""
    echo "========================================="
    echo ""
}

# Main commands
case "${1:-help}" in
    "start")
        log_info "Starting PyTake Docker environment..."
        check_env_file
        create_directories
        show_config
        
        log_info "Building and starting containers..."
        docker-compose up -d --build
        
        log_success "PyTake is starting up!"
        echo ""
        echo "📌 Access URLs:"
        echo "   API: http://${SERVER_NAME:-api.pytake.net}"
        echo "   Swagger UI: http://${SERVER_NAME:-api.pytake.net}/docs"
        echo "   Health Check: http://${SERVER_NAME:-api.pytake.net}/health"
        echo ""
        echo "   Local Access:"
        echo "   API: http://localhost"
        echo "   Direct Backend: http://localhost:${API_PORT:-8789}"
        echo ""
        echo "Use 'docker-compose logs -f' to view logs"
        ;;
        
    "stop")
        log_info "Stopping PyTake Docker environment..."
        docker-compose down
        log_success "PyTake stopped"
        ;;
        
    "restart")
        log_info "Restarting PyTake Docker environment..."
        docker-compose restart
        log_success "PyTake restarted"
        ;;
        
    "rebuild")
        log_info "Rebuilding PyTake Docker environment..."
        docker-compose down
        docker-compose build --no-cache
        docker-compose up -d
        log_success "PyTake rebuilt and started"
        ;;
        
    "logs")
        docker-compose logs -f ${2}
        ;;
        
    "status")
        docker-compose ps
        ;;
        
    "clean")
        log_warning "This will remove all containers, volumes, and images!"
        read -p "Are you sure? (y/N) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            docker-compose down -v
            docker system prune -f
            log_success "Cleanup completed"
        fi
        ;;
        
    "shell")
        service="${2:-backend}"
        log_info "Opening shell in $service container..."
        docker-compose exec $service /bin/bash
        ;;
        
    "test")
        log_info "Running health check..."
        source .env
        curl -f http://localhost/health || {
            log_error "Health check failed"
            exit 1
        }
        log_success "Health check passed"
        ;;
        
    *)
        echo "PyTake Docker Management Script"
        echo ""
        echo "Usage: $0 {start|stop|restart|rebuild|logs|status|clean|shell|test}"
        echo ""
        echo "Commands:"
        echo "  start    - Start all services"
        echo "  stop     - Stop all services"
        echo "  restart  - Restart all services"
        echo "  rebuild  - Rebuild and restart all services"
        echo "  logs     - View logs (optionally specify service)"
        echo "  status   - Show service status"
        echo "  clean    - Remove all containers and volumes"
        echo "  shell    - Open shell in container (default: backend)"
        echo "  test     - Run health check"
        echo ""
        echo "Examples:"
        echo "  $0 start"
        echo "  $0 logs backend"
        echo "  $0 shell nginx"
        ;;
esac