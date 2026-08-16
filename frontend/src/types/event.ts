export type EventAccent = 'primary' | 'secondary';

export type EventHighlight = {
  icon: string;
  label: string;
  accent: EventAccent;
  filled?: boolean;
};

export type CulturalEvent = {
  id: string;
  title: string;
  category?: string;
  image?: string;
  date: string;
  location: string;
  confirmed: number;
  capacity: number;
  accent: EventAccent;
  highlight?: EventHighlight;
};
