'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RotateCcw, Check, X, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/error';
import { ReturnRequestDetail, ReturnStatus } from '@/types/api';
import { pageFrom, PagedResponse } from '@/lib/page';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Pagination } from '@/components/shared/Pagination';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatPrice, formatDateTime, cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { toast } from 'sonner';

const STATUS_LABEL: Record<ReturnStatus, string> = {
  REQUESTED: 'Chờ xử lý',
  APPROVED: 'Đã chấp nhận',
  REJECTED: 'Đã từ chối',
};

const STATUS_CLASS: Record<ReturnStatus, string> = {
  REQUESTED: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  APPROVED: 'bg-green-500/15 text-green-400 border-green-500/20',
  REJECTED: 'bg-destructive/15 text-destructive border-destructive/20',
};

const REASON_LABEL: Record<string, string> = {
  DEFECTIVE: 'Sản phẩm lỗi',
  WRONG_ITEM: 'Giao sai sản phẩm',
  NOT_AS_DESCRIBED: 'Không đúng mô tả',
  CHANGED_MIND: 'Đổi ý',
  OTHER: 'Khác',
};

const FILTERS: { value: ReturnStatus | ''; label: string }[] = [
  { value: '', label: 'Tất cả' },
  { value: 'REQUESTED', label: 'Chờ xử lý' },
  { value: 'APPROVED', label: 'Đã chấp nhận' },
  { value: 'REJECTED', label: 'Đã từ chối' },
];

export default function SellerReturnsPage() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const [status, setStatus] = useState<ReturnStatus | ''>('');
  const [page, setPage] = useState(0);
  const [resolving, setResolving] = useState<{ id: string; action: 'approve' | 'reject' } | null>(null);
  const [note, setNote] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['seller-returns', status, page],
    queryFn: async () => {
      const filterQuery = status ? `&status=${status}` : '';
      const { data } = await api.get<{ data: PagedResponse<ReturnRequestDetail> }>(
        `/api/seller/returns?page=${page}&size=20${filterQuery}`
      );
      return pageFrom(data.data);
    },
    enabled: !!user,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['seller-returns'] });

  const resolve = useMutation({
    mutationFn: ({ id, action, resolutionNote }: { id: string; action: 'approve' | 'reject'; resolutionNote: string }) =>
      api.post(`/api/seller/returns/${id}/${action}`, { resolutionNote: resolutionNote || undefined }),
    onSuccess: (_d, vars) => {
      toast.success(vars.action === 'approve' ? 'Đã chấp nhận yêu cầu trả hàng' : 'Đã từ chối yêu cầu trả hàng');
      setResolving(null);
      setNote('');
      invalidate();
    },
    onError: (err: unknown) => toast.error(getApiErrorMessage(err, 'Thao tác thất bại')),
  });

  return (
    <div>
      <h1 className="text-lg font-semibold text-foreground mb-4">Trả hàng / Hoàn tiền</h1>

      <div className="flex flex-wrap gap-2 mb-5 border-b border-white/8 pb-3">
        {FILTERS.map((f) => (
          <button key={f.value} onClick={() => { setStatus(f.value); setPage(0); }}
            className={cn('text-sm px-3 py-1.5 rounded-lg transition-colors',
              status === f.value ? 'bg-primary text-primary-foreground font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-white/5')}>
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl bg-white/5" />)}</div>
      ) : !data || data.content.length === 0 ? (
        <EmptyState icon={RotateCcw} title="Chưa có yêu cầu trả hàng" />
      ) : (
        <>
          <div className="space-y-3">
            {data.content.map((r) => (
              <div key={r.id} className="rounded-xl border border-white/8 bg-card p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">Đơn #{r.orderId.slice(0, 8)}</span>
                      <Badge className={cn('text-[11px] border', STATUS_CLASS[r.status])}>{STATUS_LABEL[r.status]}</Badge>
                    </div>
                    <p className="text-sm text-foreground mt-1">{REASON_LABEL[r.reasonCategory] ?? r.reasonCategory}</p>
                    {r.description && <p className="text-xs text-muted-foreground mt-0.5">{r.description}</p>}
                    <p className="text-xs text-muted-foreground mt-1">{formatDateTime(r.requestedAt)}</p>
                    {r.refundAmount != null && (
                      <p className="text-sm font-bold text-primary mt-1">Hoàn tiền: {formatPrice(r.refundAmount)}</p>
                    )}
                    {r.resolutionNote && (
                      <p className="text-xs text-muted-foreground mt-1 italic">Ghi chú: {r.resolutionNote}</p>
                    )}
                  </div>
                  {r.status === 'REQUESTED' && (
                    <div className="flex items-center gap-2 shrink-0">
                      <Button size="sm" className="bg-primary gap-1.5 text-xs"
                        onClick={() => setResolving({ id: r.id, action: 'approve' })}>
                        <Check className="h-3.5 w-3.5" /> Chấp nhận
                      </Button>
                      <Button size="sm" variant="outline" className="border-destructive/40 text-destructive gap-1.5 text-xs"
                        onClick={() => setResolving({ id: r.id, action: 'reject' })}>
                        <X className="h-3.5 w-3.5" /> Từ chối
                      </Button>
                    </div>
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
          <DialogHeader>
            <DialogTitle>{resolving?.action === 'approve' ? 'Chấp nhận yêu cầu trả hàng' : 'Từ chối yêu cầu trả hàng'}</DialogTitle>
          </DialogHeader>
          {resolving?.action === 'approve' && (
            <p className="text-sm text-muted-foreground">
              Buyer sẽ được hoàn tiền vào ví, kho hàng sẽ được cộng lại tương ứng.
            </p>
          )}
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3}
            placeholder="Ghi chú (không bắt buộc)..." className="bg-white/5 border-white/10 resize-none" />
          <DialogFooter>
            <Button variant="outline" className="border-white/10" onClick={() => setResolving(null)}>Đóng</Button>
            <Button className={resolving?.action === 'approve' ? 'bg-primary' : 'bg-destructive hover:bg-destructive/90'}
              disabled={resolve.isPending}
              onClick={() => resolving && resolve.mutate({ id: resolving.id, action: resolving.action, resolutionNote: note })}>
              {resolve.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Xác nhận'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
