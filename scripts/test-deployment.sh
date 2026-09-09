#!/bin/bash
# =============================================================================
# StreamOps - Deployment Test Script
# Verify that the deployment is working correctly
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

# Test functions
test_docker() {
    log_info "Testing Docker installation..."
    if command -v docker &> /dev/null; then
        log_success "Docker is installed"
        docker --version
    else
        log_error "Docker is not installed"
        return 1
    fi
}

test_docker_compose() {
    log_info "Testing Docker Compose installation..."
    if docker compose version &> /dev/null; then
        log_success "Docker Compose is installed"
        docker compose version
    else
        log_error "Docker Compose is not installed"
        return 1
    fi
}

test_env_file() {
    log_info "Testing .env file..."
    if [ -f .env ]; then
        log_success ".env file exists"
        
        # Check for required variables
        required_vars=("DATABASE_URL" "JWT_SECRET" "SESSION_SECRET")
        missing_vars=()
        
        for var in "${required_vars[@]}"; do
            if ! grep -q "^${var}=" .env; then
                missing_vars+=("$var")
            fi
        done
        
        if [ ${#missing_vars[@]} -eq 0 ]; then
            log_success "All required environment variables are set"
        else
            log_warning "Missing environment variables: ${missing_vars[*]}"
        fi
    else
        log_error ".env file not found"
        return 1
    fi
}

test_docker_compose_config() {
    log_info "Testing Docker Compose configuration..."
    if docker compose config &> /dev/null; then
        log_success "Docker Compose configuration is valid"
    else
        log_error "Docker Compose configuration has errors"
        return 1
    fi
}

test_directory_structure() {
    log_info "Testing directory structure..."
    
    required_dirs=("apps/api-server" "apps/dashboard" "lib/db" "scripts" "nginx")
    missing_dirs=()
    
    for dir in "${required_dirs[@]}"; do
        if [ ! -d "$dir" ]; then
            missing_dirs+=("$dir")
        fi
    done
    
    if [ ${#missing_dirs[@]} -eq 0 ]; then
        log_success "All required directories exist"
    else
        log_error "Missing directories: ${missing_dirs[*]}"
        return 1
    fi
}

test_service_endpoints() {
    log_info "Testing deployed service endpoints..."

    if curl --fail --silent --show-error --max-time 5 http://localhost:8080/api/healthz >/dev/null; then
        log_success "API health endpoint is reachable"
    else
        log_error "API health endpoint is not reachable"
        return 1
    fi

    if curl --fail --silent --show-error --max-time 5 http://localhost:3000/health >/dev/null; then
        log_success "Dashboard health endpoint is reachable"
    else
        log_error "Dashboard health endpoint is not reachable"
        return 1
    fi
}

test_port_availability() {
    log_info "Testing port availability..."
    
    ports=("8080" "3000" "5432" "6379")
    blocked_ports=()
    
    for port in "${ports[@]}"; do
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            blocked_ports+=("$port")
        fi
    done
    
    if [ ${#blocked_ports[@]} -eq 0 ]; then
        log_success "All required ports are available"
    else
        log_warning "Ports already in use: ${blocked_ports[*]}"
        log_warning "This may cause conflicts if running locally"
    fi
}

test_node_version() {
    log_info "Testing Node.js version..."
    if command -v node &> /dev/null; then
        node_version=$(node --version)
        log_success "Node.js is installed: $node_version"
        
        # Check if version is 24+
        major_version=$(echo $node_version | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$major_version" -ge 24 ]; then
            log_success "Node.js version is compatible (24+)"
        else
            log_warning "Node.js version may not be compatible (recommended: 24+)"
        fi
    else
        log_warning "Node.js is not installed (optional for Docker deployment)"
    fi
}

test_pnpm_version() {
    log_info "Testing pnpm version..."
    if command -v pnpm &> /dev/null; then
        pnpm_version=$(pnpm --version)
        log_success "pnpm is installed: $pnpm_version"
    else
        log_warning "pnpm is not installed (optional for Docker deployment)"
    fi
}

# Main test flow
main() {
    echo ""
    echo "=========================================="
    echo "🧪 StreamOps Deployment Test"
    echo "=========================================="
    echo ""
    
    local failed=0
    
    test_docker || failed=$((failed + 1))
    test_docker_compose || failed=$((failed + 1))
    test_env_file || failed=$((failed + 1))
    test_docker_compose_config || failed=$((failed + 1))
    test_directory_structure || failed=$((failed + 1))
    test_service_endpoints || failed=$((failed + 1))
    test_port_availability || failed=$((failed + 1))
    test_node_version || failed=$((failed + 1))
    test_pnpm_version || failed=$((failed + 1))
    
    echo ""
    echo "=========================================="
    if [ $failed -eq 0 ]; then
        log_success "All tests passed! Deployment is ready."
    else
        log_error "$failed test(s) failed. Please fix the issues above."
        exit 1
    fi
    echo "=========================================="
    echo ""
}

main "$@"
