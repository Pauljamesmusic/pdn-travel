import { Banknote, CalendarRange, FileText, Languages } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { TripCard, TripCardSkeleton } from '../components/cards/TripCard';
import { PageHero } from '../components/PageHero';
import { ButtonLink, EmptyState, ErrorState, RichText, SmartImage } from '../components/ui';
import { useApi } from '../lib/api';
import { useDocumentMeta, useReveal } from '../lib/hooks';
import { useI18n } from '../lib/i18n';
import type { TripCard as TripCardData } from '../lib/types';
import NotFoundPage from './NotFoundPage';

interface CountryResponse {
  country: {
    name: string;
    slug: string;
    summary: string | null;
    heroImage: string | null;
    image: string | null;
    currency: string | null;
    language: string | null;
    bestSeason: string | null;
    visaNote: string | null;
    region: string | null;
    continent: { name: string; slug: string };
  };
  trips: TripCardData[];
  siblings: { name: string; slug: string; image: string | null }[];
}

export default function CountryPage() {
  const { slug = '' } = useParams();
  const { t } = useI18n();
  const { data, error, loading, reload } = useApi<CountryResponse>(`/countries/${encodeURIComponent(slug)}`);
  const ref = useReveal<HTMLDivElement>();
  useDocumentMeta(data?.country.name, data?.country.summary);

  if (error?.status === 404) return <NotFoundPage />;
  const country = data?.country;

  const facts = country
    ? [
        { icon: Banknote, label: t('pages.currency'), value: country.currency },
        { icon: Languages, label: t('pages.language'), value: country.language },
        { icon: CalendarRange, label: t('trip.bestSeason'), value: country.bestSeason },
        { icon: FileText, label: t('pages.visa'), value: country.visaNote },
      ].filter((f) => f.value)
    : [];

  return (
    <>
      <PageHero
        eyebrow={country ? country.region ?? country.continent.name : t('pages.destinationsEyebrow')}
        title={country?.name ?? '…'}
        subtitle={country?.summary}
        image={country?.heroImage ?? country?.image}
        crumbs={[
          { label: t('nav.destinations'), to: '/destinations' },
          ...(country ? [{ label: country.continent.name, to: `/destinations#${country.continent.slug}` }, { label: country.name }] : []),
        ]}
        size="lg"
      />

      <div ref={ref} className="container-pdn flex flex-col gap-16 py-16 lg:gap-24 lg:py-24">
        {error && <ErrorState message={t('common.error')} onRetry={reload} retryLabel={t('common.retry')} />}

        {facts.length > 0 && (
          <section aria-labelledby="facts-title" className="flex flex-col gap-6 reveal">
            <h2 id="facts-title" className="text-caps text-fg-accent">
              {t('pages.goodToKnow')}
            </h2>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {facts.map(({ icon: FactIcon, label, value }) => (
                <div key={label} className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-6">
                  <span className="flex size-11 items-center justify-center rounded-md bg-brand-subtle text-fg-brand">
                    <FactIcon size={20} aria-hidden="true" />
                  </span>
                  <dt className="text-meta text-fg-subtle">{label}</dt>
                  <dd className="text-body-s text-fg">
                    <RichText text={value} />
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        <section aria-labelledby="trips-title" className="flex flex-col gap-8">
          <h2 id="trips-title" className="text-h1 text-fg reveal">
            {country ? t('pages.tripsIn', { name: country.name }) : '…'}
          </h2>
          {loading && !data ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }, (_, i) => (
                <TripCardSkeleton key={i} />
              ))}
            </div>
          ) : data?.trips.length ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
              {data.trips.map((trip) => (
                <TripCard key={trip.slug} trip={trip} />
              ))}
            </div>
          ) : (
            data && <EmptyState title={t('search.noTrips')} body={t('trip.noDepartures')} action={<ButtonLink to="/contact" size="sm">{t('nav.planTrip')}</ButtonLink>} />
          )}
        </section>

        {data && data.siblings.length > 0 && (
          <section aria-labelledby="nearby-title" className="flex flex-col gap-6 reveal">
            <h2 id="nearby-title" className="text-h2 text-fg">
              {t('pages.nearby')}
            </h2>
            <ul className="flex flex-wrap gap-3">
              {data.siblings.map((s) => (
                <li key={s.slug}>
                  <Link to={`/destinations/${s.slug}`} className="inline-flex items-center gap-3 rounded-full border border-line bg-surface py-1.5 pe-5 ps-1.5 text-label text-fg transition-colors hover:border-line-strong">
                    <SmartImage src={s.image ?? undefined} alt="" className="size-9 rounded-full object-cover" />
                    {s.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </>
  );
}
