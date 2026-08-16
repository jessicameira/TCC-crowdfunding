import { Module } from '@nestjs/common';

// A recomendação básica (distância + data + disponibilidade) é basicamente o mesmo
// pipeline de "eventos próximos": localização -> PostGIS -> eventos perto -> ordena
// por distância/data. Por isso implementei direto em GET /events/nearby
// (EventsService.findNearby) em vez de criar um endpoint separado que ia duplicar a
// mesma query. Esse módulo fica reservado pra recomendação por categoria/interesse,
// se algum dia houver a implementação.
@Module({})
export class RecommendationsModule {}
