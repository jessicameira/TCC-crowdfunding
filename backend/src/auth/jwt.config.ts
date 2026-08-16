import { ConfigService } from '@nestjs/config';
import { JwtModuleOptions } from '@nestjs/jwt';
import type { SignOptions } from 'jsonwebtoken';

export function jwtModuleOptionsFactory(configService: ConfigService): JwtModuleOptions {
  return {
    secret: configService.get<string>('jwt.secret'),
    signOptions: {
      expiresIn: configService.get<string>('jwt.expiresIn') as SignOptions['expiresIn'],
    },
  };
}
