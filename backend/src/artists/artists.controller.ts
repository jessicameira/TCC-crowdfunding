import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ArtistsService } from './artists.service';
import { CreateArtistDto } from './dto/create-artist.dto';
import { toArtistProfile } from './artist.mapper';

@Controller('artists')
export class ArtistsController {
  constructor(private readonly artistsService: ArtistsService) {}

  @Post()
  async create(@Body() dto: CreateArtistDto) {
    const artist = await this.artistsService.create(dto);
    return toArtistProfile(artist);
  }

  @Get()
  async findAll() {
    const artists = await this.artistsService.findAll();
    return artists.map(toArtistProfile);
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const artist = await this.artistsService.findById(id);
    return toArtistProfile(artist);
  }
}
