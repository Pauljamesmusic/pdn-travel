import type { ComponentType } from 'react';
import { createBrowserRouter, isRouteErrorResponse, Link, Navigate, RouterProvider, useRouteError } from 'react-router-dom';
import { PublicLayout } from './components/layout/PublicLayout';
import { SiteProvider } from './components/SiteContext';
import { I18nProvider } from './lib/i18n';
import { ThemeProvider } from './lib/theme';

const page = (loader: () => Promise<{ default: ComponentType }>) => async () => ({ Component: (await loader()).default });

function RouteError() {
  const error = useRouteError();
  const chunkFailed = error instanceof Error && /dynamically imported module|Loading chunk/i.test(error.message);
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-canvas px-6 text-center text-fg">
      <img src="/brand/pdn-mark.png" alt="PDN Travel" className="size-16" />
      <h1 className="text-h2">{isRouteErrorResponse(error) && error.status === 404 ? 'Page not found' : 'Something went wrong'}</h1>
      <p className="max-w-md text-body-m text-fg-muted">
        {chunkFailed ? 'A new version of the site is available. Please refresh the page.' : 'Please try again, or head back to the home page.'}
      </p>
      <div className="flex gap-3">
        <button type="button" onClick={() => window.location.reload()} className="min-h-11 rounded-full border border-line-strong px-5 text-label">
          Refresh
        </button>
        <Link to="/" className="inline-flex min-h-11 items-center rounded-full bg-brand px-5 text-label text-ink-0">
          Home
        </Link>
      </div>
    </div>
  );
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <PublicLayout />,
    errorElement: <RouteError />,
    children: [
      { index: true, lazy: page(() => import('./pages/HomePage')) },
      { path: 'destinations', lazy: page(() => import('./pages/DestinationsPage')) },
      { path: 'destinations/:slug', lazy: page(() => import('./pages/CountryPage')) },
      { path: 'tours', lazy: page(() => import('./pages/ToursPage')) },
      { path: 'tours/:slug', lazy: page(() => import('./pages/TripPage')) },
      { path: 'activities', lazy: page(() => import('./pages/ActivitiesPage')) },
      { path: 'activities/:slug', lazy: page(() => import('./pages/ActivityPage')) },
      { path: 'testimonials', lazy: page(() => import('./pages/TestimonialsPage')) },
      { path: 'contact', lazy: page(() => import('./pages/ContactPage')) },
      { path: 'support', lazy: page(() => import('./pages/SupportPage')) },
      { path: 'support/:slug', lazy: page(() => import('./pages/CmsPage')) },
      { path: 'about', element: <Navigate to="/support/about" replace /> },
      { path: 'terms', element: <Navigate to="/support/terms-and-conditions" replace /> },
      { path: 'privacy', element: <Navigate to="/support/privacy-policy" replace /> },
      { path: '*', lazy: page(() => import('./pages/NotFoundPage')) },
    ],
  },
  {
    path: '/admin/*',
    errorElement: <RouteError />,
    lazy: page(() => import('./admin/AdminApp')),
  },
]);

export function App() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <SiteProvider>
          <RouterProvider router={router} />
        </SiteProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
