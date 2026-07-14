'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Flag, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/error';
import { Report } from '@/types/api';
import { pageFrom, PagedResponse } from '@/lib/page';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Pagination } from '@/components/shared/Pagination';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatDateTime, cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { toast } from 'sonner';

const STATUS_FILTERS = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'PENDING', label: 'Chờ xử lý' },
  { value: 'RESOLVED', label: 'Đã xử lý' },
  { value: 'REJECTED', label: 'Đã từ chối' },
];

const STATUS_CLASS: Record<string, string> = {
  PENDING: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  RESOLVED: 'bg-green-500/15 text-green-400 border-green-500/20',
  REJECTED: 'bg-white/10 text-muted-foreground border-white/15',
};

const REASON_LABEL: Record<string, string> = {
  COUNTERFEIT: 'Hàng giả/nhái',
  PROHIBITED: 'Hàng cấm',
  MISLEADING: 'Thông tin sai lệch',
  ABUSE: 'Lạm dụng/quấy rối',
  OTHER: 'Khác',
};

export default function AdminReportsPage() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const [status, setStatus] = useState('ALL');
  const [page, setPage] = useState(0);
  const [resolving, setResolving] = useState<Report | null>(null);
  const [outcome, setOutcome] = useState<'RESOLVED' | 'REJECTED'>('RESOLVED');
  const [note, setNote] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-reports', status, page],
    queryFn: async () => {
      const statusQuery = status !== 'ALL' ? `&status=${status}` : '';
      const { data } = await api.get<{ data: PagedResponse<Report> }>(
        `/api/admin/reports?page=${page}&size=20${statusQuery}`
      );
      return pageFrom(data.data);
    },
    enabled: !!user,
  });

  const resolve = useMutation({
    mutationFn: () =>
      api.patch(`/api/admin/reports/${resolving!.id}/resolve`, { outcome, note: note || undefined }),
    onSuccess: () => {
      toast.success('Đã xử lý báo cáo');
      qc.invalidateQueries({ queryKey: ['admin-reports'] });
      setResolving(null);
      setNote('');
    },
    onError: (err: unknown) => toast.error(getApiErrorMessage(err, 'Thao tác thất bại')),
  });

  return (
    <div>
      <h1 className="text-lg font-semibold text-foreground mb-5">Báo cáo</h1>

      <div className="flex flex-wrap gap-2 mb-4">
        {STATUS_FILTERS.map((f) => (
          <button key={f.value} onClick={() => { setStatus(f.value); setPage(0); }}
            className={cn('text-sm px-3 py-1.5 rounded-lg transition-colors',
              status === f.value ? 'bg-primary text-primary-foreground font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-white/5')}>
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl bg-white/5" />)}</div>
      ) : !data || data.content.length === 0 ? (
        <EmptyState icon={Flag} title="Không có báo cáo" />
      ) : (
        <>
          <div className="space-y-3">
            {data.content.map((r) => (
              <div key={r.id} className="rounded-xl border border-white/8 bg-card p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] border-white/15">{r.targetType}</Badge>
                      <Badge variant="outline" className="text-[10px] border-white/15">{REASON_LABEL[r.reasonCategory] ?? r.reasonCategory}</Badge>
                      <Badge className={cn('text-[10px] border', STATUS_CLASS[r.status])}>{r.status}</Badge>
                    </div>
                    {r.description && <p className="text-sm text-foreground mt-2 line-clamp-2">{r.description}</p>}
                    {r.resolutionNote && (
                      <p className="text-xs text-muted-foreground mt-2">Ghi chú xử lý: {r.resolutionNote}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">Báo cáo lúc {formatDateTime(r.createdAt)}</p>
                  </div>
                  {r.status === 'PENDING' && (
                    <Button size="sm" className="bg-primary shrink-0" onClick={() => { setResolving(r); setOutcome('RESOLVED'); setNote(''); }}>
                      Xử lý
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <Pagination className="mt-8" page={data.page} totalPages={data.totalPages} onPageChange={setPage} />
        </>
      )}

      <Dialog open={!!resolving} onOpenChange={(v) => !v && setResolving(null)}>
        <DialogContent className="bg-card border-white/10">
          <DialogHeader><DialogTitle>Xử lý báo cáo</DialogTitle></DialogHeader>

          <div className="flex gap-2 py-2">
            <button
              onClick={() => setOutcome('RESOLVED')}
              className={cn('flex-1 text-sm px-3 py-2 rounded-lg border transition-colors',
                outcome === 'RESOLVED' ? 'border-primary bg-primary/10 text-primary' : 'border-white/10 text-muted-foreground')}
            >
              Xác nhận vi phạm
            </button>
            <button
              onClick={() => setOutcome('REJECTED')}
              className={cn('flex-1 text-sm px-3 py-2 rounded-lg border transition-colors',
                outcome === 'REJECTED' ? 'border-destructive bg-destructive/10 text-destructive' : 'border-white/10 text-muted-foreground')}
            >
              Từ chối báo cáo
            </button>
          </div>

          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ghi chú xử lý (tuỳ chọn)..."
            rows={3}
            className="bg-white/5 border-white/10 resize-none"
          />

          <DialogFooter>
            <Button onClick={() => resolve.mutate()} disabled={resolve.isPending} className="bg-primary">
              {resolve.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Xác nhận'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
