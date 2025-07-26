#!/bin/bash

# File Watcher Production Startup Script

set -e

echo "🚀 Starting File Watcher Production Environment"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker and Docker Compose are installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create required directories
print_status "Creating required directories..."
mkdir -p watched-files
mkdir -p /tmp/file-watcher-test
mkdir -p data

# Load environment variables
if [ -f .env.prod ]; then
    print_status "Loading production environment variables..."
    export $(cat .env.prod | grep -v '^#' | xargs)
else
    print_warning ".env.prod file not found. Using default values."
fi

# Build and start services
print_status "Building Docker images..."
docker-compose -f docker-compose.prod.yml build

print_status "Starting services..."
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to be healthy
print_status "Waiting for services to be ready..."
sleep 10

# Check service health
check_service() {
    local service=$1
    local port=$2
    local endpoint=${3:-/health}
    
    print_status "Checking $service health..."
    
    for i in {1..30}; do
        if curl -s -f "http://localhost:$port$endpoint" > /dev/null 2>&1; then
            print_success "$service is healthy"
            return 0
        fi
        sleep 2
    done
    
    print_error "$service health check failed"
    return 1
}

# Check Kafka UI
print_status "Checking Kafka UI..."
if curl -s -f "http://localhost:8080" > /dev/null 2>&1; then
    print_success "Kafka UI is accessible"
else
    print_warning "Kafka UI might not be ready yet"
fi

# Check Gateway
check_service "Gateway Orchestrator" "3001"

# Check Consumer API
check_service "Consumer API" "3000"

# Nginx removed - direct access only

print_success "File Watcher Production Environment is running!"

echo ""
echo "📊 Service URLs:"
echo "  • Consumer API:          http://localhost:3000/"
echo "  • Gateway Orchestrator:  http://localhost:3050/"
echo "  • Kafka UI:              http://localhost:8085/"
echo ""
echo "📁 Watched Directories:"
echo "  • ./watched-files       (mapped to /app/watched-files)"
echo "  • /tmp/file-watcher-test (mapped to /app/test-folder)"
echo ""
echo "🔍 Useful Commands:"
echo "  • View logs:            docker-compose -f docker-compose.prod.yml logs -f"
echo "  • View specific logs:   docker-compose -f docker-compose.prod.yml logs -f <service>"
echo "  • Stop services:        docker-compose -f docker-compose.prod.yml down"
echo "  • Restart service:      docker-compose -f docker-compose.prod.yml restart <service>"
echo ""
echo "📈 Test the system:"
echo "  • Create a file:        touch /tmp/file-watcher-test/test.txt"
echo "  • Check events:         curl http://localhost:3000/api/events"
echo "  • Check dashboard:      curl http://localhost:3000/api/dashboard"
echo ""

# Show container status
print_status "Container Status:"
docker-compose -f docker-compose.prod.yml ps