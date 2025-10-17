export interface RabbitMQConfig {
  url: string;
  exchanges: {
    transactions: string;
    transactionsDlx: string;
    transactionsRetry: string;
  };
  queues: {
    transactionProcessing: string;
    transactionProcessingDlq: string;
    transactionRetry: string;
  };
  routingKeys: {
    transactionCreated: string;
    transactionFailed: string;
  };
}

export const rabbitMQConfig: RabbitMQConfig = {
  url: process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672',
  exchanges: {
    transactions: 'transactions.exchange',
    transactionsDlx: 'transactions.dlx.exchange',
    transactionsRetry: 'transactions.retry.exchange',
  },
  queues: {
    transactionProcessing: 'transactions.processing.queue',
    transactionProcessingDlq: 'transactions.dlq.queue',
    transactionRetry: 'transactions.retry.queue',
  },
  routingKeys: {
    transactionCreated: 'transaction.created',
    transactionFailed: 'transaction.failed',
  },
};
