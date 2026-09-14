export interface SupabaseBrowserConfig {
  url: string;
  publishableKey: string;
}

// The browser may only receive the project URL and the publishable key.
// Privileged keys belong to Supabase Edge Functions or CI secrets.
export function readSupabaseBrowserConfig(environment: Record<string, string | undefined>): SupabaseBrowserConfig {
  const url = environment.VITE_SUPABASE_URL;
  const publishableKey = environment.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY. Copy .env.example to .env.local.');
  }
  if (publishableKey.startsWith('sb_secret_')) {
    throw new Error('A secret Supabase key was configured for the browser. Use the publishable key instead.');
  }
  return { url, publishableKey };
}
