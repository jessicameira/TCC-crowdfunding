import { useEffect, useState } from 'react';
import { getRecommendedEvents } from '../lib/api';
import { toCulturalEvent } from '../lib/event-adapters';
import { useAuth } from '../hooks/useAuth';
import { getAccessToken } from '../lib/auth-storage';
import EventGrid from './EventGrid';
import type { CulturalEvent } from '../types/event';

// Só aparece pra quem tá logado e já tem histórico de interesse — sem isso não tem
// base nenhuma pra recomendar nada (o backend devolve lista vazia nesse caso).
function RecommendedEventsSection() {
  const { user } = useAuth();
  const [events, setEvents] = useState<CulturalEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    if (!user || !token) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    getRecommendedEvents(token)
      .then((apiEvents) => setEvents(apiEvents.map(toCulturalEvent)))
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Erro ao buscar recomendações.'),
      )
      .finally(() => setIsLoading(false));
  }, [user]);

  if (!user || (!isLoading && !error && events.length === 0)) {
    return null;
  }

  return (
    <section className="mx-auto max-w-7xl px-6 pb-12">
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight">Recomendados para você</h2>
        <p className="text-gray-500">Baseado nos eventos que você já demonstrou interesse.</p>
      </div>

      <EventGrid events={events} isLoading={isLoading} error={error} emptyMessage="" />
    </section>
  );
}

export default RecommendedEventsSection;
