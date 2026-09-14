import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useApi } from '../lib/api';
import type { HomeSettings, SiteData, SiteSettings } from '../lib/types';

/** Safe defaults so the layout still renders if the API is unreachable. */
export const FALLBACK_SITE: SiteSettings = {
  brandName: 'PDN Travel',
  legalName: 'Peace Destination Nepal Pvt. Ltd.',
  tagline: 'Explore with love. Cherish our planet.',
  phone: '+971 50 717 1487',
  whatsapp: '971507171487',
  email: 'contact@pdntravel.com',
  address: 'Kathmandu Metropolitan City-32, Koteshwor, Kathmandu, Nepal',
  officeHours: 'Sunday – Friday · 9:00 – 18:00 (Nepal time)',
  footerBlurb: 'Travel is not just about reaching a destination — it’s about how you live the journey.',
  mapQuery: 'Koteshwor, Kathmandu, Nepal',
  socials: {},
  affiliation: { label: 'Affiliated with Nepal Tourism Board', url: 'https://ntb.gov.np/' },
};

interface SiteContextValue {
  site: SiteSettings;
  home: HomeSettings | undefined;
  supportPages: SiteData['supportPages'];
  continents: SiteData['continents'];
  activities: SiteData['activities'];
  loading: boolean;
}

const SiteContext = createContext<SiteContextValue | null>(null);

export function SiteProvider({ children }: { children: ReactNode }) {
  const { data, loading } = useApi<SiteData>('/site', { ttl: 5 * 60_000 });
  // Memoized like the sibling I18n/Theme/Currency providers — this wraps the whole router
  // (see App.tsx), so a new object literal on every render would re-render every page that
  // calls useSite() even when nothing it reads actually changed.
  const value = useMemo<SiteContextValue>(
    () => ({
      site: { ...FALLBACK_SITE, ...(data?.settings.site ?? {}) },
      home: data?.settings.home,
      supportPages: data?.supportPages ?? [],
      continents: data?.continents ?? [],
      activities: data?.activities ?? [],
      loading,
    }),
    [data, loading],
  );
  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}

export function useSite() {
  const ctx = useContext(SiteContext);
  if (!ctx) throw new Error('useSite must be used inside SiteProvider');
  return ctx;
}
