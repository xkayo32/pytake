#!/bin/bash
# PyTake Backend - Production Deployment Script
# Usage: ./deploy.sh [command] [options]

set -euo pipefail

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DOCKER_COMPOSE_FILE="$PROJECT_DIR/docker-compose.production.yml"
ENV_FILE="$PROJECT_DIR/.env.production"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
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

# Check if required tools are installed
check_dependencies() {
    log_info "Checking dependencies..."
    
    local deps=("docker" "docker-compose" "curl" "openssl")
    for dep in "${deps[@]}"; do
        if ! command -v "$dep" &> /dev/null; then
            log_error "$dep is required but not installed"
            exit 1
        fi
    done
    
    log_success "All dependencies are installed"
}

# Validate environment file
validate_env() {
    log_info "Validating environment configuration..."
    
    if [[ ! -f "$ENV_FILE" ]]; then
        log_error "Environment file not found: $ENV_FILE"
        exit 1
    fi
    
    # Required environment variables
    local required_vars=(
        "POSTGRES_PASSWORD"
        "REDIS_PASSWORD"
        "JWT_SECRET"
        "WHATSAPP_ACCESS_TOKEN"
        "WHATSAPP_PHONE_NUMBER_ID"
        "WHATSAPP_WEBHOOK_VERIFY_TOKEN"
        "WHATSAPP_WEBHOOK_SECRET"
        "OPENAI_API_KEY"
        "GRAFANA_PASSWORD"
    )
    
    source "$ENV_FILE"
    
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            log_error "Required environment variable $var is not set"
            exit 1
        fi
    done
    
    # Validate JWT secret length (should be at least 32 characters)
    if [[ ${#JWT_SECRET} -lt 32 ]]; then
        log_error "JWT_SECRET must be at least 32 characters long"
        exit 1
    fi
    
    log_success "Environment validation passed"
}

# Create required directories
create_directories() {
    log_info "Creating required directories..."
    
    local dirs=(
        "$PROJECT_DIR/logs"
        "$PROJECT_DIR/uploads"
        "$PROJECT_DIR/backups"
        "$PROJECT_DIR/nginx/logs"
        "/var/www/certbot"
    )
    
    for dir in "${dirs[@]}"; do
        mkdir -p "$dir"
        log_info "Created directory: $dir"
    done
    
    log_success "All directories created"
}

# Build Docker images
build_images() {
    log_info "Building Docker images..."
    
    cd "$PROJECT_DIR"
    
    # Build the main application image
    docker build -t pytake-api:latest .
    
    log_success "Docker images built successfully"
}

# Deploy the application
deploy() {
    log_info "Deploying PyTake Backend..."
    
    # Load environment variables
    set -a
    source "$ENV_FILE"
    set +a
    
    # Deploy with Docker Compose
    cd "$PROJECT_DIR"
    docker-compose -f "$DOCKER_COMPOSE_FILE" up -d
    
    # Wait for services to be ready
    log_info "Waiting for services to be ready..."
    sleep 30
    
    # Health check
    if health_check; then
        log_success "Deployment completed successfully!"
        log_info "Application is available at: https://api.pytake.com"
        log_info "Monitoring is available at: https://monitoring.pytake.com"
    else
        log_error "Deployment failed - services are not healthy"
        exit 1
    fi
}

# Update the application
update() {
    log_info "Updating PyTake Backend..."
    
    # Pull latest code (if using Git deployment)
    if [[ -d "$PROJECT_DIR/.git" ]]; then
        cd "$PROJECT_DIR"
        git pull
    fi
    
    # Rebuild images
    build_images
    
    # Rolling update
    cd "$PROJECT_DIR"
    docker-compose -f "$DOCKER_COMPOSE_FILE" up -d --no-deps pytake-api
    
    # Wait for the new version to be ready
    sleep 15
    
    if health_check; then
        log_success "Update completed successfully!"
    else
        log_error "Update failed - rolling back"
        rollback
    fi
}

# Rollback to previous version
rollback() {
    log_warning "Rolling back to previous version..."
    
    cd "$PROJECT_DIR"
    
    # This would typically involve restoring from a backup or previous image
    # For now, we'll restart the current services
    docker-compose -f "$DOCKER_COMPOSE_FILE" restart pytake-api
    
    sleep 15
    
    if health_check; then
        log_success "Rollback completed"
    else
        log_error "Rollback failed - manual intervention required"
        exit 1
    fi
}

# Health check
health_check() {
    log_info "Performing health check..."
    
    local max_attempts=30
    local attempt=0
    
    while [[ $attempt -lt $max_attempts ]]; do
        if curl -f -s http://localhost:8080/health > /dev/null 2>&1; then
            log_success "Health check passed"
            return 0
        fi
        
        attempt=$((attempt + 1))
        log_info "Health check attempt $attempt/$max_attempts..."
        sleep 2
    done
    
    log_error "Health check failed after $max_attempts attempts"
    return 1
}

# Show application status
status() {
    log_info "PyTake Backend Status:"
    echo
    
    cd "$PROJECT_DIR"
    docker-compose -f "$DOCKER_COMPOSE_FILE" ps
    
    echo
    log_info "Service Health:"
    
    # API Health
    if curl -f -s http://localhost:8080/health > /dev/null 2>&1; then
        echo -e "  API:        ${GREEN}✓ Healthy${NC}"
    else
        echo -e "  API:        ${RED}✗ Unhealthy${NC}"
    fi
    
    # Database Health
    if docker exec pytake-postgres pg_isready -U pytake > /dev/null 2>&1; then
        echo -e "  Database:   ${GREEN}✓ Healthy${NC}"
    else
        echo -e "  Database:   ${RED}✗ Unhealthy${NC}"
    fi
    
    # Redis Health
    if docker exec pytake-redis redis-cli ping > /dev/null 2>&1; then
        echo -e "  Redis:      ${GREEN}✓ Healthy${NC}"
    else
        echo -e "  Redis:      ${RED}✗ Unhealthy${NC}"
    fi
}

# Show application logs
logs() {
    local service="${1:-}"
    
    cd "$PROJECT_DIR"
    
    if [[ -n "$service" ]]; then
        docker-compose -f "$DOCKER_COMPOSE_FILE" logs -f "$service"
    else
        docker-compose -f "$DOCKER_COMPOSE_FILE" logs -f
    fi
}

# Stop all services
stop() {
    log_info "Stopping PyTake Backend..."
    
    cd "$PROJECT_DIR"
    docker-compose -f "$DOCKER_COMPOSE_FILE" down
    
    log_success "All services stopped"
}

# Restart all services
restart() {
    log_info "Restarting PyTake Backend..."
    
    cd "$PROJECT_DIR"
    docker-compose -f "$DOCKER_COMPOSE_FILE" restart
    
    sleep 15
    
    if health_check; then
        log_success "Services restarted successfully"
    else
        log_error "Restart failed"
        exit 1
    fi
}

# SSL certificate setup
setup_ssl() {
    log_info "Setting up SSL certificates..."
    
    # This would typically involve Let's Encrypt setup
    # For now, generate self-signed certificates for testing
    
    local ssl_dir="$PROJECT_DIR/nginx/ssl"
    mkdir -p "$ssl_dir"
    
    # Generate self-signed certificate for testing
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout "$ssl_dir/api.pytake.com.key" \
        -out "$ssl_dir/api.pytake.com.crt" \
        -subj "/C=BR/ST=SP/L=São Paulo/O=PyTake/OU=IT/CN=api.pytake.com"
    
    # Copy for monitoring domain
    cp "$ssl_dir/api.pytake.com.key" "$ssl_dir/monitoring.pytake.com.key"
    cp "$ssl_dir/api.pytake.com.crt" "$ssl_dir/monitoring.pytake.com.crt"
    cp "$ssl_dir/api.pytake.com.key" "$ssl_dir/prometheus.pytake.com.key"
    cp "$ssl_dir/api.pytake.com.crt" "$ssl_dir/prometheus.pytake.com.crt"
    
    # Create chain file (empty for self-signed)
    touch "$ssl_dir/chain.pem"
    
    log_success "SSL certificates generated"
    log_warning "Using self-signed certificates. Replace with proper certificates for production!"
}

# Show help
show_help() {
    cat << EOF
PyTake Backend Deployment Script

Usage: $0 [COMMAND] [OPTIONS]

Commands:
  deploy          Deploy the application for the first time
  update          Update the application to latest version
  rollback        Rollback to previous version
  status          Show application status
  logs [service]  Show logs (optionally for specific service)
  stop            Stop all services
  restart         Restart all services
  ssl             Setup SSL certificates
  backup          Create database backup
  restore [file]  Restore database from backup
  help            Show this help message

Examples:
  $0 deploy                    # Initial deployment
  $0 update                    # Update application
  $0 status                    # Check status
  $0 logs pytake-api          # Show API logs
  $0 backup                    # Create backup
  $0 restore backup_file.sql   # Restore from backup

Environment:
  Configure your environment in .env.production before deployment.

EOF
}

# Main script logic
main() {
    case "${1:-help}" in
        "deploy")
            check_dependencies
            validate_env
            create_directories
            build_images
            deploy
            ;;
        "update")
            check_dependencies
            validate_env
            update
            ;;
        "rollback")
            rollback
            ;;
        "status")
            status
            ;;
        "logs")
            logs "${2:-}"
            ;;
        "stop")
            stop
            ;;
        "restart")
            restart
            ;;
        "ssl")
            setup_ssl
            ;;
        "backup")
            "$SCRIPT_DIR/backup.sh" create
            ;;
        "restore")
            if [[ -z "${2:-}" ]]; then
                log_error "Backup file is required for restore"
                exit 1
            fi
            "$SCRIPT_DIR/backup.sh" restore "$2"
            ;;
        "help"|*)
            show_help
            ;;
    esac
}

# Run main function with all arguments
main "$@"