const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
};

export type AuthResponse = {
  user: AuthUser;
  accessToken: string;
};

type ApiErrorBody = {
  message?: string | string[];
};

async function parseResponse<T>(response: Response): Promise<T> {
  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const errorBody = body as ApiErrorBody | null;
    const message = Array.isArray(errorBody?.message)
      ? errorBody.message.join(', ')
      : (errorBody?.message ?? 'Erro inesperado. Tente novamente.');
    throw new Error(message);
  }

  return body as T;
}

function postJson<T>(path: string, input: unknown): Promise<T> {
  return fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  }).then((response) => parseResponse<T>(response));
}

export function register(input: { name: string; email: string; password: string }) {
  return postJson<AuthResponse>('/auth/register', input);
}

export function login(input: { email: string; password: string }) {
  return postJson<AuthResponse>('/auth/login', input);
}

export function getMe(accessToken: string) {
  return fetch(`${API_URL}/users/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  }).then((response) => parseResponse<AuthUser>(response));
}

export type ApiEvent = {
  id: string;
  artistId: string;
  name: string;
  description: string | null;
  eventDate: string;
  capacity: number;
  minimumQuorum: number;
  currentInterest: number;
  priceCents: number;
  latitude: number;
  longitude: number;
  status: 'DRAFT' | 'OPEN' | 'QUORUM_REACHED' | 'CONFIRMED' | 'CANCELLED' | 'SOLD_OUT' | 'COMPLETED';
  createdAt: string;
};

export type NearbyApiEvent = ApiEvent & { distanceKm: number };

export function getNearbyEvents(params: { latitude: number; longitude: number; radiusKm?: number }) {
  const query = new URLSearchParams({
    latitude: String(params.latitude),
    longitude: String(params.longitude),
  });
  if (params.radiusKm) {
    query.set('radiusKm', String(params.radiusKm));
  }

  return fetch(`${API_URL}/events/nearby?${query.toString()}`).then((response) =>
    parseResponse<NearbyApiEvent[]>(response),
  );
}

export function getRecommendedEvents(accessToken: string) {
  return fetch(`${API_URL}/events/recommended`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  }).then((response) => parseResponse<NearbyApiEvent[]>(response));
}

export function getEvent(eventId: string) {
  return fetch(`${API_URL}/events/${eventId}`).then((response) => parseResponse<ApiEvent>(response));
}

export function manifestInterest(eventId: string, accessToken: string) {
  return fetch(`${API_URL}/events/${eventId}/interests`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  }).then((response) => parseResponse<ApiEvent>(response));
}
