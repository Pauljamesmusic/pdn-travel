import { AlertTriangle, ChevronDown, ListOrdered, Plus } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../../components/ui';
import { cx } from '../../lib/format';
import { moveItem } from '../api';
import { RowActions, TextArea, TextInput, useFeedback } from '../ui';
import { type DayForm, newDay } from './model';

/** Day-by-day itinerary: add, remove, reorder and renumber days. */
export function DaysEditor({ days, durationDays, onChange }: { days: DayForm[]; durationDays: number; onChange: (days: DayForm[]) => void }) {
  const [open, setOpen] = useState<Set<string>>(() => new Set(days.slice(0, 1).map((d) => d.key)));
  const { confirm } = useFeedback();

  const update = (key: string, patch: Partial<DayForm>) => onChange(days.map((d) => (d.key === key ? { ...d, ...patch } : d)));
  const toggle = (key: string) =>
    setOpen((o) => {
      const next = new Set(o);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const add = () => {
    const day = newDay((days.at(-1)?.dayNumber ?? 0) + 1);
    onChange([...days, day]);
    setOpen((o) => new Set(o).add(day.key));
  };

  const remove = async (day: DayForm) => {
    if (day.title || day.body) {
      const ok = await confirm({ title: `Remove day ${day.dayNumber}?`, body: `“${day.title || 'Untitled day'}” will be removed when you save.`, confirmLabel: 'Remove day', tone: 'danger' });
      if (!ok) return;
    }
    onChange(days.filter((d) => d.key !== day.key));
  };

  const renumber = () => onChange(days.map((d, i) => ({ ...d, dayNumber: i + 1 })));
  const outOfOrder = days.some((d, i) => d.dayNumber !== i + 1);
  const allOpen = days.length > 0 && days.every((d) => open.has(d.key));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="me-auto text-body-s text-fg-muted">
          {days.length} day{days.length === 1 ? '' : 's'} planned · trip length {durationDays} day{durationDays === 1 ? '' : 's'}
        </p>
        {outOfOrder && (
          <Button type="button" size="sm" variant="secondary" onClick={renumber}>
            <ListOrdered size={16} aria-hidden="true" /> Renumber 1–{days.length}
          </Button>
        )}
        {days.length > 1 && (
          <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(allOpen ? new Set() : new Set(days.map((d) => d.key)))}>
            {allOpen ? 'Collapse all' : 'Expand all'}
          </Button>
        )}
      </div>

      {days.length > 0 && days.length !== durationDays && (
        <p className="flex items-center gap-2 rounded-sm bg-amber-50 px-4 py-3 text-body-s text-amber-800 dark:bg-amber-950 dark:text-amber-300">
          <AlertTriangle size={16} className="shrink-0" aria-hidden="true" /> The number of days doesn’t match the trip length set in Pricing & dates.
        </p>
      )}

      <ol className="flex flex-col gap-3">
        {days.map((day, index) => {
          const isOpen = open.has(day.key);
          return (
            <li key={day.key} className={cx('rounded-md border bg-surface', isOpen ? 'border-line-strong' : 'border-line')}>
              <div className="flex items-center gap-3 p-3 sm:p-4">
                <span className="flex size-[52px] shrink-0 flex-col items-center justify-center rounded-sm bg-brand-subtle text-fg-brand">
                  <span className="text-meta leading-4">Day</span>
                  <span className="text-h4 leading-6">{String(day.dayNumber).padStart(2, '0')}</span>
                </span>
                <button type="button" onClick={() => toggle(day.key)} aria-expanded={isOpen} className="flex min-w-0 flex-1 items-center gap-2 text-start">
                  <span className={cx('truncate text-label', day.title ? 'text-fg' : 'text-fg-subtle')}>{day.title || 'Untitled day'}</span>
                  <ChevronDown size={18} className={cx('ms-auto shrink-0 text-fg-subtle transition-transform', isOpen && 'rotate-180')} aria-hidden="true" />
                </button>
                <RowActions index={index} length={days.length} onMove={(to) => onChange(moveItem(days, index, to))} onRemove={() => remove(day)} />
              </div>
              {isOpen && (
                <div className="grid grid-cols-1 gap-4 border-t border-line p-4 sm:grid-cols-[120px_1fr] sm:p-5">
                  <TextInput label="Day number" type="number" min={0} max={365} value={day.dayNumber} onChange={(e) => update(day.key, { dayNumber: Number(e.target.value) })} />
                  <TextInput label="Title" value={day.title} maxLength={200} required placeholder="Fly to Lukla, trek to Phakding" onChange={(e) => update(day.key, { title: e.target.value })} />
                  <TextArea label="Description" rows={4} value={day.body} maxLength={5000} className="sm:col-span-2" onChange={(e) => update(day.key, { body: e.target.value })} />
                  <div className="grid grid-cols-1 gap-4 sm:col-span-2 sm:grid-cols-2 lg:grid-cols-4">
                    <TextInput label="Walking / travel time" value={day.walkHours} maxLength={40} placeholder="3–4 hrs" onChange={(e) => update(day.key, { walkHours: e.target.value })} />
                    <TextInput label="Altitude" value={day.altitude} maxLength={40} placeholder="2,610 m" onChange={(e) => update(day.key, { altitude: e.target.value })} />
                    <TextInput label="Stay" value={day.lodging} maxLength={120} placeholder="Teahouse" onChange={(e) => update(day.key, { lodging: e.target.value })} />
                    <TextInput label="Meals" value={day.meals} maxLength={120} placeholder="Breakfast, lunch, dinner" onChange={(e) => update(day.key, { meals: e.target.value })} />
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ol>

      <Button type="button" variant="secondary" onClick={add} className="self-start">
        <Plus size={18} aria-hidden="true" /> Add day {(days.at(-1)?.dayNumber ?? 0) + 1}
      </Button>
    </div>
  );
}
