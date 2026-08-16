import { ConflictException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { InterestsService } from './interests.service';
import { EventsService } from '../events/events.service';
import { EventStatus } from '../events/event-status.enum';
import { Event } from '../events/entities/event.entity';
import { EventInterest } from './entities/event-interest.entity';
import { QueuesService } from '../queues/queues.service';

type MockManager = {
  insert: jest.Mock<Promise<unknown>, [unknown, Partial<EventInterest>]>;
  delete: jest.Mock<Promise<{ affected: number | null }>, [unknown, Partial<EventInterest>]>;
  query: jest.Mock<Promise<unknown>, [string, unknown[]?]>;
};

type MockDataSource = {
  transaction: jest.Mock<Promise<unknown>, [(manager: MockManager) => Promise<unknown>]>;
};

type MockEventsService = {
  findById: jest.Mock<Promise<Event>, [string]>;
};

type MockStateMachine = {
  assertTransition: jest.Mock<void, [EventStatus, EventStatus]>;
};

type MockQueuesService = {
  enqueueQuorumReached: jest.Mock<Promise<unknown>, [string]>;
};

function buildEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: 'event-1',
    status: EventStatus.OPEN,
    capacity: 100,
    minimumQuorum: 50,
    currentInterest: 10,
    ...overrides,
  } as Event;
}

describe('InterestsService', () => {
  let service: InterestsService;
  let manager: MockManager;
  let dataSource: MockDataSource;
  let eventsService: MockEventsService;
  let stateMachine: MockStateMachine;
  let queuesService: MockQueuesService;

  beforeEach(() => {
    manager = {
      insert: jest.fn<Promise<unknown>, [unknown, Partial<EventInterest>]>(),
      delete: jest.fn<Promise<{ affected: number | null }>, [unknown, Partial<EventInterest>]>(),
      query: jest.fn<Promise<unknown>, [string, unknown[]?]>(),
    };
    dataSource = {
      transaction: jest.fn((callback: (manager: MockManager) => Promise<unknown>) =>
        callback(manager),
      ),
    };
    eventsService = {
      findById: jest.fn<Promise<Event>, [string]>(),
    };
    stateMachine = {
      assertTransition: jest.fn<void, [EventStatus, EventStatus]>(),
    };
    queuesService = {
      enqueueQuorumReached: jest.fn<Promise<unknown>, [string]>().mockResolvedValue(undefined),
    };

    service = new InterestsService(
      dataSource as unknown as DataSource,
      eventsService as unknown as EventsService,
      stateMachine,
      queuesService as unknown as QueuesService,
    );
  });

  describe('manifestInterest', () => {
    it('propagates NotFoundException when the event does not exist', async () => {
      eventsService.findById.mockRejectedValue(new NotFoundException('Evento não encontrado'));

      await expect(service.manifestInterest('event-1', 'user-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it.each([EventStatus.DRAFT, EventStatus.CONFIRMED, EventStatus.CANCELLED, EventStatus.SOLD_OUT, EventStatus.COMPLETED])(
      'rejects when the event status is %s',
      async (status) => {
        eventsService.findById.mockResolvedValue(buildEvent({ status }));

        await expect(service.manifestInterest('event-1', 'user-1')).rejects.toBeInstanceOf(
          ConflictException,
        );
        expect(dataSource.transaction).not.toHaveBeenCalled();
      },
    );

    it('rejects when the user already manifested interest', async () => {
      eventsService.findById.mockResolvedValue(buildEvent());
      manager.insert.mockRejectedValue({ code: '23505' });

      await expect(service.manifestInterest('event-1', 'user-1')).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('rejects when capacity is full (atomic update affects zero rows)', async () => {
      eventsService.findById.mockResolvedValue(buildEvent());
      manager.insert.mockResolvedValue(undefined);
      // Lembrando: EntityManager.query() em UPDATE/DELETE sempre devolve [rows, rowCount],
      // mesmo com RETURNING (mesma pegadinha do interests.service.ts).
      manager.query.mockResolvedValue([[], 0]);

      await expect(service.manifestInterest('event-1', 'user-1')).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('increments interest without transitioning state when quorum is not reached', async () => {
      eventsService.findById
        .mockResolvedValueOnce(buildEvent({ currentInterest: 10 }))
        .mockResolvedValueOnce(buildEvent({ currentInterest: 11 }));
      manager.insert.mockResolvedValue(undefined);
      manager.query.mockResolvedValue([
        [{ currentInterest: 11, minimumQuorum: 50, status: EventStatus.OPEN }],
        1,
      ]);

      await service.manifestInterest('event-1', 'user-1');

      expect(stateMachine.assertTransition).not.toHaveBeenCalled();
      expect(queuesService.enqueueQuorumReached).not.toHaveBeenCalled();
    });

    it('transitions OPEN -> QUORUM_REACHED when the quorum is reached', async () => {
      eventsService.findById
        .mockResolvedValueOnce(buildEvent({ currentInterest: 49 }))
        .mockResolvedValueOnce(buildEvent({ currentInterest: 50, status: EventStatus.QUORUM_REACHED }));
      manager.insert.mockResolvedValue(undefined);
      manager.query
        .mockResolvedValueOnce([
          [{ currentInterest: 50, minimumQuorum: 50, status: EventStatus.OPEN }],
          1,
        ])
        .mockResolvedValueOnce([[], 1]);

      await service.manifestInterest('event-1', 'user-1');

      expect(stateMachine.assertTransition).toHaveBeenCalledWith(
        EventStatus.OPEN,
        EventStatus.QUORUM_REACHED,
      );
      expect(manager.query).toHaveBeenCalledTimes(2);
      expect(queuesService.enqueueQuorumReached).toHaveBeenCalledWith('event-1');
    });

    it('does not re-trigger the transition when the event is already QUORUM_REACHED', async () => {
      eventsService.findById.mockResolvedValue(
        buildEvent({ currentInterest: 60, status: EventStatus.QUORUM_REACHED }),
      );
      manager.insert.mockResolvedValue(undefined);
      manager.query.mockResolvedValue([
        [{ currentInterest: 61, minimumQuorum: 50, status: EventStatus.QUORUM_REACHED }],
        1,
      ]);

      await service.manifestInterest('event-1', 'user-1');

      expect(stateMachine.assertTransition).not.toHaveBeenCalled();
      expect(manager.query).toHaveBeenCalledTimes(1);
      expect(queuesService.enqueueQuorumReached).not.toHaveBeenCalled();
    });
  });

  describe('withdrawInterest', () => {
    it('propagates NotFoundException when the event does not exist', async () => {
      eventsService.findById.mockRejectedValue(new NotFoundException('Evento não encontrado'));

      await expect(service.withdrawInterest('event-1', 'user-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('rejects when the event is not open or quorum-reached', async () => {
      eventsService.findById.mockResolvedValue(buildEvent({ status: EventStatus.CONFIRMED }));

      await expect(service.withdrawInterest('event-1', 'user-1')).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('throws NotFoundException when there is no interest to remove', async () => {
      eventsService.findById.mockResolvedValue(buildEvent());
      manager.delete.mockResolvedValue({ affected: 0 });

      await expect(service.withdrawInterest('event-1', 'user-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(manager.query).not.toHaveBeenCalled();
    });

    it('decrements the counter when the interest is removed', async () => {
      eventsService.findById.mockResolvedValue(buildEvent());
      manager.delete.mockResolvedValue({ affected: 1 });
      manager.query.mockResolvedValue(undefined);

      await service.withdrawInterest('event-1', 'user-1');

      expect(manager.query).toHaveBeenCalledWith(expect.stringContaining('currentInterest'), [
        'event-1',
      ]);
    });
  });
});
