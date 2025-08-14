#!/bin/bash

# PyTake Backend Deployment Script
# Usage: ./deploy.sh [command]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="pytake-backend"
DOMAIN="api.pytake.net"
DOCKER_COMPOSE="docker-compose.yml"
ENV_FILE=".env"

# Functions
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}→ $1${NC}"
}

# Check if .env file exists
check_env() {
    if [ ! -f "$ENV_FILE" ]; then
        print_error "Environment file .env not found!"
        print_info "Creating .env from .env.example..."
        cp .env.example .env
        print_info "Please edit .env with your configuration values"
        exit 1
    fi
}

# Build Docker images
build() {
    print_info "Building Docker images..."
    docker-compose -f $DOCKER_COMPOSE build --no-cache
    print_success "Docker images built successfully"
}

# Start services
up() {
    print_info "Starting services..."
    docker-compose -f $DOCKER_COMPOSE up -d
    print_success "Services started successfully"
}

# Stop services
down() {
    print_info "Stopping services..."
    docker-compose -f $DOCKER_COMPOSE down
    print_success "Services stopped successfully"
}

# Restart services
restart() {
    print_info "Restarting services..."
    docker-compose -f $DOCKER_COMPOSE restart
    print_success "Services restarted successfully"
}

# View logs
logs() {
    docker-compose -f $DOCKER_COMPOSE logs -f "$@"
}

# Execute command in container
exec_cmd() {
    docker-compose -f $DOCKER_COMPOSE exec "$@"
}

# Run database migrations
migrate() {
    print_info "Running database migrations..."
    docker-compose -f $DOCKER_COMPOSE exec backend ./main migrate up
    print_success "Migrations completed successfully"
}

# Setup SSL certificates with Let's Encrypt
setup_ssl() {
    print_info "Setting up SSL certificates..."
    
    # Create required directories
    mkdir -p certbot/www certbot/conf
    
    # Start nginx temporarily for domain verification
    docker-compose -f $DOCKER_COMPOSE up -d nginx
    
    # Request certificate
    docker run --rm \
        -v $(pwd)/certbot/www:/var/www/certbot \
        -v $(pwd)/certbot/conf:/etc/letsencrypt \
        certbot/certbot certonly \
        --webroot \
        --webroot-path=/var/www/certbot \
        --email admin@pytake.net \
        --agree-tos \
        --no-eff-email \
        -d $DOMAIN \
        -d www.$DOMAIN
    
    print_success "SSL certificates obtained successfully"
    
    # Restart nginx with SSL
    docker-compose -f $DOCKER_COMPOSE restart nginx
}

# Renew SSL certificates
renew_ssl() {
    print_info "Renewing SSL certificates..."
    docker run --rm \
        -v $(pwd)/certbot/www:/var/www/certbot \
        -v $(pwd)/certbot/conf:/etc/letsencrypt \
        certbot/certbot renew
    
    docker-compose -f $DOCKER_COMPOSE restart nginx
    print_success "SSL certificates renewed successfully"
}

# Check service health
health() {
    print_info "Checking service health..."
    
    # Check if services are running
    docker-compose -f $DOCKER_COMPOSE ps
    
    # Check backend health
    if curl -f -s http://localhost/health > /dev/null; then
        print_success "Backend is healthy"
    else
        print_error "Backend health check failed"
    fi
    
    # Check database connection
    docker-compose -f $DOCKER_COMPOSE exec postgres pg_isready -U pytake
    if [ $? -eq 0 ]; then
        print_success "Database is healthy"
    else
        print_error "Database health check failed"
    fi
}

# Backup database
backup() {
    print_info "Creating database backup..."
    
    BACKUP_DIR="backups"
    mkdir -p $BACKUP_DIR
    
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="$BACKUP_DIR/pytake_backup_$TIMESTAMP.sql"
    
    docker-compose -f $DOCKER_COMPOSE exec -T postgres pg_dump -U pytake pytake > $BACKUP_FILE
    
    if [ -f $BACKUP_FILE ]; then
        gzip $BACKUP_FILE
        print_success "Backup created: ${BACKUP_FILE}.gz"
    else
        print_error "Backup failed"
    fi
}

# Restore database from backup
restore() {
    if [ -z "$1" ]; then
        print_error "Please provide backup file path"
        echo "Usage: ./deploy.sh restore backups/pytake_backup_YYYYMMDD_HHMMSS.sql.gz"
        exit 1
    fi
    
    print_info "Restoring database from $1..."
    
    if [ ! -f "$1" ]; then
        print_error "Backup file not found: $1"
        exit 1
    fi
    
    # Decompress if gzipped
    if [[ $1 == *.gz ]]; then
        gunzip -c $1 | docker-compose -f $DOCKER_COMPOSE exec -T postgres psql -U pytake pytake
    else
        docker-compose -f $DOCKER_COMPOSE exec -T postgres psql -U pytake pytake < $1
    fi
    
    print_success "Database restored successfully"
}

# Update application
update() {
    print_info "Updating application..."
    
    # Pull latest code
    git pull origin main
    
    # Build new images
    build
    
    # Run migrations
    migrate
    
    # Restart services
    restart
    
    print_success "Application updated successfully"
}

# Full deployment
deploy() {
    print_info "Starting full deployment..."
    
    check_env
    build
    up
    
    # Wait for services to be ready
    print_info "Waiting for services to be ready..."
    sleep 10
    
    migrate
    health
    
    print_success "Deployment completed successfully!"
    print_info "Application is running at https://$DOMAIN"
}

# Development mode
dev() {
    print_info "Starting in development mode..."
    docker-compose -f docker-compose.dev.yml up
}

# Production deployment with monitoring
deploy_with_monitoring() {
    print_info "Deploying with monitoring stack..."
    docker-compose -f $DOCKER_COMPOSE --profile monitoring up -d
    print_success "Deployment with monitoring completed"
    print_info "Grafana is available at https://grafana.pytake.net"
}

# Clean up Docker resources
cleanup() {
    print_info "Cleaning up Docker resources..."
    docker-compose -f $DOCKER_COMPOSE down -v
    docker system prune -af
    print_success "Cleanup completed"
}

# Show usage
usage() {
    echo "PyTake Backend Deployment Script"
    echo ""
    echo "Usage: ./deploy.sh [command]"
    echo ""
    echo "Commands:"
    echo "  build                Build Docker images"
    echo "  up                   Start all services"
    echo "  down                 Stop all services"
    echo "  restart              Restart all services"
    echo "  logs [service]       View logs (optionally for specific service)"
    echo "  exec [service] [cmd] Execute command in container"
    echo "  migrate              Run database migrations"
    echo "  setup-ssl            Setup SSL certificates with Let's Encrypt"
    echo "  renew-ssl            Renew SSL certificates"
    echo "  health               Check service health"
    echo "  backup               Create database backup"
    echo "  restore [file]       Restore database from backup"
    echo "  update               Update application (pull, build, migrate, restart)"
    echo "  deploy               Full deployment (build, up, migrate, health)"
    echo "  deploy-monitoring    Deploy with monitoring stack"
    echo "  dev                  Start in development mode"
    echo "  cleanup              Clean up Docker resources"
    echo "  help                 Show this help message"
}

# Main script
case "$1" in
    build)
        build
        ;;
    up)
        up
        ;;
    down)
        down
        ;;
    restart)
        restart
        ;;
    logs)
        shift
        logs "$@"
        ;;
    exec)
        shift
        exec_cmd "$@"
        ;;
    migrate)
        migrate
        ;;
    setup-ssl)
        setup_ssl
        ;;
    renew-ssl)
        renew_ssl
        ;;
    health)
        health
        ;;
    backup)
        backup
        ;;
    restore)
        restore "$2"
        ;;
    update)
        update
        ;;
    deploy)
        deploy
        ;;
    deploy-monitoring)
        deploy_with_monitoring
        ;;
    dev)
        dev
        ;;
    cleanup)
        cleanup
        ;;
    help|"")
        usage
        ;;
    *)
        print_error "Unknown command: $1"
        usage
        exit 1
        ;;
esac