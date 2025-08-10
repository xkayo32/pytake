#!/bin/bash

# PyTake Deployment Script with Monitoring
# This script deploys PyTake with full observability stack

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check prerequisites
check_prerequisites() {
    print_header "Checking Prerequisites"
    
    if ! command_exists docker; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command_exists docker-compose; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    # Check if .env file exists
    if [ ! -f ".env" ]; then
        print_warning ".env file not found. Creating from .env.development..."
        if [ -f ".env.development" ]; then
            cp ".env.development" ".env"
            print_status "Created .env file from .env.development"
        else
            print_error "No .env.development file found. Please create environment configuration."
            exit 1
        fi
    fi
    
    print_status "All prerequisites satisfied"
}

# Function to create monitoring directories
create_monitoring_dirs() {
    print_header "Creating Monitoring Directories"
    
    local dirs=(
        "monitoring/prometheus"
        "monitoring/grafana/provisioning/datasources"
        "monitoring/grafana/provisioning/dashboards"
        "monitoring/grafana/dashboards"
        "monitoring/alertmanager"
        "monitoring/blackbox"
        "monitoring/promtail"
        "logs"
        "uploads"
        "ssl"
    )
    
    for dir in "${dirs[@]}"; do
        mkdir -p "$dir"
        print_status "Created directory: $dir"
    done
}

# Function to build images
build_images() {
    print_header "Building Docker Images"
    
    print_status "Building PyTake backend image..."
    docker build -t pytake-backend:fast -f Dockerfile.fast .
    
    print_status "Images built successfully"
}

# Function to deploy core services
deploy_core() {
    print_header "Deploying Core Services"
    
    # Stop any existing containers
    print_status "Stopping existing containers..."
    docker-compose down --remove-orphans || true
    
    # Deploy core services
    print_status "Starting core services..."
    docker-compose up -d
    
    # Wait for services to be ready
    print_status "Waiting for services to be ready..."
    sleep 30
    
    # Check service health
    check_service_health
}

# Function to deploy monitoring stack
deploy_monitoring() {
    print_header "Deploying Monitoring Stack"
    
    # Deploy monitoring services
    print_status "Starting monitoring services..."
    docker-compose -f monitoring/docker-compose.monitoring.yml up -d
    
    # Wait for monitoring services
    print_status "Waiting for monitoring services to be ready..."
    sleep 30
    
    check_monitoring_health
}

# Function to check service health
check_service_health() {
    print_status "Checking service health..."
    
    local services=(
        "http://localhost:8789/health:PyTake API"
        "http://localhost:5432:PostgreSQL (connection check)"
        "http://localhost:6379:Redis (connection check)"
    )
    
    for service_info in "${services[@]}"; do
        IFS=':' read -r url name <<< "$service_info"
        
        if [[ "$url" == *"5432"* ]] || [[ "$url" == *"6379"* ]]; then
            # For database services, just check if port is open
            if nc -z localhost ${url##*:} >/dev/null 2>&1; then
                print_status "✓ $name is accessible"
            else
                print_warning "✗ $name is not accessible"
            fi
        else
            # For HTTP services, check with curl
            if curl -s -o /dev/null -w "%{http_code}" "$url" | grep -q "200"; then
                print_status "✓ $name is healthy"
            else
                print_warning "✗ $name health check failed"
            fi
        fi
    done
}

# Function to check monitoring health
check_monitoring_health() {
    print_status "Checking monitoring services health..."
    
    local services=(
        "http://localhost:9090/-/healthy:Prometheus"
        "http://localhost:3000/api/health:Grafana"
        "http://localhost:16686:Jaeger"
        "http://localhost:9093/-/healthy:Alertmanager"
    )
    
    for service_info in "${services[@]}"; do
        IFS=':' read -r url name <<< "$service_info"
        
        local max_attempts=12
        local attempt=1
        
        while [ $attempt -le $max_attempts ]; do
            if curl -s -o /dev/null -w "%{http_code}" "$url" | grep -q -E "200|302"; then
                print_status "✓ $name is healthy"
                break
            else
                if [ $attempt -eq $max_attempts ]; then
                    print_warning "✗ $name health check failed after $max_attempts attempts"
                else
                    print_status "⏳ Waiting for $name (attempt $attempt/$max_attempts)..."
                    sleep 10
                fi
            fi
            ((attempt++))
        done
    done
}

# Function to show service URLs
show_urls() {
    print_header "Service URLs"
    
    echo -e "${GREEN}Core Services:${NC}"
    echo "  🚀 PyTake API:        http://localhost:8789"
    echo "  📖 API Documentation: http://localhost:8789/docs"
    echo "  🔗 GraphQL:          http://localhost:8789/graphql"
    echo "  🌐 Frontend:         http://localhost:5174"
    echo "  🔒 Nginx:            http://localhost"
    echo ""
    
    echo -e "${GREEN}Monitoring Services:${NC}"
    echo "  📊 Grafana:          http://localhost:3000 (admin/admin123)"
    echo "  📈 Prometheus:       http://localhost:9090"
    echo "  🚨 Alertmanager:     http://localhost:9093"
    echo "  🔍 Jaeger:           http://localhost:16686"
    echo "  📋 Karma:            http://localhost:8080"
    echo ""
    
    echo -e "${GREEN}Health Endpoints:${NC}"
    echo "  🏥 API Health:       http://localhost:8789/health"
    echo "  📊 Metrics:          http://localhost:8789/metrics"
    echo "  🔬 Observability:    http://localhost:8789/observability/health"
    echo "  ✅ Readiness:        http://localhost:8789/observability/ready"
    echo "  💓 Liveness:         http://localhost:8789/observability/live"
    echo ""
    
    echo -e "${GREEN}Database Access:${NC}"
    echo "  🗄️ PostgreSQL:       localhost:5432"
    echo "  🔴 Redis:            localhost:6379"
}

# Function to show logs
show_logs() {
    local service=${1:-}
    
    if [ -n "$service" ]; then
        print_status "Showing logs for $service..."
        docker-compose logs -f "$service"
    else
        print_status "Showing logs for all services..."
        docker-compose logs -f
    fi
}

# Function to restart services
restart_services() {
    local service=${1:-}
    
    if [ -n "$service" ]; then
        print_status "Restarting $service..."
        docker-compose restart "$service"
    else
        print_status "Restarting all services..."
        docker-compose restart
        docker-compose -f monitoring/docker-compose.monitoring.yml restart
    fi
}

# Function to stop services
stop_services() {
    print_header "Stopping Services"
    
    print_status "Stopping monitoring services..."
    docker-compose -f monitoring/docker-compose.monitoring.yml down --remove-orphans || true
    
    print_status "Stopping core services..."
    docker-compose down --remove-orphans || true
}

# Function to clean up
cleanup() {
    print_header "Cleaning Up"
    
    print_status "Stopping all services..."
    stop_services
    
    print_status "Removing containers..."
    docker-compose rm -f || true
    docker-compose -f monitoring/docker-compose.monitoring.yml rm -f || true
    
    print_status "Removing volumes..."
    docker volume prune -f || true
    
    print_status "Removing networks..."
    docker network prune -f || true
    
    print_status "Cleanup completed"
}

# Function to backup data
backup_data() {
    print_header "Creating Backup"
    
    local backup_dir="backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$backup_dir"
    
    print_status "Backing up PostgreSQL data..."
    docker exec pytake-postgres pg_dump -U ${POSTGRES_USER:-pytake} ${POSTGRES_DB:-pytake} > "$backup_dir/postgres_backup.sql" 2>/dev/null || print_warning "PostgreSQL backup failed"
    
    print_status "Backing up Redis data..."
    docker exec pytake-redis redis-cli --rdb /data/backup.rdb >/dev/null 2>&1 || print_warning "Redis backup failed"
    docker cp pytake-redis:/data/backup.rdb "$backup_dir/redis_backup.rdb" 2>/dev/null || true
    
    print_status "Backing up configuration files..."
    cp -r monitoring "$backup_dir/" 2>/dev/null || true
    cp .env "$backup_dir/" 2>/dev/null || true
    cp docker-compose.yml "$backup_dir/" 2>/dev/null || true
    
    print_status "Backup created in $backup_dir"
}

# Function to show monitoring status
monitoring_status() {
    print_header "Monitoring Status"
    
    # Check if monitoring containers are running
    local containers=(
        "pytake-prometheus"
        "pytake-grafana"
        "pytake-jaeger"
        "pytake-alertmanager"
        "pytake-loki"
        "pytake-promtail"
    )
    
    for container in "${containers[@]}"; do
        if docker ps --format "table {{.Names}}" | grep -q "$container"; then
            print_status "✓ $container is running"
        else
            print_warning "✗ $container is not running"
        fi
    done
    
    # Show resource usage
    echo ""
    print_status "Resource Usage:"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}" | head -20
}

# Function to update monitoring configuration
update_monitoring_config() {
    print_header "Updating Monitoring Configuration"
    
    print_status "Reloading Prometheus configuration..."
    curl -X POST http://localhost:9090/-/reload 2>/dev/null && print_status "Prometheus reloaded" || print_warning "Failed to reload Prometheus"
    
    print_status "Reloading Alertmanager configuration..."
    curl -X POST http://localhost:9093/-/reload 2>/dev/null && print_status "Alertmanager reloaded" || print_warning "Failed to reload Alertmanager"
}

# Main function
main() {
    case "${1:-deploy}" in
        deploy)
            check_prerequisites
            create_monitoring_dirs
            build_images
            deploy_core
            deploy_monitoring
            show_urls
            ;;
        core)
            check_prerequisites
            build_images
            deploy_core
            show_urls
            ;;
        monitoring)
            deploy_monitoring
            show_urls
            ;;
        status)
            check_service_health
            monitoring_status
            ;;
        logs)
            show_logs "$2"
            ;;
        restart)
            restart_services "$2"
            ;;
        stop)
            stop_services
            ;;
        cleanup)
            cleanup
            ;;
        backup)
            backup_data
            ;;
        reload-monitoring)
            update_monitoring_config
            ;;
        urls)
            show_urls
            ;;
        *)
            echo "Usage: $0 {deploy|core|monitoring|status|logs|restart|stop|cleanup|backup|reload-monitoring|urls}"
            echo ""
            echo "Commands:"
            echo "  deploy             - Deploy all services (core + monitoring)"
            echo "  core               - Deploy only core services"
            echo "  monitoring         - Deploy only monitoring services"
            echo "  status             - Check service status"
            echo "  logs [service]     - Show logs for all services or specific service"
            echo "  restart [service]  - Restart all services or specific service"
            echo "  stop               - Stop all services"
            echo "  cleanup            - Stop services and clean up containers/volumes"
            echo "  backup             - Create backup of data and configuration"
            echo "  reload-monitoring  - Reload monitoring configuration"
            echo "  urls               - Show service URLs"
            ;;
    esac
}

main "$@"