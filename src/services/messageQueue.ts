import { FileEvent } from '../types';
import { kafkaService } from './kafkaService';
import { kafkaConfig } from '../config/kafka';

export class KafkaMessageQueue {
  private isInitialized = false;

  constructor() {}

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Check Kafka connection
      const isConnected = await kafkaService.checkConnection();
      if (!isConnected) {
        throw new Error('Unable to connect to Kafka brokers');
      }

      // Create topics if they don't exist
      await kafkaService.createTopics();
      
      this.isInitialized = true;
      console.log('Kafka message queue initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Kafka message queue:', error);
      throw error;
    }
  }

  async publish(event: FileEvent): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Kafka message queue not initialized');
    }

    try {
      const producer = await kafkaService.getProducer();
      
      const message = {
        key: event.hostId, // Use hostId as partition key for better distribution
        value: JSON.stringify({
          ...event,
          timestamp: new Date().toISOString()
        }),
        timestamp: Date.now().toString(),
      };

      await producer.send({
        topic: kafkaConfig.topics.fileEvents,
        messages: [message],
      });

      console.log(`Published event to Kafka: ${event.eventType} - ${event.filePath}`);
    } catch (error) {
      console.error('Error publishing message to Kafka:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    await kafkaService.disconnect();
    this.isInitialized = false;
  }

  getQueueSize(): number {
    // In Kafka, we don't track queue size locally
    // This could be implemented by querying Kafka consumer lag
    return 0;
  }
}

export const messageQueue = new KafkaMessageQueue();