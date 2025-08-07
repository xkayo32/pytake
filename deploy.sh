#!/bin/bash

# PyTake Production Deployment Script
# Run this script on your server to deploy PyTake

set -e

echo "🚀 PyTake Development Deployment"
echo "================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="pytake"
COMPOSE_FILE="docker-compose.yml"
ENV_FILE=".env.development"

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

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        log_error "This script should not be run as root for security reasons"
        exit 1
    fi
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    # Check if user is in docker group
    if ! groups $USER | grep -q docker; then
        log_warning "User $USER is not in docker group. You may need to use sudo for docker commands."
    fi
    
    log_success "Prerequisites check passed"
}

# Setup environment
setup_environment() {
    log_info "Setting up environment..."
    
    if [ ! -f "$ENV_FILE" ]; then
        log_error "Environment file $ENV_FILE not found!"
        log_info "Please copy .env.production and configure it with your values"
        exit 1
    fi
    
    # Create necessary directories
    mkdir -p ./uploads ./logs ./ssl
    
    # Set proper permissions
    chmod 755 ./uploads ./logs
    
    log_success "Environment setup completed"
}

# Build and deploy
deploy() {
    log_info "Starting deployment..."
    
    # Stop existing containers
    log_info "Stopping existing containers..."
    docker-compose -f $COMPOSE_FILE down --remove-orphans || true
    
    # Remove old images
    log_info "Cleaning up old images..."
    docker system prune -f
    
    # Build and start services
    log_info "Building and starting services..."
    docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE build --no-cache
    docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE up -d
    
    log_success "Deployment completed!"
}

# Check service health
check_health() {
    log_info "Checking service health..."
    
    # Wait for services to be ready
    sleep 10
    
    # Check if containers are running
    if docker-compose -f $COMPOSE_FILE ps | grep -q "Up"; then
        log_success "Services are running"
    else
        log_error "Some services failed to start"
        docker-compose -f $COMPOSE_FILE logs
        exit 1
    fi
    
    # Check API health endpoint
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f http://localhost/health &> /dev/null; then
            log_success "API health check passed"
            break
        else
            log_info "Waiting for API to be ready... (attempt $attempt/$max_attempts)"
            sleep 5
            attempt=$((attempt + 1))
        fi
    done
    
    if [ $attempt -gt $max_attempts ]; then
        log_error "API health check failed after $max_attempts attempts"
        exit 1
    fi
}

# Show deployment info
show_info() {
    echo ""
    echo "================================"
    log_success "PyTake Development Server deployed! 🎉"
    echo "========================================"
    echo ""
    
    # Get server IP
    SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')
    
    echo "📍 Access URLs:"
    echo "   HTTP:  http://$SERVER_IP"
    echo "   API:   http://$SERVER_IP/api/v1/"
    echo "   Health: http://$SERVER_IP/health"
    echo ""
    
    echo "🔧 Management Commands:"
    echo "   View logs:     docker-compose -f $COMPOSE_FILE logs -f"
    echo "   Stop services: docker-compose -f $COMPOSE_FILE down"
    echo "   Restart:       docker-compose -f $COMPOSE_FILE restart"
    echo "   Update:        ./deploy.sh"
    echo ""
    
    echo "📋 Next Steps:"
    echo "   1. Configure WhatsApp webhook URL to: http://$SERVER_IP/api/webhooks/whatsapp"
    echo "   2. Test API endpoints with your credentials"
    echo "   3. Access admin panel: admin@pytake.com / admin123"
    echo "   4. Test WhatsApp integration with: +5561994013828"
    echo ""
    
    log_warning "DEVELOPMENT SERVER: Logs are verbose and CORS is permissive!"
}

# Backup function
backup() {
    log_info "Creating backup..."
    
    BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p $BACKUP_DIR
    
    # Backup database
    docker-compose -f $COMPOSE_FILE exec -T postgres pg_dump -U pytake pytake_production > $BACKUP_DIR/database.sql
    
    # Backup uploads
    cp -r ./uploads $BACKUP_DIR/ 2>/dev/null || true
    
    # Backup environment file
    cp $ENV_FILE $BACKUP_DIR/
    
    log_success "Backup created at $BACKUP_DIR"
}

# SSL setup with Let's Encrypt
setup_ssl() {
    log_info "Setting up SSL with Let's Encrypt..."
    
    read -p "Enter your domain name: " DOMAIN
    read -p "Enter your email for Let's Encrypt: " EMAIL
    
    if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
        log_error "Domain and email are required for SSL setup"
        exit 1
    fi
    
    # Install certbot if not present
    if ! command -v certbot &> /dev/null; then
        log_info "Installing certbot..."
        sudo apt-get update
        sudo apt-get install -y certbot
    fi
    
    # Stop nginx temporarily
    docker-compose -f $COMPOSE_FILE stop nginx
    
    # Get certificate
    sudo certbot certonly --standalone \
        --email $EMAIL \
        --agree-tos \
        --no-eff-email \
        -d $DOMAIN
    
    # Copy certificates
    sudo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem ./ssl/cert.pem
    sudo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem ./ssl/key.pem
    sudo chown $USER:$USER ./ssl/*.pem
    
    # Restart nginx
    docker-compose -f $COMPOSE_FILE start nginx
    
    log_success "SSL certificate installed for $DOMAIN"
}

# Main script
main() {
    case "${1:-deploy}" in
        "deploy")
            check_root
            check_prerequisites
            setup_environment
            deploy
            check_health
            show_info
            ;;
        "backup")
            backup
            ;;
        "ssl")
            setup_ssl
            ;;
        "logs")
            docker-compose -f $COMPOSE_FILE logs -f
            ;;
        "stop")
            docker-compose -f $COMPOSE_FILE down
            log_success "Services stopped"
            ;;
        "restart")
            docker-compose -f $COMPOSE_FILE restart
            log_success "Services restarted"
            ;;
        "status")
            docker-compose -f $COMPOSE_FILE ps
            ;;
        "update")
            log_info "Pulling latest changes..."
            git pull origin main
            main deploy
            ;;
        *)
            echo "Usage: $0 {deploy|backup|ssl|logs|stop|restart|status|update}"
            echo ""
            echo "Commands:"
            echo "  deploy  - Deploy PyTake (default)"
            echo "  backup  - Create backup of database and files"
            echo "  ssl     - Setup SSL certificate with Let's Encrypt"
            echo "  logs    - View service logs"
            echo "  stop    - Stop all services"
            echo "  restart - Restart all services"
            echo "  status  - Show service status"
            echo "  update  - Pull changes and redeploy"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"