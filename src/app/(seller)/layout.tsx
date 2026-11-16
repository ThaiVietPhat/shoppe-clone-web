'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { SellerSidebar } from '@/components/layout/SellerSidebar';
import { useAuthStore } from '@/stores/auth.store';

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isHydrated } = useAuthStore();

  useEffect(() => {
    if (!isHydrated) return;
    if (!user) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname || '/seller/dashboard')}`);
    } else if (user.role !== 'SELLER') {
      router.replace('/');
    }
  }, [isHydrated, user, router, pathname]);

  if (!isHydrated || !user || user.role !== 'SELLER') {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="mx-auto w-full max-w-7xl flex flex-col lg:flex-row gap-6 px-4 py-6 flex-1">
        <SellerSidebar />
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
