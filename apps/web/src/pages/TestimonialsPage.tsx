import { TestimonialCard } from '../components/cards/cards';
import { PageHero } from '../components/PageHero';
import { ButtonLink, ErrorState, Skeleton } from '../components/ui';
import { useApi } from '../lib/api';
import { useDocumentMeta, useReveal } from '../lib/hooks';
import { useI18n } from '../lib/i18n';
import type { Testimonial } from '../lib/types';

export default function TestimonialsPage() {
  const { t } = useI18n();
  const { data, error, loading, reload } = useApi<Testimonial[]>('/testimonials');
  const ref = useReveal<HTMLDivElement>();
  useDocumentMeta(t('nav.testimonials'));

  return (
    <>
      <PageHero
        eyebrow={t('pages.testimonialsEyebrow')}
        title={t('pages.testimonialsTitle')}
        image="https://images.unsplash.com/photo-1706323625285-648bb6825e03?auto=format&fit=crop&w=2000&q=80"
        crumbs={[{ label: t('nav.testimonials') }]}
      />
      <div ref={ref} className="container-pdn flex flex-col gap-12 py-16 lg:py-24">
        {error && <ErrorState message={t('common.error')} onRetry={reload} retryLabel={t('common.retry')} />}
        <div className="columns-1 gap-6 sm:columns-2 lg:columns-3 [&>*]:mb-6">
          {loading && !data
            ? Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-56 break-inside-avoid rounded-lg" />)
            : data?.map((item, i) => (
                <div key={item.id} className="break-inside-avoid reveal" style={{ ['--reveal-delay' as string]: `${(i % 3) * 60}ms` }}>
                  <TestimonialCard testimonial={item} />
                </div>
              ))}
        </div>
        <div className="flex justify-center">
          <ButtonLink to="/contact" icon>
            {t('nav.planTrip')}
          </ButtonLink>
        </div>
      </div>
    </>
  );
}
