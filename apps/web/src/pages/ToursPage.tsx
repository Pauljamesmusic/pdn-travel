import { ChevronLeft, ChevronRight, Search, SlidersHorizontal, X } from 'lucide-react';
import { type FormEvent, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { TripCard, TripCardSkeleton } from '../components/cards/TripCard';
import { Icon } from '../components/Icon';
import { PageHero } from '../components/PageHero';
import { Button, EmptyState, ErrorState } from '../components/ui';
import { qs, useApi } from '../lib/api';
import { useDisplayPrice } from '../lib/currency';
import { cx } from '../lib/format';
import { useBodyLock, useDocumentMeta, useFocusTrap } from '../lib/hooks';
import { useI18n } from '../lib/i18n';
import type { Filters, Paged, TripCard as TripCardData } from '../lib/types';

const FILTER_KEYS = ['q', 'continent', 'country', 'activity', 'difficulty', 'minPrice', 'maxPrice', 'minDays', 'maxDays', 'sort'] as const;
const PRICE_STEPS = [500, 1000, 1500, 2000, 3000];
const DURATION_OPTIONS = [
  { key: 'filters.shortTrips', min: '', max: '5' },
  { key: 'filters.midTrips', min: '6', max: '10' },
  { key: 'filters.longTrips', min: '11', max: '' },
] as const;

/**
 * Filters live in the URL so a search survives refresh and can be shared as a link.
 */
export default function ToursPage() {
  const { t } = useI18n();
  const displayPrice = useDisplayPrice();
  const [params, setParams] = useSearchParams();
  const [sheetOpen, setSheetOpen] = useState(false);
  const { data: filters } = useApi<Filters>('/filters', { ttl: 5 * 60_000 });

  const current = Object.fromEntries(FILTER_KEYS.map((k) => [k, params.get(k) ?? ''])) as Record<(typeof FILTER_KEYS)[number], string>;
  const page = Number(params.get('page')) || 1;
  const apiPath = `/trips${qs({ ...current, page, limit: 12 })}`;
  const { data, error, loading, reload } = useApi<Paged<TripCardData>>(apiPath);
  useDocumentMeta(t('nav.tours'), t('pages.toursSubtitle'));

  const update = (changes: Partial<Record<(typeof FILTER_KEYS)[number] | 'page', string>>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    if (!('page' in changes)) next.delete('page');
    if ('continent' in changes && changes.continent !== current.continent) next.delete('country');
    setParams(next, { preventScrollReset: true });
  };

  const clearAll = () => setParams(new URLSearchParams(), { preventScrollReset: true });

  const countries = useMemo(() => {
    const list = filters?.continents ?? [];
    return current.continent ? list.find((c) => c.slug === current.continent)?.countries ?? [] : list.flatMap((c) => c.countries);
  }, [filters, current.continent]);

  const selectedActivities = current.activity ? current.activity.split(',') : [];
  const toggleActivity = (slug: string) => {
    const set = new Set(selectedActivities);
    if (set.has(slug)) set.delete(slug);
    else set.add(slug);
    update({ activity: [...set].join(',') });
  };

  const chips: { label: string; onRemove: () => void }[] = [];
  if (current.q) chips.push({ label: `“${current.q}”`, onRemove: () => update({ q: '' }) });
  if (current.continent) chips.push({ label: filters?.continents.find((c) => c.slug === current.continent)?.name ?? current.continent, onRemove: () => update({ continent: '' }) });
  if (current.country) chips.push({ label: countries.find((c) => c.slug === current.country)?.name ?? current.country, onRemove: () => update({ country: '' }) });
  selectedActivities.forEach((slug) => chips.push({ label: filters?.activities.find((a) => a.slug === slug)?.name ?? slug, onRemove: () => toggleActivity(slug) }));
  if (current.difficulty) chips.push({ label: current.difficulty, onRemove: () => update({ difficulty: '' }) });
  if (current.maxPrice) chips.push({ label: t('filters.upTo', { value: displayPrice(Number(current.maxPrice), 'USD') }), onRemove: () => update({ maxPrice: '' }) });
  if (current.minDays || current.maxDays) {
    const d = DURATION_OPTIONS.find((o) => o.min === current.minDays && o.max === current.maxDays);
    chips.push({ label: d ? t(d.key) : `${current.minDays || 1}–${current.maxDays || '∞'}`, onRemove: () => update({ minDays: '', maxDays: '' }) });
  }

  const filterPanel = (
    <FilterPanel
      filters={filters}
      current={current}
      countries={countries}
      selectedActivities={selectedActivities}
      update={update}
      toggleActivity={toggleActivity}
    />
  );

  return (
    <>
      <PageHero
        eyebrow={t('pages.toursEyebrow')}
        title={t('pages.toursTitle')}
        subtitle={t('pages.toursSubtitle')}
        image="https://images.unsplash.com/photo-1701255136052-b33f78a886a4?auto=format&fit=crop&w=2000&q=80"
        crumbs={[{ label: t('nav.tours') }]}
        size="sm"
      >
        <SearchBox initial={current.q} onSubmit={(q) => update({ q })} />
      </PageHero>

      <div className="container-pdn grid grid-cols-1 gap-10 py-12 lg:grid-cols-[280px_1fr] lg:py-16">
        <aside className="hidden lg:block" aria-label={t('filters.title')}>
          <div className="sticky top-24 flex max-h-[calc(100vh-7rem)] flex-col gap-2 overflow-y-auto pe-2">{filterPanel}</div>
        </aside>

        <section className="flex min-w-0 flex-col gap-6" aria-live="polite" aria-busy={loading}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-body-m text-fg">
              {data ? t('filters.results', { count: data.total }) : t('common.loading')}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSheetOpen(true)}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line-strong px-4 text-label text-fg lg:hidden"
              >
                <SlidersHorizontal size={16} aria-hidden="true" />
                {t('filters.title')}
                {chips.length > 0 && <span className="flex size-6 items-center justify-center rounded-full bg-brand text-meta text-ink-0">{chips.length}</span>}
              </button>
              <label className="sr-only" htmlFor="sort">
                {t('filters.sort')}
              </label>
              <select
                id="sort"
                value={current.sort}
                onChange={(e) => update({ sort: e.target.value })}
                className="min-h-11 rounded-full border border-line-strong bg-surface px-4 text-body-s text-fg"
              >
                <option value="">{t('filters.sortFeatured')}</option>
                <option value="price-asc">{t('filters.sortPriceAsc')}</option>
                <option value="price-desc">{t('filters.sortPriceDesc')}</option>
                <option value="duration-asc">{t('filters.sortDuration')}</option>
                <option value="rating">{t('filters.sortRating')}</option>
              </select>
            </div>
          </div>

          {chips.length > 0 && (
            <ul className="flex flex-wrap items-center gap-2">
              {chips.map((chip) => (
                <li key={chip.label}>
                  <button type="button" onClick={chip.onRemove} className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-inverse py-1.5 pe-2.5 ps-3.5 text-meta text-fg-inverse">
                    {chip.label}
                    <X size={14} aria-label="Remove" />
                  </button>
                </li>
              ))}
              <li>
                <button type="button" onClick={clearAll} className="min-h-9 px-2 text-meta text-fg-brand underline-offset-4 hover:underline">
                  {t('filters.clear')}
                </button>
              </li>
            </ul>
          )}

          {error && <ErrorState message={t('common.error')} onRetry={reload} retryLabel={t('common.retry')} />}

          {loading && !data ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }, (_, i) => (
                <TripCardSkeleton key={i} />
              ))}
            </div>
          ) : data && data.items.length === 0 ? (
            <EmptyState
              icon={<Search size={32} className="text-fg-subtle" aria-hidden="true" />}
              title={t('filters.noTrips')}
              body={t('filters.noTripsHint')}
              action={
                <Button variant="secondary" size="sm" onClick={clearAll}>
                  {t('filters.clear')}
                </Button>
              }
            />
          ) : (
            data && (
              <div className={cx('grid gap-6 transition-opacity sm:grid-cols-2 xl:grid-cols-3', loading && 'opacity-60')}>
                {data.items.map((trip) => (
                  <TripCard key={trip.slug} trip={trip} />
                ))}
              </div>
            )
          )}

          {data && data.pageCount > 1 && (
            <nav aria-label="Pagination" className="flex items-center justify-center gap-2 pt-6">
              <PageButton disabled={page <= 1} onClick={() => update({ page: String(page - 1) })} label={t('section.prev')}>
                <ChevronLeft size={18} className="rtl:-scale-x-100" aria-hidden="true" />
              </PageButton>
              {Array.from({ length: data.pageCount }, (_, i) => i + 1).map((n) => (
                <PageButton key={n} active={n === page} onClick={() => update({ page: String(n) })} label={`Page ${n}`}>
                  {n}
                </PageButton>
              ))}
              <PageButton disabled={page >= data.pageCount} onClick={() => update({ page: String(page + 1) })} label={t('section.next')}>
                <ChevronRight size={18} className="rtl:-scale-x-100" aria-hidden="true" />
              </PageButton>
            </nav>
          )}
        </section>
      </div>

      {sheetOpen &&
        createPortal(
          <FilterSheet onClose={() => setSheetOpen(false)} onClear={clearAll} total={data?.total ?? 0}>
            {filterPanel}
          </FilterSheet>,
          document.body,
        )}
    </>
  );
}

function SearchBox({ initial, onSubmit }: { initial: string; onSubmit: (q: string) => void }) {
  const { t } = useI18n();
  const [value, setValue] = useState(initial);
  useEffect(() => setValue(initial), [initial]);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit(value.trim());
  };
  return (
    <form onSubmit={submit} role="search" className="flex w-full max-w-xl items-center gap-2 rounded-full border border-white/15 bg-white/10 p-1.5 ps-5 backdrop-blur-md">
      <Search size={18} className="shrink-0 text-fg-muted" aria-hidden="true" />
      <label htmlFor="tour-search" className="sr-only">
        {t('filters.search')}
      </label>
      <input id="tour-search" type="search" value={value} onChange={(e) => setValue(e.target.value)} placeholder={t('search.placeholder')} className="min-w-0 flex-1 bg-transparent text-body-m text-fg outline-none placeholder:text-fg-muted" />
      <Button type="submit" size="sm">
        {t('search.submit')}
      </Button>
    </form>
  );
}

function FilterPanel({
  filters,
  current,
  countries,
  selectedActivities,
  update,
  toggleActivity,
}: {
  filters?: Filters;
  current: Record<string, string>;
  countries: { name: string; slug: string }[];
  selectedActivities: string[];
  update: (c: Record<string, string>) => void;
  toggleActivity: (slug: string) => void;
}) {
  const { t } = useI18n();
  const displayPrice = useDisplayPrice();
  return (
    <>
      <FilterGroup title={t('filters.continent')}>
        <RadioList
          name="continent"
          value={current.continent}
          options={[{ value: '', label: t('filters.any') }, ...(filters?.continents.map((c) => ({ value: c.slug, label: c.name })) ?? [])]}
          onChange={(v) => update({ continent: v })}
        />
      </FilterGroup>
      <FilterGroup title={t('filters.country')}>
        <select value={current.country} onChange={(e) => update({ country: e.target.value })} className="min-h-11 w-full rounded-md border border-line bg-surface px-3 text-body-s text-fg" aria-label={t('filters.country')}>
          <option value="">{t('filters.any')}</option>
          {countries.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </FilterGroup>
      <FilterGroup title={t('filters.activity')}>
        <div className="flex flex-wrap gap-2">
          {filters?.activities.map((a) => {
            const on = selectedActivities.includes(a.slug);
            return (
              <button
                key={a.slug}
                type="button"
                aria-pressed={on}
                onClick={() => toggleActivity(a.slug)}
                className={cx('inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3 text-meta transition-colors', on ? 'border-inverse bg-inverse text-fg-inverse' : 'border-line bg-subtle text-fg-muted hover:border-line-strong')}
              >
                <Icon name={a.icon} size={14} />
                {a.name}
              </button>
            );
          })}
        </div>
      </FilterGroup>
      <FilterGroup title={t('filters.duration')}>
        <RadioList
          name="duration"
          value={`${current.minDays}|${current.maxDays}`}
          options={[{ value: '|', label: t('filters.any') }, ...DURATION_OPTIONS.map((o) => ({ value: `${o.min}|${o.max}`, label: t(o.key) }))]}
          onChange={(v) => {
            const [minDays, maxDays] = v.split('|');
            update({ minDays, maxDays });
          }}
        />
      </FilterGroup>
      <FilterGroup title={t('filters.price')}>
        <RadioList
          name="price"
          value={current.maxPrice}
          options={[{ value: '', label: t('filters.any') }, ...PRICE_STEPS.map((p) => ({ value: String(p), label: t('filters.upTo', { value: displayPrice(p, 'USD') }) }))]}
          onChange={(v) => update({ maxPrice: v })}
        />
      </FilterGroup>
      <FilterGroup title={t('filters.difficulty')}>
        <RadioList
          name="difficulty"
          value={current.difficulty}
          options={[{ value: '', label: t('filters.any') }, ...(filters?.difficulties.map((d) => ({ value: d, label: d })) ?? [])]}
          onChange={(v) => update({ difficulty: v })}
        />
      </FilterGroup>
    </>
  );
}

function FilterGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-3 border-b border-line py-5 first:pt-0">
      <legend className="mb-3 text-caps text-fg-subtle">{title}</legend>
      {children}
    </fieldset>
  );
}

function RadioList({ name, value, options, onChange }: { name: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-1">
      {options.map((o) => (
        <label key={o.value} className="flex min-h-10 cursor-pointer items-center gap-3 rounded-sm px-2 text-body-s text-fg hover:bg-subtle">
          <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} className="size-4 accent-[var(--bg-brand)]" />
          {o.label}
        </label>
      ))}
    </div>
  );
}

function PageButton({ children, active, disabled, onClick, label }: { children: ReactNode; active?: boolean; disabled?: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        onClick();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }}
      disabled={disabled}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      className={cx('flex size-11 items-center justify-center rounded-full text-label transition-colors disabled:opacity-40', active ? 'bg-inverse text-fg-inverse' : 'border border-line text-fg hover:border-line-strong')}
    >
      {children}
    </button>
  );
}

function FilterSheet({ onClose, onClear, total, children }: { onClose: () => void; onClear: () => void; total: number; children: ReactNode }) {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  useBodyLock(true);
  useFocusTrap(ref, true, onClose);
  return (
    <div className="fixed inset-0 z-[70] lg:hidden">
      <button type="button" tabIndex={-1} aria-label={t('search.close')} className="absolute inset-0 bg-ink-950/60" onClick={onClose} />
      <div ref={ref} role="dialog" aria-modal="true" aria-label={t('filters.title')} className="absolute inset-x-0 bottom-0 flex max-h-[88vh] flex-col rounded-t-lg bg-surface shadow-lg animate-[fade-up_.25s_var(--ease-out-soft)]">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <p className="text-h4 text-fg">{t('filters.title')}</p>
          <button type="button" onClick={onClose} aria-label={t('search.close')} className="flex size-11 items-center justify-center rounded-full border border-line">
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5">{children}</div>
        <div className="flex items-center gap-3 border-t border-line px-5 py-4 [padding-bottom:max(1rem,env(safe-area-inset-bottom))]">
          <Button variant="secondary" size="sm" onClick={onClear}>
            {t('filters.clear')}
          </Button>
          <Button size="sm" className="flex-1" onClick={onClose}>
            {t('filters.show', { count: total })}
          </Button>
        </div>
      </div>
    </div>
  );
}
