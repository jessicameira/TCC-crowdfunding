import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { Artist } from '../src/artists/entities/artist.entity';
import { Event } from '../src/events/entities/event.entity';
import { EventStatus } from '../src/events/event-status.enum';
import { configureApp } from '../src/bootstrap';

// UsAndo Curitiba e SP como ponto "perto" e "longe" pra testar o ST_DWithin/ST_Distance de verdade contra o Postgres.
const CURITIBA = { latitude: -25.4284, longitude: -49.2733 };
const SAO_PAULO = { latitude: -23.5505, longitude: -46.6333 };

describe('Events nearby (e2e)', () => {
  let app: INestApplication;
  let artistRepository: Repository<Artist>;
  let eventRepository: Repository<Event>;
  let artist: Artist;
  let nearEvent: Event;
  let farEvent: Event;
  let draftNearEvent: Event;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();

    const dataSource = moduleFixture.get(DataSource);
    artistRepository = dataSource.getRepository(Artist);
    eventRepository = dataSource.getRepository(Event);

    artist = await artistRepository.save(
      artistRepository.create({
        name: 'Artista de Teste de Proximidade',
        description: null,
        location: { type: 'Point', coordinates: [CURITIBA.longitude, CURITIBA.latitude] },
      }),
    );

    const commonFields = {
      artistId: artist.id,
      description: null,
      eventDate: new Date('2026-12-01T20:00:00.000Z'),
      capacity: 50,
      minimumQuorum: 10,
      currentInterest: 0,
    };

    nearEvent = await eventRepository.save(
      eventRepository.create({
        ...commonFields,
        name: 'Evento Perto',
        status: EventStatus.OPEN,
        location: { type: 'Point', coordinates: [CURITIBA.longitude, CURITIBA.latitude] },
      }),
    );

    farEvent = await eventRepository.save(
      eventRepository.create({
        ...commonFields,
        name: 'Evento Longe',
        status: EventStatus.OPEN,
        location: { type: 'Point', coordinates: [SAO_PAULO.longitude, SAO_PAULO.latitude] },
      }),
    );

    draftNearEvent = await eventRepository.save(
      eventRepository.create({
        ...commonFields,
        name: 'Evento Rascunho Perto',
        status: EventStatus.DRAFT,
        location: { type: 'Point', coordinates: [CURITIBA.longitude, CURITIBA.latitude] },
      }),
    );
  }, 30000);

  afterAll(async () => {
    await eventRepository.delete([nearEvent.id, farEvent.id, draftNearEvent.id]);
    await artistRepository.delete({ id: artist.id });
    await app.close();
  });

  it('returns only the OPEN event within a small radius, excluding DRAFT events', async () => {
    const response = await request(app.getHttpServer())
      .get('/events/nearby')
      .query({ ...CURITIBA, radiusKm: 10 })
      .expect(200);

    const ids = (response.body as { id: string }[]).map((event) => event.id);
    expect(ids).toContain(nearEvent.id);
    expect(ids).not.toContain(farEvent.id);
    expect(ids).not.toContain(draftNearEvent.id);
  });

  it('returns events within a large radius ordered by distance', async () => {
    const response = await request(app.getHttpServer())
      .get('/events/nearby')
      .query({ ...CURITIBA, radiusKm: 500 })
      .expect(200);

    const results = response.body as { id: string; distanceKm: number }[];
    const near = results.find((event) => event.id === nearEvent.id);
    const far = results.find((event) => event.id === farEvent.id);

    expect(near).toBeDefined();
    expect(far).toBeDefined();
    expect(near!.distanceKm).toBeLessThan(far!.distanceKm);
    expect(results.indexOf(near!)).toBeLessThan(results.indexOf(far!));
  });

  it('defaults to a 10km radius when radiusKm is not provided', async () => {
    const response = await request(app.getHttpServer())
      .get('/events/nearby')
      .query(CURITIBA)
      .expect(200);

    const ids = (response.body as { id: string }[]).map((event) => event.id);
    expect(ids).toContain(nearEvent.id);
    expect(ids).not.toContain(farEvent.id);
  });

  it('rejects requests without latitude/longitude', async () => {
    await request(app.getHttpServer()).get('/events/nearby').expect(400);
  });
});
