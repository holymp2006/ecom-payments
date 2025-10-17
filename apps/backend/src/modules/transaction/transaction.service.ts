import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction, TransactionStatus } from './entities/transaction.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';

@Injectable()
export class TransactionService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
  ) {}

  async create(createTransactionDto: CreateTransactionDto): Promise<Transaction> {
    const transaction = this.transactionRepository.create(createTransactionDto);
    return await this.transactionRepository.save(transaction);
  }

  async findAll(limit: number = 100): Promise<Transaction[]> {
    return await this.transactionRepository.find({
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async findById(id: string): Promise<Transaction | null> {
    return await this.transactionRepository.findOne({ where: { id } });
  }

  async findByMerchantId(
    merchantId: string,
    limit: number = 100,
  ): Promise<Transaction[]> {
    return await this.transactionRepository.find({
      where: { merchantId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async findByCustomerId(
    customerId: string,
    limit: number = 100,
  ): Promise<Transaction[]> {
    return await this.transactionRepository.find({
      where: { customerId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async findByStatus(
    status: TransactionStatus,
    limit: number = 100,
  ): Promise<Transaction[]> {
    return await this.transactionRepository.find({
      where: { status },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async updateStatus(
    id: string,
    status: TransactionStatus,
  ): Promise<Transaction | null> {
    const transaction = await this.findById(id);
    if (!transaction) {
      return null;
    }
    transaction.status = status;
    return await this.transactionRepository.save(transaction);
  }
}
