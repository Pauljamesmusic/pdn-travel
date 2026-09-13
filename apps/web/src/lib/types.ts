export interface Socials {
  facebook?: string;
  instagram?: string;
  twitter?: string;
  linkedin?: string;
  youtube?: string;
}

export interface SiteSettings {
  brandName: string;
  legalName: string;
  tagline: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  officeHours: string;
  footerBlurb: string;
  mapQuery: string;
  socials: Socials;
  affiliation: { label: string; url: string };
}

export interface Headline {
  eyebrow?: string;
  titleLead?: string;
  titleAccent?: string;
  titleTail?: string;
  body?: string;
}

export interface HomeSettings {
  announcement: { tag: string; text: string; link: string };
  heroMarker: { eyebrow: string; text: string };
  heroSlides: Headline[];
  stats: { value: string; label: string }[];
  continents: Headline;
  countries: Headline;
  trips: Headline;
  activities: Headline;
  why: {
    eyebrow: string;
    title: string;
    body: string;
    facts: { value: string; label: string }[];
    features: { icon: string; title: string; body: string; accent?: boolean }[];
  };
  event: {
    chip: string;
    titleLead: string;
    titleAccent: string;
    body: string;
    date: string;
    dateLabel: string;
    location: string;
    primaryLabel: string;
    primaryLink: string;
    secondaryLabel: string;
    countdownLabel: string;
  };
  testimonials: Headline;
  newsletter: Headline;
}

export interface NamedLink {
  name: string;
  slug: string;
  icon?: string;
}

export interface SiteData {
  settings: { site?: SiteSettings; home?: HomeSettings };
  supportPages: { slug: string; title: string }[];
  continents: NamedLink[];
  activities: NamedLink[];
}

export interface TripCard {
  id: number;
  title: string;
  slug: string;
  location: string | null;
  summary: string;
  priceFrom: number;
  currency: string;
  durationDays: number;
  difficulty: string;
  rating: number;
  reviewCount: number;
  badge: string | null;
  coverImage: string | null;
  isFeatured: boolean;
  country: NamedLink;
  continent: NamedLink;
  activities: NamedLink[];
  photos: string[];
  photoCount: number;
}

export interface CountrySummary {
  id: number;
  name: string;
  slug: string;
  region: string | null;
  image: string | null;
  highlight: string | null;
  tripCount: number;
  priceFrom: number | null;
  continent?: NamedLink;
}

export interface ContinentSummary {
  id: number;
  name: string;
  slug: string;
  tagline: string | null;
  image: string | null;
  countryCount: number;
  tripCount: number;
  countries: CountrySummary[];
}

export interface Activity {
  id: number;
  name: string;
  slug: string;
  icon: string;
  description: string | null;
  image: string | null;
  tripCount: number;
}

export interface Testimonial {
  id: number;
  name: string;
  location: string | null;
  trip: string | null;
  rating: number;
  quote: string;
  avatar: string | null;
}

export interface HomeData {
  continents: ContinentSummary[];
  featuredCountries: CountrySummary[];
  featuredTrips: TripCard[];
  activities: Activity[];
  testimonials: Testimonial[];
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

export interface Filters {
  continents: (NamedLink & { countries: NamedLink[] })[];
  activities: NamedLink[];
  difficulties: string[];
  price: { min: number; max: number };
  days: { min: number; max: number };
}

export interface TripDay {
  id: number;
  dayNumber: number;
  title: string;
  body: string;
  walkHours: string | null;
  altitude: string | null;
  lodging: string | null;
  meals: string | null;
}

export interface TripAmenity {
  id: number;
  label: string;
  icon: string;
  included: boolean;
}

export interface Departure {
  id: number;
  startDate: string;
  seatsTotal: number;
  seatsLeft: number;
  priceOverride: number | null;
}

export type SectionType =
  | 'overview'
  | 'highlights'
  | 'itinerary'
  | 'inclusions'
  | 'departures'
  | 'faq'
  | 'list'
  | 'richText'
  | 'gallery'
  | 'notice';

export interface TripSection {
  id?: number;
  type: SectionType;
  title: string;
  isVisible: boolean;
  content: {
    body?: string;
    items?: (string | { q: string; a: string })[];
    images?: { url: string; alt: string }[];
    note?: string;
    tone?: 'info' | 'warning';
  };
}

export interface TripDetail {
  id: number;
  title: string;
  slug: string;
  location: string | null;
  summary: string;
  priceFrom: number;
  currency: string;
  durationDays: number;
  difficulty: string;
  groupSizeMax: number | null;
  maxAltitude: number | null;
  bestSeason: string | null;
  rating: number;
  reviewCount: number;
  badge: string | null;
  coverImage: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  country: { name: string; slug: string; continent: NamedLink };
  activities: NamedLink[];
  photos: { id: number; url: string; alt: string }[];
  days: TripDay[];
  amenities: TripAmenity[];
  sections: TripSection[];
  departures: Departure[];
  related: TripCard[];
}

export interface PageBlock {
  type: string;
  [key: string]: unknown;
}

export interface CmsPage {
  id: number;
  slug: string;
  title: string;
  eyebrow: string | null;
  subtitle: string | null;
  heroImage: string | null;
  sections: PageBlock[];
  metaDescription: string | null;
  updatedAt: string;
}

export interface SearchResult {
  query: string;
  groups: { continent: NamedLink; countries: (NamedLink & { tripCount: number; priceFrom: number | null; image: string | null })[] }[];
  trips: TripCard[];
  activities: NamedLink[];
}
