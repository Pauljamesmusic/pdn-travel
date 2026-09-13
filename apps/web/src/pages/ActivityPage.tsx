import { Link, useParams } from 'react-router-dom';
import { TripCard, TripCardSkeleton } from '../components/cards/TripCard';
import { Icon } from '../components/Icon';
import { PageHero } from '../components/PageHero';
import { ButtonLink, EmptyState, ErrorState } from '../components/ui';
import { useApi } from '../lib/api';
import { useDocumentMeta } from '../lib/hooks';
import { useI18n } from '../lib/i18n';
import type { Activity, NamedLink, TripCard as TripCardData } from '../lib/types';
import NotFoundPage from './NotFoundPage';

interface ActivityResponse {
  activity: Activity;
  trips: TripCardData[];
  others: NamedLink[];
}

export default function ActivityPage() {
  const { slug = '' } = useParams();
  const { t } = useI18n();
  const { data, error, loading, reload } = useApi<ActivityResponse>(`/activities/${encodeURIComponent(slug)}`);
  useDocumentMeta(data?.activity.name, data?.activity.description);

  if (error?.status === 404) return <NotFoundPage />;
  const activity = data?.activity;

  return (
    <>
      <PageHero
        eyebrow={t('pages.activitiesEyebrow')}
        title={
          <span className="inline-flex items-center gap-4">
            {activity && (
              <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-red-500 text-ink-0 lg:size-16">
                <Icon name={activity.icon} size={28} />
              </span>
            )}
            {activity?.name ?? '…'}
          </span>
        }
        subtitle={activity?.description}
        image={activity?.image}
        crumbs={[{ label: t('nav.activities'), to: '/activities' }, ...(activity ? [{ label: activity.name }] : [])]}
      />

      <div className="container-pdn flex flex-col gap-12 py-16 lg:py-24">
        {error && <ErrorState message={t('common.error')} onRetry={reload} retryLabel={t('common.retry')} />}

        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <h2 className="text-h1 text-fg">{activity ? t('filters.results', { count: data?.trips.length ?? 0 }) : '…'}</h2>
          {activity && (
            <Link to={`/tours?activity=${activity.slug}`} className="text-label text-fg-brand hover:underline">
              {t('filters.title')} →
            </Link>
          )}
        </div>

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

        {data && data.others.length > 0 && (
          <section className="flex flex-col gap-5 border-t border-line pt-10" aria-labelledby="other-activities">
            <h2 id="other-activities" className="text-caps text-fg-subtle">
              {t('pages.otherActivities')}
            </h2>
            <ul className="flex flex-wrap gap-3">
              {data.others.map((a) => (
                <li key={a.slug}>
                  <Link to={`/activities/${a.slug}`} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-subtle px-4 text-body-s text-fg-muted transition-colors hover:border-line-strong hover:text-fg">
                    <Icon name={a.icon} size={16} />
                    {a.name}
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
