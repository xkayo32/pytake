#!/bin/bash
# PyTake Backend - Backup and Restore Script
# Usage: ./backup.sh [create|restore|cleanup] [options]

set -euo pipefail

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$PROJECT_DIR/backups"
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

# Load environment variables
load_env() {
    if [[ -f "$ENV_FILE" ]]; then
        set -a
        source "$ENV_FILE"
        set +a
    else
        log_error "Environment file not found: $ENV_FILE"
        exit 1
    fi
}

# Create database backup
create_backup() {
    log_info "Creating database backup..."
    
    # Create backup directory if it doesn't exist
    mkdir -p "$BACKUP_DIR"
    
    # Generate backup filename with timestamp
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local backup_file="$BACKUP_DIR/pytake_backup_${timestamp}.sql"
    local backup_compressed="${backup_file}.gz"
    
    # Create database dump
    log_info "Dumping database..."
    
    if docker exec pytake-postgres pg_dump -U pytake -d pytake --no-password > "$backup_file"; then
        log_success "Database dump created: $backup_file"
        
        # Compress the backup
        log_info "Compressing backup..."
        gzip "$backup_file"
        log_success "Backup compressed: $backup_compressed"
        
        # Create metadata file
        create_backup_metadata "$backup_compressed" "$timestamp"
        
        # Upload to cloud storage if configured
        upload_backup_to_cloud "$backup_compressed"
        
        # Cleanup old backups
        cleanup_old_backups
        
        log_success "Backup process completed successfully"
        echo "Backup file: $backup_compressed"
        
    else
        log_error "Failed to create database dump"
        # Cleanup partial backup file
        rm -f "$backup_file"
        exit 1
    fi
}

# Create backup metadata
create_backup_metadata() {
    local backup_file="$1"
    local timestamp="$2"
    local metadata_file="${backup_file}.meta"
    
    log_info "Creating backup metadata..."
    
    cat > "$metadata_file" << EOF
{
    "backup_file": "$(basename "$backup_file")",
    "timestamp": "$timestamp",
    "created_at": "$(date -Iseconds)",
    "database": "pytake",
    "version": "$(docker exec pytake-api ./pytake-api --version 2>/dev/null || echo 'unknown')",
    "size_bytes": $(stat -f%z "$backup_file" 2>/dev/null || stat -c%s "$backup_file"),
    "checksum": "$(sha256sum "$backup_file" | cut -d' ' -f1)",
    "compression": "gzip"
}
EOF
    
    log_success "Metadata created: $metadata_file"
}

# Upload backup to cloud storage (if configured)
upload_backup_to_cloud() {
    local backup_file="$1"
    
    # Check if AWS CLI is available and configured
    if command -v aws &> /dev/null && [[ -n "${BACKUP_S3_BUCKET:-}" ]]; then
        log_info "Uploading backup to S3..."
        
        local s3_path="s3://${BACKUP_S3_BUCKET}/database/$(basename "$backup_file")"
        
        if aws s3 cp "$backup_file" "$s3_path"; then
            log_success "Backup uploaded to S3: $s3_path"
            
            # Upload metadata as well
            aws s3 cp "${backup_file}.meta" "${s3_path}.meta"
        else
            log_warning "Failed to upload backup to S3"
        fi
    else
        log_info "Cloud backup not configured, skipping upload"
    fi
}

# Restore database from backup
restore_backup() {
    local backup_file="$1"
    
    if [[ ! -f "$backup_file" ]]; then
        log_error "Backup file not found: $backup_file"
        exit 1
    fi
    
    log_warning "This will replace the current database with the backup!"
    read -p "Are you sure you want to continue? (y/N): " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Restore cancelled"
        exit 0
    fi
    
    log_info "Starting database restore..."
    
    # Create a backup of current database before restore
    log_info "Creating safety backup of current database..."
    local safety_backup="$BACKUP_DIR/pre_restore_backup_$(date +"%Y%m%d_%H%M%S").sql.gz"
    
    if docker exec pytake-postgres pg_dump -U pytake -d pytake --no-password | gzip > "$safety_backup"; then
        log_success "Safety backup created: $safety_backup"
    else
        log_error "Failed to create safety backup"
        exit 1
    fi
    
    # Determine if backup is compressed
    local restore_cmd
    if [[ "$backup_file" == *.gz ]]; then
        restore_cmd="gunzip -c '$backup_file' | docker exec -i pytake-postgres psql -U pytake -d pytake"
    else
        restore_cmd="docker exec -i pytake-postgres psql -U pytake -d pytake < '$backup_file'"
    fi
    
    # Stop the application to prevent database access during restore
    log_info "Stopping application..."
    docker-compose -f "$PROJECT_DIR/docker-compose.production.yml" stop pytake-api
    
    # Perform restore
    log_info "Restoring database..."
    
    # Drop and recreate database to ensure clean restore
    docker exec pytake-postgres psql -U postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'pytake';"
    docker exec pytake-postgres psql -U postgres -c "DROP DATABASE IF EXISTS pytake;"
    docker exec pytake-postgres psql -U postgres -c "CREATE DATABASE pytake OWNER pytake;"
    
    # Restore data
    if eval "$restore_cmd"; then
        log_success "Database restored successfully"
        
        # Start the application
        log_info "Starting application..."
        docker-compose -f "$PROJECT_DIR/docker-compose.production.yml" start pytake-api
        
        # Wait for application to be ready
        sleep 10
        
        # Health check
        if curl -f -s http://localhost:8080/health > /dev/null 2>&1; then
            log_success "Application is healthy after restore"
        else
            log_warning "Application health check failed after restore"
        fi
        
    else
        log_error "Database restore failed"
        
        # Attempt to restore from safety backup
        log_info "Attempting to restore from safety backup..."
        gunzip -c "$safety_backup" | docker exec -i pytake-postgres psql -U pytake -d pytake
        
        # Start the application
        docker-compose -f "$PROJECT_DIR/docker-compose.production.yml" start pytake-api
        
        exit 1
    fi
}

# List available backups
list_backups() {
    log_info "Available backups:"
    echo
    
    if [[ ! -d "$BACKUP_DIR" ]] || [[ -z "$(ls -A "$BACKUP_DIR" 2>/dev/null)" ]]; then
        log_info "No backups found"
        return
    fi
    
    # List local backups
    echo "Local backups:"
    for backup in "$BACKUP_DIR"/*.sql.gz 2>/dev/null; do
        if [[ -f "$backup" ]]; then
            local size=$(du -h "$backup" | cut -f1)
            local date=$(stat -f%Sm -t"%Y-%m-%d %H:%M:%S" "$backup" 2>/dev/null || stat -c%y "$backup" | cut -d'.' -f1)
            echo "  $(basename "$backup") (${size}, ${date})"
            
            # Show metadata if available
            if [[ -f "${backup}.meta" ]]; then
                local checksum=$(jq -r '.checksum' "${backup}.meta" 2>/dev/null || echo "unknown")
                echo "    Checksum: ${checksum:0:16}..."
            fi
        fi
    done
    
    # List cloud backups if available
    if command -v aws &> /dev/null && [[ -n "${BACKUP_S3_BUCKET:-}" ]]; then
        echo
        echo "Cloud backups (S3):"
        aws s3 ls "s3://${BACKUP_S3_BUCKET}/database/" --human-readable | grep "\.sql\.gz$" || echo "  No cloud backups found"
    fi
}

# Cleanup old backups
cleanup_old_backups() {
    local retention_days=${BACKUP_RETENTION_DAYS:-30}
    
    log_info "Cleaning up backups older than $retention_days days..."
    
    # Clean local backups
    find "$BACKUP_DIR" -name "*.sql.gz" -type f -mtime +$retention_days -delete
    find "$BACKUP_DIR" -name "*.meta" -type f -mtime +$retention_days -delete
    
    # Clean cloud backups if configured
    if command -v aws &> /dev/null && [[ -n "${BACKUP_S3_BUCKET:-}" ]]; then
        local cutoff_date=$(date -d "$retention_days days ago" +%Y-%m-%d)
        aws s3 ls "s3://${BACKUP_S3_BUCKET}/database/" | while read -r line; do
            local file_date=$(echo "$line" | awk '{print $1}')
            local file_name=$(echo "$line" | awk '{print $4}')
            
            if [[ "$file_date" < "$cutoff_date" ]]; then
                aws s3 rm "s3://${BACKUP_S3_BUCKET}/database/$file_name"
                log_info "Removed old cloud backup: $file_name"
            fi
        done
    fi
    
    log_success "Backup cleanup completed"
}

# Download backup from cloud
download_backup() {
    local backup_name="$1"
    
    if ! command -v aws &> /dev/null || [[ -z "${BACKUP_S3_BUCKET:-}" ]]; then
        log_error "AWS CLI not available or S3 bucket not configured"
        exit 1
    fi
    
    log_info "Downloading backup from S3: $backup_name"
    
    local s3_path="s3://${BACKUP_S3_BUCKET}/database/$backup_name"
    local local_path="$BACKUP_DIR/$backup_name"
    
    if aws s3 cp "$s3_path" "$local_path"; then
        log_success "Backup downloaded: $local_path"
        
        # Download metadata as well
        aws s3 cp "${s3_path}.meta" "${local_path}.meta" 2>/dev/null || true
        
        echo "$local_path"
    else
        log_error "Failed to download backup from S3"
        exit 1
    fi
}

# Verify backup integrity
verify_backup() {
    local backup_file="$1"
    
    if [[ ! -f "$backup_file" ]]; then
        log_error "Backup file not found: $backup_file"
        exit 1
    fi
    
    log_info "Verifying backup integrity..."
    
    # Check if metadata file exists
    local metadata_file="${backup_file}.meta"
    if [[ -f "$metadata_file" ]]; then
        # Verify checksum
        local stored_checksum=$(jq -r '.checksum' "$metadata_file")
        local actual_checksum=$(sha256sum "$backup_file" | cut -d' ' -f1)
        
        if [[ "$stored_checksum" == "$actual_checksum" ]]; then
            log_success "Backup checksum verification passed"
        else
            log_error "Backup checksum verification failed"
            log_error "Expected: $stored_checksum"
            log_error "Actual: $actual_checksum"
            exit 1
        fi
    else
        log_warning "No metadata file found, skipping checksum verification"
    fi
    
    # Test if backup can be read (basic format check)
    if [[ "$backup_file" == *.gz ]]; then
        if gunzip -t "$backup_file"; then
            log_success "Backup file format verification passed"
        else
            log_error "Backup file is corrupted"
            exit 1
        fi
    else
        # For uncompressed SQL files, just check if it's readable
        if head -n 1 "$backup_file" > /dev/null; then
            log_success "Backup file is readable"
        else
            log_error "Backup file is not readable"
            exit 1
        fi
    fi
    
    log_success "Backup verification completed successfully"
}

# Show help
show_help() {
    cat << EOF
PyTake Backend Backup and Restore Script

Usage: $0 [COMMAND] [OPTIONS]

Commands:
  create              Create a new database backup
  restore <file>      Restore database from backup file
  list                List available backups
  cleanup             Clean up old backups
  verify <file>       Verify backup file integrity
  download <name>     Download backup from cloud storage
  help                Show this help message

Examples:
  $0 create                                    # Create new backup
  $0 restore backups/pytake_backup_20231201.sql.gz  # Restore from backup
  $0 list                                      # List all backups
  $0 verify backups/pytake_backup_20231201.sql.gz   # Verify backup
  $0 cleanup                                   # Clean old backups
  $0 download pytake_backup_20231201.sql.gz    # Download from S3

Configuration:
  Set BACKUP_S3_BUCKET in .env.production for cloud backups
  Set BACKUP_RETENTION_DAYS for backup retention (default: 30)

EOF
}

# Main script logic
main() {
    load_env
    
    case "${1:-help}" in
        "create")
            create_backup
            ;;
        "restore")
            if [[ -z "${2:-}" ]]; then
                log_error "Backup file is required"
                exit 1
            fi
            restore_backup "$2"
            ;;
        "list")
            list_backups
            ;;
        "cleanup")
            cleanup_old_backups
            ;;
        "verify")
            if [[ -z "${2:-}" ]]; then
                log_error "Backup file is required"
                exit 1
            fi
            verify_backup "$2"
            ;;
        "download")
            if [[ -z "${2:-}" ]]; then
                log_error "Backup name is required"
                exit 1
            fi
            download_backup "$2"
            ;;
        "help"|*)
            show_help
            ;;
    esac
}

# Run main function with all arguments
main "$@"