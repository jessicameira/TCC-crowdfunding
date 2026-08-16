import { ConflictException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';

type MockRepository = {
  create: jest.Mock;
  save: jest.Mock;
  findOne: jest.Mock;
};

function buildRepository(): MockRepository {
  return {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
  };
}

describe('UsersService', () => {
  let service: UsersService;
  let repository: MockRepository;

  beforeEach(() => {
    repository = buildRepository();
    service = new UsersService(repository as unknown as Repository<User>);
  });

  it('creates a user', async () => {
    const input = { name: 'Ada', email: 'ada@example.com', passwordHash: 'hash' };
    const created = { id: '1', ...input, createdAt: new Date(), updatedAt: new Date() };
    repository.create.mockReturnValue(created);
    repository.save.mockResolvedValue(created);

    const result = await service.create(input);

    expect(repository.create).toHaveBeenCalledWith(input);
    expect(result).toBe(created);
  });

  it('throws ConflictException when the email is already taken', async () => {
    const input = { name: 'Ada', email: 'ada@example.com', passwordHash: 'hash' };
    repository.create.mockReturnValue(input);
    repository.save.mockRejectedValue({ code: '23505' });

    await expect(service.create(input)).rejects.toBeInstanceOf(ConflictException);
  });

  it('rethrows unexpected errors', async () => {
    const input = { name: 'Ada', email: 'ada@example.com', passwordHash: 'hash' };
    repository.create.mockReturnValue(input);
    const error = new Error('connection lost');
    repository.save.mockRejectedValue(error);

    await expect(service.create(input)).rejects.toBe(error);
  });

  it('finds a user by email', async () => {
    const user = { id: '1', email: 'ada@example.com' } as User;
    repository.findOne.mockResolvedValue(user);

    const result = await service.findByEmail('ada@example.com');

    expect(repository.findOne).toHaveBeenCalledWith({ where: { email: 'ada@example.com' } });
    expect(result).toBe(user);
  });

  it('finds a user by id', async () => {
    const user = { id: '1', email: 'ada@example.com' } as User;
    repository.findOne.mockResolvedValue(user);

    const result = await service.findById('1');

    expect(repository.findOne).toHaveBeenCalledWith({ where: { id: '1' } });
    expect(result).toBe(user);
  });
});
