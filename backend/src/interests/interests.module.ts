import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { EventsModule } from '../events/events.module';
import { RateLimitModule } from '../rate-limit/rate-limit.module';
import { QueuesModule } from '../queues/queues.module';
import { jwtModuleOptionsFactory } from '../auth/jwt.config';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InterestsService } from './interests.service';
import { InterestsController } from './interests.controller';

@Module({
  imports: [
    EventsModule,
    RateLimitModule,
    QueuesModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: jwtModuleOptionsFactory,
    }),
  ],
  controllers: [InterestsController],
  providers: [InterestsService, JwtAuthGuard],
})
export class InterestsModule {}
