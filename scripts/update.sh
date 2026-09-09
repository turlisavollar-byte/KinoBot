#!/bin/bash
# =============================================================================
# StreamOps - Update Script
# Update existing deployment to latest version
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Backup before update
backup_database() {
    log_info "Creating database backup..."
    
    BACKUP_DIR="./backups"
    mkdir -p $BACKUP_DIR
    
    BACKUP_FILE="$BACKUP_DIR/streamops-backup-$(date +%Y%m%d-%H%M%S).sql"
    
    docker-compose exec -T postgres pg_dump -U streamops streamops > $BACKUP_FILE
    
    if [ $? -eq 0 ]; then
        log_success "Database backup created: $BACKUP_FILE"
    else
        log_error "Database backup failed"
        exit 1
    fi
}

# Pull latest changes
pull_changes() {
    log_info "Pulling latest changes from repository..."
    
    if [ -d .git ]; then
        git pull origin main
        log_success "Latest changes pulled"
    else
        log_warning "Not a git repository, skipping pull"
    fi
}

# Update dependencies
update_dependencies() {
    log_info "Updating dependencies..."
    pnpm install
    log_success "Dependencies updated"
}

# Rebuild services
rebuild_services() {
    log_info "Rebuilding services..."
    docker compose build --no-cache
    log_success "Services rebuilt"
}

# Restart services
restart_services() {
    log_info "Restarting services..."
    docker compose up -d
    log_success "Services restarted"
}

# Run migrations
run_migrations() {
    log_info "Running database migrations..."
    sleep 10
    
    pnpm --filter @workspace/db run migrate
    pnpm --filter @workspace/db run seed
    
    log_success "Migrations completed"
}

# Health check
health_check() {
    log_info "Running health checks..."
    sleep 20
    
    if curl -f http://localhost:8080/api/healthz &> /dev/null; then
        log_success "API server is healthy"
    else
        log_warning "API server health check failed"
    fi
    
    if curl -f http://localhost:3000/health &> /dev/null; then
        log_success "Dashboard is healthy"
    else
        log_warning "Dashboard health check failed"
    fi
}

# Main update flow
main() {
    echo ""
    echo "=========================================="
    echo "🔄 StreamOps Update Script"
    echo "=========================================="
    echo ""
    echo "This will update StreamOps to the latest version."
    echo "A database backup will be created automatically."
    echo ""
    read -p "Continue? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Update cancelled."
        exit 0
    fi
    
    backup_database
    pull_changes
    update_dependencies
    rebuild_services
    restart_services
    run_migrations
    health_check
    
    echo ""
    echo "=========================================="
    log_success "Update completed successfully!"
    echo "=========================================="
    echo ""
    echo "📝 Backup location: ./backups/"
    echo "🔧 If issues occur, restore from backup:"
    echo "   docker-compose exec -T postgres psql -U streamops streamops < backup-file.sql"
    echo ""
}

main "$@"
