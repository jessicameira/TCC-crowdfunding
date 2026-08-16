import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ticket } from './entities/ticket.entity';

const POSTGRES_UNIQUE_VIOLATION = '23505';

export type CreateTicketInput = {
  eventId: string;
  userId: string;
  paymentId: string;
};

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketsRepository: Repository<Ticket>,
  ) {}

  // Isso é idempotente: se o webhook do pagamento vier duplicado (reentrega, retry de
  // fila), a constraint UNIQUE(paymentId) barra um segundo ingresso pro mesmo pagamento.
  // Devolve null em vez de estourar o erro de duplicidade.
  async createForPayment(input: CreateTicketInput): Promise<Ticket | null> {
    const ticket = this.ticketsRepository.create(input);

    try {
      return await this.ticketsRepository.save(ticket);
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        return null;
      }
      throw error;
    }
  }

  async findById(id: string): Promise<Ticket> {
    const ticket = await this.ticketsRepository.findOne({ where: { id } });

    if (!ticket) {
      throw new NotFoundException('Ingresso não encontrado');
    }

    return ticket;
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === POSTGRES_UNIQUE_VIOLATION
    );
  }
}
