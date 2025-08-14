#!/bin/bash
# PyTake Backend - Log Configuration and Rotation Setup
# Usage: ./log-setup.sh [setup|rotate|cleanup] [options]

set -euo pipefail

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$PROJECT_DIR/logs"
NGINX_LOG_DIR="$PROJECT_DIR/nginx/logs"

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

# Setup log directories and configuration
setup_logging() {
    log_info "Setting up logging configuration..."
    
    # Create log directories
    mkdir -p "$LOG_DIR"
    mkdir -p "$NGINX_LOG_DIR"
    
    # Create application log files
    touch "$LOG_DIR/pytake-api.log"
    touch "$LOG_DIR/pytake-error.log"
    touch "$LOG_DIR/pytake-access.log"
    touch "$LOG_DIR/pytake-security.log"
    touch "$LOG_DIR/pytake-audit.log"
    touch "$LOG_DIR/pytake-performance.log"
    
    # Create nginx log files
    touch "$NGINX_LOG_DIR/access.log"
    touch "$NGINX_LOG_DIR/error.log"
    touch "$NGINX_LOG_DIR/monitoring_access.log"
    touch "$NGINX_LOG_DIR/monitoring_error.log"
    touch "$NGINX_LOG_DIR/prometheus_access.log"
    touch "$NGINX_LOG_DIR/prometheus_error.log"
    
    # Set proper permissions
    chmod 644 "$LOG_DIR"/*.log
    chmod 644 "$NGINX_LOG_DIR"/*.log
    
    # Setup logrotate configuration
    setup_logrotate
    
    # Setup rsyslog configuration (if available)
    setup_rsyslog
    
    # Setup log aggregation (if requested)
    setup_log_aggregation
    
    log_success "Logging setup completed"
}

# Setup logrotate configuration
setup_logrotate() {
    log_info "Setting up log rotation..."
    
    # Create logrotate configuration for PyTake
    local logrotate_config="/etc/logrotate.d/pytake"
    
    sudo tee "$logrotate_config" > /dev/null << EOF
# PyTake Backend Log Rotation Configuration

# Application logs
$LOG_DIR/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 $(whoami) $(whoami)
    postrotate
        # Send USR1 signal to application to reopen log files
        docker exec pytake-api killall -USR1 pytake-api 2>/dev/null || true
    endscript
}

# Nginx logs
$NGINX_LOG_DIR/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 root root
    sharedscripts
    postrotate
        # Reload nginx to reopen log files
        docker exec pytake-nginx nginx -s reload 2>/dev/null || true
    endscript
}

# Database logs (PostgreSQL)
/var/lib/postgresql/*/main/log/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    create 640 postgres postgres
    postrotate
        # PostgreSQL handles log rotation internally, just compress old files
    endscript
}
EOF
    
    # Test logrotate configuration
    if sudo logrotate -d "$logrotate_config" > /dev/null 2>&1; then
        log_success "Logrotate configuration created and tested"
    else
        log_warning "Logrotate configuration may have issues"
    fi
    
    # Force immediate rotation to test
    log_info "Testing log rotation..."
    sudo logrotate -f "$logrotate_config"
    
    log_success "Log rotation setup completed"
}

# Setup rsyslog configuration for centralized logging
setup_rsyslog() {
    if ! command -v rsyslogd &> /dev/null; then
        log_info "Rsyslog not available, skipping centralized logging setup"
        return
    fi
    
    log_info "Setting up rsyslog configuration..."
    
    # Create rsyslog configuration for PyTake
    local rsyslog_config="/etc/rsyslog.d/10-pytake.conf"
    
    sudo tee "$rsyslog_config" > /dev/null << EOF
# PyTake Backend Rsyslog Configuration

# Define log formats
\$template PyTakeFormat,"%timegenerated:::date-rfc3339% %HOSTNAME% %syslogtag% %msg%\n"
\$template PyTakeFileFormat,"%timegenerated:::date-year%-%timegenerated:::date-month%-%timegenerated:::date-day% %timegenerated:::date-hour%:%timegenerated:::date-minute%:%timegenerated:::date-second% [%syslogseverity-text%] %msg%\n"

# PyTake application logs
:programname, isequal, "pytake-api"     $LOG_DIR/pytake-api.log;PyTakeFileFormat
:programname, isequal, "pytake-api"     stop

# PyTake security logs
:msg, contains, "SECURITY"              $LOG_DIR/pytake-security.log;PyTakeFileFormat
:msg, contains, "AUDIT"                 $LOG_DIR/pytake-audit.log;PyTakeFileFormat

# PyTake error logs
:syslogseverity, isequal, "error"       $LOG_DIR/pytake-error.log;PyTakeFileFormat
:syslogseverity, isequal, "warning"     $LOG_DIR/pytake-error.log;PyTakeFileFormat

# Performance logs
:msg, contains, "PERFORMANCE"           $LOG_DIR/pytake-performance.log;PyTakeFileFormat

# Forward logs to external log server (uncomment if needed)
# *.* @@log-server.example.com:514
EOF
    
    # Restart rsyslog to apply configuration
    sudo systemctl restart rsyslog || sudo service rsyslog restart
    
    log_success "Rsyslog configuration created"
}

# Setup log aggregation with ELK stack (optional)
setup_log_aggregation() {
    log_info "Setting up log aggregation configuration..."
    
    # Create Filebeat configuration for log shipping
    local filebeat_config="$PROJECT_DIR/monitoring/filebeat.yml"
    
    cat > "$filebeat_config" << EOF
# PyTake Filebeat Configuration for Log Aggregation

filebeat.inputs:
- type: log
  enabled: true
  paths:
    - $LOG_DIR/*.log
  fields:
    service: pytake-api
    environment: production
  fields_under_root: true
  multiline.pattern: '^[0-9]{4}-[0-9]{2}-[0-9]{2}'
  multiline.negate: true
  multiline.match: after

- type: log
  enabled: true
  paths:
    - $NGINX_LOG_DIR/*.log
  fields:
    service: nginx
    environment: production
  fields_under_root: true

- type: docker
  enabled: true
  containers.ids:
    - '*'
  containers.path: /var/lib/docker/containers
  containers.stream: all

output.elasticsearch:
  enabled: false
  hosts: ["elasticsearch:9200"]
  index: "pytake-logs-%{+yyyy.MM.dd}"

output.logstash:
  enabled: false
  hosts: ["logstash:5044"]

output.file:
  enabled: true
  path: "$LOG_DIR"
  filename: aggregated-logs

logging.level: info
logging.to_files: true
logging.files:
  path: $LOG_DIR
  name: filebeat
  keepfiles: 7
  permissions: 0644

processors:
- add_host_metadata:
    when.not.contains.tags: forwarded
- add_docker_metadata: ~
- add_kubernetes_metadata: ~

EOF
    
    log_info "Filebeat configuration created (disabled by default)"
    log_info "To enable, configure Elasticsearch/Logstash and update the configuration"
}

# Rotate logs manually
rotate_logs() {
    log_info "Manually rotating logs..."
    
    # Get current timestamp
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    
    # Rotate application logs
    for log_file in "$LOG_DIR"/*.log; do
        if [[ -f "$log_file" ]] && [[ -s "$log_file" ]]; then
            local base_name=$(basename "$log_file" .log)
            local archive_name="${base_name}_${timestamp}.log"
            
            # Move current log to archive
            mv "$log_file" "$LOG_DIR/$archive_name"
            
            # Compress archive
            gzip "$LOG_DIR/$archive_name"
            
            # Create new empty log file
            touch "$log_file"
            chmod 644 "$log_file"
            
            log_info "Rotated $log_file -> ${archive_name}.gz"
        fi
    done
    
    # Rotate nginx logs
    for log_file in "$NGINX_LOG_DIR"/*.log; do
        if [[ -f "$log_file" ]] && [[ -s "$log_file" ]]; then
            local base_name=$(basename "$log_file" .log)
            local archive_name="${base_name}_${timestamp}.log"
            
            # Move current log to archive
            mv "$log_file" "$NGINX_LOG_DIR/$archive_name"
            
            # Compress archive
            gzip "$NGINX_LOG_DIR/$archive_name"
            
            # Create new empty log file
            touch "$log_file"
            chmod 644 "$log_file"
            
            log_info "Rotated nginx/$log_file -> ${archive_name}.gz"
        fi
    done
    
    # Signal applications to reopen log files
    docker exec pytake-api killall -USR1 pytake-api 2>/dev/null || true
    docker exec pytake-nginx nginx -s reload 2>/dev/null || true
    
    log_success "Manual log rotation completed"
}

# Cleanup old log files
cleanup_logs() {
    local retention_days=${1:-30}
    
    log_info "Cleaning up log files older than $retention_days days..."
    
    # Clean application logs
    find "$LOG_DIR" -name "*.log.gz" -type f -mtime +$retention_days -delete
    find "$LOG_DIR" -name "*.log.*" -type f -mtime +$retention_days -delete
    
    # Clean nginx logs
    find "$NGINX_LOG_DIR" -name "*.log.gz" -type f -mtime +$retention_days -delete
    find "$NGINX_LOG_DIR" -name "*.log.*" -type f -mtime +$retention_days -delete
    
    # Clean docker logs (if requested)
    log_info "Cleaning up Docker logs..."
    docker system prune --volumes -f
    
    log_success "Log cleanup completed"
}

# Analyze log files
analyze_logs() {
    log_info "Analyzing log files..."
    echo
    
    # Application log analysis
    echo -e "${BLUE}Application Logs:${NC}"
    for log_file in "$LOG_DIR"/*.log; do
        if [[ -f "$log_file" ]] && [[ -s "$log_file" ]]; then
            local file_size=$(du -h "$log_file" | cut -f1)
            local line_count=$(wc -l < "$log_file")
            echo "  $(basename "$log_file"): $file_size ($line_count lines)"
            
            # Show recent errors
            local error_count=$(grep -c -i "error\|fail\|exception" "$log_file" 2>/dev/null || echo "0")
            if [[ $error_count -gt 0 ]]; then
                echo -e "    ${RED}Recent errors: $error_count${NC}"
            fi
        fi
    done
    
    echo
    echo -e "${BLUE}Nginx Logs:${NC}"
    for log_file in "$NGINX_LOG_DIR"/*.log; do
        if [[ -f "$log_file" ]] && [[ -s "$log_file" ]]; then
            local file_size=$(du -h "$log_file" | cut -f1)
            local line_count=$(wc -l < "$log_file")
            echo "  $(basename "$log_file"): $file_size ($line_count lines)"
            
            # Analyze access logs for common metrics
            if [[ "$log_file" == *"access.log" ]]; then
                local total_requests=$(wc -l < "$log_file")
                local error_requests=$(awk '$9 >= 400' "$log_file" | wc -l)
                local error_rate=$(( error_requests * 100 / (total_requests + 1) ))
                
                echo "    Total requests: $total_requests"
                echo "    Error requests: $error_requests ($error_rate%)"
            fi
        fi
    done
    
    # Disk usage analysis
    echo
    echo -e "${BLUE}Disk Usage:${NC}"
    echo "  Application logs: $(du -sh "$LOG_DIR" | cut -f1)"
    echo "  Nginx logs: $(du -sh "$NGINX_LOG_DIR" | cut -f1)"
    
    # Show most recent errors
    echo
    echo -e "${BLUE}Recent Errors (last 10):${NC}"
    find "$LOG_DIR" "$NGINX_LOG_DIR" -name "*.log" -exec grep -l -i "error" {} \; | \
        head -5 | \
        xargs grep -h -i "error" | \
        tail -10 || echo "  No recent errors found"
}

# Monitor logs in real-time
monitor_logs() {
    local service="${1:-all}"
    
    log_info "Monitoring logs in real-time for: $service"
    log_info "Press Ctrl+C to stop monitoring"
    echo
    
    case "$service" in
        "api"|"app"|"application")
            tail -f "$LOG_DIR/pytake-api.log" "$LOG_DIR/pytake-error.log"
            ;;
        "nginx"|"web")
            tail -f "$NGINX_LOG_DIR/access.log" "$NGINX_LOG_DIR/error.log"
            ;;
        "security")
            tail -f "$LOG_DIR/pytake-security.log" "$LOG_DIR/pytake-audit.log"
            ;;
        "error"|"errors")
            tail -f "$LOG_DIR/pytake-error.log" "$NGINX_LOG_DIR/error.log"
            ;;
        "all"|*)
            tail -f "$LOG_DIR"/*.log "$NGINX_LOG_DIR"/*.log
            ;;
    esac
}

# Show help
show_help() {
    cat << EOF
PyTake Backend Log Management Script

Usage: $0 [COMMAND] [OPTIONS]

Commands:
  setup                   Setup logging configuration and rotation
  rotate                  Manually rotate logs
  cleanup [days]          Clean up old logs (default: 30 days)
  analyze                 Analyze log files and show statistics
  monitor [service]       Monitor logs in real-time
  help                    Show this help message

Monitor Services:
  api, app               Monitor application logs
  nginx, web             Monitor web server logs
  security               Monitor security and audit logs
  error, errors          Monitor error logs only
  all                    Monitor all logs (default)

Examples:
  $0 setup                # Setup logging configuration
  $0 rotate               # Rotate logs manually
  $0 cleanup 15           # Clean logs older than 15 days
  $0 analyze              # Show log analysis
  $0 monitor api          # Monitor application logs
  $0 monitor all          # Monitor all logs

Log Files:
  Application: $LOG_DIR/
  Nginx: $NGINX_LOG_DIR/

EOF
}

# Main script logic
main() {
    case "${1:-help}" in
        "setup")
            setup_logging
            ;;
        "rotate")
            rotate_logs
            ;;
        "cleanup")
            cleanup_logs "${2:-30}"
            ;;
        "analyze")
            analyze_logs
            ;;
        "monitor")
            monitor_logs "${2:-all}"
            ;;
        "help"|*)
            show_help
            ;;
    esac
}

# Run main function with all arguments
main "$@"