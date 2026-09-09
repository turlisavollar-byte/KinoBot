# =============================================================================
# StreamOps - Deployment Script (PowerShell)
# One-command deployment for production environments
# =============================================================================

$ErrorActionPreference = "Stop"
$ComposeFile = if ($env:COMPOSE_FILE) { $env:COMPOSE_FILE } else { "docker-compose.prod.yml" }

# Logging functions
function Write-DeploymentInfo {
    param([string]$Message)
    Write-Host "INFO: $Message" -ForegroundColor Blue
}

function Write-DeploymentSuccess {
    param([string]$Message)
    Write-Host "OK: $Message" -ForegroundColor Green
}

function Write-DeploymentWarning {
    param([string]$Message)
    Write-Host "WARNING: $Message" -ForegroundColor Yellow
}

function Write-DeploymentError {
    param([string]$Message)
    Write-Host "ERROR: $Message" -ForegroundColor Red
}

# Check prerequisites
function Test-Prerequisites {
    Write-DeploymentInfo "Checking prerequisites..."
    
    # Check Docker
    try {
        $null = docker version
        Write-DeploymentSuccess "Docker is installed"
    }
    catch {
        Write-DeploymentError "Docker is not installed. Please install Docker first."
        exit 1
    }
    
    # Check Docker Compose
    try {
        $null = docker compose version
        Write-DeploymentSuccess "Docker Compose is installed"
    }
    catch {
        Write-DeploymentError "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    }
    
    # Check .env file
    if (-not (Test-Path .env)) {
        Write-DeploymentError ".env file not found. Please copy .env.example to .env and configure it."
        exit 1
    }
    Write-DeploymentSuccess ".env file found"
    
    # Check Docker is running
    try {
        $null = docker info
        Write-DeploymentSuccess "Docker is running"
    }
    catch {
        Write-DeploymentError "Docker is not running. Please start Docker first."
        exit 1
    }
}

# Load environment variables
function Import-Environment {
    Write-DeploymentInfo "Loading environment variables..."
    
    if (Test-Path .env) {
        Get-Content .env | ForEach-Object {
            if ($_ -match '^([^#].+?)=(.+)$') {
                [Environment]::SetEnvironmentVariable($matches[1], $matches[2])
            }
        }
        Write-DeploymentSuccess "Environment variables loaded"
    }
}

# Stop existing services
function Stop-Services {
    Write-DeploymentInfo "Stopping existing services..."
    try {
        docker compose -f $ComposeFile down 2>$null
        Write-DeploymentSuccess "Services stopped"
    }
    catch {
        Write-DeploymentWarning "No existing services to stop"
    }
}

# Build and start services
function Start-DeploymentServices {
    Write-DeploymentInfo "Building and starting services..."
    
    # Pull latest images
    Write-DeploymentInfo "Pulling latest images..."
    docker compose -f $ComposeFile pull
    
    # Build services
    Write-DeploymentInfo "Building services..."
    docker compose -f $ComposeFile build --no-cache
    
    # Start services
    Write-DeploymentInfo "Starting services..."
    docker compose -f $ComposeFile up -d
    
    Write-DeploymentSuccess "Services deployed"
}

# Run database migrations
function Invoke-Migrations {
    Write-DeploymentInfo "Running database migrations..."
    
    # Wait for database to be ready
    Write-DeploymentInfo "Waiting for database to be ready..."
    Start-Sleep -Seconds 10
    
    pnpm --filter @workspace/db run migrate
    pnpm --filter @workspace/db run seed
    Write-DeploymentSuccess "Database migrations and seed completed"
}

# Health check
function Test-Health {
    Write-DeploymentInfo "Running health checks..."
    
    # Wait for services to be healthy
    Write-DeploymentInfo "Waiting for services to be healthy (this may take up to 60 seconds)..."
    Start-Sleep -Seconds 30
    
    # Check API health
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8080/api/healthz" -UseBasicParsing -TimeoutSec 5
        if ($response.StatusCode -eq 200) {
            Write-DeploymentSuccess "API server is healthy"
        }
        else {
            Write-DeploymentWarning "API server health check failed"
        }
    }
    catch {
        Write-DeploymentWarning "API server health check failed, but deployment may still be working"
    }
    
    # Check Dashboard health
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000/health" -UseBasicParsing -TimeoutSec 5
        if ($response.StatusCode -eq 200) {
            Write-DeploymentSuccess "Dashboard is healthy"
        }
        else {
            Write-DeploymentWarning "Dashboard health check failed"
        }
    }
    catch {
        Write-DeploymentWarning "Dashboard health check failed, but deployment may still be working"
    }
}

# Show deployment info
function Show-DeploymentInfo {
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-DeploymentSuccess "Deployment completed successfully!"
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Access URLs:"
    Write-Host "   Dashboard: http://localhost:3000"
    Write-Host "   API: http://localhost:8080"
    Write-Host "   API Health: http://localhost:8080/api/healthz"
    Write-Host ""
    Write-Host "Admin access:"
    Write-Host "   Use the explicitly configured bootstrap account, if one was provided."
    Write-Host "   Remove BOOTSTRAP_ADMIN_PASSWORD from the environment after first use."
    Write-Host ""
    Write-Host "Useful commands:"
    Write-Host "   View logs: docker-compose logs -f"
    Write-Host "   Stop services: docker-compose down"
    Write-Host "   Restart services: docker-compose restart"
    Write-Host ""
}

# Main deployment flow
function Main {
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "StreamOps Deployment Script" -ForegroundColor Cyan
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host ""
    
    Test-Prerequisites
    Import-Environment
    Stop-Services
    Start-DeploymentServices
    Invoke-Migrations
    Test-Health
    Show-DeploymentInfo
    
    Write-DeploymentSuccess "Deployment completed!"
}

# Run main function
Main
