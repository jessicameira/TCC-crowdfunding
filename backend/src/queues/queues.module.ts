import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventInterest } from '../interests/entities/event-interest.entity';
import { QUEUE_NAMES } from './queue-names';
import { QueuesService } from './queues.service';
import { EventConfirmationProcessor } from './event-confirmation.processor';
import { NotificationsProcessor } from './notifications.processor';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('redis.host'),
          port: configService.get<number>('redis.port'),
          db: configService.get<number>('redis.db'),
        },
      }),
    }),
    // removeOnComplete/removeOnFail: sem isso o BullMQ deixa todo job concluído
    // acumulando no Redis pra sempre. Só uma limpeza básica pra fila que roda sem parar.
    BullModule.registerQueue(
      {
        name: QUEUE_NAMES.EVENT_CONFIRMATION,
        defaultJobOptions: { removeOnComplete: 100, removeOnFail: 100 },
      },
      {
        name: QUEUE_NAMES.NOTIFICATIONS,
        defaultJobOptions: { removeOnComplete: 100, removeOnFail: 100 },
      },
      {
        name: QUEUE_NAMES.PAYMENT_PROCESSING,
        defaultJobOptions: { removeOnComplete: 100, removeOnFail: 100 },
      },
    ),
    TypeOrmModule.forFeature([EventInterest]),
  ],
  providers: [QueuesService, EventConfirmationProcessor, NotificationsProcessor],
  exports: [QueuesService],
})
export class QueuesModule {}
