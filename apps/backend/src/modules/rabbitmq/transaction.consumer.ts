import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RabbitMQService, MessagePayload } from './rabbitmq.service';
import { rabbitMQConfig } from './rabbitmq.config';
import { TransactionService } from '../transaction/transaction.service';
import { TransactionStatus } from '../transaction/entities/transaction.entity';
import { ProcessedMessage } from '../transaction/entities/processed-message.entity';
import { createHash } from 'crypto';

@Injectable()
export class TransactionConsumer implements OnModuleInit {
  constructor(
    private readonly rabbitMQService: RabbitMQService,
    private readonly transactionService: TransactionService,
    @InjectRepository(ProcessedMessage)
    private readonly processedMessageRepository: Repository<ProcessedMessage>,
  ) {}

  async onModuleInit() {
    // start consuming messages from the transaction processing queue
    await this.rabbitMQService.consume(
      rabbitMQConfig.queues.transactionProcessing,
      this.handleTransactionMessage.bind(this),
    );
  }

  private async handleTransactionMessage(
    message: MessagePayload,
  ): Promise<void> {
    const { data, correlationId } = message;

    console.log(
      `[${correlationId}] Consumer received transaction message:`,
      data,
    );

    // generate message ID for idempotency check
    const messageId = this.generateMessageId(message);

    // check if message has already been processed (idempotency)
    const alreadyProcessed = await this.isMessageProcessed(messageId);
    if (alreadyProcessed) {
      console.log(
        `[${correlationId}] Message ${messageId} already processed, skipping`,
      );
      return;
    }

    // process the transaction
    try {
      const transaction = await this.transactionService.findById(
        data.id,
      );

      if (!transaction) {
        console.error(
          `[${correlationId}] Transaction ${data.id} not found`,
        );
        throw new Error(`Transaction ${data.id} not found`);
      }

      // simulate transaction processing logic
      console.log(
        `[${correlationId}] Processing transaction ${transaction.id}`,
      );

      // dummy business logic to set status. This would be replaced with real logic to capture payment, etc.
      const newStatus =
        Math.random() > 0.2
          ? TransactionStatus.COMPLETED
          : TransactionStatus.FAILED;

      await this.transactionService.updateStatus(transaction.id, newStatus);

      console.log(
        `[${correlationId}] Transaction ${transaction.id} updated to ${newStatus}`,
      );

      // mark message as processed for idempotency
      await this.markMessageAsProcessed(messageId, correlationId, message);

      console.log(
        `[${correlationId}] Transaction processing completed successfully`,
      );
    } catch (error) {
      console.error(
        `[${correlationId}] Error processing transaction:`,
        error,
      );
      throw error; // will trigger retry mechanism
    }
  }

  private generateMessageId(message: MessagePayload): string {
    // create a deterministic message ID based on message content
    // this ensures the same message always gets the same ID
    const { data } = message;
    const idempotencyKey = `${data.id}`;
    // generate SHA-256 hash of the idempotency key
    return createHash('sha256').update(idempotencyKey).digest('hex');
  }

  private async isMessageProcessed(messageId: string): Promise<boolean> {
    const processed = await this.processedMessageRepository.findOne({
      where: { messageId },
    });
    return !!processed;
  }

  private async markMessageAsProcessed(
    messageId: string,
    correlationId: string,
    message: MessagePayload,
  ): Promise<void> {
    const processedMessage = this.processedMessageRepository.create({
      messageId,
      correlationId,
      payload: message,
      status: 'processed',
    });
    await this.processedMessageRepository.save(processedMessage);
  }
}
