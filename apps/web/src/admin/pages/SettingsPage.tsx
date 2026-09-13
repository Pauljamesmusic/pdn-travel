import { Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button, ErrorState, Skeleton } from '../../components/ui';
import { invalidate } from '../../lib/api';
import { cx } from '../../lib/format';
import { adminApi, useAdminApi } from '../api';
import { type BlockDef, FieldControl, type FieldDef, ItemsEditor } from '../page-editor/blocks';
import { AdminPageHeader, Card, useFeedback } from '../ui';

type Obj = Record<string, unknown>;
type Key = 'site' | 'home';

interface Group {
  title: string;
  description?: string;
  fields?: FieldDef[];
  list?: { path: string; def: NonNullable<BlockDef['items']> };
}

const getPath = (obj: unknown, path: string) => path.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Obj)[k] : undefined), obj);

function setPath(obj: Obj, path: string, value: unknown): Obj {
  const [head, ...rest] = path.split('.');
  return { ...obj, [head]: rest.length ? setPath(((obj[head] as Obj) ?? {}) as Obj, rest.join('.'), value) : value };
}

const headline = (key: string, title: string): Group => ({
  title,
  fields: [
    { key: `${key}.eyebrow`, label: 'Eyebrow' },
    { key: `${key}.titleLead`, label: 'Title' },
    { key: `${key}.titleAccent`, label: 'Accent words (red italic)' },
    { key: `${key}.titleTail`, label: 'Title ending' },
    { key: `${key}.body`, label: 'Text', kind: 'textarea', wide: true },
  ],
});

const SITE_GROUPS: Group[] = [
  {
    title: 'Brand',
    fields: [
      { key: 'brandName', label: 'Brand name' },
      { key: 'legalName', label: 'Legal name' },
      { key: 'tagline', label: 'Tagline', wide: true },
      { key: 'footerBlurb', label: 'Footer text', kind: 'textarea', wide: true },
    ],
  },
  {
    title: 'Contact details',
    description: 'Used in the footer, contact page and WhatsApp button.',
    fields: [
      { key: 'phone', label: 'Phone', placeholder: '+971 50 717 1487' },
      { key: 'whatsapp', label: 'WhatsApp number (digits only)', placeholder: '971507171487' },
      { key: 'email', label: 'Email' },
      { key: 'officeHours', label: 'Office hours' },
      { key: 'address', label: 'Address', wide: true },
      { key: 'mapQuery', label: 'Map search (Google Maps)', wide: true },
    ],
  },
  {
    title: 'Social links',
    fields: ['facebook', 'instagram', 'twitter', 'linkedin', 'youtube'].map((k) => ({ key: `socials.${k}`, label: k.charAt(0).toUpperCase() + k.slice(1), placeholder: 'https://' })),
  },
  { title: 'Affiliation badge', fields: [{ key: 'affiliation.label', label: 'Label' }, { key: 'affiliation.url', label: 'Link', placeholder: 'https://' }] },
];

const HOME_GROUPS: Group[] = [
  { title: 'Announcement chip', fields: [{ key: 'announcement.tag', label: 'Tag', placeholder: 'NEW' }, { key: 'announcement.link', label: 'Link', placeholder: '/tours' }, { key: 'announcement.text', label: 'Text', wide: true }] },
  {
    title: 'Hero slides',
    description: 'Rotating headlines over the solar-system video.',
    list: { path: 'heroSlides', def: { label: 'Slides', itemLabel: 'Slide', fields: [{ key: 'titleLead', label: 'Title' }, { key: 'eyebrow', label: 'Eyebrow' }, { key: 'titleAccent', label: 'Accent words (red italic)' }, { key: 'titleTail', label: 'Title ending' }, { key: 'body', label: 'Text', kind: 'textarea', wide: true }] } },
  },
  { title: 'Hero marker', fields: [{ key: 'heroMarker.eyebrow', label: 'Eyebrow' }, { key: 'heroMarker.text', label: 'Text' }] },
  { title: 'Hero stats', list: { path: 'stats', def: { label: 'Stats', itemLabel: 'Stat', fields: [{ key: 'value', label: 'Value' }, { key: 'label', label: 'Label' }] } } },
  headline('continents', 'Continents section'),
  headline('countries', 'Featured countries section'),
  headline('trips', 'Featured trips section'),
  headline('activities', 'Activities section'),
  { title: 'Why PDN — text', fields: [{ key: 'why.eyebrow', label: 'Eyebrow' }, { key: 'why.title', label: 'Title' }, { key: 'why.body', label: 'Text', kind: 'textarea', wide: true }] },
  { title: 'Why PDN — facts', list: { path: 'why.facts', def: { label: 'Facts', itemLabel: 'Fact', fields: [{ key: 'value', label: 'Value' }, { key: 'label', label: 'Label' }] } } },
  { title: 'Why PDN — features', list: { path: 'why.features', def: { label: 'Features', itemLabel: 'Feature', fields: [{ key: 'title', label: 'Title' }, { key: 'icon', label: 'Icon', kind: 'icon' }, { key: 'body', label: 'Text', kind: 'textarea', wide: true }] } } },
  {
    title: 'Event (World Tourism Day)',
    fields: [
      { key: 'event.chip', label: 'Chip' },
      { key: 'event.date', label: 'Date & time (ISO)', placeholder: '2026-09-27T10:00+05:45' },
      { key: 'event.titleLead', label: 'Title' },
      { key: 'event.titleAccent', label: 'Accent words' },
      { key: 'event.body', label: 'Text', kind: 'textarea', wide: true },
      { key: 'event.dateLabel', label: 'Date label' },
      { key: 'event.location', label: 'Location' },
      { key: 'event.primaryLabel', label: 'Button label' },
      { key: 'event.primaryLink', label: 'Button link' },
      { key: 'event.secondaryLabel', label: 'Calendar button label' },
      { key: 'event.countdownLabel', label: 'Countdown label' },
    ],
  },
  headline('testimonials', 'Testimonials section'),
  headline('newsletter', 'Newsletter section'),
];

export default function SettingsPage() {
  const [params, setParams] = useSearchParams();
  const tab: Key = params.get('tab') === 'home' ? 'home' : 'site';
  const { data, error, reload } = useAdminApi<Partial<Record<Key, Obj>>>('/admin/settings');
  const [drafts, setDrafts] = useState<Record<Key, Obj> | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useFeedback();

  useEffect(() => {
    if (data && !drafts) setDrafts({ site: data.site ?? {}, home: data.home ?? {} });
  }, [data, drafts]);

  if (error && !data) return <ErrorState message={error.message} onRetry={reload} />;
  if (!drafts) return <Skeleton className="h-96" />;

  const draft = drafts[tab];
  const dirty = JSON.stringify(draft) !== JSON.stringify(data?.[tab] ?? {});
  const update = (path: string, value: unknown) => setDrafts({ ...drafts, [tab]: setPath(draft, path, value) });

  const save = async () => {
    setSaving(true);
    try {
      await adminApi(`/admin/settings/${tab}`, { method: 'PUT', json: { value: draft } });
      invalidate();
      reload();
      toast(tab === 'site' ? 'Site settings saved' : 'Home page saved');
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const groups = tab === 'site' ? SITE_GROUPS : HOME_GROUPS;

  return (
    <>
      <AdminPageHeader
        title="Site settings"
        description="Contact details, social links and every headline on the home page."
        actions={
          <Button size="sm" loading={saving} disabled={!dirty} onClick={save}>
            <Save size={16} aria-hidden="true" /> Save {tab === 'site' ? 'site settings' : 'home page'}
          </Button>
        }
      />
      <div role="tablist" className="mb-6 flex gap-1 border-b border-line">
        {(
          [
            ['site', 'Site & contact'],
            ['home', 'Home page'],
          ] as const
        ).map(([id, label]) => (
          <button key={id} role="tab" type="button" aria-selected={tab === id} onClick={() => setParams(id === 'site' ? {} : { tab: id }, { replace: true })} className={cx('relative h-12 px-4 text-body-s font-semibold', tab === id ? 'text-fg-brand' : 'text-fg-muted hover:text-fg')}>
            {label}
            {tab === id && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-red-500" />}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {groups.map((group) => (
          <Card key={group.title} title={group.title} description={group.description} className={group.list || (group.fields?.length ?? 0) > 6 ? 'xl:col-span-2' : undefined}>
            {group.fields && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {group.fields.map((f) => (
                  <FieldControl key={f.key} field={f} value={getPath(draft, f.key)} onChange={(v) => update(f.key, v)} />
                ))}
              </div>
            )}
            {group.list && <ItemsEditor def={group.list.def} items={(getPath(draft, group.list.path) as Obj[] | undefined) ?? []} onChange={(items) => update(group.list!.path, items)} />}
          </Card>
        ))}
      </div>
      {dirty && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 px-4 py-3 shadow-lg backdrop-blur-md lg:start-[272px]">
          <div className="mx-auto flex max-w-[1280px] items-center gap-3 sm:px-4">
            <span className="me-auto text-body-s text-fg-muted">Unsaved changes</span>
            <Button size="sm" variant="ghost" onClick={() => setDrafts({ ...drafts, [tab]: data?.[tab] ?? {} })}>
              Discard
            </Button>
            <Button size="sm" loading={saving} onClick={save}>
              <Save size={16} aria-hidden="true" /> Save
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
