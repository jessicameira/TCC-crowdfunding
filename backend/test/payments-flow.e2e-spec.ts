import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import request from 'supertest';
import type { Response } from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap';
import { Artist } from '../src/artists/entities/artist.entity';
import { Event } from '../src/events/entities/event.entity';
import { EventStatus } from '../src/events/event-status.enum';
import { User } from '../src/users/entities/user.entity';
import { EventInterest } from '../src/interests/entities/event-interest.entity';
import { Payment } from '../src/payments/entities/payment.entity';
import { PaymentStatus } from '../src/payments/payment-status.enum';
import { Ticket } from '../src/tickets/entities/ticket.entity';

// Testa o fluxo inteiro: evento confirmado -> cria pagamento -> gateway sandbox
// (simulado) -> webhook -> pagamento aprovado -> ingresso confirmado. Sobe a AppModule
// inteira com Workers de BullMQ reais e deixa a aprovacao simulada acontecer de
// verdade depois do delay configurado, em vez de mockar o gateway.
async function waitUntil(
  predicate: () => Promise<boolean>,
  timeoutMs = 8000,
  intervalMs = 200,
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

describe('Payments flow (e2e, stack real)', () => {
  let app: INestApplication;
  let artistRepository: Repository<Artist>;
  let eventRepository: Repository<Event>;
  let userRepository: Repository<User>;
  let interestRepository: Repository<EventInterest>;
  let paymentRepository: Repository<Payment>;
  let ticketRepository: Repository<Ticket>;

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

    const dataSource = moduleFixture.get(DataSource);
    artistRepository = dataSource.getRepository(Artist);
    eventRepository = dataSource.getRepository(Event);
    userRepository = dataSource.getRepository(User);
    interestRepository = dataSource.getRepository(EventInterest);
    paymentRepository = dataSource.getRepository(Payment);
    ticketRepository = dataSource.getRepository(Ticket);

    artist = await artistRepository.save(
      artistRepository.create({
        name: 'Artista de Teste de Pagamento',
        description: null,
        location: { type: 'Point', coordinates: [0, 0] },
      }),
    );

    event = await eventRepository.save(
      eventRepository.create({
        artistId: artist.id,
        name: 'Evento de Teste de Pagamento',
        description: null,
        eventDate: new Date('2026-12-01T20:00:00.000Z'),
        capacity: 10,
        minimumQuorum: 2,
        priceCents: 5000,
        currentInterest: 2,
        location: { type: 'Point', coordinates: [0, 0] },
        status: EventStatus.QUORUM_REACHED,
      }),
    );

    users = await userRepository.save([
      userRepository.create({ name: 'Pagador A', email: 'pagador-a@example.com', passwordHash: 'x' }),
      userRepository.create({ name: 'Pagador B', email: 'pagador-b@example.com', passwordHash: 'x' }),
    ]);

    await interestRepository.save(
      users.map((user) => interestRepository.create({ eventId: event.id, userId: user.id })),
    );
  }, 30000);

  afterAll(async () => {
    await ticketRepository.delete({ eventId: event.id });
    await paymentRepository.delete({ eventId: event.id });
    await interestRepository.delete({ eventId: event.id });
    await eventRepository.delete({ id: event.id });
    await artistRepository.delete({ id: artist.id });
    await userRepository.delete(users.map((user) => user.id));
    await app.close();
  });

  it(
    'confirms the event, creates a payment per interested user, and issues a ticket once each is approved',
    async () => {
      await request(app.getHttpServer())
        .patch(`/events/${event.id}`)
        .send({ status: EventStatus.CONFIRMED })
        .expect(200);

      await waitUntil(async () => {
        const payments = await paymentRepository.find({ where: { eventId: event.id } });
        return payments.length === users.length;
      });

      const pendingPayments = await paymentRepository.find({ where: { eventId: event.id } });
      expect(pendingPayments).toHaveLength(users.length);
      expect(pendingPayments.every((payment) => payment.amountCents === 5000)).toBe(true);

      const paidUserIds = new Set(pendingPayments.map((payment) => payment.userId));
      for (const user of users) {
        expect(paidUserIds.has(user.id)).toBe(true);
      }

      // O job atrasado simula o gateway aprovando o pagamento, passando pelo mesmo
      // caminho que um webhook de verdade usaria.
      await waitUntil(async () => {
        const approved = await paymentRepository.find({
          where: { eventId: event.id },
        });
        return approved.every((payment) => payment.status === PaymentStatus.APPROVED);
      });

      await waitUntil(async () => {
        const tickets = await ticketRepository.find({ where: { eventId: event.id } });
        return tickets.length === users.length;
      });

      const tickets = await ticketRepository.find({ where: { eventId: event.id } });
      const paymentIds = new Set(pendingPayments.map((payment) => payment.id));
      for (const ticket of tickets) {
        expect(paymentIds.has(ticket.paymentId)).toBe(true);
      }
    },
    15000,
  );

  it('exposes the payment and ticket via their GET endpoints', async () => {
    const [payment] = await paymentRepository.find({ where: { eventId: event.id } });
    const [ticket] = await ticketRepository.find({ where: { eventId: event.id } });

    await request(app.getHttpServer())
      .get(`/payments/${payment.id}`)
      .expect(200)
      .expect((res: Response) => {
        expect((res.body as Payment).status).toBe(PaymentStatus.APPROVED);
      });

    await request(app.getHttpServer())
      .get(`/tickets/${ticket.id}`)
      .expect(200)
      .expect((res: Response) => {
        expect((res.body as Ticket).paymentId).toBe(ticket.paymentId);
      });
  });

  it('refunds an approved payment via POST /payments/:id/refund', async () => {
    const [payment] = await paymentRepository.find({ where: { eventId: event.id } });

    await request(app.getHttpServer())
      .post(`/payments/${payment.id}/refund`)
      .expect(201)
      .expect((res: Response) => {
        expect((res.body as Payment).status).toBe(PaymentStatus.REFUNDED);
      });
  });

  it('rejects a malformed webhook payload', async () => {
    await request(app.getHttpServer())
      .post('/payments/webhook')
      .send({ nonsense: true })
      .expect(400);
  });
});
