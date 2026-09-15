import { Link } from 'react-router';
import { translate } from '@/shared/i18n/translate';

export function NotFoundPage() {
  return (
    <>
      <h1>{translate('navigation.notFoundTitle')}</h1>
      <p>{translate('errors.notFound')}</p>
      <Link to="/">{translate('navigation.home')}</Link>
    </>
  );
}
