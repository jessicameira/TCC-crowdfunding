import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Icon from '../components/Icon';
import { getEvent, manifestInterest, type ApiEvent } from '../lib/api';
import { toCulturalEvent, formatEventDate } from '../lib/event-adapters';
import { useAuth } from '../hooks/useAuth';
import { getAccessToken } from '../lib/auth-storage';

function EventDetailPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [event, setEvent] = useState<ApiEvent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [interestError, setInterestError] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId) {
      return;
    }

    setIsLoading(true);
    setLoadError(null);

    getEvent(eventId)
      .then(setEvent)
      .catch((err) =>
        setLoadError(err instanceof Error ? err.message : 'Evento não encontrado.'),
      )
      .finally(() => setIsLoading(false));
  }, [eventId]);

  async function handleInterest() {
    if (!eventId) {
      return;
    }

    const token = getAccessToken();
    if (!user || !token) {
      navigate('/login');
      return;
    }

    setIsSubmitting(true);
    setInterestError(null);

    try {
      const updated = await manifestInterest(eventId, token);
      setEvent(updated);
    } catch (err) {
      setInterestError(
        err instanceof Error ? err.message : 'Não foi possível manifestar interesse.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <section className="mx-auto max-w-4xl px-6 py-24 text-center text-gray-500 dark:text-gray-400">
        Carregando evento...
      </section>
    );
  }

  if (loadError || !event) {
    return (
      <section className="mx-auto flex max-w-2xl flex-col items-center gap-4 px-6 py-24 text-center">
        <h1 className="text-2xl font-bold">Evento não encontrado</h1>
        <p className="text-gray-500 dark:text-gray-400">
          O evento que você procura não existe ou foi removido.
        </p>
        <Link to="/" className="font-bold text-primary hover:underline">
          Voltar para a página inicial
        </Link>
      </section>
    );
  }

  const culturalEvent = toCulturalEvent(event);
  const progressPercent =
    event.capacity > 0 ? Math.round((event.currentInterest / event.capacity) * 100) : 0;
  const accentBg = culturalEvent.accent === 'primary' ? 'bg-primary' : 'bg-secondary';
  const accentText = culturalEvent.accent === 'primary' ? 'text-primary' : 'text-secondary';

  return (
    <section className="mx-auto max-w-4xl px-6 py-12">
      <Link
        to="/"
        className="mb-6 inline-flex items-center gap-1 text-sm font-semibold text-gray-500 hover:text-primary"
      >
        <Icon name="arrow_back" className="text-sm" />
        Voltar
      </Link>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-white/10 dark:bg-white/5">
        <div className="flex aspect-video items-center justify-center overflow-hidden bg-gradient-to-br from-primary/15 to-secondary/15">
          <Icon name="event" className="text-6xl text-primary/40" />
        </div>

        <div className="p-8">
          <h1 className="text-3xl font-black tracking-tight">{event.name}</h1>
          {event.description && (
            <p className="mt-2 text-gray-600 dark:text-gray-400">{event.description}</p>
          )}
          <div className="mt-3 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Icon name="calendar_month" className="text-sm" />
            {formatEventDate(event.eventDate)}
          </div>

          <div className="mt-8">
            <div className="mb-2 flex items-end justify-between">
              <span className={`text-sm font-bold ${accentText}`}>{progressPercent}% completo</span>
              <span className="text-xs font-medium text-gray-500">
                {event.currentInterest} / {event.capacity} confirmados
              </span>
            </div>
            <div className="mb-6 h-2.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
              <div
                className={`progress-glow h-full rounded-full transition-all duration-1000 ${accentBg}`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {interestError && (
              <p className="mb-3 text-sm font-semibold text-red-600">{interestError}</p>
            )}
            <button
              onClick={handleInterest}
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-bold text-white transition-all hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:px-8"
            >
              {isSubmitting ? 'Enviando...' : 'Quero participar'}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default EventDetailPage;
