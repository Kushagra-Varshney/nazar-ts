# Production Deployment Guide

This guide explains how to deploy the File Watcher system in production using Docker Compose.

## Architecture Overview

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Nginx     │    │   Gateway   │    │    Kafka    │    │  Consumer   │
│   Proxy     │◄──►│Orchestrator │◄──►│   Queue     │◄──►│ (Analytics) │
│  Port 80    │    │  Port 3001  │    │ Port 9092   │    │  Port 3000  │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
       ▲                   ▲                                     ▲
       │                   │                                     │
       ▼                   ▼                                     ▼
┌─────────────┐    ┌─────────────┐                      ┌─────────────┐
│  Producer   │    │ Kafka UI    │                      │  Database   │
│(File Watch) │    │ Port 8080   │                      │  (SQLite)   │
│   No Port   │    └─────────────┘                      └─────────────┘
└─────────────┘
```

## Quick Start

1. **Clone and prepare**:
   ```bash
   git clone <repository>
   cd file-watcher
   ```

2. **Start production environment**:
   ```bash
   ./start-production.sh
   ```

3. **Test the system**:
   ```bash
   # Create a test file
   touch watched-files/test.txt
   
   # Check if event was captured
   curl http://localhost/api/events
   ```

## Services

### Core Application Services

| Service | Port | Description | Health Check |
|---------|------|-------------|--------------|
| nginx | 80 | Reverse proxy and load balancer | `curl localhost/health` |
| gateway-orchestrator | 3001 | Receives events from producers | `curl localhost:3001/health` |
| consumer | 3000 | Processes events and provides API | `curl localhost:3000/health` |
| producer | - | Watches files and sends events | Process check |

### Infrastructure Services

| Service | Port | Description | UI |
|---------|------|-------------|-----|
| kafka | 9092 | Message queue | - |
| zookeeper | 2181 | Kafka coordination | - |
| kafka-ui | 8080 | Kafka monitoring | http://localhost:8080 |

## Environment Variables

### Core Configuration
```bash
NODE_ENV=production
GATEWAY_PORT=3001
PORT=3000
KAFKA_BROKERS=kafka:29092
GATEWAY_URL=http://gateway-orchestrator:3001
```

### Application Modes
```bash
APP_MODE=producer|consumer|both
ENABLE_API=true|false
```

### Monitoring
```bash
LOG_LEVEL=info|debug|warn|error
HEALTH_CHECK_INTERVAL=30000
```

## Directory Structure

```
file-watcher/
├── docker-compose.prod.yml     # Production compose file
├── Dockerfile                  # Application container
├── nginx.conf                  # Nginx configuration
├── .env.prod                   # Environment variables
├── start-production.sh         # Startup script
├── watched-files/              # Default watched directory
└── data/                       # Database storage
```

## API Endpoints

### Via Nginx Proxy (Recommended)

| Method | URL | Description |
|--------|-----|-------------|
| GET | `http://localhost/api/events` | Get file events |
| GET | `http://localhost/api/analytics` | Get analytics data |
| GET | `http://localhost/api/dashboard` | Get dashboard data |
| POST | `http://localhost/gateway/api/events` | Send events (producers) |

### Direct Access

| Service | URL | Purpose |
|---------|-----|---------|
| Consumer API | `http://localhost:3000` | Direct API access |
| Gateway | `http://localhost:3001` | Direct gateway access |
| Kafka UI | `http://localhost:8080` | Kafka monitoring |

## Scaling

### Horizontal Scaling

1. **Multiple Producers**:
   ```yaml
   producer-1:
     # ... same config as producer
     volumes:
       - /path/to/dir1:/app/watched-files
   
   producer-2:
     # ... same config as producer  
     volumes:
       - /path/to/dir2:/app/watched-files
   ```

2. **Multiple Consumers**:
   ```yaml
   consumer-1:
     # ... same config as consumer
     container_name: consumer-1
     
   consumer-2:
     # ... same config as consumer
     container_name: consumer-2
     ports:
       - "3002:3000"
   ```

### Vertical Scaling

Update resource limits in docker-compose.prod.yml:
```yaml
services:
  consumer:
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '1.0'
        reservations:
          memory: 1G
          cpus: '0.5'
```

## Monitoring

### Health Checks

All services include health checks:
```bash
# Check all services
docker-compose -f docker-compose.prod.yml ps

# Check specific service logs
docker-compose -f docker-compose.prod.yml logs -f consumer
```

### Metrics

Access Kafka metrics via Kafka UI:
- Topics and partitions
- Consumer lag
- Message throughput
- Broker health

### Logs

```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f gateway-orchestrator

# Follow new logs
docker-compose -f docker-compose.prod.yml logs -f --tail=50 consumer
```

## Backup and Recovery

### Database Backup
```bash
# Create backup
docker cp consumer:/app/data/file_tracker.db ./backup-$(date +%Y%m%d-%H%M%S).db

# Restore backup
docker cp ./backup-file.db consumer:/app/data/file_tracker.db
docker-compose -f docker-compose.prod.yml restart consumer
```

### Kafka Data Backup
```bash
# Kafka data is persisted in Docker volumes
docker volume ls | grep kafka
```

## Security

### Network Security
- Services communicate via internal Docker network
- Only necessary ports exposed to host
- Nginx acts as security boundary

### Rate Limiting
Nginx configuration includes:
- API endpoints: 10 requests/second
- Gateway endpoints: 20 requests/second

### Headers
Security headers automatically added:
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- X-XSS-Protection: enabled

## Troubleshooting

### Common Issues

1. **Services not starting**:
   ```bash
   # Check service status
   docker-compose -f docker-compose.prod.yml ps
   
   # Check logs
   docker-compose -f docker-compose.prod.yml logs <service-name>
   ```

2. **Kafka connection issues**:
   ```bash
   # Check Kafka health
   docker-compose -f docker-compose.prod.yml exec kafka kafka-topics --bootstrap-server localhost:9092 --list
   ```

3. **File watching not working**:
   ```bash
   # Check producer logs
   docker-compose -f docker-compose.prod.yml logs -f producer
   
   # Verify volume mounts
   docker-compose -f docker-compose.prod.yml exec producer ls -la /app/watched-files
   ```

### Performance Tuning

1. **Kafka Performance**:
   ```yaml
   # In docker-compose.prod.yml
   kafka:
     environment:
       KAFKA_NUM_PARTITIONS: 3
       KAFKA_DEFAULT_REPLICATION_FACTOR: 1
       KAFKA_LOG_SEGMENT_BYTES: 1073741824
   ```

2. **Consumer Performance**:
   ```bash
   # Increase consumer instances
   docker-compose -f docker-compose.prod.yml up -d --scale consumer=3
   ```

## Maintenance

### Updates
```bash
# Pull latest images
docker-compose -f docker-compose.prod.yml pull

# Rebuild application
docker-compose -f docker-compose.prod.yml build --no-cache

# Rolling restart
docker-compose -f docker-compose.prod.yml up -d
```

### Cleanup
```bash
# Remove old containers
docker system prune

# Remove old images
docker image prune

# Remove unused volumes (⚠️ This will delete data!)
docker volume prune
```

## Production Checklist

- [ ] Environment variables configured
- [ ] SSL certificates installed (if using HTTPS)
- [ ] Monitoring alerts configured
- [ ] Backup strategy implemented
- [ ] Log rotation configured
- [ ] Resource limits set
- [ ] Security headers verified
- [ ] Rate limiting tested
- [ ] Health checks working
- [ ] Error handling tested