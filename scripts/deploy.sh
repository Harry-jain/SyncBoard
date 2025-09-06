#!/bin/bash

# SyncBoard Production Deployment Script
# This script handles the complete deployment process for production

set -euo pipefail

# =============================================================================
# Configuration
# =============================================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENVIRONMENT="${1:-production}"
BACKUP_DIR="/backups/syncboard"
LOG_FILE="/var/log/syncboard-deploy.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# =============================================================================
# Logging Functions
# =============================================================================
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✓${NC} $1" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠${NC} $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ✗${NC} $1" | tee -a "$LOG_FILE"
}

# =============================================================================
# Pre-deployment Checks
# =============================================================================
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
    
    # Check if Docker Compose is installed
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed"
        exit 1
    fi
    
    # Check if required files exist
    if [[ ! -f "$PROJECT_ROOT/.env.production" ]]; then
        log_error "Production environment file not found"
        exit 1
    fi
    
    if [[ ! -f "$PROJECT_ROOT/docker-compose.prod.yml" ]]; then
        log_error "Production Docker Compose file not found"
        exit 1
    fi
    
    # Check disk space
    available_space=$(df / | awk 'NR==2 {print $4}')
    if [[ $available_space -lt 10485760 ]]; then # 10GB in KB
        log_warning "Low disk space: $(($available_space / 1024 / 1024))GB available"
    fi
    
    # Check memory
    total_mem=$(free -m | awk 'NR==2{print $2}')
    if [[ $total_mem -lt 4096 ]]; then # 4GB
        log_warning "Low memory: ${total_mem}MB available"
    fi
    
    log_success "Prerequisites check completed"
}

# =============================================================================
# Backup Functions
# =============================================================================
create_backup() {
    log "Creating backup..."
    
    local backup_timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_path="$BACKUP_DIR/$backup_timestamp"
    
    mkdir -p "$backup_path"
    
    # Backup database
    log "Backing up database..."
    docker-compose -f "$PROJECT_ROOT/docker-compose.prod.yml" exec -T postgres pg_dump -U syncboard_user syncboard_prod > "$backup_path/database.sql"
    
    # Backup Redis data
    log "Backing up Redis data..."
    docker-compose -f "$PROJECT_ROOT/docker-compose.prod.yml" exec -T redis redis-cli --rdb "$backup_path/redis.rdb"
    
    # Backup application files
    log "Backing up application files..."
    tar -czf "$backup_path/uploads.tar.gz" -C "$PROJECT_ROOT" uploads/ 2>/dev/null || true
    tar -czf "$backup_path/logs.tar.gz" -C "$PROJECT_ROOT" logs/ 2>/dev/null || true
    
    # Backup configuration files
    cp "$PROJECT_ROOT/.env.production" "$backup_path/"
    cp "$PROJECT_ROOT/docker-compose.prod.yml" "$backup_path/"
    
    # Create backup manifest
    cat > "$backup_path/manifest.txt" << EOF
Backup created: $(date)
Environment: $ENVIRONMENT
Database: syncboard_prod
Redis: redis
Files: uploads, logs
EOF
    
    # Clean old backups (keep last 7 days)
    find "$BACKUP_DIR" -type d -name "20*" -mtime +7 -exec rm -rf {} \; 2>/dev/null || true
    
    log_success "Backup created: $backup_path"
}

# =============================================================================
# Security Functions
# =============================================================================
run_security_scan() {
    log "Running security scan..."
    
    # Scan Docker images for vulnerabilities
    docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
        aquasec/trivy image syncboard:latest --severity HIGH,CRITICAL \
        --format table --output "$PROJECT_ROOT/security-report.txt" || true
    
    # Check for secrets in code
    if command -v trufflehog &> /dev/null; then
        trufflehog filesystem "$PROJECT_ROOT" --output "$PROJECT_ROOT/secrets-scan.txt" || true
    fi
    
    log_success "Security scan completed"
}

# =============================================================================
# Build Functions
# =============================================================================
build_images() {
    log "Building Docker images..."
    
    cd "$PROJECT_ROOT"
    
    # Build application image
    docker build -f Dockerfile.production -t syncboard:latest .
    
    # Tag with timestamp
    local image_tag="syncboard:$(date +%Y%m%d_%H%M%S)"
    docker tag syncboard:latest "$image_tag"
    
    log_success "Docker images built successfully"
}

# =============================================================================
# Deployment Functions
# =============================================================================
deploy_application() {
    log "Deploying application..."
    
    cd "$PROJECT_ROOT"
    
    # Pull latest images
    docker-compose -f docker-compose.prod.yml pull
    
    # Start services
    docker-compose -f docker-compose.prod.yml up -d
    
    # Wait for services to be healthy
    log "Waiting for services to be healthy..."
    sleep 30
    
    # Check service health
    check_service_health
    
    log_success "Application deployed successfully"
}

check_service_health() {
    log "Checking service health..."
    
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if curl -f http://localhost/health > /dev/null 2>&1; then
            log_success "Application is healthy"
            return 0
        fi
        
        log "Health check attempt $attempt/$max_attempts failed, retrying in 10 seconds..."
        sleep 10
        ((attempt++))
    done
    
    log_error "Application health check failed after $max_attempts attempts"
    return 1
}

# =============================================================================
# Database Migration Functions
# =============================================================================
run_migrations() {
    log "Running database migrations..."
    
    # Wait for database to be ready
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if docker-compose -f "$PROJECT_ROOT/docker-compose.prod.yml" exec -T postgres pg_isready -U syncboard_user -d syncboard_prod > /dev/null 2>&1; then
            break
        fi
        
        log "Database not ready, attempt $attempt/$max_attempts"
        sleep 5
        ((attempt++))
    done
    
    if [[ $attempt -gt $max_attempts ]]; then
        log_error "Database is not ready after $max_attempts attempts"
        return 1
    fi
    
    # Run migrations
    docker-compose -f "$PROJECT_ROOT/docker-compose.prod.yml" exec -T syncboard npm run migrate:prod
    
    log_success "Database migrations completed"
}

# =============================================================================
# Monitoring Functions
# =============================================================================
setup_monitoring() {
    log "Setting up monitoring..."
    
    # Start monitoring services
    docker-compose -f "$PROJECT_ROOT/docker-compose.prod.yml" up -d prometheus grafana
    
    # Wait for monitoring services
    sleep 30
    
    # Check if monitoring is working
    if curl -f http://localhost:9090/-/healthy > /dev/null 2>&1; then
        log_success "Prometheus is running"
    else
        log_warning "Prometheus health check failed"
    fi
    
    if curl -f http://localhost:3001/api/health > /dev/null 2>&1; then
        log_success "Grafana is running"
    else
        log_warning "Grafana health check failed"
    fi
}

# =============================================================================
# Rollback Functions
# =============================================================================
rollback_deployment() {
    log "Rolling back deployment..."
    
    # Get the previous image tag
    local previous_tag=$(docker images --format "table {{.Tag}}" | grep syncboard | head -2 | tail -1)
    
    if [[ -n "$previous_tag" && "$previous_tag" != "latest" ]]; then
        # Tag previous image as latest
        docker tag "syncboard:$previous_tag" syncboard:latest
        
        # Restart services
        docker-compose -f "$PROJECT_ROOT/docker-compose.prod.yml" restart syncboard
        
        log_success "Rollback completed to $previous_tag"
    else
        log_error "No previous version found for rollback"
        return 1
    fi
}

# =============================================================================
# Cleanup Functions
# =============================================================================
cleanup_old_images() {
    log "Cleaning up old Docker images..."
    
    # Remove dangling images
    docker image prune -f
    
    # Remove old application images (keep last 5)
    docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.CreatedAt}}" | \
        grep syncboard | \
        tail -n +6 | \
        awk '{print $1":"$2}' | \
        xargs -r docker rmi || true
    
    log_success "Cleanup completed"
}

# =============================================================================
# Notification Functions
# =============================================================================
send_notification() {
    local status="$1"
    local message="$2"
    
    # Send Slack notification
    if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"SyncBoard Deployment $status: $message\"}" \
            "$SLACK_WEBHOOK_URL" || true
    fi
    
    # Send email notification
    if [[ -n "${NOTIFICATION_EMAIL:-}" ]]; then
        echo "SyncBoard Deployment $status: $message" | \
            mail -s "SyncBoard Deployment $status" "$NOTIFICATION_EMAIL" || true
    fi
}

# =============================================================================
# Main Deployment Function
# =============================================================================
main() {
    log "Starting SyncBoard deployment for $ENVIRONMENT environment"
    
    # Pre-deployment checks
    check_prerequisites
    
    # Create backup
    create_backup
    
    # Run security scan
    run_security_scan
    
    # Build images
    build_images
    
    # Deploy application
    if deploy_application; then
        # Run migrations
        run_migrations
        
        # Setup monitoring
        setup_monitoring
        
        # Cleanup
        cleanup_old_images
        
        # Send success notification
        send_notification "SUCCESS" "Deployment completed successfully"
        
        log_success "Deployment completed successfully"
    else
        # Rollback on failure
        rollback_deployment
        
        # Send failure notification
        send_notification "FAILED" "Deployment failed, rollback initiated"
        
        log_error "Deployment failed, rollback initiated"
        exit 1
    fi
}

# =============================================================================
# Script Execution
# =============================================================================
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi