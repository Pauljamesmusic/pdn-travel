import { ArrowDownUp, Plus, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui';
import { cx } from '../../lib/format';
import { type DepartureForm, uid } from './model';

const cell = 'h-10 w-full rounded-sm border border-line bg-surface px-2.5 text-body-s text-fg outline-none focus:border-fg tabular-nums';

/** Departure dates with seats and optional per-date price. */
export function DeparturesEditor({ departures, currency, onChange }: { departures: DepartureForm[]; currency: string; onChange: (d: DepartureForm[]) => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const update = (key: string, patch: Partial<DepartureForm>) => onChange(departures.map((d) => (d.key === key ? { ...d, ...patch } : d)));

  const add = () => {
    const last = departures.at(-1);
    const base = last?.startDate ? new Date(`${last.startDate}T00:00:00Z`) : new Date();
    base.setUTCDate(base.getUTCDate() + (last ? 14 : 30));
    onChange([...departures, { key: uid(), startDate: base.toISOString().slice(0, 10), seatsTotal: last?.seatsTotal ?? 12, seatsLeft: last?.seatsTotal ?? 12, priceOverride: null }]);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="me-auto text-body-s text-fg-muted">Past dates are hidden on the website automatically. Leave price empty to use the “from” price.</p>
        {departures.length > 1 && (
          <Button type="button" size="sm" variant="ghost" onClick={() => onChange([...departures].sort((a, b) => a.startDate.localeCompare(b.startDate)))}>
            <ArrowDownUp size={16} aria-hidden="true" /> Sort by date
          </Button>
        )}
      </div>
      {departures.length > 0 && (
        <div className="overflow-x-auto rounded-md border border-line">
          <table className="w-full min-w-[620px] text-body-s">
            <thead className="bg-subtle text-meta text-fg-subtle">
              <tr>
                <th className="px-3 py-2 text-start font-semibold">Start date</th>
                <th className="px-3 py-2 text-start font-semibold">Total seats</th>
                <th className="px-3 py-2 text-start font-semibold">Seats left</th>
                <th className="px-3 py-2 text-start font-semibold">Price ({currency})</th>
                <th className="px-3 py-2 text-start font-semibold">Status</th>
                <th className="w-12" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {departures.map((d) => {
                const past = d.startDate && d.startDate < today;
                const invalid = d.seatsLeft > d.seatsTotal;
                return (
                  <tr key={d.key} className={cx(past && 'opacity-60')}>
                    <td className="px-3 py-2">
                      <input type="date" required value={d.startDate} onChange={(e) => update(d.key, { startDate: e.target.value })} className={cell} aria-label="Start date" />
                    </td>
                    <td className="px-3 py-2">
                      <input type="number" min={0} max={1000} value={d.seatsTotal} onChange={(e) => update(d.key, { seatsTotal: Number(e.target.value) })} className={cell} aria-label="Total seats" />
                    </td>
                    <td className="px-3 py-2">
                      <input type="number" min={0} max={1000} value={d.seatsLeft} onChange={(e) => update(d.key, { seatsLeft: Number(e.target.value) })} className={cx(cell, invalid && 'border-red-500')} aria-label="Seats left" aria-invalid={invalid} />
                    </td>
                    <td className="px-3 py-2">
                      <input type="number" min={0} value={d.priceOverride ?? ''} placeholder="Default" onChange={(e) => update(d.key, { priceOverride: e.target.value === '' ? null : Number(e.target.value) })} className={cell} aria-label="Price override" />
                    </td>
                    <td className="px-3 py-2 text-meta">
                      {past ? <span className="text-fg-subtle">Past</span> : d.seatsLeft <= 0 ? <span className="font-semibold text-fg-brand">Sold out</span> : d.seatsLeft < 4 ? <span className="text-amber-600">Few seats</span> : <span className="text-fg-accent">Open</span>}
                    </td>
                    <td className="px-2 py-2">
                      <button type="button" onClick={() => onChange(departures.filter((x) => x.key !== d.key))} aria-label="Remove departure" className="flex size-9 items-center justify-center rounded-sm text-fg-brand hover:bg-brand-subtle">
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <Button type="button" size="sm" variant="secondary" onClick={add} className="self-start">
        <Plus size={16} aria-hidden="true" /> Add departure date
      </Button>
    </div>
  );
}
