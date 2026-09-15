import { QueryClient } from '@tanstack/react-query';
import { isRetryableError } from '@/shared/errors/user-error';

const maximumRetries = 2;

// Server state (anything read from Supabase) goes through TanStack Query, never useEffect + useState.
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: (failureCount, error) => failureCount < maximumRetries && isRetryableError(error),
      },
      mutations: { retry: false },
    },
  });
}
