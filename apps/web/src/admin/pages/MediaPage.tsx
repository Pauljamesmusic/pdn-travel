import { Copy, Link2, Search, Trash2, Upload } from 'lucide-react';
import { type DragEvent, useRef, useState } from 'react';
import { Button, EmptyState, ErrorState, Skeleton, SmartImage } from '../../components/ui';
import { cx } from '../../lib/format';
import { useDebounced } from '../../lib/hooks';
import { adminApi, type MediaItem, uploadFiles, useAdminApi } from '../api';
import { AdminPageHeader, Modal, useFeedback } from '../ui';

const formatBytes = (bytes: number) => (bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`);

export default function MediaPage() {
  const [query, setQuery] = useState('');
  const q = useDebounced(query, 300);
  const { data, error, reload, mutate } = useAdminApi<MediaItem[]>(`/admin/media${q ? `?q=${encodeURIComponent(q)}` : ''}`);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [usage, setUsage] = useState<{ item: MediaItem; places: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast, confirm } = useFeedback();

  const upload = async (files: File[]) => {
    const images = files.filter((f) => f.type.startsWith('image/'));
    if (!images.length) return toast('Choose JPG, PNG, WebP, AVIF or GIF images', 'error');
    setUploading(true);
    try {
      const saved = await uploadFiles(images);
      toast(`${saved.length} image${saved.length === 1 ? '' : 's'} uploaded and optimised`);
      reload();
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setUploading(false);
    }
  };

  const saveAlt = async (item: MediaItem, alt: string) => {
    if (alt === item.alt) return;
    try {
      await adminApi(`/admin/media/${item.id}`, { method: 'PATCH', json: { alt } });
      mutate((list) => (list ?? []).map((m) => (m.id === item.id ? { ...m, alt } : m)));
      toast('Alt text saved');
    } catch (err) {
      toast((err as Error).message, 'error');
    }
  };

  const showUsage = async (item: MediaItem) => {
    try {
      setUsage({ item, places: await adminApi<string[]>(`/admin/media/${item.id}/usage`) });
    } catch (err) {
      toast((err as Error).message, 'error');
    }
  };

  const remove = async (item: MediaItem) => {
    if (!(await confirm({ title: 'Delete image?', body: `${item.filename} will be permanently deleted. Images still used on the website can’t be deleted.`, confirmLabel: 'Delete', tone: 'danger' }))) return;
    try {
      await adminApi(`/admin/media/${item.id}`, { method: 'DELETE' });
      toast('Image deleted');
      reload();
    } catch (err) {
      toast((err as Error).message, 'error');
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    void upload(Array.from(e.dataTransfer.files));
  };

  return (
    <>
      <AdminPageHeader
        title="Media library"
        description="Every image uploaded for trips, pages and settings. Uploads are resized to 2400px and converted to WebP."
        actions={
          <>
            <input ref={fileRef} type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif,image/gif" className="hidden" onChange={(e) => e.target.files && upload(Array.from(e.target.files))} />
            <Button size="sm" loading={uploading} onClick={() => fileRef.current?.click()}>
              <Upload size={16} aria-hidden="true" /> Upload images
            </Button>
          </>
        }
      />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cx('mb-6 flex flex-col items-center gap-2 rounded-md border-2 border-dashed p-6 text-center transition-colors', dragging ? 'border-red-500 bg-brand-subtle' : 'border-line-strong bg-surface')}
      >
        <Upload size={24} className="text-fg-subtle" aria-hidden="true" />
        <p className="text-body-s text-fg-muted">Drop images here to upload (up to 20 at a time, 15 MB each)</p>
      </div>

      <div className="relative mb-4 max-w-md">
        <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-fg-subtle" aria-hidden="true" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search file name or alt text" aria-label="Search media" className="h-11 w-full rounded-md border border-line bg-surface ps-9 pe-3 text-body-s text-fg outline-none focus:border-fg" />
      </div>

      {error && !data ? (
        <ErrorState message={error.message} onRetry={reload} />
      ) : !data ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="aspect-square" />
          ))}
        </div>
      ) : !data.length ? (
        <EmptyState title={q ? 'No images match' : 'No uploads yet'} body="Images you upload here can be used anywhere on the website." />
      ) : (
        <ul className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {data.map((item) => (
            <li key={item.id} className="flex flex-col overflow-hidden rounded-md border border-line bg-surface">
              <SmartImage src={item.url} alt={item.alt} className="aspect-[4/3] w-full bg-subtle object-cover" />
              <div className="flex flex-col gap-2 p-3">
                <p className="truncate text-label text-fg" title={item.filename}>
                  {item.filename}
                </p>
                <p className="text-meta text-fg-subtle">
                  {item.width && item.height ? `${item.width}×${item.height} · ` : ''}
                  {formatBytes(item.size)}
                </p>
                <input
                  defaultValue={item.alt}
                  onBlur={(e) => saveAlt(item, e.target.value)}
                  placeholder="Alt text"
                  maxLength={200}
                  aria-label={`Alt text for ${item.filename}`}
                  className="h-10 rounded-sm border border-line bg-surface px-3 text-body-s text-fg outline-none focus:border-fg"
                />
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(new URL(item.url, window.location.origin).href).then(() => toast('Link copied'))}
                    className="inline-flex h-9 items-center gap-1.5 rounded-full px-2 text-meta font-semibold text-fg hover:bg-muted"
                  >
                    <Copy size={14} aria-hidden="true" /> Copy link
                  </button>
                  <div className="flex">
                    <button type="button" onClick={() => showUsage(item)} aria-label="Where is this used?" title="Where is this used?" className="flex size-9 items-center justify-center rounded-sm text-fg-muted hover:bg-muted">
                      <Link2 size={16} aria-hidden="true" />
                    </button>
                    <button type="button" onClick={() => remove(item)} aria-label={`Delete ${item.filename}`} className="flex size-9 items-center justify-center rounded-sm text-fg-brand hover:bg-brand-subtle">
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {usage && (
        <Modal title="Where this image is used" onClose={() => setUsage(null)}>
          <div className="flex flex-col gap-4">
            <SmartImage src={usage.item.url} alt={usage.item.alt} className="max-h-48 w-full rounded-sm object-cover" />
            {usage.places.length ? (
              <ul className="flex list-disc flex-col gap-1 ps-5 text-body-s text-fg">
                {usage.places.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            ) : (
              <p className="text-body-s text-fg-muted">Not used anywhere — it’s safe to delete.</p>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
