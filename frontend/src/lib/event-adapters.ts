import type { ApiEvent, NearbyApiEvent } from './api';
import type { CulturalEvent } from '../types/event';

const DATE_FORMATTER = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' });

export function formatEventDate(isoDate: string): string {
  return DATE_FORMATTER.format(new Date(isoDate)).replace('.', '');
}

function isNearbyEvent(event: ApiEvent | NearbyApiEvent): event is NearbyApiEvent {
  return 'distanceKm' in event;
}

// O backend ainda não tem imagem/categoria pros eventos, o EventCard já lida com
// isso (mostra um placeholder e esconde o selo). O highlight vem do progresso real de interesse.
export function toCulturalEvent(event: ApiEvent | NearbyApiEvent): CulturalEvent {
  const progressRatio = event.capacity > 0 ? event.currentInterest / event.capacity : 0;
  const location = isNearbyEvent(event)
    ? `${event.distanceKm < 1 ? '< 1' : event.distanceKm.toFixed(0)} km de você`
    : 'Local a confirmar';

  const highlight =
    event.status === 'QUORUM_REACHED'
      ? { icon: 'stars', label: 'Quórum atingido!', accent: 'primary' as const, filled: true }
      : progressRatio >= 0.8
        ? { icon: 'timer', label: 'Quase lá!', accent: 'secondary' as const }
        : undefined;

  return {
    id: event.id,
    title: event.name,
    date: formatEventDate(event.eventDate),
    location,
    confirmed: event.currentInterest,
    capacity: event.capacity,
    accent: event.status === 'QUORUM_REACHED' ? 'secondary' : 'primary',
    highlight,
  };
}
