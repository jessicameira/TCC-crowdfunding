import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Job } from 'bullmq';
import { Repository } from 'typeorm';
import { EventInterest } from '../interests/entities/event-interest.entity';
import { QUEUE_NAMES } from '../queues/queue-names';
import {
  EventConfirmedJobData,
  PaymentProcessingJobData,
  SimulateGatewayApprovalJobData,
} from '../queues/queues.service';
import { PaymentsService } from './payments.service';
import { PaymentStatus } from './payment-status.enum';

@Processor(QUEUE_NAMES.PAYMENT_PROCESSING)
export class PaymentProcessingProcessor extends WorkerHost {
  private readonly logger = new Logger(PaymentProcessingProcessor.name);

  constructor(
    @InjectRepository(EventInterest)
    private readonly interestsRepository: Repository<EventInterest>,
    private readonly paymentsService: PaymentsService,
  ) {
    super();
  }

  async process(job: Job<PaymentProcessingJobData>): Promise<void> {
    switch (job.name) {
      case 'event-confirmed':
        return this.handleEventConfirmed(job.data as EventConfirmedJobData);
      case 'simulate-gateway-approval':
        return this.handleSimulateGatewayApproval(job.data as SimulateGatewayApprovalJobData);
      default:
        this.logger.warn(`Job desconhecido na fila payment-processing: ${job.name}`);
    }
  }

  private async handleEventConfirmed({ eventId }: EventConfirmedJobData): Promise<void> {
    this.logger.log(`Evento ${eventId} confirmado — criando processos de pagamento`);

    const interests = await this.interestsRepository.find({ where: { eventId } });

    await Promise.all(
      interests.map((interest) =>
        this.paymentsService.createPaymentForUser(eventId, interest.userId),
      ),
    );
  }

  private async handleSimulateGatewayApproval({
    externalId,
  }: SimulateGatewayApprovalJobData): Promise<void> {
    this.logger.log(`[gateway simulado] aprovando pagamento ${externalId}`);

    await this.paymentsService.processWebhookPayload({
      externalId,
      status: PaymentStatus.APPROVED,
    });
  }
}
