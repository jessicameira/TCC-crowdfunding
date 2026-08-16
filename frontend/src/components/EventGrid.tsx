import EventCard from './EventCard';
import type { CulturalEvent } from '../types/event';

type EventGridProps = {
  events: CulturalEvent[];
  isLoading: boolean;
  error: string | null;
  emptyMessage: string;
};

function EventGrid({ events, isLoading, error, emptyMessage }: EventGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((key) => (
          <div
            key={key}
            className="h-80 animate-pulse rounded-2xl bg-gray-100 dark:bg-white/5"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">{error}</p>;
  }

  if (events.length === 0) {
    return emptyMessage ? (
      <p className="text-sm text-gray-500 dark:text-gray-400">{emptyMessage}</p>
    ) : null;
  }

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
      {events.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  );
}

export default EventGrid;
