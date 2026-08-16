import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { ArtistsService } from './artists.service';
import { Artist } from './entities/artist.entity';
import { CreateArtistDto } from './dto/create-artist.dto';

type MockRepository = {
  create: jest.Mock<Partial<Artist>, [Partial<Artist>]>;
  save: jest.Mock<Promise<Artist>, [Partial<Artist>]>;
  find: jest.Mock<Promise<Artist[]>, []>;
  findOne: jest.Mock<Promise<Artist | null>, [{ where: { id: string } }]>;
};

function buildRepository(): MockRepository {
  return {
    create: jest.fn<Partial<Artist>, [Partial<Artist>]>(),
    save: jest.fn<Promise<Artist>, [Partial<Artist>]>(),
    find: jest.fn<Promise<Artist[]>, []>(),
    findOne: jest.fn<Promise<Artist | null>, [{ where: { id: string } }]>(),
  };
}

describe('ArtistsService', () => {
  let service: ArtistsService;
  let repository: MockRepository;

  beforeEach(() => {
    repository = buildRepository();
    service = new ArtistsService(repository as unknown as Repository<Artist>);
  });

  it('converts latitude/longitude into a GeoJSON Point before saving', async () => {
    const dto: CreateArtistDto = {
      name: 'Cia de Teatro Curitiba',
      description: 'Grupo de teatro independente',
      latitude: -25.4284,
      longitude: -49.2733,
    };
    repository.create.mockImplementation((input) => input);
    repository.save.mockImplementation((input) => Promise.resolve({ id: '1', ...input } as Artist));

    await service.create(dto);

    expect(repository.create).toHaveBeenCalledWith({
      name: 'Cia de Teatro Curitiba',
      description: 'Grupo de teatro independente',
      location: { type: 'Point', coordinates: [-49.2733, -25.4284] },
    });
  });

  it('defaults description to null when not provided', async () => {
    const dto: CreateArtistDto = {
      name: 'Cia de Teatro Curitiba',
      latitude: -25.4284,
      longitude: -49.2733,
    };
    repository.create.mockImplementation((input) => input);
    repository.save.mockImplementation((input) => Promise.resolve({ id: '1', ...input } as Artist));

    await service.create(dto);

    const [[createArgs]] = repository.create.mock.calls;
    expect(createArgs.description).toBeNull();
  });

  it('throws NotFoundException when the artist does not exist', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(service.findById('missing-id')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns the artist when found', async () => {
    const artist = { id: '1', name: 'Cia de Teatro Curitiba' } as Artist;
    repository.findOne.mockResolvedValue(artist);

    const result = await service.findById('1');

    expect(result).toBe(artist);
  });
});
