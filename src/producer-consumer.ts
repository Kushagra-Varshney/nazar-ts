import express from 'express';
import { config } from './config/app';
import { createFileWatcher } from './services/fileWatcher';
import { eventProcessor } from './services/eventProcessor';
import { database } from './database/database';
import { setupSecurityMiddleware } from './middleware/security';
import { setupRoutes } from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { FileEvent } from './types';

// Mode configuration
const APP_MODE = process.env.APP_MODE || 'consumer'; // 'producer', 'consumer', or 'both'
const ENABLE_PRODUCER = APP_MODE === 'producer' || APP_MODE === 'both';
const ENABLE_CONSUMER = APP_MODE === 'consumer' || APP_MODE === 'both';
const ENABLE_API = process.env.ENABLE_API === 'true' || APP_MODE === 'consumer' || APP_MODE === 'both';

class ProducerService {
  private gatewayUrl: string;

  constructor() {
    this.gatewayUrl = config.gatewayUrl;
  }

  async sendEventToGateway(event: FileEvent): Promise<void> {
    try {
      const response = await fetch(`${this.gatewayUrl}/api/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event)
      });

      if (!response.ok) {
        throw new Error(`Gateway responded with status: ${response.status}`);
      }

      const result = await response.json();
      console.log(`Event sent to gateway: ${event.eventType} - ${event.filePath}`);
    } catch (error) {
      console.error('Error sending event to gateway:', error);
      // In production, you might want to implement retry logic or fallback to local queue
    }
  }
}

const createApp = (): express.Application => {
  const app = express();

  // Setup security middleware
  setupSecurityMiddleware(app);

  // Setup routes only if API is enabled
  if (ENABLE_API) {
    setupRoutes(app);
  } else {
    // Basic health check for producer-only mode
    app.get('/health', (req, res) => {
      res.json({ 
        status: 'healthy', 
        service: 'producer-consumer',
        mode: APP_MODE,
        timestamp: new Date().toISOString() 
      });
    });
  }

  // Setup error handling middleware (must be last)
  app.use(errorHandler);
  app.use(notFoundHandler);

  return app;
};

async function startApp() {
  try {
    console.log(`Starting Producer-Consumer App in mode: ${APP_MODE}`);
    
    let fileWatcher: any = null;
    let producerService: ProducerService | null = null;
    
    // Initialize producer components
    if (ENABLE_PRODUCER) {
      console.log('Initializing producer components...');
      producerService = new ProducerService();
      
      // Create file watcher that sends events to gateway
      fileWatcher = createFileWatcher(config.watchDirectories, async (event: FileEvent) => {
        if (producerService) {
          await producerService.sendEventToGateway(event);
        }
      });
    }
    
    // Initialize consumer components
    if (ENABLE_CONSUMER) {
      console.log('Initializing consumer components...');
      // Start the event processor (Kafka consumer)
      await eventProcessor.start();
    }
    
    // Start file watcher if producer is enabled
    if (ENABLE_PRODUCER && fileWatcher) {
      await fileWatcher.start();
      console.log('File watcher started');
    }
    
    // Create and start Express app if API is enabled
    let server: any = null;
    if (ENABLE_API) {
      const app = createApp();
      
      server = app.listen(config.port, () => {
        console.log(`\nProducer-Consumer App running on port ${config.port}`);
        console.log(`Health check: http://localhost:${config.port}/health`);
        
        if (ENABLE_CONSUMER) {
          console.log(`\nAPI endpoints:`);
          console.log(`  GET /api/events - Get all file events`);
          console.log(`  GET /api/hosts - Get all hosts`);
          console.log(`  GET /api/stats - Get basic statistics`);
          console.log(`  GET /api/hosts/:hostId/events - Get events by host`);
          console.log(`\n  Analytics endpoints:`);
          console.log(`  GET /api/analytics - Get detailed analytics`);
          console.log(`  GET /api/analytics/file-types - Get file type distribution`);
          console.log(`  GET /api/analytics/trends - Get activity trends`);
          console.log(`  GET /api/dashboard - Get dashboard data`);
        }
        
        if (ENABLE_PRODUCER) {
          console.log(`\nWatching directories:`);
          config.watchDirectories.forEach(dir => console.log(`  - ${dir}`));
          console.log(`\nEvents will be sent to gateway: ${config.gatewayUrl}`);
        }
      });
    }
    
    // Graceful shutdown handler
    const gracefulShutdown = async (signal: string) => {
      console.log(`\nReceived ${signal}, shutting down gracefully...`);
      
      // Close server if running
      if (server) {
        server.close(() => {
          console.log('HTTP server closed');
        });
      }
      
      // Stop services
      if (ENABLE_PRODUCER && fileWatcher) {
        await fileWatcher.stop();
        console.log('File watcher stopped');
      }
      
      if (ENABLE_CONSUMER) {
        await eventProcessor.stop();
        console.log('Event processor stopped');
        database.close();
        console.log('Database connection closed');
      }
      
      console.log('Graceful shutdown completed');
      process.exit(0);
    };
    
    // Handle graceful shutdown
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      gracefulShutdown('uncaughtException');
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      gracefulShutdown('unhandledRejection');
    });
    
  } catch (error) {
    console.error('Failed to start app:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  startApp();
}

export default createApp;