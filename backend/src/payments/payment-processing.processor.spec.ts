import { Job } from 'bullmq';
import { Repository } from 'typeorm';
import { PaymentProcessingProcessor } from './payment-processing.processor';
import { EventInterest } from '../interests/entities/event-interest.entity';
import { PaymentsService } from './payments.service';
import { PaymentStatus } from './payment-status.enum';
import { PaymentProcessingJobData } from '../queues/queues.service';

type MockRepository = {
  find: jest.Mock<Promise<EventInterest[]>, [{ where: { eventId: string } }]>;
};

type MockPaymentsService = {
  createPaymentForUser: jest.Mock<Promise<unknown>, [string, string]>;
  processWebhookPayload: jest.Mock<Promise<void>, [unknown]>;
};

function buildJob(name: string, data: PaymentProcessingJobData): Job<PaymentProcessingJobData> {
  return { name, data } as Job<PaymentProcessingJobData>;
}

describe('PaymentProcessingProcessor', () => {
  let processor: PaymentProcessingProcessor;
  let interestsRepository: MockRepository;
  let paymentsService: MockPaymentsService;

  beforeEach(() => {
    interestsRepository = {
      find: jest.fn<Promise<EventInterest[]>, [{ where: { eventId: string } }]>(),
    };
    paymentsService = {
      createPaymentForUser: jest.fn<Promise<unknown>, [string, string]>(),
      processWebhookPayload: jest.fn<Promise<void>, [unknown]>(),
    };

    processor = new PaymentProcessingProcessor(
      interestsRepository as unknown as Repository<EventInterest>,
      paymentsService as unknown as PaymentsService,
    );
  });

  it('creates a payment for every user interested in the confirmed event', async () => {
    interestsRepository.find.mockResolvedValue([
      { userId: 'user-1' } as EventInterest,
      { userId: 'user-2' } as EventInterest,
    ]);

    await processor.process(buildJob('event-confirmed', { eventId: 'event-1' }));

    expect(interestsRepository.find).toHaveBeenCalledWith({ where: { eventId: 'event-1' } });
    expect(paymentsService.createPaymentForUser).toHaveBeenCalledWith('event-1', 'user-1');
    expect(paymentsService.createPaymentForUser).toHaveBeenCalledWith('event-1', 'user-2');
  });

  it('simulates a gateway approval by feeding a webhook payload through the normal path', async () => {
    await processor.process(buildJob('simulate-gateway-approval', { externalId: 'sim_1' }));

    expect(paymentsService.processWebhookPayload).toHaveBeenCalledWith({
      externalId: 'sim_1',
      status: PaymentStatus.APPROVED,
    });
  });

  it('does nothing for an unknown job name', async () => {
    await processor.process(buildJob('unknown-job', { eventId: 'event-1' }));

    expect(paymentsService.createPaymentForUser).not.toHaveBeenCalled();
    expect(paymentsService.processWebhookPayload).not.toHaveBeenCalled();
  });
});
