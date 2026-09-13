import { ActivityCard } from '../components/cards/cards';
import { PageHero } from '../components/PageHero';
import { ErrorState, Skeleton } from '../components/ui';
import { useApi } from '../lib/api';
import { useDocumentMeta, useReveal } from '../lib/hooks';
import { useI18n } from '../lib/i18n';
import type { Activity } from '../lib/types';

export default function ActivitiesPage() {
  const { t } = useI18n();
  const { data, error, loading, reload } = useApi<Activity[]>('/activities');
  const ref = useReveal<HTMLDivElement>();
  useDocumentMeta(t('nav.activities'), t('pages.activitiesSubtitle'));
  const sorted = [...(data ?? [])].sort((a, b) => b.tripCount - a.tripCount);

  return (
    <>
      <PageHero
        eyebrow={t('pages.activitiesEyebrow')}
        title={t('pages.activitiesTitle')}
        subtitle={t('pages.activitiesSubtitle')}
        image="https://images.unsplash.com/photo-1610997686651-98492fd08108?auto=format&fit=crop&w=2000&q=80"
        crumbs={[{ label: t('nav.activities') }]}
      />
      <div ref={ref} className="container-pdn py-16 lg:py-24">
        {error && <ErrorState message={t('common.error')} onRetry={reload} retryLabel={t('common.retry')} />}
        <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
          {loading && !data
            ? Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="aspect-[4/5] rounded-lg" />)
            : sorted.map((activity, i) => (
                <div key={activity.slug} className="flex flex-col gap-3 reveal" style={{ ['--reveal-delay' as string]: `${(i % 4) * 60}ms` }}>
                  <ActivityCard activity={activity} />
                  {activity.description && <p className="line-clamp-3 text-body-s text-fg-muted max-sm:hidden">{activity.description}</p>}
                </div>
              ))}
        </div>
      </div>
    </>
  );
}
