import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import * as amqp from "amqp-connection-manager";
import { ChannelWrapper } from "amqp-connection-manager";
import { ConfirmChannel, ConsumeMessage } from "amqplib";
import { rabbitMQConfig } from "./rabbitmq.config";

export interface MessagePayload {
  data: any;
  correlationId: string;
  timestamp: string;
  retryCount?: number;
}

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private connection: amqp.AmqpConnectionManager;
  private channelWrapper: ChannelWrapper;
  private readonly MAX_RETRY_COUNT = 3;
  private isReady = false;

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  private async connect() {
    try {
      // create connection manager
      this.connection = amqp.connect([rabbitMQConfig.url], {
        heartbeatIntervalInSeconds: 30,
        reconnectTimeInSeconds: 5,
      });

      this.connection.on("connect", () => {
        console.log("✅ Connected to RabbitMQ");
      });

      this.connection.on("disconnect", (params: { err: Error }) => {
        console.error("❌ Disconnected from RabbitMQ:", params.err?.message);
      });

      // create channel wrapper
      this.channelWrapper = this.connection.createChannel({
        setup: async (channel: ConfirmChannel) => {
          await this.setupExchangesAndQueues(channel);
        },
      });

      await this.channelWrapper.waitForConnect();
      this.isReady = true;
      console.log("✅ RabbitMQ channel ready");
    } catch (error) {
      console.error("❌ Failed to connect to RabbitMQ:", error);
      throw error;
    }
  }

  private async waitUntilReady(): Promise<void> {
    // wait for rabbitmq to be fully initialized
    while (!this.isReady) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  private async setupExchangesAndQueues(channel: ConfirmChannel) {
    // declare main exchange
    await channel.assertExchange(
      rabbitMQConfig.exchanges.transactions,
      "topic",
      { durable: true }
    );

    // declare DLX (Dead Letter Exchange)
    await channel.assertExchange(
      rabbitMQConfig.exchanges.transactionsDlx,
      "topic",
      { durable: true }
    );

    // declare DLQ (Dead Letter Queue)
    await channel.assertQueue(rabbitMQConfig.queues.transactionProcessingDlq, {
      durable: true,
    });

    // bind DLQ to DLX
    await channel.bindQueue(
      rabbitMQConfig.queues.transactionProcessingDlq,
      rabbitMQConfig.exchanges.transactionsDlx,
      "#"
    );

    // declare main queue with DLX configured
    await channel.assertQueue(rabbitMQConfig.queues.transactionProcessing, {
      durable: true,
      arguments: {
        "x-dead-letter-exchange": rabbitMQConfig.exchanges.transactionsDlx,
        "x-dead-letter-routing-key":
          rabbitMQConfig.routingKeys.transactionFailed,
      },
    });

    // bind main queue to main exchange
    await channel.bindQueue(
      rabbitMQConfig.queues.transactionProcessing,
      rabbitMQConfig.exchanges.transactions,
      rabbitMQConfig.routingKeys.transactionCreated
    );

    // declare retry exchange
    await channel.assertExchange(
      rabbitMQConfig.exchanges.transactionsRetry,
      "topic",
      { durable: true }
    );

    await channel.assertQueue(rabbitMQConfig.queues.transactionRetry, {
      durable: true,
      arguments: {
        "x-message-ttl": 5000,
        "x-dead-letter-exchange": rabbitMQConfig.exchanges.transactions,
        "x-dead-letter-routing-key":
          rabbitMQConfig.routingKeys.transactionCreated,
      },
    });

    await channel.bindQueue(
      rabbitMQConfig.queues.transactionRetry,
      rabbitMQConfig.exchanges.transactionsRetry,
      "#"
    );

    console.log("✅ RabbitMQ exchanges and queues configured");
  }

  async publish(
    routingKey: string,
    data: any,
    correlationId: string
  ): Promise<void> {
    await this.waitUntilReady();

    const payload: MessagePayload = {
      data,
      correlationId,
      timestamp: new Date().toISOString(),
      retryCount: 0,
    };

    try {
      await this.channelWrapper.publish(
        rabbitMQConfig.exchanges.transactions,
        routingKey,
        Buffer.from(JSON.stringify(payload)),
        {
          persistent: true,
          correlationId,
          timestamp: Date.now(),
        }
      );

      console.log(
        `[${correlationId}] Published message to ${routingKey}`,
        data
      );
    } catch (error) {
      console.error(`[${correlationId}] Failed to publish message:`, error);
      throw error;
    }
  }

  async consume(
    queueName: string,
    handler: (message: MessagePayload) => Promise<void>
  ): Promise<void> {
    await this.waitUntilReady();

    await this.channelWrapper.addSetup(async (channel: ConfirmChannel) => {
      await channel.prefetch(10);

      await channel.consume(
        queueName,
        async (msg: ConsumeMessage | null) => {
          if (!msg) return;

          let payload: MessagePayload;
          try {
            payload = JSON.parse(msg.content.toString());
          } catch (parseErr) {
            console.error("❌ Invalid message format:", parseErr);
            channel.nack(msg, false, false); // discard malformed message
            return;
          }

          const { correlationId, retryCount = 0 } = payload;
          const routingKey = msg.fields.routingKey;

          console.log(
            `[${correlationId}] Received message (attempt #${retryCount + 1})`
          );

          try {
            await handler(payload);
            channel.ack(msg);
            console.log(`[${correlationId}] Message processed successfully`);
          } catch (error) {
            console.error(
              `[${correlationId}] Error processing message:`,
              error
            );

            if (retryCount < this.MAX_RETRY_COUNT) {
              const nextRetryCount = retryCount + 1;
              const nextPayload: MessagePayload = {
                ...payload,
                retryCount: nextRetryCount,
                timestamp: new Date().toISOString(),
              };

              console.warn(
                `[${correlationId}] Retrying (attempt ${nextRetryCount}) via retry exchange`
              );

              channel.publish(
                rabbitMQConfig.exchanges.transactionsRetry,
                routingKey,
                Buffer.from(JSON.stringify(nextPayload)),
                {
                  persistent: true,
                  correlationId,
                }
              );

              channel.ack(msg);
            } else {
              console.error(
                `[${correlationId}] Max retries exceeded, sending to DLQ`
              );
              channel.nack(msg, false, false);
            }
          }
        },
        { noAck: false }
      );

      console.log(`✅ Consumer registered for queue: ${queueName}`);
    });
  }

  private async disconnect() {
    try {
      await this.channelWrapper?.close();
      await this.connection?.close();
      console.log("✅ Disconnected from RabbitMQ");
    } catch (error) {
      console.error("❌ Error disconnecting from RabbitMQ:", error);
    }
  }
}
