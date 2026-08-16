import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ArtistsModule } from '../artists/artists.module';
import { QueuesModule } from '../queues/queues.module';
import { jwtModuleOptionsFactory } from '../auth/jwt.config';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Event } from './entities/event.entity';
import { EventInterest } from '../interests/entities/event-interest.entity';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { EventStateMachine } from './event-state-machine';

@Module({
  imports: [
    TypeOrmModule.forFeature([Event, EventInterest]),
    ArtistsModule,
    QueuesModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: jwtModuleOptionsFactory,
    }),
  ],
  controllers: [EventsController],
  providers: [EventsService, EventStateMachine, JwtAuthGuard],
  exports: [EventsService, EventStateMachine],
})
export class EventsModule {}
