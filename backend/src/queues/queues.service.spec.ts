import { Queue } from 'bullmq';
import {
  QueuesService,
  NotificationJobData,
  QuorumReachedJobData,
  PaymentProcessingJobData,
  SIMULATED_APPROVAL_DELAY_MS,
} from './queues.service';

type MockQueue<T> = {
  add: jest.Mock<Promise<unknown>, [string, T, unknown?]>;
};

describe('QueuesService', () => {
  let service: QueuesService;
  let eventConfirmationQueue: MockQueue<QuorumReachedJobData>;
  let notificationsQueue: MockQueue<NotificationJobData>;
  let paymentProcessingQueue: MockQueue<PaymentProcessingJobData>;

  beforeEach(() => {
    eventConfirmationQueue = {
      add: jest.fn<Promise<unknown>, [string, QuorumReachedJobData, unknown?]>(),
    };
    notificationsQueue = {
      add: jest.fn<Promise<unknown>, [string, NotificationJobData, unknown?]>(),
    };
    paymentProcessingQueue = {
      add: jest.fn<Promise<unknown>, [string, PaymentProcessingJobData, unknown?]>(),
    };

    service = new QueuesService(
      eventConfirmationQueue as unknown as Queue<QuorumReachedJobData>,
      notificationsQueue as unknown as Queue<NotificationJobData>,
      paymentProcessingQueue as unknown as Queue<PaymentProcessingJobData>,
    );
  });

  it('enqueues a quorum-reached job with the event id', async () => {
    await service.enqueueQuorumReached('event-1');

    expect(eventConfirmationQueue.add).toHaveBeenCalledWith('quorum-reached', {
      eventId: 'event-1',
    });
  });

  it('enqueues a notification job for a specific user and event', async () => {
    await service.enqueueQuorumReachedNotification('event-1', 'user-1');

    expect(notificationsQueue.add).toHaveBeenCalledWith(
      'quorum-reached-notification',
      expect.objectContaining({ eventId: 'event-1', userId: 'user-1' }),
    );
  });

  it('enqueues an event-confirmed job with the event id', async () => {
    await service.enqueueEventConfirmed('event-1');

    expect(paymentProcessingQueue.add).toHaveBeenCalledWith('event-confirmed', {
      eventId: 'event-1',
    });
  });

  it('enqueues a delayed simulate-gateway-approval job', async () => {
    await service.enqueueSimulatedGatewayApproval('sim_123');

    expect(paymentProcessingQueue.add).toHaveBeenCalledWith(
      'simulate-gateway-approval',
      { externalId: 'sim_123' },
      { delay: SIMULATED_APPROVAL_DELAY_MS },
    );
  });
});
