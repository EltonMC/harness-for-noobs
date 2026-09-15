import { isRouteErrorResponse, Link, useRouteError } from 'react-router';
import { userErrorMessageKey } from '@/shared/errors/user-error';
import { translate } from '@/shared/i18n/translate';

// Shown when a route's loader or component throws. Raw error text never reaches the user.
export function RouteErrorPage() {
  const error = useRouteError();
  const messageKey =
    isRouteErrorResponse(error) && error.status === 404 ? 'errors.notFound' : userErrorMessageKey(error);

  return (
    <main>
      <h1>{translate('errors.title')}</h1>
      <p role="alert">{translate(messageKey)}</p>
      <Link to="/">{translate('navigation.home')}</Link>
    </main>
  );
}
