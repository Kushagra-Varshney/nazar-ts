import express from 'express';
import { config } from './config/app';
import { setupSecurityMiddleware } from './middleware/security';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { kafkaService } from './services/kafkaService';
import { kafkaConfig } from './config/kafka';
import { FileEvent } from './types';

const createGatewayApp = (): express.Application => {
  const app = express();

  // Setup security middleware
  setupSecurityMiddleware(app);

  // Parse JSON bodies
  app.use(express.json());

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: 'gateway-orchestrator', timestamp: new Date().toISOString() });
  });

  // Endpoint to receive file events from producers
  app.post('/api/events', async (req, res) => {
    try {
      const fileEvent: FileEvent = req.body;
      
      // Validate the file event
      if (!fileEvent.hostId || !fileEvent.filePath || !fileEvent.eventType) {
        return res.status(400).json({ 
          error: 'Invalid file event', 
          required: ['hostId', 'filePath', 'eventType'] 
        });
      }

      // Add timestamp for tracking
      const eventData = {
        ...fileEvent,
        timestamp: new Date().toISOString()
      };

      try {
        // Check if Kafka is connected before sending
        const isConnected = await kafkaService.checkConnection();
        if (!isConnected) {
          throw new Error('Kafka is not connected');
        }

        // Send to Kafka queue
        const producer = await kafkaService.getProducer();
        await producer.send({
          topic: kafkaConfig.topics.fileEvents,
          messages: [{
            value: JSON.stringify(eventData),
            key: fileEvent.hostId
          }]
        });

        console.log(`Event queued: ${fileEvent.eventType} - ${fileEvent.filePath}`);
        
        res.status(202).json({ 
          message: 'Event queued successfully',
          eventId: fileEvent.id,
          timestamp: eventData.timestamp
        });
      } catch (kafkaError: any) {
        console.warn('Kafka unavailable, event dropped:', kafkaError.message || kafkaError);
        res.status(503).json({ 
          error: 'Message queue temporarily unavailable',
          eventId: fileEvent.id,
          timestamp: eventData.timestamp,
          retry: true
        });
      }
    } catch (error) {
      console.error('Error processing event:', error);
      res.status(500).json({ error: 'Failed to process event' });
    }
  });

  // Endpoint to get queue status
  app.get('/api/queue/status', async (req, res) => {
    try {
      const isConnected = await kafkaService.checkConnection();
      res.json({
        kafkaConnected: isConnected,
        topics: kafkaConfig.topics,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error checking queue status:', error);
      res.status(500).json({ error: 'Failed to check queue status' });
    }
  });

  // Setup error handling middleware (must be last)
  app.use(errorHandler);
  app.use(notFoundHandler);

  return app;
};

async function startGateway() {
  try {
    console.log('Starting Gateway Orchestrator...');
    
    // Create Express app
    const app = createGatewayApp();
    
    // Start the gateway server first
    const server = app.listen(config.gatewayPort || 3001, () => {
      console.log(`\nGateway Orchestrator running on port ${config.gatewayPort || 3001}`);
      console.log(`Health check: http://localhost:${config.gatewayPort || 3001}/health`);
      console.log(`\nAPI endpoints:`);
      console.log(`  POST /api/events - Queue file events`);
      console.log(`  GET /api/queue/status - Get queue status`);
    });

    // Initialize Kafka connection in background (with retries)
    setTimeout(async () => {
      let retries = 0;
      const maxRetries = 10;
      
      while (retries < maxRetries) {
        try {
          const isConnected = await kafkaService.checkConnection();
          if (isConnected) {
            console.log('✅ Kafka connection established');
            break;
          }
        } catch (error) {
          console.log(`⏳ Kafka connection attempt ${retries + 1}/${maxRetries} failed, retrying...`);
        }
        
        retries++;
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds between retries
      }
      
      if (retries >= maxRetries) {
        console.warn('⚠️ Failed to connect to Kafka after multiple attempts. Events will be dropped until connection is established.');
      }
    }, 1000);
    
    // Graceful shutdown handler
    const gracefulShutdown = async (signal: string) => {
      console.log(`\nReceived ${signal}, shutting down gateway gracefully...`);
      
      // Close server
      server.close(() => {
        console.log('Gateway HTTP server closed');
      });
      
      // Disconnect from Kafka
      await kafkaService.disconnect();
      
      console.log('Gateway graceful shutdown completed');
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
    console.error('Failed to start gateway:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  startGateway();
}

export default createGatewayApp;