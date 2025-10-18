import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction, TransactionStatus } from './entities/transaction.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service';
import { rabbitMQConfig } from '../rabbitmq/rabbitmq.config';

@Injectable()
export class TransactionService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    private readonly rabbitMQService: RabbitMQService,
  ) {}

  async create(
    createTransactionDto: CreateTransactionDto,
    correlationId: string,
  ): Promise<Transaction> {
    const transaction = this.transactionRepository.create(createTransactionDto);
    const savedTransaction = await this.transactionRepository.save(transaction);

    // publish message to rabbitmq for processing
    await this.rabbitMQService.publish(
      rabbitMQConfig.routingKeys.transactionCreated,
      savedTransaction,
      correlationId,
    );

    return savedTransaction;
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
