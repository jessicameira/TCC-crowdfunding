import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { TicketsService, CreateTicketInput } from './tickets.service';
import { Ticket } from './entities/ticket.entity';

type MockRepository = {
  create: jest.Mock<Partial<Ticket>, [CreateTicketInput]>;
  save: jest.Mock<Promise<Ticket>, [Partial<Ticket>]>;
  findOne: jest.Mock<Promise<Ticket | null>, [{ where: { id: string } }]>;
};

function buildInput(overrides: Partial<CreateTicketInput> = {}): CreateTicketInput {
  return {
    eventId: 'event-1',
    userId: 'user-1',
    paymentId: 'payment-1',
    ...overrides,
  };
}

describe('TicketsService', () => {
  let service: TicketsService;
  let repository: MockRepository;

  beforeEach(() => {
    repository = {
      create: jest.fn<Partial<Ticket>, [CreateTicketInput]>(),
      save: jest.fn<Promise<Ticket>, [Partial<Ticket>]>(),
      findOne: jest.fn<Promise<Ticket | null>, [{ where: { id: string } }]>(),
    };

    service = new TicketsService(repository as unknown as Repository<Ticket>);
  });

  describe('createForPayment', () => {
    it('creates a ticket for the payment', async () => {
      const input = buildInput();
      repository.create.mockReturnValue(input);
      repository.save.mockImplementation((ticket) =>
        Promise.resolve({ id: 'ticket-1', ...ticket } as Ticket),
      );

      const result = await service.createForPayment(input);

      expect(repository.create).toHaveBeenCalledWith(input);
      expect(result?.id).toBe('ticket-1');
    });

    it('returns null instead of throwing when the payment already has a ticket', async () => {
      const input = buildInput();
      repository.create.mockReturnValue(input);
      repository.save.mockRejectedValue({ code: '23505' });

      const result = await service.createForPayment(input);

      expect(result).toBeNull();
    });

    it('rethrows unexpected errors', async () => {
      const input = buildInput();
      repository.create.mockReturnValue(input);
      const error = new Error('connection lost');
      repository.save.mockRejectedValue(error);

      await expect(service.createForPayment(input)).rejects.toBe(error);
    });
  });

  describe('findById', () => {
    it('throws NotFoundException when the ticket does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findById('missing-id')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns the ticket when found', async () => {
      const ticket = { id: 'ticket-1' } as Ticket;
      repository.findOne.mockResolvedValue(ticket);

      const result = await service.findById('ticket-1');

      expect(result).toBe(ticket);
    });
  });
});
