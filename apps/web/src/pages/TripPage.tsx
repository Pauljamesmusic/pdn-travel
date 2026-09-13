import { CalendarRange, Clock, Gauge, MapPin, Mountain, Star, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { TripCard } from '../components/cards/TripCard';
import { EnquiryForm } from '../components/EnquiryForm';
import { Icon } from '../components/Icon';
import { PageHero } from '../components/PageHero';
import { BookingCard } from '../components/trip/BookingCard';
import { PhotoGallery } from '../components/trip/PhotoGallery';
import { sectionAnchor, TripSections } from '../components/trip/TripSections';
import { Badge, Button, ErrorState, Skeleton } from '../components/ui';
import { useApi } from '../lib/api';
import { formatDate, formatPrice } from '../lib/format';
import { useDocumentMeta } from '../lib/hooks';
import { useI18n } from '../lib/i18n';
import type { Departure, TripDetail } from '../lib/types';
import NotFoundPage from './NotFoundPage';

export default function TripPage() {
  const { slug = '' } = useParams();
  const { t, lang } = useI18n();
  const { data: trip, error, loading, reload } = useApi<TripDetail>(`/trips/${encodeURIComponent(slug)}`);
  const [selected, setSelected] = useState<Departure | null>(null);
  const [travellers, setTravellers] = useState(2);
  const [enquiryKey, setEnquiryKey] = useState(0);

  useDocumentMeta(trip?.metaTitle ?? trip?.title, trip?.metaDescription ?? trip?.summary);

  useEffect(() => {
    setSelected(trip?.departures.find((d) => d.seatsLeft > 0) ?? null);
  }, [trip]);

  // Structured data for search engines (TouristTrip).
  useEffect(() => {
    if (!trip) return;
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'TouristTrip',
      name: trip.title,
      description: trip.summary,
      image: trip.photos.map((p) => p.url),
      touristType: trip.activities.map((a) => a.name),
      offers: { '@type': 'Offer', price: trip.priceFrom, priceCurrency: trip.currency, availability: 'https://schema.org/InStock' },
      aggregateRating: trip.reviewCount ? { '@type': 'AggregateRating', ratingValue: trip.rating, reviewCount: trip.reviewCount } : undefined,
      provider: { '@type': 'TravelAgency', name: 'PDN Travel', url: window.location.origin },
    }).replace(/</g, '\\u003c');
    document.head.appendChild(script);
    return () => script.remove();
  }, [trip]);

  if (error?.status === 404) return <NotFoundPage />;

  const selectDeparture = (d: Departure) => {
    setSelected(d);
    document.getElementById('booking')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const enquire = () => {
    setEnquiryKey((k) => k + 1);
    window.setTimeout(() => document.getElementById('enquire')?.scrollIntoView({ behavior: 'smooth' }), 20);
  };

  const facts = trip
    ? [
        { icon: Clock, label: t('trip.duration'), value: t('card.days', { count: trip.durationDays }) },
        { icon: Gauge, label: t('trip.difficulty'), value: trip.difficulty },
        trip.maxAltitude ? { icon: Mountain, label: t('trip.maxAltitude'), value: `${trip.maxAltitude.toLocaleString()} m` } : null,
        trip.bestSeason ? { icon: CalendarRange, label: t('trip.bestSeason'), value: trip.bestSeason } : null,
        trip.groupSizeMax ? { icon: Users, label: t('trip.groupSize'), value: t('trip.upTo', { count: trip.groupSizeMax }) } : null,
      ].filter(Boolean) as { icon: typeof Clock; label: string; value: string }[]
    : [];

  return (
    <>
      <PageHero
        eyebrow={trip ? `${trip.country.continent.name} · ${trip.country.name}` : t('nav.tours')}
        title={trip?.title ?? '…'}
        subtitle={trip?.summary}
        image={trip?.coverImage}
        size="sm"
        crumbs={[
          { label: t('nav.tours'), to: '/tours' },
          ...(trip
            ? [
                { label: trip.country.name, to: `/destinations/${trip.country.slug}` },
                { label: trip.title },
              ]
            : []),
        ]}
      >
        {trip && (
          <ul className="flex flex-wrap items-center gap-x-6 gap-y-3 text-body-s text-fg">
            {trip.badge && (
              <li>
                <Badge tone="solid">{trip.badge}</Badge>
              </li>
            )}
            <li className="inline-flex items-center gap-2">
              <Star size={16} className="fill-amber-400 text-amber-400" aria-hidden="true" />
              {t('card.reviews', { rating: trip.rating.toFixed(1), count: trip.reviewCount })}
            </li>
            <li className="inline-flex items-center gap-2">
              <Clock size={16} aria-hidden="true" /> {t('card.days', { count: trip.durationDays })}
            </li>
            {trip.groupSizeMax && (
              <li className="inline-flex items-center gap-2">
                <Users size={16} aria-hidden="true" /> {t('trip.upTo', { count: trip.groupSizeMax })}
              </li>
            )}
            <li className="inline-flex items-center gap-2">
              <Gauge size={16} aria-hidden="true" /> {trip.difficulty}
            </li>
            {trip.location && (
              <li className="inline-flex items-center gap-2">
                <MapPin size={16} aria-hidden="true" /> {trip.location}
              </li>
            )}
          </ul>
        )}
      </PageHero>

      {error && (
        <div className="container-pdn py-16">
          <ErrorState message={t('common.error')} onRetry={reload} retryLabel={t('common.retry')} />
        </div>
      )}

      {loading && !trip && (
        <div className="container-pdn flex flex-col gap-8 py-10">
          <Skeleton className="h-[460px] rounded-lg" />
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_380px]">
            <div className="flex flex-col gap-4">
              <Skeleton className="h-8 w-1/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
            <Skeleton className="h-[480px] rounded-lg" />
          </div>
        </div>
      )}

      {trip && (
        <>
          <div className="container-pdn pt-8 lg:pt-10">
            <PhotoGallery photos={trip.photos.length ? trip.photos : trip.coverImage ? [{ url: trip.coverImage, alt: trip.title }] : []} title={trip.title} />
          </div>

          {trip.sections.length > 1 && (
            <nav aria-label={trip.title} className="sticky top-[72px] z-30 mt-8 border-y border-line bg-surface/95 backdrop-blur-md">
              <ul className="container-pdn flex gap-1 overflow-x-auto no-scrollbar">
                {trip.sections.map((s, i) => (
                  <li key={sectionAnchor(s, i)}>
                    <a href={`#${sectionAnchor(s, i)}`} className="flex min-h-12 items-center whitespace-nowrap border-b-2 border-transparent px-3 text-body-s text-fg-muted transition-colors hover:border-red-500 hover:text-fg">
                      {s.title}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          <div className="container-pdn grid grid-cols-1 gap-10 py-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-16 lg:py-14">
            <div className="flex min-w-0 flex-col gap-10">
              {facts.length > 0 && (
                <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
                  {facts.map(({ icon: FactIcon, label, value }) => (
                    <div key={label} className="flex flex-col gap-2 rounded-md border border-line bg-subtle p-4">
                      <FactIcon size={18} className="text-fg-brand" aria-hidden="true" />
                      <dt className="text-meta text-fg-subtle">{label}</dt>
                      <dd className="text-label text-fg">{value}</dd>
                    </div>
                  ))}
                </dl>
              )}

              {trip.activities.length > 0 && (
                <ul className="flex flex-wrap gap-2">
                  {trip.activities.map((a) => (
                    <li key={a.slug}>
                      <Link to={`/activities/${a.slug}`} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-line bg-surface px-4 text-body-s text-fg-muted hover:border-line-strong hover:text-fg">
                        <Icon name={a.icon} size={16} /> {a.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}

              <TripSections trip={trip} onSelectDeparture={selectDeparture} />
            </div>

            <aside className="hidden lg:block">
              <div className="sticky top-[136px]">
                <BookingCard trip={trip} selected={selected} onSelect={setSelected} travellers={travellers} onTravellers={setTravellers} onEnquire={enquire} />
              </div>
            </aside>
            <div className="lg:hidden">
              <BookingCard trip={trip} selected={selected} onSelect={setSelected} travellers={travellers} onTravellers={setTravellers} onEnquire={enquire} />
            </div>
          </div>

          <section id="enquire" className="scroll-mt-28 bg-subtle">
            <div className="container-pdn grid grid-cols-1 gap-10 py-16 lg:grid-cols-[1fr_1.4fr] lg:py-24">
              <div className="flex flex-col gap-4">
                <p className="text-caps text-fg-accent">{t('contact.eyebrow')}</p>
                <h2 className="text-h1 text-fg">{t('trip.enquiryTitle')}</h2>
                <p className="text-body-m text-fg-muted">{t('contact.subtitle')}</p>
              </div>
              <div className="rounded-lg border border-line bg-surface p-6 shadow-sm sm:p-8">
                <EnquiryForm
                  key={`${enquiryKey}-${selected?.id ?? 'none'}-${travellers}`}
                  trips={[{ id: trip.id, title: trip.title }]}
                  defaultTripId={trip.id}
                  defaultTravellers={travellers}
                  defaultDate={selected ? formatDate(selected.startDate, 'en', { month: 'long', year: 'numeric' }) : undefined}
                  defaultMessage={`I'm interested in ${trip.title}${selected ? ` departing ${formatDate(selected.startDate, 'en')}` : ''}.`}
                  source="trip-page"
                />
              </div>
            </div>
          </section>

          {trip.related.length > 0 && (
            <section className="container-pdn flex flex-col gap-8 py-16 lg:py-24">
              <h2 className="text-h1 text-fg">{t('trip.related')}</h2>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
                {trip.related.map((r) => (
                  <TripCard key={r.slug} trip={r} />
                ))}
              </div>
            </section>
          )}

          {/* Mobile booking bar */}
          <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 border-t border-line bg-surface/95 px-5 py-3 backdrop-blur-md lg:hidden [padding-bottom:max(0.75rem,env(safe-area-inset-bottom))]">
            <p className="flex flex-col">
              <span className="text-meta text-fg-subtle">{t('card.from')}</span>
              <span className="text-h4 text-fg">{formatPrice(selected?.priceOverride ?? trip.priceFrom, trip.currency, lang)}</span>
            </p>
            <Button size="sm" onClick={() => document.getElementById('booking')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
              {t('trip.checkDates')}
            </Button>
          </div>
          <div className="h-20 lg:hidden" aria-hidden="true" />
        </>
      )}
    </>
  );
}
