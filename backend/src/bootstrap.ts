import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Configuração compartilhada entre main.ts e os testes e2e. O
// Test.createTestingModule() + createNestApplication() não roda o main.ts, então sem
// isso os testes iam rodar sem ValidationPipe/CORS e não pegavam bug de validação, aconteceu anteriormente.
export function configureApp(app: INestApplication): void {
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const configService = app.get(ConfigService);
  app.enableCors({
    origin: configService.get<string>('cors.origin'),
  });
}
