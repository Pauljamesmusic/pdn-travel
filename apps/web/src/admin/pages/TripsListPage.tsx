import { Copy, ExternalLink, Pencil, Plus, Search, Star, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button, ButtonLink, EmptyState, ErrorState, Skeleton, SmartImage } from '../../components/ui';
import { qs } from '../../lib/api';
import { cx, formatPrice } from '../../lib/format';
import { useDebounced } from '../../lib/hooks';
import type { Paged } from '../../lib/types';
import { type ActivityRow, adminApi, type ContinentRow, type CountryRow, timeAgo, useAdminApi } from '../api';
import { AdminPageHeader, Toggle, useFeedback } from '../ui';

interface TripRow {
  id: number;
  title: string;
  slug: string;
  thumbnail: string | null;
  priceFrom: number;
  currency: string;
  durationDays: number;
  isPublished: boolean;
  isFeatured: boolean;
  updatedAt: string;
  country: { id: number; name: string; continent: { name: string } };
  activities: string[];
  _count: { days: number; photos: number };
}

const selectClass = 'h-11 rounded-md border border-line bg-surface px-3 text-body-s text-fg outline-none focus:border-fg';

export default function TripsListPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { confirm, toast } = useFeedback();
  const [search, setSearch] = useState(params.get('q') ?? '');
  const debounced = useDebounced(search, 300);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [busyIds, setBusyIds] = useState<Set<number>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  const status = params.get('status') ?? '';
  const continentId = params.get('continentId') ?? '';
  const countryId = params.get('countryId') ?? '';
  const activityId = params.get('activityId') ?? '';
  const sort = params.get('sort') ?? '';
  const page = Number(params.get('page') ?? 1);

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next, { replace: true });
  };

  useEffect(() => {
    if ((params.get('q') ?? '') !== debounced) setParam('q', debounced);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const path = `/admin/trips${qs({ q: params.get('q'), status, continentId, countryId, activityId, sort, page, limit: 20 })}`;
  const { data, error, loading, reload, mutate } = useAdminApi<Paged<TripRow>>(path);
  const { data: continents } = useAdminApi<ContinentRow[]>('/admin/continents');
  const { data: countries } = useAdminApi<CountryRow[]>('/admin/countries');
  const { data: activities } = useAdminApi<ActivityRow[]>('/admin/activities');

  useEffect(() => setSelected(new Set()), [path]);

  const patchRow = (id: number, patch: Partial<TripRow>) =>
    mutate((prev) => (prev ? { ...prev, items: prev.items.map((t) => (t.id === id ? { ...t, ...patch } : t)) } : prev!));

  /** Runs fn while marking `id` busy; a second call for the same id while one is in flight is ignored. */
  const withRowBusy = async (id: number, fn: () => Promise<void>) => {
    if (busyIds.has(id)) return;
    setBusyIds((s) => new Set(s).add(id));
    try {
      await fn();
    } finally {
      setBusyIds((s) => {
        const next = new Set(s);
        next.delete(id);
        return next;
      });
    }
  };

  const setStatus = async (trip: TripRow, patch: { isPublished?: boolean; isFeatured?: boolean }) => {
    patchRow(trip.id, patch);
    try {
      await adminApi(`/admin/trips/${trip.id}/status`, { method: 'PATCH', json: patch });
      toast(patch.isPublished !== undefined ? (patch.isPublished ? `“${trip.title}” is live` : `“${trip.title}” moved to drafts`) : patch.isFeatured ? 'Added to featured trips' : 'Removed from featured trips');
    } catch (err) {
      // Reload rather than restoring the pre-click values captured in this closure — those
      // could be stale if another toggle for the same trip completed while this one was in flight.
      reload();
      toast((err as Error).message, 'error');
    }
  };

  const remove = (trip: TripRow) =>
    withRowBusy(trip.id, async () => {
      const ok = await confirm({
        title: 'Delete this trip?',
        body: (
          <>
            <strong className="text-fg">{trip.title}</strong> and its itinerary, photos, sections and departure dates will be permanently deleted. Existing enquiries are kept.
          </>
        ),
        confirmLabel: 'Delete trip',
        tone: 'danger',
      });
      if (!ok) return;
      try {
        await adminApi(`/admin/trips/${trip.id}`, { method: 'DELETE' });
        toast('Trip deleted');
        reload();
      } catch (err) {
        toast((err as Error).message, 'error');
      }
    });

  const duplicate = (trip: TripRow) =>
    withRowBusy(trip.id, async () => {
      try {
        const copy = await adminApi<{ id: number }>(`/admin/trips/${trip.id}/duplicate`, { method: 'POST' });
        toast('Copy created as a draft');
        navigate(`/admin/trips/${copy.id}`);
      } catch (err) {
        toast((err as Error).message, 'error');
      }
    });

  const bulk = async (action: 'publish' | 'unpublish' | 'feature' | 'unfeature' | 'delete') => {
    if (bulkBusy) return;
    const ids = [...selected];
    if (action === 'delete') {
      const ok = await confirm({ title: `Delete ${ids.length} trips?`, body: 'This cannot be undone.', confirmLabel: 'Delete trips', tone: 'danger' });
      if (!ok) return;
    }
    setBulkBusy(true);
    try {
      const res = await adminApi<{ affected: number }>('/admin/trips/bulk', { method: 'POST', json: { ids, action } });
      toast(`${res.affected} trip${res.affected === 1 ? '' : 's'} updated`);
      setSelected(new Set());
      reload();
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setBulkBusy(false);
    }
  };

  const items = data?.items ?? [];
  const allSelected = items.length > 0 && items.every((t) => selected.has(t.id));
  const filteredCountries = (countries ?? []).filter((c) => !continentId || String(c.continentId) === continentId);

  return (
    <>
      <AdminPageHeader
        title="Trips & itineraries"
        description="Create trips, build day-by-day itineraries and choose which sections appear on each trip page."
        actions={
          <ButtonLink to="/admin/trips/new" size="sm">
            <Plus size={16} aria-hidden="true" /> New trip
          </ButtonLink>
        }
      />

      <div className="mb-4 flex flex-col gap-3 rounded-md border border-line bg-surface p-4 lg:flex-row lg:flex-wrap lg:items-center">
        <div className="relative min-w-[220px] flex-1">
          <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-fg-subtle" aria-hidden="true" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search trips" aria-label="Search trips" className={cx(selectClass, 'w-full ps-9')} />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:flex">
          <select value={status} onChange={(e) => setParam('status', e.target.value)} className={selectClass} aria-label="Status">
            <option value="">All statuses</option>
            <option value="published">Published</option>
            <option value="draft">Drafts</option>
            <option value="featured">Featured</option>
          </select>
          <select
            value={continentId}
            onChange={(e) => {
              const next = new URLSearchParams(params);
              if (e.target.value) next.set('continentId', e.target.value);
              else next.delete('continentId');
              next.delete('countryId');
              next.delete('page');
              setParams(next, { replace: true });
            }}
            className={selectClass}
            aria-label="Continent"
          >
            <option value="">All continents</option>
            {continents?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select value={countryId} onChange={(e) => setParam('countryId', e.target.value)} className={selectClass} aria-label="Country">
            <option value="">All countries</option>
            {filteredCountries.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select value={activityId} onChange={(e) => setParam('activityId', e.target.value)} className={selectClass} aria-label="Activity">
            <option value="">All activities</option>
            {activities?.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <select value={sort} onChange={(e) => setParam('sort', e.target.value)} className={selectClass} aria-label="Sort">
            <option value="">Recently updated</option>
            <option value="title">Title A–Z</option>
            <option value="price">Price low–high</option>
          </select>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="sticky top-20 z-30 mb-4 flex flex-wrap items-center gap-2 rounded-md bg-inverse px-4 py-3 text-fg-inverse shadow-lg">
          <span className="me-auto text-label">{selected.size} selected</span>
          {(['publish', 'unpublish', 'feature', 'unfeature'] as const).map((a) => (
            <button key={a} type="button" disabled={bulkBusy} onClick={() => bulk(a)} className="h-9 rounded-full border border-white/25 px-3 text-meta font-semibold capitalize hover:bg-white/10 disabled:opacity-50">
              {a}
            </button>
          ))}
          <button type="button" disabled={bulkBusy} onClick={() => bulk('delete')} className="h-9 rounded-full bg-red-600 px-3 text-meta font-semibold text-ink-0 hover:bg-red-700 disabled:opacity-50">
            Delete
          </button>
        </div>
      )}

      {error && !data ? (
        <ErrorState message={error.message} onRetry={reload} />
      ) : !data ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : !items.length ? (
        <EmptyState
          title="No trips match"
          body="Try a different search or filter, or create a new trip."
          action={
            <ButtonLink to="/admin/trips/new" size="sm">
              <Plus size={16} aria-hidden="true" /> New trip
            </ButtonLink>
          }
        />
      ) : (
        <div className={cx('overflow-hidden rounded-md border border-line bg-surface transition-opacity', loading && 'opacity-60')}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-start text-body-s">
              <thead className="border-b border-line bg-subtle text-meta text-fg-subtle">
                <tr>
                  <th className="w-12 px-4 py-3">
                    <input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(items.map((t) => t.id)))} aria-label="Select all trips" className="size-4 accent-[var(--bg-brand)]" />
                  </th>
                  <th className="px-2 py-3 text-start font-semibold">Trip</th>
                  <th className="px-4 py-3 text-start font-semibold">Destination</th>
                  <th className="px-4 py-3 text-start font-semibold">Price</th>
                  <th className="px-4 py-3 text-start font-semibold">Content</th>
                  <th className="px-4 py-3 text-start font-semibold">Live</th>
                  <th className="px-4 py-3 text-end font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {items.map((trip) => (
                  <tr key={trip.id} className={cx('hover:bg-subtle', selected.has(trip.id) && 'bg-brand-subtle/40')}>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(trip.id)}
                        onChange={() =>
                          setSelected((s) => {
                            const next = new Set(s);
                            if (next.has(trip.id)) next.delete(trip.id);
                            else next.add(trip.id);
                            return next;
                          })
                        }
                        aria-label={`Select ${trip.title}`}
                        className="size-4 accent-[var(--bg-brand)]"
                      />
                    </td>
                    <td className="px-2 py-3">
                      <Link to={`/admin/trips/${trip.id}`} className="flex items-center gap-3">
                        <SmartImage src={trip.thumbnail ?? undefined} alt="" className="size-14 shrink-0 rounded-sm object-cover" />
                        <span className="flex min-w-0 flex-col">
                          <span className="line-clamp-1 text-label text-fg hover:text-fg-brand">{trip.title}</span>
                          <span className="text-meta text-fg-subtle">
                            {trip.durationDays} days · updated {timeAgo(trip.updatedAt)}
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex flex-col">
                        <span className="text-fg">{trip.country.name}</span>
                        <span className="text-meta text-fg-subtle">{trip.country.continent.name}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-fg">{formatPrice(trip.priceFrom, trip.currency, 'en')}</td>
                    <td className="px-4 py-3 text-meta text-fg-muted">
                      <span className={cx(!trip._count.days && 'text-fg-brand')}>{trip._count.days} days</span> · <span className={cx(!trip._count.photos && 'text-fg-brand')}>{trip._count.photos} photos</span>
                    </td>
                    <td className="px-4 py-3">
                      <Toggle checked={trip.isPublished} onChange={(v) => setStatus(trip, { isPublished: v })} label={undefined} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button type="button" onClick={() => setStatus(trip, { isFeatured: !trip.isFeatured })} aria-label={trip.isFeatured ? 'Remove from featured' : 'Feature on home page'} title={trip.isFeatured ? 'Featured' : 'Feature'} className="flex size-9 items-center justify-center rounded-sm hover:bg-muted">
                          <Star size={16} className={trip.isFeatured ? 'fill-amber-400 text-amber-400' : 'text-fg-subtle'} aria-hidden="true" />
                        </button>
                        <Link to={`/admin/trips/${trip.id}`} aria-label="Edit" title="Edit" className="flex size-9 items-center justify-center rounded-sm text-fg-muted hover:bg-muted">
                          <Pencil size={16} aria-hidden="true" />
                        </Link>
                        <button type="button" disabled={busyIds.has(trip.id)} onClick={() => duplicate(trip)} aria-label="Duplicate" title="Duplicate" className="flex size-9 items-center justify-center rounded-sm text-fg-muted hover:bg-muted disabled:opacity-50">
                          <Copy size={16} aria-hidden="true" />
                        </button>
                        <a href={`/tours/${trip.slug}`} target="_blank" rel="noopener noreferrer" aria-label="View on website" title="View on website" className="flex size-9 items-center justify-center rounded-sm text-fg-muted hover:bg-muted">
                          <ExternalLink size={16} aria-hidden="true" />
                        </a>
                        <button type="button" disabled={busyIds.has(trip.id)} onClick={() => remove(trip)} aria-label="Delete" title="Delete" className="flex size-9 items-center justify-center rounded-sm text-fg-brand hover:bg-brand-subtle disabled:opacity-50">
                          <Trash2 size={16} aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3 text-meta text-fg-subtle">
            <span>
              {data.total} trip{data.total === 1 ? '' : 's'}
            </span>
            {data.pageCount > 1 && (
              <div className="flex items-center gap-2">
                <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setParam('page', String(page - 1))}>
                  Previous
                </Button>
                <span>
                  Page {data.page} of {data.pageCount}
                </span>
                <Button size="sm" variant="secondary" disabled={page >= data.pageCount} onClick={() => setParam('page', String(page + 1))}>
                  Next
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
