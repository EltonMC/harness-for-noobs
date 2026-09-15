import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { translate } from '@/shared/i18n/translate';
import { expectNoAccessibilityViolations } from '@/test/accessibility';
import { renderRoute } from '@/test/render';
import { RouteErrorPage } from './RouteErrorPage';

describe('application routes', () => {
  it('shows a not-found page with a way back home for an unknown address', async () => {
    const { container, user } = renderRoute('/does-not-exist');

    expect(await screen.findByRole('heading', { level: 1, name: translate('navigation.notFoundTitle') })).toBeVisible();
    await expectNoAccessibilityViolations(container);

    await user.click(screen.getByRole('link', { name: translate('navigation.home') }));
    expect(screen.queryByRole('heading', { name: translate('navigation.notFoundTitle') })).not.toBeInTheDocument();
  });

  it('turns a failing route into a message the user can act on', async () => {
    const failingRoutes = [
      {
        path: '/',
        errorElement: <RouteErrorPage />,
        HydrateFallback: () => null,
        loader: () => {
          throw new TypeError('Failed to fetch');
        },
        element: null,
      },
    ];

    renderRoute('/', { routes: failingRoutes });

    expect(await screen.findByRole('alert')).toHaveTextContent(translate('errors.network'));
    expect(screen.getByRole('link', { name: translate('navigation.home') })).toBeVisible();
  });
});
