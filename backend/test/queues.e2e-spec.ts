import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import { DataSource, Repository } from 'typeorm';
import { Queue } from 'bullmq';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap';
import { Artist } from '../src/artists/entities/artist.entity';
import { Event } from '../src/events/entities/event.entity';
import { EventStatus } from '../src/events/event-status.enum';
import { User } from '../src/users/entities/user.entity';
import { EventInterest } from '../src/interests/entities/event-interest.entity';
import { QueuesService, NotificationJobData } from '../src/queues/queues.service';
import { QUEUE_NAMES } from '../src/queues/queue-names';

async function waitUntil(
  predicate: () => Promise<boolean>,
  timeoutMs = 5000,
  intervalMs = 100,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await predicate()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error('Timed out waiting for condition');
}

describe('Queues (e2e, Redis/BullMQ real)', () => {
  let app: INestApplication;
  let queuesService: QueuesService;
  let notificationsQueue: Queue<NotificationJobData>;
  let artistRepository: Repository<Artist>;
  let eventRepository: Repository<Event>;
  let userRepository: Repository<User>;
  let interestRepository: Repository<EventInterest>;

  let artist: Artist;
  let event: Event;
  let users: User[];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();

    queuesService = moduleFixture.get(QueuesService);
    notificationsQueue = moduleFixture.get(getQueueToken(QUEUE_NAMES.NOTIFICATIONS));

    const dataSource = moduleFixture.get(DataSource);
    artistRepository = dataSource.getRepository(Artist);
    eventRepository = dataSource.getRepository(Event);
    userRepository = dataSource.getRepository(User);
    interestRepository = dataSource.getRepository(EventInterest);

    artist = await artistRepository.save(
      artistRepository.create({
        name: 'Artista de Teste de Filas',
        description: null,
        location: { type: 'Point', coordinates: [0, 0] },
      }),
    );

    event = await eventRepository.save(
      eventRepository.create({
        artistId: artist.id,
        name: 'Evento de Teste de Filas',
        description: null,
        eventDate: new Date('2026-12-01T20:00:00.000Z'),
        capacity: 100,
        minimumQuorum: 50,
        currentInterest: 2,
        location: { type: 'Point', coordinates: [0, 0] },
        status: EventStatus.QUORUM_REACHED,
      }),
    );

    users = await userRepository.save([
      userRepository.create({ name: 'Fila A', email: 'fila-a@example.com', passwordHash: 'x' }),
      userRepository.create({ name: 'Fila B', email: 'fila-b@example.com', passwordHash: 'x' }),
    ]);

    await interestRepository.save(
      users.map((user) => interestRepository.create({ eventId: event.id, userId: user.id })),
    );
  }, 30000);

  afterAll(async () => {
    await interestRepository.delete({ eventId: event.id });
    await eventRepository.delete({ id: event.id });
    await artistRepository.delete({ id: artist.id });
    await userRepository.delete(users.map((user) => user.id));
    await app.close();
  });

  it('processes a quorum-reached job end-to-end and enqueues one notification per interested user', async () => {
    await queuesService.enqueueQuorumReached(event.id);

    // Filtrando pelos jobs deste evento especifico, em vez de comparar a contagem agregada
    // de "completed" antes/depois. Com `removeOnComplete: 100`, essa lista tem tamanho
    // maximo fixo. Depois de rodar essa suite varias vezes e acumular 100 jobs concluidos,
    // job novo so substitui o mais antigo e a contagem para de crescer — daí esse tipo de
    // asserção quebra pra sempre sem ter bug nenhum de verdade.
    await waitUntil(async () => {
      const completedJobs = await notificationsQueue.getJobs(['completed'], 0, 100);
      const relevantJobs = completedJobs.filter((job) => job.data.eventId === event.id);
      return relevantJobs.length >= users.length;
    });

    const completedJobs = await notificationsQueue.getJobs(['completed'], 0, 100);
    const relevantJobs = completedJobs.filter((job) => job.data.eventId === event.id);
    const notifiedUserIds = new Set(relevantJobs.map((job) => job.data.userId));

    expect(notifiedUserIds.size).toBe(users.length);
    for (const user of users) {
      expect(notifiedUserIds.has(user.id)).toBe(true);
    }
  }, 15000);
});
