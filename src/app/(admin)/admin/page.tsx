'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Users, Store, Flag, Ticket } from 'lucide-react';
import { api } from '@/lib/api';
import { pageFrom, PagedResponse } from '@/lib/page';
import { useAuthStore } from '@/stores/auth.store';
import { Skeleton } from '@/components/ui/skeleton';

function useCount(key: string, url: string) {
  const { user } = useAuthStore();
  return useQuery({
    queryKey: [key, 'count'],
    queryFn: async () => {
      const { data } = await api.get<{ data: PagedResponse<unknown> }>(url);
      return pageFrom(data.data).totalElements;
    },
    enabled: !!user,
  });
}

export default function AdminDashboardPage() {
  const users = useCount('admin-users', '/api/admin/users?page=0&size=1');
  const shops = useCount('admin-shops', '/api/admin/shops?page=0&size=1');
  const pendingReports = useCount('admin-reports-pending', '/api/admin/reports?status=PENDING&page=0&size=1');
  const vouchers = useCount('admin-vouchers', '/api/admin/vouchers?page=0&size=1');

  const cards = [
    { label: 'Người dùng', value: users.data, icon: Users, href: '/admin/users' },
    { label: 'Shop', value: shops.data, icon: Store, href: '/admin/shops' },
    { label: 'Báo cáo chờ xử lý', value: pendingReports.data, icon: Flag, href: '/admin/reports' },
    { label: 'Voucher', value: vouchers.data, icon: Ticket, href: '/admin/vouchers' },
  ];

  return (
    <div>
      <h1 className="text-lg font-semibold text-foreground mb-5">Tổng quan</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(({ label, value, icon: Icon, href }) => (
          <Link
            key={label}
            href={href}
            className="rounded-xl border border-white/8 bg-card p-5 hover:border-white/15 transition-colors"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <Icon className="h-4.5 w-4.5 text-primary" />
              </div>
            </div>
            {value === undefined ? (
              <Skeleton className="h-7 w-12 bg-white/5" />
            ) : (
              <p className="text-2xl font-bold text-foreground">{value}</p>
            )}
            <p className="text-sm text-muted-foreground mt-1">{label}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
