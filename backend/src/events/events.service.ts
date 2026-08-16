import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ArtistsService } from '../artists/artists.service';
import { Event } from './entities/event.entity';
import { EventStatus } from './event-status.enum';
import { EventStateMachine } from './event-state-machine';
import { CreateEventDto } from './dto/create-event.dto';
import { NearbyEventsQueryDto } from './dto/nearby-events-query.dto';
import { NearbyEventRow } from './event.mapper';
import { QueuesService } from '../queues/queues.service';
import { EventInterest } from '../interests/entities/event-interest.entity';

const DEFAULT_NEARBY_RADIUS_KM = 10;
const RECOMMENDED_RADIUS_KM = 50;
const RECENT_INTERESTS_LIMIT = 5;
// São os status de evento que ainda fazem sentido aparecer numa busca de descoberta/recomendação
// quem já não tá mais aceitando interesse (CONFIRMED, CANCELLED etc.) não devia ser recomendado
// Definido essa lista aqui de novo (em vez de reaproveitar a do InterestsService) é uma regra diferente
// só que hoje tem o mesmo valor. Não necessariamente vai continuar igual.
const DISCOVERABLE_STATUSES = [EventStatus.OPEN, EventStatus.QUORUM_REACHED];

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private readonly eventsRepository: Repository<Event>,
    @InjectRepository(EventInterest)
    private readonly interestsRepository: Repository<EventInterest>,
    private readonly artistsService: ArtistsService,
    private readonly stateMachine: EventStateMachine,
    private readonly queuesService: QueuesService,
  ) {}

  async create(dto: CreateEventDto): Promise<Event> {
    await this.artistsService.findById(dto.artistId);

    if (dto.minimumQuorum > dto.capacity) {
      throw new BadRequestException('minimumQuorum não pode ser maior que capacity');
    }

    const event = this.eventsRepository.create({
      artistId: dto.artistId,
      name: dto.name,
      description: dto.description ?? null,
      eventDate: new Date(dto.eventDate),
      capacity: dto.capacity,
      minimumQuorum: dto.minimumQuorum,
      priceCents: dto.priceCents,
      currentInterest: 0,
      location: { type: 'Point', coordinates: [dto.longitude, dto.latitude] },
      status: EventStatus.DRAFT,
    });

    return this.eventsRepository.save(event);
  }

  findAll(): Promise<Event[]> {
    return this.eventsRepository.find();
  }

  async findById(id: string): Promise<Event> {
    const event = await this.eventsRepository.findOne({ where: { id } });

    if (!event) {
      throw new NotFoundException('Evento não encontrado');
    }

    return event;
  }

  async updateStatus(id: string, status: EventStatus): Promise<Event> {
    const event = await this.findById(id);
    this.stateMachine.assertTransition(event.status, status);
    event.status = status;

    const saved = await this.eventsRepository.save(event);

    // Quando o evento é confirmado, dispara a criação do processo de pagamento.
    // Enfileirando em vez de chamar direto pra não acoplar o EventsModule ao PaymentsModule
    // mesma ideia de desacoplar via fila que já usada pro QUORUM_REACHED.
    if (status === EventStatus.CONFIRMED) {
      await this.queuesService.enqueueEventConfirmed(id);
    }

    return saved;
  }

  // Essa query de proximidade também serve como a recomendação básica: localização ->PostGIS ->
  // eventos perto -> ordena por distância/data. Por isso não existe uma feature de recomendação separada, 
  // iria só duplicar a mesma consulta. O ST_DWithin usa o índice GIST em location pra isso rodar rápido.
  findNearby(query: NearbyEventsQueryDto): Promise<NearbyEventRow[]> {
    const radiusMeters = (query.radiusKm ?? DEFAULT_NEARBY_RADIUS_KM) * 1000;

    return this.eventsRepository.query(
      `SELECT
         "id", "artistId", "name", "description", "eventDate", "capacity",
         "minimumQuorum", "currentInterest", "priceCents", "status", "createdAt",
         ST_X("location"::geometry) AS "longitude",
         ST_Y("location"::geometry) AS "latitude",
         ST_Distance("location", ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) AS "distanceMeters"
       FROM "events"
       WHERE "status" = ANY($3)
         AND ST_DWithin("location", ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $4)
       ORDER BY "distanceMeters" ASC, "eventDate" ASC`,
      [query.longitude, query.latitude, DISCOVERABLE_STATUSES, radiusMeters],
    );
  }

  // Recomendação personalizada simples: como evento não tem categoria cadastrada,
  // usamos a localização do evento mais recente que o usuário se interessou como
  // referência pra achar eventos parecidos, excluindo os que ele já manifestou interesse
  // Se o usuário não tem histórico, volta lista vazia e o frontend cai pra busca por proximidade simples
  async findRecommendedForUser(userId: string): Promise<NearbyEventRow[]> {
    const recentInterests = await this.interestsRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: RECENT_INTERESTS_LIMIT,
    });

    if (recentInterests.length === 0) {
      return [];
    }

    const interestedEventIds = recentInterests.map((interest) => interest.eventId);
    const referenceEvent = await this.eventsRepository.findOne({
      where: { id: interestedEventIds[0] },
    });

    if (!referenceEvent) {
      return [];
    }

    const [longitude, latitude] = referenceEvent.location.coordinates;
    const radiusMeters = RECOMMENDED_RADIUS_KM * 1000;

    return this.eventsRepository.query(
      `SELECT
         "id", "artistId", "name", "description", "eventDate", "capacity",
         "minimumQuorum", "currentInterest", "priceCents", "status", "createdAt",
         ST_X("location"::geometry) AS "longitude",
         ST_Y("location"::geometry) AS "latitude",
         ST_Distance("location", ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) AS "distanceMeters"
       FROM "events"
       WHERE "status" = ANY($3)
         AND NOT ("id" = ANY($4::uuid[]))
         AND ST_DWithin("location", ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $5)
       ORDER BY "distanceMeters" ASC, "eventDate" ASC
       LIMIT 20`,
      [longitude, latitude, DISCOVERABLE_STATUSES, interestedEventIds, radiusMeters],
    );
  }
}
