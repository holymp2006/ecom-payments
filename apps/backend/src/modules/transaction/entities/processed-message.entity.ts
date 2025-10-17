import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('processed_messages')
export class ProcessedMessage {
  @PrimaryColumn()
  messageId: string;

  @Column()
  @Index()
  correlationId: string;

  @Column({ type: 'jsonb' })
  payload: any;

  @Column({ default: 'processed' })
  status: string;

  @CreateDateColumn()
  @Index()
  processedAt: Date;
}
