import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionController } from './transaction.controller';
import { TransactionService } from './transaction.service';
import { Transaction } from './entities/transaction.entity';
import { ProcessedMessage } from './entities/processed-message.entity';
import { RabbitMQModule } from '../rabbitmq/rabbitmq.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Transaction, ProcessedMessage]),
    forwardRef(() => RabbitMQModule),
  ],
  controllers: [TransactionController],
  providers: [TransactionService],
  exports: [TransactionService, TypeOrmModule],
})
export class TransactionModule {}
