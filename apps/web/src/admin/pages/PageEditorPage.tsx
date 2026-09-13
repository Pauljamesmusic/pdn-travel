import { ChevronDown, Copy, ExternalLink, Plus, Save } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useBlocker, useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { Button, ErrorState, Skeleton } from '../../components/ui';
import { invalidate } from '../../lib/api';
import { cx } from '../../lib/format';
import type { PageBlock } from '../../lib/types';
import { adminApi, moveItem, slugify, timeAgo } from '../api';
import { BLOCK_DEFS, BLOCK_TYPES, BlockFields, blockSummary, newBlock } from '../page-editor/blocks';
import { uid } from '../trip-editor/model';
import { AdminPageHeader, Card, ImageField, Modal, RowActions, TextArea, TextInput, Toggle, useFeedback } from '../ui';

interface ApiPage {
  id: number;
  slug: string;
  title: string;
  eyebrow: string | null;
  subtitle: string | null;
  heroImage: string | null;
  sections: PageBlock[];
  isPublished: boolean;
  navGroup: string | null;
  sortOrder: number;
  metaDescription: string | null;
  updatedAt: string;
}

interface PageForm {
  title: string;
  slug: string;
  eyebrow: string;
  subtitle: string;
  heroImage: string;
  isPublished: boolean;
  inSupportMenu: boolean;
  sortOrder: number;
  metaDescription: string;
  blocks: { key: string; block: PageBlock }[];
}

const emptyPage = (): PageForm => ({ title: '', slug: '', eyebrow: '', subtitle: '', heroImage: '', isPublished: false, inSupportMenu: true, sortOrder: 0, metaDescription: '', blocks: [{ key: uid(), block: newBlock('richText') }] });

const fromApi = (p: ApiPage): PageForm => ({
  title: p.title,
  slug: p.slug,
  eyebrow: p.eyebrow ?? '',
  subtitle: p.subtitle ?? '',
  heroImage: p.heroImage ?? '',
  isPublished: p.isPublished,
  inSupportMenu: p.navGroup === 'support',
  sortOrder: p.sortOrder,
  metaDescription: p.metaDescription ?? '',
  blocks: p.sections.map((block) => ({ key: uid(), block })),
});

const toBody = (f: PageForm) => ({
  title: f.title.trim(),
  slug: f.slug,
  eyebrow: f.eyebrow,
  subtitle: f.subtitle,
  heroImage: f.heroImage || null,
  sections: f.blocks.map((b) => b.block),
  isPublished: f.isPublished,
  navGroup: f.inSupportMenu ? 'support' : 'none',
  sortOrder: f.sortOrder,
  metaDescription: f.metaDescription,
});

export default function PageEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast, confirm } = useFeedback();
  const [form, setForm] = useState<PageForm | null>(id ? null : emptyPage);
  const [snapshot, setSnapshot] = useState(() => (id ? '' : JSON.stringify(toBody(emptyPage()))));
  const [meta, setMeta] = useState<{ slug: string; updatedAt: string } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);
  const [slugTouched, setSlugTouched] = useState(!!id);
  const bypass = useRef(false);

  useEffect(() => {
    if (!id) return;
    adminApi<ApiPage>(`/admin/pages/${id}`)
      .then((page) => {
        const next = fromApi(page);
        setForm(next);
        setSnapshot(JSON.stringify(toBody(next)));
        setMeta({ slug: page.slug, updatedAt: page.updatedAt });
      })
      .catch((err: Error) => setLoadError(err.message));
  }, [id]);

  const dirty = !!form && JSON.stringify(toBody(form)) !== snapshot;
  const blocker = useBlocker(({ currentLocation, nextLocation }) => !bypass.current && dirty && currentLocation.pathname !== nextLocation.pathname);

  useEffect(() => {
    if (!dirty) return;
    const onUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, [dirty]);

  const set = <K extends keyof PageForm>(key: K, value: PageForm[K]) => setForm((f) => (f ? { ...f, [key]: value } : f));
  const setBlocks = (blocks: PageForm['blocks']) => set('blocks', blocks);

  const save = async () => {
    if (!form || saving) return;
    if (!form.title.trim()) {
      toast('Give the page a title first.', 'error');
      return;
    }
    setSaving(true);
    try {
      const saved = await adminApi<ApiPage>(id ? `/admin/pages/${id}` : '/admin/pages', { method: id ? 'PUT' : 'POST', json: toBody(form) });
      const sections = Array.isArray(saved.sections) ? saved.sections : form.blocks.map((b) => b.block);
      const next = { ...fromApi({ ...saved, sections }), blocks: form.blocks };
      setForm(next);
      setSnapshot(JSON.stringify(toBody(next)));
      setMeta({ slug: saved.slug, updatedAt: saved.updatedAt });
      invalidate();
      toast('Page saved');
      if (!id) {
        bypass.current = true;
        navigate(`/admin/pages/${saved.id}`, { replace: true });
        window.setTimeout(() => (bypass.current = false), 0);
      }
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loadError) return <ErrorState message={loadError} onRetry={() => navigate(0)} />;
  if (!form) return <Skeleton className="h-96" />;

  const toggle = (key: string) =>
    setOpen((o) => {
      const next = new Set(o);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const addBlock = (type: string) => {
    const entry = { key: uid(), block: newBlock(type) };
    setBlocks([...form.blocks, entry]);
    setOpen((o) => new Set(o).add(entry.key));
    setAdding(false);
  };

  const removeBlock = async (key: string, label: string) => {
    if (await confirm({ title: 'Remove this block?', body: `The “${label}” block will be removed when you save.`, confirmLabel: 'Remove', tone: 'danger' })) setBlocks(form.blocks.filter((b) => b.key !== key));
  };

  return (
    <>
      <AdminPageHeader
        back={{ to: '/admin/pages', label: 'All pages' }}
        title={form.title || 'New page'}
        description={meta ? `Last saved ${timeAgo(meta.updatedAt)}` : 'Build the page from content blocks.'}
        actions={
          <>
            {meta && (
              <a href={`/support/${meta.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-full px-4 text-body-s font-semibold text-fg hover:bg-muted">
                Preview <ExternalLink size={14} aria-hidden="true" />
              </a>
            )}
            <Button size="sm" loading={saving} disabled={!dirty && !!id} onClick={save}>
              <Save size={16} aria-hidden="true" /> Save page
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-6">
          <Card title="Page header">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <TextInput label="Title" required maxLength={160} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value, slug: slugTouched ? form.slug : slugify(e.target.value) })} />
              <TextInput label="Eyebrow" maxLength={80} placeholder="Support" value={form.eyebrow} onChange={(e) => set('eyebrow', e.target.value)} />
              <TextArea label="Subtitle" rows={2} maxLength={400} className="sm:col-span-2" value={form.subtitle} onChange={(e) => set('subtitle', e.target.value)} />
              <div className="sm:col-span-2">
                <ImageField label="Hero image" value={form.heroImage} onChange={(url) => set('heroImage', url)} />
              </div>
            </div>
          </Card>

          <Card title="Content blocks" description="Blocks appear on the page in this order.">
            <div className="flex flex-col gap-3">
              {form.blocks.map(({ key, block }, index) => {
                const def = BLOCK_DEFS[block.type];
                const isOpen = open.has(key);
                return (
                  <div key={key} className={cx('rounded-md border', isOpen ? 'border-line-strong' : 'border-line')}>
                    <div className="flex items-center gap-3 p-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-sm bg-brand-subtle text-fg-brand">
                        <Icon name={def?.icon ?? 'file-text'} size={18} />
                      </span>
                      <button type="button" onClick={() => toggle(key)} aria-expanded={isOpen} className="flex min-w-0 flex-1 items-center gap-2 text-start">
                        <span className="flex min-w-0 flex-col">
                          <span className="text-caps text-fg-subtle">{def?.label ?? block.type}</span>
                          <span className="truncate text-label text-fg">{blockSummary(block) || 'No heading'}</span>
                        </span>
                        <ChevronDown size={18} className={cx('ms-auto shrink-0 text-fg-subtle transition-transform', isOpen && 'rotate-180')} aria-hidden="true" />
                      </button>
                      <button type="button" onClick={() => setBlocks([...form.blocks.slice(0, index + 1), { key: uid(), block: structuredClone(block) }, ...form.blocks.slice(index + 1)])} aria-label="Duplicate block" title="Duplicate" className="flex size-9 shrink-0 items-center justify-center rounded-sm text-fg-muted hover:bg-muted">
                        <Copy size={16} aria-hidden="true" />
                      </button>
                      <RowActions index={index} length={form.blocks.length} onMove={(to) => setBlocks(moveItem(form.blocks, index, to))} onRemove={() => removeBlock(key, def?.label ?? block.type)} />
                    </div>
                    {isOpen && (
                      <div className="border-t border-line p-4">
                        <BlockFields block={block} onChange={(next) => setBlocks(form.blocks.map((b) => (b.key === key ? { key, block: next } : b)))} />
                      </div>
                    )}
                  </div>
                );
              })}

              {adding ? (
                <div className="rounded-md border border-line bg-subtle p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-label text-fg">Choose a block</p>
                    <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>
                      Cancel
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {BLOCK_TYPES.map((type) => (
                      <button key={type} type="button" onClick={() => addBlock(type)} className="flex items-start gap-3 rounded-sm border border-line bg-surface p-3 text-start hover:border-fg">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-sm bg-brand-subtle text-fg-brand">
                          <Icon name={BLOCK_DEFS[type].icon} size={16} />
                        </span>
                        <span className="flex flex-col">
                          <span className="text-label text-fg">{BLOCK_DEFS[type].label}</span>
                          <span className="text-meta text-fg-subtle">{BLOCK_DEFS[type].hint}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <Button type="button" variant="secondary" onClick={() => setAdding(true)} className="self-start">
                  <Plus size={18} aria-hidden="true" /> Add block
                </Button>
              )}
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card title="Publishing">
            <div className="flex flex-col gap-5">
              <Toggle label="Published" description="Visible on the website" checked={form.isPublished} onChange={(v) => set('isPublished', v)} />
              <Toggle label="Show in Support menu" description="Navbar dropdown and footer" checked={form.inSupportMenu} onChange={(v) => set('inSupportMenu', v)} />
              <TextInput label="Menu order" type="number" hint="Lower numbers appear first" value={form.sortOrder} onChange={(e) => set('sortOrder', Number(e.target.value))} />
              <TextInput
                label="Web address"
                hint={`/support/${form.slug || 'page'}`}
                maxLength={80}
                value={form.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  set('slug', slugify(e.target.value));
                }}
              />
            </div>
          </Card>
          <Card title="SEO">
            <TextArea label="Meta description" rows={4} maxLength={320} hint={`${form.metaDescription.length}/160 recommended`} value={form.metaDescription} onChange={(e) => set('metaDescription', e.target.value)} />
          </Card>
        </div>
      </div>

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
          <p className="text-body-s text-fg-muted">Your changes to this page have not been saved yet.</p>
        </Modal>
      )}
    </>
  );
}
