import { ArrowLeftRight, Plus } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../../components/ui';
import { moveItem } from '../api';
import { IconPicker, RowActions } from '../ui';
import { type AmenityForm, uid } from './model';

const SUGGESTIONS = {
  included: [
    ['Airport pick-up & drop-off', 'car'],
    ['Accommodation', 'hotel'],
    ['Daily breakfast', 'coffee'],
    ['Licensed English-speaking guide', 'user-check'],
    ['Entrance fees & permits', 'ticket'],
    ['Private transport', 'bus'],
  ],
  excluded: [
    ['International flights', 'plane'],
    ['Travel insurance', 'shield'],
    ['Tips for guides & drivers', 'hand-coins'],
    ['Personal expenses', 'wallet'],
    ['Visa fees', 'file-text'],
  ],
} as const;

/** What’s included / not included, with icons. */
export function InclusionsEditor({ amenities, onChange }: { amenities: AmenityForm[]; onChange: (a: AmenityForm[]) => void }) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Column title="Included" included amenities={amenities} onChange={onChange} />
      <Column title="Not included" included={false} amenities={amenities} onChange={onChange} />
    </div>
  );
}

function Column({ title, included, amenities, onChange }: { title: string; included: boolean; amenities: AmenityForm[]; onChange: (a: AmenityForm[]) => void }) {
  const [draft, setDraft] = useState('');
  const list = amenities.filter((a) => a.included === included);
  const others = amenities.filter((a) => a.included !== included);
  const setList = (next: AmenityForm[]) => onChange(included ? [...next, ...others] : [...others, ...next]);
  const update = (key: string, patch: Partial<AmenityForm>) => onChange(amenities.map((a) => (a.key === key ? { ...a, ...patch } : a)));
  const add = (label: string, icon: string = included ? 'check' : 'x') => {
    if (!label.trim()) return;
    setList([...list, { key: uid(), label: label.trim(), icon, included }]);
    setDraft('');
  };
  const unused = SUGGESTIONS[included ? 'included' : 'excluded'].filter(([label]) => !amenities.some((a) => a.label.toLowerCase() === label.toLowerCase()));

  return (
    <section className="flex flex-col gap-3 rounded-md border border-line p-4">
      <h3 className="text-label text-fg">
        {title} <span className="text-fg-subtle">({list.length})</span>
      </h3>
      <ul className="flex flex-col gap-2">
        {list.map((item, i) => (
          <li key={item.key} className="flex flex-wrap items-end gap-2 rounded-sm bg-subtle p-2 sm:flex-nowrap">
            {included && (
              <div className="w-36 shrink-0">
                <IconPicker value={item.icon} onChange={(icon) => update(item.key, { icon })} />
              </div>
            )}
            <input
              value={item.label}
              onChange={(e) => update(item.key, { label: e.target.value })}
              maxLength={160}
              aria-label="Label"
              className="h-11 min-w-0 flex-1 rounded-md border border-line bg-surface px-3 text-body-s text-fg outline-none focus:border-fg"
            />
            <button type="button" onClick={() => update(item.key, { included: !included })} title={included ? 'Move to not included' : 'Move to included'} aria-label={included ? 'Move to not included' : 'Move to included'} className="flex size-9 items-center justify-center rounded-sm text-fg-muted hover:bg-muted">
              <ArrowLeftRight size={16} aria-hidden="true" />
            </button>
            <RowActions index={i} length={list.length} onMove={(to) => setList(moveItem(list, i, to))} onRemove={() => onChange(amenities.filter((a) => a.key !== item.key))} />
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add(draft))}
          placeholder={included ? 'e.g. Welcome dinner' : 'e.g. Alcoholic drinks'}
          aria-label={`Add to ${title.toLowerCase()}`}
          className="h-10 min-w-0 flex-1 rounded-md border border-line bg-surface px-3 text-body-s text-fg outline-none focus:border-fg"
        />
        <Button type="button" size="sm" variant="secondary" onClick={() => add(draft)}>
          <Plus size={16} aria-hidden="true" /> Add
        </Button>
      </div>
      {unused.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {unused.map(([label, icon]) => (
            <button key={label} type="button" onClick={() => add(label, icon)} className="rounded-full border border-dashed border-line-strong px-3 py-1 text-meta text-fg-muted hover:border-fg hover:text-fg">
              + {label}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
