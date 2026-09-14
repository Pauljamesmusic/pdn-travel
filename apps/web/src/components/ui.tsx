import { ArrowRight, ImageOff, Loader2, Star } from 'lucide-react';
import { type ButtonHTMLAttributes, type ImgHTMLAttributes, type ReactNode, forwardRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { cx, isExternal, safeHref } from '../lib/format';

/* ─── Buttons (Figma: Button · Primary / Secondary / Dark / Hover) ─────────── */

type Variant = 'primary' | 'secondary' | 'dark' | 'glass' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

const base =
  'inline-flex items-center justify-center gap-2.5 rounded-full text-label whitespace-nowrap transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-out select-none disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]';

/** A plain `hidden` in className must beat the base `inline-flex` (both set display, and Tailwind emits inline-flex later). */
const baseFor = (className?: string) => (className && /(^|\s)hidden(\s|$)/.test(className) ? base.replace('inline-flex ', '') : base);

const variants: Record<Variant, string> = {
  primary: 'bg-brand text-ink-0 hover:bg-red-700 dark:hover:bg-red-600 shadow-sm',
  secondary: 'border-[1.5px] border-line-strong text-fg hover:border-fg hover:bg-subtle',
  dark: 'bg-inverse text-fg-inverse hover:opacity-90',
  glass: 'border-[1.5px] border-white/40 text-ink-0 hover:bg-white/10 hover:border-white/70',
  ghost: 'text-fg hover:bg-muted',
  danger: 'bg-red-600 text-ink-0 hover:bg-red-700',
};

const sizes: Record<Size, string> = {
  md: 'min-h-[52px] ps-7 pe-6 py-3',
  sm: 'min-h-10 px-4 py-2 text-body-s font-semibold',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: boolean;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', icon = false, loading = false, className, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cx(baseFor(className), variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Loader2 size={18} className="animate-spin" aria-hidden="true" />}
      {children}
      {icon && !loading && <ArrowRight size={18} className="rtl:-scale-x-100" aria-hidden="true" />}
    </button>
  );
});

interface ButtonLinkProps {
  to: string;
  variant?: Variant;
  size?: Size;
  icon?: boolean;
  className?: string;
  children: ReactNode;
  onClick?: () => void;
}

export function ButtonLink({ to, variant = 'primary', size = 'md', icon = false, className, children, onClick }: ButtonLinkProps) {
  const classes = cx(baseFor(className), variants[variant], sizes[size], className);
  const content = (
    <>
      {children}
      {icon && <ArrowRight size={18} className="rtl:-scale-x-100" aria-hidden="true" />}
    </>
  );
  const href = safeHref(to) ?? '/';
  if (isExternal(href) || href.startsWith('mailto:') || href.startsWith('tel:')) {
    return (
      <a href={href} className={classes} onClick={onClick} target={isExternal(href) ? '_blank' : undefined} rel="noopener noreferrer">
        {content}
      </a>
    );
  }
  return (
    <Link to={href} className={classes} onClick={onClick}>
      {content}
    </Link>
  );
}

export function IconButton({
  label,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx(
        'inline-flex size-11 shrink-0 items-center justify-center rounded-full transition-colors duration-200',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/* ─── Text ────────────────────────────────────────────────────────────────── */

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cx('text-caps text-fg-accent', className)}>{children}</p>;
}

/** Serif headline with an italic brand-coloured accent word, as used across the Figma landing page. */
export function AccentTitle({
  lead,
  accent,
  tail,
  as: Tag = 'h2',
  className,
  accentClassName = 'text-fg-brand',
}: {
  lead?: string;
  accent?: string;
  tail?: string;
  as?: 'h1' | 'h2' | 'h3';
  className?: string;
  accentClassName?: string;
}) {
  return (
    <Tag className={cx('text-balance', className)}>
      {lead}
      {accent && (
        <>
          {lead ? ' ' : ''}
          <em className={cx('font-serif italic', accentClassName)}>{accent}</em>
        </>
      )}
      {tail ? ` ${tail}` : ''}
    </Tag>
  );
}

export function SectionHeader({
  eyebrow,
  lead,
  accent,
  tail,
  body,
  action,
  className,
}: {
  eyebrow?: string;
  lead?: string;
  accent?: string;
  tail?: string;
  body?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx('flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between', className)}>
      <div className="flex max-w-xl flex-col gap-3 reveal">
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <AccentTitle lead={lead} accent={accent} tail={tail} className="text-h1 text-fg" />
      </div>
      {(body || action) && (
        <div className="flex max-w-md flex-col items-start gap-4 reveal" style={{ ['--reveal-delay' as string]: '80ms' }}>
          {body && <p className="text-body-m text-fg-muted">{body}</p>}
          {action}
        </div>
      )}
    </div>
  );
}

export function UnderlineLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="group inline-flex flex-col gap-3 text-label text-fg">
      <span className="inline-flex items-center gap-2">
        {children}
        <ArrowRight size={18} className="transition-transform duration-200 group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1" />
      </span>
      <span className="h-0.5 w-full origin-left bg-red-500 transition-transform duration-300 group-hover:scale-x-110 rtl:origin-right" />
    </Link>
  );
}

/* ─── Small pieces ────────────────────────────────────────────────────────── */

export function Badge({ children, tone = 'brand', className }: { children: ReactNode; tone?: 'brand' | 'accent' | 'neutral' | 'solid'; className?: string }) {
  const tones = {
    brand: 'bg-brand-subtle text-fg-brand',
    accent: 'bg-accent-subtle text-fg-accent',
    neutral: 'bg-muted text-fg-muted',
    solid: 'bg-brand text-ink-0',
  };
  return <span className={cx('inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-meta', tones[tone], className)}>{children}</span>;
}

export function Chip({
  active,
  children,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cx(
        'inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-label transition-colors duration-200',
        active ? 'border-inverse bg-inverse text-fg-inverse' : 'border-line bg-surface text-fg hover:border-line-strong',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Stars({ rating, size = 14, className }: { rating: number; size?: number; className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-0.5', className)} aria-label={`${rating} out of 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          size={size}
          aria-hidden="true"
          className={i < Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-line-strong'}
        />
      ))}
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('animate-pulse rounded-md bg-muted', className)} aria-hidden="true" />;
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cx('animate-spin text-fg-subtle', className)} aria-label="Loading" />;
}

/**
 * Lazy image with a branded fallback so broken or missing photos never look broken.
 * Pass `priority` for a likely-LCP image (e.g. the main photo above the fold) so it loads
 * eagerly and at high priority instead of lazily like every other card/gallery thumbnail.
 */
export function SmartImage({
  src,
  alt,
  className,
  priority,
  ...props
}: ImgHTMLAttributes<HTMLImageElement> & { priority?: boolean }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className={cx('flex items-center justify-center bg-gradient-to-br from-red-100 via-muted to-green-100 text-fg-subtle', className)} role="img" aria-label={alt}>
        <ImageOff size={28} aria-hidden="true" />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      decoding={priority ? 'sync' : 'async'}
      fetchPriority={priority ? 'high' : undefined}
      onError={() => setFailed(true)}
      className={className}
      {...props}
    />
  );
}

export function EmptyState({ title, body, action, icon }: { title: string; body?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-line-strong bg-subtle px-6 py-14 text-center">
      {icon}
      <p className="text-h4 text-fg">{title}</p>
      {body && <p className="max-w-md text-body-s text-fg-muted">{body}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry, retryLabel = 'Try again' }: { message: string; onRetry?: () => void; retryLabel?: string }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-4 rounded-lg bg-brand-subtle px-6 py-10 text-center">
      <p className="text-body-m text-fg-brand">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    </div>
  );
}

/** Renders plain text with paragraphs and “- ” bullet lines. Never injects HTML. */
export function RichText({ text, className }: { text?: string | null; className?: string }) {
  if (!text) return null;
  const blocks = text.split(/\n{2,}/);
  return (
    <div className={cx('flex flex-col gap-4', className)}>
      {blocks.map((block, i) => {
        const lines = block.split('\n');
        if (lines.every((l) => /^\s*[-•]\s+/.test(l))) {
          return (
            <ul key={i} className="flex list-disc flex-col gap-2 ps-5 marker:text-fg-brand">
              {lines.map((l, j) => (
                <li key={j}>{l.replace(/^\s*[-•]\s+/, '')}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="whitespace-pre-line">
            {block}
          </p>
        );
      })}
    </div>
  );
}
