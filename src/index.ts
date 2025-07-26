import express from 'express';
import { config } from './config/app';
import { createFileWatcher } from './services/fileWatcher';
import { eventProcessor } from './services/eventProcessor';
import { database } from './database/database';
import { setupSecurityMiddleware } from './middleware/security';
import { setupRoutes } from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

const createApp = (): express.Application => {
  const app = express();

  // Setup security middleware
  setupSecurityMiddleware(app);

  // Setup routes
  setupRoutes(app);

  // Setup error handling middleware (must be last)
  app.use(errorHandler);
  app.use(notFoundHandler);

  return app;
};

async function startServer() {
  try {
    console.log('Starting File Tracker System...');
    
    // Start the event processor
    await eventProcessor.start();
    
    // Create and start the file watcher
    const fileWatcher = createFileWatcher(config.watchDirectories);
    await fileWatcher.start();
    
    // Create Express app
    const app = createApp();
    
    // Start the API server
    const server = app.listen(config.port, () => {
      console.log(`\nFile Tracker System running on port ${config.port}`);
      console.log(`Health check: http://localhost:${config.port}/health`);
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
      console.log(`\nWatching directories:`);
      config.watchDirectories.forEach(dir => console.log(`  - ${dir}`));
      console.log(`\nTo test, create files in the watched directories and check the API endpoints.`);
    });
    
    // Graceful shutdown handler
    const gracefulShutdown = async (signal: string) => {
      console.log(`\nReceived ${signal}, shutting down gracefully...`);
      
      // Close server
      server.close(() => {
        console.log('HTTP server closed');
      });
      
      // Stop services
      await fileWatcher.stop();
      await eventProcessor.stop();
      database.close();
      
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
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

export default createApp;