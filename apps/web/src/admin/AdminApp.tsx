import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Spinner } from '../components/ui';
import { api } from '../lib/api';
import { AdminLayout } from './AdminLayout';
import { type AdminUser, UNAUTHORIZED_EVENT } from './api';
import LoginPage from './LoginPage';
import AccountPage from './pages/AccountPage';
import DashboardPage from './pages/DashboardPage';
import EnquiriesPage from './pages/EnquiriesPage';
import MediaPage from './pages/MediaPage';
import PageEditorPage from './pages/PageEditorPage';
import PagesListPage from './pages/PagesListPage';
import SettingsPage from './pages/SettingsPage';
import TaxonomyPage from './pages/TaxonomyPage';
import TeamPage from './pages/TeamPage';
import TestimonialsPage from './pages/TestimonialsAdminPage';
import TripEditorPage from './pages/TripEditorPage';
import TripsListPage from './pages/TripsListPage';
import { FeedbackProvider } from './ui';

interface SessionContextValue {
  user: AdminUser;
  setUser: (user: AdminUser | null) => void;
  refresh: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside the admin panel');
  return ctx;
}

export default function AdminApp() {
  const [user, setUser] = useState<AdminUser | null | undefined>(undefined);
  const location = useLocation();

  const refresh = useCallback(async () => {
    try {
      const res = await api<{ user: AdminUser | null }>('/auth/session');
      setUser(res.user ?? null);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    document.title = 'Admin | PDN Travel';
    return () => meta.remove();
  }, [refresh]);

  useEffect(() => {
    const onUnauthorized = () => setUser(null);
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, []);

  if (user === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-subtle">
        <Spinner className="size-8" />
      </div>
    );
  }

  return (
    <FeedbackProvider>
      <Routes>
        <Route path="login" element={user ? <Navigate to={(location.state as { from?: string } | null)?.from ?? '/admin'} replace /> : <LoginPage onSignedIn={setUser} />} />
        <Route
          element={
            user ? (
              <SessionContext.Provider value={{ user, setUser, refresh }}>
                <AdminLayout />
              </SessionContext.Provider>
            ) : (
              <Navigate to="/admin/login" replace state={{ from: location.pathname + location.search }} />
            )
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="trips" element={<TripsListPage />} />
          <Route path="trips/new" element={<TripEditorPage />} />
          <Route path="trips/:id" element={<TripEditorPage />} />
          <Route path="taxonomy" element={<TaxonomyPage />} />
          <Route path="pages" element={<PagesListPage />} />
          <Route path="pages/new" element={<PageEditorPage />} />
          <Route path="pages/:id" element={<PageEditorPage />} />
          <Route path="testimonials" element={<TestimonialsPage />} />
          <Route path="enquiries" element={<EnquiriesPage />} />
          <Route path="media" element={<MediaPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="account" element={<AccountPage />} />
          <Route path="team" element={<TeamPage />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Route>
      </Routes>
    </FeedbackProvider>
  );
}
