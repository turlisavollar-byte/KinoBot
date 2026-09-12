#!/bin/bash
# =============================================================================
# StreamOps - Installation Script
# Fresh installation for new deployments
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

# Welcome message
echo ""
echo "=========================================="
echo "🚀 StreamOps Installation Script"
echo "=========================================="
echo ""
echo "This script will install StreamOps on your server."
echo "Please make sure you have:"
echo "  - Docker and Docker Compose installed"
echo "  - At least 2GB RAM available"
echo "  - 10GB disk space available"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    log_info "Installation cancelled."
    exit 0
fi

# Check prerequisites
log_info "Checking prerequisites..."

if ! command -v docker &> /dev/null; then
    log_error "Docker is not installed. Please install Docker first."
    log_info "Visit: https://docs.docker.com/get-docker/"
    exit 1
fi
log_success "Docker is installed"

if ! command -v docker-compose &> /dev/null; then
    log_error "Docker Compose is not installed. Please install Docker Compose first."
    log_info "Visit: https://docs.docker.com/compose/install/"
    exit 1
fi
log_success "Docker Compose is installed"

if ! docker info &> /dev/null; then
    log_error "Docker is not running. Please start Docker first."
    exit 1
fi
log_success "Docker is running"

# Check available memory
TOTAL_MEM=$(free -m | awk '/Mem:/ {print $2}')
if [ "$TOTAL_MEM" -lt 2048 ]; then
    log_warning "System has less than 2GB RAM ($TOTAL_MEM MB). Performance may be degraded."
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Installation cancelled."
        exit 0
    fi
fi

# Check disk space
AVAILABLE_DISK=$(df -BG . | awk 'NR==2 {print $4}' | sed 's/G//')
if [ "$AVAILABLE_DISK" -lt 10 ]; then
    log_error "Insufficient disk space. At least 10GB required, $AVAILABLE_DISK GB available."
    exit 1
fi
log_success "Sufficient disk space available ($AVAILABLE_DISK GB)"

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    log_info "Creating .env file from template..."
    cp .env.example .env
    
    # Generate random secrets
    JWT_SECRET=$(openssl rand -hex 32)
    SESSION_SECRET=$(openssl rand -hex 32)
    DB_PASSWORD=$(openssl rand -hex 16)
    
    # Update .env with generated secrets
    sed -i "s/your_jwt_secret/$JWT_SECRET/" .env
    sed -i "s/your_session_secret/$SESSION_SECRET/" .env
    sed -i "s/streamops_password/$DB_PASSWORD/" .env
    sed -i "s/your_payme_merchant_id/your_merchant_id_here/" .env
    sed -i "s/your_payme_merchant_key/your_payme_key_here/" .env
    
    log_success ".env file created with secure random secrets"
    log_warning "Please edit .env file and configure:"
    log_warning "  - PAYME_MERCHANT_ID"
    log_warning "  - PAYME_KEY"
    log_warning "  - ADMIN_TELEGRAM_IDS"
    log_warning "  - CORS_ORIGINS"
    echo ""
    read -p "Open .env file for editing now? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        ${EDITOR:-nano} .env
    fi
else
    log_info ".env file already exists, skipping creation"
fi

# Create necessary directories
log_info "Creating necessary directories..."
mkdir -p logs/nginx
mkdir -p logs/api
mkdir -p backups
mkdir -p nginx/ssl
mkdir -p uploads
log_success "Directories created"

# Set up permissions
log_info "Setting up permissions..."
chmod +x scripts/*.sh
log_success "Permissions set"

# Install dependencies
log_info "Installing dependencies..."
if command -v pnpm &> /dev/null; then
    log_success "pnpm is already installed"
else
    log_info "Installing pnpm..."
    npm install -g pnpm
    log_success "pnpm installed"
fi

log_info "Installing project dependencies..."
pnpm install
log_success "Dependencies installed"

# Build project
log_info "Building project..."
pnpm run build
log_success "Project built"

# Start services
log_info "Starting services..."
docker compose up -d
log_success "Services started"

# Wait for services to be ready
log_info "Waiting for services to be ready..."
sleep 30

# Run database migrations and seed
log_info "Running database migrations..."
pnpm --filter @workspace/db run migrate
log_success "Database migrations completed"
log_info "Running database seed..."
pnpm --filter @workspace/db run seed
log_success "Database seeded"

# Health check
log_info "Running health check..."
sleep 10
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

# Show success message
echo ""
echo "=========================================="
log_success "Installation completed successfully!"
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
echo "📚 Next Steps:"
echo "   1. Login to dashboard at http://localhost:3000"
echo "   2. Change default admin password"
echo "   3. Configure Telegram bot in Settings"
echo "   4. Set up payment provider (Payme)"
echo "   5. Create subscription plans"
echo "   6. Add content to catalog"
echo ""
echo "🔧 Useful Commands:"
echo "   View logs: docker-compose logs -f"
echo "   Stop services: docker-compose down"
echo "   Restart services: docker-compose restart"
echo "   Update: ./scripts/update.sh"
echo ""
