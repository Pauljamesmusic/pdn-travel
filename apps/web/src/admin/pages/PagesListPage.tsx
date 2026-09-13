import { ExternalLink, FileText, Pencil, Plus, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ButtonLink, EmptyState, ErrorState, Skeleton } from '../../components/ui';
import { invalidate } from '../../lib/api';
import { adminApi, timeAgo, useAdminApi } from '../api';
import { AdminPageHeader, StatusPill, useFeedback } from '../ui';

interface PageRow {
  id: number;
  slug: string;
  title: string;
  isPublished: boolean;
  navGroup: string | null;
  sortOrder: number;
  updatedAt: string;
}

export default function PagesListPage() {
  const { data, error, reload } = useAdminApi<PageRow[]>('/admin/pages');
  const { confirm, toast } = useFeedback();

  const remove = async (page: PageRow) => {
    if (!(await confirm({ title: `Delete “${page.title}”?`, body: 'The page and all its content blocks will be removed from the website. Links to it will show “page not found”.', confirmLabel: 'Delete page', tone: 'danger' }))) return;
    try {
      await adminApi(`/admin/pages/${page.id}`, { method: 'DELETE' });
      toast('Page deleted');
      invalidate();
      reload();
    } catch (err) {
      toast((err as Error).message, 'error');
    }
  };

  const groups = [
    { title: 'Support menu', hint: 'Shown in the navbar “Support” dropdown and the footer', rows: (data ?? []).filter((p) => p.navGroup === 'support') },
    { title: 'Other pages', hint: 'Reachable by link only (e.g. privacy policy)', rows: (data ?? []).filter((p) => p.navGroup !== 'support') },
  ];

  return (
    <>
      <AdminPageHeader
        title="Pages"
        description="About, legal and support pages built from content blocks. Add new pages any time."
        actions={
          <ButtonLink to="/admin/pages/new" size="sm">
            <Plus size={16} aria-hidden="true" /> New page
          </ButtonLink>
        }
      />
      {error && !data ? (
        <ErrorState message={error.message} onRetry={reload} />
      ) : !data ? (
        <Skeleton className="h-80" />
      ) : !data.length ? (
        <EmptyState title="No pages yet" body="Create your first page." />
      ) : (
        <div className="flex flex-col gap-8">
          {groups.map((group) =>
            group.rows.length ? (
              <section key={group.title} className="flex flex-col gap-3">
                <div>
                  <h2 className="text-label text-fg">{group.title}</h2>
                  <p className="text-meta text-fg-subtle">{group.hint}</p>
                </div>
                <ul className="divide-y divide-line overflow-hidden rounded-md border border-line bg-surface">
                  {group.rows.map((page) => (
                    <li key={page.id} className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-subtle sm:flex-nowrap">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-sm bg-muted text-fg-muted">
                        <FileText size={18} aria-hidden="true" />
                      </span>
                      <Link to={`/admin/pages/${page.id}`} className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-label text-fg hover:text-fg-brand">{page.title}</span>
                        <span className="truncate text-meta text-fg-subtle">
                          /support/{page.slug} · updated {timeAgo(page.updatedAt)}
                        </span>
                      </Link>
                      <StatusPill tone={page.isPublished ? 'green' : 'gray'}>{page.isPublished ? 'Published' : 'Draft'}</StatusPill>
                      <div className="flex items-center gap-1">
                        <Link to={`/admin/pages/${page.id}`} aria-label={`Edit ${page.title}`} className="flex size-9 items-center justify-center rounded-sm text-fg-muted hover:bg-muted">
                          <Pencil size={16} aria-hidden="true" />
                        </Link>
                        <a href={`/support/${page.slug}`} target="_blank" rel="noopener noreferrer" aria-label="View on website" className="flex size-9 items-center justify-center rounded-sm text-fg-muted hover:bg-muted">
                          <ExternalLink size={16} aria-hidden="true" />
                        </a>
                        <button type="button" onClick={() => remove(page)} aria-label={`Delete ${page.title}`} className="flex size-9 items-center justify-center rounded-sm text-fg-brand hover:bg-brand-subtle">
                          <Trash2 size={16} aria-hidden="true" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null,
          )}
        </div>
      )}
    </>
  );
}
