import { useEffect, useState } from 'react';

export type Coordinates = {
  latitude: number;
  longitude: number;
};

// Curitiba é a mesma cidade que já aparece fixa no cabeçalho. Usamos isso de
// fallback quando o navegador não dá a geolocalização ou o usuário nega, assim a
// página nunca fica sem nenhum evento próximo pra mostrar.
const FALLBACK_COORDINATES: Coordinates = { latitude: -25.4284, longitude: -49.2733 };

export function useGeolocation(): {
  coordinates: Coordinates;
  isFallback: boolean;
  isLoading: boolean;
} {
  const [coordinates, setCoordinates] = useState<Coordinates>(FALLBACK_COORDINATES);
  const [isFallback, setIsFallback] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!navigator.geolocation) {
      setIsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoordinates({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setIsFallback(false);
        setIsLoading(false);
      },
      () => {
        setIsLoading(false);
      },
      { timeout: 8000 },
    );
  }, []);

  return { coordinates, isFallback, isLoading };
}
