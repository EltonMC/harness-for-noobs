import { describe, expect, it } from 'vitest';
import { catalogs } from './messages';
import { formatMessage, productLocale, translate } from './translate';

describe('translate', () => {
  it('returns the copy for the product locale', () => {
    expect(translate('navigation.home')).toBe(catalogs[productLocale]['navigation.home']);
  });

  it('fills named parameters and leaves unknown placeholders visible', () => {
    expect(formatMessage('Hi {name}, you have {count} items {missing}', { name: 'Ana', count: 3 })).toBe(
      'Hi Ana, you have 3 items {missing}',
    );
  });

  it('defines non-empty copy for every key in every locale', () => {
    const keys = Object.keys(catalogs['pt-BR']).sort();
    for (const catalog of Object.values(catalogs)) {
      expect(Object.keys(catalog).sort()).toEqual(keys);
      expect(Object.values(catalog).every((text) => text.trim().length > 0)).toBe(true);
    }
  });
});
