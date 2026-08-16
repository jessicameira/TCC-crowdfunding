import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { CreateUserInput, UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';

type MockUsersService = {
  create: jest.Mock<Promise<User>, [CreateUserInput]>;
  findByEmail: jest.Mock<Promise<User | null>, [string]>;
  findById: jest.Mock<Promise<User | null>, [string]>;
};

type MockJwtService = {
  sign: jest.Mock<string, [Record<string, unknown>]>;
};

function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: '1',
    name: 'Ada',
    email: 'ada@example.com',
    passwordHash: 'hash',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

describe('AuthService', () => {
  let service: AuthService;
  let usersService: MockUsersService;
  let jwtService: MockJwtService;

  beforeEach(() => {
    usersService = {
      create: jest.fn<Promise<User>, [CreateUserInput]>(),
      findByEmail: jest.fn<Promise<User | null>, [string]>(),
      findById: jest.fn<Promise<User | null>, [string]>(),
    };

    jwtService = {
      sign: jest.fn<string, [Record<string, unknown>]>().mockReturnValue('signed-token'),
    };

    service = new AuthService(
      usersService as unknown as UsersService,
      jwtService as unknown as JwtService,
    );
  });

  describe('register', () => {
    it('hashes the password, creates the user and returns a token', async () => {
      const user = buildUser();
      usersService.create.mockResolvedValue(user);

      const result = await service.register({
        name: 'Ada',
        email: 'ada@example.com',
        password: 'super-secret',
      });

      const [[createArgs]] = usersService.create.mock.calls;
      expect(createArgs.passwordHash).not.toBe('super-secret');
      expect(await bcrypt.compare('super-secret', createArgs.passwordHash)).toBe(true);

      expect(result).toEqual({
        user: { id: '1', name: 'Ada', email: 'ada@example.com', createdAt: user.createdAt },
        accessToken: 'signed-token',
      });
      expect(jwtService.sign).toHaveBeenCalledWith({ sub: '1', email: 'ada@example.com' });
    });
  });

  describe('login', () => {
    it('returns a token for valid credentials', async () => {
      const passwordHash = await bcrypt.hash('super-secret', 10);
      usersService.findByEmail.mockResolvedValue(buildUser({ passwordHash }));

      const result = await service.login({ email: 'ada@example.com', password: 'super-secret' });

      expect(result.accessToken).toBe('signed-token');
    });

    it('rejects when the user does not exist', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'ghost@example.com', password: 'whatever' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects when the password is wrong', async () => {
      const passwordHash = await bcrypt.hash('right-password', 10);
      usersService.findByEmail.mockResolvedValue(buildUser({ passwordHash }));

      await expect(
        service.login({ email: 'ada@example.com', password: 'wrong-password' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });
});
