import { useEffect, useState } from 'react';
import { getNearbyEvents } from '../lib/api';
import { toCulturalEvent } from '../lib/event-adapters';
import { useGeolocation } from '../hooks/useGeolocation';
import EventGrid from './EventGrid';
import type { CulturalEvent } from '../types/event';

const NEARBY_RADIUS_KM = 20;

function NearbyEventsSection() {
  const { coordinates, isFallback, isLoading: isLocating } = useGeolocation();
  const [events, setEvents] = useState<CulturalEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLocating) {
      return;
    }

    setIsLoading(true);
    setError(null);

    getNearbyEvents({
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      radiusKm: NEARBY_RADIUS_KM,
    })
      .then((apiEvents) => setEvents(apiEvents.map(toCulturalEvent)))
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Erro ao buscar eventos próximos.'),
      )
      .finally(() => setIsLoading(false));
  }, [isLocating, coordinates.latitude, coordinates.longitude]);

  return (
    <section className="mx-auto max-w-7xl px-6 py-12">
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight">Eventos perto de você</h2>
        <p className="text-gray-500">
          {isFallback
            ? 'Mostrando eventos perto de Curitiba, PR — ative a localização do navegador para ver eventos perto de você de verdade.'
            : 'Com base na sua localização atual.'}
        </p>
      </div>

      <EventGrid
        events={events}
        isLoading={isLoading || isLocating}
        error={error}
        emptyMessage={`Nenhum evento em um raio de ${NEARBY_RADIUS_KM} km no momento.`}
      />
    </section>
  );
}

export default NearbyEventsSection;
