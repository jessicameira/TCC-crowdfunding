import configuration from './configuration';

describe('configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('applies sensible defaults when env vars are absent', () => {
    delete process.env.PORT;
    delete process.env.DB_HOST;
    delete process.env.REDIS_PORT;

    const config = configuration();

    expect(config.port).toBe(3000);
    expect(config.database.host).toBe('localhost');
    expect(config.redis.port).toBe(6379);
  });

  it('reads values from the environment when present', () => {
    process.env.PORT = '4000';
    process.env.DB_HOST = 'db.internal';

    const config = configuration();

    expect(config.port).toBe(4000);
    expect(config.database.host).toBe('db.internal');
  });
});
