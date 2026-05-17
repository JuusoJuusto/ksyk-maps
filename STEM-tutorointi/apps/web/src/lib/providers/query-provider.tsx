// ============================================
// STEM Genius - React Query Provider
// Production-Grade Query Client Configuration
// ============================================

'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, type ReactNode } from 'react';
import toast from 'react-hot-toast';

// Singleton pattern to prevent multiple QueryClient instances
let browserQueryClient: QueryClient | undefined = undefined;

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Stale time: Data is fresh for 60 seconds
        staleTime: 60 * 1000,
        // Cache time: Keep unused data in cache for 5 minutes
        gcTime: 5 * 60 * 1000,
        // Retry failed requests with exponential backoff
        retry: (failureCount, error: any) => {
          // Don't retry on 4xx errors (client errors)
          if (error?.status >= 400 && error?.status < 500) {
            return false;
          }
          // Retry up to 3 times for other errors
          return failureCount < 3;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        // Refetch on window focus in production only
        refetchOnWindowFocus: process.env.NODE_ENV === 'production',
        // Don't refetch on mount if data is fresh
        refetchOnMount: false,
        // Refetch on reconnect in production
        refetchOnReconnect: process.env.NODE_ENV === 'production',
      },
      mutations: {
        // Retry failed mutations once
        retry: 1,
        // Network mode: online only
        networkMode: 'online',
        // Global error handler for mutations
        onError: (error: any) => {
          const message = error?.message || 'Something went wrong';
          toast.error(message);
        },
      },
    },
  });
}

function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: always make a new query client
    return makeQueryClient();
  } else {
    // Browser: make a new query client if we don't already have one
    // This is very important so we don't re-make a new client if React
    // suspends during the initial render. This may not be needed if we
    // have a suspense boundary BELOW the creation of the query client
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}

interface QueryProviderProps {
  children: ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  // NOTE: Avoid useState when initializing the query client if you don't
  // have a suspense boundary between this and the code that may suspend
  // because React will throw away the client on the initial render if it
  // suspends and there is no boundary
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools 
          initialIsOpen={false}
          buttonPosition="bottom-right"
        />
      )}
    </QueryClientProvider>
  );
}
