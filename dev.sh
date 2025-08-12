#!/bin/bash

# PyTake Development Environment Manager
# Usage: ./dev.sh [command]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
COMPOSE_FILE="docker-compose.dev.yml"
PROJECT_NAME="pytake-dev"

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

# Setup hosts file
setup_hosts() {
    log_info "Setting up host entries..."
    
    # Check if entries exist
    if ! grep -q "pytake.local" /etc/hosts; then
        log_warning "Adding host entries (requires sudo)..."
        echo "127.0.0.1 api.pytake.local app.pytake.local" | sudo tee -a /etc/hosts
        log_success "Host entries added"
    else
        log_info "Host entries already exist"
    fi
}

# Start services
start() {
    log_info "Starting PyTake development environment..."
    
    # Setup hosts if needed
    setup_hosts
    
    # Start services
    docker-compose -f $COMPOSE_FILE -p $PROJECT_NAME up -d
    
    # Wait for services
    log_info "Waiting for services to be ready..."
    sleep 10
    
    # Check health
    if curl -s http://localhost/health > /dev/null; then
        log_success "Services are running!"
        show_urls
    else
        log_error "Services failed to start properly"
        docker-compose -f $COMPOSE_FILE -p $PROJECT_NAME logs --tail=50
        exit 1
    fi
}

# Stop services
stop() {
    log_info "Stopping PyTake development environment..."
    docker-compose -f $COMPOSE_FILE -p $PROJECT_NAME down
    log_success "Services stopped"
}

# Restart services
restart() {
    stop
    start
}

# Show logs
logs() {
    docker-compose -f $COMPOSE_FILE -p $PROJECT_NAME logs -f "$@"
}

# Show status
status() {
    docker-compose -f $COMPOSE_FILE -p $PROJECT_NAME ps
}

# Clean everything
clean() {
    log_warning "This will remove all containers, volumes, and data!"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker-compose -f $COMPOSE_FILE -p $PROJECT_NAME down -v --remove-orphans
        log_success "Environment cleaned"
    fi
}

# Show URLs
show_urls() {
    echo ""
    echo "=========================================="
    echo "PyTake Development Environment is Ready!"
    echo "=========================================="
    echo ""
    echo "🌐 URLs:"
    echo "  API:            http://api.pytake.local  (or http://localhost)"
    echo "  App:            http://app.pytake.local"
    echo "  Adminer:        http://localhost:8081"
    echo "  Redis Commander: http://localhost:8082"
    echo ""
    echo "📊 Services:"
    echo "  PostgreSQL:     localhost:5432"
    echo "  Redis:          localhost:6379"
    echo ""
    echo "🔑 Default Credentials:"
    echo "  Admin Email:    admin@pytake.com"
    echo "  Admin Password: admin123"
    echo ""
    echo "  Database User:  pytake_dev"
    echo "  Database Pass:  pytake_dev_password_123"
    echo "  Database Name:  pytake_development"
    echo ""
    echo "  Redis Password: redis_dev_password_123"
    echo ""
    echo "📝 Commands:"
    echo "  ./dev.sh start   - Start environment"
    echo "  ./dev.sh stop    - Stop environment"
    echo "  ./dev.sh restart - Restart environment"
    echo "  ./dev.sh logs    - View logs"
    echo "  ./dev.sh status  - Show status"
    echo "  ./dev.sh clean   - Remove everything"
    echo "  ./dev.sh test    - Test endpoints"
    echo ""
}

# Test endpoints
test_endpoints() {
    log_info "Testing endpoints..."
    echo ""
    
    # Test health
    echo "Testing /health:"
    curl -s http://localhost/health | jq . || curl -s http://localhost/health
    echo ""
    
    # Test login
    echo "Testing login:"
    curl -s -X POST http://localhost/api/v1/auth/login \
        -H "Content-Type: application/json" \
        -d '{"email":"admin@pytake.com","password":"admin123"}' | jq . || echo "Login test complete"
    echo ""
    
    # Test status
    echo "Testing /api/v1/status:"
    curl -s http://localhost/api/v1/status | jq . || curl -s http://localhost/api/v1/status
    echo ""
}

# Main command handler
case "${1:-help}" in
    start)
        start
        ;;
    stop)
        stop
        ;;
    restart)
        restart
        ;;
    logs)
        shift
        logs "$@"
        ;;
    status)
        status
        ;;
    clean)
        clean
        ;;
    test)
        test_endpoints
        ;;
    help)
        echo "Usage: $0 {start|stop|restart|logs|status|clean|test|help}"
        echo ""
        echo "Commands:"
        echo "  start   - Start development environment"
        echo "  stop    - Stop development environment"
        echo "  restart - Restart development environment"
        echo "  logs    - View service logs"
        echo "  status  - Show service status"
        echo "  clean   - Remove all containers and volumes"
        echo "  test    - Test API endpoints"
        echo "  help    - Show this help message"
        ;;
    *)
        log_error "Unknown command: $1"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac