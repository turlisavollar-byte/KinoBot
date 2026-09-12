#!/bin/bash
# =============================================================================
# StreamOps - Deployment Script
# One-command deployment for production environments
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"

# Logging functions
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

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    log_success "Docker is installed"

    # Check Docker Compose
    if ! docker compose version &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    log_success "Docker Compose is installed"

    # Check .env file
    if [ ! -f .env ]; then
        log_error ".env file not found. Please copy .env.example to .env and configure it."
        exit 1
    fi
    log_success ".env file found"

    # Check Docker is running
    if ! docker info &> /dev/null; then
        log_error "Docker is not running. Please start Docker first."
        exit 1
    fi
    log_success "Docker is running"
}

# Load environment variables
load_env() {
    log_info "Loading environment variables..."
    export $(cat .env | grep -v '^#' | grep -v '^$' | xargs)
    log_success "Environment variables loaded"
}

# Stop existing services
stop_services() {
    log_info "Stopping existing services..."
    docker compose -f "$COMPOSE_FILE" down 2>/dev/null || true
    log_success "Services stopped"
}

# Build and start services
deploy_services() {
    log_info "Building and starting services..."
    
    # Pull latest images
    log_info "Pulling latest images..."
    docker compose -f "$COMPOSE_FILE" pull
    
    # Build services
    log_info "Building services..."
    docker compose -f "$COMPOSE_FILE" build --no-cache
    
    # Start services
    log_info "Starting services..."
    docker compose -f "$COMPOSE_FILE" up -d
    
    log_success "Services deployed"
}

# Run database migrations
run_migrations() {
    log_info "Running database migrations..."
    
    # Wait for database to be ready
    log_info "Waiting for database to be ready..."
    sleep 10
    
    pnpm --filter @workspace/db run migrate
    pnpm --filter @workspace/db run seed
    
    log_success "Database migrations completed"
}

# Health check
health_check() {
    log_info "Running health checks..."
    
    # Wait for services to be healthy
    log_info "Waiting for services to be healthy (this may take up to 60 seconds)..."
    sleep 30
    
    # Check API health
    if curl -f http://localhost:8080/api/healthz &> /dev/null; then
        log_success "API server is healthy"
    else
        log_warning "API server health check failed, but deployment may still be working"
    fi
    
    # Check Dashboard health
    if curl -f http://localhost:3000/health &> /dev/null; then
        log_success "Dashboard is healthy"
    else
        log_warning "Dashboard health check failed, but deployment may still be working"
    fi
}

# Show deployment info
show_info() {
    echo ""
    echo "=========================================="
    log_success "Deployment completed successfully!"
    echo "=========================================="
    echo ""
    echo "🌐 Access URLs:"
    echo "   Dashboard: http://localhost:3000"
    echo "   API: http://localhost:8080"
    echo "   API Health: http://localhost:8080/api/healthz"
    echo ""
    echo "📝 Admin access:"
    echo "   Use the explicitly configured bootstrap account, if one was provided."
    echo "   Remove SUPER_ADMIN_PASSWORD from the environment after first use."
    echo ""
    echo "🔧 Useful Commands:"
    echo "   View logs: docker compose -f $COMPOSE_FILE logs -f"
    echo "   Stop services: docker compose -f $COMPOSE_FILE down"
    echo "   Restart services: docker compose -f $COMPOSE_FILE restart"
    echo ""
}

# Main deployment flow
main() {
    echo ""
    echo "=========================================="
    echo "🚀 StreamOps Deployment Script"
    echo "=========================================="
    echo ""
    
    check_prerequisites
    load_env
    stop_services
    deploy_services
    run_migrations
    health_check
    show_info
    
    log_success "Deployment completed!"
}

# Run main function
main "$@"
