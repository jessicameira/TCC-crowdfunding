import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { EventsService } from '../events/events.service';
import { EventStateMachine } from '../events/event-state-machine';
import { EventStatus } from '../events/event-status.enum';
import { Event } from '../events/entities/event.entity';
import { EventInterest } from './entities/event-interest.entity';
import { QueuesService } from '../queues/queues.service';

const POSTGRES_UNIQUE_VIOLATION = '23505';

const ACCEPTS_INTEREST_STATUSES = [EventStatus.OPEN, EventStatus.QUORUM_REACHED];

type EventCounterRow = {
  currentInterest: number;
  minimumQuorum: number;
  status: EventStatus;
};

@Injectable()
export class InterestsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly eventsService: EventsService,
    private readonly stateMachine: EventStateMachine,
    private readonly queuesService: QueuesService,
  ) {}

  async manifestInterest(eventId: string, userId: string): Promise<Event> {
    const event = await this.eventsService.findById(eventId);
    this.assertAcceptsInterest(event);

    let quorumJustReached = false;

    await this.dataSource.transaction(async (manager) => {
      try {
        await manager.insert(EventInterest, { eventId, userId });
      } catch (error) {
        if (this.isUniqueViolation(error)) {
          throw new ConflictException('Você já manifestou interesse neste evento');
        }
        throw error;
      }

      const [rows] = await manager.query<[EventCounterRow[], number]>(
        `UPDATE "events"
         SET "currentInterest" = "currentInterest" + 1
         WHERE "id" = $1 AND "currentInterest" < "capacity"
         RETURNING "currentInterest", "minimumQuorum", "status"`,
        [eventId],
      );

      if (rows.length === 0) {
        throw new ConflictException('Capacidade esgotada para este evento');
      }

      const { currentInterest, minimumQuorum, status } = rows[0];

      if (status === EventStatus.OPEN && currentInterest >= minimumQuorum) {
        this.stateMachine.assertTransition(EventStatus.OPEN, EventStatus.QUORUM_REACHED);
        await manager.query('UPDATE "events" SET "status" = $1 WHERE "id" = $2', [
          EventStatus.QUORUM_REACHED,
          eventId,
        ]);
        quorumJustReached = true;
      }
    });

    // Enfileirando isso fora da transação de propósito: só dispara o job depois que a
    // mudança de estado realmente foi commitada. A atualização do contador, que é crítica
    // pra consistência, não vai pra fila, só o trabalho assíncrono de notificação.
    if (quorumJustReached) {
      await this.queuesService.enqueueQuorumReached(eventId);
    }

    return this.eventsService.findById(eventId);
  }

  async withdrawInterest(eventId: string, userId: string): Promise<void> {
    const event = await this.eventsService.findById(eventId);
    this.assertAcceptsInterest(event);

    await this.dataSource.transaction(async (manager) => {
      const deleteResult = await manager.delete(EventInterest, { eventId, userId });

      if (!deleteResult.affected) {
        throw new NotFoundException('Manifestação de interesse não encontrada');
      }

      await manager.query(
        `UPDATE "events"
         SET "currentInterest" = "currentInterest" - 1
         WHERE "id" = $1 AND "currentInterest" > 0`,
        [eventId],
      );
    });
  }

  private assertAcceptsInterest(event: Event): void {
    if (!ACCEPTS_INTEREST_STATUSES.includes(event.status)) {
      throw new ConflictException('Evento não está aceitando manifestações de interesse');
    }
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
