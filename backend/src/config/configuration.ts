export default () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  cors: {
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  },
  database: {
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    username: process.env.DB_USER ?? 'postgres',
    password: process.env.DB_PASSWORD ?? 'postgres',
    name: process.env.DB_NAME ?? 'tcc_eventos',
  },
  redis: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    // O JEST_WORKER_ID sempre vem definido quando roda no Jest, não importa o
    // NODE_ENV (aqui ele fica fixo em "development" mesmo nos testes). É um número
    // inteiro diferente por worker paralelo (1, 2, 3...), não só um "tá rodando teste
    // ou não". Sem isolar o db do Redis por worker, processos concorrentes que usam o
    // mesmo db acabam brigando pelas mesmas filas do BullMQ e um rouba o job do outro.
    // Isso já aconteceu de duas formas: o servidor de dev disputando fila com um teste
    // e2e, e dois arquivos de teste e2e rodando em paralelo disputando entre si. Usar
    // o número do worker como índice do db resolve os dois casos.
    db: process.env.JEST_WORKER_ID
      ? parseInt(process.env.JEST_WORKER_ID, 10)
      : parseInt(process.env.REDIS_DB ?? '0', 10),
  },
  jwt: {
    secret: process.env.JWT_SECRET ?? 'dev-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '1d',
  },
  tokenBucket: {
    capacity: parseInt(process.env.TOKEN_BUCKET_CAPACITY ?? '100', 10),
    refillRate: parseInt(process.env.TOKEN_BUCKET_REFILL_RATE ?? '20', 10),
  },
});
