import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransactionConsumer } from './transaction.consumer';
import { RabbitMQService, MessagePayload } from './rabbitmq.service';
import { TransactionService } from '../transaction/transaction.service';
import { ProcessedMessage } from '../transaction/entities/processed-message.entity';
import { Transaction, TransactionStatus } from '../transaction/entities/transaction.entity';

describe('TransactionConsumer', () => {
  let consumer: TransactionConsumer;
  let transactionService: TransactionService;
  let processedMessageRepository: Repository<ProcessedMessage>;
  let rabbitMQService: RabbitMQService;

  const mockTransaction: Transaction = {
    id: 'transaction-123',
    amount: 100.50,
    currency: 'USD',
    status: TransactionStatus.PENDING,
    merchantId: 'merchant123',
    customerId: 'customer456',
    description: 'test transaction',
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockMessagePayload: MessagePayload = {
    data: { transactionId: 'transaction-123' },
    correlationId: 'correlation-123',
    timestamp: new Date().toISOString(),
    retryCount: 0,
  };

  const mockRabbitMQService = {
    consume: jest.fn(),
  };

  const mockTransactionService = {
    findById: jest.fn(),
    updateStatus: jest.fn(),
  };

  const mockProcessedMessageRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionConsumer,
        {
          provide: RabbitMQService,
          useValue: mockRabbitMQService,
        },
        {
          provide: TransactionService,
          useValue: mockTransactionService,
        },
        {
          provide: getRepositoryToken(ProcessedMessage),
          useValue: mockProcessedMessageRepository,
        },
      ],
    }).compile();

    consumer = module.get<TransactionConsumer>(TransactionConsumer);
    transactionService = module.get<TransactionService>(TransactionService);
    processedMessageRepository = module.get<Repository<ProcessedMessage>>(
      getRepositoryToken(ProcessedMessage),
    );
    rabbitMQService = module.get<RabbitMQService>(RabbitMQService);

    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(consumer).toBeDefined();
  });

  describe('idempotent processing', () => {
    it('should skip already processed messages', async () => {
      // mock that message has already been processed
      mockProcessedMessageRepository.findOne.mockResolvedValue({
        messageId: 'message-123',
        correlationId: 'correlation-123',
      });

      await consumer['handleTransactionMessage'](mockMessagePayload);

      // transaction service should not be called
      expect(transactionService.findById).not.toHaveBeenCalled();
      expect(transactionService.updateStatus).not.toHaveBeenCalled();
    });

    it('should process new messages', async () => {
      // mock that message has not been processed
      mockProcessedMessageRepository.findOne.mockResolvedValue(null);
      mockTransactionService.findById.mockResolvedValue(mockTransaction);
      mockTransactionService.updateStatus.mockResolvedValue({
        ...mockTransaction,
        status: TransactionStatus.COMPLETED,
      });
      mockProcessedMessageRepository.create.mockReturnValue({});
      mockProcessedMessageRepository.save.mockResolvedValue({});

      await consumer['handleTransactionMessage'](mockMessagePayload);

      // transaction should be processed
      expect(transactionService.findById).toHaveBeenCalledWith('transaction-123');
      expect(transactionService.updateStatus).toHaveBeenCalled();
      expect(processedMessageRepository.save).toHaveBeenCalled();
    });

    it('should mark message as processed after successful processing', async () => {
      mockProcessedMessageRepository.findOne.mockResolvedValue(null);
      mockTransactionService.findById.mockResolvedValue(mockTransaction);
      mockTransactionService.updateStatus.mockResolvedValue(mockTransaction);
      mockProcessedMessageRepository.create.mockReturnValue({});
      mockProcessedMessageRepository.save.mockResolvedValue({});

      await consumer['handleTransactionMessage'](mockMessagePayload);

      expect(processedMessageRepository.save).toHaveBeenCalled();
    });

    it('should throw error if transaction not found', async () => {
      mockProcessedMessageRepository.findOne.mockResolvedValue(null);
      mockTransactionService.findById.mockResolvedValue(null);

      await expect(
        consumer['handleTransactionMessage'](mockMessagePayload),
      ).rejects.toThrow('Transaction transaction-123 not found');
    });

    it('should not mark as processed if processing fails', async () => {
      mockProcessedMessageRepository.findOne.mockResolvedValue(null);
      mockTransactionService.findById.mockRejectedValue(
        new Error('database error'),
      );

      await expect(
        consumer['handleTransactionMessage'](mockMessagePayload),
      ).rejects.toThrow('database error');

      expect(processedMessageRepository.save).not.toHaveBeenCalled();
    });
  });
});
