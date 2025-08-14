#!/bin/bash

# PyTake Production Deployment Script
# Usage: ./deploy-production.sh [command]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DOMAIN="api.pytake.net"
EMAIL="admin@pytake.net"
COMPOSE_FILE="docker-compose.production.yml"

# Functions
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Check if running as root or with sudo
check_permissions() {
    if [[ $EUID -ne 0 ]]; then
        print_error "This script must be run as root or with sudo"
        exit 1
    fi
}

# Setup SSL with Let's Encrypt
setup_ssl() {
    echo "Setting up SSL certificates for $DOMAIN..."
    
    # Create directories
    mkdir -p certbot/www
    mkdir -p certbot/conf
    
    # Start nginx temporarily for certificate generation
    docker-compose -f $COMPOSE_FILE up -d nginx
    
    # Get certificates
    docker run -it --rm \
        -v "$(pwd)/certbot/www:/var/www/certbot" \
        -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
        certbot/certbot certonly \
        --webroot \
        --webroot-path=/var/www/certbot \
        --email $EMAIL \
        --agree-tos \
        --no-eff-email \
        -d $DOMAIN \
        -d www.$DOMAIN
    
    if [ $? -eq 0 ]; then
        print_success "SSL certificates obtained successfully"
    else
        print_error "Failed to obtain SSL certificates"
        exit 1
    fi
}

# Deploy the application
deploy() {
    echo "Deploying PyTake to production..."
    
    # Pull latest images
    docker-compose -f $COMPOSE_FILE pull
    
    # Stop existing containers
    docker-compose -f $COMPOSE_FILE down
    
    # Start services
    docker-compose -f $COMPOSE_FILE up -d
    
    # Wait for services to be healthy
    echo "Waiting for services to be healthy..."
    sleep 10
    
    # Check health
    if docker-compose -f $COMPOSE_FILE ps | grep -q "unhealthy"; then
        print_error "Some services are unhealthy"
        docker-compose -f $COMPOSE_FILE ps
        exit 1
    fi
    
    print_success "Deployment completed successfully"
}

# Start services
start() {
    echo "Starting PyTake services..."
    docker-compose -f $COMPOSE_FILE up -d
    print_success "Services started"
}

# Stop services
stop() {
    echo "Stopping PyTake services..."
    docker-compose -f $COMPOSE_FILE down
    print_success "Services stopped"
}

# Restart services
restart() {
    echo "Restarting PyTake services..."
    docker-compose -f $COMPOSE_FILE restart
    print_success "Services restarted"
}

# View logs
logs() {
    docker-compose -f $COMPOSE_FILE logs -f
}

# Check status
status() {
    echo "PyTake Service Status:"
    docker-compose -f $COMPOSE_FILE ps
    
    echo -e "\n${GREEN}Health Checks:${NC}"
    
    # Check PostgreSQL
    if docker exec pytake-postgres-prod pg_isready -U pytake_admin > /dev/null 2>&1; then
        print_success "PostgreSQL is healthy"
    else
        print_error "PostgreSQL is not responding"
    fi
    
    # Check Redis
    if docker exec pytake-redis-prod redis-cli -a 'gOe7JRn+i8iWY5UAvYt3mJxBFJnAf9+jo/VZM3UN4xw=' ping > /dev/null 2>&1; then
        print_success "Redis is healthy"
    else
        print_error "Redis is not responding"
    fi
    
    # Check Backend API
    if curl -s http://localhost/health > /dev/null 2>&1; then
        print_success "Backend API is healthy"
    else
        print_error "Backend API is not responding"
    fi
    
    # Check SSL
    if [ -f "certbot/conf/live/$DOMAIN/fullchain.pem" ]; then
        print_success "SSL certificates found"
        # Check expiration
        expiry=$(openssl x509 -enddate -noout -in "certbot/conf/live/$DOMAIN/fullchain.pem" | cut -d= -f2)
        echo "  Certificate expires: $expiry"
    else
        print_warning "SSL certificates not found"
    fi
}

# Backup database
backup() {
    echo "Creating database backup..."
    
    BACKUP_DIR="backups"
    mkdir -p $BACKUP_DIR
    
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="$BACKUP_DIR/pytake_backup_$TIMESTAMP.sql"
    
    docker exec pytake-postgres-prod pg_dump -U pytake_admin pytake_production > $BACKUP_FILE
    
    if [ $? -eq 0 ]; then
        gzip $BACKUP_FILE
        print_success "Backup created: ${BACKUP_FILE}.gz"
    else
        print_error "Backup failed"
        exit 1
    fi
}

# Restore database
restore() {
    if [ -z "$2" ]; then
        print_error "Please provide backup file path"
        echo "Usage: $0 restore <backup_file.sql.gz>"
        exit 1
    fi
    
    BACKUP_FILE=$2
    
    if [ ! -f "$BACKUP_FILE" ]; then
        print_error "Backup file not found: $BACKUP_FILE"
        exit 1
    fi
    
    echo "Restoring database from $BACKUP_FILE..."
    
    # Decompress if needed
    if [[ $BACKUP_FILE == *.gz ]]; then
        gunzip -c $BACKUP_FILE | docker exec -i pytake-postgres-prod psql -U pytake_admin pytake_production
    else
        docker exec -i pytake-postgres-prod psql -U pytake_admin pytake_production < $BACKUP_FILE
    fi
    
    if [ $? -eq 0 ]; then
        print_success "Database restored successfully"
    else
        print_error "Restore failed"
        exit 1
    fi
}

# Update application
update() {
    echo "Updating PyTake..."
    
    # Create backup first
    backup
    
    # Pull latest changes
    git pull origin main
    
    # Deploy
    deploy
    
    print_success "Update completed"
}

# Main command handler
case "$1" in
    deploy)
        deploy
        ;;
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
        logs
        ;;
    status)
        status
        ;;
    ssl)
        check_permissions
        setup_ssl
        ;;
    backup)
        backup
        ;;
    restore)
        restore "$@"
        ;;
    update)
        update
        ;;
    *)
        echo "PyTake Production Deployment Script"
        echo "Usage: $0 {deploy|start|stop|restart|logs|status|ssl|backup|restore|update}"
        echo ""
        echo "Commands:"
        echo "  deploy   - Deploy the application"
        echo "  start    - Start all services"
        echo "  stop     - Stop all services"
        echo "  restart  - Restart all services"
        echo "  logs     - View service logs"
        echo "  status   - Check service status"
        echo "  ssl      - Setup SSL certificates (requires root)"
        echo "  backup   - Create database backup"
        echo "  restore  - Restore database from backup"
        echo "  update   - Update and redeploy application"
        exit 1
        ;;
esac