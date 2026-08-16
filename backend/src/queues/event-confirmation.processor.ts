import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Job } from 'bullmq';
import { Repository } from 'typeorm';
import { EventInterest } from '../interests/entities/event-interest.entity';
import { QUEUE_NAMES } from './queue-names';
import { QueuesService, QuorumReachedJobData } from './queues.service';

// Lendo a tabela event_interests direto (não via InterestsService) pra evitar
// dependência circular: o InterestsModule já importa o QueuesModule pra enfileirar,
// então o QueuesModule não pode depender de volta do InterestsModule.
@Processor(QUEUE_NAMES.EVENT_CONFIRMATION)
export class EventConfirmationProcessor extends WorkerHost {
  private readonly logger = new Logger(EventConfirmationProcessor.name);

  constructor(
    @InjectRepository(EventInterest)
    private readonly interestsRepository: Repository<EventInterest>,
    private readonly queuesService: QueuesService,
  ) {
    super();
  }

  async process(job: Job<QuorumReachedJobData>): Promise<void> {
    const { eventId } = job.data;
    this.logger.log(`Evento ${eventId} atingiu o quórum — notificando interessados`);

    const interests = await this.interestsRepository.find({ where: { eventId } });

    await Promise.all(
      interests.map((interest) =>
        this.queuesService.enqueueQuorumReachedNotification(eventId, interest.userId),
      ),
    );
  }
}
