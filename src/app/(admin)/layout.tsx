'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { useAuthStore } from '@/stores/auth.store';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isHydrated } = useAuthStore();

  useEffect(() => {
    if (!isHydrated) return;
    if (!user) {
      router.replace('/login?redirect=/admin');
    } else if (user.role !== 'ADMIN') {
      router.replace('/');
    }
  }, [isHydrated, user, router]);

  if (!isHydrated || !user || user.role !== 'ADMIN') {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="mx-auto w-full max-w-7xl flex flex-col lg:flex-row gap-6 px-4 py-6 flex-1">
        <AdminSidebar />
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
