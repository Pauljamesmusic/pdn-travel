import { ArrowUp, Facebook, Instagram, Linkedin, Mail, MapPin, Phone, ShieldCheck, Twitter, Youtube } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { safeHref } from '../../lib/format';
import { useI18n } from '../../lib/i18n';
import { useSite } from '../SiteContext';
import { AccentTitle, Button } from '../ui';
import { LanguageMenu, ThemeButton } from './SiteNav';

const SOCIAL_ICONS = { facebook: Facebook, instagram: Instagram, twitter: Twitter, linkedin: Linkedin, youtube: Youtube } as const;

/** Figma “06 Footer (Dark mode)” — pinned dark in both themes. */
export function SiteFooter() {
  const { t } = useI18n();
  const { site, home, supportPages } = useSite();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');

  const subscribe = async (event: FormEvent) => {
    event.preventDefault();
    setStatus('sending');
    try {
      await api('/newsletter', { method: 'POST', json: { email } });
      setStatus('done');
      setEmail('');
    } catch (err) {
      setError((err as Error).message);
      setStatus('error');
    }
  };

  const explore = [
    { to: '/', label: t('nav.home') },
    { to: '/destinations', label: t('nav.destinations') },
    { to: '/tours', label: t('nav.tours') },
    { to: '/activities', label: t('nav.activities') },
    { to: '/testimonials', label: t('nav.testimonials') },
  ];
  const support = [...supportPages.map((p) => ({ to: `/support/${p.slug}`, label: p.title })), { to: '/contact', label: t('nav.contact') }];
  const newsletter = home?.newsletter ?? { titleLead: 'Get travel', titleAccent: 'inspiration', titleTail: 'straight to your inbox.' };

  return (
    <footer data-theme="dark" className="bg-canvas text-fg">
      {/* Extra bottom padding keeps the last row clear of the floating WhatsApp button. */}
      <div className="container-pdn flex flex-col gap-14 pb-28 pt-16 lg:pt-24">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <AccentTitle
            lead={newsletter.titleLead}
            accent={newsletter.titleAccent}
            tail={newsletter.titleTail ? `— ${newsletter.titleTail}` : undefined}
            className="max-w-md text-h2 text-fg"
            accentClassName="text-red-400"
          />
          <form onSubmit={subscribe} className="flex w-full max-w-[523px] flex-col gap-2">
            <div className="flex items-center gap-2 rounded-full border border-line bg-subtle p-1.5 ps-5">
              <Mail size={18} className="shrink-0 text-fg-subtle" aria-hidden="true" />
              <label htmlFor="newsletter-email" className="sr-only">
                {t('footer.newsletterPlaceholder')}
              </label>
              <input
                id="newsletter-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (status !== 'idle') setStatus('idle');
                }}
                placeholder={t('footer.newsletterPlaceholder')}
                className="min-w-0 flex-1 bg-transparent text-body-m text-fg outline-none placeholder:text-fg-subtle"
              />
              <Button type="submit" icon loading={status === 'sending'} className="max-sm:size-11 max-sm:min-h-11 max-sm:p-0 max-sm:[&>span]:hidden">
                <span>{t('footer.subscribe')}</span>
              </Button>
            </div>
            <p aria-live="polite" className="min-h-5 ps-5 text-meta">
              {status === 'done' && <span className="text-green-300">{t('footer.subscribed')}</span>}
              {status === 'error' && <span className="text-red-400">{error}</span>}
            </p>
          </form>
        </div>

        <div className="h-px bg-line" />

        <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.3fr] lg:gap-12">
          <div className="flex flex-col gap-5">
            <Link to="/" aria-label={site.brandName}>
              <img src="/brand/pdn-logo-light.png" alt={site.brandName} className="h-12 w-auto" loading="lazy" />
            </Link>
            <p className="max-w-[360px] text-body-s text-fg-muted">{site.footerBlurb}</p>
            <ul className="flex flex-wrap gap-2.5">
              {(Object.keys(SOCIAL_ICONS) as (keyof typeof SOCIAL_ICONS)[]).map((key) => {
                const href = safeHref(site.socials?.[key]);
                const IconCmp = SOCIAL_ICONS[key];
                const cls = 'flex size-11 items-center justify-center rounded-full border border-line-strong text-fg transition-colors';
                return (
                  <li key={key}>
                    {href ? (
                      <a href={href} target="_blank" rel="noopener noreferrer" aria-label={key} className={`${cls} hover:border-red-400 hover:text-red-400`}>
                        <IconCmp size={18} aria-hidden="true" />
                      </a>
                    ) : (
                      <span
                        aria-hidden="true"
                        title={t('footer.socialComingSoon')}
                        className={`${cls} cursor-not-allowed opacity-40 hover:border-line-strong hover:text-fg`}
                      >
                        <IconCmp size={18} />
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          <FooterColumn title={t('footer.explore')} links={explore} />
          <FooterColumn title={t('footer.support')} links={support} />

          <div className="flex flex-col gap-4">
            <p className="text-caps text-fg-subtle">{t('footer.contact')}</p>
            <p className="flex gap-3 text-body-s text-fg">
              <MapPin size={18} className="mt-0.5 shrink-0 text-red-400" aria-hidden="true" />
              {site.address}
            </p>
            <a href={`tel:${site.phone.replace(/\s/g, '')}`} className="flex gap-3 text-body-s text-fg hover:text-red-400">
              <Phone size={18} className="shrink-0 text-red-400" aria-hidden="true" />
              <span dir="ltr">{site.phone}</span>
            </a>
            <a href={`mailto:${site.email}`} className="flex gap-3 text-body-s text-fg hover:text-red-400">
              <Mail size={18} className="shrink-0 text-red-400" aria-hidden="true" />
              {site.email}
            </a>
            {site.affiliation?.label && (
              <a
                href={safeHref(site.affiliation.url)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-fit items-center gap-2.5 rounded-[12px] bg-subtle py-2 pe-3.5 ps-3 text-meta text-fg"
              >
                <ShieldCheck size={18} className="text-green-400" aria-hidden="true" />
                {site.affiliation.label}
              </a>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-6 border-t border-line pt-6 lg:flex-row lg:items-center lg:justify-between">
          <p className="text-meta text-fg-muted">{t('footer.rights', { year: new Date().getFullYear() })}</p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-meta text-fg-muted">
            <Link to="/support/terms-and-conditions" className="hover:text-fg">
              {t('footer.terms')}
            </Link>
            <Link to="/support/privacy-policy" className="hover:text-fg">
              {t('footer.privacy')}
            </Link>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <LanguageMenu direction="up" />
            <ThemeButton />
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="ms-2 inline-flex min-h-11 items-center gap-2 text-label text-fg hover:text-red-400"
            >
              {t('footer.backToTop')}
              <ArrowUp size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: { to: string; label: string }[] }) {
  return (
    <nav aria-label={title} className="flex flex-col gap-3.5">
      <p className="text-caps text-fg-subtle">{title}</p>
      <ul className="flex flex-col gap-1">
        {links.map((link) => (
          <li key={link.to}>
            <Link to={link.to} className="inline-flex min-h-9 items-center text-body-s text-fg transition-colors hover:text-red-400">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
