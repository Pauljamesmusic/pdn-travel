import { MessageCircle } from 'lucide-react';
import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { cx, waLink } from '../../lib/format';
import { useI18n } from '../../lib/i18n';
import { SearchProvider } from '../search/SearchOverlay';
import { useSite } from '../SiteContext';
import { CustomCursor } from './CustomCursor';
import { SiteFooter } from './SiteFooter';
import { SiteNav } from './SiteNav';

export function PublicLayout() {
  const { t } = useI18n();
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const el = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [location.pathname, location.hash]);

  return (
    <SearchProvider>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-brand focus:px-5 focus:py-3 focus:text-label focus:text-ink-0"
      >
        {t('nav.skip')}
      </a>
      <SiteNav />
      <main id="main" tabIndex={-1} className="outline-none">
        <Outlet />
      </main>
      <SiteFooter />
      <WhatsAppButton />
      <CustomCursor />
    </SearchProvider>
  );
}

function WhatsAppButton() {
  const { site } = useSite();
  const { t } = useI18n();
  const location = useLocation();
  const onTrip = location.pathname.startsWith('/tours/');
  const pageName = document.title.split('|')[0].trim();
  const message = onTrip ? `Hi PDN Travel, I'm interested in ${pageName}.` : 'Hi PDN Travel, I would like help planning a trip.';

  return (
    <a
      href={waLink(site.whatsapp, message)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t('contact.whatsapp')}
      className={cx(
        'group fixed bottom-5 end-5 z-40 flex size-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform duration-200 hover:scale-105 [padding-bottom:env(safe-area-inset-bottom)]',
        onTrip ? 'max-lg:bottom-24' : 'max-lg:bottom-6',
      )}
    >
      <span className="absolute inset-0 rounded-full bg-[#25D366] opacity-40 animate-pulse-ring" aria-hidden="true" />
      <MessageCircle size={26} className="relative" aria-hidden="true" />
    </a>
  );
}
