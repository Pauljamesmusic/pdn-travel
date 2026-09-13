import { Hero } from '../components/home/Hero';
import { HeroSearchCard } from '../components/home/HeroSearchCard';
import {
  ActivitiesSection,
  ContinentsSection,
  FeaturedCountriesSection,
  FeaturedTripsSection,
  TestimonialsSection,
  TourismDaySection,
  WhySection,
} from '../components/home/HomeSections';
import { WelcomeModal } from '../components/home/WelcomeModal';
import { useSite } from '../components/SiteContext';
import { ErrorState, Skeleton } from '../components/ui';
import { useApi } from '../lib/api';
import { useDocumentMeta } from '../lib/hooks';
import { useI18n } from '../lib/i18n';
import type { HomeData } from '../lib/types';

export default function HomePage() {
  const { t } = useI18n();
  const { home } = useSite();
  const { data, error, loading, reload } = useApi<HomeData>('/home');
  useDocumentMeta('PDN Travel — Explore your dream places', 'Himalayan treks, cultural tours and journeys to 195 countries with a government-registered travel agency from Nepal.');

  return (
    <>
      <WelcomeModal />
      <Hero home={home} />
      <div className="container-pdn relative z-10 -mt-24 lg:-mt-20">
        <HeroSearchCard />
      </div>

      {error && (
        <div className="container-pdn py-16">
          <ErrorState message={t('common.error')} onRetry={reload} retryLabel={t('common.retry')} />
        </div>
      )}

      {loading && !data ? (
        <div className="container-pdn grid grid-cols-1 gap-4 py-24 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="aspect-[5/7] rounded-lg" />
          ))}
        </div>
      ) : (
        data && (
          <>
            <ContinentsSection home={home} continents={data.continents} />
            <FeaturedCountriesSection home={home} countries={data.featuredCountries} />
            <FeaturedTripsSection home={home} trips={data.featuredTrips} />
            <WhySection home={home} />
            <ActivitiesSection home={home} activities={data.activities} />
            <div className="h-16 lg:h-[120px]" />
            <TourismDaySection home={home} />
            <TestimonialsSection home={home} testimonials={data.testimonials} />
          </>
        )
      )}
    </>
  );
}
