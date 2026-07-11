'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { Toaster } from '@/components/ui/sonner';
import { useEffect } from 'react';
import { api, setAccessToken } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { toStoreUser } from '@/lib/user';
import { CurrentUserResponse } from '@/types/api';

function CsrfInit() {
  const setHydrated = useAuthStore((s) => s.setHydrated);
  const setUser = useAuthStore((s) => s.setUser);

  useEffect(() => {
    // Runs once per real page load (mount), not on every client-side route change —
    // deliberately NOT reactive to pathname, since re-running this on every SPA
    // navigation would re-hit /api/auth/refresh repeatedly (rotating the refresh
    // token each time) for no reason.
    //
    // /oauth2/redirect resolves its own session on this same page load (exchange code →
    // login). Running the silent bootstrap refresh here too would race it — whichever
    // finishes last wins — and can silently overwrite the just-completed login with
    // whatever account the (possibly stale) refresh-token cookie belongs to.
    if (window.location.pathname.startsWith('/oauth2/redirect')) {
      setHydrated();
      return;
    }

    async function bootstrap() {
      await api.get('/api/auth/csrf').catch(() => {});
      // Access token chỉ sống trong memory nên mất sau mỗi lần reload —
      // thử refresh im lặng bằng HttpOnly cookie để khôi phục phiên đăng nhập.
      try {
        const { data } = await api.post<{ data: { accessToken: string } }>('/api/auth/refresh');
        setAccessToken(data.data.accessToken);
        const { data: me } = await api.get<{ data: CurrentUserResponse }>('/api/users/me');
        setUser(toStoreUser(me.data));
      } catch {
        setAccessToken(null);
      }
      setHydrated();
    }
    bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally mount-only, see comment above
  }, []);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <CsrfInit />
      {children}
      {/* bottom-right so stacked toasts never sit over the header's account/login controls */}
      <Toaster theme="dark" position="bottom-right" richColors />
    </QueryClientProvider>
  );
}
