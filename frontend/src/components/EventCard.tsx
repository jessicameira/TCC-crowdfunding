import { Link } from 'react-router-dom';
import Icon from './Icon';
import type { CulturalEvent } from '../types/event';

type EventCardProps = {
  event: CulturalEvent;
};

function EventCard({ event }: EventCardProps) {
  const progressPercent = Math.round((event.confirmed / event.capacity) * 100);
  const accentBg = event.accent === 'primary' ? 'bg-primary' : 'bg-secondary';
  const accentText = event.accent === 'primary' ? 'text-primary' : 'text-secondary';

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all hover:shadow-xl dark:border-white/10 dark:bg-white/5">
      <div className="relative aspect-video overflow-hidden">
        {event.category && (
          <div className="absolute left-3 top-3 z-10 rounded-md bg-primary/90 px-2 py-1 text-[10px] font-bold uppercase text-white">
            {event.category}
          </div>
        )}
        {event.highlight && (
          <div
            className={`absolute right-3 top-3 z-10 flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold uppercase ${
              event.highlight.accent === 'primary'
                ? 'bg-accent-yellow text-black'
                : 'bg-secondary text-white'
            }`}
          >
            <Icon name={event.highlight.icon} className="text-[12px]" filled={event.highlight.filled} />
            {event.highlight.label}
          </div>
        )}
        {event.image ? (
          <img
            src={event.image}
            alt={event.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/15 to-secondary/15 transition-transform duration-500 group-hover:scale-105">
            <Icon name="event" className="text-5xl text-primary/40" />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-6">
        <Link to={`/eventos/${event.id}`}>
          <h3 className="mb-1 text-xl font-bold transition-colors group-hover:text-primary">
            {event.title}
          </h3>
        </Link>
        <div className="mb-4 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Icon name="calendar_month" className="text-sm" />
          {event.date}
          <span className="text-gray-300">•</span>
          <Icon name="location_on" className="text-sm" />
          {event.location}
        </div>

        <div className="mt-auto">
          <div className="mb-2 flex items-end justify-between">
            <span className={`text-sm font-bold ${accentText}`}>{progressPercent}% completo</span>
            <span className="text-xs font-medium text-gray-500">
              {event.confirmed} / {event.capacity} confirmados
            </span>
          </div>
          <div className="mb-6 h-2.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
            <div
              className={`progress-glow h-full rounded-full transition-all duration-1000 ${accentBg}`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <Link
            to={`/eventos/${event.id}`}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-bold text-white transition-all hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20"
          >
            Quero participar
          </Link>
        </div>
      </div>
    </div>
  );
}

export default EventCard;
