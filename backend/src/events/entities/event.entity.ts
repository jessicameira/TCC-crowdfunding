import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { GeoPoint } from '../../artists/entities/geo-point';
import { EventStatus } from '../event-status.enum';

@Entity('events')
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  artistId: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'timestamptz' })
  eventDate: Date;

  @Column({ type: 'int' })
  capacity: number;

  @Column({ type: 'int' })
  minimumQuorum: number;

  @Column({ type: 'int', default: 0 })
  currentInterest: number;

  // Guardamos em centavos (inteiro) em vez de numeric/decimal pra evitar imprecisão de decimal
  //ja que o pg devolve numeric como string e o typeorm não converte para number, o deve ser informado pois
  // o fluxo de pagamento (que deve existir) funciona sem um valor pra cobrar.
  @Column({ type: 'int', default: 0 })
  priceCents: number;

  @Column({
    type: 'geography',
    spatialFeatureType: 'Point',
    srid: 4326,
  })
  location: GeoPoint;

  @Column({ type: 'varchar', length: 20, default: EventStatus.DRAFT })
  status: EventStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
