import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { Payment } from './entities/payment.entity';
import { EventInterest } from '../interests/entities/event-interest.entity';
import { EventsModule } from '../events/events.module';
import { QueuesModule } from '../queues/queues.module';
import { TicketsModule } from '../tickets/tickets.module';
import { QUEUE_NAMES } from '../queues/queue-names';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PaymentProcessingProcessor } from './payment-processing.processor';
import { PAYMENT_GATEWAY } from './payment-gateway.interface';
import { SimulatedPaymentGateway } from './simulated-payment.gateway';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, EventInterest]),
    EventsModule,
    QueuesModule,
    TicketsModule,
    BullModule.registerQueue({ name: QUEUE_NAMES.PAYMENT_PROCESSING }),
  ],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    PaymentProcessingProcessor,
    { provide: PAYMENT_GATEWAY, useClass: SimulatedPaymentGateway },
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
