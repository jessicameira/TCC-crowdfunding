import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from './queue-names';
import { NotificationJobData } from './queues.service';

@Processor(QUEUE_NAMES.NOTIFICATIONS)
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  process(job: Job<NotificationJobData>): Promise<void> {
    const { userId, eventId, message } = job.data;
    this.logger.log(`[notificação simulada] usuário ${userId}, evento ${eventId}: ${message}`);
    return Promise.resolve();
  }
}
