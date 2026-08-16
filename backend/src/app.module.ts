import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis/redis.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ArtistsModule } from './artists/artists.module';
import { EventsModule } from './events/events.module';
import { InterestsModule } from './interests/interests.module';
import { PaymentsModule } from './payments/payments.module';
import { TicketsModule } from './tickets/tickets.module';
import { RecommendationsModule } from './recommendations/recommendations.module';
import { RateLimitModule } from './rate-limit/rate-limit.module';
import { QueuesModule } from './queues/queues.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    DatabaseModule,
    RedisModule,
    HealthModule,
    AuthModule,
    UsersModule,
    ArtistsModule,
    EventsModule,
    InterestsModule,
    PaymentsModule,
    TicketsModule,
    RecommendationsModule,
    RateLimitModule,
    QueuesModule,
  ],
})
export class AppModule {}
