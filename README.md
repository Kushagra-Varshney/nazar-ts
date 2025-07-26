# Real-time File Tracker and Classifier System

A scalable real-time file monitoring system that watches multiple directories, extracts metadata, classifies files, and provides an API for accessing tracked data using **Apache Kafka** for distributed message processing.

## Features

- **Real-time File Watching**: Monitor multiple directories for file/folder creation, modification, and deletion
- **Automatic Classification**: Classify files by type (image, document, media, code, etc.) and category
- **Metadata Extraction**: Extract file metadata including size, timestamps, MIME types
- **Host Identification**: Identify host machines using MAC addresses
- **Kafka Message Processing**: Scalable event processing with Apache Kafka
- **SQLite Database**: Store file events and host information
- **REST API**: Query file events, hosts, and statistics via HTTP API
- **TypeScript**: Full TypeScript implementation with type safety
- **Docker Support**: Easy Kafka setup with Docker Compose

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   File Watcher  │───▶│   Kafka Topic    │───▶│ Event Processor │
│   (chokidar)    │    │  (file-events)   │    │   (Consumer)    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │                         │
                                │                         ▼
┌─────────────────┐             │               ┌─────────────────┐
│   Kafka UI      │◀────────────┘               │ SQLite Database │
│ (Monitoring)    │                             │                 │
└─────────────────┘                             └─────────────────┘
                                                         │
                                                         ▼
                                               ┌─────────────────┐
                                               │   REST API      │
                                               │   (Express)     │
                                               └─────────────────┘
```

## Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose (for Kafka)

## Installation

1. **Clone and install dependencies:**
```bash
git clone <repository-url>
cd file-watcher
npm install
```

2. **Set up environment variables:**
```bash
cp .env.example .env
# Edit .env file if needed - defaults work for local development
```

3. **Start Kafka with Docker Compose:**
```bash
docker-compose up -d
```

This starts:
- **Kafka**: `localhost:9092`
- **Zookeeper**: `localhost:2181`
- **Kafka UI**: `http://localhost:8080` (for monitoring)

4. **Build the project:**
```bash
npm run build
```

## Usage

### Option 1: Combined Server (Recommended)

Run both the file watcher and API server together:

```bash
npm run dev
```

This starts the system on `http://localhost:3000` and watches the `test-folder` directory.

### Option 2: Separate Services

Run the file watcher client:
```bash
npm run watcher
```

Run the API server separately:
```bash
npm run api
```

## Kafka Setup Verification

1. **Check Kafka is running:**
```bash
docker-compose ps
```

2. **View Kafka UI:**
Open `http://localhost:8080` to monitor topics, messages, and consumers.

3. **Check topics (optional):**
```bash
# Access Kafka container
docker exec -it kafka bash

# List topics
kafka-topics --bootstrap-server localhost:9092 --list

# View messages in file-events topic
kafka-console-consumer --bootstrap-server localhost:9092 --topic file-events --from-beginning
```

## API Endpoints

- `GET /health` - Health check
- `GET /api/events` - Get all file events
  - Query params: `hostId`, `limit`, `offset`
- `GET /api/hosts` - Get all registered hosts
- `GET /api/stats` - Get file statistics
  - Query params: `hostId`
- `GET /api/hosts/:hostId/events` - Get events for specific host
  - Query params: `limit`, `offset`

## Testing

1. Start the system:
```bash
npm run dev
```

2. Create test files in the `test-folder` directory:
```bash
# Create different types of files
echo "Hello World" > test-folder/document.txt
mkdir test-folder/new-directory
touch test-folder/image.jpg
echo "console.log('test')" > test-folder/script.js
```

3. Check the API endpoints:
```bash
# Get all events
curl http://localhost:3000/api/events

# Get hosts
curl http://localhost:3000/api/hosts

# Get statistics
curl http://localhost:3000/api/stats
```

## Configuration

### Environment Variables

Configure the system using environment variables in `.env`:

```bash
# Kafka Configuration
KAFKA_BROKERS=localhost:9092                    # Kafka broker addresses
KAFKA_GROUP_ID=file-tracker-consumer-group      # Consumer group ID
KAFKA_TOPIC_FILE_EVENTS=file-events            # Topic name for file events

# Server Configuration
PORT=3000                                       # API server port
```

### Watch Directories

Edit the `WATCH_DIRECTORIES` array in `src/index.ts` to monitor different directories:

```typescript
const WATCH_DIRECTORIES = [
  path.join(process.cwd(), 'test-folder'),
  '/Users/username/Documents',
  '/Users/username/Downloads',
  // Add more directories...
];
```

### Kafka Configuration

Advanced Kafka settings can be modified in `src/config/kafka.ts`:

```typescript
export const kafkaConfig: KafkaConfig = {
  clientId: 'file-tracker-system',
  brokers: ['localhost:9092'],
  groupId: 'file-tracker-consumer-group',
  topics: {
    fileEvents: 'file-events'
  }
};
```

## File Classification

The system automatically classifies files into categories:

- **Images**: `.jpg`, `.png`, `.gif`, etc.
- **Documents**: `.pdf`, `.doc`, `.txt`, etc.
- **Media**: `.mp4`, `.mp3`, `.wav`, etc.
- **Code**: `.js`, `.ts`, `.py`, `.java`, etc.
- **Archives**: `.zip`, `.rar`, `.tar`, etc.
- **Executables**: `.exe`, `.deb`, `.dmg`, etc.

## Host Identification

Each host machine is identified by its MAC address, ensuring unique tracking across multiple machines.

## Database Schema

### Hosts Table
- `id`: Unique host identifier (MAC address without colons)
- `mac_address`: Full MAC address
- `hostname`: Machine hostname
- `platform`: Operating system platform
- `last_seen`: Last activity timestamp

### File Events Table
- `id`: Auto-increment primary key
- `host_id`: Reference to hosts table
- `file_path`: Full file path
- `file_name`: File/directory name
- `file_type`: Classified file type
- `size`: File size in bytes
- `created_at`: File creation timestamp
- `modified_at`: File modification timestamp
- `event_type`: 'created', 'modified', or 'deleted'
- `extension`: File extension
- `mime_type`: MIME type (if available)
- `category`: File category
- `is_directory`: Boolean flag for directories

## Scripts

- `npm run build` - Build TypeScript to JavaScript
- `npm run start` - Run the built application
- `npm run dev` - Run in development mode with hot reload
- `npm run watcher` - Run only the file watcher client
- `npm run api` - Run only the API server

## Kafka Message Format

File events are published to Kafka in the following JSON format:

```json
{
  "hostId": "a1b2c3d4e5f6",
  "filePath": "/path/to/file.txt",
  "fileName": "file.txt",
  "fileType": "document",
  "size": 1024,
  "createdAt": "2024-01-01T12:00:00.000Z",
  "modifiedAt": "2024-01-01T12:00:00.000Z",
  "eventType": "created",
  "metadata": {
    "extension": ".txt",
    "mimeType": "text/plain",
    "category": "document",
    "isDirectory": false
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## Monitoring

### Kafka UI Dashboard
- Access `http://localhost:8080` for real-time Kafka monitoring
- View topics, partitions, messages, and consumer groups
- Monitor message throughput and consumer lag

### Application Logs
The application provides detailed logging for:
- File system events
- Kafka producer/consumer operations
- Database operations
- API requests

## Extending the System

### Adding New File Types

Edit `src/utils/fileClassifier.ts` to add new file extensions and classifications.

### Custom Event Processing

Modify `src/services/eventProcessor.ts` to add custom processing logic like:
- Notifications
- Webhooks
- File content analysis
- Backup operations

### Scaling with Multiple Consumers

Run multiple consumer instances to scale processing:

```bash
# Terminal 1
npm run watcher

# Terminal 2 - Additional consumer
KAFKA_GROUP_ID=file-tracker-consumer-group-2 npm run api
```

### Database Extensions

The SQLite database can be easily extended or replaced with PostgreSQL/MySQL for production use.

## Production Deployment

For production deployment:

1. **Use managed Kafka service** (AWS MSK, Confluent Cloud, etc.)
2. **Environment variables** for configuration
3. **Production database** (PostgreSQL/MySQL)
4. **Authentication and authorization**
5. **Proper logging and monitoring** (ELK Stack, Prometheus)
6. **Rate limiting and security headers**
7. **Load balancing** for API servers
8. **Dead letter queues** for failed message processing

### Production Kafka Configuration

```bash
# Production .env example
KAFKA_BROKERS=kafka1.example.com:9092,kafka2.example.com:9092,kafka3.example.com:9092
KAFKA_GROUP_ID=file-tracker-prod
KAFKA_TOPIC_FILE_EVENTS=file-events-prod
```

## License

MIT License