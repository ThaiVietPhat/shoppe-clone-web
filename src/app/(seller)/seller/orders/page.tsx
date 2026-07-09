'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ClipboardList, Truck, PackageCheck, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { SellerOrderSummary } from '@/types/api';
import { pageFrom, PagedResponse } from '@/lib/page';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Pagination } from '@/components/shared/Pagination';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatPrice, formatDateTime, cn } from '@/lib/utils';
import { ORDER_STATUS_LABEL, ORDER_STATUS_CLASS, SELLER_FULFILLMENT_FILTERS, canShipOrder, canDeliverOrder } from '@/lib/orderStatus';
import { useAuthStore } from '@/stores/auth.store';
import { toast } from 'sonner';

function SellerOrdersContent() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const [fulfillmentStatus, setFulfillmentStatus] = useState('');
  const [page, setPage] = useState(0);
  const [shipOrder, setShipOrder] = useState<string | null>(null);
  const [tracking, setTracking] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['seller-orders', fulfillmentStatus, page],
    queryFn: async () => {
      const filterQuery = fulfillmentStatus ? `&fulfillmentStatus=${fulfillmentStatus}` : '';
      const { data } = await api.get<{ data: PagedResponse<SellerOrderSummary> }>(
        `/api/seller/orders?page=${page}&size=20${filterQuery}`
      );
      return pageFrom(data.data);
    },
    enabled: !!user,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['seller-orders'] });

  const ship = useMutation({
    mutationFn: ({ orderId, trackingNumber }: { orderId: string; trackingNumber?: string }) =>
      api.post(`/api/seller/orders/${orderId}/ship`, trackingNumber ? { trackingNumber } : {}),
    onSuccess: () => { toast.success('Đã chuyển sang trạng thái giao hàng'); invalidate(); setShipOrder(null); setTracking(''); },
    onError: () => toast.error('Thao tác thất bại'),
  });

  const deliver = useMutation({
    mutationFn: (orderId: string) => api.post(`/api/seller/orders/${orderId}/deliver`),
    onSuccess: () => { toast.success('Đã đánh dấu giao thành công'); invalidate(); },
    onError: () => toast.error('Thao tác thất bại'),
  });

  return (
    <div>
      <h1 className="text-lg font-semibold text-foreground mb-4">Đơn hàng</h1>

      <div className="flex flex-wrap gap-2 mb-5 border-b border-white/8 pb-3">
        {SELLER_FULFILLMENT_FILTERS.map((f) => (
          <button key={f.value} onClick={() => { setFulfillmentStatus(f.value); setPage(0); }}
            className={cn('text-sm px-3 py-1.5 rounded-lg transition-colors',
              fulfillmentStatus === f.value ? 'bg-primary text-primary-foreground font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-white/5')}>
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl bg-white/5" />)}</div>
      ) : !data || data.content.length === 0 ? (
        <EmptyState icon={ClipboardList} title="Chưa có đơn hàng" />
      ) : (
        <>
          <div className="space-y-3">
            {data.content.map((o) => (
              <div key={o.orderId} className="flex items-center justify-between gap-4 rounded-xl border border-white/8 bg-card p-4">
                <Link href={`/seller/orders/${o.orderId}`} className="min-w-0 hover:opacity-90 transition-opacity">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">#{o.orderId.slice(0, 8)}</span>
                    <Badge className={cn('text-[11px] border', ORDER_STATUS_CLASS[o.status])}>{ORDER_STATUS_LABEL[o.status]}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{o.shippingRecipientName} · {formatDateTime(o.createdAt)}</p>
                  <p className="text-sm font-bold text-primary mt-1">{formatPrice(o.totalAmount)}</p>
                </Link>
                <div className="flex items-center gap-2 shrink-0">
                  {canShipOrder(o.fulfillmentStatus) && (
                    <Button size="sm" className="bg-primary gap-1.5 text-xs" onClick={() => setShipOrder(o.orderId)}>
                      <Truck className="h-3.5 w-3.5" /> Giao hàng
                    </Button>
                  )}
                  {canDeliverOrder(o.fulfillmentStatus) && (
                    <Button size="sm" variant="outline" className="border-primary/40 text-primary gap-1.5 text-xs"
                      disabled={deliver.isPending} onClick={() => deliver.mutate(o.orderId)}>
                      <PackageCheck className="h-3.5 w-3.5" /> Đã giao
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <Pagination className="mt-8" page={data.page} totalPages={data.totalPages} onPageChange={setPage} />
        </>
      )}

      <Dialog open={!!shipOrder} onOpenChange={(v) => !v && setShipOrder(null)}>
        <DialogContent className="bg-card border-white/10">
          <DialogHeader><DialogTitle>Giao hàng</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Nhập mã vận đơn (không bắt buộc).</p>
          <Input value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="VD: GHN123456" className="bg-white/5 border-white/10" />
          <DialogFooter>
            <Button variant="outline" className="border-white/10" onClick={() => setShipOrder(null)}>Đóng</Button>
            <Button className="bg-primary" disabled={ship.isPending}
              onClick={() => shipOrder && ship.mutate({ orderId: shipOrder, trackingNumber: tracking || undefined })}>
              {ship.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Xác nhận giao'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function SellerOrdersPage() {
  return (
    <Suspense fallback={<div className="py-10 text-sm text-muted-foreground">Đang tải…</div>}>
      <SellerOrdersContent />
    </Suspense>
  );
}
