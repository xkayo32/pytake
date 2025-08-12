#!/bin/bash
# PyTake Backend - SSL Certificate Setup with Let's Encrypt
# Usage: ./ssl-setup.sh [init|renew|status] [domain]

set -euo pipefail

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DOCKER_COMPOSE_FILE="$PROJECT_DIR/docker-compose.production.yml"
SSL_DIR="$PROJECT_DIR/nginx/ssl"
CERTBOT_DIR="/var/www/certbot"

# Default domains
DEFAULT_DOMAINS=("api.pytake.com" "monitoring.pytake.com" "prometheus.pytake.com")

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

# Check if Certbot is available
check_certbot() {
    if ! command -v certbot &> /dev/null; then
        log_info "Installing Certbot..."
        
        # Install Certbot based on OS
        if command -v apt-get &> /dev/null; then
            sudo apt-get update
            sudo apt-get install -y certbot
        elif command -v yum &> /dev/null; then
            sudo yum install -y certbot
        elif command -v brew &> /dev/null; then
            brew install certbot
        else
            log_error "Cannot install Certbot automatically. Please install manually."
            exit 1
        fi
        
        log_success "Certbot installed successfully"
    fi
}

# Setup initial SSL certificates
init_ssl() {
    local domains=("$@")
    if [[ ${#domains[@]} -eq 0 ]]; then
        domains=("${DEFAULT_DOMAINS[@]}")
    fi
    
    log_info "Setting up SSL certificates for domains: ${domains[*]}"
    
    # Create necessary directories
    mkdir -p "$SSL_DIR"
    mkdir -p "$CERTBOT_DIR"
    
    # Check if certificates already exist
    local existing_certs=()
    for domain in "${domains[@]}"; do
        if [[ -f "$SSL_DIR/$domain.crt" ]] && [[ -f "$SSL_DIR/$domain.key" ]]; then
            existing_certs+=("$domain")
        fi
    done
    
    if [[ ${#existing_certs[@]} -gt 0 ]]; then
        log_warning "Existing certificates found for: ${existing_certs[*]}"
        read -p "Do you want to replace them? (y/N): " -n 1 -r
        echo
        
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Keeping existing certificates"
            return 0
        fi
    fi
    
    # Generate temporary self-signed certificates for initial setup
    log_info "Generating temporary self-signed certificates..."
    for domain in "${domains[@]}"; do
        openssl req -x509 -nodes -days 1 -newkey rsa:2048 \
            -keyout "$SSL_DIR/$domain.key" \
            -out "$SSL_DIR/$domain.crt" \
            -subj "/C=BR/ST=SP/L=São Paulo/O=PyTake/OU=IT/CN=$domain" \
            2>/dev/null
        
        log_info "Temporary certificate created for $domain"
    done
    
    # Create chain file
    touch "$SSL_DIR/chain.pem"
    
    # Start Nginx to handle ACME challenge
    log_info "Starting Nginx for ACME challenge..."
    cd "$PROJECT_DIR"
    docker-compose -f "$DOCKER_COMPOSE_FILE" up -d nginx
    
    # Wait for Nginx to start
    sleep 10
    
    # Request real certificates from Let's Encrypt
    for domain in "${domains[@]}"; do
        request_certificate "$domain"
    done
    
    # Reload Nginx with new certificates
    log_info "Reloading Nginx with new certificates..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" exec nginx nginx -s reload
    
    # Set up automatic renewal
    setup_auto_renewal
    
    log_success "SSL certificate setup completed!"
}

# Request certificate for a specific domain
request_certificate() {
    local domain="$1"
    
    log_info "Requesting Let's Encrypt certificate for $domain..."
    
    # Request certificate using webroot method
    if certbot certonly \
        --webroot \
        --webroot-path="$CERTBOT_DIR" \
        --email "${SSL_EMAIL:-admin@pytake.com}" \
        --agree-tos \
        --no-eff-email \
        --force-renewal \
        -d "$domain"; then
        
        # Copy certificates to SSL directory
        cp "/etc/letsencrypt/live/$domain/privkey.pem" "$SSL_DIR/$domain.key"
        cp "/etc/letsencrypt/live/$domain/fullchain.pem" "$SSL_DIR/$domain.crt"
        cp "/etc/letsencrypt/live/$domain/chain.pem" "$SSL_DIR/chain.pem"
        
        # Set correct permissions
        chmod 600 "$SSL_DIR/$domain.key"
        chmod 644 "$SSL_DIR/$domain.crt"
        
        log_success "Certificate obtained for $domain"
    else
        log_error "Failed to obtain certificate for $domain"
        log_warning "Using temporary self-signed certificate"
    fi
}

# Renew certificates
renew_ssl() {
    log_info "Renewing SSL certificates..."
    
    # Renew all certificates
    if certbot renew --quiet; then
        log_success "Certificates renewed successfully"
        
        # Copy renewed certificates
        for cert_dir in /etc/letsencrypt/live/*/; do
            if [[ -d "$cert_dir" ]]; then
                domain=$(basename "$cert_dir")
                
                if [[ -f "$cert_dir/privkey.pem" ]] && [[ -f "$cert_dir/fullchain.pem" ]]; then
                    cp "$cert_dir/privkey.pem" "$SSL_DIR/$domain.key"
                    cp "$cert_dir/fullchain.pem" "$SSL_DIR/$domain.crt"
                    
                    log_info "Updated certificate for $domain"
                fi
            fi
        done
        
        # Reload Nginx
        cd "$PROJECT_DIR"
        if docker-compose -f "$DOCKER_COMPOSE_FILE" exec nginx nginx -s reload; then
            log_success "Nginx reloaded with renewed certificates"
        else
            log_warning "Failed to reload Nginx"
        fi
        
    else
        log_warning "Some certificates may not have been renewed"
    fi
}

# Setup automatic certificate renewal
setup_auto_renewal() {
    log_info "Setting up automatic certificate renewal..."
    
    # Create renewal script
    local renewal_script="$SCRIPT_DIR/ssl-renew-cron.sh"
    
    cat > "$renewal_script" << 'EOF'
#!/bin/bash
# Automatic SSL certificate renewal script

# Change to script directory
cd "$(dirname "$0")"

# Run renewal
./ssl-setup.sh renew

# Log renewal attempt
echo "$(date): SSL renewal attempted" >> /var/log/pytake-ssl-renewal.log
EOF
    
    chmod +x "$renewal_script"
    
    # Add cron job for automatic renewal (twice daily)
    local cron_job="0 0,12 * * * $renewal_script"
    
    # Check if cron job already exists
    if ! crontab -l 2>/dev/null | grep -q "$renewal_script"; then
        # Add cron job
        (crontab -l 2>/dev/null; echo "$cron_job") | crontab -
        log_success "Automatic renewal cron job added"
    else
        log_info "Automatic renewal cron job already exists"
    fi
    
    # Create systemd timer as alternative (if systemd is available)
    if command -v systemctl &> /dev/null; then
        setup_systemd_timer "$renewal_script"
    fi
}

# Setup systemd timer for certificate renewal
setup_systemd_timer() {
    local renewal_script="$1"
    
    log_info "Setting up systemd timer for certificate renewal..."
    
    # Create systemd service
    sudo tee /etc/systemd/system/pytake-ssl-renewal.service > /dev/null << EOF
[Unit]
Description=PyTake SSL Certificate Renewal
After=network.target

[Service]
Type=oneshot
ExecStart=$renewal_script
User=$(whoami)
EOF
    
    # Create systemd timer
    sudo tee /etc/systemd/system/pytake-ssl-renewal.timer > /dev/null << EOF
[Unit]
Description=Run PyTake SSL Certificate Renewal twice daily
Requires=pytake-ssl-renewal.service

[Timer]
OnCalendar=*-*-* 00,12:00:00
Persistent=true

[Install]
WantedBy=timers.target
EOF
    
    # Enable and start timer
    sudo systemctl daemon-reload
    sudo systemctl enable pytake-ssl-renewal.timer
    sudo systemctl start pytake-ssl-renewal.timer
    
    log_success "Systemd timer configured for automatic renewal"
}

# Check SSL certificate status
check_ssl_status() {
    local domains=("$@")
    if [[ ${#domains[@]} -eq 0 ]]; then
        domains=("${DEFAULT_DOMAINS[@]}")
    fi
    
    log_info "Checking SSL certificate status..."
    echo
    
    for domain in "${domains[@]}"; do
        echo -e "${BLUE}Domain: $domain${NC}"
        
        local cert_file="$SSL_DIR/$domain.crt"
        
        if [[ -f "$cert_file" ]]; then
            # Check certificate details
            local issuer=$(openssl x509 -in "$cert_file" -noout -issuer | sed 's/issuer=//g')
            local expiry=$(openssl x509 -in "$cert_file" -noout -enddate | sed 's/notAfter=//g')
            local subject=$(openssl x509 -in "$cert_file" -noout -subject | sed 's/subject=//g')
            
            echo "  Status: Certificate exists"
            echo "  Issuer: $issuer"
            echo "  Subject: $subject"
            echo "  Expires: $expiry"
            
            # Check if certificate is valid
            if openssl x509 -in "$cert_file" -checkend 2592000 -noout; then
                echo -e "  Validity: ${GREEN}Valid (expires in >30 days)${NC}"
            else
                echo -e "  Validity: ${YELLOW}Expires soon (<30 days)${NC}"
            fi
            
            # Check if it's a Let's Encrypt certificate
            if echo "$issuer" | grep -q "Let's Encrypt"; then
                echo -e "  Type: ${GREEN}Let's Encrypt${NC}"
            else
                echo -e "  Type: ${YELLOW}Self-signed/Other${NC}"
            fi
            
        else
            echo -e "  Status: ${RED}No certificate found${NC}"
        fi
        
        # Test HTTPS connection
        if curl -s -I "https://$domain" > /dev/null 2>&1; then
            echo -e "  HTTPS Test: ${GREEN}Success${NC}"
        else
            echo -e "  HTTPS Test: ${RED}Failed${NC}"
        fi
        
        echo
    done
}

# Test SSL configuration
test_ssl() {
    local domain="${1:-api.pytake.com}"
    
    log_info "Testing SSL configuration for $domain..."
    
    # Test SSL certificate
    echo "Testing certificate validity..."
    if openssl s_client -connect "$domain:443" -servername "$domain" < /dev/null; then
        log_success "SSL certificate test passed"
    else
        log_error "SSL certificate test failed"
    fi
    
    # Test SSL configuration with SSL Labs API (if available)
    if command -v curl &> /dev/null; then
        log_info "Running SSL Labs test (this may take a few minutes)..."
        local test_url="https://api.ssllabs.com/api/v3/analyze?host=$domain&publish=off&startNew=on&all=done"
        
        # Start test
        curl -s "$test_url" > /dev/null
        
        # Wait for results
        sleep 30
        
        # Get results
        local results_url="https://api.ssllabs.com/api/v3/analyze?host=$domain"
        local grade=$(curl -s "$results_url" | grep -o '"grade":"[A-F][+-]*"' | head -1 | cut -d'"' -f4)
        
        if [[ -n "$grade" ]]; then
            echo "SSL Labs Grade: $grade"
        else
            log_info "SSL Labs test results not available"
        fi
    fi
}

# Remove SSL certificates
remove_ssl() {
    local domain="${1:-}"
    
    if [[ -z "$domain" ]]; then
        log_error "Domain is required for removal"
        exit 1
    fi
    
    log_warning "This will remove SSL certificates for $domain"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Operation cancelled"
        exit 0
    fi
    
    # Remove local certificates
    rm -f "$SSL_DIR/$domain.key"
    rm -f "$SSL_DIR/$domain.crt"
    
    # Remove Let's Encrypt certificates
    if [[ -d "/etc/letsencrypt/live/$domain" ]]; then
        certbot delete --cert-name "$domain"
    fi
    
    log_success "SSL certificates removed for $domain"
}

# Show help
show_help() {
    cat << EOF
PyTake Backend SSL Certificate Management Script

Usage: $0 [COMMAND] [OPTIONS]

Commands:
  init [domains...]       Initialize SSL certificates for domains
  renew                   Renew all SSL certificates
  status [domains...]     Check certificate status
  test [domain]          Test SSL configuration
  remove <domain>        Remove SSL certificates for domain
  help                   Show this help message

Examples:
  $0 init                                    # Setup SSL for default domains
  $0 init api.pytake.com monitoring.pytake.com  # Setup for specific domains
  $0 renew                                   # Renew all certificates
  $0 status                                  # Check all certificate status
  $0 test api.pytake.com                     # Test SSL configuration
  $0 remove old-api.pytake.com              # Remove certificates

Environment Variables:
  SSL_EMAIL    - Email address for Let's Encrypt registration (default: admin@pytake.com)

Note:
  - Requires Certbot to be installed
  - Domains must point to this server
  - Port 80 must be accessible for ACME challenge

EOF
}

# Main script logic
main() {
    case "${1:-help}" in
        "init")
            check_certbot
            shift
            init_ssl "$@"
            ;;
        "renew")
            renew_ssl
            ;;
        "status")
            shift
            check_ssl_status "$@"
            ;;
        "test")
            test_ssl "${2:-}"
            ;;
        "remove")
            if [[ -z "${2:-}" ]]; then
                log_error "Domain is required for removal"
                exit 1
            fi
            remove_ssl "$2"
            ;;
        "help"|*)
            show_help
            ;;
    esac
}

# Run main function with all arguments
main "$@"