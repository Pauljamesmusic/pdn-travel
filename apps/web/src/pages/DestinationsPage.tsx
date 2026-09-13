import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CountryCard } from '../components/cards/cards';
import { PageHero } from '../components/PageHero';
import { ErrorState, SmartImage, Skeleton } from '../components/ui';
import { qs, useApi } from '../lib/api';
import { useDocumentMeta, useReveal } from '../lib/hooks';
import { useI18n } from '../lib/i18n';
import type { ContinentSummary } from '../lib/types';

export default function DestinationsPage() {
  const { t } = useI18n();
  const { data, error, loading, reload } = useApi<ContinentSummary[]>('/continents');
  const ref = useReveal<HTMLDivElement>();
  useDocumentMeta(t('nav.destinations'), t('pages.destinationsSubtitle'));

  return (
    <>
      <PageHero
        eyebrow={t('pages.destinationsEyebrow')}
        title={t('pages.destinationsTitle')}
        subtitle={t('pages.destinationsSubtitle')}
        image="https://images.unsplash.com/photo-1697012511676-674067ec0aa9?auto=format&fit=crop&w=2000&q=80"
        crumbs={[{ label: t('nav.destinations') }]}
      >
        {data && (
          <nav aria-label={t('filters.continent')} className="-mx-1 flex flex-wrap gap-2">
            {data.map((c) => (
              <a key={c.slug} href={`#${c.slug}`} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 text-label text-fg backdrop-blur-md hover:bg-white/20">
                {c.name}
                <span className="text-meta text-fg-muted">{c.countryCount}</span>
              </a>
            ))}
          </nav>
        )}
      </PageHero>

      <div ref={ref} className="container-pdn flex flex-col gap-20 py-16 lg:gap-28 lg:py-24">
        {error && <ErrorState message={t('common.error')} onRetry={reload} retryLabel={t('common.retry')} />}
        {loading &&
          !data &&
          Array.from({ length: 2 }, (_, i) => (
            <div key={i} className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }, (__, j) => (
                <Skeleton key={j} className="h-[380px] rounded-lg" />
              ))}
            </div>
          ))}

        {data?.map((continent) => (
          <section key={continent.slug} id={continent.slug} className="scroll-mt-28 flex flex-col gap-10" aria-labelledby={`${continent.slug}-title`}>
            <div className="flex flex-col gap-6 border-b border-line pb-8 reveal md:flex-row md:items-end md:justify-between">
              <div className="flex items-center gap-5">
                <SmartImage src={continent.image ?? undefined} alt="" className="size-20 shrink-0 rounded-md object-cover lg:size-24" />
                <div className="flex flex-col gap-1">
                  <p className="text-caps text-fg-accent">{continent.tagline}</p>
                  <h2 id={`${continent.slug}-title`} className="text-h1 text-fg">
                    {continent.name}
                  </h2>
                  <p className="text-body-s text-fg-muted">
                    {t('pages.countriesIn', { name: continent.name })}: {continent.countryCount} · {t('card.trips', { count: continent.tripCount })}
                  </p>
                </div>
              </div>
              {continent.tripCount > 0 && (
                <Link to={`/tours${qs({ continent: continent.slug })}`} className="group inline-flex items-center gap-2 text-label text-fg-brand">
                  {t('pages.tripsIn', { name: continent.name })}
                  <ArrowRight size={18} className="transition-transform group-hover:translate-x-1 rtl:-scale-x-100" aria-hidden="true" />
                </Link>
              )}
            </div>
            <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-x-8">
              {continent.countries.map((country, i) => (
                <div key={country.slug} className="reveal" style={{ ['--reveal-delay' as string]: `${(i % 4) * 60}ms` }}>
                  <CountryCard country={{ ...country, continent: { name: continent.name, slug: continent.slug } }} />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
