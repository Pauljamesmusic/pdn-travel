import { Download, Mail, MessageCircle, Phone, Search, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button, EmptyState, ErrorState, Skeleton } from '../../components/ui';
import { qs } from '../../lib/api';
import { cx } from '../../lib/format';
import { useDebounced } from '../../lib/hooks';
import type { Paged } from '../../lib/types';
import { adminApi, timeAgo, useAdminApi } from '../api';
import { AdminPageHeader, Modal, StatusPill, TextArea, useFeedback } from '../ui';
import { STATUS_TONE } from './DashboardPage';

const STATUSES = ['NEW', 'CONTACTED', 'QUOTED', 'BOOKED', 'LOST'] as const;

interface EnquiryRow {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  message: string | null;
  travellers: number | null;
  preferredDate: string | null;
  status: string;
  notes: string | null;
  source: string | null;
  createdAt: string;
  trip: { id: number; title: string; slug: string } | null;
}

const reference = (id: number) => `PDN-${String(id).padStart(5, '0')}`;

export default function EnquiriesPage() {
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get('q') ?? '');
  const debounced = useDebounced(search, 300);
  const status = params.get('status') ?? '';
  const page = Number(params.get('page') ?? 1);
  const openId = Number(params.get('open') ?? 0);
  const { toast, confirm } = useFeedback();

  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    setParams(next, { replace: true });
  };

  useEffect(() => {
    if ((params.get('q') ?? '') !== debounced) update({ q: debounced, page: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const filters = { status, q: params.get('q') };
  const { data, error, reload, mutate } = useAdminApi<Paged<EnquiryRow> & { counts: Record<string, number> }>(`/admin/enquiries${qs({ ...filters, page })}`);
  const open = data?.items.find((e) => e.id === openId) ?? null;
  const [notes, setNotes] = useState('');
  useEffect(() => setNotes(open?.notes ?? ''), [open?.id, open?.notes]);

  const patch = async (row: EnquiryRow, body: { status?: string; notes?: string }) => {
    try {
      const saved = await adminApi<EnquiryRow>(`/admin/enquiries/${row.id}`, { method: 'PATCH', json: body });
      mutate((prev) => (prev ? { ...prev, items: prev.items.map((e) => (e.id === row.id ? { ...e, ...saved, trip: e.trip } : e)) } : prev!));
      toast(body.status ? `Marked as ${body.status.toLowerCase()}` : 'Notes saved');
      if (body.status) reload();
    } catch (err) {
      toast((err as Error).message, 'error');
    }
  };

  const remove = async (row: EnquiryRow) => {
    if (!(await confirm({ title: 'Delete enquiry?', body: `${reference(row.id)} from ${row.name} will be permanently deleted.`, confirmLabel: 'Delete', tone: 'danger' }))) return;
    try {
      await adminApi(`/admin/enquiries/${row.id}`, { method: 'DELETE' });
      update({ open: null });
      toast('Enquiry deleted');
      reload();
    } catch (err) {
      toast((err as Error).message, 'error');
    }
  };

  const total = Object.values(data?.counts ?? {}).reduce((a, b) => a + b, 0);

  return (
    <>
      <AdminPageHeader
        title="Enquiries"
        description="Trip requests from the website. Update the status as you follow up."
        actions={
          <a href={`/api/admin/enquiries/export.csv${qs(filters)}`} download className="inline-flex min-h-10 items-center gap-2 rounded-full border-[1.5px] border-line-strong px-4 text-body-s font-semibold text-fg hover:border-fg">
            <Download size={16} aria-hidden="true" /> Export CSV
          </a>
        }
      />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          {[['', 'All', total] as const, ...STATUSES.map((s) => [s, s.charAt(0) + s.slice(1).toLowerCase(), data?.counts[s] ?? 0] as const)].map(([value, label, count]) => (
            <button key={label} type="button" aria-pressed={status === value} onClick={() => update({ status: value, page: null })} className={cx('inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-body-s', status === value ? 'border-inverse bg-inverse text-fg-inverse' : 'border-line bg-surface text-fg hover:border-line-strong')}>
              {label} <span className="text-meta opacity-70">{count}</span>
            </button>
          ))}
        </div>
        <div className="relative lg:ms-auto lg:w-72">
          <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-fg-subtle" aria-hidden="true" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email or message" aria-label="Search enquiries" className="h-11 w-full rounded-md border border-line bg-surface ps-9 pe-3 text-body-s text-fg outline-none focus:border-fg" />
        </div>
      </div>

      {error && !data ? (
        <ErrorState message={error.message} onRetry={reload} />
      ) : !data ? (
        <Skeleton className="h-96" />
      ) : !data.items.length ? (
        <EmptyState title="No enquiries" body="New trip requests from the website will appear here." />
      ) : (
        <>
          <ul className="divide-y divide-line overflow-hidden rounded-md border border-line bg-surface">
            {data.items.map((e) => (
              <li key={e.id}>
                <button type="button" onClick={() => update({ open: String(e.id) })} className="grid grid-cols-1 w-full gap-2 px-4 py-4 text-start hover:bg-subtle sm:grid-cols-[1.4fr_1.4fr_1fr_auto] sm:items-center sm:gap-4">
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-label text-fg">{e.name}</span>
                    <span className="truncate text-meta text-fg-subtle">{e.email}</span>
                  </span>
                  <span className="truncate text-body-s text-fg-muted">{e.trip?.title ?? 'General enquiry'}</span>
                  <span className="text-meta text-fg-subtle">
                    {reference(e.id)} · {timeAgo(e.createdAt)}
                  </span>
                  <StatusPill tone={STATUS_TONE[e.status] ?? 'gray'}>{e.status.toLowerCase()}</StatusPill>
                </button>
              </li>
            ))}
          </ul>
          {data.pageCount > 1 && (
            <div className="mt-4 flex items-center justify-end gap-2 text-meta text-fg-subtle">
              <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => update({ page: String(page - 1) })}>
                Previous
              </Button>
              Page {data.page} of {data.pageCount}
              <Button size="sm" variant="secondary" disabled={page >= data.pageCount} onClick={() => update({ page: String(page + 1) })}>
                Next
              </Button>
            </div>
          )}
        </>
      )}

      {open && (
        <Modal
          title={`${reference(open.id)} · ${open.name}`}
          size="lg"
          onClose={() => update({ open: null })}
          footer={
            <>
              <Button size="sm" variant="ghost" className="me-auto text-fg-brand" onClick={() => remove(open)}>
                <Trash2 size={16} aria-hidden="true" /> Delete
              </Button>
              {open.phone && (
                <a href={`https://wa.me/${open.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hello ${open.name}, thank you for your enquiry (${reference(open.id)}) with PDN Travel.`)}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-full border-[1.5px] border-line-strong px-4 text-body-s font-semibold text-fg hover:border-fg">
                  <MessageCircle size={16} aria-hidden="true" /> WhatsApp
                </a>
              )}
              <a href={`mailto:${open.email}?subject=${encodeURIComponent(`Your PDN Travel enquiry ${reference(open.id)}`)}`} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-brand px-4 text-body-s font-semibold text-ink-0 hover:bg-red-700">
                <Mail size={16} aria-hidden="true" /> Reply by email
              </a>
            </>
          }
        >
          <div className="flex flex-col gap-6">
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {[
                ['Email', <a key="e" href={`mailto:${open.email}`} className="text-fg-brand hover:underline">{open.email}</a>],
                ['Phone', open.phone ? <a key="p" href={`tel:${open.phone}`} className="inline-flex items-center gap-1 hover:underline" dir="ltr"><Phone size={14} aria-hidden="true" />{open.phone}</a> : '—'],
                ['Trip', open.trip ? <a key="t" href={`/tours/${open.trip.slug}`} target="_blank" rel="noopener noreferrer" className="hover:underline">{open.trip.title}</a> : 'General enquiry'],
                ['Travellers', open.travellers ?? '—'],
                ['Preferred date', open.preferredDate || '—'],
                ['Received', new Date(open.createdAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })],
              ].map(([label, value]) => (
                <div key={label as string} className="flex flex-col gap-0.5">
                  <dt className="text-meta text-fg-subtle">{label}</dt>
                  <dd className="text-body-s text-fg">{value}</dd>
                </div>
              ))}
            </dl>
            {open.message && (
              <div className="flex flex-col gap-1.5">
                <p className="text-meta text-fg-subtle">Message</p>
                <p className="whitespace-pre-line rounded-md bg-subtle p-4 text-body-s text-fg">{open.message}</p>
              </div>
            )}
            <div className="flex flex-col gap-2">
              <p className="text-meta font-semibold text-fg">Status</p>
              <div className="flex flex-wrap gap-2">
                {STATUSES.map((s) => (
                  <button key={s} type="button" aria-pressed={open.status === s} onClick={() => open.status !== s && patch(open, { status: s })} className={cx('h-10 rounded-full border px-4 text-body-s capitalize', open.status === s ? 'border-inverse bg-inverse text-fg-inverse' : 'border-line text-fg hover:border-line-strong')}>
                    {s.toLowerCase()}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <TextArea label="Internal notes" hint="Only visible to the PDN team" rows={4} maxLength={5000} value={notes} onChange={(e) => setNotes(e.target.value)} />
              <Button size="sm" variant="secondary" className="self-end" disabled={notes === (open.notes ?? '')} onClick={() => patch(open, { notes })}>
                Save notes
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
