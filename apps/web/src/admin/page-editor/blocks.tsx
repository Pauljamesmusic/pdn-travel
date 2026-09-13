import { ChevronDown, Plus } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../../components/ui';
import { cx } from '../../lib/format';
import type { PageBlock } from '../../lib/types';
import { moveItem } from '../api';
import { GalleryEditor } from '../trip-editor/SectionsEditor';
import { IconPicker, ImageField, RowActions, SelectInput, StringListEditor, TextArea, TextInput } from '../ui';

type Kind = 'text' | 'textarea' | 'image' | 'icon' | 'select' | 'date';

export interface FieldDef {
  key: string;
  label: string;
  kind?: Kind;
  placeholder?: string;
  hint?: string;
  wide?: boolean;
  options?: [string, string][];
}

export interface BlockDef {
  label: string;
  hint: string;
  icon: string;
  fields: FieldDef[];
  items?: { label: string; itemLabel: string; fields: FieldDef[] };
  strings?: boolean;
  gallery?: boolean;
}

const HEADING: FieldDef = { key: 'heading', label: 'Heading', wide: true };
const INTRO: FieldDef = { key: 'intro', label: 'Intro text', kind: 'textarea', wide: true };
const BODY: FieldDef = { key: 'body', label: 'Text', kind: 'textarea', wide: true, hint: 'Blank line = new paragraph. Start a line with “- ” for a bullet.' };

/** Mirrors every block type BlockRenderer can show on the public site. */
export const BLOCK_DEFS: Record<string, BlockDef> = {
  richText: { label: 'Text', hint: 'Heading and paragraphs', icon: 'file-text', fields: [HEADING, BODY] },
  imageText: {
    label: 'Image + text',
    hint: 'Two columns with a photo',
    icon: 'camera',
    fields: [{ key: 'eyebrow', label: 'Eyebrow' }, { key: 'imageSide', label: 'Image position', kind: 'select', options: [['right', 'Right'], ['left', 'Left']] }, HEADING, BODY, { key: 'image', label: 'Image', kind: 'image', wide: true }],
  },
  stats: { label: 'Stats', hint: 'Big numbers with labels', icon: 'award', fields: [], items: { label: 'Stats', itemLabel: 'Stat', fields: [{ key: 'value', label: 'Value', placeholder: '15+' }, { key: 'label', label: 'Label', placeholder: 'Years of experience' }] } },
  cards: {
    label: 'Feature cards',
    hint: 'Icon cards in a grid',
    icon: 'sparkles',
    fields: [HEADING, INTRO],
    items: { label: 'Cards', itemLabel: 'Card', fields: [{ key: 'title', label: 'Title' }, { key: 'icon', label: 'Icon', kind: 'icon' }, { key: 'body', label: 'Text', kind: 'textarea', wide: true }] },
  },
  team: {
    label: 'Team',
    hint: 'People with photo, role and bio',
    icon: 'users',
    fields: [HEADING, INTRO],
    items: { label: 'People', itemLabel: 'Person', fields: [{ key: 'name', label: 'Name' }, { key: 'role', label: 'Role' }, { key: 'bio', label: 'Bio', kind: 'textarea', wide: true }, { key: 'photo', label: 'Photo', kind: 'image', wide: true }] },
  },
  registrations: {
    label: 'Registrations',
    hint: 'Licences and registration numbers',
    icon: 'shield-check',
    fields: [HEADING, INTRO],
    items: { label: 'Registrations', itemLabel: 'Registration', fields: [{ key: 'authority', label: 'Authority' }, { key: 'number', label: 'Number' }, { key: 'label', label: 'Description', wide: true }] },
  },
  list: { label: 'Bullet list', hint: 'Simple list of points', icon: 'check', fields: [HEADING], strings: true },
  legal: { label: 'Legal clauses', hint: 'Numbered terms & conditions', icon: 'landmark', fields: [], items: { label: 'Clauses', itemLabel: 'Clause', fields: [{ key: 'title', label: 'Title', wide: true }, { ...BODY, label: 'Text' }] } },
  faq: { label: 'FAQ', hint: 'Expandable questions', icon: 'messages-square', fields: [HEADING], items: { label: 'Questions', itemLabel: 'Question', fields: [{ key: 'q', label: 'Question', wide: true }, { key: 'a', label: 'Answer', kind: 'textarea', wide: true }] } },
  quote: { label: 'Quote', hint: 'Large centred quote', icon: 'star', fields: [{ key: 'text', label: 'Quote', kind: 'textarea', wide: true }, { key: 'attribution', label: 'Attribution', wide: true }] },
  events: {
    label: 'Events',
    hint: 'Event cards with date and button',
    icon: 'ticket',
    fields: [HEADING],
    items: {
      label: 'Events',
      itemLabel: 'Event',
      fields: [
        { key: 'title', label: 'Title', wide: true },
        { key: 'date', label: 'Date', kind: 'date' },
        { key: 'location', label: 'Location' },
        { key: 'body', label: 'Description', kind: 'textarea', wide: true },
        { key: 'image', label: 'Image', kind: 'image', wide: true },
        { key: 'ctaLabel', label: 'Button label' },
        { key: 'ctaLink', label: 'Button link', placeholder: '/contact' },
      ],
    },
  },
  gallery: { label: 'Gallery', hint: 'Grid of photos', icon: 'camera', fields: [HEADING], gallery: true },
  cta: {
    label: 'Call to action',
    hint: 'Dark banner with a button',
    icon: 'megaphone',
    fields: [HEADING, { key: 'body', label: 'Text', kind: 'textarea', wide: true }, { key: 'buttonLabel', label: 'Button label', placeholder: 'Plan my trip' }, { key: 'buttonLink', label: 'Button link', placeholder: '/contact' }],
  },
};

export const BLOCK_TYPES = Object.keys(BLOCK_DEFS);

const arr = <T,>(v: unknown) => (Array.isArray(v) ? (v as T[]) : []);
const str = (v: unknown) => (typeof v === 'string' ? v : '');

export function newBlock(type: string): PageBlock {
  const def = BLOCK_DEFS[type];
  const block: PageBlock = { type };
  for (const f of def.fields) block[f.key] = f.kind === 'select' ? (f.options?.[0][0] ?? '') : '';
  if (def.items || def.strings) block.items = [];
  if (def.gallery) block.images = [];
  return block;
}

export function blockSummary(block: PageBlock) {
  const first = arr<Record<string, unknown>>(block.items)[0];
  return str(block.heading) || str(block.text) || (first ? str(first.title ?? first.q ?? first.name ?? first.value) : '') || '';
}

export function FieldControl({ field, value, onChange }: { field: FieldDef; value: unknown; onChange: (v: string) => void }) {
  const v = str(value);
  const wide = field.wide ? 'sm:col-span-2' : undefined;
  switch (field.kind) {
    case 'textarea':
      return <TextArea label={field.label} rows={4} value={v} hint={field.hint} placeholder={field.placeholder} className={wide} onChange={(e) => onChange(e.target.value)} />;
    case 'image':
      return (
        <div className={wide}>
          <ImageField label={field.label} value={v} onChange={onChange} />
        </div>
      );
    case 'icon':
      return <IconPicker label={field.label} value={v || 'compass'} onChange={onChange} />;
    case 'select':
      return (
        <SelectInput label={field.label} value={v} className={wide} onChange={(e) => onChange(e.target.value)}>
          {field.options?.map(([val, label]) => (
            <option key={val} value={val}>
              {label}
            </option>
          ))}
        </SelectInput>
      );
    case 'date':
      return <TextInput type="date" label={field.label} value={v.slice(0, 10)} className={wide} onChange={(e) => onChange(e.target.value)} />;
    default:
      return <TextInput label={field.label} value={v} placeholder={field.placeholder} className={wide} onChange={(e) => onChange(e.target.value)} />;
  }
}

/** Form for one page block, generated from its definition. */
export function BlockFields({ block, onChange }: { block: PageBlock; onChange: (b: PageBlock) => void }) {
  const def = BLOCK_DEFS[block.type];
  if (!def) return <p className="text-body-s text-fg-muted">This block type (“{block.type}”) can’t be edited here.</p>;
  const set = (key: string, value: unknown) => onChange({ ...block, [key]: value });
  return (
    <div className="flex flex-col gap-5">
      {def.fields.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {def.fields.map((f) => (
            <FieldControl key={f.key} field={f} value={block[f.key]} onChange={(v) => set(f.key, v)} />
          ))}
        </div>
      )}
      {def.strings && <StringListEditor label="Items" items={arr<unknown>(block.items).filter((x): x is string => typeof x === 'string')} onChange={(items) => set('items', items)} />}
      {def.gallery && <GalleryEditor images={arr<{ url: string; alt: string }>(block.images)} onChange={(images) => set('images', images)} />}
      {def.items && <ItemsEditor def={def.items} items={arr<Record<string, unknown>>(block.items)} onChange={(items) => set('items', items)} />}
    </div>
  );
}

export function ItemsEditor({ def, items, onChange }: { def: NonNullable<BlockDef['items']>; items: Record<string, unknown>[]; onChange: (items: Record<string, unknown>[]) => void }) {
  const [open, setOpen] = useState<Set<number>>(() => new Set(items.length <= 3 ? items.map((_, i) => i) : []));

  const toggle = (i: number) =>
    setOpen((o) => {
      const next = new Set(o);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length) return;
    onChange(moveItem(items, from, to));
    setOpen((o) => new Set([...o].map((i) => (i === from ? to : i === to ? from : i))));
  };

  const remove = (index: number) => {
    onChange(items.filter((_, j) => j !== index));
    setOpen((o) => new Set([...o].filter((i) => i !== index).map((i) => (i > index ? i - 1 : i))));
  };

  const add = () => {
    onChange([...items, Object.fromEntries(def.fields.map((f) => [f.key, f.kind === 'icon' ? 'compass' : '']))]);
    setOpen((o) => new Set(o).add(items.length));
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-meta font-semibold text-fg">
        {def.label} <span className="text-fg-subtle">({items.length})</span>
      </p>
      <ol className="flex flex-col gap-2">
        {items.map((item, i) => (
          <li key={i} className="rounded-sm border border-line bg-surface">
            <div className="flex items-center gap-2 px-3 py-1.5">
              <button type="button" onClick={() => toggle(i)} aria-expanded={open.has(i)} className="flex min-h-10 min-w-0 flex-1 items-center gap-2 text-start">
                <span className="shrink-0 text-meta text-fg-subtle">
                  {def.itemLabel} {i + 1}
                </span>
                <span className="truncate text-body-s text-fg">{str(item[def.fields[0].key])}</span>
                <ChevronDown size={16} className={cx('ms-auto shrink-0 text-fg-subtle transition-transform', open.has(i) && 'rotate-180')} aria-hidden="true" />
              </button>
              <RowActions index={i} length={items.length} onMove={(to) => move(i, to)} onRemove={() => remove(i)} />
            </div>
            {open.has(i) && (
              <div className="grid grid-cols-1 gap-4 border-t border-line p-3 sm:grid-cols-2">
                {def.fields.map((f) => (
                  <FieldControl key={f.key} field={f} value={item[f.key]} onChange={(v) => onChange(items.map((x, j) => (j === i ? { ...x, [f.key]: v } : x)))} />
                ))}
              </div>
            )}
          </li>
        ))}
      </ol>
      <Button type="button" size="sm" variant="secondary" onClick={add} className="self-start">
        <Plus size={16} aria-hidden="true" /> Add {def.itemLabel.toLowerCase()}
      </Button>
    </div>
  );
}
