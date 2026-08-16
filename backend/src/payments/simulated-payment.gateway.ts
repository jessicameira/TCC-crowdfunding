import { randomUUID } from 'crypto';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  CreateGatewayPaymentInput,
  GatewayPaymentResult,
  GatewayWebhookEvent,
  PaymentGateway,
} from './payment-gateway.interface';
import { PaymentStatus } from './payment-status.enum';

// Criado um adapter simulado em vez de integrar de verdade com um gateway tipo Stripe/Mercado Pago
// Para não precisar de credenciais, não depender de rede externa e poder testar o fluxo completo

type SimulatedPaymentRecord = GatewayPaymentResult & { amountCents: number };

@Injectable()
export class SimulatedPaymentGateway implements PaymentGateway {
  private readonly payments = new Map<string, SimulatedPaymentRecord>();

  createPayment(input: CreateGatewayPaymentInput): Promise<GatewayPaymentResult> {
    const externalId = `sim_${randomUUID()}`;
    const record: SimulatedPaymentRecord = {
      externalId,
      status: PaymentStatus.PENDING,
      amountCents: input.amountCents,
    };
    this.payments.set(externalId, record);

    return Promise.resolve({ externalId, status: record.status });
  }

  // esse método não é `async`, então  um throw aqui rodaria síncrono na hora da chamada, antes de virar Promise
  // quebraria qualquer await/.catch()/expect(...).rejects de quem chamou.
  getPayment(externalId: string): Promise<GatewayPaymentResult> {
    const result = this.payments.get(externalId);

    if (!result) {
      return Promise.reject(new NotFoundException(`Pagamento ${externalId} não encontrado no gateway`));
    }

    return Promise.resolve({ externalId: result.externalId, status: result.status });
  }

  refundPayment(externalId: string): Promise<GatewayPaymentResult> {
    const existing = this.payments.get(externalId);

    if (!existing) {
      return Promise.reject(new NotFoundException(`Pagamento ${externalId} não encontrado no gateway`));
    }

    const record: SimulatedPaymentRecord = { ...existing, status: PaymentStatus.REFUNDED };
    this.payments.set(externalId, record);

    return Promise.resolve({ externalId, status: record.status });
  }

  handleWebhook(payload: unknown): GatewayWebhookEvent {
    if (
      typeof payload !== 'object' ||
      payload === null ||
      typeof (payload as Record<string, unknown>).externalId !== 'string' ||
      typeof (payload as Record<string, unknown>).status !== 'string'
    ) {
      throw new BadRequestException('Payload de webhook inválido');
    }

    const { externalId, status } = payload as { externalId: string; status: PaymentStatus };

    if (!Object.values(PaymentStatus).includes(status)) {
      throw new BadRequestException(`Status de pagamento inválido: ${status}`);
    }

    const existing = this.payments.get(externalId);
    const record: SimulatedPaymentRecord = { externalId, status, amountCents: existing?.amountCents ?? 0 };
    this.payments.set(externalId, record);

    return { externalId, status };
  }
}
