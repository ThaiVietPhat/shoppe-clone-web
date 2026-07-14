'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Ban, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/error';
import { AdminUser } from '@/types/api';
import { pageFrom, PagedResponse } from '@/lib/page';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination } from '@/components/shared/Pagination';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatDateTime, cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { toast } from 'sonner';

const STATUS_CLASS: Record<string, string> = {
  ACTIVE: 'bg-green-500/15 text-green-400 border-green-500/20',
  PENDING_VERIFICATION: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  INACTIVE: 'bg-white/10 text-muted-foreground border-white/15',
  LOCKED: 'bg-red-500/15 text-red-400 border-red-500/20',
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Hoạt động',
  PENDING_VERIFICATION: 'Chưa xác minh',
  INACTIVE: 'Ngừng hoạt động',
  LOCKED: 'Đã khoá',
};

export default function AdminUsersPage() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', page],
    queryFn: async () => {
      const { data } = await api.get<{ data: PagedResponse<AdminUser> }>(
        `/api/admin/users?page=${page}&size=20`
      );
      return pageFrom(data.data);
    },
    enabled: !!user,
  });

  const toggleBan = useMutation({
    mutationFn: ({ id, ban }: { id: string; ban: boolean }) =>
      api.post(`/api/admin/users/${id}/${ban ? 'ban' : 'unban'}`),
    onSuccess: (_d, vars) => {
      toast.success(vars.ban ? 'Đã khoá tài khoản' : 'Đã mở khoá tài khoản');
      qc.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (err: unknown) => {
      toast.error(getApiErrorMessage(err, 'Thao tác thất bại'));
    },
  });

  return (
    <div>
      <h1 className="text-lg font-semibold text-foreground mb-5">Người dùng</h1>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl bg-white/5" />)}</div>
      ) : !data || data.content.length === 0 ? (
        <EmptyState icon={Users} title="Chưa có người dùng" />
      ) : (
        <>
          <div className="space-y-3">
            {data.content.map((u) => (
              <div key={u.id} className="flex items-center gap-4 rounded-xl border border-white/8 bg-card p-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium line-clamp-1">{u.email}</p>
                    <Badge variant="outline" className="text-[10px] border-white/15">{u.role}</Badge>
                    <Badge className={cn('text-[10px] border shrink-0', STATUS_CLASS[u.status] ?? STATUS_CLASS.INACTIVE)}>
                      {STATUS_LABEL[u.status] ?? u.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">Tạo lúc {formatDateTime(u.createdAt)}</p>
                </div>
                <div className="shrink-0">
                  {u.status === 'LOCKED' ? (
                    <Button size="sm" variant="outline" className="border-primary/40 text-primary gap-1 text-xs"
                      disabled={toggleBan.isPending}
                      onClick={() => toggleBan.mutate({ id: u.id, ban: false })}>
                      <CheckCircle2 className="h-3.5 w-3.5" /> Mở khoá
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" className="border-destructive/40 text-destructive gap-1 text-xs"
                      disabled={toggleBan.isPending}
                      onClick={() => toggleBan.mutate({ id: u.id, ban: true })}>
                      <Ban className="h-3.5 w-3.5" /> Khoá
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
