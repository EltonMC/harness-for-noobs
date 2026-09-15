import { describe, expect, it } from 'vitest';
import { isRetryableError, userErrorMessageKey } from './user-error';

describe('userErrorMessageKey', () => {
  it('explains a denied operation without exposing the database error', () => {
    expect(
      userErrorMessageKey({
        code: '42501',
        message: 'new row violates row-level security policy for table "expenses"',
      }),
    ).toBe('errors.forbidden');
  });

  it('recognizes a missing row and a lost connection', () => {
    expect(userErrorMessageKey({ code: 'PGRST116', message: 'no rows' })).toBe('errors.notFound');
    expect(userErrorMessageKey(new TypeError('Failed to fetch'))).toBe('errors.network');
  });

  it('falls back to a generic message for anything unknown', () => {
    expect(userErrorMessageKey(new Error('boom'))).toBe('errors.unexpected');
    expect(userErrorMessageKey({ code: 'XX000' })).toBe('errors.unexpected');
    expect(userErrorMessageKey('text')).toBe('errors.unexpected');
  });
});

describe('isRetryableError', () => {
  it('retries only transient network failures', () => {
    expect(isRetryableError(new TypeError('NetworkError when attempting to fetch resource.'))).toBe(true);
    expect(isRetryableError({ code: '42501' })).toBe(false);
  });
});
