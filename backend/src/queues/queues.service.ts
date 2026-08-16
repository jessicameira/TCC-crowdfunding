import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from './queue-names';

export type QuorumReachedJobData = {
  eventId: string;
};

export type NotificationJobData = {
  userId: string;
  eventId: string;
  message: string;
};

export type EventConfirmedJobData = {
  eventId: string;
};

export type SimulateGatewayApprovalJobData = {
  externalId: string;
};

export type PaymentProcessingJobData = EventConfirmedJobData | SimulateGatewayApprovalJobData;

// Delay antes do "gateway simulado" aprovar o pagamento. Grande o suficiente pra dar
// pra ver que a aprovação é assíncrona (não rola na mesma requisição que cria o
// pagamento), mas pequeno pra não deixar demo/teste e2e lento.
export const SIMULATED_APPROVAL_DELAY_MS = 1500;

@Injectable()
export class QueuesService {
  constructor(
    @InjectQueue(QUEUE_NAMES.EVENT_CONFIRMATION)
    private readonly eventConfirmationQueue: Queue<QuorumReachedJobData>,
    @InjectQueue(QUEUE_NAMES.NOTIFICATIONS)
    private readonly notificationsQueue: Queue<NotificationJobData>,
    @InjectQueue(QUEUE_NAMES.PAYMENT_PROCESSING)
    private readonly paymentProcessingQueue: Queue<PaymentProcessingJobData>,
  ) {}

  enqueueQuorumReached(eventId: string) {
    return this.eventConfirmationQueue.add('quorum-reached', { eventId });
  }

  enqueueQuorumReachedNotification(eventId: string, userId: string) {
    return this.notificationsQueue.add('quorum-reached-notification', {
      userId,
      eventId,
      message: 'O evento que você se interessou atingiu o quórum mínimo!',
    });
  }

  enqueueEventConfirmed(eventId: string) {
    return this.paymentProcessingQueue.add('event-confirmed', { eventId });
  }

  enqueueSimulatedGatewayApproval(externalId: string) {
    return this.paymentProcessingQueue.add(
      'simulate-gateway-approval',
      { externalId },
      { delay: SIMULATED_APPROVAL_DELAY_MS },
    );
  }
}
