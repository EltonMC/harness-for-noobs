import { describe, expect, it } from 'vitest';
import { createQueryClient } from './query-client';

describe('createQueryClient', () => {
  const retry = createQueryClient().getDefaultOptions().queries?.retry;
  const shouldRetry = (failureCount: number, error: Error) => typeof retry === 'function' && retry(failureCount, error);

  it('retries a lost connection a limited number of times', () => {
    expect(shouldRetry(0, new TypeError('Failed to fetch'))).toBe(true);
    expect(shouldRetry(2, new TypeError('Failed to fetch'))).toBe(false);
  });

  it('never retries a denied request', () => {
    expect(shouldRetry(0, Object.assign(new Error('permission denied'), { code: '42501' }))).toBe(false);
  });
});
