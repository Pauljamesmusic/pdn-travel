import type { SectionType } from '../../lib/types';

let counter = 0;
/** Stable client-side keys so list rows keep focus while being reordered. */
export const uid = () => `k${Date.now().toString(36)}${(counter++).toString(36)}`;

export const DIFFICULTIES = ['Easy', 'Moderate', 'Challenging', 'Strenuous'];
export const CURRENCIES = ['USD', 'EUR', 'GBP', 'AED', 'INR', 'NPR', 'AUD'];

export type TabId = 'overview' | 'photos' | 'itinerary' | 'sections' | 'inclusions' | 'pricing' | 'seo';

export interface PhotoForm {
  key: string;
  url: string;
  alt: string;
}

export interface DayForm {
  key: string;
  dayNumber: number;
  title: string;
  body: string;
  walkHours: string;
  altitude: string;
  lodging: string;
  meals: string;
}

export interface AmenityForm {
  key: string;
  label: string;
  icon: string;
  included: boolean;
}

export interface DepartureForm {
  key: string;
  startDate: string;
  seatsTotal: number;
  seatsLeft: number;
  priceOverride: number | null;
}

export interface SectionForm {
  key: string;
  type: SectionType;
  title: string;
  isVisible: boolean;
  content: Record<string, unknown>;
}

export interface TripForm {
  title: string;
  slug: string;
  countryId: number | '';
  location: string;
  summary: string;
  priceFrom: number;
  currency: string;
  durationDays: number;
  difficulty: string;
  groupSizeMax: number | null;
  maxAltitude: number | null;
  bestSeason: string;
  rating: number;
  reviewCount: number;
  badge: string;
  coverImage: string;
  isPublished: boolean;
  isFeatured: boolean;
  sortOrder: number;
  metaTitle: string;
  metaDescription: string;
  activityIds: number[];
  photos: PhotoForm[];
  days: DayForm[];
  amenities: AmenityForm[];
  sections: SectionForm[];
  departures: DepartureForm[];
}

export const SECTION_TYPES: SectionType[] = ['overview', 'highlights', 'itinerary', 'inclusions', 'departures', 'faq', 'list', 'richText', 'gallery', 'notice'];

export const SECTION_META: Record<SectionType, { label: string; hint: string; icon: string; defaultTitle: string; defaultContent: () => Record<string, unknown> }> = {
  overview: { label: 'Overview', hint: 'Intro text at the top of the trip page', icon: 'compass', defaultTitle: 'Overview', defaultContent: () => ({ body: '' }) },
  highlights: { label: 'Highlights', hint: 'Bullet list with green ticks', icon: 'sparkles', defaultTitle: 'Trip highlights', defaultContent: () => ({ items: [] }) },
  itinerary: { label: 'Itinerary', hint: 'Shows the days from the Itinerary tab', icon: 'map', defaultTitle: 'Itinerary', defaultContent: () => ({}) },
  inclusions: { label: 'Included & excluded', hint: 'Shows the items from the Inclusions tab', icon: 'check', defaultTitle: 'What’s included', defaultContent: () => ({}) },
  departures: { label: 'Dates & availability', hint: 'Shows upcoming dates from the Pricing tab', icon: 'ticket', defaultTitle: 'Dates & availability', defaultContent: () => ({ note: '' }) },
  faq: { label: 'FAQ', hint: 'Questions and answers', icon: 'messages-square', defaultTitle: 'Frequently asked questions', defaultContent: () => ({ items: [] }) },
  list: { label: 'Bullet list', hint: 'e.g. what to pack, requirements', icon: 'backpack', defaultTitle: 'Good to know', defaultContent: () => ({ items: [] }) },
  richText: { label: 'Text block', hint: 'Free text with paragraphs and bullets', icon: 'file-text', defaultTitle: 'More information', defaultContent: () => ({ body: '' }) },
  gallery: { label: 'Photo gallery', hint: 'Extra grid of photos', icon: 'camera', defaultTitle: 'Gallery', defaultContent: () => ({ images: [] }) },
  notice: { label: 'Notice', hint: 'Highlighted information or warning box', icon: 'megaphone', defaultTitle: 'Please note', defaultContent: () => ({ body: '', tone: 'info' }) },
};

export function newSection(type: SectionType): SectionForm {
  const meta = SECTION_META[type];
  return { key: uid(), type, title: meta.defaultTitle, isVisible: true, content: meta.defaultContent() };
}

export function newDay(dayNumber: number): DayForm {
  return { key: uid(), dayNumber, title: '', body: '', walkHours: '', altitude: '', lodging: '', meals: '' };
}

export function emptyTrip(): TripForm {
  return {
    title: '',
    slug: '',
    countryId: '',
    location: '',
    summary: '',
    priceFrom: 0,
    currency: 'USD',
    durationDays: 1,
    difficulty: 'Moderate',
    groupSizeMax: null,
    maxAltitude: null,
    bestSeason: '',
    rating: 0,
    reviewCount: 0,
    badge: '',
    coverImage: '',
    isPublished: false,
    isFeatured: false,
    sortOrder: 0,
    metaTitle: '',
    metaDescription: '',
    activityIds: [],
    photos: [],
    days: [],
    amenities: [],
    departures: [],
    sections: (['overview', 'highlights', 'itinerary', 'inclusions', 'departures', 'faq'] as SectionType[]).map(newSection),
  };
}

type Nullable<T> = { [K in keyof T]: T[K] | null };

export interface ApiTrip extends Nullable<Pick<TripForm, 'location' | 'bestSeason' | 'badge' | 'coverImage' | 'metaTitle' | 'metaDescription' | 'groupSizeMax' | 'maxAltitude'>> {
  id: number;
  title: string;
  slug: string;
  countryId: number;
  summary: string;
  priceFrom: number;
  currency: string;
  durationDays: number;
  difficulty: string;
  rating: number;
  reviewCount: number;
  isPublished: boolean;
  isFeatured: boolean;
  sortOrder: number;
  activityIds: number[];
  photos: { url: string; alt: string }[];
  days: { dayNumber: number; title: string; body: string; walkHours: string | null; altitude: string | null; lodging: string | null; meals: string | null }[];
  amenities: { label: string; icon: string; included: boolean }[];
  sections: { type: SectionType; title: string; isVisible: boolean; content: Record<string, unknown> }[];
  departures: { startDate: string; seatsTotal: number; seatsLeft: number; priceOverride: number | null }[];
  country: { name: string; slug: string };
  updatedAt: string;
}

export function fromApi(trip: ApiTrip): TripForm {
  return {
    title: trip.title,
    slug: trip.slug,
    countryId: trip.countryId,
    location: trip.location ?? '',
    summary: trip.summary,
    priceFrom: trip.priceFrom,
    currency: trip.currency,
    durationDays: trip.durationDays,
    difficulty: trip.difficulty,
    groupSizeMax: trip.groupSizeMax,
    maxAltitude: trip.maxAltitude,
    bestSeason: trip.bestSeason ?? '',
    rating: trip.rating,
    reviewCount: trip.reviewCount,
    badge: trip.badge ?? '',
    coverImage: trip.coverImage ?? '',
    isPublished: trip.isPublished,
    isFeatured: trip.isFeatured,
    sortOrder: trip.sortOrder,
    metaTitle: trip.metaTitle ?? '',
    metaDescription: trip.metaDescription ?? '',
    activityIds: trip.activityIds,
    photos: trip.photos.map((p) => ({ key: uid(), url: p.url, alt: p.alt })),
    days: trip.days.map((d) => ({ key: uid(), dayNumber: d.dayNumber, title: d.title, body: d.body, walkHours: d.walkHours ?? '', altitude: d.altitude ?? '', lodging: d.lodging ?? '', meals: d.meals ?? '' })),
    amenities: trip.amenities.map((a) => ({ key: uid(), label: a.label, icon: a.icon, included: a.included })),
    sections: trip.sections.map((s) => ({ key: uid(), type: s.type, title: s.title, isVisible: s.isVisible, content: s.content ?? {} })),
    departures: trip.departures.map((d) => ({ key: uid(), startDate: d.startDate.slice(0, 10), seatsTotal: d.seatsTotal, seatsLeft: d.seatsLeft, priceOverride: d.priceOverride })),
  };
}

const strip = <T extends { key: string }>({ key: _key, ...rest }: T) => rest;

export function toDto(form: TripForm) {
  return {
    ...form,
    countryId: Number(form.countryId),
    // Not `|| null` — 0 is a legitimate maxAltitude (sea-level trips) and falsy-coercion was
    // silently turning it into null on every save.
    groupSizeMax: form.groupSizeMax == null ? null : form.groupSizeMax,
    maxAltitude: form.maxAltitude == null ? null : form.maxAltitude,
    coverImage: form.coverImage || null,
    photos: form.photos.map(strip),
    days: form.days.map(strip),
    amenities: form.amenities.map(strip),
    sections: form.sections.map((s) => {
      const { key: _key, ...rest } = s;
      const content = { ...rest.content };
      if (Array.isArray(content.items)) {
        content.items = (content.items as unknown[]).filter((item) => (typeof item === 'string' ? item.trim() : (item as { q?: string })?.q?.trim()));
      }
      return { ...rest, content };
    }),
    departures: form.departures.map((d) => ({ ...strip(d), startDate: `${d.startDate}T00:00:00.000Z`, priceOverride: d.priceOverride || null })),
  };
}

export function validate(form: TripForm): { tab: TabId; message: string }[] {
  const errors: { tab: TabId; message: string }[] = [];
  if (form.title.trim().length < 3) errors.push({ tab: 'overview', message: 'Give the trip a title (at least 3 characters).' });
  if (!form.countryId) errors.push({ tab: 'overview', message: 'Choose the country this trip belongs to.' });
  if (form.summary.trim().length < 10) errors.push({ tab: 'overview', message: 'Write a short summary (at least 10 characters).' });
  if (form.days.some((d) => !d.title.trim())) errors.push({ tab: 'itinerary', message: 'Every itinerary day needs a title.' });
  if (form.amenities.some((a) => !a.label.trim())) errors.push({ tab: 'inclusions', message: 'Every included / excluded item needs a label.' });
  if (form.departures.some((d) => !d.startDate)) errors.push({ tab: 'pricing', message: 'Every departure needs a date.' });
  if (form.departures.some((d) => d.seatsLeft > d.seatsTotal)) errors.push({ tab: 'pricing', message: 'Seats left cannot be more than total seats.' });
  if (form.durationDays < 1 || form.durationDays > 365) errors.push({ tab: 'pricing', message: 'Duration must be between 1 and 365 days.' });
  if (form.priceFrom < 0 || form.priceFrom > 10_000_000) errors.push({ tab: 'pricing', message: 'Price from must be between 0 and 10,000,000.' });
  if (form.groupSizeMax != null && (form.groupSizeMax < 1 || form.groupSizeMax > 500)) errors.push({ tab: 'pricing', message: 'Max group size must be between 1 and 500.' });
  if (form.maxAltitude != null && (form.maxAltitude < 0 || form.maxAltitude > 9000)) errors.push({ tab: 'pricing', message: 'Max altitude must be between 0 and 9000m.' });
  if (form.rating < 0 || form.rating > 5) errors.push({ tab: 'pricing', message: 'Rating must be between 0 and 5.' });
  if (form.reviewCount < 0) errors.push({ tab: 'pricing', message: 'Reviews cannot be negative.' });
  if (form.departures.some((d) => d.seatsTotal < 0 || d.seatsTotal > 1000 || d.seatsLeft < 0 || d.seatsLeft > 1000)) {
    errors.push({ tab: 'pricing', message: 'Seats must be between 0 and 1000.' });
  }
  if (form.departures.some((d) => d.priceOverride != null && d.priceOverride < 0)) errors.push({ tab: 'pricing', message: 'Price override cannot be negative.' });
  return errors;
}
