import { Clock, ExternalLink, Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { EnquiryForm } from '../components/EnquiryForm';
import { PageHero } from '../components/PageHero';
import { useSite } from '../components/SiteContext';
import { useApi } from '../lib/api';
import { waLink } from '../lib/format';
import { useDocumentMeta } from '../lib/hooks';
import { useI18n } from '../lib/i18n';
import type { Paged, TripCard } from '../lib/types';

export default function ContactPage() {
  const { t } = useI18n();
  const { site } = useSite();
  const [params] = useSearchParams();
  const { data } = useApi<Paged<TripCard>>('/trips?limit=48&sort=featured');
  useDocumentMeta(t('nav.contact'), t('contact.subtitle'));

  const tripSlug = params.get('trip');
  const defaultTrip = data?.items.find((trip) => trip.slug === tripSlug);
  const topic = params.get('topic');

  const channels = [
    { icon: Phone, label: t('contact.call'), value: site.phone, href: `tel:${site.phone.replace(/\s/g, '')}`, ltr: true },
    { icon: Mail, label: t('contact.write'), value: site.email, href: `mailto:${site.email}` },
    { icon: MessageCircle, label: t('contact.whatsapp'), value: `+${site.whatsapp}`, href: waLink(site.whatsapp, 'Hi PDN Travel!'), ltr: true, external: true },
  ];

  return (
    <>
      <PageHero
        eyebrow={t('contact.eyebrow')}
        title={t('contact.title')}
        subtitle={t('contact.subtitle')}
        image="https://images.unsplash.com/photo-1735533441842-33c5e47b22ae?auto=format&fit=crop&w=2000&q=80"
        crumbs={[{ label: t('nav.support'), to: '/support' }, { label: t('nav.contact') }]}
        size="sm"
      />

      <div className="container-pdn grid grid-cols-1 gap-12 py-16 lg:grid-cols-[1fr_400px] lg:gap-16 lg:py-24">
        <section aria-label={t('contact.title')} className="rounded-lg border border-line bg-surface p-6 shadow-sm sm:p-10">
          <EnquiryForm
            key={`${defaultTrip?.id ?? 'none'}-${topic ?? ''}`}
            trips={data?.items.map((trip) => ({ id: trip.id, title: trip.title }))}
            defaultTripId={defaultTrip?.id}
            defaultTravellers={Number(params.get('travellers')) || undefined}
            defaultDate={params.get('date') ?? undefined}
            defaultMessage={topic ? `I'd like to know more about ${topic}.` : ''}
          />
        </section>

        <aside className="flex flex-col gap-4">
          {channels.map(({ icon: ChannelIcon, label, value, href, ltr, external }) => (
            <a
              key={label}
              href={href}
              target={external ? '_blank' : undefined}
              rel={external ? 'noopener noreferrer' : undefined}
              className="group flex items-center gap-4 rounded-lg border border-line bg-surface p-5 transition-colors hover:border-line-strong"
            >
              <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-brand-subtle text-fg-brand transition-colors group-hover:bg-brand group-hover:text-ink-0">
                <ChannelIcon size={22} aria-hidden="true" />
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="text-meta text-fg-subtle">{label}</span>
                <span className="truncate text-label text-fg" dir={ltr ? 'ltr' : undefined}>
                  {value}
                </span>
              </span>
            </a>
          ))}

          <div className="flex flex-col gap-4 rounded-lg border border-line bg-subtle p-6">
            <p className="flex items-start gap-3 text-body-s text-fg">
              <MapPin size={20} className="mt-0.5 shrink-0 text-fg-brand" aria-hidden="true" />
              <span>
                <span className="block text-label">{t('contact.office')}</span>
                {site.address}
              </span>
            </p>
            <p className="flex items-start gap-3 text-body-s text-fg">
              <Clock size={20} className="mt-0.5 shrink-0 text-fg-brand" aria-hidden="true" />
              <span>
                <span className="block text-label">{t('contact.hours')}</span>
                {site.officeHours}
              </span>
            </p>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(site.mapQuery || site.address)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-label text-fg-brand hover:underline"
            >
              Google Maps <ExternalLink size={14} aria-hidden="true" />
            </a>
          </div>

          <img src="/media/pdn-welcome.jpg" alt="Welcome to PDN Travels — Atithi Devo Bhava" loading="lazy" className="hidden rounded-lg object-cover lg:block" />
        </aside>
      </div>
    </>
  );
}
