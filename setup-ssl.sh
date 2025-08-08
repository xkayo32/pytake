#!/bin/bash

# PyTake SSL Setup Script for api.pytake.net
# This script sets up SSL certificates using Let's Encrypt

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOMAIN="api.pytake.net"
EMAIL="admin@pytake.net"  # Change this to your email

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
if [[ $EUID -ne 0 ]]; then
   log_error "This script must be run as root for SSL setup"
   exit 1
fi

# Install certbot if not present
install_certbot() {
    if ! command -v certbot &> /dev/null; then
        log_info "Installing certbot..."
        apt-get update
        apt-get install -y certbot python3-certbot-nginx
        log_success "Certbot installed"
    else
        log_info "Certbot already installed"
    fi
}

# Stop services temporarily
stop_services() {
    log_info "Stopping services temporarily..."
    docker-compose down nginx 2>/dev/null || true
    systemctl stop nginx 2>/dev/null || true
    log_success "Services stopped"
}

# Get SSL certificate
get_certificate() {
    log_info "Obtaining SSL certificate for $DOMAIN..."
    
    certbot certonly \
        --standalone \
        --non-interactive \
        --agree-tos \
        --email $EMAIL \
        --domains $DOMAIN \
        --keep-until-expiring
    
    if [ $? -eq 0 ]; then
        log_success "SSL certificate obtained successfully"
    else
        log_error "Failed to obtain SSL certificate"
        exit 1
    fi
}

# Copy certificates to project
copy_certificates() {
    log_info "Copying certificates to project directory..."
    
    mkdir -p ./ssl
    
    cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem ./ssl/cert.pem
    cp /etc/letsencrypt/live/$DOMAIN/privkey.pem ./ssl/key.pem
    
    # Set proper permissions
    chmod 644 ./ssl/cert.pem
    chmod 600 ./ssl/key.pem
    
    log_success "Certificates copied to ./ssl/"
}

# Update environment file
update_env() {
    log_info "Updating environment configuration..."
    
    # Backup current .env
    cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
    
    # Update SSL settings in .env
    sed -i 's/SSL_ENABLED=false/SSL_ENABLED=true/' .env
    
    log_success "Environment updated for SSL"
}

# Setup auto-renewal
setup_renewal() {
    log_info "Setting up automatic certificate renewal..."
    
    # Create renewal script
    cat > /etc/cron.daily/pytake-ssl-renewal <<'EOF'
#!/bin/bash
certbot renew --quiet --no-self-upgrade --post-hook "
    cp /etc/letsencrypt/live/api.pytake.net/fullchain.pem /home/administrator/pytake-backend/ssl/cert.pem
    cp /etc/letsencrypt/live/api.pytake.net/privkey.pem /home/administrator/pytake-backend/ssl/key.pem
    cd /home/administrator/pytake-backend && docker-compose restart nginx
"
EOF
    
    chmod +x /etc/cron.daily/pytake-ssl-renewal
    
    log_success "Auto-renewal configured"
}

# Update Nginx configuration
update_nginx_config() {
    log_info "Updating Nginx configuration for SSL..."
    
    # Use SSL template if SSL is enabled
    if [ -f "nginx-ssl.conf.template" ]; then
        cp nginx-ssl.conf.template nginx.conf.template
        log_success "Nginx configuration updated for SSL"
    fi
}

# Start services with SSL
start_services() {
    log_info "Starting services with SSL enabled..."
    
    # Rebuild and start services
    docker-compose up -d --build nginx
    
    # Wait for services to be ready
    sleep 5
    
    # Test HTTPS
    if curl -k https://$DOMAIN/health &>/dev/null; then
        log_success "HTTPS is working!"
    else
        log_warning "HTTPS test failed, check the logs"
    fi
}

# Main execution
main() {
    echo "======================================"
    echo "   PyTake SSL Setup for $DOMAIN"
    echo "======================================"
    echo ""
    
    log_warning "This script will configure SSL for $DOMAIN"
    read -p "Continue? (y/N) " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Setup cancelled"
        exit 0
    fi
    
    install_certbot
    stop_services
    get_certificate
    copy_certificates
    update_env
    update_nginx_config
    setup_renewal
    start_services
    
    echo ""
    echo "======================================"
    log_success "SSL setup completed!"
    echo "======================================"
    echo ""
    echo "📌 Access URLs:"
    echo "   HTTPS: https://$DOMAIN"
    echo "   API: https://$DOMAIN/api/v1/"
    echo "   Swagger: https://$DOMAIN/docs"
    echo ""
    echo "🔒 SSL Certificate:"
    echo "   Domain: $DOMAIN"
    echo "   Auto-renewal: Enabled"
    echo "   Certificate location: ./ssl/"
    echo ""
    echo "⚠️  Important:"
    echo "   - HTTP traffic (port 80) will redirect to HTTPS (port 443)"
    echo "   - Certificate will auto-renew before expiration"
    echo "   - Backup created at .env.backup.*"
}

# Run main function
main