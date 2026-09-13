import { ChevronDown, Eye, EyeOff, ImagePlus, Info, Plus } from 'lucide-react';
import { useState } from 'react';
import { Icon } from '../../components/Icon';
import { Button, SmartImage } from '../../components/ui';
import { cx } from '../../lib/format';
import type { SectionType } from '../../lib/types';
import { moveItem } from '../api';
import { MediaPicker, RowActions, SelectInput, StringListEditor, TextArea, TextInput, useFeedback } from '../ui';
import { newSection, SECTION_META, SECTION_TYPES, type SectionForm, type TabId } from './model';

interface Counts {
  days: number;
  amenities: number;
  departures: number;
}

/** Add, remove, reorder, hide and edit every section on a trip page. */
export function SectionsEditor({ sections, onChange, counts, goToTab }: { sections: SectionForm[]; onChange: (s: SectionForm[]) => void; counts: Counts; goToTab: (tab: TabId) => void }) {
  const [open, setOpen] = useState<Set<string>>(() => new Set());
  const [adding, setAdding] = useState(false);
  const { confirm } = useFeedback();

  const update = (key: string, patch: Partial<SectionForm>) => onChange(sections.map((s) => (s.key === key ? { ...s, ...patch } : s)));
  const setContent = (key: string, patch: Record<string, unknown>) => onChange(sections.map((s) => (s.key === key ? { ...s, content: { ...s.content, ...patch } } : s)));
  const toggleOpen = (key: string) =>
    setOpen((o) => {
      const next = new Set(o);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const add = (type: SectionType) => {
    const section = newSection(type);
    onChange([...sections, section]);
    setOpen((o) => new Set(o).add(section.key));
    setAdding(false);
  };

  const remove = async (section: SectionForm) => {
    const ok = await confirm({ title: 'Remove this section?', body: `“${section.title || SECTION_META[section.type].label}” will be removed from the trip page when you save.`, confirmLabel: 'Remove section', tone: 'danger' });
    if (ok) onChange(sections.filter((s) => s.key !== section.key));
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-body-s text-fg-muted">Sections appear on the trip page in this order. Hidden sections are saved but not shown to visitors.</p>

      {sections.length === 0 && <p className="rounded-md border border-dashed border-line-strong p-8 text-center text-body-s text-fg-muted">This trip has no sections yet. Add one below.</p>}

      <ol className="flex flex-col gap-3">
        {sections.map((section, index) => {
          const meta = SECTION_META[section.type];
          const isOpen = open.has(section.key);
          return (
            <li key={section.key} className={cx('rounded-md border bg-surface', isOpen ? 'border-line-strong' : 'border-line')}>
              <div className="flex items-center gap-3 p-3 sm:p-4">
                <span className={cx('flex size-10 shrink-0 items-center justify-center rounded-sm', section.isVisible ? 'bg-brand-subtle text-fg-brand' : 'bg-muted text-fg-subtle')}>
                  <Icon name={meta.icon} size={18} />
                </span>
                <button type="button" onClick={() => toggleOpen(section.key)} aria-expanded={isOpen} className="flex min-w-0 flex-1 items-center gap-2 text-start">
                  <span className="flex min-w-0 flex-col">
                    <span className="text-caps text-fg-subtle">{meta.label}</span>
                    <span className={cx('truncate text-label', section.isVisible ? 'text-fg' : 'text-fg-subtle line-through')}>{section.title || 'Untitled section'}</span>
                  </span>
                  <ChevronDown size={18} className={cx('ms-auto shrink-0 text-fg-subtle transition-transform', isOpen && 'rotate-180')} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => update(section.key, { isVisible: !section.isVisible })}
                  aria-label={section.isVisible ? 'Hide section' : 'Show section'}
                  title={section.isVisible ? 'Visible — click to hide' : 'Hidden — click to show'}
                  className="flex size-9 shrink-0 items-center justify-center rounded-sm text-fg-muted hover:bg-muted"
                >
                  {section.isVisible ? <Eye size={16} aria-hidden="true" /> : <EyeOff size={16} aria-hidden="true" />}
                </button>
                <RowActions index={index} length={sections.length} onMove={(to) => onChange(moveItem(sections, index, to))} onRemove={() => remove(section)} />
              </div>
              {isOpen && (
                <div className="flex flex-col gap-4 border-t border-line p-4 sm:p-5">
                  <TextInput label="Section heading" value={section.title} maxLength={160} onChange={(e) => update(section.key, { title: e.target.value })} />
                  <SectionContentEditor section={section} onContent={(patch) => setContent(section.key, patch)} counts={counts} goToTab={goToTab} />
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {adding ? (
        <div className="rounded-md border border-line bg-subtle p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-label text-fg">Choose a section type</p>
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {SECTION_TYPES.map((type) => (
              <button key={type} type="button" onClick={() => add(type)} className="flex items-start gap-3 rounded-sm border border-line bg-surface p-3 text-start hover:border-fg">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-sm bg-brand-subtle text-fg-brand">
                  <Icon name={SECTION_META[type].icon} size={16} />
                </span>
                <span className="flex flex-col">
                  <span className="text-label text-fg">{SECTION_META[type].label}</span>
                  <span className="text-meta text-fg-subtle">{SECTION_META[type].hint}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <Button type="button" variant="secondary" onClick={() => setAdding(true)} className="self-start">
          <Plus size={18} aria-hidden="true" /> Add section
        </Button>
      )}
    </div>
  );
}

function LinkedNotice({ text, tab, label, goToTab }: { text: string; tab: TabId; label: string; goToTab: (tab: TabId) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-sm bg-accent-subtle p-4 text-body-s text-fg-accent">
      <Info size={18} className="shrink-0" aria-hidden="true" />
      <span className="flex-1">{text}</span>
      <button type="button" onClick={() => goToTab(tab)} className="text-label underline">
        {label}
      </button>
    </div>
  );
}

function SectionContentEditor({ section, onContent, counts, goToTab }: { section: SectionForm; onContent: (patch: Record<string, unknown>) => void; counts: Counts; goToTab: (tab: TabId) => void }) {
  const c = section.content;
  const body = typeof c.body === 'string' ? c.body : '';
  const strings = Array.isArray(c.items) ? (c.items as unknown[]).filter((x): x is string => typeof x === 'string') : [];

  switch (section.type) {
    case 'overview':
    case 'richText':
      return <TextArea label="Text" rows={7} value={body} maxLength={20000} onChange={(e) => onContent({ body: e.target.value })} hint="Leave a blank line between paragraphs. Start a line with “- ” to make a bullet." />;
    case 'highlights':
    case 'list':
      return <StringListEditor label="Items" items={strings} onChange={(items) => onContent({ items })} placeholder="Type an item and press Enter" />;
    case 'faq': {
      const faqs = Array.isArray(c.items) ? (c.items as unknown[]).filter((x): x is { q: string; a: string } => typeof x === 'object' && x !== null) : [];
      return <FaqEditor items={faqs} onChange={(items) => onContent({ items })} />;
    }
    case 'gallery':
      return <GalleryEditor images={Array.isArray(c.images) ? (c.images as { url: string; alt: string }[]) : []} onChange={(images) => onContent({ images })} />;
    case 'notice':
      return (
        <>
          <SelectInput label="Style" value={c.tone === 'warning' ? 'warning' : 'info'} onChange={(e) => onContent({ tone: e.target.value })}>
            <option value="info">Information (green)</option>
            <option value="warning">Warning (red)</option>
          </SelectInput>
          <TextArea label="Message" rows={4} value={body} onChange={(e) => onContent({ body: e.target.value })} />
        </>
      );
    case 'itinerary':
      return <LinkedNotice text={`Shows the ${counts.days} day${counts.days === 1 ? '' : 's'} from the Itinerary tab.`} tab="itinerary" label="Edit days" goToTab={goToTab} />;
    case 'inclusions':
      return <LinkedNotice text={`Shows the ${counts.amenities} included / excluded item${counts.amenities === 1 ? '' : 's'} from the Inclusions tab.`} tab="inclusions" label="Edit items" goToTab={goToTab} />;
    case 'departures':
      return (
        <>
          <LinkedNotice text={`Shows upcoming dates (${counts.departures} set) from the Pricing & dates tab.`} tab="pricing" label="Edit dates" goToTab={goToTab} />
          <TextInput label="Note under the dates (optional)" value={typeof c.note === 'string' ? c.note : ''} onChange={(e) => onContent({ note: e.target.value })} placeholder="Private departures are available on request." />
        </>
      );
    default:
      return null;
  }
}

function FaqEditor({ items, onChange }: { items: { q: string; a: string }[]; onChange: (items: { q: string; a: string }[]) => void }) {
  return (
    <div className="flex flex-col gap-3">
      {items.map((item, i) => (
        <div key={i} className="flex flex-col gap-2 rounded-sm border border-line p-3 sm:flex-row sm:items-start">
          <div className="flex flex-1 flex-col gap-2">
            <TextInput label={`Question ${i + 1}`} value={item.q} onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, q: e.target.value } : x)))} />
            <TextArea label="Answer" rows={3} value={item.a} onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, a: e.target.value } : x)))} />
          </div>
          <RowActions index={i} length={items.length} onMove={(to) => onChange(moveItem(items, i, to))} onRemove={() => onChange(items.filter((_, j) => j !== i))} />
        </div>
      ))}
      <Button type="button" size="sm" variant="secondary" onClick={() => onChange([...items, { q: '', a: '' }])} className="self-start">
        <Plus size={16} aria-hidden="true" /> Add question
      </Button>
    </div>
  );
}

export function GalleryEditor({ images, onChange }: { images: { url: string; alt: string }[]; onChange: (images: { url: string; alt: string }[]) => void }) {
  const [picker, setPicker] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      {images.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {images.map((img, i) => (
            <li key={img.url + i} className="flex flex-col gap-2 rounded-sm border border-line p-2">
              <SmartImage src={img.url} alt={img.alt} className="aspect-[4/3] w-full rounded-sm object-cover" />
              <input value={img.alt} onChange={(e) => onChange(images.map((x, j) => (j === i ? { ...x, alt: e.target.value } : x)))} placeholder="Describe the photo" aria-label={`Alt text for photo ${i + 1}`} className="h-9 rounded-sm border border-line bg-surface px-2 text-meta text-fg outline-none focus:border-fg" />
              <RowActions index={i} length={images.length} onMove={(to) => onChange(moveItem(images, i, to))} onRemove={() => onChange(images.filter((_, j) => j !== i))} />
            </li>
          ))}
        </ul>
      )}
      <Button type="button" size="sm" variant="secondary" onClick={() => setPicker(true)} className="self-start">
        <ImagePlus size={16} aria-hidden="true" /> Add photos
      </Button>
      {picker && (
        <MediaPicker
          multiple
          onClose={() => setPicker(false)}
          onSelect={(items) => {
            onChange([...images, ...items]);
            setPicker(false);
          }}
        />
      )}
    </div>
  );
}
