import { Module } from '@nestjs/common';
import { TokenBucketService } from './token-bucket.service';
import { TokenBucketGuard } from './token-bucket.guard';

@Module({
  providers: [TokenBucketService, TokenBucketGuard],
  exports: [TokenBucketService, TokenBucketGuard],
})
export class RateLimitModule {}
