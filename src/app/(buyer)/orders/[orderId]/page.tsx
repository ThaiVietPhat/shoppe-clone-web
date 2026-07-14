'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Package, MapPin, ChevronLeft, Loader2, Star, CheckCircle2, RotateCcw } from 'lucide-react';
import { api } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/error';
import { OrderDetail, ReturnRequestDetail } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ReviewDialog } from '@/components/order/ReviewDialog';
import { ReturnRequestDialog } from '@/components/order/ReturnRequestDialog';
import { formatPrice, formatDateTime, cn } from '@/lib/utils';
import { ORDER_STATUS_LABEL, ORDER_STATUS_CLASS, TIMELINE_EVENT_LABEL, canCancelOrder, canReviewOrder } from '@/lib/orderStatus';
import { useAuthStore } from '@/stores/auth.store';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { toast } from 'sonner';

const RETURN_STATUS_LABEL: Record<string, string> = {
  REQUESTED: 'Đang chờ shop xử lý',
  APPROVED: 'Đã chấp nhận — tiền đã hoàn vào ví',
  REJECTED: 'Đã bị từ chối',
};

const RETURN_STATUS_CLASS: Record<string, string> = {
  REQUESTED: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  APPROVED: 'bg-green-500/15 text-green-400 border-green-500/20',
  REJECTED: 'bg-destructive/15 text-destructive border-destructive/20',
};

export default function OrderDetailPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = use(params);
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const { ready } = useRequireAuth();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [reviewItem, setReviewItem] = useState<{ orderItemId: string; productName: string } | null>(null);
  const [returnOpen, setReturnOpen] = useState(false);

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => {
      const { data } = await api.get<{ data: OrderDetail }>(`/api/buyer/orders/${orderId}`);
      return data.data;
    },
    enabled: !!user,
  });

  const { data: returnRequest } = useQuery({
    queryKey: ['order-return', orderId],
    queryFn: async () => {
      const { data } = await api.get<{ data: ReturnRequestDetail | null }>(`/api/buyer/orders/${orderId}/return`);
      return data.data;
    },
    enabled: !!user && order?.status === 'DELIVERED',
  });

  const cancel = useMutation({
    mutationFn: () => api.post(`/api/buyer/orders/${orderId}/cancel`, { reason: cancelReason }),
    onSuccess: () => {
      toast.success('Đã huỷ đơn hàng');
      qc.invalidateQueries({ queryKey: ['order', orderId] });
      qc.invalidateQueries({ queryKey: ['buyer-orders'] });
      setCancelOpen(false);
    },
    onError: (err: unknown) => {
      toast.error(getApiErrorMessage(err, 'Không thể huỷ đơn'));
    },
  });

  if (!ready || isLoading) {
    return <div className="mx-auto max-w-3xl px-4 py-6 space-y-4">
      <Skeleton className="h-8 w-40 bg-white/5" />
      <Skeleton className="h-32 w-full rounded-xl bg-white/5" />
      <Skeleton className="h-48 w-full rounded-xl bg-white/5" />
    </div>;
  }

  if (!order) {
    return <div className="mx-auto max-w-3xl px-4 py-20 text-center text-muted-foreground">Không tìm thấy đơn hàng.</div>;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <Link href="/orders" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
        <ChevronLeft className="h-4 w-4" /> Đơn hàng của tôi
      </Link>

      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Đơn hàng #{order.orderId.slice(0, 8)}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{order.shopName}</p>
        </div>
        <Badge className={cn('text-xs border', ORDER_STATUS_CLASS[order.status])}>{ORDER_STATUS_LABEL[order.status]}</Badge>
      </div>

      {/* Timeline (backend returns chronological order; show newest first) */}
      {order.timeline.length > 0 && (
        <div className="rounded-xl border border-white/8 bg-card p-5 mb-4">
          <div className="space-y-4">
            {[...order.timeline].reverse().map((t, i, arr) => (
              <div key={`${t.event}-${i}`} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={cn('h-2.5 w-2.5 rounded-full', i === 0 ? 'bg-primary' : 'bg-white/30')} />
                  {i < arr.length - 1 && <div className="w-px flex-1 bg-white/10 my-1" />}
                </div>
                <div className="pb-1">
                  <p className={cn('text-sm', i === 0 ? 'text-foreground font-medium' : 'text-muted-foreground')}>{TIMELINE_EVENT_LABEL[t.event] ?? t.event}</p>
                  <p className="text-xs text-muted-foreground/70">{formatDateTime(t.occurredAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Address */}
      <div className="rounded-xl border border-white/8 bg-card p-5 mb-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2">
          <MapPin className="h-4 w-4 text-primary" /> Địa chỉ giao hàng
        </h2>
        <p className="text-sm text-foreground">{order.shippingRecipientName} · {order.shippingPhone}</p>
        <p className="text-sm text-muted-foreground mt-0.5">
          {order.shippingAddressLine}, {order.shippingWardName}, {order.shippingDistrictName}, {order.shippingProvinceName}
        </p>
      </div>

      {/* Items */}
      <div className="rounded-xl border border-white/8 bg-card overflow-hidden mb-4">
        <div className="divide-y divide-white/6">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center gap-3 p-4">
              <div className="relative h-14 w-14 shrink-0 rounded-lg overflow-hidden bg-white/5 flex items-center justify-center text-muted-foreground/30">
                <Package className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm line-clamp-1">{item.productName}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {item.variantName} · x{item.quantity}
                </p>
                <p className="text-sm font-medium text-primary mt-0.5">{formatPrice(item.price)}</p>
              </div>
              {canReviewOrder(order.status) && (
                item.reviewed ? (
                  <span className="flex items-center gap-1 text-xs text-green-400 shrink-0"><CheckCircle2 className="h-3.5 w-3.5" /> Đã đánh giá</span>
                ) : (
                  <Button size="sm" variant="outline" className="border-primary/40 text-primary gap-1 text-xs shrink-0"
                    onClick={() => setReviewItem({ orderItemId: item.id, productName: item.productName })}>
                    <Star className="h-3.5 w-3.5" /> Đánh giá
                  </Button>
                )
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Breakdown */}
      <div className="rounded-xl border border-white/8 bg-card p-5 mb-4 space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-muted-foreground">Tạm tính</span><span>{formatPrice(order.itemsSubtotal)}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Phí vận chuyển</span><span>{formatPrice(order.shippingFee)}</span></div>
        {!!order.discountAmount && (
          <div className="flex justify-between"><span className="text-muted-foreground">Giảm giá</span><span>-{formatPrice(order.discountAmount)}</span></div>
        )}
        <Separator className="bg-white/8" />
        <div className="flex justify-between text-base font-bold"><span>Tổng cộng</span><span className="text-primary">{formatPrice(order.totalAmount)}</span></div>
        <p className="text-xs text-muted-foreground pt-1">Thanh toán: {order.paymentMethod ?? '—'} · {order.paymentStatus}</p>
      </div>

      {canCancelOrder(order.status) && (
        <Button variant="outline" className="w-full border-destructive/30 text-destructive hover:bg-destructive/10" onClick={() => setCancelOpen(true)}>
          Huỷ đơn hàng
        </Button>
      )}

      {/* Return/refund */}
      {order.status === 'DELIVERED' && (
        returnRequest ? (
          <div className="rounded-xl border border-white/8 bg-card p-5 mb-4">
            <div className="flex items-center gap-2 mb-1">
              <RotateCcw className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Yêu cầu trả hàng/hoàn tiền</h2>
              <Badge className={cn('text-[11px] border ml-auto', RETURN_STATUS_CLASS[returnRequest.status])}>
                {RETURN_STATUS_LABEL[returnRequest.status] ?? returnRequest.status}
              </Badge>
            </div>
            {returnRequest.refundAmount != null && (
              <p className="text-sm font-bold text-primary mt-2">Số tiền hoàn: {formatPrice(returnRequest.refundAmount)}</p>
            )}
            {returnRequest.resolutionNote && (
              <p className="text-xs text-muted-foreground mt-1 italic">Ghi chú từ shop: {returnRequest.resolutionNote}</p>
            )}
          </div>
        ) : (
          <Button variant="outline" className="w-full border-primary/40 text-primary hover:bg-primary/10 gap-1.5" onClick={() => setReturnOpen(true)}>
            <RotateCcw className="h-4 w-4" /> Yêu cầu trả hàng/hoàn tiền
          </Button>
        )
      )}

      {/* Cancel dialog */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="bg-card border-white/10">
          <DialogHeader><DialogTitle>Huỷ đơn hàng</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Vui lòng cho biết lý do huỷ đơn.</p>
          <Textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} rows={3}
            placeholder="Lý do huỷ..." className="bg-white/5 border-white/10 resize-none" />
          <DialogFooter>
            <Button variant="outline" className="border-white/10" onClick={() => setCancelOpen(false)}>Đóng</Button>
            <Button variant="outline" className="border-destructive/30 text-destructive hover:bg-destructive/10"
              disabled={cancel.isPending} onClick={() => cancel.mutate()}>
              {cancel.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Xác nhận huỷ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ReturnRequestDialog open={returnOpen} onOpenChange={setReturnOpen} orderId={orderId} />

      {reviewItem && (
        <ReviewDialog
          open={!!reviewItem}
          onOpenChange={(v) => !v && setReviewItem(null)}
          orderItemId={reviewItem.orderItemId}
          productName={reviewItem.productName}
          orderId={orderId}
        />
      )}
    </div>
  );
}
