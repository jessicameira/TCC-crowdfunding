import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SimulatedPaymentGateway } from './simulated-payment.gateway';
import { PaymentStatus } from './payment-status.enum';

describe('SimulatedPaymentGateway', () => {
  let gateway: SimulatedPaymentGateway;

  beforeEach(() => {
    gateway = new SimulatedPaymentGateway();
  });

  it('creates a payment starting as PENDING with a unique externalId', async () => {
    const result = await gateway.createPayment({
      amountCents: 5000,
      metadata: { eventId: 'event-1', userId: 'user-1' },
    });

    expect(result.status).toBe(PaymentStatus.PENDING);
    expect(result.externalId).toMatch(/^sim_/);
  });

  it('getPayment returns the same state createPayment produced', async () => {
    const created = await gateway.createPayment({
      amountCents: 5000,
      metadata: { eventId: 'event-1', userId: 'user-1' },
    });

    const result = await gateway.getPayment(created.externalId);

    expect(result).toEqual({ externalId: created.externalId, status: PaymentStatus.PENDING });
  });

  it('getPayment throws NotFoundException for an unknown externalId', async () => {
    await expect(gateway.getPayment('sim_unknown')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('handleWebhook updates the gateway state and returns the normalized event', async () => {
    const created = await gateway.createPayment({
      amountCents: 5000,
      metadata: { eventId: 'event-1', userId: 'user-1' },
    });

    const event = gateway.handleWebhook({
      externalId: created.externalId,
      status: PaymentStatus.APPROVED,
    });

    expect(event).toEqual({ externalId: created.externalId, status: PaymentStatus.APPROVED });

    const result = await gateway.getPayment(created.externalId);
    expect(result.status).toBe(PaymentStatus.APPROVED);
  });

  it('handleWebhook rejects a malformed payload', () => {
    expect(() => gateway.handleWebhook({ foo: 'bar' })).toThrow(BadRequestException);
    expect(() => gateway.handleWebhook(null)).toThrow(BadRequestException);
    expect(() => gateway.handleWebhook('not an object')).toThrow(BadRequestException);
  });

  it('handleWebhook rejects an invalid status value', () => {
    expect(() => gateway.handleWebhook({ externalId: 'sim_1', status: 'NOT_A_STATUS' })).toThrow(
      BadRequestException,
    );
  });

  it('refundPayment transitions an existing payment to REFUNDED', async () => {
    const created = await gateway.createPayment({
      amountCents: 5000,
      metadata: { eventId: 'event-1', userId: 'user-1' },
    });

    const result = await gateway.refundPayment(created.externalId);

    expect(result).toEqual({ externalId: created.externalId, status: PaymentStatus.REFUNDED });
  });

  it('refundPayment throws NotFoundException for an unknown externalId', async () => {
    await expect(gateway.refundPayment('sim_unknown')).rejects.toBeInstanceOf(NotFoundException);
  });
});
