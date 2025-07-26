import { FileEvent } from '../types';
import { database } from '../database/database';
import { getHostInfo } from '../utils/hostUtils';
import { kafkaService } from './kafkaService';
import { kafkaConfig } from '../config/kafka';

export class KafkaEventProcessor {
  private isProcessing = false;
  private isInitialized = false;

  constructor() {}

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Ensure Kafka connection
      const isConnected = await kafkaService.checkConnection();
      if (!isConnected) {
        throw new Error('Unable to connect to Kafka brokers');
      }

      this.isInitialized = true;
      console.log('Kafka event processor initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Kafka event processor:', error);
      throw error;
    }
  }

  async start(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    console.log('Event processor started');
    
    // Register this host in the database
    const hostInfo = getHostInfo();
    await database.insertHost(hostInfo);
    
    this.isProcessing = true;
    
    // Start consuming messages from Kafka
    await this.startKafkaConsumer();
  }

  private async startKafkaConsumer(): Promise<void> {
    try {
      const consumer = await kafkaService.getConsumer();
      
      await consumer.subscribe({ 
        topic: kafkaConfig.topics.fileEvents,
        fromBeginning: false 
      });

      await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          try {
            if (!message.value) {
              console.warn('Received empty message from Kafka');
              return;
            }

            const eventData = JSON.parse(message.value.toString());
            
            // Remove the timestamp field we added in the producer
            const { timestamp, ...rawEvent } = eventData;
            
            // Convert string dates back to Date objects
            const fileEvent: FileEvent = {
              ...rawEvent,
              createdAt: new Date(rawEvent.createdAt),
              modifiedAt: new Date(rawEvent.modifiedAt)
            };
            
            await this.processEvent(fileEvent);
            
            console.log(`Consumed message from partition ${partition}, offset ${message.offset}`);
          } catch (error) {
            console.error('Error processing Kafka message:', error);
            // In production, you might want to implement dead letter queue here
          }
        },
      });

      console.log('Kafka consumer started and listening for messages');
    } catch (error) {
      console.error('Error starting Kafka consumer:', error);
      throw error;
    }
  }

  async processEvent(event: FileEvent): Promise<void> {
    if (!this.isProcessing) {
      return;
    }

    try {
      // Store the event in the database
      await database.insertFileEvent(event);
      
      // Update analytics data
      await this.updateAnalytics(event);
      
      console.log(`Processed event: ${event.eventType} - ${event.filePath}`);
      
      // Here you could add additional processing logic like:
      // - Sending notifications
      // - Triggering webhooks
      // - File content analysis
      // - Virus scanning
      // - Backup operations
      
    } catch (error) {
      console.error('Error processing event:', error);
      // In production, you might want to implement retry logic or dead letter queue
    }
  }

  private async updateAnalytics(event: FileEvent): Promise<void> {
    try {
      const eventDate = event.createdAt.toISOString().split('T')[0];
      const eventHour = event.createdAt.getHours();
      const directoryPath = event.filePath.substring(0, event.filePath.lastIndexOf('/')) || '/';

      // Update daily analytics
      await this.updateDailyAnalytics(eventDate, event.hostId, event);
      
      // Update hourly analytics
      await this.updateHourlyAnalytics(eventDate, eventHour, event.hostId);
      
      // Update directory analytics
      await this.updateDirectoryAnalytics(directoryPath, event.hostId, event);
      
    } catch (error) {
      console.error('Error updating analytics:', error);
    }
  }

  private async updateDailyAnalytics(date: string, hostId: string, event: FileEvent): Promise<void> {
    const run = (sql: string, params: any[]) => {
      return new Promise<void>((resolve, reject) => {
        database['db'].run(sql, params, (err: any) => {
          if (err) reject(err);
          else resolve();
        });
      });
    };

    await run(`
      INSERT OR IGNORE INTO daily_analytics (date, host_id, total_events, files_created, files_modified, files_deleted, total_size, unique_extensions)
      VALUES (?, ?, 0, 0, 0, 0, 0, 0)
    `, [date, hostId]);

    const eventTypeField = event.eventType === 'created' ? 'files_created = files_created + 1' :
                          event.eventType === 'modified' ? 'files_modified = files_modified + 1' :
                          'files_deleted = files_deleted + 1';

    await run(`
      UPDATE daily_analytics SET
        total_events = total_events + 1,
        ${eventTypeField},
        total_size = total_size + ?
      WHERE date = ? AND host_id = ?
    `, [event.size, date, hostId]);
  }

  private async updateHourlyAnalytics(date: string, hour: number, hostId: string): Promise<void> {
    const run = (sql: string, params: any[]) => {
      return new Promise<void>((resolve, reject) => {
        database['db'].run(sql, params, (err: any) => {
          if (err) reject(err);
          else resolve();
        });
      });
    };

    await run(`
      INSERT OR REPLACE INTO hourly_analytics (date, hour, host_id, event_count)
      VALUES (?, ?, ?, COALESCE((SELECT event_count FROM hourly_analytics WHERE date = ? AND hour = ? AND host_id = ?), 0) + 1)
    `, [date, hour, hostId, date, hour, hostId]);
  }

  private async updateDirectoryAnalytics(directoryPath: string, hostId: string, event: FileEvent): Promise<void> {
    const run = (sql: string, params: any[]) => {
      return new Promise<void>((resolve, reject) => {
        database['db'].run(sql, params, (err: any) => {
          if (err) reject(err);
          else resolve();
        });
      });
    };

    await run(`
      INSERT OR REPLACE INTO directory_analytics (directory_path, host_id, event_count, last_activity, file_count, total_size)
      VALUES (?, ?, 
        COALESCE((SELECT event_count FROM directory_analytics WHERE directory_path = ? AND host_id = ?), 0) + 1,
        ?,
        COALESCE((SELECT file_count FROM directory_analytics WHERE directory_path = ? AND host_id = ?), 0) + CASE WHEN ? = 'created' THEN 1 WHEN ? = 'deleted' THEN -1 ELSE 0 END,
        COALESCE((SELECT total_size FROM directory_analytics WHERE directory_path = ? AND host_id = ?), 0) + ?
      )
    `, [
      directoryPath, hostId, directoryPath, hostId, 
      event.createdAt.toISOString(), 
      directoryPath, hostId, event.eventType, event.eventType,
      directoryPath, hostId, event.size
    ]);
  }

  async stop(): Promise<void> {
    this.isProcessing = false;
    await kafkaService.disconnect();
    console.log('Event processor stopped');
  }
}

export const eventProcessor = new KafkaEventProcessor();