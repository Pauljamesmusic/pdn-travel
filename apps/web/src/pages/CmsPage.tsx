import { ArrowRight } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { BlockRenderer } from '../components/BlockRenderer';
import { PageHero } from '../components/PageHero';
import { useSite } from '../components/SiteContext';
import { ErrorState, Skeleton } from '../components/ui';
import { useApi } from '../lib/api';
import { cx, formatDate } from '../lib/format';
import { useDocumentMeta } from '../lib/hooks';
import { useI18n } from '../lib/i18n';
import type { CmsPage as CmsPageData } from '../lib/types';
import NotFoundPage from './NotFoundPage';

export default function CmsPage() {
  const { slug = '' } = useParams();
  const { t, lang } = useI18n();
  const { supportPages } = useSite();
  const { data, error, loading, reload } = useApi<CmsPageData>(`/pages/${encodeURIComponent(slug)}`);
  useDocumentMeta(data?.title, data?.metaDescription ?? data?.subtitle);

  if (error?.status === 404) return <NotFoundPage />;
  const isLegal = data?.sections.some((b) => b.type === 'legal');

  return (
    <>
      <PageHero
        eyebrow={data?.eyebrow ?? t('nav.support')}
        title={data?.title ?? '…'}
        subtitle={data?.subtitle}
        image={data?.heroImage}
        crumbs={[{ label: t('nav.support'), to: '/support' }, ...(data ? [{ label: data.title }] : [])]}
        size={isLegal ? 'sm' : 'md'}
      />

      <div className={cx('container-pdn py-16 lg:py-24', isLegal && 'grid gap-12 lg:grid-cols-[1fr_280px]')}>
        {error && <ErrorState message={t('common.error')} onRetry={reload} retryLabel={t('common.retry')} />}
        {loading && !data && (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-64 w-full" />
          </div>
        )}
        {data && (
          <div>
            <BlockRenderer blocks={data.sections} />
            <p className="mt-16 text-meta text-fg-subtle">
              Last updated {formatDate(data.updatedAt, lang, { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        )}
        {isLegal && (
          <aside className="order-first lg:order-none" aria-label={t('nav.support')}>
            <nav className="sticky top-24 flex flex-col gap-1 rounded-lg border border-line bg-subtle p-3">
              {supportPages.map((p) => (
                <Link key={p.slug} to={`/support/${p.slug}`} className={cx('flex min-h-11 items-center justify-between rounded-sm px-3 text-body-s', p.slug === slug ? 'bg-surface text-fg-brand shadow-sm' : 'text-fg-muted hover:text-fg')}>
                  {p.title}
                  <ArrowRight size={14} className="rtl:-scale-x-100" aria-hidden="true" />
                </Link>
              ))}
            </nav>
          </aside>
        )}
      </div>
    </>
  );
}
