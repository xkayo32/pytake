#!/bin/bash

# PyTake Production Deployment Script
# Deploy para api.pytake.net

set -e

echo "🚀 PyTake Production Deployment for api.pytake.net"
echo "=================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="pytake"
COMPOSE_FILE="docker-compose.production.yml"
ENV_FILE=".env.production"

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
    
    log_success "Prerequisites check passed"
}

# Setup environment
setup_environment() {
    log_info "Setting up production environment..."
    
    if [ ! -f "$ENV_FILE" ]; then
        log_error "Environment file $ENV_FILE not found!"
        log_info "Creating production environment file with defaults..."
        log_warning "Please review and update the credentials in $ENV_FILE"
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
    log_info "Starting production deployment..."
    
    # Stop existing containers
    log_info "Stopping existing containers..."
    docker-compose -f $COMPOSE_FILE down --remove-orphans || true
    
    # Remove old images to force rebuild
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
    sleep 15
    
    # Check if containers are running
    if docker-compose -f $COMPOSE_FILE ps | grep -q "Up"; then
        log_success "Services are running"
    else
        log_error "Some services failed to start"
        docker-compose -f $COMPOSE_FILE logs
        exit 1
    fi
    
    # Check API health endpoint on localhost first
    local max_attempts=30
    local attempt=1
    
    log_info "Testing health endpoint locally..."
    while [ $attempt -le $max_attempts ]; do
        if curl -f http://localhost/health &> /dev/null; then
            log_success "Local API health check passed"
            break
        else
            log_info "Waiting for API to be ready... (attempt $attempt/$max_attempts)"
            sleep 5
            attempt=$((attempt + 1))
        fi
    done
    
    if [ $attempt -gt $max_attempts ]; then
        log_error "Local API health check failed after $max_attempts attempts"
        log_info "Checking container logs..."
        docker-compose -f $COMPOSE_FILE logs --tail=50 backend
        exit 1
    fi
}

# Show deployment info
show_info() {
    echo ""
    echo "======================================================="
    log_success "PyTake Production Server deployed! 🎉"
    echo "======================================================="
    echo ""
    
    echo "📍 Production URLs:"
    echo "   API:        http://api.pytake.net/"
    echo "   Health:     http://api.pytake.net/health"
    echo "   Docs:       http://api.pytake.net/docs"
    echo "   ReDoc:      http://api.pytake.net/redoc"
    echo "   RapiDoc:    http://api.pytake.net/rapidoc"
    echo ""
    
    echo "🔧 Management Commands:"
    echo "   View logs:     docker-compose -f $COMPOSE_FILE logs -f"
    echo "   Backend logs:  docker-compose -f $COMPOSE_FILE logs -f backend"
    echo "   Nginx logs:    docker-compose -f $COMPOSE_FILE logs -f nginx"
    echo "   Stop services: docker-compose -f $COMPOSE_FILE down"
    echo "   Restart:       docker-compose -f $COMPOSE_FILE restart"
    echo ""
    
    echo "📋 Next Steps:"
    echo "   1. Test: curl http://api.pytake.net/health"
    echo "   2. Configure SSL with: ./deploy-production.sh ssl"
    echo "   3. Configure WhatsApp webhook: http://api.pytake.net/api/v1/whatsapp/webhook"
    echo "   4. Access admin: admin@pytake.com / admin123"
    echo ""
    
    log_warning "PRODUCTION: SSL not configured yet. Run './deploy-production.sh ssl' to enable HTTPS"
}

# SSL setup with Let's Encrypt
setup_ssl() {
    log_info "Setting up SSL with Let's Encrypt for api.pytake.net..."
    
    DOMAIN="api.pytake.net"
    read -p "Enter your email for Let's Encrypt: " EMAIL
    
    if [ -z "$EMAIL" ]; then
        log_error "Email is required for SSL setup"
        exit 1
    fi
    
    # Stop nginx temporarily
    log_info "Stopping nginx temporarily..."
    docker-compose -f $COMPOSE_FILE stop nginx
    
    # Install certbot if not present
    if ! command -v certbot &> /dev/null; then
        log_info "Installing certbot..."
        sudo apt-get update
        sudo apt-get install -y certbot
    fi
    
    # Get certificate
    log_info "Getting SSL certificate for $DOMAIN..."
    sudo certbot certonly --standalone \
        --email $EMAIL \
        --agree-tos \
        --no-eff-email \
        -d $DOMAIN
    
    # Copy certificates
    log_info "Installing certificates..."
    mkdir -p ./ssl
    sudo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem ./ssl/cert.pem
    sudo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem ./ssl/key.pem
    sudo chown $USER:$USER ./ssl/*.pem
    
    # Update nginx configuration to use HTTPS template
    log_info "Updating nginx to HTTPS configuration..."
    # TODO: Switch to HTTPS template and restart
    
    log_success "SSL certificate installed for $DOMAIN"
    log_info "Please update nginx configuration to use HTTPS template and restart"
}

# Main script
main() {
    case "${1:-deploy}" in
        "deploy")
            check_prerequisites
            setup_environment
            deploy
            check_health
            show_info
            ;;
        "ssl")
            setup_ssl
            ;;
        "logs")
            docker-compose -f $COMPOSE_FILE logs -f
            ;;
        "stop")
            docker-compose -f $COMPOSE_FILE down
            log_success "Production services stopped"
            ;;
        "restart")
            docker-compose -f $COMPOSE_FILE restart
            log_success "Production services restarted"
            ;;
        "status")
            docker-compose -f $COMPOSE_FILE ps
            ;;
        "test")
            log_info "Testing production endpoints..."
            echo ""
            echo "Testing local health:"
            curl -s http://localhost/health | jq . 2>/dev/null || curl -s http://localhost/health
            echo ""
            echo "Testing domain health:"
            curl -s http://api.pytake.net/health | jq . 2>/dev/null || curl -s http://api.pytake.net/health
            echo ""
            ;;
        *)
            echo "Usage: $0 {deploy|ssl|logs|stop|restart|status|test}"
            echo ""
            echo "Commands:"
            echo "  deploy  - Deploy PyTake to production (default)"
            echo "  ssl     - Setup SSL certificate with Let's Encrypt"
            echo "  logs    - View service logs"
            echo "  stop    - Stop all services"
            echo "  restart - Restart all services"
            echo "  status  - Show service status"
            echo "  test    - Test production endpoints"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"