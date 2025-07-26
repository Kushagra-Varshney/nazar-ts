import { Kafka, Producer, Consumer, Admin } from 'kafkajs';
import { kafkaConfig, kafkaRetryConfig, kafkaConnectionTimeout, kafkaRequestTimeout } from '../config/kafka';

export class KafkaService {
  private kafka: Kafka;
  private producer: Producer | null = null;
  private consumer: Consumer | null = null;
  private admin: Admin | null = null;

  constructor() {
    this.kafka = new Kafka({
      clientId: kafkaConfig.clientId,
      brokers: kafkaConfig.brokers,
      retry: kafkaRetryConfig,
      connectionTimeout: kafkaConnectionTimeout,
      requestTimeout: kafkaRequestTimeout,
    });
  }

  async createTopics(): Promise<void> {
    if (!this.admin) {
      this.admin = this.kafka.admin();
      await this.admin.connect();
    }

    const topics = [
      {
        topic: kafkaConfig.topics.fileEvents,
        numPartitions: 3,
        replicationFactor: 1,
        configEntries: [
          {
            name: 'cleanup.policy',
            value: 'delete'
          },
          {
            name: 'retention.ms',
            value: '604800000' // 7 days
          }
        ]
      }
    ];

    try {
      const existingTopics = await this.admin.listTopics();
      const topicsToCreate = topics.filter(topic => !existingTopics.includes(topic.topic));
      
      if (topicsToCreate.length > 0) {
        await this.admin.createTopics({
          topics: topicsToCreate,
          waitForLeaders: true,
        });
        console.log(`Created Kafka topics: ${topicsToCreate.map(t => t.topic).join(', ')}`);
      } else {
        console.log('All required Kafka topics already exist');
      }
    } catch (error) {
      console.error('Error creating Kafka topics:', error);
      throw error;
    }
  }

  async getProducer(): Promise<Producer> {
    if (!this.producer) {
      this.producer = this.kafka.producer({
        maxInFlightRequests: 1,
        idempotent: true,
        transactionTimeout: 30000,
      });
      
      await this.producer.connect();
      console.log('Kafka producer connected');
    }
    return this.producer;
  }

  async getConsumer(): Promise<Consumer> {
    if (!this.consumer) {
      this.consumer = this.kafka.consumer({
        groupId: kafkaConfig.groupId,
        sessionTimeout: 30000,
        heartbeatInterval: 3000,
        maxBytesPerPartition: 1024 * 1024, // 1MB
        maxBytes: 5 * 1024 * 1024, // 5MB
      });
      
      await this.consumer.connect();
      console.log('Kafka consumer connected');
    }
    return this.consumer;
  }

  async disconnect(): Promise<void> {
    const promises: Promise<void>[] = [];
    
    if (this.producer) {
      promises.push(this.producer.disconnect());
      this.producer = null;
    }
    
    if (this.consumer) {
      promises.push(this.consumer.disconnect());
      this.consumer = null;
    }
    
    if (this.admin) {
      promises.push(this.admin.disconnect());
      this.admin = null;
    }

    await Promise.all(promises);
    console.log('Kafka service disconnected');
  }

  async checkConnection(): Promise<boolean> {
    try {
      if (!this.admin) {
        this.admin = this.kafka.admin();
        await this.admin.connect();
      }
      
      await this.admin.listTopics();
      return true;
    } catch (error) {
      console.error('Kafka connection check failed:', error);
      return false;
    }
  }
}

export const kafkaService = new KafkaService();