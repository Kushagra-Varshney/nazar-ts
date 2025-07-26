# File Watcher Architecture

This project has been refactored into a producer-consumer architecture with a gateway orchestrator.

## Architecture Overview

```
┌─────────────────┐    HTTP POST    ┌─────────────────┐    Kafka Queue    ┌─────────────────┐
│   Producer      │ ──────────────> │     Gateway     │ ──────────────>  │    Consumer     │
│   (File Watch)  │   /api/events   │  Orchestrator   │                  │   (Analytics)   │
└─────────────────┘                 └─────────────────┘                  └─────────────────┘
```

## Components

### 1. Gateway Orchestrator (`gateway-orchestrator.ts`)
- **Purpose**: Central hub that receives file events and manages the Kafka queue
- **Port**: 3001 (configurable via `GATEWAY_PORT`)
- **Endpoints**:
  - `POST /api/events` - Receive file events from producers
  - `GET /api/queue/status` - Check Kafka connection status
  - `GET /health` - Health check

### 2. Producer-Consumer App (`producer-consumer.ts`)
- **Purpose**: Flexible app that can run as producer, consumer, or both
- **Modes**: Controlled by `APP_MODE` environment variable
  - `producer` - Only watches files and sends events to gateway
  - `consumer` - Only consumes events from queue and provides API
  - `both` - Runs both producer and consumer functionality

## Environment Variables

- `APP_MODE`: Set to `producer`, `consumer`, or `both`
- `ENABLE_API`: Set to `true` to enable REST API (auto-enabled for consumer mode)
- `GATEWAY_PORT`: Port for gateway orchestrator (default: 3001)
- `GATEWAY_URL`: URL of gateway orchestrator (default: http://localhost:3001)
- `PORT`: Port for producer-consumer app (default: 3000)

## Running the System

### Development

1. **Start Gateway Orchestrator**:
   ```bash
   npm run gateway
   ```

2. **Start Consumer** (provides API and analytics):
   ```bash
   npm run consumer
   ```

3. **Start Producer** (watches files):
   ```bash
   npm run producer
   ```

4. **Start Both** (single app with both functions):
   ```bash
   npm run producer-consumer
   ```

### Production

1. **Build the project**:
   ```bash
   npm run build
   ```

2. **Start Gateway**:
   ```bash
   npm run gateway:prod
   ```

3. **Start Consumer**:
   ```bash
   npm run consumer:prod
   ```

4. **Start Producer**:
   ```bash
   npm run producer:prod
   ```

## Use Cases

### Scenario 1: Distributed Setup
- Gateway on server A
- Multiple producers on different machines
- Consumer on server B for analytics

### Scenario 2: Local Development
- All components on same machine with different ports

### Scenario 3: Simple Setup
- Single producer-consumer app in "both" mode
- Gateway for queue management

## API Endpoints

### Gateway (Port 3001)
- `POST /api/events` - Queue file events
- `GET /api/queue/status` - Queue status
- `GET /health` - Health check

### Consumer/API (Port 3000)
- `GET /api/events` - Get file events
- `GET /api/hosts` - Get hosts
- `GET /api/stats` - Basic statistics
- `GET /api/analytics` - Detailed analytics
- `GET /api/dashboard` - Dashboard data
- `GET /health` - Health check

## Benefits of This Architecture

1. **Scalability**: Multiple producers can send events to a single gateway
2. **Decoupling**: Producers and consumers are independent
3. **Reliability**: Kafka provides message persistence and delivery guarantees
4. **Flexibility**: Components can be deployed separately or together
5. **Fault Tolerance**: If consumer goes down, events are queued
6. **Load Distribution**: Multiple consumers can process events in parallel

## Migration from Old Architecture

The original `index.ts` file is preserved and still works as before. The new architecture provides:
- Better separation of concerns
- Horizontal scaling capabilities
- More deployment flexibility
- Improved fault tolerance