import { ConflictException, Injectable } from '@nestjs/common';
import { EventStatus } from './event-status.enum';

const ALLOWED_TRANSITIONS: Record<EventStatus, EventStatus[]> = {
  [EventStatus.DRAFT]: [EventStatus.OPEN],
  [EventStatus.OPEN]: [EventStatus.QUORUM_REACHED, EventStatus.CANCELLED],
  [EventStatus.QUORUM_REACHED]: [EventStatus.CONFIRMED],
  [EventStatus.CONFIRMED]: [EventStatus.SOLD_OUT, EventStatus.COMPLETED],
  [EventStatus.CANCELLED]: [],
  [EventStatus.SOLD_OUT]: [],
  [EventStatus.COMPLETED]: [],
};

@Injectable()
export class EventStateMachine {
  assertTransition(from: EventStatus, to: EventStatus): void {
    if (!ALLOWED_TRANSITIONS[from].includes(to)) {
      throw new ConflictException(`Transição de ${from} para ${to} não é permitida`);
    }
  }
}
