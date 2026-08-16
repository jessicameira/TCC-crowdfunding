import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { TicketStatus } from '../ticket-status.enum';

@Entity('tickets')
@Unique(['paymentId'])
export class Ticket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  eventId: string;

  @Column()
  userId: string;

  @Column()
  paymentId: string;

  @Column({ type: 'varchar', length: 20, default: TicketStatus.VALID })
  status: TicketStatus;

  @CreateDateColumn()
  createdAt: Date;
}
