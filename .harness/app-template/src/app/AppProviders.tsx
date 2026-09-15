import { type QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

interface AppProvidersProps {
  queryClient: QueryClient;
  children: ReactNode;
}

// Application-wide providers, shared by main.tsx and the test render helpers.
export function AppProviders({ queryClient, children }: AppProvidersProps) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
