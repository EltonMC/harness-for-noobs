import { QueryClient } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, type RouteObject, RouterProvider } from 'react-router';
import { AppProviders } from '@/app/AppProviders';
import { appRoutes } from '@/app/routes';

interface RenderRouteOptions {
  routes?: RouteObject[];
}

// Renders a route with the real providers, a fresh query cache, and no retries, so
// tests exercise what the user sees. Fake Supabase by mocking the feature's api module.
export function renderRoute(path: string, { routes = appRoutes }: RenderRouteOptions = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const user = userEvent.setup();
  const result = render(
    <AppProviders queryClient={queryClient}>
      <RouterProvider router={router} />
    </AppProviders>,
  );
  return { ...result, user, router, queryClient };
}
