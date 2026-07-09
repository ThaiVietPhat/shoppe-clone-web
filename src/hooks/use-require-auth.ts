'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';

/**
 * Client-side route guard — middleware can't check auth here because the
 * refresh-token cookie's Path=/api/auth means it's never sent on page
 * navigations (see AuthSecurityProperties.AuthCookieProperties on backend).
 * Redirects to /login once bootstrap silent-refresh (isHydrated) settles
 * and no user was restored.
 */
export function useRequireAuth() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isHydrated } = useAuthStore();

  useEffect(() => {
    if (isHydrated && !user) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [isHydrated, user, pathname, router]);

  return { ready: isHydrated && !!user };
}
