import { AlertCircle, ArrowRight, Globe2, Inbox, Map, Plus, Tags, TrendingDown, TrendingUp, Users } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ButtonLink, ErrorState, Skeleton } from '../../components/ui';
import { cx } from '../../lib/format';
import { useSession } from '../AdminApp';
import { timeAgo, useAdminApi } from '../api';
import { AdminPageHeader, Card, StatusPill } from '../ui';

interface Dashboard {
  stats: {
    liveTrips: number;
    liveTripsDelta: number;
    draftTrips: number;
    countries: number;
    activityTags: number;
    enquiriesThisMonth: number;
    enquiriesDelta: number;
    newEnquiries: number;
    subscribers: number;
  };
  recentEnquiries: { id: number; name: string; email: string; status: string; createdAt: string; trip: { title: string } | null }[];
  attention: { kind: 'trip' | 'country' | 'activity'; id: number; label: string; issue: string }[];
  recentActivity: { id: number; action: string; entity: string; entityId: string | null; createdAt: string; user: { name: string } | null }[];
}

export const STATUS_TONE: Record<string, 'red' | 'blue' | 'amber' | 'green' | 'gray'> = {
  NEW: 'red',
  CONTACTED: 'blue',
  QUOTED: 'amber',
  BOOKED: 'green',
  LOST: 'gray',
};

/** Figma “Stat Card”. */
function StatCard({ label, value, delta, icon, to }: { label: string; value: number; delta?: { value: number; label: string }; icon: ReactNode; to: string }) {
  return (
    <Link to={to} className="group flex flex-col gap-4 rounded-md border border-line bg-surface p-5 transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between">
        <span className="text-meta font-semibold text-fg-muted">{label}</span>
        <span className="flex size-10 items-center justify-center rounded-sm bg-brand-subtle text-fg-brand">{icon}</span>
      </div>
      <span className="font-serif text-[40px] leading-[44px] text-fg tabular-nums">{value.toLocaleString('en')}</span>
      {delta && (
        <span className={cx('inline-flex items-center gap-1.5 text-meta', delta.value > 0 ? 'text-fg-accent' : delta.value < 0 ? 'text-fg-brand' : 'text-fg-subtle')}>
          {delta.value > 0 ? <TrendingUp size={14} aria-hidden="true" /> : delta.value < 0 ? <TrendingDown size={14} aria-hidden="true" /> : null}
          {delta.value > 0 ? '+' : ''}
          {delta.value} {delta.label}
        </span>
      )}
    </Link>
  );
}

const ATTENTION_LINK = { trip: (id: number) => `/admin/trips/${id}`, country: () => '/admin/taxonomy?tab=countries', activity: () => '/admin/taxonomy?tab=activities' };

export default function DashboardPage() {
  const { user } = useSession();
  const { data, error, reload } = useAdminApi<Dashboard>('/admin/dashboard');
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <>
      <AdminPageHeader
        title={`${greeting}, ${user.name.split(' ')[0]}`}
        description="Here is what is happening across PDN Travel today."
        actions={
          <ButtonLink to="/admin/trips/new" size="sm">
            <Plus size={16} aria-hidden="true" /> New trip
          </ButtonLink>
        }
      />
      {error && !data ? (
        <ErrorState message={error.message} onRetry={reload} />
      ) : !data ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Live trips" value={data.stats.liveTrips} delta={{ value: data.stats.liveTripsDelta, label: 'this month' }} icon={<Map size={18} />} to="/admin/trips?status=published" />
            <StatCard label="Enquiries this month" value={data.stats.enquiriesThisMonth} delta={{ value: data.stats.enquiriesDelta, label: 'vs last month' }} icon={<Inbox size={18} />} to="/admin/enquiries" />
            <StatCard label="Countries" value={data.stats.countries} icon={<Globe2 size={18} />} to="/admin/taxonomy?tab=countries" />
            <StatCard label="Activity tags" value={data.stats.activityTags} icon={<Tags size={18} />} to="/admin/taxonomy?tab=activities" />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[3fr_2fr]">
            <Card
              title="Latest enquiries"
              description={`${data.stats.newEnquiries} waiting for a reply`}
              actions={
                <Link to="/admin/enquiries" className="inline-flex items-center gap-1 text-meta font-semibold text-fg-brand hover:underline">
                  View all <ArrowRight size={14} className="rtl:-scale-x-100" aria-hidden="true" />
                </Link>
              }
              className="[&>div]:p-0 sm:[&>div]:p-0"
            >
              {data.recentEnquiries.length ? (
                <ul className="divide-y divide-line">
                  {data.recentEnquiries.map((e) => (
                    <li key={e.id}>
                      <Link to={`/admin/enquiries?open=${e.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-subtle sm:px-6">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-meta font-semibold text-fg">
                          {e.name
                            .split(' ')
                            .map((p) => p[0])
                            .slice(0, 2)
                            .join('')
                            .toUpperCase()}
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate text-label text-fg">{e.name}</span>
                          <span className="truncate text-meta text-fg-subtle">{e.trip?.title ?? 'General enquiry'}</span>
                        </span>
                        <span className="hidden text-meta text-fg-subtle sm:block">{timeAgo(e.createdAt)}</span>
                        <StatusPill tone={STATUS_TONE[e.status] ?? 'gray'}>{e.status.toLowerCase()}</StatusPill>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="p-6 text-body-s text-fg-muted">No enquiries yet.</p>
              )}
            </Card>

            <Card title="Needs attention" description="Quick fixes that improve the website">
              {data.attention.length ? (
                <ul className="flex flex-col gap-2">
                  {data.attention.slice(0, 8).map((item, i) => (
                    <li key={`${item.kind}-${item.id}-${i}`}>
                      <Link to={ATTENTION_LINK[item.kind](item.id)} className="flex items-start gap-3 rounded-sm p-2 hover:bg-subtle">
                        <AlertCircle size={18} className="mt-0.5 shrink-0 text-amber-500" aria-hidden="true" />
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate text-body-s text-fg">{item.label}</span>
                          <span className="text-meta text-fg-subtle">{item.issue}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-body-s text-fg-muted">Everything looks good. 🎉</p>
              )}
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[2fr_3fr]">
            <Card title="At a glance">
              <dl className="grid grid-cols-2 gap-4">
                {[
                  ['Draft trips', data.stats.draftTrips],
                  ['New enquiries', data.stats.newEnquiries],
                  ['Newsletter subscribers', data.stats.subscribers],
                  ['Live trips', data.stats.liveTrips],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-sm bg-subtle p-4">
                    <dt className="text-meta text-fg-subtle">{label}</dt>
                    <dd className="text-h3 text-fg tabular-nums">{value}</dd>
                  </div>
                ))}
              </dl>
            </Card>
            <Card title="Recent activity" actions={<Users size={16} className="text-fg-subtle" aria-hidden="true" />}>
              {data.recentActivity.length ? (
                <ol className="flex flex-col gap-3">
                  {data.recentActivity.map((a) => (
                    <li key={a.id} className="flex items-center justify-between gap-3 text-body-s">
                      <span className="min-w-0 truncate text-fg">
                        <span className="font-semibold">{a.user?.name ?? 'System'}</span> <span className="text-fg-muted">{a.action.replace('.', ' ')}</span> {a.entity}
                        {a.entityId && !a.entityId.includes(',') ? ` #${a.entityId}` : ''}
                      </span>
                      <span className="shrink-0 text-meta text-fg-subtle">{timeAgo(a.createdAt)}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-body-s text-fg-muted">No activity yet.</p>
              )}
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
