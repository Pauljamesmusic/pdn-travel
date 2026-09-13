import { ChevronLeft, ChevronRight, Images, X } from 'lucide-react';
import { type TouchEvent, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cx } from '../../lib/format';
import { useBodyLock, useFocusTrap } from '../../lib/hooks';
import { useI18n } from '../../lib/i18n';
import { SmartImage } from '../ui';

interface Photo {
  url: string;
  alt: string;
}

const sized = (url: string, w: number) => (url.includes('images.unsplash.com') ? url.replace(/w=\d+/, `w=${w}`) : url);

/** Desktop: 1 large + 4 small with “View all photos”. Mobile: swipe carousel with dots. Both open a lightbox. */
export function PhotoGallery({ photos, title }: { photos: Photo[]; title: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState<number | null>(null);
  const [slide, setSlide] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  const launch = (index: number, el: HTMLElement) => {
    openerRef.current = el;
    setOpen(index);
  };

  const close = useCallback(() => {
    setOpen(null);
    window.setTimeout(() => openerRef.current?.focus(), 30);
  }, []);

  if (!photos.length) return null;

  return (
    <>
      <div className="relative hidden h-[460px] grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-lg md:grid lg:h-[520px]">
        {photos.slice(0, 5).map((photo, i) => (
          <button
            key={photo.url + i}
            type="button"
            onClick={(e) => launch(i, e.currentTarget)}
            className={cx('group relative overflow-hidden bg-muted', i === 0 && 'col-span-2 row-span-2', photos.length === 1 && 'col-span-4', photos.length === 2 && i === 1 && 'col-span-2 row-span-2')}
            aria-label={t('trip.photoOf', { n: i + 1, total: photos.length })}
          >
            <SmartImage src={sized(photo.url, i === 0 ? 1600 : 800)} alt={photo.alt || title} className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
            <span className="absolute inset-0 bg-ink-950/0 transition-colors group-hover:bg-ink-950/10" aria-hidden="true" />
          </button>
        ))}
        {photos.length > 5 && (
          <button
            type="button"
            onClick={(e) => launch(0, e.currentTarget)}
            className="absolute bottom-4 end-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-surface px-4 text-label text-fg shadow-md hover:bg-subtle"
          >
            <Images size={18} aria-hidden="true" />
            {t('trip.viewAllPhotos', { count: photos.length })}
          </button>
        )}
      </div>

      <div className="md:hidden">
        <div
          ref={trackRef}
          className="-mx-5 flex snap-x snap-mandatory overflow-x-auto no-scrollbar"
          onScroll={(e) => {
            const el = e.currentTarget;
            setSlide(Math.round(Math.abs(el.scrollLeft) / el.clientWidth));
          }}
        >
          {photos.map((photo, i) => (
            <button key={photo.url + i} type="button" className="w-full shrink-0 snap-center px-5" onClick={(e) => launch(i, e.currentTarget)} aria-label={t('trip.photoOf', { n: i + 1, total: photos.length })}>
              <SmartImage src={sized(photo.url, 900)} alt={photo.alt || title} className="aspect-[4/3] w-full rounded-lg object-cover" />
            </button>
          ))}
        </div>
        <div className="mt-3 flex justify-center gap-1.5" aria-hidden="true">
          {photos.map((p, i) => (
            <span key={p.url + i} className={cx('h-1.5 rounded-full transition-all', i === slide ? 'w-5 bg-fg' : 'w-1.5 bg-line-strong')} />
          ))}
        </div>
      </div>

      {open !== null && createPortal(<Lightbox photos={photos} start={open} title={title} onClose={close} />, document.body)}
    </>
  );
}

function Lightbox({ photos, start, title, onClose }: { photos: Photo[]; start: number; title: string; onClose: () => void }) {
  const { t, dir } = useI18n();
  const [index, setIndex] = useState(start);
  const ref = useRef<HTMLDivElement>(null);
  const touchX = useRef<number | null>(null);
  useBodyLock(true);
  useFocusTrap(ref, true, onClose);

  const go = useCallback((delta: number) => setIndex((i) => (i + delta + photos.length) % photos.length), [photos.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const next = dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
      const prev = dir === 'rtl' ? 'ArrowRight' : 'ArrowLeft';
      if (e.key === next) go(1);
      if (e.key === prev) go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, dir]);

  const onTouchStart = (e: TouchEvent) => (touchX.current = e.touches[0].clientX);
  const onTouchEnd = (e: TouchEvent) => {
    if (touchX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(delta) > 50) go((delta < 0 ? 1 : -1) * (dir === 'rtl' ? -1 : 1));
    touchX.current = null;
  };

  const photo = photos[index];

  return (
    <div ref={ref} role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-[90] flex flex-col bg-ink-950/95 text-ink-0" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div className="flex items-center justify-between p-4">
        <p className="text-label tabular-nums" aria-live="polite">
          {index + 1} / {photos.length}
        </p>
        <button type="button" onClick={onClose} aria-label={t('search.close')} className="flex size-11 items-center justify-center rounded-full bg-white/10 hover:bg-white/20">
          <X size={20} aria-hidden="true" />
        </button>
      </div>
      <div className="relative flex flex-1 items-center justify-center px-4 pb-4 sm:px-20">
        <img key={photo.url} src={sized(photo.url, 2000)} alt={photo.alt || title} className="max-h-full max-w-full rounded-md object-contain animate-fade-up" />
        {photos.length > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} aria-label={t('section.prev')} className="absolute start-3 top-1/2 flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 max-sm:hidden">
              <ChevronLeft size={24} className="rtl:-scale-x-100" aria-hidden="true" />
            </button>
            <button type="button" onClick={() => go(1)} aria-label={t('section.next')} className="absolute end-3 top-1/2 flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 max-sm:hidden">
              <ChevronRight size={24} className="rtl:-scale-x-100" aria-hidden="true" />
            </button>
          </>
        )}
      </div>
      {photo.alt && <p className="px-4 pb-6 text-center text-body-s text-ink-300">{photo.alt}</p>}
    </div>
  );
}
