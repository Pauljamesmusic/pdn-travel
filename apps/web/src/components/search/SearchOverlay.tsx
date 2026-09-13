import { ArrowUpRight, Clock, Globe, MapPin, Search, X } from 'lucide-react';
import {
  createContext,
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { qs, useApi } from '../../lib/api';
import { useDisplayPrice } from '../../lib/currency';
import { cx } from '../../lib/format';
import { useBodyLock, useDebounced, useFocusTrap } from '../../lib/hooks';
import { useI18n } from '../../lib/i18n';
import type { SearchResult } from '../../lib/types';
import { Icon } from '../Icon';
import { SmartImage, Spinner } from '../ui';

interface SearchContextValue {
  open: (query?: string) => void;
  close: () => void;
  isOpen: boolean;
}

const SearchContext = createContext<SearchContextValue | null>(null);

export function useSearch() {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error('useSearch must be used inside SearchProvider');
  return ctx;
}

export function SearchProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [initialQuery, setInitialQuery] = useState('');
  const location = useLocation();

  const open = useCallback((query = '') => {
    setInitialQuery(query);
    setIsOpen(true);
  }, []);
  const close = useCallback(() => setIsOpen(false), []);

  useEffect(() => setIsOpen(false), [location.pathname, location.search]);

  // ⌘K / Ctrl+K opens search anywhere on the public site.
  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setIsOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const value = useMemo(() => ({ open, close, isOpen }), [open, close, isOpen]);
  return (
    <SearchContext.Provider value={value}>
      {children}
      {isOpen && createPortal(<SearchOverlay initialQuery={initialQuery} onClose={close} />, document.body)}
    </SearchContext.Provider>
  );
}

type Item =
  | { kind: 'country'; slug: string; label: string; meta: string; price: number | null; image: string | null }
  | { kind: 'trip'; slug: string; label: string; meta: string; price: number; currency: string; image: string | null }
  | { kind: 'activity'; slug: string; label: string; icon?: string }
  | { kind: 'continent'; slug: string; label: string };

function SearchOverlay({ initialQuery, onClose }: { initialQuery: string; onClose: () => void }) {
  const { t } = useI18n();
  const displayPrice = useDisplayPrice();
  const navigate = useNavigate();
  const [query, setQuery] = useState(initialQuery);
  const [active, setActive] = useState(0);
  const debounced = useDebounced(query.trim(), 250);
  const { data, loading } = useApi<SearchResult>(`/search${qs({ q: debounced })}`, { ttl: 60_000 });
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useBodyLock(true);
  useFocusTrap(dialogRef, true, onClose);
  useEffect(() => {
    const id = window.setTimeout(() => inputRef.current?.focus(), 40);
    return () => window.clearTimeout(id);
  }, []);

  // Flatten results in visual order so arrow keys follow what the user sees.
  const { items, groups, trips, activities } = useMemo(() => {
    const list: Item[] = [];
    const groups = (data?.groups ?? []).map((g) => {
      const continentIndex = list.push({ kind: 'continent', slug: g.continent.slug, label: g.continent.name }) - 1;
      const countries = g.countries.map((c) => {
        const index =
          list.push({
            kind: 'country',
            slug: c.slug,
            label: c.name,
            meta: `${g.continent.name} · ${c.tripCount ? t('search.tripCount', { count: c.tripCount }) : t('search.noTrips')}`,
            price: c.priceFrom,
            image: c.image,
          }) - 1;
        return { ...c, index };
      });
      return { ...g, continentIndex, countries };
    });
    const trips = (data?.trips ?? []).map((trip) => ({
      ...trip,
      index:
        list.push({
          kind: 'trip',
          slug: trip.slug,
          label: trip.title,
          meta: `${trip.country.name} · ${t('card.days', { count: trip.durationDays })}`,
          price: trip.priceFrom,
          currency: trip.currency,
          image: trip.coverImage,
        }) - 1,
    }));
    const activities = (data?.activities ?? []).map((a) => ({
      ...a,
      index: list.push({ kind: 'activity', slug: a.slug, label: a.name, icon: a.icon }) - 1,
    }));
    return { items: list, groups, trips, activities };
  }, [data, t]);

  useEffect(() => setActive(0), [debounced]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const go = useCallback(
    (item: Item | undefined) => {
      if (!item) {
        navigate(`/tours${qs({ q: query.trim() })}`);
        return;
      }
      const to =
        item.kind === 'country'
          ? `/destinations/${item.slug}`
          : item.kind === 'trip'
            ? `/tours/${item.slug}`
            : item.kind === 'activity'
              ? `/activities/${item.slug}`
              : `/tours${qs({ continent: item.slug })}`;
      navigate(to);
      onClose();
    },
    [navigate, onClose, query],
  );

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((i) => Math.min(i + 1, Math.max(items.length - 1, 0)));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      go(query.trim() && !items.length ? undefined : items[active]);
    }
  };

  const optionId = (index: number) => `search-option-${index}`;
  const rowClass = (index: number) =>
    cx(
      'flex w-full items-center justify-between gap-4 rounded-sm p-3 text-start transition-colors duration-150 sm:p-4',
      index === active ? 'bg-muted' : 'hover:bg-subtle',
    );

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center" role="presentation">
      <button type="button" aria-label={t('search.close')} className="absolute inset-0 bg-ink-950/55 backdrop-blur-sm animate-[fade-up_.2s_ease-out]" onClick={onClose} tabIndex={-1} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('nav.search')}
        className="relative flex h-full w-full flex-col bg-surface sm:mt-[8vh] sm:h-auto sm:max-h-[80vh] sm:w-[min(880px,calc(100%-2.5rem))] sm:overflow-hidden sm:rounded-lg sm:border sm:border-line sm:shadow-lg animate-[fade-up_.28s_var(--ease-out-soft)]"
      >
        {/* Floating search bar */}
        <div className="flex items-center gap-3 border-b border-line p-3 sm:p-4">
          <label htmlFor="global-search" className="sr-only">
            {t('nav.search')}
          </label>
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand text-ink-0">
            <Search size={20} aria-hidden="true" />
          </span>
          <input
            ref={inputRef}
            id="global-search"
            type="search"
            role="combobox"
            aria-expanded="true"
            aria-controls="search-results"
            aria-activedescendant={items.length ? optionId(active) : undefined}
            autoComplete="off"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={t('search.placeholder')}
            className="min-w-0 flex-1 bg-transparent text-body-m text-fg outline-none placeholder:text-fg-subtle [&::-webkit-search-cancel-button]:hidden"
          />
          {loading && <Spinner className="size-5" />}
          <button type="button" onClick={onClose} className="flex size-11 items-center justify-center rounded-full text-fg-muted hover:bg-muted" aria-label={t('search.close')}>
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div ref={listRef} id="search-results" role="listbox" className="flex-1 overflow-y-auto overscroll-contain p-3 sm:p-6">
          {debounced && !loading && !items.length && (
            <p className="px-3 py-10 text-center text-body-m text-fg-muted">{t('search.noResults', { q: debounced })}</p>
          )}

          {trips.length > 0 && (
            <section className="mb-6">
              <p className="px-3 pb-2 text-caps text-fg-subtle sm:px-4">{t('search.matchingTrips')}</p>
              {trips.map((trip) => (
                <button key={trip.slug} id={optionId(trip.index)} data-index={trip.index} role="option" aria-selected={trip.index === active} type="button" className={rowClass(trip.index)} onMouseEnter={() => setActive(trip.index)} onClick={() => go(items[trip.index])}>
                  <span className="flex min-w-0 items-center gap-4">
                    <SmartImage src={trip.coverImage ?? undefined} alt="" className="size-12 shrink-0 rounded-sm object-cover" />
                    <span className="flex min-w-0 flex-col gap-1">
                      <span className="truncate text-body-s text-fg">{trip.title}</span>
                      <span className="inline-flex items-center gap-1.5 text-meta text-fg-subtle">
                        <Clock size={12} aria-hidden="true" /> {trip.country.name} · {t('card.days', { count: trip.durationDays })}
                      </span>
                    </span>
                  </span>
                  <span className="shrink-0 text-meta text-fg-muted">{t('search.from', { price: displayPrice(trip.priceFrom, trip.currency) })}</span>
                </button>
              ))}
            </section>
          )}

          <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
            {groups.map((group) => (
              <section key={group.continent.slug} aria-label={group.continent.name}>
                <button
                  type="button"
                  id={optionId(group.continentIndex)}
                  data-index={group.continentIndex}
                  role="option"
                  aria-selected={group.continentIndex === active}
                  onMouseEnter={() => setActive(group.continentIndex)}
                  onClick={() => go(items[group.continentIndex])}
                  className={cx(
                    'flex w-full items-center justify-between rounded-sm px-3 py-2 text-caps text-fg-subtle sm:px-4',
                    group.continentIndex === active ? 'bg-muted text-fg' : 'hover:text-fg',
                  )}
                >
                  <span className="inline-flex items-center gap-2">
                    <Globe size={14} aria-hidden="true" /> {group.continent.name}
                  </span>
                  <ArrowUpRight size={14} aria-hidden="true" className="rtl:-scale-x-100" />
                </button>
                <div className="flex flex-col gap-1">
                  {group.countries.map((country) => (
                    <button key={country.slug} id={optionId(country.index)} data-index={country.index} role="option" aria-selected={country.index === active} type="button" className={rowClass(country.index)} onMouseEnter={() => setActive(country.index)} onClick={() => go(items[country.index])}>
                      <span className="flex min-w-0 items-center gap-4">
                        <MapPin size={18} className="shrink-0 text-fg-brand" aria-hidden="true" />
                        <span className="flex min-w-0 flex-col gap-1">
                          <span className="truncate text-body-s text-fg">{country.name}</span>
                          <span className="text-meta text-fg-subtle">
                            {group.continent.name} · {country.tripCount ? t('search.tripCount', { count: country.tripCount }) : t('search.noTrips')}
                          </span>
                        </span>
                      </span>
                      {country.priceFrom != null && (
                        <span className="shrink-0 text-meta text-fg-muted">{t('search.from', { price: displayPrice(country.priceFrom, 'USD') })}</span>
                      )}
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>

          {activities.length > 0 && (
            <>
              <div className="my-6 h-px bg-line" />
              <p className="px-1 pb-4 text-caps text-fg-subtle">{t('search.browseByActivity')}</p>
              <div className="flex flex-wrap gap-3">
                {activities.map((a) => (
                  <button
                    key={a.slug}
                    id={optionId(a.index)}
                    data-index={a.index}
                    role="option"
                    aria-selected={a.index === active}
                    type="button"
                    onMouseEnter={() => setActive(a.index)}
                    onClick={() => go(items[a.index])}
                    className={cx(
                      'inline-flex min-h-11 items-center gap-2 rounded-full border px-4 py-2.5 text-body-s transition-colors',
                      a.index === active ? 'border-inverse bg-inverse text-fg-inverse' : 'border-line bg-subtle text-fg-muted hover:border-line-strong hover:text-fg',
                    )}
                  >
                    <Icon name={a.icon} size={16} />
                    {a.name}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <p className="hidden border-t border-line px-6 py-3 text-meta text-fg-subtle sm:block">{t('search.hint')}</p>
      </div>
    </div>
  );
}
