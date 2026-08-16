import { ConflictException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { PaymentsService } from './payments.service';
import { Payment } from './entities/payment.entity';
import { PaymentStatus } from './payment-status.enum';
import { GatewayPaymentResult } from './payment-gateway.interface';
import { EventsService } from '../events/events.service';
import { QueuesService } from '../queues/queues.service';
import { TicketsService } from '../tickets/tickets.service';
import { Event } from '../events/entities/event.entity';

type MockRepository = {
  create: jest.Mock<Partial<Payment>, [Partial<Payment>]>;
  save: jest.Mock<Promise<Payment>, [Partial<Payment>]>;
  findOne: jest.Mock<Promise<Payment | null>, [unknown]>;
};

type MockGateway = {
  createPayment: jest.Mock<Promise<GatewayPaymentResult>, [unknown]>;
  getPayment: jest.Mock<Promise<GatewayPaymentResult>, [string]>;
  refundPayment: jest.Mock<Promise<GatewayPaymentResult>, [string]>;
  handleWebhook: jest.Mock<{ externalId: string; status: PaymentStatus }, [unknown]>;
};

type MockEventsService = {
  findById: jest.Mock<Promise<Event>, [string]>;
};

type MockQueuesService = {
  enqueueSimulatedGatewayApproval: jest.Mock<Promise<unknown>, [string]>;
};

type MockTicketsService = {
  createForPayment: jest.Mock<Promise<unknown>, [unknown]>;
};

function buildPayment(overrides: Partial<Payment> = {}): Payment {
  return {
    id: 'payment-1',
    eventId: 'event-1',
    userId: 'user-1',
    amountCents: 5000,
    status: PaymentStatus.PENDING,
    externalId: 'sim_1',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('PaymentsService', () => {
  let service: PaymentsService;
  let repository: MockRepository;
  let gateway: MockGateway;
  let eventsService: MockEventsService;
  let queuesService: MockQueuesService;
  let ticketsService: MockTicketsService;

  beforeEach(() => {
    repository = {
      create: jest.fn<Partial<Payment>, [Partial<Payment>]>(),
      save: jest.fn<Promise<Payment>, [Partial<Payment>]>(),
      findOne: jest.fn<Promise<Payment | null>, [unknown]>(),
    };
    gateway = {
      createPayment: jest.fn<Promise<GatewayPaymentResult>, [unknown]>(),
      getPayment: jest.fn<Promise<GatewayPaymentResult>, [string]>(),
      refundPayment: jest.fn<Promise<GatewayPaymentResult>, [string]>(),
      handleWebhook: jest.fn<{ externalId: string; status: PaymentStatus }, [unknown]>(),
    };
    eventsService = {
      findById: jest.fn<Promise<Event>, [string]>(),
    };
    queuesService = {
      enqueueSimulatedGatewayApproval: jest
        .fn<Promise<unknown>, [string]>()
        .mockResolvedValue(undefined),
    };
    ticketsService = {
      createForPayment: jest.fn<Promise<unknown>, [unknown]>(),
    };

    service = new PaymentsService(
      repository as unknown as Repository<Payment>,
      gateway,
      eventsService as unknown as EventsService,
      queuesService as unknown as QueuesService,
      ticketsService as unknown as TicketsService,
    );
  });

  describe('createPaymentForUser', () => {
    it('creates a payment priced from the event and schedules the simulated approval', async () => {
      eventsService.findById.mockResolvedValue({ id: 'event-1', priceCents: 5000 } as Event);
      gateway.createPayment.mockResolvedValue({ externalId: 'sim_1', status: PaymentStatus.PENDING });
      repository.create.mockImplementation((input) => input);
      repository.save.mockImplementation((input) =>
        Promise.resolve({ id: 'payment-1', ...input } as Payment),
      );

      const result = await service.createPaymentForUser('event-1', 'user-1');

      expect(gateway.createPayment).toHaveBeenCalledWith({
        amountCents: 5000,
        metadata: { eventId: 'event-1', userId: 'user-1' },
      });
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          eventId: 'event-1',
          userId: 'user-1',
          amountCents: 5000,
          externalId: 'sim_1',
          status: PaymentStatus.PENDING,
        }),
      );
      expect(queuesService.enqueueSimulatedGatewayApproval).toHaveBeenCalledWith('sim_1');
      expect(result?.id).toBe('payment-1');
    });

    it('returns null instead of throwing when the payment already exists for that event/user', async () => {
      eventsService.findById.mockResolvedValue({ id: 'event-1', priceCents: 5000 } as Event);
      gateway.createPayment.mockResolvedValue({ externalId: 'sim_1', status: PaymentStatus.PENDING });
      repository.create.mockImplementation((input) => input);
      repository.save.mockRejectedValue({ code: '23505' });

      const result = await service.createPaymentForUser('event-1', 'user-1');

      expect(result).toBeNull();
      expect(queuesService.enqueueSimulatedGatewayApproval).not.toHaveBeenCalled();
    });
  });

  describe('processWebhookPayload', () => {
    it('updates the payment status and creates a ticket when approved', async () => {
      gateway.handleWebhook.mockReturnValue({ externalId: 'sim_1', status: PaymentStatus.APPROVED });
      const payment = buildPayment();
      repository.findOne.mockResolvedValue(payment);
      repository.save.mockImplementation((input) => Promise.resolve(input as Payment));

      await service.processWebhookPayload({ externalId: 'sim_1', status: PaymentStatus.APPROVED });

      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: PaymentStatus.APPROVED }),
      );
      expect(ticketsService.createForPayment).toHaveBeenCalledWith({
        eventId: payment.eventId,
        userId: payment.userId,
        paymentId: payment.id,
      });
    });

    it('does not create a ticket when the payment is rejected', async () => {
      gateway.handleWebhook.mockReturnValue({ externalId: 'sim_1', status: PaymentStatus.REJECTED });
      repository.findOne.mockResolvedValue(buildPayment());
      repository.save.mockImplementation((input) => Promise.resolve(input as Payment));

      await service.processWebhookPayload({ externalId: 'sim_1', status: PaymentStatus.REJECTED });

      expect(ticketsService.createForPayment).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when no payment matches the externalId', async () => {
      gateway.handleWebhook.mockReturnValue({ externalId: 'sim_missing', status: PaymentStatus.APPROVED });
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.processWebhookPayload({ externalId: 'sim_missing', status: PaymentStatus.APPROVED }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('refund', () => {
    it('refunds an approved payment', async () => {
      const payment = buildPayment({ status: PaymentStatus.APPROVED });
      repository.findOne.mockResolvedValue(payment);
      gateway.refundPayment.mockResolvedValue({ externalId: 'sim_1', status: PaymentStatus.REFUNDED });
      repository.save.mockImplementation((input) => Promise.resolve(input as Payment));

      const result = await service.refund('payment-1');

      expect(gateway.refundPayment).toHaveBeenCalledWith('sim_1');
      expect(result.status).toBe(PaymentStatus.REFUNDED);
    });

    it('rejects refunding a payment that is not APPROVED', async () => {
      repository.findOne.mockResolvedValue(buildPayment({ status: PaymentStatus.PENDING }));

      await expect(service.refund('payment-1')).rejects.toBeInstanceOf(ConflictException);
      expect(gateway.refundPayment).not.toHaveBeenCalled();
    });
  });
});
