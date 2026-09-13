/** [dayNumber, title, body, walkHours, altitude, lodging, meals] */
export type SeedDay = [number, string, string, string, string, string, string];

/** [label, lucide icon name] */
export type SeedAmenity = [string, string];

/** [ISO date, seats total, seats left, price override?] */
export type SeedDeparture = [string, number, number, number?];

export interface SeedTrip {
  title: string;
  slug: string;
  country: string;
  location: string;
  summary: string;
  overview: string;
  priceFrom: number;
  durationDays: number;
  difficulty: 'Easy' | 'Moderate' | 'Challenging' | 'Strenuous';
  groupSizeMax: number;
  maxAltitude?: number;
  bestSeason: string;
  rating: number;
  reviewCount: number;
  badge?: string;
  isFeatured: boolean;
  activities: string[];
  /** [url, alt] */
  photos: [string, string][];
  highlights: string[];
  days: SeedDay[];
  included: SeedAmenity[];
  excluded: SeedAmenity[];
  faq?: { q: string; a: string }[];
  packing?: string[];
  departures: SeedDeparture[];
}
