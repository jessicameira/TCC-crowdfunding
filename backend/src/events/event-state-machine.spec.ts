import { ConflictException } from '@nestjs/common';
import { EventStateMachine } from './event-state-machine';
import { EventStatus } from './event-status.enum';

describe('EventStateMachine', () => {
  const stateMachine = new EventStateMachine();

  it.each([
    [EventStatus.DRAFT, EventStatus.OPEN],
    [EventStatus.OPEN, EventStatus.QUORUM_REACHED],
    [EventStatus.OPEN, EventStatus.CANCELLED],
    [EventStatus.QUORUM_REACHED, EventStatus.CONFIRMED],
    [EventStatus.CONFIRMED, EventStatus.SOLD_OUT],
    [EventStatus.CONFIRMED, EventStatus.COMPLETED],
  ])('allows %s -> %s', (from, to) => {
    expect(() => stateMachine.assertTransition(from, to)).not.toThrow();
  });

  it.each([
    [EventStatus.DRAFT, EventStatus.QUORUM_REACHED],
    [EventStatus.DRAFT, EventStatus.CONFIRMED],
    [EventStatus.DRAFT, EventStatus.CANCELLED],
    [EventStatus.OPEN, EventStatus.CONFIRMED],
    [EventStatus.OPEN, EventStatus.DRAFT],
    [EventStatus.QUORUM_REACHED, EventStatus.OPEN],
    [EventStatus.QUORUM_REACHED, EventStatus.CANCELLED],
    [EventStatus.CONFIRMED, EventStatus.OPEN],
    [EventStatus.CANCELLED, EventStatus.OPEN],
    [EventStatus.SOLD_OUT, EventStatus.COMPLETED],
    [EventStatus.COMPLETED, EventStatus.CONFIRMED],
  ])('rejects %s -> %s', (from, to) => {
    expect(() => stateMachine.assertTransition(from, to)).toThrow(ConflictException);
  });

  it('rejects a status transitioning to itself', () => {
    expect(() => stateMachine.assertTransition(EventStatus.OPEN, EventStatus.OPEN)).toThrow(
      ConflictException,
    );
  });
});
