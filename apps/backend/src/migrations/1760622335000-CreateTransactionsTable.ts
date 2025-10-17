import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateTransactionsTable1760622335000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // create transactions table
    await queryRunner.createTable(
      new Table({
        name: 'transactions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'amount',
            type: 'decimal',
            precision: 19,
            scale: 4,
          },
          {
            name: 'currency',
            type: 'varchar',
            length: '3',
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['PENDING', 'COMPLETED', 'FAILED'],
            default: "'PENDING'",
          },
          {
            name: 'merchantId',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'customerId',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    // create indexes for optimized queries
    await queryRunner.createIndex(
      'transactions',
      new TableIndex({
        name: 'IDX_TRANSACTIONS_STATUS',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'transactions',
      new TableIndex({
        name: 'IDX_TRANSACTIONS_MERCHANT_ID',
        columnNames: ['merchantId'],
      }),
    );

    await queryRunner.createIndex(
      'transactions',
      new TableIndex({
        name: 'IDX_TRANSACTIONS_CUSTOMER_ID',
        columnNames: ['customerId'],
      }),
    );

    await queryRunner.createIndex(
      'transactions',
      new TableIndex({
        name: 'IDX_TRANSACTIONS_CREATED_AT',
        columnNames: ['createdAt'],
      }),
    );

    // composite indexes for common query patterns
    await queryRunner.createIndex(
      'transactions',
      new TableIndex({
        name: 'IDX_TRANSACTIONS_MERCHANT_CREATED',
        columnNames: ['merchantId', 'createdAt'],
      }),
    );

    await queryRunner.createIndex(
      'transactions',
      new TableIndex({
        name: 'IDX_TRANSACTIONS_CUSTOMER_CREATED',
        columnNames: ['customerId', 'createdAt'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // drop indexes
    await queryRunner.dropIndex(
      'transactions',
      'IDX_TRANSACTIONS_CUSTOMER_CREATED',
    );
    await queryRunner.dropIndex(
      'transactions',
      'IDX_TRANSACTIONS_MERCHANT_CREATED',
    );
    await queryRunner.dropIndex('transactions', 'IDX_TRANSACTIONS_CREATED_AT');
    await queryRunner.dropIndex('transactions', 'IDX_TRANSACTIONS_CUSTOMER_ID');
    await queryRunner.dropIndex('transactions', 'IDX_TRANSACTIONS_MERCHANT_ID');
    await queryRunner.dropIndex('transactions', 'IDX_TRANSACTIONS_STATUS');

    // drop table
    await queryRunner.dropTable('transactions');
  }
}
