import { Artist } from './entities/artist.entity';

export type ArtistProfile = {
  id: string;
  name: string;
  description: string | null;
  latitude: number;
  longitude: number;
  createdAt: Date;
};

export function toArtistProfile(artist: Artist): ArtistProfile {
  const [longitude, latitude] = artist.location.coordinates;
  return {
    id: artist.id,
    name: artist.name,
    description: artist.description,
    latitude,
    longitude,
    createdAt: artist.createdAt,
  };
}
