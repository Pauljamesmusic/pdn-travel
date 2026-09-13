import { AlertTriangle, Building2, Check, ChevronDown, Clock, Info, Mountain, Utensils, X } from 'lucide-react';
import { useState } from 'react';
import { useDisplayPrice } from '../../lib/currency';
import { cx, formatDate } from '../../lib/format';
import { useMediaQuery } from '../../lib/hooks';
import { useI18n } from '../../lib/i18n';
import type { Departure, TripDetail, TripSection } from '../../lib/types';
import { Icon } from '../Icon';
import { RichText, SmartImage } from '../ui';

export const sectionAnchor = (section: TripSection, index: number) => `${section.type}-${index}`;

/** Renders the admin-controlled, ordered list of sections on a trip page. */
export function TripSections({ trip, onSelectDeparture }: { trip: TripDetail; onSelectDeparture: (d: Departure) => void }) {
  return (
    <div className="flex flex-col">
      {trip.sections.map((section, i) => (
        <section key={`${section.type}-${i}`} id={sectionAnchor(section, i)} className="scroll-mt-40 border-b border-line py-10 first:pt-0 last:border-0" aria-labelledby={`${sectionAnchor(section, i)}-title`}>
          <h2 id={`${sectionAnchor(section, i)}-title`} className="mb-6 text-h2 text-fg">
            {section.title}
          </h2>
          <SectionBody section={section} trip={trip} onSelectDeparture={onSelectDeparture} />
        </section>
      ))}
    </div>
  );
}

function SectionBody({ section, trip, onSelectDeparture }: { section: TripSection; trip: TripDetail; onSelectDeparture: (d: Departure) => void }) {
  const { t } = useI18n();
  const items = section.content.items ?? [];

  switch (section.type) {
    case 'overview':
    case 'richText':
      return <RichText text={section.content.body} className={cx('text-fg-muted', section.type === 'overview' ? 'text-body-l' : 'text-body-m')} />;

    case 'highlights':
    case 'list':
      return (
        <ul className={cx('grid gap-3', items.length > 3 && 'sm:grid-cols-2')}>
          {items.map((item, i) => (
            <li key={i} className="flex gap-3 text-body-m text-fg">
              <span className={cx('mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full', section.type === 'highlights' ? 'bg-accent-subtle text-fg-accent' : 'bg-brand-subtle text-fg-brand')}>
                <Check size={14} aria-hidden="true" />
              </span>
              {typeof item === 'string' ? item : item.q}
            </li>
          ))}
        </ul>
      );

    case 'itinerary':
      return <Itinerary trip={trip} />;

    case 'inclusions': {
      const included = trip.amenities.filter((a) => a.included);
      const excluded = trip.amenities.filter((a) => !a.included);
      return (
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {[
            { title: t('trip.included'), list: included, ok: true },
            { title: t('trip.excluded'), list: excluded, ok: false },
          ]
            .filter((g) => g.list.length)
            .map((group) => (
              <div key={group.title} className="flex flex-col gap-3">
                <p className="text-caps text-fg-subtle">{group.title}</p>
                <ul className="flex flex-col gap-2">
                  {group.list.map((a) => (
                    <li key={a.id} className="flex items-center gap-3 rounded-sm border border-line bg-subtle px-4 py-3 text-body-s text-fg-muted">
                      <span className={group.ok ? 'text-fg-accent' : 'text-fg-brand'}>{group.ok ? <Icon name={a.icon} size={18} /> : <X size={18} aria-hidden="true" />}</span>
                      {a.label}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
        </div>
      );
    }

    case 'departures':
      return <DepartureList trip={trip} note={section.content.note} onSelect={onSelectDeparture} />;

    case 'faq':
      return (
        <div className="flex flex-col divide-y divide-line rounded-lg border border-line">
          {items.map((item, i) =>
            typeof item === 'string' ? null : (
              <details key={i} className="group p-5">
                <summary className="flex min-h-6 cursor-pointer list-none items-center justify-between gap-4 text-label text-fg">
                  {item.q}
                  <ChevronDown size={18} className="shrink-0 text-fg-subtle transition-transform group-open:rotate-180" aria-hidden="true" />
                </summary>
                <RichText text={item.a} className="pt-3 text-body-s text-fg-muted" />
              </details>
            ),
          )}
        </div>
      );

    case 'gallery':
      return (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {(section.content.images ?? []).map((img, i) => (
            <SmartImage key={img.url + i} src={img.url} alt={img.alt} className="aspect-[4/3] w-full rounded-md object-cover" />
          ))}
        </div>
      );

    case 'notice':
      return (
        <div className={cx('flex gap-3 rounded-md p-5 text-body-s', section.content.tone === 'warning' ? 'bg-brand-subtle text-fg-brand' : 'bg-accent-subtle text-fg-accent')}>
          {section.content.tone === 'warning' ? <AlertTriangle size={20} className="shrink-0" aria-hidden="true" /> : <Info size={20} className="shrink-0" aria-hidden="true" />}
          <RichText text={section.content.body} className="text-fg" />
        </div>
      );

    default:
      return null;
  }
}

/** Figma “Itinerary Day”. Collapsed on mobile; tap to expand. */
function Itinerary({ trip }: { trip: TripDetail }) {
  const { t } = useI18n();
  const desktop = useMediaQuery('(min-width: 768px)');
  const [openDays, setOpenDays] = useState<Set<number> | null>(null);
  const isOpen = (id: number, index: number) => (openDays ? openDays.has(id) : desktop || index === 0);
  const allOpen = trip.days.every((d, i) => isOpen(d.id, i));

  const toggle = (id: number, index: number) => {
    const base = openDays ?? new Set(trip.days.filter((d, i) => desktop || i === 0).map((d) => d.id));
    const next = new Set(base);
    if (isOpen(id, index)) next.delete(id);
    else next.add(id);
    setOpenDays(next);
  };

  if (!trip.days.length) return null;

  return (
    <div className="flex flex-col">
      <button type="button" onClick={() => setOpenDays(allOpen ? new Set() : new Set(trip.days.map((d) => d.id)))} className="mb-2 self-end text-label text-fg-brand hover:underline">
        {allOpen ? t('trip.collapseAll') : t('trip.expandAll')}
      </button>
      <ol className="flex flex-col">
        {trip.days.map((day, i) => {
          const open = isOpen(day.id, i);
          return (
            <li key={day.id} className="relative flex gap-5 border-b border-line py-6 last:border-0 sm:gap-8">
              {i < trip.days.length - 1 && <span className="absolute start-[26px] top-[76px] bottom-0 w-px bg-line" aria-hidden="true" />}
              <span className="relative flex size-[52px] shrink-0 flex-col items-center justify-center rounded-sm bg-brand-subtle text-fg-brand">
                <span className="text-meta leading-4">{t('trip.day')}</span>
                <span className="text-h4 leading-6">{String(day.dayNumber).padStart(2, '0')}</span>
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-3">
                <button type="button" onClick={() => toggle(day.id, i)} aria-expanded={open} className="flex items-start justify-between gap-4 text-start">
                  <span className="text-h4 text-fg">{day.title}</span>
                  <ChevronDown size={20} className={cx('mt-1 shrink-0 text-fg-subtle transition-transform', open && 'rotate-180')} aria-hidden="true" />
                </button>
                {open && (
                  <>
                    {day.body && <p className="text-body-s text-fg-muted">{day.body}</p>}
                    <ul className="flex flex-wrap gap-x-6 gap-y-2 text-meta text-fg-subtle">
                      {day.walkHours && (
                        <li className="inline-flex items-center gap-2">
                          <Clock size={14} aria-hidden="true" /> {day.walkHours}
                        </li>
                      )}
                      {day.altitude && (
                        <li className="inline-flex items-center gap-2">
                          <Mountain size={14} aria-hidden="true" /> {day.altitude}
                        </li>
                      )}
                      {day.lodging && (
                        <li className="inline-flex items-center gap-2">
                          <Building2 size={14} aria-hidden="true" /> {day.lodging}
                        </li>
                      )}
                      {day.meals && (
                        <li className="inline-flex items-center gap-2">
                          <Utensils size={14} aria-hidden="true" /> {day.meals}
                        </li>
                      )}
                    </ul>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function DepartureList({ trip, note, onSelect }: { trip: TripDetail; note?: string; onSelect: (d: Departure) => void }) {
  const { t, lang } = useI18n();
  const displayPrice = useDisplayPrice();
  if (!trip.departures.length) {
    return <p className="rounded-md bg-subtle p-5 text-body-m text-fg-muted">{t('trip.noDepartures')}</p>;
  }
  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-lg border border-line">
        {trip.departures.map((d) => {
          const soldOut = d.seatsLeft <= 0;
          const low = !soldOut && d.seatsLeft < 4;
          return (
            <li key={d.id} className={cx('flex flex-wrap items-center justify-between gap-4 bg-surface p-4 sm:p-5', soldOut && 'opacity-60')}>
              <div className="flex min-w-[160px] flex-col">
                <span className="text-meta text-fg-subtle">{t('trip.date')}</span>
                <span className="text-label text-fg">{formatDate(d.startDate, lang, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-meta text-fg-subtle">{t('trip.availability')}</span>
                <span className={cx('text-body-s', soldOut ? 'text-fg-subtle line-through' : low ? 'font-semibold text-fg-brand' : 'text-fg')}>
                  {soldOut ? t('trip.soldOut') : low ? t('trip.onlySeatsLeft', { count: d.seatsLeft }) : t('trip.seatsLeft', { count: d.seatsLeft })}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-meta text-fg-subtle">{t('trip.price')}</span>
                <span className="text-label text-fg">{displayPrice(d.priceOverride ?? trip.priceFrom, trip.currency)}</span>
              </div>
              <button
                type="button"
                disabled={soldOut}
                onClick={() => onSelect(d)}
                className="min-h-11 rounded-full border border-line-strong px-5 text-label text-fg transition-colors hover:border-fg disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t('trip.select')}
              </button>
            </li>
          );
        })}
      </ul>
      {note && <p className="text-meta text-fg-subtle">{note}</p>}
    </div>
  );
}
