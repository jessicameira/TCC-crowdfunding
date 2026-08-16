import { PaymentStatus } from './payment-status.enum';

export type GatewayPaymentResult = {
  externalId: string;
  status: PaymentStatus;
};

export type CreateGatewayPaymentInput = {
  amountCents: number;
  metadata: {
    eventId: string;
    userId: string;
  };
};

export type GatewayWebhookEvent = {
  externalId: string;
  status: PaymentStatus;
};

export const PAYMENT_GATEWAY = 'PAYMENT_GATEWAY';

export interface PaymentGateway {
  createPayment(input: CreateGatewayPaymentInput): Promise<GatewayPaymentResult>;
  getPayment(externalId: string): Promise<GatewayPaymentResult>;
  refundPayment(externalId: string): Promise<GatewayPaymentResult>;
  handleWebhook(payload: unknown): GatewayWebhookEvent;
}
