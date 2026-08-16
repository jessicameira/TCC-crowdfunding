import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from './entities/payment.entity';
import { PaymentStatus } from './payment-status.enum';
import { PAYMENT_GATEWAY, PaymentGateway } from './payment-gateway.interface';
import { EventsService } from '../events/events.service';
import { QueuesService } from '../queues/queues.service';
import { TicketsService } from '../tickets/tickets.service';

const POSTGRES_UNIQUE_VIOLATION = '23505';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentsRepository: Repository<Payment>,
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: PaymentGateway,
    private readonly eventsService: EventsService,
    private readonly queuesService: QueuesService,
    private readonly ticketsService: TicketsService,
  ) {}

  // Preço sempre vem do evento, nunca é informado por quem chama.
  async createPaymentForUser(eventId: string, userId: string): Promise<Payment | null> {
    const event = await this.eventsService.findById(eventId);

    const gatewayResult = await this.paymentGateway.createPayment({
      amountCents: event.priceCents,
      metadata: { eventId, userId },
    });

    const payment = this.paymentsRepository.create({
      eventId,
      userId,
      amountCents: event.priceCents,
      status: gatewayResult.status,
      externalId: gatewayResult.externalId,
    });

    let saved: Payment;
    try {
      saved = await this.paymentsRepository.save(payment);
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        return null;
      }
      throw error;
    }

    // Dispara a aprovação assíncrona simulada. Um gateway de verdade mandaria isso via
    // webhook HTTP depois de processar; aqui a gente simula com um job atrasado.
    await this.queuesService.enqueueSimulatedGatewayApproval(gatewayResult.externalId);

    return saved;
  }

  async findById(id: string): Promise<Payment> {
    const payment = await this.paymentsRepository.findOne({ where: { id } });

    if (!payment) {
      throw new NotFoundException('Pagamento não encontrado');
    }

    return payment;
  }

  // Esse método é usado tanto pelo POST /payments/webhook de verdade quanto pelo job
  // que simula o gateway aprovando — os dois passam pelo mesmo caminho de código.
  async processWebhookPayload(payload: unknown): Promise<void> {
    const webhookEvent = this.paymentGateway.handleWebhook(payload);

    const payment = await this.paymentsRepository.findOne({
      where: { externalId: webhookEvent.externalId },
    });

    if (!payment) {
      throw new NotFoundException(
        `Pagamento com externalId ${webhookEvent.externalId} não encontrado`,
      );
    }

    payment.status = webhookEvent.status;
    await this.paymentsRepository.save(payment);

    if (webhookEvent.status === PaymentStatus.APPROVED) {
      await this.ticketsService.createForPayment({
        eventId: payment.eventId,
        userId: payment.userId,
        paymentId: payment.id,
      });
    }
  }

  async refund(id: string): Promise<Payment> {
    const payment = await this.findById(id);

    if (payment.status !== PaymentStatus.APPROVED) {
      throw new ConflictException('Só é possível reembolsar pagamentos aprovados');
    }

    const result = await this.paymentGateway.refundPayment(payment.externalId);
    payment.status = result.status;

    return this.paymentsRepository.save(payment);
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === POSTGRES_UNIQUE_VIOLATION
    );
  }
}
