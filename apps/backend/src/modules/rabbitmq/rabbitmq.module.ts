import { Module } from '@nestjs/common';
import { RabbitMQService } from './rabbitmq.service';
import { TransactionConsumer } from './transaction.consumer';
import { TransactionModule } from '../transaction/transaction.module';

@Module({
  imports: [TransactionModule],
  providers: [RabbitMQService, TransactionConsumer],
  exports: [RabbitMQService],
})
export class RabbitMQModule {}
