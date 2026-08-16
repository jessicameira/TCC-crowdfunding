import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.module';
import { TOKEN_BUCKET_SCRIPT } from './token-bucket.lua';

export type TokenBucketResult = {
  allowed: boolean;
  remainingTokens: number;
};

@Injectable()
export class TokenBucketService {
  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly configService: ConfigService,
  ) {}

  async consume(key: string): Promise<TokenBucketResult> {
    const capacity = this.configService.get<number>('tokenBucket.capacity')!;
    const refillRate = this.configService.get<number>('tokenBucket.refillRate')!;

    const [allowed, remainingTokens] = (await this.redis.eval(
      TOKEN_BUCKET_SCRIPT,
      1,
      key,
      capacity,
      refillRate,
      Date.now(),
    )) as [number, string];

    return {
      allowed: allowed === 1,
      remainingTokens: Math.floor(Number(remainingTokens)),
    };
  }
}
