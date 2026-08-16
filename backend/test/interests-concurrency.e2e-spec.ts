import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DataSource, Repository } from 'typeorm';
import request from 'supertest';
import type { AddressInfo } from 'net';
import type { Server } from 'http';
import { AppModule } from '../src/app.module';
import { User } from '../src/users/entities/user.entity';
import { Artist } from '../src/artists/entities/artist.entity';
import { Event } from '../src/events/entities/event.entity';
import { EventInterest } from '../src/interests/entities/event-interest.entity';
import { EventStatus } from '../src/events/event-status.enum';
import { configureApp } from '../src/bootstrap';
import { TokenBucketGuard } from '../src/rate-limit/token-bucket.guard';

// Inserindo os usuarios direto pelo repositorio. Teste com 1000 conexões.
describe('Interests concurrency (e2e)', () => {
  const CAPACITY = 100;
  const CONCURRENT_REQUESTS = 1000;
  const TEST_EMAIL_PREFIX = 'concurrency-test-';

  let app: INestApplication;
  let baseUrl: string;
  let jwtService: JwtService;
  let userRepository: Repository<User>;
  let artistRepository: Repository<Artist>;
  let eventRepository: Repository<Event>;
  let interestRepository: Repository<EventInterest>;

  let activeEvent: Event | null = null;
  let activeUsers: User[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      // testando concorrência de interesse não é o foco do Token Bucket, então desabilito ele pra não atrapalhar o teste
      .overrideGuard(TokenBucketGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();

    await app.listen(0);
    const httpServer = app.getHttpServer() as Server;
    const address = httpServer.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;

    jwtService = moduleFixture.get(JwtService);
    // EventInterest nao tem TypeOrmModule.forFeature registrado em nenhum modulo, o InterestsService
    // usa SQL cru via DataSource, nao um Repository injetado. Adicionando os repositorios direto do
    // do DataSource em vez de getRepositoryToken(), que so resolve provider registrado via forFeature.
    const dataSource = moduleFixture.get(DataSource);
    userRepository = dataSource.getRepository(User);
    artistRepository = dataSource.getRepository(Artist);
    eventRepository = dataSource.getRepository(Event);
    interestRepository = dataSource.getRepository(EventInterest);
  }, 30000);

  afterEach(async () => {
    if (activeEvent) {
      await interestRepository.delete({ eventId: activeEvent.id });
      await eventRepository.delete({ id: activeEvent.id });
      await artistRepository.delete({ id: activeEvent.artistId });
    }
    if (activeUsers.length) {
      await userRepository.delete(activeUsers.map((user) => user.id));
    }
    activeEvent = null;
    activeUsers = [];
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  async function createOpenEvent(overrides: Partial<Event> = {}): Promise<Event> {
    const artist = await artistRepository.save(
      artistRepository.create({
        name: 'Artista de Teste de Concorrência',
        description: null,
        location: { type: 'Point', coordinates: [-49.2733, -25.4284] },
      }),
    );

    return eventRepository.save(
      eventRepository.create({
        artistId: artist.id,
        name: 'Evento de Teste de Concorrência',
        description: null,
        eventDate: new Date('2026-12-01T20:00:00.000Z'),
        capacity: CAPACITY,
        minimumQuorum: Math.floor(CAPACITY / 2),
        currentInterest: 0,
        location: { type: 'Point', coordinates: [-49.2733, -25.4284] },
        status: EventStatus.OPEN,
        ...overrides,
      }),
    );
  }

  function countStatus(
    results: PromiseSettledResult<request.Response>[],
    status: number,
  ): number {
    return results.filter(
      (result) => result.status === 'fulfilled' && result.value.status === status,
    ).length;
  }

  it(
    `allows at most ${CAPACITY} interested users out of ${CONCURRENT_REQUESTS} concurrent requests, with no oversell and no duplicates`,
    async () => {
      activeEvent = await createOpenEvent();
      const event = activeEvent;

      activeUsers = await userRepository.save(
        Array.from({ length: CONCURRENT_REQUESTS }, (_, i) =>
          userRepository.create({
            name: `Concorrente ${i}`,
            email: `${TEST_EMAIL_PREFIX}${i}@example.com`,
            passwordHash: 'unused-in-this-test',
          }),
        ),
      );

      const tokens = activeUsers.map((user) => jwtService.sign({ sub: user.id, email: user.email }));

      const results = await Promise.allSettled(
        tokens.map((token) =>
          request(baseUrl)
            .post(`/events/${event.id}/interests`)
            .set('Authorization', `Bearer ${token}`),
        ),
      );

      const rejected = results.filter((result) => result.status === 'rejected').length;
      // Deixando uma margem pequena pra falha de transporte pontual. Quem garante mesmo
      // que esta tudo certo sao as asserções sobre o estado final do banco, logo abaixo.
      expect(rejected).toBeLessThan(CONCURRENT_REQUESTS * 0.01);

      const successCount = countStatus(results, 201);
      const conflictCount = countStatus(results, 409);
      expect(successCount + conflictCount + rejected).toBe(CONCURRENT_REQUESTS);

      const persistedEvent = await eventRepository.findOneOrFail({ where: { id: event.id } });
      expect(persistedEvent.currentInterest).toBeLessThanOrEqual(persistedEvent.capacity);
      expect(persistedEvent.currentInterest).toBe(CAPACITY);
      expect(persistedEvent.status).toBe(EventStatus.QUORUM_REACHED);

      const interestRows = await interestRepository.find({ where: { eventId: event.id } });
      expect(interestRows).toHaveLength(CAPACITY);
      expect(interestRows.length).toBe(persistedEvent.currentInterest);

      const uniqueUserIds = new Set(interestRows.map((row) => row.userId));
      expect(uniqueUserIds.size).toBe(interestRows.length);
    },
    60000,
  );

  it(
    'allows only one interest when the same user fires many concurrent requests',
    async () => {
      activeEvent = await createOpenEvent({ capacity: 10, minimumQuorum: 1 });
      const event = activeEvent;

      activeUsers = await userRepository.save([
        userRepository.create({
          name: 'Usuário Duplicado',
          email: `${TEST_EMAIL_PREFIX}same-user@example.com`,
          passwordHash: 'unused-in-this-test',
        }),
      ]);
      const [user] = activeUsers;
      const token = jwtService.sign({ sub: user.id, email: user.email });

      const results = await Promise.allSettled(
        Array.from({ length: 20 }, () =>
          request(baseUrl)
            .post(`/events/${event.id}/interests`)
            .set('Authorization', `Bearer ${token}`),
        ),
      );

      const rejected = results.filter((result) => result.status === 'rejected').length;
      expect(rejected).toBe(0);

      const successCount = countStatus(results, 201);
      const conflictCount = countStatus(results, 409);
      expect(successCount).toBe(1);
      expect(conflictCount).toBe(19);

      const persistedEvent = await eventRepository.findOneOrFail({ where: { id: event.id } });
      expect(persistedEvent.currentInterest).toBe(1);

      const interestRows = await interestRepository.find({ where: { eventId: event.id } });
      expect(interestRows).toHaveLength(1);
    },
    20000,
  );
});
