'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { Toaster } from '@/components/ui/sonner';
import { useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';

function CsrfInit() {
  const setHydrated = useAuthStore((s) => s.setHydrated);

  useEffect(() => {
    api.get('/api/auth/csrf').catch(() => {}).finally(() => setHydrated());
  }, [setHydrated]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <CsrfInit />
      {children}
      <Toaster theme="dark" position="top-right" richColors />
    </QueryClientProvider>
  );
}
