import { ImagePlus, Star, Upload } from 'lucide-react';
import { type DragEvent, useRef, useState } from 'react';
import { Button, SmartImage } from '../../components/ui';
import { cx } from '../../lib/format';
import { moveItem, uploadFiles } from '../api';
import { MediaPicker, RowActions, useFeedback } from '../ui';
import { type PhotoForm, uid } from './model';

/** Trip photo gallery: upload (drag & drop), pick from the library, reorder, alt text and cover. */
export function PhotosEditor({ photos, coverImage, onPhotos, onCover }: { photos: PhotoForm[]; coverImage: string; onPhotos: (p: PhotoForm[]) => void; onCover: (url: string) => void }) {
  const [picker, setPicker] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useFeedback();
  const cover = coverImage || photos[0]?.url;

  const addItems = (items: { url: string; alt: string }[]) => onPhotos([...photos, ...items.map((i) => ({ key: uid(), url: i.url, alt: i.alt }))]);

  const upload = async (files: File[]) => {
    const images = files.filter((f) => f.type.startsWith('image/'));
    if (!images.length) return;
    setUploading(true);
    try {
      const saved = await uploadFiles(images);
      addItems(saved);
      toast(`${saved.length} photo${saved.length === 1 ? '' : 's'} uploaded`);
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    void upload(Array.from(e.dataTransfer.files));
  };

  return (
    <div className="flex flex-col gap-5">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cx('flex flex-col items-center gap-3 rounded-md border-2 border-dashed p-8 text-center transition-colors', dragging ? 'border-red-500 bg-brand-subtle' : 'border-line-strong bg-subtle')}
      >
        <Upload size={28} className="text-fg-subtle" aria-hidden="true" />
        <p className="text-body-s text-fg-muted">Drag photos here — they are resized and converted to WebP automatically.</p>
        <div className="flex flex-wrap justify-center gap-2">
          <input ref={fileRef} type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif,image/gif" className="hidden" onChange={(e) => e.target.files && upload(Array.from(e.target.files))} />
          <Button type="button" size="sm" variant="dark" loading={uploading} onClick={() => fileRef.current?.click()}>
            <Upload size={16} aria-hidden="true" /> Upload from computer
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={() => setPicker(true)}>
            <ImagePlus size={16} aria-hidden="true" /> Choose from library
          </Button>
        </div>
      </div>

      {photos.length > 0 ? (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {photos.map((photo, index) => {
            const isCover = photo.url === cover;
            return (
              <li key={photo.key} className={cx('flex flex-col overflow-hidden rounded-md border bg-surface', isCover ? 'border-red-500' : 'border-line')}>
                <div className="relative">
                  <SmartImage src={photo.url} alt={photo.alt} className="aspect-[4/3] w-full object-cover" />
                  <span className="absolute start-2 top-2 rounded-full bg-ink-950/70 px-2 py-0.5 text-meta text-ink-0">#{index + 1}</span>
                  {isCover && <span className="absolute end-2 top-2 rounded-full bg-red-500 px-2 py-0.5 text-meta font-semibold text-ink-0">Cover</span>}
                </div>
                <div className="flex flex-col gap-2 p-3">
                  <input
                    value={photo.alt}
                    onChange={(e) => onPhotos(photos.map((p) => (p.key === photo.key ? { ...p, alt: e.target.value } : p)))}
                    placeholder="Describe the photo (for accessibility & SEO)"
                    maxLength={200}
                    aria-label={`Alt text for photo ${index + 1}`}
                    className="h-10 rounded-sm border border-line bg-surface px-3 text-body-s text-fg outline-none focus:border-fg"
                  />
                  <div className="flex items-center justify-between gap-2">
                    <button type="button" disabled={isCover} onClick={() => onCover(photo.url)} className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-meta font-semibold text-fg hover:bg-muted disabled:text-fg-brand">
                      <Star size={14} className={isCover ? 'fill-current' : ''} aria-hidden="true" /> {isCover ? 'Cover photo' : 'Set as cover'}
                    </button>
                    <RowActions
                      index={index}
                      length={photos.length}
                      onMove={(to) => onPhotos(moveItem(photos, index, to))}
                      onRemove={() => {
                        onPhotos(photos.filter((p) => p.key !== photo.key));
                        if (coverImage === photo.url) onCover('');
                      }}
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-body-s text-fg-subtle">No photos yet. Trips with 4 or more photos show the hover photo strip on destination cards.</p>
      )}

      {picker && (
        <MediaPicker
          multiple
          onClose={() => setPicker(false)}
          onSelect={(items) => {
            addItems(items);
            setPicker(false);
          }}
        />
      )}
    </div>
  );
}
