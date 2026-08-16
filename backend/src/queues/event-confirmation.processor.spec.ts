import { Job } from 'bullmq';
import { Repository } from 'typeorm';
import { EventConfirmationProcessor } from './event-confirmation.processor';
import { EventInterest } from '../interests/entities/event-interest.entity';
import { QueuesService, QuorumReachedJobData } from './queues.service';

type MockRepository = {
  find: jest.Mock<Promise<EventInterest[]>, [{ where: { eventId: string } }]>;
};

type MockQueuesService = {
  enqueueQuorumReachedNotification: jest.Mock<Promise<unknown>, [string, string]>;
};

function buildJob(eventId: string): Job<QuorumReachedJobData> {
  return { data: { eventId } } as Job<QuorumReachedJobData>;
}

describe('EventConfirmationProcessor', () => {
  let processor: EventConfirmationProcessor;
  let interestsRepository: MockRepository;
  let queuesService: MockQueuesService;

  beforeEach(() => {
    interestsRepository = {
      find: jest.fn<Promise<EventInterest[]>, [{ where: { eventId: string } }]>(),
    };
    queuesService = {
      enqueueQuorumReachedNotification: jest.fn<Promise<unknown>, [string, string]>(),
    };

    processor = new EventConfirmationProcessor(
      interestsRepository as unknown as Repository<EventInterest>,
      queuesService as unknown as QueuesService,
    );
  });

  it('enqueues a notification for every user interested in the event', async () => {
    interestsRepository.find.mockResolvedValue([
      { userId: 'user-1' } as EventInterest,
      { userId: 'user-2' } as EventInterest,
    ]);

    await processor.process(buildJob('event-1'));

    expect(interestsRepository.find).toHaveBeenCalledWith({ where: { eventId: 'event-1' } });
    expect(queuesService.enqueueQuorumReachedNotification).toHaveBeenCalledWith(
      'event-1',
      'user-1',
    );
    expect(queuesService.enqueueQuorumReachedNotification).toHaveBeenCalledWith(
      'event-1',
      'user-2',
    );
    expect(queuesService.enqueueQuorumReachedNotification).toHaveBeenCalledTimes(2);
  });

  it('does nothing when nobody manifested interest', async () => {
    interestsRepository.find.mockResolvedValue([]);

    await processor.process(buildJob('event-1'));

    expect(queuesService.enqueueQuorumReachedNotification).not.toHaveBeenCalled();
  });
});
