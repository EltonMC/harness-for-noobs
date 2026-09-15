import { z } from 'zod';
import type { MessageKey } from '@/shared/i18n/messages';

// Supabase (PostgREST) errors carry a code; anything else is unknown until proven otherwise.
const supabaseErrorSchema = z.object({ code: z.string() });

const messageBySupabaseCode: Partial<Record<string, MessageKey>> = {
  '42501': 'errors.forbidden', // Row Level Security or grant denied the operation.
  PGRST301: 'errors.forbidden', // Missing or expired session token.
  PGRST116: 'errors.notFound', // .single() matched no row.
};

// Maps any thrown value to copy the user can act on. Never show raw error text:
// it can leak table names or policies and is not in the product locale.
export function userErrorMessageKey(error: unknown): MessageKey {
  if (error instanceof TypeError && /fetch|network/i.test(error.message)) return 'errors.network';
  const parsed = supabaseErrorSchema.safeParse(error);
  if (parsed.success) return messageBySupabaseCode[parsed.data.code] ?? 'errors.unexpected';
  return 'errors.unexpected';
}

export function isRetryableError(error: unknown) {
  return userErrorMessageKey(error) === 'errors.network';
}
