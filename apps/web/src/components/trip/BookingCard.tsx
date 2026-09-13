import { Calendar, ChevronLeft, ChevronRight, MessageCircle, Minus, Plus, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { cx, formatDate, formatPrice, waLink } from '../../lib/format';
import { useI18n } from '../../lib/i18n';
import type { Departure, TripDetail } from '../../lib/types';
import { useSite } from '../SiteContext';
import { Button } from '../ui';

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

/**
 * Figma “Booking Card”: price, departure date field with an inline month grid
 * (only real departure dates are selectable), travellers stepper and the enquiry CTA.
 */
export function BookingCard({
  trip,
  selected,
  onSelect,
  travellers,
  onTravellers,
  onEnquire,
}: {
  trip: TripDetail;
  selected: Departure | null;
  onSelect: (d: Departure) => void;
  travellers: number;
  onTravellers: (n: number) => void;
  onEnquire: () => void;
}) {
  const { t, lang } = useI18n();
  const { site } = useSite();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const firstDate = trip.departures[0] ? new Date(trip.departures[0].startDate) : new Date();
  const [month, setMonth] = useState(() => new Date(firstDate.getFullYear(), firstDate.getMonth(), 1));

  useEffect(() => {
    if (selected) {
      const d = new Date(selected.startDate);
      setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
    }
  }, [selected]);

  const byDay = useMemo(() => new Map(trip.departures.map((d) => [dayKey(new Date(d.startDate)), d])), [trip.departures]);
  const months = useMemo(() => [...new Set(trip.departures.map((d) => { const x = new Date(d.startDate); return x.getFullYear() * 12 + x.getMonth(); }))].sort((a, b) => a - b), [trip.departures]);
  const monthIndex = month.getFullYear() * 12 + month.getMonth();
  const price = selected?.priceOverride ?? trip.priceFrom;

  const weekdays = useMemo(() => {
    const monday = new Date(2024, 0, 1);
    return Array.from({ length: 7 }, (_, i) => formatDate(new Date(monday.getTime() + i * 86_400_000), lang, { weekday: 'narrow' }));
  }, [lang]);

  const cells = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7;
    const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return [...Array.from({ length: offset }, () => null), ...Array.from({ length: days }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1))];
  }, [month]);

  const step = (delta: number) => {
    const target = months.find((m) => (delta > 0 ? m > monthIndex : false)) ?? [...months].reverse().find((m) => (delta < 0 ? m < monthIndex : false));
    if (target !== undefined) setMonth(new Date(Math.floor(target / 12), target % 12, 1));
  };

  return (
    <div id="booking" className="flex scroll-mt-28 flex-col gap-6 rounded-lg border border-line bg-surface p-6 shadow-md lg:p-8">
      <div className="flex items-baseline justify-between gap-2">
        <p className="flex items-baseline gap-2">
          <span className="font-serif text-[36px] leading-[42px] text-fg">{formatPrice(price, trip.currency, lang)}</span>
          <span className="text-meta text-fg-subtle">{t('trip.perPerson')}</span>
        </p>
        <span className="text-meta text-fg-muted">{t('card.days', { count: trip.durationDays })}</span>
      </div>

      {trip.departures.length > 0 ? (
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => setCalendarOpen((v) => !v)}
            aria-expanded={calendarOpen}
            className="flex h-14 items-center justify-between rounded-md border border-line bg-subtle px-5 text-start transition-colors hover:border-line-strong"
          >
            <span className="flex flex-col">
              <span className="text-meta text-fg-subtle">{t('trip.departureDate')}</span>
              <span className="text-body-s text-fg">{selected ? formatDate(selected.startDate, lang) : t('trip.chooseDate')}</span>
            </span>
            <Calendar size={18} className="text-fg-muted" aria-hidden="true" />
          </button>

          {calendarOpen && (
            <div className="flex flex-col gap-4 rounded-md border border-line bg-canvas p-4">
              <div className="flex items-center justify-between">
                <button type="button" onClick={() => step(-1)} disabled={monthIndex <= months[0]} aria-label={t('section.prev')} className="flex size-9 items-center justify-center rounded-full hover:bg-muted disabled:opacity-30">
                  <ChevronLeft size={16} className="rtl:-scale-x-100" aria-hidden="true" />
                </button>
                <p className="text-label text-fg">{formatDate(month, lang, { month: 'long', year: 'numeric' })}</p>
                <button type="button" onClick={() => step(1)} disabled={monthIndex >= months[months.length - 1]} aria-label={t('section.next')} className="flex size-9 items-center justify-center rounded-full hover:bg-muted disabled:opacity-30">
                  <ChevronRight size={16} className="rtl:-scale-x-100" aria-hidden="true" />
                </button>
              </div>
              <div className="grid grid-cols-7 gap-1.5 text-center" role="grid">
                {weekdays.map((w, i) => (
                  <span key={i} className="text-meta text-fg-subtle" aria-hidden="true">
                    {w}
                  </span>
                ))}
                {cells.map((date, i) => {
                  if (!date) return <span key={`e${i}`} />;
                  const departure = byDay.get(dayKey(date));
                  const soldOut = departure ? departure.seatsLeft <= 0 : false;
                  const isSelected = departure && selected?.id === departure.id;
                  return (
                    <button
                      key={i}
                      type="button"
                      disabled={!departure || soldOut}
                      onClick={() => {
                        if (departure) {
                          onSelect(departure);
                          setCalendarOpen(false);
                        }
                      }}
                      aria-label={departure ? `${formatDate(date, lang)} — ${soldOut ? t('trip.soldOut') : t('trip.seatsLeft', { count: departure.seatsLeft })}` : undefined}
                      className={cx(
                        'relative flex h-9 items-center justify-center rounded-sm text-meta tabular-nums',
                        isSelected ? 'bg-brand text-ink-0' : departure && !soldOut ? 'font-semibold text-fg hover:bg-brand-subtle' : 'text-fg-subtle',
                        soldOut && 'line-through',
                      )}
                    >
                      {date.getDate()}
                      {departure && !soldOut && !isSelected && <span className="absolute bottom-1 size-1 rounded-full bg-red-500" aria-hidden="true" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {selected && (
            <p className={cx('text-meta', selected.seatsLeft < 4 ? 'font-semibold text-fg-brand' : 'text-fg-muted')}>
              {selected.seatsLeft < 4 ? t('trip.onlySeatsLeft', { count: selected.seatsLeft }) : t('trip.seatsLeft', { count: selected.seatsLeft })}
            </p>
          )}
        </div>
      ) : (
        <p className="rounded-md bg-subtle p-4 text-body-s text-fg-muted">{t('trip.noDepartures')}</p>
      )}

      <div className="flex h-14 items-center justify-between rounded-md border border-line bg-subtle px-5">
        <span className="flex items-center gap-3">
          <Users size={18} className="text-fg-muted" aria-hidden="true" />
          <span className="flex flex-col">
            <span className="text-meta text-fg-subtle">{t('trip.travellers')}</span>
            <span className="text-body-s text-fg" aria-live="polite">
              {t('search.travellersValue', { count: travellers })}
            </span>
          </span>
        </span>
        <span className="flex items-center gap-1">
          <button type="button" onClick={() => onTravellers(Math.max(1, travellers - 1))} aria-label="−" className="flex size-9 items-center justify-center rounded-full border border-line-strong text-fg disabled:opacity-40" disabled={travellers <= 1}>
            <Minus size={14} aria-hidden="true" />
          </button>
          <button type="button" onClick={() => onTravellers(Math.min(trip.groupSizeMax ?? 30, travellers + 1))} aria-label="+" className="flex size-9 items-center justify-center rounded-full border border-line-strong text-fg">
            <Plus size={14} aria-hidden="true" />
          </button>
        </span>
      </div>

      <Button icon onClick={onEnquire} className="w-full">
        {t('trip.enquire')}
      </Button>
      <p className="-mt-2 text-meta text-fg-subtle">{t('trip.noCharge')}</p>
      <a
        href={waLink(site.whatsapp, `Hi PDN Travel, I'm interested in ${trip.title}${selected ? ` on ${formatDate(selected.startDate, 'en')}` : ''}.`)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-line text-label text-fg transition-colors hover:border-line-strong"
      >
        <MessageCircle size={18} className="text-[#25D366]" aria-hidden="true" />
        {t('trip.askWhatsapp')}
      </a>
    </div>
  );
}
