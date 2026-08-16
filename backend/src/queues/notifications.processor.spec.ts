import { Job } from 'bullmq';
import { NotificationsProcessor } from './notifications.processor';
import { NotificationJobData } from './queues.service';

describe('NotificationsProcessor', () => {
  it('processes a notification job without throwing', async () => {
    const processor = new NotificationsProcessor();
    const job = {
      data: { userId: 'user-1', eventId: 'event-1', message: 'Quórum atingido!' },
    } as Job<NotificationJobData>;

    await expect(processor.process(job)).resolves.toBeUndefined();
  });
});
