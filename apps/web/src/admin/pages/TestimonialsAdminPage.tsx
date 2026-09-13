import { Pencil, Plus, Trash2 } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { Button, EmptyState, ErrorState, Skeleton, SmartImage, Stars } from '../../components/ui';
import { invalidate } from '../../lib/api';
import { adminApi, useAdminApi } from '../api';
import { AdminPageHeader, ImageField, Modal, SelectInput, TextArea, TextInput, Toggle, useFeedback } from '../ui';

interface TestimonialRow {
  id: number;
  name: string;
  location: string | null;
  trip: string | null;
  rating: number;
  quote: string;
  avatar: string | null;
  isPublished: boolean;
  sortOrder: number;
}

type Draft = Omit<TestimonialRow, 'id'> & { id?: number };

const blank: Draft = { name: '', location: '', trip: '', rating: 5, quote: '', avatar: '', isPublished: true, sortOrder: 0 };

const toBody = (d: Draft) => ({
  name: d.name.trim(),
  location: d.location?.trim() || null,
  trip: d.trip?.trim() || null,
  rating: d.rating,
  quote: d.quote.trim(),
  avatar: d.avatar || null,
  isPublished: d.isPublished,
  sortOrder: d.sortOrder,
});

export default function TestimonialsAdminPage() {
  const { data, error, reload, mutate } = useAdminApi<TestimonialRow[]>('/admin/testimonials');
  const [editing, setEditing] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const { confirm, toast } = useFeedback();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      await adminApi(editing.id ? `/admin/testimonials/${editing.id}` : '/admin/testimonials', { method: editing.id ? 'PUT' : 'POST', json: toBody(editing) });
      toast(editing.id ? 'Testimonial updated' : 'Testimonial added');
      setEditing(null);
      invalidate();
      reload();
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const togglePublished = async (row: TestimonialRow) => {
    mutate((list) => (list ?? []).map((t) => (t.id === row.id ? { ...t, isPublished: !row.isPublished } : t)));
    try {
      await adminApi(`/admin/testimonials/${row.id}`, { method: 'PUT', json: toBody({ ...row, isPublished: !row.isPublished }) });
      invalidate();
    } catch (err) {
      toast((err as Error).message, 'error');
      reload();
    }
  };

  const remove = async (row: TestimonialRow) => {
    if (!(await confirm({ title: 'Delete testimonial?', body: `The review from ${row.name} will be removed from the website.`, confirmLabel: 'Delete', tone: 'danger' }))) return;
    try {
      await adminApi(`/admin/testimonials/${row.id}`, { method: 'DELETE' });
      toast('Testimonial deleted');
      invalidate();
      reload();
    } catch (err) {
      toast((err as Error).message, 'error');
    }
  };

  return (
    <>
      <AdminPageHeader
        title="Testimonials"
        description="Traveller reviews shown on the home page and the testimonials page."
        actions={
          <Button size="sm" onClick={() => setEditing({ ...blank, sortOrder: (data?.length ?? 0) + 1 })}>
            <Plus size={16} aria-hidden="true" /> Add testimonial
          </Button>
        }
      />
      {error && !data ? (
        <ErrorState message={error.message} onRetry={reload} />
      ) : !data ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-44" />
          ))}
        </div>
      ) : !data.length ? (
        <EmptyState title="No testimonials yet" body="Add your first traveller review." />
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {data.map((t) => (
            <li key={t.id} className="flex flex-col gap-4 rounded-md border border-line bg-surface p-5">
              <div className="flex items-center gap-3">
                {t.avatar ? (
                  <SmartImage src={t.avatar} alt="" className="size-11 rounded-full object-cover" />
                ) : (
                  <span className="flex size-11 items-center justify-center rounded-full bg-brand-subtle text-label text-fg-brand">{t.name.slice(0, 2).toUpperCase()}</span>
                )}
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-label text-fg">{t.name}</span>
                  <span className="truncate text-meta text-fg-subtle">{[t.trip, t.location].filter(Boolean).join(' · ')}</span>
                </div>
                <Stars rating={t.rating} />
              </div>
              <p className="line-clamp-3 text-body-s text-fg-muted">“{t.quote}”</p>
              <div className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-3">
                <Toggle label="Published" checked={t.isPublished} onChange={() => togglePublished(t)} />
                <div className="flex gap-1">
                  <button type="button" onClick={() => setEditing({ ...t, location: t.location ?? '', trip: t.trip ?? '', avatar: t.avatar ?? '' })} aria-label={`Edit ${t.name}`} className="flex size-9 items-center justify-center rounded-sm text-fg-muted hover:bg-muted">
                    <Pencil size={16} aria-hidden="true" />
                  </button>
                  <button type="button" onClick={() => remove(t)} aria-label={`Delete ${t.name}`} className="flex size-9 items-center justify-center rounded-sm text-fg-brand hover:bg-brand-subtle">
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <Modal
          title={editing.id ? 'Edit testimonial' : 'New testimonial'}
          size="lg"
          onClose={() => setEditing(null)}
          footer={
            <>
              <Button size="sm" variant="secondary" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button size="sm" type="submit" form="testimonial-form" loading={saving}>
                Save
              </Button>
            </>
          }
        >
          <form id="testimonial-form" onSubmit={submit} className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <TextInput label="Name" required maxLength={120} value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            <TextInput label="Location" maxLength={120} value={editing.location ?? ''} onChange={(e) => setEditing({ ...editing, location: e.target.value })} />
            <TextInput label="Trip" maxLength={160} placeholder="Pokhara family trip · Dec 2023" value={editing.trip ?? ''} onChange={(e) => setEditing({ ...editing, trip: e.target.value })} />
            <SelectInput label="Rating" value={editing.rating} onChange={(e) => setEditing({ ...editing, rating: Number(e.target.value) })}>
              {[5, 4, 3, 2, 1].map((r) => (
                <option key={r} value={r}>
                  {'★'.repeat(r)} ({r})
                </option>
              ))}
            </SelectInput>
            <TextArea label="Quote" required minLength={5} maxLength={2000} rows={5} className="sm:col-span-2" value={editing.quote} onChange={(e) => setEditing({ ...editing, quote: e.target.value })} />
            <div className="sm:col-span-2">
              <ImageField label="Photo (optional)" value={editing.avatar} onChange={(avatar) => setEditing({ ...editing, avatar })} />
            </div>
            <TextInput label="Sort order" type="number" value={editing.sortOrder} onChange={(e) => setEditing({ ...editing, sortOrder: Number(e.target.value) })} />
            <div className="flex items-end pb-2">
              <Toggle label="Published" checked={editing.isPublished} onChange={(isPublished) => setEditing({ ...editing, isPublished })} />
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
