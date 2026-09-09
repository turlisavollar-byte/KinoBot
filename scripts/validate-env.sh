#!/bin/bash
# =============================================================================
# StreamOps - Environment Validation Script
# Validate that all required environment variables are set
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

# Required environment variables
declare -A required_vars=(
    ["DATABASE_URL"]="PostgreSQL database connection string"
    ["JWT_SECRET"]="Secret key for JWT token signing"
    ["SESSION_SECRET"]="Secret key for session management"
    ["ADMIN_TELEGRAM_IDS"]="Comma-separated list of admin Telegram IDs"
)

# Optional environment variables with defaults
declare -A optional_vars=(
    ["NODE_ENV"]="production|development|staging (default: production)"
    ["API_PORT"]="API server port (default: 8080)"
    ["DASHBOARD_PORT"]="Dashboard port (default: 3000)"
    ["LOG_LEVEL"]="error|warn|info|debug (default: info)"
    ["LOG_FORMAT"]="json|pretty (default: json)"
    ["CORS_ORIGINS"]="Comma-separated allowed origins (default: *)"
    ["PAYME_IS_TEST"]="true|false (default: false)"
    ["BCRYPT_SALT_ROUNDS"]="Number of salt rounds (default: 12)"
    ["RATE_LIMIT_WINDOW_MS"]="Rate limit window in ms (default: 900000)"
    ["RATE_LIMIT_MAX_REQUESTS"]="Max requests per window (default: 100)"
    ["MAX_FILE_SIZE"]="Max file size in bytes (default: 52428800)"
)

# Check if .env file exists
check_env_file() {
    log_info "Checking .env file..."
    
    if [ ! -f .env ]; then
        log_error ".env file not found"
        log_info "Creating .env from .env.example..."
        
        if [ -f .env.example ]; then
            cp .env.example .env
            log_success ".env file created from .env.example"
            log_warning "Please edit .env and configure the required variables"
            return 1
        else
            log_error ".env.example file not found"
            return 1
        fi
    fi
    
    log_success ".env file exists"
    return 0
}

# Validate required variables
validate_required_vars() {
    log_info "Validating required environment variables..."
    
    local missing_vars=()
    local empty_vars=()
    
    for var in "${!required_vars[@]}"; do
        if ! grep -q "^${var}=" .env; then
            missing_vars+=("$var")
        elif grep -q "^${var}=$" .env; then
            empty_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -gt 0 ]; then
        log_error "Missing required variables:"
        for var in "${missing_vars[@]}"; do
            echo "  - $var: ${required_vars[$var]}"
        done
        return 1
    fi
    
    if [ ${#empty_vars[@]} -gt 0 ]; then
        log_error "Empty required variables:"
        for var in "${empty_vars[@]}"; do
            echo "  - $var: ${required_vars[$var]}"
        done
        return 1
    fi
    
    log_success "All required environment variables are set"
    return 0
}

# Validate only the payment providers explicitly exposed to users.
validate_enabled_payment_providers() {
    local providers=""
    local provider=""
    local missing=0
    providers=$(grep '^BILLING_ENABLED_PROVIDERS=' .env | cut -d'=' -f2- | tr -d '"' | tr ',' ' ')

    if [ -z "${providers// /}" ]; then
        log_info "No payment providers enabled"
        return 0
    fi

    for provider in $providers; do
        case "$provider" in
            payme)
                validate_required_payment_var "PAYME_MERCHANT_ID" "Payme merchant ID" || missing=$((missing + 1))
                validate_required_payment_var "PAYME_KEY" "Payme merchant key" || missing=$((missing + 1))
                ;;
            p2p)
                validate_required_payment_var "P2P_ENABLED" "P2P enable flag" || missing=$((missing + 1))
                validate_required_payment_var "P2P_MERCHANT_ID" "P2P merchant ID" || missing=$((missing + 1))
                validate_required_payment_var "P2P_SECRET_KEY" "P2P secret key" || missing=$((missing + 1))
                validate_required_payment_var "P2P_API_URL" "P2P API URL" || missing=$((missing + 1))
                validate_required_payment_var "P2P_CHECKOUT_BASE_URL" "P2P checkout URL" || missing=$((missing + 1))
                ;;
            click|uzum|paynet|anor|nbu|uzcard|octo)
                log_warning "Provider '$provider' is enabled; provider-specific credential validation is not yet configured"
                ;;
            *)
                log_error "Unknown payment provider in BILLING_ENABLED_PROVIDERS: $provider"
                missing=$((missing + 1))
                ;;
        esac
    done

    if [ "$missing" -eq 0 ]; then
        return 0
    fi
    return 1
}

validate_required_payment_var() {
    local var="$1"
    local description="$2"
    if ! grep -q "^${var}=" .env || grep -q "^${var}=$" .env; then
        log_error "Missing or empty $var: $description"
        return 1
    fi
    return 0
}

# Validate optional variables
validate_optional_vars() {
    log_info "Checking optional environment variables..."
    
    local present_vars=()
    
    for var in "${!optional_vars[@]}"; do
        if grep -q "^${var}=" .env; then
            present_vars+=("$var")
        fi
    done
    
    if [ ${#present_vars[@]} -gt 0 ]; then
        log_success "Optional variables configured: ${present_vars[*]}"
    else
        log_info "No optional variables configured (using defaults)"
    fi
    
    return 0
}

# Validate specific variable formats
validate_formats() {
    log_info "Validating variable formats..."
    
    local format_errors=0
    
    # Validate DATABASE_URL format
    if grep -q "^DATABASE_URL=" .env; then
        db_url=$(grep "^DATABASE_URL=" .env | cut -d'=' -f2)
        if [[ ! $db_url =~ ^postgresql:// ]]; then
            log_error "DATABASE_URL must start with postgresql://"
            format_errors=$((format_errors + 1))
        fi
    fi
    
    # Validate PORT variables are numbers
    for var in "API_PORT" "DASHBOARD_PORT"; do
        if grep -q "^${var}=" .env; then
            port=$(grep "^${var}=" .env | cut -d'=' -f2)
            if ! [[ $port =~ ^[0-9]+$ ]]; then
                log_error "$var must be a number"
                format_errors=$((format_errors + 1))
            fi
        fi
    done
    
    # Validate boolean variables
    for var in "PAYME_IS_TEST"; do
        if grep -q "^${var}=" .env; then
            value=$(grep "^${var}=" .env | cut -d'=' -f2)
            if [[ ! $value =~ ^(true|false)$ ]]; then
                log_error "$var must be 'true' or 'false'"
                format_errors=$((format_errors + 1))
            fi
        fi
    done
    
    if [ $format_errors -eq 0 ]; then
        log_success "All variable formats are valid"
    else
        log_error "$format_errors format error(s) found"
        return 1
    fi
    
    return 0
}

# Security check
security_check() {
    log_info "Performing security checks..."
    
    local warnings=0
    
    # Check for default secrets
    if grep -q "your_jwt_secret" .env; then
        log_warning "JWT_SECRET appears to be using default value"
        warnings=$((warnings + 1))
    fi
    
    if grep -q "your_session_secret" .env; then
        log_warning "SESSION_SECRET appears to be using default value"
        warnings=$((warnings + 1))
    fi
    
    if grep -q "your_payme" .env; then
        log_warning "Payme credentials appear to be using default values"
        warnings=$((warnings + 1))
    fi
    
    # Check for weak passwords in DATABASE_URL
    if grep -q "password" .env; then
        log_warning "DATABASE_URL may contain weak password"
        warnings=$((warnings + 1))
    fi
    
    if [ $warnings -eq 0 ]; then
        log_success "No security issues detected"
    else
        log_warning "$warnings security warning(s) found"
        log_warning "Please review and update default values before production deployment"
    fi
    
    return 0
}

# Main validation flow
main() {
    echo ""
    echo "=========================================="
    echo "🔐 StreamOps Environment Validation"
    echo "=========================================="
    echo ""
    
    local failed=0
    
    check_env_file || failed=$((failed + 1))
    validate_required_vars || failed=$((failed + 1))
    validate_enabled_payment_providers || failed=$((failed + 1))
    validate_optional_vars || failed=$((failed + 1))
    validate_formats || failed=$((failed + 1))
    security_check || failed=$((failed + 1))
    
    echo ""
    echo "=========================================="
    if [ $failed -eq 0 ]; then
        log_success "Environment validation passed!"
        log_info "Your .env file is ready for deployment"
    else
        log_error "$failed validation(s) failed"
        log_info "Please fix the issues above before deploying"
        exit 1
    fi
    echo "=========================================="
    echo ""
}

main "$@"
