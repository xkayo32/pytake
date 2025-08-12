#!/bin/bash
# PyTake Backend - Deployment Validation Script
# Validates all deployment configurations and requirements

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
CHECKS_PASSED=0
CHECKS_FAILED=0
CHECKS_WARNING=0

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((CHECKS_PASSED++))
}

log_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
    ((CHECKS_WARNING++))
}

log_error() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((CHECKS_FAILED++))
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check Docker and Docker Compose
check_docker() {
    log_info "Checking Docker setup..."
    
    if command_exists docker; then
        log_success "Docker is installed: $(docker --version)"
    else
        log_error "Docker is not installed"
        return 1
    fi
    
    if command_exists docker-compose; then
        log_success "Docker Compose is installed: $(docker-compose --version)"
    else
        log_error "Docker Compose is not installed"
        return 1
    fi
    
    # Check if Docker daemon is running
    if docker info >/dev/null 2>&1; then
        log_success "Docker daemon is running"
    else
        log_error "Docker daemon is not running"
        return 1
    fi
}

# Validate Docker Compose files
check_docker_compose_files() {
    log_info "Validating Docker Compose configurations..."
    
    local files=("docker-compose.production.yml" "docker-compose.yml")
    
    for file in "${files[@]}"; do
        if [[ -f "$file" ]]; then
            if docker-compose -f "$file" config --quiet 2>/dev/null; then
                log_success "Docker Compose file '$file' is valid"
            else
                log_warning "Docker Compose file '$file' has validation issues (may need environment variables)"
            fi
        else
            log_warning "Docker Compose file '$file' not found"
        fi
    done
}

# Check environment files
check_environment_files() {
    log_info "Checking environment configuration files..."
    
    local files=(".env.development" ".env.production.example" ".env.docker")
    
    for file in "${files[@]}"; do
        if [[ -f "$file" ]]; then
            log_success "Environment file '$file' exists"
            
            # Check for required variables
            local required_vars=("DATABASE_URL" "REDIS_URL" "JWT_SECRET")
            for var in "${required_vars[@]}"; do
                if grep -q "^$var=" "$file"; then
                    log_success "  Required variable '$var' is defined in $file"
                else
                    log_warning "  Required variable '$var' not found in $file"
                fi
            done
        else
            if [[ "$file" == ".env.production.example" ]]; then
                log_success "Environment example file exists"
            else
                log_warning "Environment file '$file' not found"
            fi
        fi
    done
}

# Check Dockerfile
check_dockerfile() {
    log_info "Checking Dockerfile..."
    
    if [[ -f "Dockerfile" ]]; then
        log_success "Dockerfile exists"
        
        # Check for multi-stage build
        if grep -q "FROM.*AS.*builder" Dockerfile; then
            log_success "Dockerfile uses multi-stage build (optimized)"
        else
            log_warning "Dockerfile doesn't use multi-stage build"
        fi
        
        # Check for non-root user
        if grep -q "USER.*" Dockerfile; then
            log_success "Dockerfile sets non-root user (security best practice)"
        else
            log_warning "Dockerfile doesn't set non-root user"
        fi
        
        # Check for health check
        if grep -q "HEALTHCHECK" Dockerfile; then
            log_success "Dockerfile includes health check"
        else
            log_warning "Dockerfile doesn't include health check"
        fi
    else
        log_error "Dockerfile not found"
    fi
}

# Check Nginx configuration
check_nginx_config() {
    log_info "Checking Nginx configuration..."
    
    if [[ -d "nginx" ]]; then
        log_success "Nginx directory exists"
        
        local files=("nginx/nginx.conf" "nginx/sites-available/default.conf")
        for file in "${files[@]}"; do
            if [[ -f "$file" ]]; then
                log_success "Nginx config file '$file' exists"
                
                # Check for SSL configuration
                if grep -q "ssl_certificate" "$file"; then
                    log_success "  SSL configuration found in $file"
                else
                    log_warning "  No SSL configuration in $file"
                fi
                
                # Check for rate limiting
                if grep -q "limit_req" "$file"; then
                    log_success "  Rate limiting configured in $file"
                else
                    log_warning "  No rate limiting in $file"
                fi
            else
                log_warning "Nginx config file '$file' not found"
            fi
        done
    else
        log_warning "Nginx directory not found"
    fi
}

# Check monitoring configuration
check_monitoring_config() {
    log_info "Checking monitoring configuration..."
    
    if [[ -d "monitoring" ]]; then
        log_success "Monitoring directory exists"
        
        local files=(
            "monitoring/prometheus.yml"
            "monitoring/alerts/pytake-alerts.yml"
            "monitoring/rules/pytake-rules.yml"
        )
        
        for file in "${files[@]}"; do
            if [[ -f "$file" ]]; then
                log_success "Monitoring config '$file' exists"
            else
                log_warning "Monitoring config '$file' not found"
            fi
        done
        
        # Check Grafana dashboards
        if [[ -d "monitoring/grafana/dashboards" ]]; then
            local dashboard_count=$(find monitoring/grafana/dashboards -name "*.json" | wc -l)
            if [[ $dashboard_count -gt 0 ]]; then
                log_success "Found $dashboard_count Grafana dashboard(s)"
            else
                log_warning "No Grafana dashboards found"
            fi
        fi
    else
        log_warning "Monitoring directory not found"
    fi
}

# Check deployment scripts
check_deployment_scripts() {
    log_info "Checking deployment scripts..."
    
    local scripts=(
        "scripts/deploy.sh"
        "scripts/backup.sh" 
        "scripts/ssl-setup.sh"
        "scripts/log-setup.sh"
    )
    
    for script in "${scripts[@]}"; do
        if [[ -f "$script" ]]; then
            if [[ -x "$script" ]]; then
                log_success "Deployment script '$script' exists and is executable"
            else
                log_warning "Deployment script '$script' exists but is not executable"
            fi
        else
            log_warning "Deployment script '$script' not found"
        fi
    done
}

# Check test infrastructure
check_test_infrastructure() {
    log_info "Checking test infrastructure..."
    
    local test_files=(
        "tests/test-runner.sh"
        "tests/e2e/PyTakeAPI.postman_collection.json"
        "tests/e2e/test.postman_environment.json"
        "tests/performance/load_test.js"
    )
    
    for file in "${test_files[@]}"; do
        if [[ -f "$file" ]]; then
            log_success "Test file '$file' exists"
        else
            log_warning "Test file '$file' not found"
        fi
    done
    
    # Check for test runner executable
    if [[ -f "tests/test-runner.sh" ]] && [[ -x "tests/test-runner.sh" ]]; then
        log_success "Test runner is executable"
    else
        log_warning "Test runner is not executable or not found"
    fi
}

# Check Go configuration
check_go_config() {
    log_info "Checking Go configuration..."
    
    if [[ -f "go.mod" ]]; then
        log_success "go.mod exists"
        
        # Check Go version
        local go_version=$(grep "^go " go.mod | cut -d' ' -f2)
        if [[ -n "$go_version" ]]; then
            log_success "Go version specified: $go_version"
        else
            log_warning "Go version not clearly specified in go.mod"
        fi
    else
        log_error "go.mod not found"
    fi
    
    if [[ -f "go.sum" ]]; then
        log_success "go.sum exists (dependency verification)"
    else
        log_warning "go.sum not found (run 'go mod tidy')"
    fi
}

# Check security configuration
check_security_config() {
    log_info "Checking security configuration..."
    
    # Check for secrets in repository
    local sensitive_files=(".env" ".env.local" "*.key" "*.pem")
    local found_sensitive=false
    
    for pattern in "${sensitive_files[@]}"; do
        if ls $pattern 1> /dev/null 2>&1; then
            log_warning "Potentially sensitive file found: $pattern"
            found_sensitive=true
        fi
    done
    
    if [[ "$found_sensitive" == false ]]; then
        log_success "No sensitive files found in repository"
    fi
    
    # Check .gitignore
    if [[ -f ".gitignore" ]]; then
        if grep -q "\.env" .gitignore; then
            log_success ".gitignore properly excludes .env files"
        else
            log_warning ".gitignore doesn't exclude .env files"
        fi
    else
        log_warning ".gitignore not found"
    fi
}

# Check database migrations
check_database_config() {
    log_info "Checking database configuration..."
    
    if [[ -d "migrations" ]] || [[ -d "database/migrations" ]]; then
        log_success "Database migrations directory found"
    else
        log_warning "No database migrations directory found"
    fi
    
    # Check for database initialization
    if [[ -f "internal/database/migrate.go" ]] || [[ -f "cmd/migrate/main.go" ]]; then
        log_success "Database migration tool found"
    else
        log_warning "Database migration tool not found"
    fi
}

# Network connectivity check
check_network_requirements() {
    log_info "Checking network requirements..."
    
    # Check if we can resolve DNS
    if nslookup google.com >/dev/null 2>&1; then
        log_success "DNS resolution working"
    else
        log_warning "DNS resolution issues detected"
    fi
    
    # Check external service connectivity (if needed)
    local services=("api.whatsapp.com" "api.openai.com")
    
    for service in "${services[@]}"; do
        if ping -c 1 "$service" >/dev/null 2>&1; then
            log_success "Can reach $service"
        else
            log_warning "Cannot reach $service (may affect functionality)"
        fi
    done
}

# Generate deployment report
generate_report() {
    local total_checks=$((CHECKS_PASSED + CHECKS_FAILED + CHECKS_WARNING))
    
    echo
    echo "=================================="
    echo "PyTake Deployment Validation Report"
    echo "=================================="
    echo
    echo "Total Checks: $total_checks"
    echo -e "${GREEN}Passed: $CHECKS_PASSED${NC}"
    echo -e "${YELLOW}Warnings: $CHECKS_WARNING${NC}"
    echo -e "${RED}Failed: $CHECKS_FAILED${NC}"
    echo
    
    if [[ $CHECKS_FAILED -eq 0 ]]; then
        if [[ $CHECKS_WARNING -eq 0 ]]; then
            echo -e "${GREEN}✅ All checks passed! Ready for deployment.${NC}"
        else
            echo -e "${YELLOW}⚠️  All critical checks passed, but there are warnings to address.${NC}"
        fi
        return 0
    else
        echo -e "${RED}❌ Some critical checks failed. Please fix issues before deployment.${NC}"
        return 1
    fi
}

# Main execution
main() {
    echo "=================================="
    echo "PyTake Backend Deployment Validation"
    echo "=================================="
    echo
    
    check_docker
    check_docker_compose_files
    check_dockerfile
    check_environment_files
    check_nginx_config
    check_monitoring_config
    check_deployment_scripts
    check_test_infrastructure
    check_go_config
    check_security_config
    check_database_config
    check_network_requirements
    
    echo
    generate_report
}

# Run main function
main "$@"