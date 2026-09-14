import { ArrowRight, Check, ChevronDown, Coins, Globe, Menu, Moon, Phone, Search, Sun, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { CURRENCIES, useCurrency } from '../../lib/currency';
import { cx } from '../../lib/format';
import { useBodyLock, useFocusTrap, useOnClickOutside, useScrolled } from '../../lib/hooks';
import { LANGUAGES, useI18n } from '../../lib/i18n';
import { useTheme } from '../../lib/theme';
import { useSearch } from '../search/SearchOverlay';
import { useSite } from '../SiteContext';
import { ButtonLink } from '../ui';

const MAIN_LINKS = [
  { to: '/', key: 'nav.home', end: true },
  { to: '/destinations', key: 'nav.destinations' },
  { to: '/tours', key: 'nav.tours' },
  { to: '/activities', key: 'nav.activities' },
  { to: '/testimonials', key: 'nav.testimonials' },
] as const;

/**
 * Figma “Nav Bar”: transparent over the dark hero (State=Top, 88px) and
 * bg/surface + Shadow/MD + bottom border once scrolled (State=Scrolled, 72px), 200ms ease-out.
 */
export function SiteNav() {
  const { t } = useI18n();
  const { site, supportPages } = useSite();
  const { open: openSearch } = useSearch();
  const scrolled = useScrolled(80);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();

  useEffect(() => setDrawerOpen(false), [location.pathname]);

  const supportLinks = [...supportPages.map((p) => ({ to: `/support/${p.slug}`, label: p.title })), { to: '/contact', label: t('nav.contact') }];
  const supportActive = location.pathname.startsWith('/support') || location.pathname === '/contact';

  return (
    <>
      <header
        data-theme={scrolled ? undefined : 'dark'}
        className={cx(
          'fixed inset-x-0 top-0 z-50 transition-[background-color,box-shadow,height,border-color] duration-200 ease-out',
          scrolled ? 'h-[72px] border-b border-line bg-surface/95 shadow-md backdrop-blur-md' : 'h-[72px] border-b border-white/10 bg-transparent lg:h-[88px]',
        )}
      >
        <nav className="container-pdn flex h-full items-center justify-between gap-4" aria-label="Primary">
          <Link to="/" className="flex shrink-0 items-center" aria-label={`${site.brandName} — ${t('nav.home')}`}>
            <img src="/brand/pdn-logo-light.png" alt="" className={cx('h-10 w-auto lg:h-12', scrolled && 'hidden dark:block')} width={130} height={48} />
            <img src="/brand/pdn-logo-dark.png" alt="" className={cx('h-10 w-auto lg:h-12', scrolled ? 'block dark:hidden' : 'hidden')} width={130} height={48} />
          </Link>

          <ul className="hidden items-center gap-7 xl:flex 2xl:gap-9">
            {MAIN_LINKS.map((link) => (
              <li key={link.to}>
                <NavLink to={link.to} end={'end' in link ? link.end : false} className="group flex flex-col items-center gap-1.5 py-2">
                  {({ isActive }) => (
                    <>
                      <span className={cx('text-body-s transition-colors', isActive ? 'font-semibold text-fg' : 'text-fg-muted group-hover:text-fg')}>{t(link.key)}</span>
                      <span className={cx('size-1 rounded-full transition-colors', isActive ? 'bg-red-500' : 'bg-transparent')} />
                    </>
                  )}
                </NavLink>
              </li>
            ))}
            <li>
              <SupportMenu label={t('nav.support')} links={supportLinks} active={supportActive} />
            </li>
          </ul>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => openSearch()}
              aria-label={t('nav.search')}
              className="flex size-11 items-center justify-center rounded-full text-fg transition-colors hover:bg-muted/60"
            >
              <Search size={20} aria-hidden="true" />
            </button>
            <div className="hidden items-center gap-2 md:flex">
              <LanguageMenu compact />
              <CurrencyMenu compact />
            </div>
            <ThemeButton className="hidden md:flex" />
            <ButtonLink to="/contact" icon className="hidden lg:inline-flex">
              {t('nav.planTrip')}
            </ButtonLink>
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label={t('nav.menu')}
              aria-expanded={drawerOpen}
              className={cx(
                'flex size-11 items-center justify-center rounded-full border backdrop-blur-md xl:hidden',
                scrolled ? 'border-line text-fg' : 'border-white/15 bg-white/10 text-ink-0',
              )}
            >
              <Menu size={20} aria-hidden="true" />
            </button>
          </div>
        </nav>
      </header>

      {drawerOpen && createPortal(<MobileDrawer onClose={() => setDrawerOpen(false)} supportLinks={supportLinks} />, document.body)}
    </>
  );
}

function SupportMenu({ label, links, active }: { label: string; links: { to: string; label: string }[]; active: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const location = useLocation();
  useOnClickOutside(ref, () => setOpen(false), open);
  useEffect(() => setOpen(false), [location.pathname]);

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((v) => !v)}
        className="group flex flex-col items-center gap-1.5 py-2"
      >
        <span className={cx('inline-flex items-center gap-1 text-body-s transition-colors', active ? 'font-semibold text-fg' : 'text-fg-muted group-hover:text-fg')}>
          {label}
          <ChevronDown size={16} className={cx('transition-transform duration-200', open && 'rotate-180')} aria-hidden="true" />
        </span>
        <span className={cx('size-1 rounded-full', active ? 'bg-red-500' : 'bg-transparent')} />
      </button>
      <div
        className={cx(
          'absolute start-1/2 top-full w-64 -translate-x-1/2 pt-2 transition-[opacity,visibility,translate] duration-200 rtl:translate-x-1/2',
          open ? 'visible translate-y-0 opacity-100' : 'invisible -translate-y-1 opacity-0',
        )}
      >
        <ul className="overflow-hidden rounded-md border border-line bg-surface p-2 shadow-lg">
          {links.map((link) => (
            <li key={link.to}>
              <NavLink
                to={link.to}
                className={({ isActive }) =>
                  cx('flex min-h-11 items-center justify-between rounded-sm px-3 text-body-s transition-colors', isActive ? 'bg-brand-subtle text-fg-brand' : 'text-fg-muted hover:bg-subtle hover:text-fg')
                }
              >
                {link.label}
                <ArrowRight size={14} className="opacity-50 rtl:-scale-x-100" aria-hidden="true" />
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function LanguageMenu({ compact = false, direction = 'down', align = 'end' }: { compact?: boolean; direction?: 'down' | 'up'; align?: 'start' | 'end' }) {
  const { lang, setLang, t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOnClickOutside(ref, () => setOpen(false), open);
  const current = LANGUAGES.find((l) => l.code === lang)!;

  return (
    <div ref={ref} className="relative" onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${t('footer.language')}: ${current.native}`}
        onClick={() => setOpen((v) => !v)}
        className={cx(
          'inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line-strong text-fg transition-colors hover:border-fg',
          compact ? 'px-3 text-meta' : 'px-4 text-body-s',
        )}
      >
        <Globe size={compact ? 14 : 16} aria-hidden="true" />
        {compact ? current.code.toUpperCase() : current.native}
        <ChevronDown size={14} className={cx('transition-transform', open && 'rotate-180')} aria-hidden="true" />
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label={t('footer.language')}
          className={cx(
            'absolute z-10 w-48 overflow-hidden rounded-md border border-line bg-surface p-1.5 shadow-lg',
            align === 'start' ? 'start-0' : 'end-0',
            direction === 'up' ? 'bottom-full mb-2' : 'top-full mt-2',
          )}
        >
          {LANGUAGES.map((l) => (
            <li key={l.code}>
              <button
                type="button"
                role="option"
                aria-selected={l.code === lang}
                lang={l.code}
                onClick={() => {
                  setLang(l.code);
                  setOpen(false);
                }}
                className={cx('flex min-h-11 w-full items-center justify-between gap-3 rounded-sm px-3 text-body-s', l.code === lang ? 'bg-brand-subtle text-fg-brand' : 'text-fg hover:bg-subtle')}
              >
                <span className="flex flex-col items-start leading-tight">
                  <span>{l.native}</span>
                  <span className="text-meta text-fg-subtle">{l.label}</span>
                </span>
                {l.code === lang && <Check size={16} aria-hidden="true" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Switches every price on the site (cards, trip pages, booking) into USD, INR, AED or NPR. */
export function CurrencyMenu({ compact = false, direction = 'down', align = 'end' }: { compact?: boolean; direction?: 'down' | 'up'; align?: 'start' | 'end' }) {
  const { currency, setCurrency } = useCurrency();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOnClickOutside(ref, () => setOpen(false), open);
  const current = CURRENCIES.find((c) => c.code === currency)!;

  return (
    <div ref={ref} className="relative" onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${t('footer.currency')}: ${current.label}`}
        onClick={() => setOpen((v) => !v)}
        className={cx(
          'inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line-strong text-fg transition-colors hover:border-fg',
          compact ? 'px-3 text-meta' : 'px-4 text-body-s',
        )}
      >
        <Coins size={compact ? 14 : 16} aria-hidden="true" />
        {current.code}
        <ChevronDown size={14} className={cx('transition-transform', open && 'rotate-180')} aria-hidden="true" />
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label={t('footer.currency')}
          className={cx(
            'absolute z-10 w-48 overflow-hidden rounded-md border border-line bg-surface p-1.5 shadow-lg',
            align === 'start' ? 'start-0' : 'end-0',
            direction === 'up' ? 'bottom-full mb-2' : 'top-full mt-2',
          )}
        >
          {CURRENCIES.map((c) => (
            <li key={c.code}>
              <button
                type="button"
                role="option"
                aria-selected={c.code === currency}
                onClick={() => {
                  setCurrency(c.code);
                  setOpen(false);
                }}
                className={cx('flex min-h-11 w-full items-center justify-between gap-3 rounded-sm px-3 text-body-s', c.code === currency ? 'bg-brand-subtle text-fg-brand' : 'text-fg hover:bg-subtle')}
              >
                <span className="flex flex-col items-start leading-tight">
                  <span>{c.code}</span>
                  <span className="text-meta text-fg-subtle">{c.label}</span>
                </span>
                {c.code === currency && <Check size={16} aria-hidden="true" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ThemeButton({ className }: { className?: string }) {
  const { resolved, toggle } = useTheme();
  const { t } = useI18n();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={t('footer.theme')}
      aria-pressed={resolved === 'dark'}
      className={cx('size-11 items-center justify-center rounded-full border border-line-strong text-fg transition-colors hover:border-fg', className ?? 'flex')}
    >
      {resolved === 'dark' ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
    </button>
  );
}

function MobileDrawer({ onClose, supportLinks }: { onClose: () => void; supportLinks: { to: string; label: string }[] }) {
  const { t } = useI18n();
  const { site } = useSite();
  const { open: openSearch } = useSearch();
  const ref = useRef<HTMLDivElement>(null);
  useBodyLock(true);
  useFocusTrap(ref, true, onClose);

  return (
    <div className="fixed inset-0 z-[70] xl:hidden">
      <button type="button" tabIndex={-1} aria-label={t('nav.close')} className="absolute inset-0 bg-ink-950/60 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={t('nav.menu')}
        className="absolute inset-y-0 end-0 flex w-[min(380px,100%)] flex-col overflow-y-auto bg-surface shadow-lg animate-[fade-up_.25s_var(--ease-out-soft)]"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <img src="/brand/pdn-logo-dark.png" alt={site.brandName} className="h-9 w-auto dark:hidden" />
          <img src="/brand/pdn-logo-light.png" alt={site.brandName} className="hidden h-9 w-auto dark:block" />
          <button type="button" onClick={onClose} aria-label={t('nav.close')} className="flex size-11 items-center justify-center rounded-full border border-line text-fg">
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-6 p-5">
          <button
            type="button"
            onClick={() => {
              onClose();
              openSearch();
            }}
            className="flex min-h-12 items-center gap-3 rounded-full border border-line bg-subtle px-4 text-body-s text-fg-subtle"
          >
            <Search size={18} aria-hidden="true" /> {t('search.placeholder')}
          </button>

          <ul className="flex flex-col">
            {MAIN_LINKS.map((link) => (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  end={'end' in link ? link.end : false}
                  className={({ isActive }) => cx('flex min-h-12 items-center border-b border-line text-h4', isActive ? 'text-fg-brand' : 'text-fg')}
                >
                  {t(link.key)}
                </NavLink>
              </li>
            ))}
          </ul>

          <div>
            <p className="pb-2 text-caps text-fg-subtle">{t('nav.support')}</p>
            <ul className="grid grid-cols-1 gap-1">
              {supportLinks.map((link) => (
                <li key={link.to}>
                  <NavLink to={link.to} className={({ isActive }) => cx('flex min-h-11 items-center rounded-sm px-3 text-body-s', isActive ? 'bg-brand-subtle text-fg-brand' : 'text-fg-muted hover:bg-subtle')}>
                    {link.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <LanguageMenu direction="up" align="start" />
            <CurrencyMenu direction="up" align="start" />
            <ThemeButton />
          </div>

          <div className="mt-auto flex flex-col gap-3">
            <ButtonLink to="/contact" icon onClick={onClose}>
              {t('nav.planTrip')}
            </ButtonLink>
            <a href={`tel:${site.phone.replace(/\s/g, '')}`} className="flex min-h-11 items-center justify-center gap-2 text-body-s text-fg-muted">
              <Phone size={16} aria-hidden="true" />
              <span dir="ltr">{site.phone}</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
