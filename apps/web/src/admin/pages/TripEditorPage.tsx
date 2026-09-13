import { AlertCircle, ExternalLink, Save } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useBlocker, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { Button, ErrorState, Skeleton } from '../../components/ui';
import { invalidate } from '../../lib/api';
import { cx } from '../../lib/format';
import { type ActivityRow, adminApi, type CountryRow, slugify, timeAgo, useAdminApi } from '../api';
import { DaysEditor } from '../trip-editor/DaysEditor';
import { DeparturesEditor } from '../trip-editor/DeparturesEditor';
import { InclusionsEditor } from '../trip-editor/InclusionsEditor';
import { type ApiTrip, CURRENCIES, DIFFICULTIES, emptyTrip, fromApi, type TabId, toDto, type TripForm, validate } from '../trip-editor/model';
import { PhotosEditor } from '../trip-editor/PhotosEditor';
import { SectionsEditor } from '../trip-editor/SectionsEditor';
import { AdminPageHeader, Card, Modal, SelectInput, TextArea, TextInput, Toggle, useFeedback } from '../ui';

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'photos', label: 'Photos' },
  { id: 'itinerary', label: 'Itinerary' },
  { id: 'sections', label: 'Page sections' },
  { id: 'inclusions', label: 'Inclusions' },
  { id: 'pricing', label: 'Pricing & dates' },
  { id: 'seo', label: 'SEO' },
];

const intOr = (value: string, fallback: number) => (value === '' ? fallback : Number(value));
const intOrNull = (value: string) => (value === '' ? null : Number(value));

export default function TripEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { toast } = useFeedback();
  const tab = (TABS.find((t) => t.id === params.get('tab'))?.id ?? 'overview') as TabId;
  const setTab = (next: TabId) => setParams(next === 'overview' ? {} : { tab: next }, { replace: true });

  const [form, setForm] = useState<TripForm | null>(id ? null : emptyTrip);
  const [snapshot, setSnapshot] = useState(() => (id ? '' : JSON.stringify(toDto(emptyTrip()))));
  const [meta, setMeta] = useState<{ slug: string; updatedAt: string } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ tab: TabId; message: string }[]>([]);
  const [slugTouched, setSlugTouched] = useState(!!id);
  const bypassBlock = useRef(false);

  const { data: countries } = useAdminApi<CountryRow[]>('/admin/countries');
  const { data: activities } = useAdminApi<ActivityRow[]>('/admin/activities');

  useEffect(() => {
    if (!id) return;
    let alive = true;
    setLoadError(null);
    adminApi<ApiTrip>(`/admin/trips/${id}`)
      .then((trip) => {
        if (!alive) return;
        const next = fromApi(trip);
        setForm(next);
        setSnapshot(JSON.stringify(toDto(next)));
        setMeta({ slug: trip.slug, updatedAt: trip.updatedAt });
      })
      .catch((err: Error) => alive && setLoadError(err.message));
    return () => {
      alive = false;
    };
  }, [id]);

  const dirty = !!form && JSON.stringify(toDto(form)) !== snapshot;

  const blocker = useBlocker(({ currentLocation, nextLocation }) => !bypassBlock.current && dirty && currentLocation.pathname !== nextLocation.pathname);

  useEffect(() => {
    if (!dirty) return;
    const onUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, [dirty]);

  const set = <K extends keyof TripForm>(key: K, value: TripForm[K]) => setForm((f) => (f ? { ...f, [key]: value } : f));

  const save = async (publish?: boolean) => {
    if (!form || saving) return;
    const next = publish === undefined ? form : { ...form, isPublished: publish };
    const problems = validate(next);
    setErrors(problems);
    if (problems.length) {
      setTab(problems[0].tab);
      toast(problems[0].message, 'error');
      return;
    }
    setSaving(true);
    try {
      const saved = await adminApi<ApiTrip>(id ? `/admin/trips/${id}` : '/admin/trips', { method: id ? 'PUT' : 'POST', json: toDto(next) });
      const fresh = fromApi(saved);
      setForm(fresh);
      setSnapshot(JSON.stringify(toDto(fresh)));
      setMeta({ slug: saved.slug, updatedAt: saved.updatedAt });
      invalidate();
      toast(publish === true ? 'Published — the trip is live on the website' : publish === false ? 'Moved to drafts' : 'Changes saved');
      if (!id) {
        bypassBlock.current = true;
        navigate(`/admin/trips/${saved.id}${tab === 'overview' ? '' : `?tab=${tab}`}`, { replace: true });
        window.setTimeout(() => (bypassBlock.current = false), 0);
      }
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // ⌘/Ctrl + S saves.
  const saveRef = useRef(save);
  saveRef.current = save;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void saveRef.current();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, CountryRow[]>();
    for (const c of countries ?? []) map.set(c.continent.name, [...(map.get(c.continent.name) ?? []), c]);
    return [...map.entries()];
  }, [countries]);

  if (loadError) return <ErrorState message={loadError} onRetry={() => navigate(0)} />;
  if (!form) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-12 w-72" />
        <Skeleton className="h-12" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  const tabErrors = (t: TabId) => errors.filter((e) => e.tab === t).length;
  const tabCount: Partial<Record<TabId, number>> = { photos: form.photos.length, itinerary: form.days.length, sections: form.sections.length, inclusions: form.amenities.length, pricing: form.departures.length };

  return (
    <>
      <AdminPageHeader
        back={{ to: '/admin/trips', label: 'All trips' }}
        title={form.title || 'New trip'}
        description={meta ? `Last saved ${timeAgo(meta.updatedAt)}` : 'Fill in the basics, then add photos, the itinerary and page sections.'}
        actions={
          <>
            {meta && (
              <a href={`/tours/${meta.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-full px-4 text-body-s font-semibold text-fg hover:bg-muted">
                Preview <ExternalLink size={14} aria-hidden="true" />
              </a>
            )}
            <Button size="sm" variant="secondary" loading={saving} disabled={!dirty && !!id} onClick={() => save()}>
              <Save size={16} aria-hidden="true" /> {form.isPublished ? 'Save changes' : 'Save draft'}
            </Button>
            {form.isPublished ? (
              <Button size="sm" variant="ghost" disabled={saving} onClick={() => save(false)}>
                Unpublish
              </Button>
            ) : (
              <Button size="sm" disabled={saving} onClick={() => save(true)}>
                Publish
              </Button>
            )}
          </>
        }
      />

      {errors.length > 0 && (
        <div role="alert" className="mb-6 flex gap-3 rounded-md bg-brand-subtle p-4 text-body-s text-fg-brand">
          <AlertCircle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
          <ul className="flex flex-col gap-1">
            {errors.map((e) => (
              <li key={e.message}>
                <button type="button" onClick={() => setTab(e.tab)} className="text-start underline-offset-2 hover:underline">
                  {e.message}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div role="tablist" aria-label="Trip editor" className="no-scrollbar -mx-4 mb-6 flex gap-1 overflow-x-auto border-b border-line px-4 sm:mx-0 sm:px-0">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cx('relative flex h-12 shrink-0 items-center gap-2 px-4 text-body-s font-semibold transition-colors', tab === t.id ? 'text-fg-brand' : 'text-fg-muted hover:text-fg')}
          >
            {t.label}
            {tabErrors(t.id) > 0 ? <span className="size-2 rounded-full bg-red-500" aria-label="has errors" /> : tabCount[t.id] !== undefined && <span className="rounded-full bg-muted px-1.5 text-meta text-fg-subtle">{tabCount[t.id]}</span>}
            {tab === t.id && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-red-500" />}
          </button>
        ))}
      </div>

      <div role="tabpanel" className="pb-24">
        {tab === 'overview' && (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
            <Card title="Basics">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <TextInput
                  label="Trip title"
                  required
                  maxLength={160}
                  value={form.title}
                  className="md:col-span-2"
                  onChange={(e) => {
                    const title = e.target.value;
                    setForm((f) => (f ? { ...f, title, slug: slugTouched ? f.slug : slugify(title) } : f));
                  }}
                />
                <TextInput
                  label="Web address"
                  hint={`pdntravel.com/tours/${form.slug || 'your-trip'}`}
                  maxLength={80}
                  value={form.slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    set('slug', slugify(e.target.value));
                  }}
                />
                <SelectInput label="Country" required value={form.countryId} onChange={(e) => set('countryId', e.target.value ? Number(e.target.value) : '')}>
                  <option value="">Choose a country…</option>
                  {grouped.map(([continent, list]) => (
                    <optgroup key={continent} label={continent}>
                      {list.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </SelectInput>
                <TextInput label="Location" placeholder="Khumbu, Nepal" maxLength={120} value={form.location} onChange={(e) => set('location', e.target.value)} />
                <TextInput label="Badge (optional)" placeholder="Best seller" maxLength={40} value={form.badge} onChange={(e) => set('badge', e.target.value)} />
                <TextArea
                  label="Summary"
                  required
                  rows={4}
                  maxLength={600}
                  className="md:col-span-2"
                  hint={`${form.summary.length}/600 — shown on cards and at the top of the trip page`}
                  value={form.summary}
                  onChange={(e) => set('summary', e.target.value)}
                />
              </div>
              <div className="mt-6 flex flex-col gap-3">
                <p className="text-meta font-semibold text-fg">Activity tags</p>
                <div className="flex flex-wrap gap-2">
                  {activities?.map((a) => {
                    const on = form.activityIds.includes(a.id);
                    return (
                      <button
                        key={a.id}
                        type="button"
                        aria-pressed={on}
                        onClick={() => set('activityIds', on ? form.activityIds.filter((x) => x !== a.id) : [...form.activityIds, a.id])}
                        className={cx('inline-flex h-10 items-center gap-2 rounded-full border px-4 text-body-s transition-colors', on ? 'border-inverse bg-inverse text-fg-inverse' : 'border-line text-fg hover:border-line-strong')}
                      >
                        <Icon name={a.icon} size={16} /> {a.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </Card>
            <div className="flex flex-col gap-6">
              <Card title="Visibility">
                <div className="flex flex-col gap-5">
                  <Toggle label="Published" description="Visible on the website" checked={form.isPublished} onChange={(v) => set('isPublished', v)} />
                  <Toggle label="Featured" description="Shown on the home page" checked={form.isFeatured} onChange={(v) => set('isFeatured', v)} />
                  <TextInput label="Sort order" type="number" hint="Lower numbers appear first" value={form.sortOrder} onChange={(e) => set('sortOrder', intOr(e.target.value, 0))} />
                </div>
              </Card>
              <Card title="Content checklist">
                <ul className="flex flex-col gap-2 text-body-s">
                  {[
                    [form.photos.length >= 4, `${form.photos.length} photos (4+ recommended)`, 'photos'],
                    [form.days.length > 0, `${form.days.length} itinerary days`, 'itinerary'],
                    [form.amenities.length > 0, `${form.amenities.length} inclusions`, 'inclusions'],
                    [form.departures.length > 0, `${form.departures.length} departure dates`, 'pricing'],
                    [!!form.metaDescription, 'SEO description', 'seo'],
                  ].map(([ok, label, target]) => (
                    <li key={label as string}>
                      <button type="button" onClick={() => setTab(target as TabId)} className="flex w-full items-center gap-2 rounded-sm p-1.5 text-start hover:bg-subtle">
                        <span className={cx('size-2.5 rounded-full', ok ? 'bg-green-500' : 'bg-amber-400')} aria-hidden="true" />
                        <span className={ok ? 'text-fg' : 'text-fg-muted'}>{label as string}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          </div>
        )}

        {tab === 'photos' && (
          <Card title="Photos" description="The first photo (or the one marked Cover) is used on cards and the trip hero.">
            <PhotosEditor photos={form.photos} coverImage={form.coverImage} onPhotos={(p) => set('photos', p)} onCover={(url) => set('coverImage', url)} />
          </Card>
        )}

        {tab === 'itinerary' && (
          <Card title="Day-by-day itinerary">
            <DaysEditor days={form.days} durationDays={form.durationDays} onChange={(d) => set('days', d)} />
          </Card>
        )}

        {tab === 'sections' && (
          <Card title="Trip page sections">
            <SectionsEditor sections={form.sections} onChange={(s) => set('sections', s)} counts={{ days: form.days.length, amenities: form.amenities.length, departures: form.departures.length }} goToTab={setTab} />
          </Card>
        )}

        {tab === 'inclusions' && (
          <Card title="Included & not included">
            <InclusionsEditor amenities={form.amenities} onChange={(a) => set('amenities', a)} />
          </Card>
        )}

        {tab === 'pricing' && (
          <div className="flex flex-col gap-6">
            <Card title="Price & trip facts">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <TextInput label="Price from" type="number" min={0} required value={form.priceFrom} onChange={(e) => set('priceFrom', intOr(e.target.value, 0))} />
                <SelectInput label="Currency" value={form.currency} onChange={(e) => set('currency', e.target.value)}>
                  {CURRENCIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </SelectInput>
                <TextInput label="Duration (days)" type="number" min={1} max={365} required value={form.durationDays} onChange={(e) => set('durationDays', intOr(e.target.value, 1))} />
                <SelectInput label="Difficulty" value={form.difficulty} onChange={(e) => set('difficulty', e.target.value)}>
                  {DIFFICULTIES.map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </SelectInput>
                <TextInput label="Max group size" type="number" min={1} placeholder="—" value={form.groupSizeMax ?? ''} onChange={(e) => set('groupSizeMax', intOrNull(e.target.value))} />
                <TextInput label="Max altitude (m)" type="number" min={0} placeholder="—" value={form.maxAltitude ?? ''} onChange={(e) => set('maxAltitude', intOrNull(e.target.value))} />
                <TextInput label="Best season" placeholder="Mar–May, Sep–Nov" maxLength={120} value={form.bestSeason} onChange={(e) => set('bestSeason', e.target.value)} />
                <div className="grid grid-cols-2 gap-3">
                  <TextInput label="Rating" type="number" min={0} max={5} step={0.1} value={form.rating} onChange={(e) => set('rating', intOr(e.target.value, 0))} />
                  <TextInput label="Reviews" type="number" min={0} value={form.reviewCount} onChange={(e) => set('reviewCount', intOr(e.target.value, 0))} />
                </div>
              </div>
            </Card>
            <Card title="Departure dates">
              <DeparturesEditor departures={form.departures} currency={form.currency} onChange={(d) => set('departures', d)} />
            </Card>
          </div>
        )}

        {tab === 'seo' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card title="Search engines">
              <div className="flex flex-col gap-5">
                <TextInput label="SEO title" maxLength={160} placeholder={form.title} hint={`${(form.metaTitle || form.title).length}/60 recommended`} value={form.metaTitle} onChange={(e) => set('metaTitle', e.target.value)} />
                <TextArea label="SEO description" rows={4} maxLength={320} placeholder={form.summary} hint={`${form.metaDescription.length}/160 recommended`} value={form.metaDescription} onChange={(e) => set('metaDescription', e.target.value)} />
              </div>
            </Card>
            <Card title="Google preview">
              <div className="flex flex-col gap-1 rounded-sm bg-white p-4 font-sans" data-theme="light">
                <span className="text-[12px] text-[#4d5156]">pdntravel.com › tours › {form.slug || 'your-trip'}</span>
                <span className="line-clamp-1 text-[20px] leading-7 text-[#1a0dab]">{form.metaTitle || form.title || 'Trip title'} | PDN Travel</span>
                <span className="line-clamp-2 text-[14px] leading-[22px] text-[#4d5156]">{form.metaDescription || form.summary || 'Your description will appear here.'}</span>
              </div>
            </Card>
          </div>
        )}
      </div>

      {dirty && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 px-4 py-3 shadow-lg backdrop-blur-md lg:start-[272px]">
          <div className="mx-auto flex max-w-[1280px] items-center gap-3 sm:px-4">
            <span className="me-auto text-body-s text-fg-muted">You have unsaved changes</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                const restored = snapshot ? JSON.parse(snapshot) : null;
                if (id && restored) navigate(0);
                else setForm(emptyTrip());
              }}
            >
              Discard
            </Button>
            <Button size="sm" loading={saving} onClick={() => save()}>
              <Save size={16} aria-hidden="true" /> Save
            </Button>
          </div>
        </div>
      )}

      {blocker.state === 'blocked' && (
        <Modal
          title="Leave without saving?"
          onClose={() => blocker.reset()}
          footer={
            <>
              <Button size="sm" variant="secondary" onClick={() => blocker.reset()}>
                Keep editing
              </Button>
              <Button size="sm" variant="danger" onClick={() => blocker.proceed()}>
                Discard changes
              </Button>
            </>
          }
        >
          <p className="text-body-s text-fg-muted">Your changes to this trip have not been saved yet.</p>
        </Modal>
      )}
    </>
  );
}
