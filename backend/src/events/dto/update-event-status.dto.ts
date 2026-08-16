import { IsEnum } from 'class-validator';
import { EventStatus } from '../event-status.enum';

export class UpdateEventStatusDto {
  @IsEnum(EventStatus)
  status: EventStatus;
}
