'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bell, Package, Truck, PackageCheck, CheckCircle2, XCircle, Star, CheckCheck,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Notification } from '@/types/api';
import { pageFrom, PagedResponse } from '@/lib/page';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { Pagination } from '@/components/shared/Pagination';
import { formatRelative, cn } from '@/lib/utils';

const TYPE_ICON: Record<string, typeof Bell> = {
  ORDER_CONFIRMED: CheckCircle2,
  ORDER_SHIPPED: Truck,
  ORDER_DELIVERED: PackageCheck,
  ORDER_COMPLETED: Package,
  ORDER_CANCELLED: XCircle,
  REVIEW_REMINDER: Star,
};

export default function NotificationsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', unreadOnly, page],
    queryFn: async () => {
      const { data } = await api.get<{ data: PagedResponse<Notification> }>(
        `/api/notifications?page=${page}&size=20&unreadOnly=${unreadOnly}`
      );
      return pageFrom(data.data);
    },
  });

  const markRead = useMutation({
    mutationFn: (id: string) => api.post(`/api/notifications/${id}/read`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['unread-count'] });
    },
  });

  const markAll = useMutation({
    mutationFn: () => api.post('/api/notifications/read-all'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['unread-count'] });
    },
  });

  function handleClick(n: Notification) {
    if (!n.read) markRead.mutate(n.notificationId);
    if (n.metadata?.orderId) router.push(`/orders/${n.metadata.orderId}`);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold text-foreground">Thông báo</h1>
        <Button variant="ghost" size="sm" className="text-primary gap-1.5 text-xs" onClick={() => markAll.mutate()}>
          <CheckCheck className="h-4 w-4" /> Đánh dấu đã đọc tất cả
        </Button>
      </div>

      <div className="flex gap-2 mb-4">
        {[{ v: false, l: 'Tất cả' }, { v: true, l: 'Chưa đọc' }].map((f) => (
          <button key={String(f.v)} onClick={() => { setUnreadOnly(f.v); setPage(0); }}
            className={cn('text-sm px-3 py-1.5 rounded-lg transition-colors',
              unreadOnly === f.v ? 'bg-primary text-primary-foreground font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-white/5')}>
            {f.l}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl bg-white/5" />)}</div>
      ) : !data || data.content.length === 0 ? (
        <EmptyState icon={Bell} title="Không có thông báo" />
      ) : (
        <>
          <div className="space-y-2">
            {data.content.map((n) => {
              const Icon = TYPE_ICON[n.type] ?? Bell;
              return (
                <button key={n.notificationId} onClick={() => handleClick(n)}
                  className={cn('flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-colors',
                    n.read ? 'border-white/8 bg-card hover:bg-white/3' : 'border-primary/20 bg-primary/5 hover:bg-primary/10')}>
                  <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', n.read ? 'bg-white/5 text-muted-foreground' : 'bg-primary/15 text-primary')}>
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm', n.read ? 'text-foreground' : 'text-foreground font-medium')}>{n.title}</p>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">{n.body}</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">{formatRelative(n.createdAt)}</p>
                  </div>
                  {!n.read && <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-2" />}
                </button>
              );
            })}
          </div>
          <Pagination className="mt-8" page={data.page} totalPages={data.totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
