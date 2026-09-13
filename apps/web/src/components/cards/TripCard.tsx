import { ArrowRight, Heart, MapPin, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDisplayPrice } from '../../lib/currency';
import { cx } from '../../lib/format';
import { useI18n } from '../../lib/i18n';
import type { TripCard as TripCardData } from '../../lib/types';
import { useWishlist } from '../../lib/wishlist';
import { SmartImage } from '../ui';

/**
 * Figma “Destination Card”. Hover (or keyboard focus) swaps the heart for the price tag,
 * reveals a 4-up photo strip over the image, lifts to Shadow/LG and turns the duration into “View trip”.
 * Touch devices (no hover) always show the price.
 */
export function TripCard({ trip, className }: { trip: TripCardData; className?: string }) {
  const { t } = useI18n();
  const displayPrice = useDisplayPrice();
  const wishlist = useWishlist();
  const saved = wishlist.has(trip.slug);
  const strip = trip.photos.slice(1, 4);
  const extra = Math.max(trip.photoCount - 1 - strip.length, 0);
  const price = displayPrice(trip.priceFrom, trip.currency);

  return (
    <article
      className={cx(
        'group relative flex flex-col overflow-hidden rounded-lg border border-line bg-surface shadow-sm transition-[box-shadow,transform] duration-200 ease-out',
        'hover:-translate-y-1 hover:shadow-lg focus-within:-translate-y-1 focus-within:shadow-lg',
        className,
      )}
    >
      <div className="relative h-[240px] overflow-hidden sm:h-[280px]">
        <SmartImage
          src={trip.coverImage ?? undefined}
          alt={trip.title}
          className="absolute inset-0 size-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04] group-focus-within:scale-[1.04]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-ink-950/25 via-transparent to-ink-950/55 opacity-60 transition-opacity duration-200 group-hover:opacity-100" aria-hidden="true" />

        <div className="absolute inset-x-4 top-4 flex items-start justify-between gap-3">
          {trip.badge ? (
            <span className="rounded-full bg-red-50 px-3 py-2 text-meta text-red-600 shadow-sm">{trip.badge}</span>
          ) : (
            <span />
          )}
          <div className="relative flex items-start">
            <button
              type="button"
              onClick={() => wishlist.toggle(trip.slug)}
              aria-pressed={saved}
              aria-label={t('card.wishlist')}
              className={cx(
                'relative z-10 flex size-10 items-center justify-center rounded-full bg-ink-0/95 text-ink-950 shadow-sm transition-[opacity,transform] duration-200',
                '[@media(hover:hover)]:group-hover:pointer-events-none [@media(hover:hover)]:group-hover:scale-75 [@media(hover:hover)]:group-hover:opacity-0 [@media(hover:hover)]:group-focus-within:opacity-0',
                '[@media(hover:none)]:hidden',
              )}
            >
              <Heart size={18} className={saved ? 'fill-red-500 text-red-500' : ''} aria-hidden="true" />
            </button>
            <span
              className={cx(
                'absolute end-0 top-0 flex items-baseline gap-2 whitespace-nowrap rounded-full bg-ink-950 px-5 py-2.5 text-ink-0 shadow-md transition-[opacity,transform] duration-200',
                '[@media(hover:hover)]:translate-y-1 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:translate-y-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:translate-y-0 [@media(hover:hover)]:group-focus-within:opacity-100',
              )}
            >
              <span className="text-meta">{t('card.from').toLowerCase()}</span>
              <span className="text-h4 leading-none">{price}</span>
            </span>
          </div>
        </div>

        {strip.length > 0 && (
          <ul
            className="absolute inset-x-4 bottom-4 flex gap-2 transition-[opacity,transform] duration-200 ease-out [@media(hover:hover)]:translate-y-3 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:translate-y-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:translate-y-0 [@media(hover:hover)]:group-focus-within:opacity-100 [@media(hover:none)]:hidden"
            aria-hidden="true"
          >
            {strip.map((src, i) => (
              <li key={src + i} className="h-11 w-14 overflow-hidden rounded-sm ring-2 ring-ink-0/80">
                <img src={src.replace('w=1600', 'w=200')} alt="" loading="lazy" className="size-full object-cover" />
              </li>
            ))}
            {extra > 0 && (
              <li className="flex h-11 w-14 items-center justify-center rounded-sm bg-ink-950 text-meta text-ink-0 ring-2 ring-ink-0/80">
                {t('card.morePhotos', { count: extra })}
              </li>
            )}
          </ul>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-4 p-6 lg:p-7">
        <p className="flex items-center gap-2 text-meta text-fg-subtle">
          <MapPin size={14} aria-hidden="true" />
          <span className="truncate">
            {[trip.location, trip.country.name].filter(Boolean).join(', ')} · {trip.continent.name}
          </span>
        </p>
        <h3 className="text-h4 text-fg">
          <Link to={`/tours/${trip.slug}`} className="outline-none after:absolute after:inset-0 after:z-[1] after:content-[''] focus-visible:underline">
            {trip.title}
          </Link>
        </h3>
        {trip.activities.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {trip.activities.slice(0, 3).map((a) => (
              <li key={a.slug} className="rounded-full border border-line bg-subtle px-3 py-1.5 text-meta text-fg-muted">
                {a.name}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-auto flex items-center justify-between gap-3 pt-1">
          <p className="flex items-center gap-2 text-meta text-fg-muted">
            <Star size={14} className="fill-amber-400 text-amber-400" aria-hidden="true" />
            {t('card.reviews', { rating: trip.rating.toFixed(1), count: trip.reviewCount })}
          </p>
          {/* Grid-stack: both states share one cell so the container auto-sizes to the wider of the two — "View trip" was getting clipped when the box was only as wide as "14 days". */}
          <p className="relative grid h-5 overflow-hidden text-end">
            <span className="col-start-1 row-start-1 block whitespace-nowrap text-meta text-fg-muted transition-transform duration-200 [@media(hover:hover)]:group-hover:-translate-y-6 [@media(hover:hover)]:group-focus-within:-translate-y-6 [@media(hover:none)]:hidden">
              {t('card.days', { count: trip.durationDays })}
            </span>
            <span className="col-start-1 row-start-1 flex translate-y-6 items-center justify-end gap-1 whitespace-nowrap text-label text-fg-brand transition-transform duration-200 group-hover:translate-y-0 group-focus-within:translate-y-0 [@media(hover:none)]:static [@media(hover:none)]:translate-y-0">
              <span className="[@media(hover:none)]:hidden">{t('card.viewTrip')}</span>
              <span className="hidden text-meta text-fg-muted [@media(hover:none)]:inline">{t('card.days', { count: trip.durationDays })} ·&nbsp;</span>
              <ArrowRight size={16} aria-hidden="true" className="rtl:-scale-x-100" />
            </span>
          </p>
        </div>
      </div>
    </article>
  );
}

export function TripCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-line bg-surface">
      <div className="h-[240px] animate-pulse bg-muted sm:h-[280px]" />
      <div className="flex flex-col gap-4 p-6">
        <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
        <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
        <div className="flex gap-2">
          <div className="h-7 w-20 animate-pulse rounded-full bg-muted" />
          <div className="h-7 w-16 animate-pulse rounded-full bg-muted" />
        </div>
      </div>
    </div>
  );
}
