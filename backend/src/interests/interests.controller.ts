import { Controller, Delete, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { InterestsService } from './interests.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/guards/jwt-auth.guard';
import { toEventProfile } from '../events/event.mapper';
import { TokenBucketGuard } from '../rate-limit/token-bucket.guard';

@Controller('events/:eventId/interests')
@UseGuards(JwtAuthGuard)
export class InterestsController {
  constructor(private readonly interestsService: InterestsService) {}

  // Token Bucket: esse é o endpoint que mais sofre pico de demanda quando um evento popular tá perto do quórum.
  @Post()
  @UseGuards(TokenBucketGuard)
  async create(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    const event = await this.interestsService.manifestInterest(eventId, currentUser.sub);
    return toEventProfile(event);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    await this.interestsService.withdrawInterest(eventId, currentUser.sub);
  }
}
