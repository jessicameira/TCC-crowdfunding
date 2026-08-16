import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Artist } from './entities/artist.entity';
import { CreateArtistDto } from './dto/create-artist.dto';

@Injectable()
export class ArtistsService {
  constructor(
    @InjectRepository(Artist)
    private readonly artistsRepository: Repository<Artist>,
  ) {}

  create(dto: CreateArtistDto): Promise<Artist> {
    const artist = this.artistsRepository.create({
      name: dto.name,
      description: dto.description ?? null,
      location: { type: 'Point', coordinates: [dto.longitude, dto.latitude] },
    });

    return this.artistsRepository.save(artist);
  }

  findAll(): Promise<Artist[]> {
    return this.artistsRepository.find();
  }

  async findById(id: string): Promise<Artist> {
    const artist = await this.artistsRepository.findOne({ where: { id } });

    if (!artist) {
      throw new NotFoundException('Artista não encontrado');
    }

    return artist;
  }
}
