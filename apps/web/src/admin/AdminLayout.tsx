import {
  BookOpenText,
  ExternalLink,
  Globe2,
  Images,
  Inbox,
  LayoutDashboard,
  LogOut,
  Map,
  Menu,
  MessageSquareQuote,
  Moon,
  Settings,
  ShieldCheck,
  Sun,
  Users,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { cx } from '../lib/format';
import { useTheme } from '../lib/theme';
import { useSession } from './AdminApp';
import { adminApi, useAdminApi } from './api';

const IDLE_LIMIT_MS = 30 * 60_000;

const NAV = [
  {
    group: 'Manage',
    items: [
      { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/admin/trips', label: 'Trips & itineraries', icon: Map },
      { to: '/admin/enquiries', label: 'Enquiries', icon: Inbox, badge: true },
      { to: '/admin/media', label: 'Media library', icon: Images },
    ],
  },
  {
    group: 'Content',
    items: [
      { to: '/admin/taxonomy', label: 'Continents, countries & tags', icon: Globe2 },
      { to: '/admin/pages', label: 'Pages', icon: BookOpenText },
      { to: '/admin/testimonials', label: 'Testimonials', icon: MessageSquareQuote },
      { to: '/admin/settings', label: 'Site settings', icon: Settings },
    ],
  },
  {
    group: 'Account',
    items: [
      { to: '/admin/team', label: 'Team & roles', icon: Users },
      { to: '/admin/account', label: 'Security', icon: ShieldCheck },
    ],
  },
];

/** One shared shell (Figma “Sidebar Item” + top bar) wrapping every admin route. */
export function AdminLayout() {
  const { user, setUser } = useSession();
  const { resolved, toggle } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawer, setDrawer] = useState(false);
  const idleTimer = useRef<number>(0);
  const { data: counts } = useAdminApi<{ stats: { newEnquiries: number } }>('/admin/dashboard');

  const signOut = useCallback(
    async (reason?: string) => {
      try {
        await adminApi('/auth/logout', { method: 'POST' });
      } catch {
        /* ignore */
      }
      setUser(null);
      navigate('/admin/login', { replace: true, state: reason ? { message: reason } : undefined });
    },
    [navigate, setUser],
  );

  // Sign out automatically after 30 minutes without activity.
  useEffect(() => {
    const reset = () => {
      window.clearTimeout(idleTimer.current);
      idleTimer.current = window.setTimeout(() => void signOut('You were signed out after 30 minutes of inactivity.'), IDLE_LIMIT_MS);
    };
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      window.clearTimeout(idleTimer.current);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [signOut]);

  useEffect(() => setDrawer(false), [location.pathname]);

  const sidebar = (
    <nav className="flex h-full flex-col gap-6 overflow-y-auto p-4" aria-label="Admin">
      <Link to="/admin" className="flex items-center gap-3 px-2 py-1">
        <img src="/brand/pdn-mark.png" alt="" className="size-9" />
        <span className="flex flex-col leading-tight">
          <span className="text-label text-fg">PDN Travel</span>
          <span className="text-meta text-fg-subtle">Admin panel</span>
        </span>
      </Link>
      {NAV.map((group) => (
        <div key={group.group} className="flex flex-col gap-1">
          <p className="px-3 pb-1 text-caps text-fg-subtle">{group.group}</p>
          {group.items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={'end' in item ? item.end : false}
              className={({ isActive }) =>
                cx('flex h-11 items-center gap-3 rounded-sm px-3 text-body-s transition-colors', isActive ? 'bg-brand-subtle text-fg-brand' : 'text-fg-muted hover:bg-muted hover:text-fg')
              }
            >
              <item.icon size={18} aria-hidden="true" />
              <span className="flex-1 truncate">{item.label}</span>
              {'badge' in item && item.badge && !!counts?.stats.newEnquiries && (
                <span className="rounded-full bg-brand px-2 py-0.5 text-meta font-semibold text-ink-0">{counts.stats.newEnquiries}</span>
              )}
            </NavLink>
          ))}
        </div>
      ))}
      <div className="mt-auto flex flex-col gap-2 rounded-md border border-line bg-subtle p-3">
        <p className="truncate text-label text-fg">{user.name}</p>
        <p className="truncate text-meta text-fg-subtle">
          {user.email} · {user.role === 'OWNER' ? 'Owner' : 'Editor'}
        </p>
        {!user.totpEnabled && (
          <Link to="/admin/account" className="text-meta text-fg-brand hover:underline">
            Turn on two-factor sign-in →
          </Link>
        )}
        <button type="button" onClick={() => void signOut()} className="mt-1 inline-flex h-10 items-center justify-center gap-2 rounded-full border border-line-strong text-label text-fg hover:border-fg">
          <LogOut size={16} aria-hidden="true" /> Sign out
        </button>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen bg-subtle text-fg lg:grid lg:grid-cols-[272px_1fr]">
      <aside className="sticky top-0 hidden h-screen border-e border-line bg-surface lg:block">{sidebar}</aside>

      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" className="absolute inset-0 bg-ink-950/50" aria-label="Close menu" onClick={() => setDrawer(false)} />
          <aside className="absolute inset-y-0 start-0 w-[280px] bg-surface shadow-lg">
            <button type="button" onClick={() => setDrawer(false)} aria-label="Close menu" className="absolute end-3 top-3 flex size-10 items-center justify-center rounded-full hover:bg-muted">
              <X size={18} aria-hidden="true" />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-3 border-b border-line bg-surface/95 px-4 backdrop-blur-md sm:px-8">
          <button type="button" onClick={() => setDrawer(true)} aria-label="Open menu" className="flex size-10 items-center justify-center rounded-full border border-line lg:hidden">
            <Menu size={18} aria-hidden="true" />
          </button>
          <p className="hidden text-meta text-fg-subtle sm:block">Changes you save here update the public website immediately.</p>
          <div className="flex items-center gap-2">
            <a href="/" target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-full border border-line px-4 text-meta font-semibold text-fg hover:border-line-strong">
              View site <ExternalLink size={14} aria-hidden="true" />
            </a>
            <button type="button" onClick={toggle} aria-label="Toggle dark mode" className="flex size-10 items-center justify-center rounded-full border border-line text-fg hover:border-line-strong">
              {resolved === 'dark' ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
            </button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-8 sm:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
