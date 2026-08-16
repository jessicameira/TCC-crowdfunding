import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventStatusDto } from './dto/update-event-status.dto';
import { NearbyEventsQueryDto } from './dto/nearby-events-query.dto';
import { toEventProfile, toNearbyEventProfile } from './event.mapper';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/guards/jwt-auth.guard';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  async create(@Body() dto: CreateEventDto) {
    const event = await this.eventsService.create(dto);
    return toEventProfile(event);
  }

  @Get()
  async findAll() {
    const events = await this.eventsService.findAll();
    return events.map(toEventProfile);
  }

  // nearby e recommended precisam vir antes de :id, senão o Nest interpreta como se fosse um id.
  @Get('nearby')
  async findNearby(@Query() query: NearbyEventsQueryDto) {
    const rows = await this.eventsService.findNearby(query);
    return rows.map(toNearbyEventProfile);
  }

  @Get('recommended')
  @UseGuards(JwtAuthGuard)
  async findRecommended(@CurrentUser() currentUser: JwtPayload) {
    const rows = await this.eventsService.findRecommendedForUser(currentUser.sub);
    return rows.map(toNearbyEventProfile);
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const event = await this.eventsService.findById(id);
    return toEventProfile(event);
  }

  @Patch(':id')
  async updateStatus(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateEventStatusDto) {
    const event = await this.eventsService.updateStatus(id, dto.status);
    return toEventProfile(event);
  }
}
