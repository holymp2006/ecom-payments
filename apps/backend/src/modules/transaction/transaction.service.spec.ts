import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransactionService } from './transaction.service';
import { Transaction, TransactionStatus } from './entities/transaction.entity';

describe('TransactionService', () => {
  let service: TransactionService;
  let repository: Repository<Transaction>;

  const mockTransaction: Transaction = {
    id: '123e4567-e89b-12d3-a456-426614174000',
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

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionService,
        {
          provide: getRepositoryToken(Transaction),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<TransactionService>(TransactionService);
    repository = module.get<Repository<Transaction>>(getRepositoryToken(Transaction));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create and save a transaction', async () => {
      const createDto = {
        amount: 100.50,
        currency: 'USD',
        merchantId: 'merchant123',
        customerId: 'customer456',
      };

      mockRepository.create.mockReturnValue(mockTransaction);
      mockRepository.save.mockResolvedValue(mockTransaction);

      const result = await service.create(createDto);

      expect(mockRepository.create).toHaveBeenCalledWith(createDto);
      expect(mockRepository.save).toHaveBeenCalledWith(mockTransaction);
      expect(result).toEqual(mockTransaction);
    });
  });

  describe('findAll', () => {
    it('should return an array of transactions', async () => {
      const transactions = [mockTransaction];
      mockRepository.find.mockResolvedValue(transactions);

      const result = await service.findAll();

      expect(mockRepository.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
        take: 100,
      });
      expect(result).toEqual(transactions);
    });
  });

  describe('findById', () => {
    it('should return a transaction by id', async () => {
      mockRepository.findOne.mockResolvedValue(mockTransaction);

      const result = await service.findById(mockTransaction.id);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockTransaction.id },
      });
      expect(result).toEqual(mockTransaction);
    });

    it('should return null if transaction not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.findById('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('findByMerchantId', () => {
    it('should return transactions for a merchant', async () => {
      const transactions = [mockTransaction];
      mockRepository.find.mockResolvedValue(transactions);

      const result = await service.findByMerchantId('merchant123');

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { merchantId: 'merchant123' },
        order: { createdAt: 'DESC' },
        take: 100,
      });
      expect(result).toEqual(transactions);
    });
  });

  describe('findByCustomerId', () => {
    it('should return transactions for a customer', async () => {
      const transactions = [mockTransaction];
      mockRepository.find.mockResolvedValue(transactions);

      const result = await service.findByCustomerId('customer456');

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { customerId: 'customer456' },
        order: { createdAt: 'DESC' },
        take: 100,
      });
      expect(result).toEqual(transactions);
    });
  });

  describe('findByStatus', () => {
    it('should return transactions by status', async () => {
      const transactions = [mockTransaction];
      mockRepository.find.mockResolvedValue(transactions);

      const result = await service.findByStatus(TransactionStatus.PENDING);

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { status: TransactionStatus.PENDING },
        order: { createdAt: 'DESC' },
        take: 100,
      });
      expect(result).toEqual(transactions);
    });
  });

  describe('updateStatus', () => {
    it('should update transaction status', async () => {
      const updatedTransaction = { ...mockTransaction, status: TransactionStatus.COMPLETED };
      mockRepository.findOne.mockResolvedValue(mockTransaction);
      mockRepository.save.mockResolvedValue(updatedTransaction);

      const result = await service.updateStatus(
        mockTransaction.id,
        TransactionStatus.COMPLETED,
      );

      expect(result?.status).toBe(TransactionStatus.COMPLETED);
      expect(mockRepository.save).toHaveBeenCalled();
    });
  });
});
