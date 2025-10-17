import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateProcessedMessagesTable1760622635000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'processed_messages',
        columns: [
          {
            name: 'messageId',
            type: 'varchar',
            length: '255',
            isPrimary: true,
          },
          {
            name: 'correlationId',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'payload',
            type: 'jsonb',
          },
          {
            name: 'status',
            type: 'varchar',
            length: '50',
            default: "'processed'",
          },
          {
            name: 'processedAt',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'processed_messages',
      new TableIndex({
        name: 'IDX_PROCESSED_MESSAGES_CORRELATION_ID',
        columnNames: ['correlationId'],
      }),
    );

    await queryRunner.createIndex(
      'processed_messages',
      new TableIndex({
        name: 'IDX_PROCESSED_MESSAGES_PROCESSED_AT',
        columnNames: ['processedAt'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex(
      'processed_messages',
      'IDX_PROCESSED_MESSAGES_PROCESSED_AT',
    );
    await queryRunner.dropIndex(
      'processed_messages',
      'IDX_PROCESSED_MESSAGES_CORRELATION_ID',
    );
    await queryRunner.dropTable('processed_messages');
  }
}
