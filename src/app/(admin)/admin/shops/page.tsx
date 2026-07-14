'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Store, Ban, CheckCircle2, ShieldCheck } from 'lucide-react';
import { api } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/error';
import { AdminShop } from '@/types/api';
import { pageFrom, PagedResponse } from '@/lib/page';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination } from '@/components/shared/Pagination';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatDateTime, cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { toast } from 'sonner';

export default function AdminShopsPage() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-shops', page],
    queryFn: async () => {
      const { data } = await api.get<{ data: PagedResponse<AdminShop> }>(
        `/api/admin/shops?page=${page}&size=20`
      );
      return pageFrom(data.data);
    },
    enabled: !!user,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin-shops'] });

  const toggleSuspend = useMutation({
    mutationFn: ({ id, suspend }: { id: string; suspend: boolean }) =>
      api.post(`/api/admin/shops/${id}/${suspend ? 'suspend' : 'reinstate'}`),
    onSuccess: (_d, vars) => {
      toast.success(vars.suspend ? 'Đã đình chỉ shop' : 'Đã khôi phục shop');
      invalidate();
    },
    onError: (err: unknown) => toast.error(getApiErrorMessage(err, 'Thao tác thất bại')),
  });

  const verify = useMutation({
    mutationFn: (id: string) => api.post(`/api/admin/shops/${id}/verify`),
    onSuccess: () => {
      toast.success('Đã xác minh shop');
      invalidate();
    },
    onError: (err: unknown) => toast.error(getApiErrorMessage(err, 'Thao tác thất bại')),
  });

  return (
    <div>
      <h1 className="text-lg font-semibold text-foreground mb-5">Shop</h1>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl bg-white/5" />)}</div>
      ) : !data || data.content.length === 0 ? (
        <EmptyState icon={Store} title="Chưa có shop" />
      ) : (
        <>
          <div className="space-y-3">
            {data.content.map((s) => (
              <div key={s.id} className="flex items-center gap-4 rounded-xl border border-white/8 bg-card p-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium line-clamp-1">{s.name}</p>
                    {s.verified && (
                      <Badge className="text-[10px] border bg-blue-500/15 text-blue-400 border-blue-500/20">Đã xác minh</Badge>
                    )}
                    <Badge className={cn(
                      'text-[10px] border shrink-0',
                      s.status === 'SUSPENDED'
                        ? 'bg-red-500/15 text-red-400 border-red-500/20'
                        : 'bg-green-500/15 text-green-400 border-green-500/20'
                    )}>
                      {s.status === 'SUSPENDED' ? 'Đã đình chỉ' : 'Hoạt động'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">Tạo lúc {formatDateTime(s.createdAt)}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!s.verified && (
                    <Button size="sm" variant="outline" className="border-white/10 gap-1 text-xs"
                      disabled={verify.isPending}
                      onClick={() => verify.mutate(s.id)}>
                      <ShieldCheck className="h-3.5 w-3.5" /> Xác minh
                    </Button>
                  )}
                  {s.status === 'SUSPENDED' ? (
                    <Button size="sm" variant="outline" className="border-primary/40 text-primary gap-1 text-xs"
                      disabled={toggleSuspend.isPending}
                      onClick={() => toggleSuspend.mutate({ id: s.id, suspend: false })}>
                      <CheckCircle2 className="h-3.5 w-3.5" /> Khôi phục
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" className="border-destructive/40 text-destructive gap-1 text-xs"
                      disabled={toggleSuspend.isPending}
                      onClick={() => toggleSuspend.mutate({ id: s.id, suspend: true })}>
                      <Ban className="h-3.5 w-3.5" /> Đình chỉ
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <Pagination className="mt-8" page={data.page} totalPages={data.totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
