import { ArrowUpRight, Heart, MapPin, Quote, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDisplayPrice } from '../../lib/currency';
import { cx } from '../../lib/format';
import { useI18n } from '../../lib/i18n';
import type { Activity, ContinentSummary, CountrySummary, Testimonial } from '../../lib/types';
import { useWishlist } from '../../lib/wishlist';
import { Icon } from '../Icon';
import { SmartImage, Stars } from '../ui';

/** Figma “Continent Card” — photo, scrim, serif name and a glass arrow chip. */
export function ContinentCard({ continent, to, active = false }: { continent: Pick<ContinentSummary, 'name' | 'slug' | 'tagline' | 'image'>; to: string; active?: boolean }) {
  const { t } = useI18n();
  return (
    <Link
      to={to}
      aria-label={t('card.explore', { name: continent.name })}
      className={cx(
        'group relative flex aspect-[5/7] w-full flex-col justify-end overflow-hidden rounded-lg bg-muted p-5 transition-shadow duration-300 hover:shadow-lg',
        active && 'ring-1 ring-line-brand ring-inset',
      )}
    >
      <SmartImage src={continent.image ?? undefined} alt="" className="absolute inset-0 size-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.06]" />
      <span className="absolute inset-0 bg-gradient-to-b from-ink-950/0 from-35% to-ink-950/80" aria-hidden="true" />
      <span
        className={cx(
          'absolute end-4 top-4 flex size-10 items-center justify-center rounded-full text-ink-0 backdrop-blur-md transition-colors duration-200',
          active ? 'bg-red-600' : 'bg-white/20 group-hover:bg-red-600',
        )}
        aria-hidden="true"
      >
        <ArrowUpRight size={18} className="rtl:-scale-x-100" />
      </span>
      <span className="relative flex flex-col gap-0.5 text-ink-0">
        <span className="font-serif text-[1.625rem] leading-7">{continent.name}</span>
        {continent.tagline && <span className="text-body-s opacity-80">{continent.tagline}</span>}
      </span>
    </Link>
  );
}

/** Figma “Country Card” — media with overlapping info panel. */
export function CountryCard({ country, className }: { country: CountrySummary; className?: string }) {
  const { t } = useI18n();
  const displayPrice = useDisplayPrice();
  const wishlist = useWishlist();
  const key = `country:${country.slug}`;
  const saved = wishlist.has(key);

  return (
    <article className={cx('group relative flex flex-col pb-1 transition-transform duration-300 ease-out hover:-translate-y-1', className)}>
      <div className="relative -mb-14 h-[260px] overflow-hidden rounded-lg bg-muted">
        <SmartImage src={country.image ?? undefined} alt={country.name} className="size-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]" />
        {country.tripCount > 0 && country.priceFrom != null && (
          <span className="absolute start-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1.5 text-caps text-ink-0">
            <Star size={12} className="fill-current" aria-hidden="true" />
            {t('card.featured')}
          </span>
        )}
        <button
          type="button"
          onClick={() => wishlist.toggle(key)}
          aria-pressed={saved}
          aria-label={t('card.wishlist')}
          className="absolute end-4 top-4 z-10 flex size-10 items-center justify-center rounded-full bg-ink-0 text-ink-950 shadow-sm"
        >
          <Heart size={18} className={saved ? 'fill-red-500 text-red-500' : ''} aria-hidden="true" />
        </button>
      </div>
      <div className="relative px-3">
        <div className="flex h-[188px] flex-col gap-1.5 rounded-[20px] border border-transparent bg-surface px-5 py-4 shadow-md transition-[box-shadow,border-color] duration-300 group-hover:border-line-brand group-hover:shadow-lg dark:border-line dark:group-hover:border-line-brand">
          <p className="text-caps text-fg-accent">{country.region ?? country.continent?.name}</p>
          <h3 className="text-h3 text-fg line-clamp-2 leading-tight">
            <Link to={`/destinations/${country.slug}`} className="outline-none after:absolute after:inset-0 after:content-[''] focus-visible:underline">
              {country.name}
            </Link>
          </h3>
          <p className="flex items-center gap-1.5 text-body-s text-fg-muted">
            <MapPin size={14} className="shrink-0" aria-hidden="true" />
            <span className="truncate">{country.highlight ?? t('card.trips', { count: country.tripCount })}</span>
          </p>
          <div className="my-1 mt-auto h-px bg-line" />
          <div className="flex items-center justify-between">
            <p className="flex items-baseline gap-1.5">
              {country.priceFrom != null ? (
                <>
                  <span className="text-meta text-fg-subtle">{t('card.from')}</span>
                  <span className="text-h4 text-fg">{displayPrice(country.priceFrom, 'USD')}</span>
                </>
              ) : (
                <span className="text-meta text-fg-subtle">{t('search.noTrips')}</span>
              )}
            </p>
            <span className="flex size-11 items-center justify-center rounded-full bg-inverse text-fg-inverse transition-transform duration-200 group-hover:rotate-45 rtl:group-hover:-rotate-45" aria-hidden="true">
              <ArrowUpRight size={18} className="rtl:-scale-x-100" />
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}

/** Figma “Feature Card”. */
export function FeatureCard({ icon, title, body, accent = false }: { icon: string; title: string; body: string; accent?: boolean }) {
  return (
    <div className={cx('flex h-full flex-col gap-4 rounded-lg p-6 lg:p-7', accent ? 'bg-accent text-ink-0' : 'border border-line bg-surface')}>
      <span className={cx('flex size-[52px] items-center justify-center rounded-md', accent ? 'bg-white/15 text-ink-0' : 'bg-brand-subtle text-fg-brand')}>
        <Icon name={icon} size={24} />
      </span>
      <h3 className={cx('text-h4', accent ? 'text-ink-0' : 'text-fg')}>{title}</h3>
      <p className={cx('text-body-s', accent ? 'text-green-100' : 'text-fg-muted')}>{body}</p>
    </div>
  );
}

export function ActivityCard({ activity }: { activity: Activity }) {
  const { t } = useI18n();
  return (
    <Link to={`/activities/${activity.slug}`} className="group relative flex aspect-[4/5] flex-col justify-between overflow-hidden rounded-lg bg-muted p-5 text-ink-0">
      <SmartImage src={activity.image ?? undefined} alt="" className="absolute inset-0 size-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.06]" />
      <span className="absolute inset-0 bg-gradient-to-b from-ink-950/30 via-ink-950/10 to-ink-950/85" aria-hidden="true" />
      <span className="relative flex size-12 items-center justify-center rounded-full bg-white/15 backdrop-blur-md transition-colors duration-200 group-hover:bg-red-600">
        <Icon name={activity.icon} size={22} />
      </span>
      <span className="relative flex flex-col gap-1">
        <span className="font-serif text-[1.75rem] leading-8">{activity.name}</span>
        <span className="text-body-s opacity-85">{t('card.trips', { count: activity.tripCount })}</span>
      </span>
    </Link>
  );
}

export function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  const { t } = useI18n();
  const initials = testimonial.name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join('');
  return (
    <figure className="flex h-full flex-col gap-5 rounded-lg border border-line bg-surface p-6 lg:p-8">
      <div className="flex items-center justify-between">
        <Stars rating={testimonial.rating} />
        <Quote size={28} className="text-fg-brand opacity-30 rtl:-scale-x-100" aria-hidden="true" />
      </div>
      <blockquote className="flex-1 text-body-m text-fg">“{testimonial.quote}”</blockquote>
      <figcaption className="flex items-center gap-3">
        {testimonial.avatar ? (
          <SmartImage src={testimonial.avatar} alt="" className="size-11 rounded-full object-cover" />
        ) : (
          <span className="flex size-11 items-center justify-center rounded-full bg-brand-subtle text-label text-fg-brand">{initials}</span>
        )}
        <span className="flex flex-col">
          <span className="text-label text-fg">{testimonial.name}</span>
          <span className="text-meta text-fg-subtle">{testimonial.trip ?? t('common.verified')}</span>
        </span>
      </figcaption>
    </figure>
  );
}
