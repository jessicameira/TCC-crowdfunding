import { Event } from './entities/event.entity';
import { EventStatus } from './event-status.enum';

export type EventProfile = {
  id: string;
  artistId: string;
  name: string;
  description: string | null;
  eventDate: Date;
  capacity: number;
  minimumQuorum: number;
  currentInterest: number;
  priceCents: number;
  latitude: number;
  longitude: number;
  status: EventStatus;
  createdAt: Date;
};

export function toEventProfile(event: Event): EventProfile {
  const [longitude, latitude] = event.location.coordinates;
  return {
    id: event.id,
    artistId: event.artistId,
    name: event.name,
    description: event.description,
    eventDate: event.eventDate,
    capacity: event.capacity,
    minimumQuorum: event.minimumQuorum,
    currentInterest: event.currentInterest,
    priceCents: event.priceCents,
    latitude,
    longitude,
    status: event.status,
    createdAt: event.createdAt,
  };
}

export type NearbyEventRow = {
  id: string;
  artistId: string;
  name: string;
  description: string | null;
  eventDate: Date;
  capacity: number;
  minimumQuorum: number;
  currentInterest: number;
  priceCents: number;
  status: EventStatus;
  createdAt: Date;
  longitude: number;
  latitude: number;
  distanceMeters: number;
};

export type NearbyEventProfile = EventProfile & { distanceKm: number };

export function toNearbyEventProfile(row: NearbyEventRow): NearbyEventProfile {
  return {
    id: row.id,
    artistId: row.artistId,
    name: row.name,
    description: row.description,
    eventDate: row.eventDate,
    capacity: row.capacity,
    minimumQuorum: row.minimumQuorum,
    currentInterest: row.currentInterest,
    priceCents: row.priceCents,
    latitude: row.latitude,
    longitude: row.longitude,
    status: row.status,
    createdAt: row.createdAt,
    distanceKm: row.distanceMeters / 1000,
  };
}
