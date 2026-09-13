import { ArrowUpRight, BookOpen, CalendarHeart, FileCheck2, HandHeart, Mail, Scale, ShieldCheck, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHero } from '../components/PageHero';
import { useSite } from '../components/SiteContext';
import { useDocumentMeta, useReveal } from '../lib/hooks';
import { useI18n } from '../lib/i18n';

const ICON_BY_SLUG: Record<string, typeof BookOpen> = {
  about: BookOpen,
  'within-the-law': Scale,
  'working-together': Users,
  'terms-and-conditions': FileCheck2,
  'privacy-policy': ShieldCheck,
  'pdn-appeal': HandHeart,
  'pdn-events': CalendarHeart,
};

export default function SupportPage() {
  const { t } = useI18n();
  const { supportPages, site } = useSite();
  const ref = useReveal<HTMLDivElement>();
  useDocumentMeta(t('nav.support'), t('pages.supportSubtitle'));

  const items = [
    ...supportPages.map((p) => ({ to: `/support/${p.slug}`, title: p.title, icon: ICON_BY_SLUG[p.slug] ?? BookOpen })),
    { to: '/support/privacy-policy', title: t('footer.privacy'), icon: ShieldCheck },
    { to: '/contact', title: t('nav.contact'), icon: Mail },
  ].filter((item, index, list) => list.findIndex((x) => x.to === item.to) === index);

  return (
    <>
      <PageHero
        eyebrow={t('pages.supportEyebrow')}
        title={t('pages.supportTitle')}
        subtitle={t('pages.supportSubtitle')}
        image="https://images.unsplash.com/photo-1699202700754-1e5cbf0f8660?auto=format&fit=crop&w=2000&q=80"
        crumbs={[{ label: t('nav.support') }]}
      />
      <div ref={ref} className="container-pdn py-16 lg:py-24">
        <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {items.map(({ to, title, icon: ItemIcon }, i) => (
            <li key={to} className="reveal" style={{ ['--reveal-delay' as string]: `${(i % 4) * 60}ms` }}>
              <Link to={to} className="group flex h-full flex-col gap-10 rounded-lg border border-line bg-surface p-6 transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-1 hover:border-line-strong hover:shadow-md">
                <span className="flex items-start justify-between">
                  <span className="flex size-[52px] items-center justify-center rounded-md bg-brand-subtle text-fg-brand transition-colors group-hover:bg-brand group-hover:text-ink-0">
                    <ItemIcon size={24} aria-hidden="true" />
                  </span>
                  <ArrowUpRight size={20} className="text-fg-subtle transition-transform group-hover:rotate-45 rtl:-scale-x-100" aria-hidden="true" />
                </span>
                <span className="text-h4 text-fg">{title}</span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-12 text-center text-body-m text-fg-muted">
          {site.legalName} · <a href={`mailto:${site.email}`} className="text-fg-brand hover:underline">{site.email}</a>
        </p>
      </div>
    </>
  );
}
