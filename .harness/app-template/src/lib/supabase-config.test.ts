import { describe, expect, it } from 'vitest';
import { readSupabaseBrowserConfig } from './supabase-config';

describe('readSupabaseBrowserConfig', () => {
  it('returns the public browser configuration', () => {
    expect(
      readSupabaseBrowserConfig({
        VITE_SUPABASE_URL: 'http://127.0.0.1:54321',
        VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_example',
      }),
    ).toEqual({ url: 'http://127.0.0.1:54321', publishableKey: 'sb_publishable_example' });
  });

  it('explains how to fix a missing configuration', () => {
    expect(() => readSupabaseBrowserConfig({})).toThrow(/\.env\.local/);
  });

  it('refuses a secret key in browser configuration', () => {
    expect(() =>
      readSupabaseBrowserConfig({
        VITE_SUPABASE_URL: 'http://127.0.0.1:54321',
        VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_example',
      }),
    ).toThrow(/publishable/);
  });
});
