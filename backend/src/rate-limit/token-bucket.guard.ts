import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { TokenBucketService } from './token-bucket.service';

// Chave fixa por enquanto pq só a manifestação de interesse usa esse guard (é o
// endpoint prioritário). Se algum outro endpoint precisar de rate limit no futuro
// (pagamentos, por exemplo), aí sim vale parametrizar a chave via decorator.
const EVENTS_INTERESTS_BUCKET_KEY = 'token-bucket:events-interests';

@Injectable()
export class TokenBucketGuard implements CanActivate {
  constructor(
    private readonly tokenBucketService: TokenBucketService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const { allowed, remainingTokens } = await this.tokenBucketService.consume(
      EVENTS_INTERESTS_BUCKET_KEY,
    );

    if (!allowed) {
      const refillRate = this.configService.get<number>('tokenBucket.refillRate')!;
      const retryAfterSeconds = Math.max(1, Math.ceil(1 / refillRate));
      const response = context.switchToHttp().getResponse<Response>();
      response.setHeader('Retry-After', retryAfterSeconds);

      throw new HttpException(
        'Muitas requisições. Tente novamente em instantes.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const response = context.switchToHttp().getResponse<Response>();
    response.setHeader('X-RateLimit-Remaining', remainingTokens);

    return true;
  }
}
