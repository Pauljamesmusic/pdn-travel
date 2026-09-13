import { Pencil, Plus, Search, Star, Trash2 } from 'lucide-react';
import { type FormEvent, type ReactNode, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { Button, EmptyState, ErrorState, Skeleton, SmartImage } from '../../components/ui';
import { invalidate } from '../../lib/api';
import { cx } from '../../lib/format';
import { type ActivityRow, adminApi, type ContinentRow, type CountryRow, moveItem, slugify, useAdminApi } from '../api';
import { AdminPageHeader, IconPicker, ImageField, Modal, SelectInput, TextArea, TextInput, Toggle, useFeedback } from '../ui';
import { RowActions } from '../ui';

type Tab = 'continents' | 'countries' | 'activities';
const TABS: { id: Tab; label: string }[] = [
  { id: 'continents', label: 'Continents' },
  { id: 'countries', label: 'Countries' },
  { id: 'activities', label: 'Activity tags' },
];

/** Empty strings become null so optional fields can be cleared. */
const nullify = (body: Record<string, unknown>) => Object.fromEntries(Object.entries(body).map(([k, v]) => [k, v === '' ? null : v]));

function useCrud(endpoint: string, reload: () => void) {
  const { toast, confirm } = useFeedback();
  const [saving, setSaving] = useState(false);

  const save = async (id: number | undefined, body: Record<string, unknown>, label: string) => {
    setSaving(true);
    try {
      await adminApi(id ? `${endpoint}/${id}` : endpoint, { method: id ? 'PUT' : 'POST', json: nullify(body) });
      toast(`${label} ${id ? 'updated' : 'added'}`);
      invalidate();
      reload();
      return true;
    } catch (err) {
      toast((err as Error).message, 'error');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number, name: string, warning: string) => {
    if (!(await confirm({ title: `Delete ${name}?`, body: warning, confirmLabel: 'Delete', tone: 'danger' }))) return;
    try {
      const res = await adminApi<{ unassigned?: number }>(`${endpoint}/${id}`, { method: 'DELETE' });
      toast(res?.unassigned ? `${name} deleted and removed from ${res.unassigned} trip${res.unassigned === 1 ? '' : 's'}` : `${name} deleted`);
      invalidate();
      reload();
    } catch (err) {
      // 409s explain what must be moved first (e.g. countries still in a continent).
      toast((err as Error).message, 'error');
    }
  };

  const reorder = async (ids: number[]) => {
    try {
      await adminApi(`${endpoint}/reorder`, { method: 'POST', json: { ids } });
      invalidate();
    } catch (err) {
      toast((err as Error).message, 'error');
    }
    reload();
  };

  return { save, remove, reorder, saving };
}

export default function TaxonomyPage() {
  const [params, setParams] = useSearchParams();
  const tab = (TABS.find((t) => t.id === params.get('tab'))?.id ?? 'continents') as Tab;

  return (
    <>
      <AdminPageHeader title="Continents, countries & tags" description="Organise destinations the way visitors browse, filter and search them." />
      <div role="tablist" className="no-scrollbar mb-6 flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map((t) => (
          <button key={t.id} role="tab" type="button" aria-selected={tab === t.id} onClick={() => setParams({ tab: t.id }, { replace: true })} className={cx('relative h-12 shrink-0 px-4 text-body-s font-semibold', tab === t.id ? 'text-fg-brand' : 'text-fg-muted hover:text-fg')}>
            {t.label}
            {tab === t.id && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-red-500" />}
          </button>
        ))}
      </div>
      {tab === 'continents' && <ContinentsTab />}
      {tab === 'countries' && <CountriesTab />}
      {tab === 'activities' && <ActivitiesTab />}
    </>
  );
}

function ListShell({ loading, error, onRetry, empty, children }: { loading: boolean; error?: string; onRetry: () => void; empty: boolean; children: ReactNode }) {
  if (error) return <ErrorState message={error} onRetry={onRetry} />;
  if (loading)
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-[72px]" />
        ))}
      </div>
    );
  if (empty) return <EmptyState title="Nothing here yet" body="Use the Add button to create the first one." />;
  return <ul className="divide-y divide-line overflow-hidden rounded-md border border-line bg-surface">{children}</ul>;
}

function Row({ media, title, subtitle, badges, actions }: { media: ReactNode; title: string; subtitle: string; badges?: ReactNode; actions: ReactNode }) {
  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-subtle sm:flex-nowrap">
      {media}
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-label text-fg">{title}</span>
        <span className="truncate text-meta text-fg-subtle">{subtitle}</span>
      </div>
      {badges}
      <div className="flex items-center gap-1">{actions}</div>
    </li>
  );
}

function EditButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} aria-label={`Edit ${label}`} className="flex size-9 items-center justify-center rounded-sm text-fg-muted hover:bg-muted">
      <Pencil size={16} aria-hidden="true" />
    </button>
  );
}

function FormModal({ title, onClose, saving, id, children }: { title: string; onClose: () => void; saving: boolean; id: string; children: ReactNode }) {
  return (
    <Modal
      title={title}
      size="lg"
      onClose={onClose}
      footer={
        <>
          <Button size="sm" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" type="submit" form={id} loading={saving}>
            Save
          </Button>
        </>
      }
    >
      {children}
    </Modal>
  );
}

/* ─── Continents ──────────────────────────────────────────────────────────── */

type ContinentDraft = { id?: number; name: string; slug: string; tagline: string; image: string };

function ContinentsTab() {
  const { data, error, loading, reload, mutate } = useAdminApi<ContinentRow[]>('/admin/continents');
  const crud = useCrud('/admin/continents', reload);
  const [draft, setDraft] = useState<ContinentDraft | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (draft && (await crud.save(draft.id, { name: draft.name, slug: draft.slug, tagline: draft.tagline, image: draft.image }, 'Continent'))) setDraft(null);
  };

  const move = (from: number, to: number) => {
    if (!data) return;
    const next = moveItem(data, from, to);
    mutate(() => next);
    void crud.reorder(next.map((c) => c.id));
  };

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button
          size="sm"
          onClick={() => {
            setDraft({ name: '', slug: '', tagline: '', image: '' });
            setSlugTouched(false);
          }}
        >
          <Plus size={16} aria-hidden="true" /> Add continent
        </Button>
      </div>
      <ListShell loading={loading && !data} error={!data ? error?.message : undefined} onRetry={reload} empty={!data?.length}>
        {data?.map((c, i) => (
          <Row
            key={c.id}
            media={<SmartImage src={c.image ?? undefined} alt="" className="size-12 shrink-0 rounded-sm object-cover" />}
            title={c.name}
            subtitle={`${c._count.countries} countr${c._count.countries === 1 ? 'y' : 'ies'} · /destinations?continent=${c.slug}`}
            actions={
              <>
                <EditButton
                  label={c.name}
                  onClick={() => {
                    setDraft({ id: c.id, name: c.name, slug: c.slug, tagline: c.tagline ?? '', image: c.image ?? '' });
                    setSlugTouched(true);
                  }}
                />
                <RowActions index={i} length={data.length} onMove={(to) => move(i, to)} onRemove={() => crud.remove(c.id, c.name, c._count.countries ? `It still has ${c._count.countries} ${c._count.countries === 1 ? 'country' : 'countries'} — you will need to move them first.` : 'This cannot be undone.')} />
              </>
            }
          />
        ))}
      </ListShell>
      {draft && (
        <FormModal id="continent-form" title={draft.id ? `Edit ${draft.name}` : 'New continent'} onClose={() => setDraft(null)} saving={crud.saving}>
          <form id="continent-form" onSubmit={submit} className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <TextInput label="Name" required maxLength={80} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value, slug: slugTouched ? draft.slug : slugify(e.target.value) })} />
            <TextInput
              label="Slug"
              maxLength={80}
              value={draft.slug}
              onChange={(e) => {
                setSlugTouched(true);
                setDraft({ ...draft, slug: slugify(e.target.value) });
              }}
            />
            <TextInput label="Tagline" maxLength={120} className="sm:col-span-2" value={draft.tagline} onChange={(e) => setDraft({ ...draft, tagline: e.target.value })} />
            <div className="sm:col-span-2">
              <ImageField label="Card image" value={draft.image} onChange={(image) => setDraft({ ...draft, image })} />
            </div>
          </form>
        </FormModal>
      )}
    </>
  );
}

/* ─── Countries ───────────────────────────────────────────────────────────── */

type CountryDraft = {
  id?: number;
  name: string;
  slug: string;
  continentId: number | '';
  region: string;
  summary: string;
  highlight: string;
  image: string;
  heroImage: string;
  currency: string;
  language: string;
  bestSeason: string;
  visaNote: string;
  isFeatured: boolean;
};

const emptyCountry = (continentId: number | ''): CountryDraft => ({ name: '', slug: '', continentId, region: '', summary: '', highlight: '', image: '', heroImage: '', currency: '', language: '', bestSeason: '', visaNote: '', isFeatured: false });

const countryBody = (d: CountryDraft) => {
  const { id: _id, ...rest } = d;
  return { ...rest, continentId: Number(d.continentId) };
};

function CountriesTab() {
  const { data, error, loading, reload } = useAdminApi<CountryRow[]>('/admin/countries');
  const { data: continents } = useAdminApi<ContinentRow[]>('/admin/continents');
  const crud = useCrud('/admin/countries', reload);
  const [draft, setDraft] = useState<CountryDraft | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [continent, setContinent] = useState('');
  const [query, setQuery] = useState('');

  const rows = (data ?? []).filter((c) => (!continent || String(c.continentId) === continent) && (!query || c.name.toLowerCase().includes(query.toLowerCase())));
  const canReorder = !!continent && !query;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (draft && (await crud.save(draft.id, countryBody(draft), 'Country'))) setDraft(null);
  };

  const toDraft = (c: CountryRow): CountryDraft => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    continentId: c.continentId,
    region: c.region ?? '',
    summary: c.summary ?? '',
    highlight: c.highlight ?? '',
    image: c.image ?? '',
    heroImage: c.heroImage ?? '',
    currency: c.currency ?? '',
    language: c.language ?? '',
    bestSeason: c.bestSeason ?? '',
    visaNote: c.visaNote ?? '',
    isFeatured: c.isFeatured,
  });

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-fg-subtle" aria-hidden="true" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search countries" aria-label="Search countries" className="h-11 w-full rounded-md border border-line bg-surface ps-9 pe-3 text-body-s text-fg outline-none focus:border-fg" />
        </div>
        <select value={continent} onChange={(e) => setContinent(e.target.value)} aria-label="Continent" className="h-11 rounded-md border border-line bg-surface px-3 text-body-s text-fg">
          <option value="">All continents</option>
          {continents?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <Button
          size="sm"
          onClick={() => {
            setDraft(emptyCountry(continent ? Number(continent) : ''));
            setSlugTouched(false);
          }}
        >
          <Plus size={16} aria-hidden="true" /> Add country
        </Button>
      </div>
      {!canReorder && <p className="mb-3 text-meta text-fg-subtle">Choose a continent (and clear the search) to change the order countries appear in.</p>}
      <ListShell loading={loading && !data} error={!data ? error?.message : undefined} onRetry={reload} empty={!rows.length}>
        {rows.map((c, i) => (
          <Row
            key={c.id}
            media={<SmartImage src={c.image ?? undefined} alt="" className="size-12 shrink-0 rounded-sm object-cover" />}
            title={c.name}
            subtitle={`${c.continent.name}${c.region ? ` · ${c.region}` : ''} · ${c._count.trips} trip${c._count.trips === 1 ? '' : 's'}`}
            badges={
              <button
                type="button"
                onClick={() => crud.save(c.id, { ...countryBody(toDraft(c)), isFeatured: !c.isFeatured }, c.isFeatured ? `${c.name} unfeatured —` : `${c.name} featured —`)}
                aria-label={c.isFeatured ? 'Remove from featured' : 'Feature on home page'}
                title={c.isFeatured ? 'Featured on home page' : 'Feature on home page'}
                className="flex size-9 items-center justify-center rounded-sm hover:bg-muted"
              >
                <Star size={16} className={c.isFeatured ? 'fill-amber-400 text-amber-400' : 'text-fg-subtle'} aria-hidden="true" />
              </button>
            }
            actions={
              <>
                <EditButton
                  label={c.name}
                  onClick={() => {
                    setDraft(toDraft(c));
                    setSlugTouched(true);
                  }}
                />
                {canReorder ? (
                  <RowActions index={i} length={rows.length} onMove={(to) => crud.reorder(moveItem(rows, i, to).map((r) => r.id))} onRemove={() => crud.remove(c.id, c.name, c._count.trips ? `${c._count.trips} ${c._count.trips === 1 ? 'trip uses' : 'trips use'} this country — reassign ${c._count.trips === 1 ? 'it' : 'them'} first.` : 'This cannot be undone.')} />
                ) : (
                  <button type="button" onClick={() => crud.remove(c.id, c.name, c._count.trips ? `${c._count.trips} ${c._count.trips === 1 ? 'trip uses' : 'trips use'} this country — reassign ${c._count.trips === 1 ? 'it' : 'them'} first.` : 'This cannot be undone.')} aria-label={`Delete ${c.name}`} className="flex size-9 items-center justify-center rounded-sm text-fg-brand hover:bg-brand-subtle">
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                )}
              </>
            }
          />
        ))}
      </ListShell>
      {draft && (
        <FormModal id="country-form" title={draft.id ? `Edit ${draft.name}` : 'New country'} onClose={() => setDraft(null)} saving={crud.saving}>
          <form id="country-form" onSubmit={submit} className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <TextInput label="Name" required maxLength={80} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value, slug: slugTouched ? draft.slug : slugify(e.target.value) })} />
            <TextInput
              label="Slug"
              maxLength={80}
              hint={`/destinations/${draft.slug || 'country'}`}
              value={draft.slug}
              onChange={(e) => {
                setSlugTouched(true);
                setDraft({ ...draft, slug: slugify(e.target.value) });
              }}
            />
            <SelectInput label="Continent" required value={draft.continentId} onChange={(e) => setDraft({ ...draft, continentId: e.target.value ? Number(e.target.value) : '' })}>
              <option value="">Choose…</option>
              {continents?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </SelectInput>
            <TextInput label="Region (optional)" placeholder="Middle East" maxLength={60} value={draft.region} onChange={(e) => setDraft({ ...draft, region: e.target.value })} />
            <TextInput label="Card highlight" placeholder="Himalayan treks & temples" maxLength={120} className="sm:col-span-2" value={draft.highlight} onChange={(e) => setDraft({ ...draft, highlight: e.target.value })} />
            <TextArea label="Summary" rows={4} maxLength={2000} className="sm:col-span-2" value={draft.summary} onChange={(e) => setDraft({ ...draft, summary: e.target.value })} />
            <ImageField label="Card image" value={draft.image} onChange={(image) => setDraft({ ...draft, image })} />
            <ImageField label="Page hero image" value={draft.heroImage} onChange={(heroImage) => setDraft({ ...draft, heroImage })} />
            <TextInput label="Currency" placeholder="Nepalese rupee (NPR)" maxLength={60} value={draft.currency} onChange={(e) => setDraft({ ...draft, currency: e.target.value })} />
            <TextInput label="Language" placeholder="Nepali, English" maxLength={80} value={draft.language} onChange={(e) => setDraft({ ...draft, language: e.target.value })} />
            <TextInput label="Best season" placeholder="Oct–Nov, Mar–May" maxLength={120} value={draft.bestSeason} onChange={(e) => setDraft({ ...draft, bestSeason: e.target.value })} />
            <TextInput label="Visa note" maxLength={500} value={draft.visaNote} onChange={(e) => setDraft({ ...draft, visaNote: e.target.value })} />
            <div className="sm:col-span-2">
              <Toggle label="Featured on the home page" checked={draft.isFeatured} onChange={(isFeatured) => setDraft({ ...draft, isFeatured })} />
            </div>
          </form>
        </FormModal>
      )}
    </>
  );
}

/* ─── Activity tags ───────────────────────────────────────────────────────── */

type ActivityDraft = { id?: number; name: string; slug: string; icon: string; description: string; image: string };

function ActivitiesTab() {
  const { data, error, loading, reload, mutate } = useAdminApi<ActivityRow[]>('/admin/activities');
  const crud = useCrud('/admin/activities', reload);
  const [draft, setDraft] = useState<ActivityDraft | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!draft) return;
    const { id, ...body } = draft;
    if (await crud.save(id, body, 'Activity tag')) setDraft(null);
  };

  const move = (from: number, to: number) => {
    if (!data) return;
    const next = moveItem(data, from, to);
    mutate(() => next);
    void crud.reorder(next.map((a) => a.id));
  };

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-body-s text-fg-muted">Tags power the activity filters and search (e.g. cycling, trekking, sunrise, swimming, cultural).</p>
        <Button
          size="sm"
          onClick={() => {
            setDraft({ name: '', slug: '', icon: 'compass', description: '', image: '' });
            setSlugTouched(false);
          }}
        >
          <Plus size={16} aria-hidden="true" /> Add tag
        </Button>
      </div>
      <ListShell loading={loading && !data} error={!data ? error?.message : undefined} onRetry={reload} empty={!data?.length}>
        {data?.map((a, i) => (
          <Row
            key={a.id}
            media={
              <span className="flex size-12 shrink-0 items-center justify-center rounded-sm bg-brand-subtle text-fg-brand">
                <Icon name={a.icon} size={20} />
              </span>
            }
            title={a.name}
            subtitle={`${a._count.trips} trip${a._count.trips === 1 ? '' : 's'} · /activities/${a.slug}`}
            actions={
              <>
                <EditButton
                  label={a.name}
                  onClick={() => {
                    setDraft({ id: a.id, name: a.name, slug: a.slug, icon: a.icon, description: a.description ?? '', image: a.image ?? '' });
                    setSlugTouched(true);
                  }}
                />
                <RowActions
                  index={i}
                  length={data.length}
                  onMove={(to) => move(i, to)}
                  onRemove={() =>
                    crud.remove(
                      a.id,
                      a.name,
                      a._count.trips
                        ? a._count.trips === 1
                          ? 'The tag will be removed from 1 trip. The trip itself is not deleted.'
                          : `The tag will be removed from ${a._count.trips} trips. The trips themselves are not deleted.`
                        : 'This cannot be undone.',
                    )
                  }
                />
              </>
            }
          />
        ))}
      </ListShell>
      {draft && (
        <FormModal id="activity-form" title={draft.id ? `Edit ${draft.name}` : 'New activity tag'} onClose={() => setDraft(null)} saving={crud.saving}>
          <form id="activity-form" onSubmit={submit} className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <TextInput label="Name" required maxLength={60} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value, slug: slugTouched ? draft.slug : slugify(e.target.value) })} />
            <TextInput
              label="Slug"
              maxLength={80}
              value={draft.slug}
              onChange={(e) => {
                setSlugTouched(true);
                setDraft({ ...draft, slug: slugify(e.target.value) });
              }}
            />
            <IconPicker value={draft.icon} onChange={(icon) => setDraft({ ...draft, icon })} />
            <div />
            <TextArea label="Description" rows={3} maxLength={1000} className="sm:col-span-2" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
            <div className="sm:col-span-2">
              <ImageField label="Image" value={draft.image} onChange={(image) => setDraft({ ...draft, image })} />
            </div>
          </form>
        </FormModal>
      )}
    </>
  );
}
