import { ArrowRight, Calendar, ChevronLeft, ChevronRight, MapPin } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { cx } from '../../lib/format';
import { useCountdown, useReveal } from '../../lib/hooks';
import { useI18n } from '../../lib/i18n';
import type { Activity, ContinentSummary, CountrySummary, HomeSettings, Testimonial, TripCard as TripCardData } from '../../lib/types';
import { ActivityCard, ContinentCard, CountryCard, FeatureCard, TestimonialCard } from '../cards/cards';
import { TripCard } from '../cards/TripCard';
import { AccentTitle, Button, ButtonLink, Chip, Eyebrow, SectionHeader, UnderlineLink } from '../ui';

/* ─── 02 · Continents ──────────────────────────────────────────────────────── */
export function ContinentsSection({ home, continents }: { home?: HomeSettings; continents: ContinentSummary[] }) {
  const { t } = useI18n();
  const ref = useReveal<HTMLElement>();
  const copy = home?.continents;
  return (
    <section ref={ref} className="container-pdn flex flex-col gap-10 py-16 lg:gap-12 lg:pb-[120px] lg:pt-[112px]" aria-labelledby="continents-title">
      <SectionHeader
        eyebrow={copy?.eyebrow}
        lead={copy?.titleLead}
        accent={copy?.titleAccent}
        tail={copy?.titleTail}
        body={copy?.body}
        action={<UnderlineLink to="/destinations">{t('section.viewAllDestinations')}</UnderlineLink>}
      />
      <span id="continents-title" className="sr-only">
        {copy?.eyebrow}
      </span>
      <div className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2 no-scrollbar sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-0 lg:grid-cols-6">
        {continents.map((c, i) => (
          <div key={c.slug} className="w-[156px] shrink-0 snap-start reveal sm:w-auto" style={{ ['--reveal-delay' as string]: `${i * 60}ms` }}>
            <ContinentCard continent={c} to={`/destinations#${c.slug}`} />
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─── 03 · Featured countries (carousel with region chips) ─────────────────── */
export function FeaturedCountriesSection({ home, countries }: { home?: HomeSettings; countries: CountrySummary[] }) {
  const { t } = useI18n();
  const ref = useReveal<HTMLElement>();
  const trackRef = useRef<HTMLDivElement>(null);
  const [region, setRegion] = useState('');
  const [progress, setProgress] = useState({ current: 1, total: 1, ratio: 0 });
  const copy = home?.countries;

  const regions = useMemo(() => [...new Set(countries.map((c) => c.region).filter(Boolean))] as string[], [countries]);
  const visible = region ? countries.filter((c) => c.region === region) : countries;

  const updateProgress = () => {
    const track = trackRef.current;
    if (!track) return;
    const card = track.firstElementChild as HTMLElement | null;
    const step = card ? card.offsetWidth + 32 : track.clientWidth;
    const max = track.scrollWidth - track.clientWidth;
    const scroll = Math.abs(track.scrollLeft);
    const perView = Math.max(1, Math.round(track.clientWidth / step));
    setProgress({
      current: Math.min(visible.length, Math.round(scroll / step) + perView),
      total: visible.length,
      ratio: max > 0 ? scroll / max : 1,
    });
  };

  useEffect(() => {
    trackRef.current?.scrollTo({ left: 0 });
    updateProgress();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region, visible.length]);

  const scrollBy = (dir: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    const card = track.firstElementChild as HTMLElement | null;
    const rtl = document.documentElement.dir === 'rtl' ? -1 : 1;
    track.scrollBy({ left: dir * rtl * (card ? card.offsetWidth + 32 : track.clientWidth), behavior: 'smooth' });
  };

  if (!countries.length) return null;

  return (
    <section ref={ref} className="bg-subtle" aria-label={copy?.eyebrow}>
      <div className="container-pdn flex flex-col gap-10 py-16 lg:gap-12 lg:pb-[120px] lg:pt-[112px]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex max-w-xl flex-col gap-3 reveal">
            {copy?.eyebrow && <Eyebrow>{copy.eyebrow}</Eyebrow>}
            <AccentTitle lead={copy?.titleLead} accent={copy?.titleAccent} tail={copy?.titleTail} className="text-h1 text-fg" />
          </div>
          <div className="flex flex-col gap-5 reveal lg:items-end">
            <div className="-mx-5 flex gap-2 overflow-x-auto px-5 no-scrollbar lg:mx-0 lg:px-0">
              <Chip active={!region} onClick={() => setRegion('')}>
                {t('section.all')}
              </Chip>
              {regions.map((r) => (
                <Chip key={r} active={region === r} onClick={() => setRegion(r)}>
                  {r}
                </Chip>
              ))}
            </div>
            <div className="hidden items-center gap-4 lg:flex">
              <span className="relative h-0.5 w-[120px] overflow-hidden bg-line-strong" aria-hidden="true">
                <span
                  className="absolute inset-y-0 start-0 w-1/2 bg-fg transition-transform duration-300"
                  style={{ transform: `translateX(${progress.ratio * 100}%)` }}
                />
              </span>
              <span className="text-meta text-fg-muted" aria-live="polite">
                {String(progress.current).padStart(2, '0')} / {String(progress.total).padStart(2, '0')}
              </span>
              <button type="button" onClick={() => scrollBy(-1)} aria-label={t('section.prev')} className="flex size-12 items-center justify-center rounded-full border border-line-strong bg-surface text-fg hover:border-fg">
                <ChevronLeft size={20} className="rtl:-scale-x-100" aria-hidden="true" />
              </button>
              <button type="button" onClick={() => scrollBy(1)} aria-label={t('section.next')} className="flex size-12 items-center justify-center rounded-full bg-inverse text-fg-inverse hover:opacity-90">
                <ChevronRight size={20} className="rtl:-scale-x-100" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>

        <div
          ref={trackRef}
          onScroll={updateProgress}
          className="-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-5 pb-4 pt-1 no-scrollbar sm:gap-8 lg:mx-0 lg:px-0"
        >
          {visible.map((country) => (
            <div key={country.slug} className="w-[82%] max-w-[296px] shrink-0 snap-start sm:w-[296px] lg:w-[calc((100%-96px)/4)] lg:max-w-none">
              <CountryCard country={country} />
            </div>
          ))}
        </div>

        <div className="flex justify-center gap-1.5 lg:hidden" aria-hidden="true">
          {visible.map((c, i) => (
            <span key={c.slug} className={cx('h-1.5 rounded-full transition-all', i === progress.current - 1 ? 'w-5 bg-fg' : 'w-1.5 bg-line-strong')} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Featured trips ───────────────────────────────────────────────────────── */
export function FeaturedTripsSection({ home, trips }: { home?: HomeSettings; trips: TripCardData[] }) {
  const { t } = useI18n();
  const ref = useReveal<HTMLElement>();
  const copy = home?.trips;
  if (!trips.length) return null;
  return (
    <section ref={ref} className="container-pdn flex flex-col gap-10 py-16 lg:gap-12 lg:py-[112px]">
      <SectionHeader
        eyebrow={copy?.eyebrow}
        lead={copy?.titleLead}
        accent={copy?.titleAccent}
        tail={copy?.titleTail}
        body={copy?.body}
        action={<UnderlineLink to="/tours">{t('section.viewAllTrips')}</UnderlineLink>}
      />
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
        {trips.slice(0, 6).map((trip, i) => (
          <div key={trip.slug} className="reveal" style={{ ['--reveal-delay' as string]: `${(i % 3) * 80}ms` }}>
            <TripCard trip={trip} className="h-full" />
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─── Activities ───────────────────────────────────────────────────────────── */
export function ActivitiesSection({ home, activities }: { home?: HomeSettings; activities: Activity[] }) {
  const { t } = useI18n();
  const ref = useReveal<HTMLElement>();
  const copy = home?.activities;
  const top = [...activities].sort((a, b) => b.tripCount - a.tripCount).slice(0, 6);
  if (!top.length) return null;
  return (
    <section ref={ref} className="bg-subtle">
      <div className="container-pdn flex flex-col gap-10 py-16 lg:gap-12 lg:py-[112px]">
        <SectionHeader
          eyebrow={copy?.eyebrow}
          lead={copy?.titleLead}
          accent={copy?.titleAccent}
          tail={copy?.titleTail}
          body={copy?.body}
          action={<UnderlineLink to="/activities">{t('section.viewAllActivities')}</UnderlineLink>}
        />
        <div className="-mx-5 flex snap-x gap-4 overflow-x-auto px-5 pb-2 no-scrollbar md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0 lg:grid-cols-6">
          {top.map((a, i) => (
            <div key={a.slug} className="w-[200px] shrink-0 snap-start reveal md:w-auto" style={{ ['--reveal-delay' as string]: `${i * 60}ms` }}>
              <ActivityCard activity={a} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── 04 · Why travel with PDN ─────────────────────────────────────────────── */
export function WhySection({ home }: { home?: HomeSettings }) {
  const { t } = useI18n();
  const ref = useReveal<HTMLElement>();
  const why = home?.why;
  if (!why) return null;
  return (
    <section ref={ref} className="container-pdn flex flex-col gap-12 py-16 lg:py-[120px]">
      <div
        data-theme="light"
        className="relative isolate overflow-hidden rounded-[24px] bg-[#f8f8f8] px-6 py-10 reveal sm:px-10 lg:rounded-xl lg:px-16 lg:py-16"
      >
        {/* World map, behind the content, right edge, vertically centred, never cropped */}
        <img
          src="/media/world-map-tight.jpg"
          alt=""
          aria-hidden="true"
          loading="lazy"
          className="pointer-events-none absolute top-1/2 end-0 -z-10 hidden w-[58%] max-w-[880px] -translate-y-1/2 object-contain object-right sm:block"
        />

        <div className="flex max-w-[464px] flex-col gap-6">
          <Eyebrow className="reveal">{why.eyebrow}</Eyebrow>
          <h2 className="text-display-l text-fg reveal">{why.title}</h2>
          <p className="text-body-m text-fg-subtle reveal">{why.body}</p>
          <dl className="flex flex-wrap gap-8 reveal">
            {why.facts.map((fact) => (
              <div key={fact.label} className="flex flex-col gap-0.5 border-s-2 border-red-500 ps-4">
                <dt className="order-2 text-meta text-fg-muted">{fact.label}</dt>
                <dd className="order-1 font-serif text-[36px] leading-[42px] text-fg">{fact.value}</dd>
              </div>
            ))}
          </dl>
          <div className="reveal">
            <ButtonLink to="/support/about" variant="secondary" icon>
              {t('section.aboutPdn')}
            </ButtonLink>
          </div>
        </div>
        <img src="/media/world-map-tight.jpg" alt="" aria-hidden="true" loading="lazy" className="mt-8 w-full rounded-2xl sm:hidden" />
      </div>
      <div className="grid grid-cols-1 items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {why.features.map((f, i) => (
          <div key={f.title} className="reveal h-full" style={{ ['--reveal-delay' as string]: `${i * 80}ms` }}>
            <FeatureCard icon={f.icon} title={f.title} body={f.body} accent={f.accent} />
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─── 05 · World Tourism Day 2026 ──────────────────────────────────────────── */
export function TourismDaySection({ home }: { home?: HomeSettings }) {
  const { t } = useI18n();
  const event = home?.event;
  const countdown = useCountdown(event?.date);
  const ref = useReveal<HTMLElement>();
  if (!event) return null;

  const addToCalendar = () => {
    const start = new Date(event.date);
    const end = new Date(start.getTime() + 4 * 3600_000);
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//PDN Travel//World Tourism Day//EN',
      'BEGIN:VEVENT',
      `UID:wtd-2026@pdntravel.com`,
      `DTSTAMP:${fmt(new Date())}`,
      `DTSTART:${fmt(start)}`,
      `DTEND:${fmt(end)}`,
      `SUMMARY:${event.titleLead} ${event.titleAccent} — PDN grand opening`,
      `LOCATION:${event.location}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pdn-world-tourism-day-2026.ics';
    a.click();
    URL.revokeObjectURL(url);
  };

  const tiles = [
    { value: countdown.days, label: t('section.days') },
    { value: countdown.hours, label: t('section.hours') },
    { value: countdown.minutes, label: t('section.mins') },
    { value: countdown.seconds, label: t('section.secs') },
  ];

  return (
    <section ref={ref} id="tourism-day" className="container-pdn scroll-mt-24 pb-16 lg:pb-[120px]">
      <div
        data-theme="dark"
        className="relative isolate overflow-hidden rounded-[24px] bg-black px-6 py-10 reveal sm:px-10 lg:rounded-xl lg:px-16 lg:py-16"
      >
        {/* World globe with landmarks, filling the card behind the content */}
        <img
          src="/media/world-tourism-globe.png"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 hidden size-full object-contain object-right sm:block"
        />

        <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex max-w-[520px] flex-col items-start gap-6">
            <span className="inline-flex items-center gap-2 rounded-full bg-red-500 py-1.5 pe-3.5 ps-3 text-caps text-ink-0">
              <Calendar size={14} aria-hidden="true" /> {event.chip}
            </span>
            <AccentTitle lead={event.titleLead} accent={event.titleAccent} className="text-display-l text-fg" accentClassName="text-red-400" />
            <p className="text-body-l text-fg-muted">{event.body}</p>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-label text-fg">
              <span className="inline-flex items-center gap-2">
                <Calendar size={18} aria-hidden="true" /> {event.dateLabel}
              </span>
              <span className="inline-flex items-center gap-2">
                <MapPin size={18} aria-hidden="true" /> {event.location}
              </span>
            </div>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <ButtonLink to={event.primaryLink} icon>
                {event.primaryLabel}
              </ButtonLink>
              <Button variant="glass" onClick={addToCalendar}>
                {event.secondaryLabel}
              </Button>
            </div>
          </div>

          <div className="flex flex-col items-center gap-3.5">
            {countdown.done ? (
              <p className="text-h4 text-fg">{t('section.eventStarted')}</p>
            ) : (
              <div className="grid grid-cols-4 gap-2 sm:gap-3" role="timer" aria-label={event.countdownLabel}>
                {tiles.map((tile) => (
                  <div key={tile.label} className="mx-auto flex w-full max-w-[88px] flex-col items-center gap-0.5 rounded-[20px] border border-white/15 bg-white/5 pb-3.5 pt-4 backdrop-blur-md">
                    <span className="font-serif text-[34px] leading-[44px] tabular-nums text-fg sm:text-[40px]">{String(tile.value).padStart(2, '0')}</span>
                    <span className="text-caps text-fg-muted">{tile.label}</span>
                  </div>
                ))}
              </div>
            )}
            <p className="text-meta text-fg-muted">{event.countdownLabel}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Testimonials ─────────────────────────────────────────────────────────── */
export function TestimonialsSection({ home, testimonials }: { home?: HomeSettings; testimonials: Testimonial[] }) {
  const { t } = useI18n();
  const ref = useReveal<HTMLElement>();
  const copy = home?.testimonials;
  if (!testimonials.length) return null;
  return (
    <section ref={ref} className="container-pdn flex flex-col gap-10 pb-16 lg:gap-12 lg:pb-[120px]">
      <SectionHeader
        eyebrow={copy?.eyebrow}
        lead={copy?.titleLead}
        accent={copy?.titleAccent}
        tail={copy?.titleTail}
        action={
          <ButtonLink to="/testimonials" variant="secondary" size="sm">
            {t('nav.testimonials')} <ArrowRight size={16} className="rtl:-scale-x-100" aria-hidden="true" />
          </ButtonLink>
        }
      />
      <div className="-mx-5 flex snap-x gap-4 overflow-x-auto px-5 pb-2 no-scrollbar md:mx-0 md:grid md:grid-cols-3 md:gap-6 md:overflow-visible md:px-0">
        {testimonials.slice(0, 3).map((item, i) => (
          <div key={item.id} className="w-[85%] shrink-0 snap-start reveal md:w-auto" style={{ ['--reveal-delay' as string]: `${i * 80}ms` }}>
            <TestimonialCard testimonial={item} />
          </div>
        ))}
      </div>
    </section>
  );
}
