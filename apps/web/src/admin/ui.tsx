import { AlertTriangle, ArrowDown, ArrowLeft, ArrowUp, Check, CheckCircle2, ImagePlus, Link2, Plus, Search, Trash2, Upload, X, XCircle } from 'lucide-react';
import {
  createContext,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  useCallback,
  useContext,
  useId,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Icon, ICON_NAMES } from '../components/Icon';
import { Button, SmartImage, Spinner } from '../components/ui';
import { cx } from '../lib/format';
import { useBodyLock, useFocusTrap, useOnClickOutside } from '../lib/hooks';
import { type MediaItem, moveItem, uploadFiles, useAdminApi } from './api';

/* ─── Layout pieces ────────────────────────────────────────────────────────── */

export function AdminPageHeader({ title, description, actions, back }: { title: string; description?: string; actions?: ReactNode; back?: { to: string; label: string } }) {
  return (
    <div className="flex flex-col gap-4 pb-8 md:flex-row md:items-end md:justify-between">
      <div className="flex flex-col gap-2">
        {back && (
          <Link to={back.to} className="inline-flex w-fit items-center gap-1.5 text-meta text-fg-muted hover:text-fg">
            <ArrowLeft size={14} className="rtl:-scale-x-100" aria-hidden="true" /> {back.label}
          </Link>
        )}
        <h1 className="text-h2 text-fg">{title}</h1>
        {description && <p className="max-w-2xl text-body-s text-fg-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, description, actions, children, className }: { title?: string; description?: string; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx('rounded-md border border-line bg-surface', className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
          <div>
            {title && <h2 className="text-label text-fg">{title}</h2>}
            {description && <p className="text-meta text-fg-subtle">{description}</p>}
          </div>
          {actions}
        </header>
      )}
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}

/* ─── Form controls (Figma “Input”) ───────────────────────────────────────── */

const controlClass =
  'w-full rounded-md border border-line bg-surface px-3.5 text-body-s text-fg outline-none transition-colors placeholder:text-fg-subtle focus:border-fg disabled:opacity-60';

export function Field({ label, hint, error, children, className, htmlFor }: { label: string; hint?: string; error?: string; children: ReactNode; className?: string; htmlFor?: string }) {
  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      <label htmlFor={htmlFor} className="text-meta font-semibold text-fg">
        {label}
      </label>
      {children}
      {error ? <p role="alert" className="text-meta text-red-600 dark:text-red-400">{error}</p> : hint ? <p className="text-meta text-fg-subtle">{hint}</p> : null}
    </div>
  );
}

export function TextInput({ label, hint, error, className, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string }) {
  const id = useId();
  return (
    <Field label={label} hint={hint} error={error} className={className} htmlFor={props.id ?? id}>
      <input id={props.id ?? id} className={cx(controlClass, 'h-11', error && 'border-red-500')} aria-invalid={!!error} {...props} />
    </Field>
  );
}

export function TextArea({ label, hint, error, className, rows = 4, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; hint?: string; error?: string }) {
  const id = useId();
  return (
    <Field label={label} hint={hint} error={error} className={className} htmlFor={props.id ?? id}>
      <textarea id={props.id ?? id} rows={rows} className={cx(controlClass, 'resize-y py-2.5', error && 'border-red-500')} aria-invalid={!!error} {...props} />
    </Field>
  );
}

export function SelectInput({ label, hint, error, className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { label: string; hint?: string; error?: string }) {
  const id = useId();
  return (
    <Field label={label} hint={hint} error={error} className={className} htmlFor={props.id ?? id}>
      <select id={props.id ?? id} className={cx(controlClass, 'h-11', error && 'border-red-500')} aria-invalid={!!error} {...props}>
        {children}
      </select>
    </Field>
  );
}

/** Figma “Toggle” (Off / On). */
export function Toggle({ checked, onChange, label, description, disabled }: { checked: boolean; onChange: (v: boolean) => void; label?: string; description?: string; disabled?: boolean }) {
  return (
    <label className={cx('flex items-center justify-between gap-4', disabled ? 'opacity-60' : 'cursor-pointer')}>
      {label && (
        <span className="flex flex-col">
          <span className="text-body-s text-fg">{label}</span>
          {description && <span className="text-meta text-fg-subtle">{description}</span>}
        </span>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cx('relative h-[30px] w-[52px] shrink-0 rounded-full transition-colors duration-200', checked ? 'bg-brand' : 'bg-muted ring-1 ring-inset ring-line-strong')}
      >
        <span className={cx('absolute top-[3px] size-6 rounded-full bg-ink-0 shadow-sm transition-[inset-inline-start] duration-200', checked ? 'start-[25px]' : 'start-[3px]')} />
      </button>
    </label>
  );
}

export function StatusPill({ tone, children }: { tone: 'green' | 'red' | 'amber' | 'gray' | 'blue'; children: ReactNode }) {
  const tones = {
    green: 'bg-accent-subtle text-fg-accent',
    red: 'bg-brand-subtle text-fg-brand',
    amber: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
    gray: 'bg-muted text-fg-muted',
    blue: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300',
  };
  return <span className={cx('inline-flex items-center rounded-full px-2.5 py-1 text-meta font-semibold', tones[tone])}>{children}</span>;
}

export function RowActions({ index, length, onMove, onRemove }: { index: number; length: number; onMove: (to: number) => void; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-1">
      <button type="button" onClick={() => onMove(index - 1)} disabled={index === 0} aria-label="Move up" className="flex size-9 items-center justify-center rounded-sm text-fg-muted hover:bg-muted disabled:opacity-30">
        <ArrowUp size={16} aria-hidden="true" />
      </button>
      <button type="button" onClick={() => onMove(index + 1)} disabled={index === length - 1} aria-label="Move down" className="flex size-9 items-center justify-center rounded-sm text-fg-muted hover:bg-muted disabled:opacity-30">
        <ArrowDown size={16} aria-hidden="true" />
      </button>
      <button type="button" onClick={onRemove} aria-label="Remove" className="flex size-9 items-center justify-center rounded-sm text-fg-brand hover:bg-brand-subtle">
        <Trash2 size={16} aria-hidden="true" />
      </button>
    </div>
  );
}

export function StringListEditor({ items, onChange, placeholder = 'Add an item', label }: { items: string[]; onChange: (items: string[]) => void; placeholder?: string; label?: string }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    if (!draft.trim()) return;
    onChange([...items, draft.trim()]);
    setDraft('');
  };
  return (
    <div className="flex flex-col gap-2">
      {label && <p className="text-meta font-semibold text-fg">{label}</p>}
      <ul className="flex flex-col gap-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-2">
            <input value={item} onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))} className={cx(controlClass, 'h-10 flex-1')} aria-label={`${label ?? 'Item'} ${i + 1}`} />
            <RowActions index={i} length={items.length} onMove={(to) => onChange(moveItem(items, i, to))} onRemove={() => onChange(items.filter((_, j) => j !== i))} />
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())} placeholder={placeholder} className={cx(controlClass, 'h-10 flex-1')} />
        <Button type="button" size="sm" variant="secondary" onClick={add}>
          <Plus size={16} aria-hidden="true" /> Add
        </Button>
      </div>
    </div>
  );
}

export function IconPicker({ value, onChange, label = 'Icon' }: { value: string; onChange: (v: string) => void; label?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOnClickOutside(ref, () => setOpen(false), open);
  return (
    <div ref={ref} className="relative flex flex-col gap-1.5" onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}>
      <p className="text-meta font-semibold text-fg">{label}</p>
      <button type="button" onClick={() => setOpen((v) => !v)} className={cx(controlClass, 'flex h-11 items-center gap-2')} aria-expanded={open}>
        <Icon name={value} size={18} /> <span className="truncate">{value || 'Choose'}</span>
      </button>
      {open && (
        <div className="absolute top-full z-20 mt-2 grid max-h-64 w-72 grid-cols-6 gap-1 overflow-y-auto rounded-md border border-line bg-surface p-2 shadow-lg">
          {ICON_NAMES.map((name) => (
            <button
              key={name}
              type="button"
              title={name}
              aria-label={name}
              onClick={() => {
                onChange(name);
                setOpen(false);
              }}
              className={cx('flex size-10 items-center justify-center rounded-sm', value === name ? 'bg-brand text-ink-0' : 'text-fg hover:bg-muted')}
            >
              <Icon name={name} size={18} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Modal, confirm dialog, toasts ────────────────────────────────────────── */

export function Modal({ title, onClose, children, footer, size = 'md' }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; size?: 'md' | 'lg' | 'xl' }) {
  const ref = useRef<HTMLDivElement>(null);
  useBodyLock(true);
  useFocusTrap(ref, true, onClose);
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-ink-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-6" onMouseDown={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
        className={cx('flex max-h-[92vh] w-full flex-col rounded-t-lg bg-surface shadow-lg sm:rounded-lg', size === 'md' && 'sm:max-w-lg', size === 'lg' && 'sm:max-w-3xl', size === 'xl' && 'sm:max-w-6xl')}
      >
        <header className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-h4 text-fg">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="flex size-10 items-center justify-center rounded-full hover:bg-muted">
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {footer && <footer className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-4">{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}

interface ConfirmOptions {
  title: string;
  body?: ReactNode;
  confirmLabel?: string;
  tone?: 'danger' | 'default';
}

interface FeedbackContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  toast: (message: string, tone?: 'success' | 'error') => void;
}

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);
  const [toasts, setToasts] = useState<{ id: number; message: string; tone: 'success' | 'error' }[]>([]);

  const confirm = useCallback((options: ConfirmOptions) => new Promise<boolean>((resolve) => setDialog({ ...options, resolve })), []);
  const toast = useCallback((message: string, tone: 'success' | 'error' = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((list) => [...list, { id, message, tone }]);
    window.setTimeout(() => setToasts((list) => list.filter((x) => x.id !== id)), tone === 'error' ? 7000 : 3500);
  }, []);

  const close = (value: boolean) => {
    dialog?.resolve(value);
    setDialog(null);
  };

  return (
    <FeedbackContext.Provider value={{ confirm, toast }}>
      {children}
      {dialog && (
        <Modal
          title={dialog.title}
          onClose={() => close(false)}
          footer={
            <>
              <Button variant="secondary" size="sm" onClick={() => close(false)}>
                Cancel
              </Button>
              <Button variant={dialog.tone === 'danger' ? 'danger' : 'primary'} size="sm" onClick={() => close(true)} autoFocus>
                {dialog.confirmLabel ?? 'Confirm'}
              </Button>
            </>
          }
        >
          <div className="flex gap-4">
            {dialog.tone === 'danger' && (
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-subtle text-fg-brand">
                <AlertTriangle size={20} aria-hidden="true" />
              </span>
            )}
            <div className="text-body-s text-fg-muted">{dialog.body}</div>
          </div>
        </Modal>
      )}
      {createPortal(
        <div className="fixed bottom-4 end-4 z-[110] flex w-[min(380px,calc(100%-2rem))] flex-col gap-2" aria-live="polite">
          {toasts.map((t) => (
            <div key={t.id} role={t.tone === 'error' ? 'alert' : 'status'} className={cx('flex items-start gap-3 rounded-md border px-4 py-3 text-body-s shadow-lg animate-fade-up', t.tone === 'error' ? 'border-red-300 bg-red-50 text-red-800' : 'border-line bg-surface text-fg')}>
              {t.tone === 'error' ? <XCircle size={18} className="mt-0.5 shrink-0" aria-hidden="true" /> : <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-fg-accent" aria-hidden="true" />}
              {t.message}
            </div>
          ))}
        </div>,
        document.body,
      )}
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error('useFeedback must be used inside FeedbackProvider');
  return ctx;
}

/* ─── Media ───────────────────────────────────────────────────────────────── */

export function MediaPicker({ onClose, onSelect, multiple = false }: { onClose: () => void; onSelect: (items: { url: string; alt: string }[]) => void; multiple?: boolean }) {
  const [query, setQuery] = useState('');
  const { data, loading, reload } = useAdminApi<MediaItem[]>(`/admin/media${query ? `?q=${encodeURIComponent(query)}` : ''}`);
  const [chosen, setChosen] = useState<MediaItem[]>([]);
  const [url, setUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const { toast } = useFeedback();
  const fileRef = useRef<HTMLInputElement>(null);

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const items = await uploadFiles(Array.from(files));
      toast(`${items.length} image${items.length === 1 ? '' : 's'} uploaded and optimised`);
      reload();
      setChosen((c) => (multiple ? [...c, ...items] : items.slice(0, 1)));
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setUploading(false);
    }
  };

  const toggle = (item: MediaItem) =>
    setChosen((current) => (current.some((c) => c.id === item.id) ? current.filter((c) => c.id !== item.id) : multiple ? [...current, item] : [item]));

  return (
    <Modal
      title="Media library"
      size="xl"
      onClose={onClose}
      footer={
        <>
          <p className="me-auto self-center text-meta text-fg-subtle">{chosen.length ? `${chosen.length} selected` : 'Pick an image, upload a new one or paste an https:// link'}</p>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" disabled={!chosen.length} onClick={() => onSelect(chosen.map((c) => ({ url: c.url, alt: c.alt })))}>
            <Check size={16} aria-hidden="true" /> Use {multiple && chosen.length > 1 ? `${chosen.length} images` : 'image'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-fg-subtle" aria-hidden="true" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by file name or alt text" className={cx(controlClass, 'h-11 ps-9')} />
          </div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/gif" multiple className="hidden" onChange={(e) => upload(e.target.files)} />
          <Button size="sm" variant="dark" loading={uploading} onClick={() => fileRef.current?.click()}>
            <Upload size={16} aria-hidden="true" /> Upload images
          </Button>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Link2 size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-fg-subtle" aria-hidden="true" />
            <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://images.unsplash.com/…" className={cx(controlClass, 'h-11 ps-9')} />
          </div>
          <Button size="sm" variant="secondary" disabled={!/^https:\/\/\S+$/.test(url)} onClick={() => onSelect([{ url, alt: '' }])}>
            Use link
          </Button>
        </div>
        {loading && !data ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : data?.length ? (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {data.map((item) => {
              const selected = chosen.some((c) => c.id === item.id);
              return (
                <li key={item.id}>
                  <button type="button" onClick={() => toggle(item)} aria-pressed={selected} className={cx('relative block w-full overflow-hidden rounded-sm border-2', selected ? 'border-red-500' : 'border-transparent')}>
                    <SmartImage src={item.url} alt={item.alt} className="aspect-square w-full object-cover" />
                    {selected && (
                      <span className="absolute end-2 top-2 flex size-6 items-center justify-center rounded-full bg-red-500 text-ink-0">
                        <Check size={14} aria-hidden="true" />
                      </span>
                    )}
                  </button>
                  <p className="mt-1 truncate text-meta text-fg-subtle">{item.filename}</p>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="rounded-md border border-dashed border-line-strong p-10 text-center text-body-s text-fg-muted">No images yet — upload your first one.</p>
        )}
      </div>
    </Modal>
  );
}

export function ImageField({ label, value, onChange, hint }: { label: string; value: string | null | undefined; onChange: (url: string) => void; hint?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-meta font-semibold text-fg">{label}</p>
      <div className="flex items-center gap-3">
        <div className="relative size-24 shrink-0 overflow-hidden rounded-sm border border-line bg-subtle">
          {value ? <SmartImage src={value} alt="" className="size-full object-cover" /> : <ImagePlus size={24} className="absolute inset-0 m-auto text-fg-subtle" aria-hidden="true" />}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <input value={value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder="/uploads/… or https://…" className={cx(controlClass, 'h-10')} aria-label={`${label} URL`} />
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="secondary" onClick={() => setOpen(true)}>
              <ImagePlus size={16} aria-hidden="true" /> Choose
            </Button>
            {value && (
              <Button type="button" size="sm" variant="ghost" onClick={() => onChange('')}>
                Remove
              </Button>
            )}
          </div>
        </div>
      </div>
      {hint && <p className="text-meta text-fg-subtle">{hint}</p>}
      {open && (
        <MediaPicker
          onClose={() => setOpen(false)}
          onSelect={(items) => {
            onChange(items[0]?.url ?? '');
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}
