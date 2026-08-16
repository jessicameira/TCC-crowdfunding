import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { EventsService } from './events.service';
import { Event } from './entities/event.entity';
import { EventStatus } from './event-status.enum';
import { ArtistsService } from '../artists/artists.service';
import { Artist } from '../artists/entities/artist.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { QueuesService } from '../queues/queues.service';
import { EventInterest } from '../interests/entities/event-interest.entity';

type MockRepository = {
  create: jest.Mock<Partial<Event>, [Partial<Event>]>;
  save: jest.Mock<Promise<Event>, [Partial<Event>]>;
  find: jest.Mock<Promise<Event[]>, []>;
  findOne: jest.Mock<Promise<Event | null>, [{ where: { id: string } }]>;
  query: jest.Mock<Promise<unknown[]>, [string, unknown[]?]>;
};

type MockInterestRepository = {
  find: jest.Mock<Promise<EventInterest[]>, [unknown]>;
};

type MockArtistsService = {
  findById: jest.Mock<Promise<Artist>, [string]>;
};

type MockStateMachine = {
  assertTransition: jest.Mock<void, [EventStatus, EventStatus]>;
};

type MockQueuesService = {
  enqueueEventConfirmed: jest.Mock<Promise<unknown>, [string]>;
};

function buildDto(overrides: Partial<CreateEventDto> = {}): CreateEventDto {
  return {
    artistId: 'artist-1',
    name: 'Jazz Night',
    eventDate: '2026-12-01T20:00:00.000Z',
    capacity: 100,
    minimumQuorum: 50,
    priceCents: 5000,
    latitude: -25.4284,
    longitude: -49.2733,
    ...overrides,
  };
}

describe('EventsService', () => {
  let service: EventsService;
  let repository: MockRepository;
  let interestRepository: MockInterestRepository;
  let artistsService: MockArtistsService;
  let stateMachine: MockStateMachine;
  let queuesService: MockQueuesService;

  beforeEach(() => {
    repository = {
      create: jest.fn<Partial<Event>, [Partial<Event>]>(),
      save: jest.fn<Promise<Event>, [Partial<Event>]>(),
      find: jest.fn<Promise<Event[]>, []>(),
      findOne: jest.fn<Promise<Event | null>, [{ where: { id: string } }]>(),
      query: jest.fn<Promise<unknown[]>, [string, unknown[]?]>(),
    };
    interestRepository = {
      find: jest.fn<Promise<EventInterest[]>, [unknown]>(),
    };
    artistsService = {
      findById: jest.fn<Promise<Artist>, [string]>(),
    };
    stateMachine = {
      assertTransition: jest.fn<void, [EventStatus, EventStatus]>(),
    };
    queuesService = {
      enqueueEventConfirmed: jest.fn<Promise<unknown>, [string]>().mockResolvedValue(undefined),
    };

    service = new EventsService(
      repository as unknown as Repository<Event>,
      interestRepository as unknown as Repository<EventInterest>,
      artistsService as unknown as ArtistsService,
      stateMachine,
      queuesService as unknown as QueuesService,
    );
  });

  describe('create', () => {
    it('checks that the artist exists before creating the event', async () => {
      artistsService.findById.mockRejectedValue(new NotFoundException('Artista não encontrado'));

      await expect(service.create(buildDto())).rejects.toBeInstanceOf(NotFoundException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('rejects when minimumQuorum is greater than capacity', async () => {
      artistsService.findById.mockResolvedValue({ id: 'artist-1' } as Artist);

      await expect(
        service.create(buildDto({ capacity: 10, minimumQuorum: 20 })),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('creates the event as DRAFT with a GeoJSON location and zero interest', async () => {
      artistsService.findById.mockResolvedValue({ id: 'artist-1' } as Artist);
      repository.create.mockImplementation((input) => input);
      repository.save.mockImplementation((input) => Promise.resolve({ id: 'event-1', ...input } as Event));

      await service.create(buildDto());

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: EventStatus.DRAFT,
          currentInterest: 0,
          location: { type: 'Point', coordinates: [-49.2733, -25.4284] },
        }),
      );
    });
  });

  describe('findById', () => {
    it('throws NotFoundException when the event does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findById('missing-id')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('updateStatus', () => {
    it('validates the transition via the state machine before saving', async () => {
      const event = { id: 'event-1', status: EventStatus.DRAFT } as Event;
      repository.findOne.mockResolvedValue(event);
      repository.save.mockImplementation((input) => Promise.resolve(input as Event));

      const result = await service.updateStatus('event-1', EventStatus.OPEN);

      expect(stateMachine.assertTransition).toHaveBeenCalledWith(EventStatus.DRAFT, EventStatus.OPEN);
      expect(result.status).toBe(EventStatus.OPEN);
      expect(queuesService.enqueueEventConfirmed).not.toHaveBeenCalled();
    });

    it('enqueues an event-confirmed job when the new status is CONFIRMED', async () => {
      const event = { id: 'event-1', status: EventStatus.QUORUM_REACHED } as Event;
      repository.findOne.mockResolvedValue(event);
      repository.save.mockImplementation((input) => Promise.resolve(input as Event));

      await service.updateStatus('event-1', EventStatus.CONFIRMED);

      expect(queuesService.enqueueEventConfirmed).toHaveBeenCalledWith('event-1');
    });

    it('propagates the error when the state machine rejects the transition', async () => {
      const event = { id: 'event-1', status: EventStatus.DRAFT } as Event;
      repository.findOne.mockResolvedValue(event);
      stateMachine.assertTransition.mockImplementation(() => {
        throw new Error('invalid transition');
      });

      await expect(service.updateStatus('event-1', EventStatus.CONFIRMED)).rejects.toThrow(
        'invalid transition',
      );
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('findNearby', () => {
    it('converts radiusKm to meters and defaults to 10km when not provided', async () => {
      repository.query.mockResolvedValue([]);

      await service.findNearby({ latitude: -25.4284, longitude: -49.2733 });

      const [, params] = repository.query.mock.calls[0];
      expect(params).toEqual([-49.2733, -25.4284, [EventStatus.OPEN, EventStatus.QUORUM_REACHED], 10000]);
    });

    it('uses the provided radiusKm converted to meters', async () => {
      repository.query.mockResolvedValue([]);

      await service.findNearby({ latitude: -25.4284, longitude: -49.2733, radiusKm: 25 });

      const [, params] = repository.query.mock.calls[0];
      expect(params).toEqual([-49.2733, -25.4284, [EventStatus.OPEN, EventStatus.QUORUM_REACHED], 25000]);
    });

    it('only searches events that are OPEN or QUORUM_REACHED', async () => {
      repository.query.mockResolvedValue([]);

      await service.findNearby({ latitude: 0, longitude: 0 });

      const [sql] = repository.query.mock.calls[0];
      expect(sql).toContain('ST_DWithin');
      expect(sql).toContain('"status" = ANY($3)');
    });
  });

  describe('findRecommendedForUser', () => {
    it('returns an empty list when the user has no interest history', async () => {
      interestRepository.find.mockResolvedValue([]);

      const result = await service.findRecommendedForUser('user-1');

      expect(result).toEqual([]);
      expect(repository.query).not.toHaveBeenCalled();
    });

    it('uses the most recent interest as the reference point and excludes seen events', async () => {
      interestRepository.find.mockResolvedValue([
        { eventId: 'event-recent' } as EventInterest,
        { eventId: 'event-older' } as EventInterest,
      ]);
      repository.findOne.mockResolvedValue({
        id: 'event-recent',
        location: { type: 'Point', coordinates: [-49.2733, -25.4284] },
      } as Event);
      repository.query.mockResolvedValue([]);

      await service.findRecommendedForUser('user-1');

      expect(interestRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1' } }),
      );
      const [, params] = repository.query.mock.calls[0];
      expect(params).toEqual([
        -49.2733,
        -25.4284,
        [EventStatus.OPEN, EventStatus.QUORUM_REACHED],
        ['event-recent', 'event-older'],
        50000,
      ]);
    });

    it('returns an empty list when the reference event no longer exists', async () => {
      interestRepository.find.mockResolvedValue([{ eventId: 'event-deleted' } as EventInterest]);
      repository.findOne.mockResolvedValue(null);

      const result = await service.findRecommendedForUser('user-1');

      expect(result).toEqual([]);
      expect(repository.query).not.toHaveBeenCalled();
    });
  });
});
