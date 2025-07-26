export interface KafkaConfig {
  clientId: string;
  brokers: string[];
  groupId: string;
  topics: {
    fileEvents: string;
  };
}

export const kafkaConfig: KafkaConfig = {
  clientId: 'file-tracker-system',
  brokers: process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'],
  groupId: process.env.KAFKA_GROUP_ID || 'file-tracker-consumer-group',
  topics: {
    fileEvents: process.env.KAFKA_TOPIC_FILE_EVENTS || 'file-events'
  }
};

export const kafkaRetryConfig = {
  retries: 5,
  initialRetryTime: 100,
  maxRetryTime: 30000,
};

export const kafkaConnectionTimeout = 3000;
export const kafkaRequestTimeout = 30000;