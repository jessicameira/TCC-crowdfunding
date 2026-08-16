import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import type Redis from 'ioredis';
import { RedisModule, REDIS_CLIENT } from '../src/redis/redis.module';
import { TokenBucketService } from '../src/rate-limit/token-bucket.service';

// O algoritmo roda todo dentro do Redis via script Lua (EVAL), entao so testando
// contra o Redis real da pra confirmar que a atomicidade aguenta concorrencia.
// Uso capacity/refillRate bem menores que os de producao pra deixar o teste rapido e deterministico.
const TEST_CAPACITY = 5;
const TEST_REFILL_RATE = 5; // tokens por segundo -> 200ms por token

describe('TokenBucketService (e2e, Redis real)', () => {
  let moduleRef: TestingModule;
  let service: TokenBucketService;
  let redis: Redis;
  const bucketKey = `test-token-bucket:${Date.now()}`;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              redis: {
                host: process.env.REDIS_HOST ?? 'localhost',
                port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
              },
              tokenBucket: { capacity: TEST_CAPACITY, refillRate: TEST_REFILL_RATE },
            }),
          ],
        }),
        RedisModule,
      ],
      providers: [TokenBucketService],
    }).compile();

    service = moduleRef.get(TokenBucketService);
    redis = moduleRef.get(REDIS_CLIENT);
  }, 15000);

  afterAll(async () => {
    await redis.del(bucketKey, `${bucketKey}:concurrent`);
    await moduleRef.close();
  });

  it(`allows exactly ${TEST_CAPACITY} requests before rejecting the rest`, async () => {
    const results = [];
    for (let i = 0; i < TEST_CAPACITY + 3; i++) {
      results.push(await service.consume(bucketKey));
    }

    const allowedCount = results.filter((result) => result.allowed).length;
    expect(allowedCount).toBe(TEST_CAPACITY);
    expect(results.slice(TEST_CAPACITY).every((result) => !result.allowed)).toBe(true);
  });

  it('refills tokens over time', async () => {
    await new Promise((resolve) => setTimeout(resolve, 500));

    const result = await service.consume(bucketKey);
    expect(result.allowed).toBe(true);
  });

  it(`is safe under concurrent access (never allows more than ${TEST_CAPACITY})`, async () => {
    const concurrentKey = `${bucketKey}:concurrent`;
    const CONCURRENT_REQUESTS = 50;

    const results = await Promise.all(
      Array.from({ length: CONCURRENT_REQUESTS }, () => service.consume(concurrentKey)),
    );

    const allowedCount = results.filter((result) => result.allowed).length;
    expect(allowedCount).toBe(TEST_CAPACITY);
  }, 15000);
});
