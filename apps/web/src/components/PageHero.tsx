import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cx } from '../lib/format';
import { useI18n } from '../lib/i18n';

const UNSPLASH_WIDTHS = [640, 1024, 1600, 2000];

/** Unsplash serves any width via its `w=` param — build a srcset so phones don't fetch the same 2000px desktop asset as desktop. Other sources (CMS uploads, local media) are left as a single `src`, unchanged. */
function unsplashSrcSet(url: string): string | undefined {
  if (!url.includes('images.unsplash.com') || !/[?&]w=\d+/.test(url)) return undefined;
  return UNSPLASH_WIDTHS.map((w) => `${url.replace(/([?&])w=\d+/, `$1w=${w}`)} ${w}w`).join(', ');
}

export interface Crumb {
  label: string;
  to?: string;
}

/** Dark, image-backed hero used by inner pages so the transparent nav always sits on a dark stage. */
export function PageHero({
  eyebrow,
  title,
  subtitle,
  image,
  crumbs = [],
  children,
  size = 'md',
}: {
  eyebrow?: string | null;
  title: ReactNode;
  subtitle?: string | null;
  image?: string | null;
  crumbs?: Crumb[];
  children?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}) {
  const { t } = useI18n();
  return (
    <section data-theme="dark" className="relative isolate overflow-hidden bg-canvas">
      {image ? (
        <img
          src={image}
          srcSet={unsplashSrcSet(image)}
          sizes="100vw"
          alt=""
          className="absolute inset-0 -z-10 size-full object-cover"
          fetchPriority="high"
        />
      ) : (
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_80%_20%,rgba(236,28,46,0.28),transparent_55%),radial-gradient(ellipse_at_10%_90%,rgba(62,142,40,0.18),transparent_50%)]" />
      )}
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(11,11,11,0.75)_0%,rgba(11,11,11,0.35)_40%,rgba(11,11,11,0.92)_100%)]" aria-hidden="true" />

      <div
        className={cx(
          'container-pdn flex flex-col gap-5',
          size === 'sm' && 'pb-12 pt-32 lg:pb-16 lg:pt-40',
          size === 'md' && 'pb-16 pt-36 lg:pb-24 lg:pt-48',
          size === 'lg' && 'pb-20 pt-40 lg:pb-32 lg:pt-56',
        )}
      >
        {crumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="animate-fade-up">
            <ol className="flex flex-wrap items-center gap-1.5 text-meta text-fg-muted">
              <li>
                <Link to="/" className="hover:text-fg">
                  {t('common.home')}
                </Link>
              </li>
              {crumbs.map((crumb, i) => (
                <li key={i} className="flex items-center gap-1.5">
                  <ChevronRight size={14} className="rtl:-scale-x-100" aria-hidden="true" />
                  {crumb.to ? (
                    <Link to={crumb.to} className="hover:text-fg">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span aria-current="page" className="text-fg">
                      {crumb.label}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}
        {eyebrow && <p className="text-caps text-red-400 animate-fade-up">{eyebrow}</p>}
        <h1 className="max-w-4xl text-display-l text-fg text-balance animate-fade-up [animation-delay:60ms]">{title}</h1>
        {subtitle && <p className="max-w-2xl text-body-l text-fg-muted animate-fade-up [animation-delay:120ms]">{subtitle}</p>}
        {children && <div className="animate-fade-up [animation-delay:180ms]">{children}</div>}
      </div>
    </section>
  );
}
