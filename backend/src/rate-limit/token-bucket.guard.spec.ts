import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TokenBucketGuard } from './token-bucket.guard';
import { TokenBucketService, TokenBucketResult } from './token-bucket.service';

type MockTokenBucketService = {
  consume: jest.Mock<Promise<TokenBucketResult>, [string]>;
};

type MockConfigService = {
  get: jest.Mock<number, [string]>;
};

function buildContext(): { context: ExecutionContext; setHeader: jest.Mock } {
  const setHeader = jest.fn();
  const context = {
    switchToHttp: () => ({
      getResponse: () => ({ setHeader }),
    }),
  } as unknown as ExecutionContext;

  return { context, setHeader };
}

describe('TokenBucketGuard', () => {
  let guard: TokenBucketGuard;
  let tokenBucketService: MockTokenBucketService;
  let configService: MockConfigService;

  beforeEach(() => {
    tokenBucketService = {
      consume: jest.fn<Promise<TokenBucketResult>, [string]>(),
    };
    configService = {
      get: jest.fn<number, [string]>().mockReturnValue(20),
    };

    guard = new TokenBucketGuard(
      tokenBucketService as unknown as TokenBucketService,
      configService as unknown as ConfigService,
    );
  });

  it('allows the request and reports remaining tokens when a token is available', async () => {
    tokenBucketService.consume.mockResolvedValue({ allowed: true, remainingTokens: 42 });
    const { context, setHeader } = buildContext();

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 42);
  });

  it('throws 429 with a Retry-After header when no tokens are available', async () => {
    tokenBucketService.consume.mockResolvedValue({ allowed: false, remainingTokens: 0 });
    const { context, setHeader } = buildContext();

    await expect(guard.canActivate(context)).rejects.toMatchObject({
      status: HttpStatus.TOO_MANY_REQUESTS,
    });
    expect(setHeader).toHaveBeenCalledWith('Retry-After', expect.any(Number));
  });

  it('throws an HttpException instance when rejected', async () => {
    tokenBucketService.consume.mockResolvedValue({ allowed: false, remainingTokens: 0 });
    const { context } = buildContext();

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(HttpException);
  });
});
