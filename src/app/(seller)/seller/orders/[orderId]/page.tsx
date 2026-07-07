'use client';

import { use } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Package, MapPin, ChevronLeft, Loader2, Truck, PackageCheck } from 'lucide-react';
import { api } from '@/lib/api';
import { SellerOrderDetail } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { formatPrice, formatDateTime, cn } from '@/lib/utils';
import { ORDER_STATUS_LABEL, ORDER_STATUS_CLASS, FULFILLMENT_STATUS_LABEL, canShipOrder, canDeliverOrder } from '@/lib/orderStatus';
import { useAuthStore } from '@/stores/auth.store';
import { toast } from 'sonner';

export default function SellerOrderDetailPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = use(params);
  const qc = useQueryClient();
  const { user } = useAuthStore();

  const { data: order, isLoading } = useQuery({
    queryKey: ['seller-order', orderId],
    queryFn: async () => {
      const { data } = await api.get<{ data: SellerOrderDetail }>(`/api/seller/orders/${orderId}`);
      return data.data;
    },
    enabled: !!user,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['seller-order', orderId] });

  const ship = useMutation({
    mutationFn: () => api.post(`/api/seller/orders/${orderId}/ship`),
    onSuccess: () => { toast.success('Đã chuyển sang trạng thái giao hàng'); invalidate(); },
    onError: () => toast.error('Thao tác thất bại'),
  });

  const deliver = useMutation({
    mutationFn: () => api.post(`/api/seller/orders/${orderId}/deliver`),
    onSuccess: () => { toast.success('Đã đánh dấu giao thành công'); invalidate(); },
    onError: () => toast.error('Thao tác thất bại'),
  });

  if (isLoading) {
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
      <Link href="/seller/orders" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
        <ChevronLeft className="h-4 w-4" /> Đơn hàng
      </Link>

      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Đơn hàng #{order.orderId.slice(0, 8)}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{formatDateTime(order.createdAt)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={cn('text-xs border', ORDER_STATUS_CLASS[order.status])}>{ORDER_STATUS_LABEL[order.status]}</Badge>
          {order.fulfillmentStatus && (
            <Badge className="text-xs border bg-white/10 text-muted-foreground border-white/15">
              {FULFILLMENT_STATUS_LABEL[order.fulfillmentStatus]}
            </Badge>
          )}
        </div>
      </div>

      {(canShipOrder(order.paymentStatus, order.fulfillmentStatus) || canDeliverOrder(order.fulfillmentStatus)) && (
        <div className="flex gap-2 mb-4">
          {canShipOrder(order.paymentStatus, order.fulfillmentStatus) && (
            <Button className="bg-primary gap-1.5" disabled={ship.isPending} onClick={() => ship.mutate()}>
              {ship.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Truck className="h-4 w-4" /> Giao hàng</>}
            </Button>
          )}
          {canDeliverOrder(order.fulfillmentStatus) && (
            <Button variant="outline" className="border-primary/40 text-primary gap-1.5" disabled={deliver.isPending} onClick={() => deliver.mutate()}>
              {deliver.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><PackageCheck className="h-4 w-4" /> Đã giao</>}
            </Button>
          )}
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
                <p className="text-xs text-muted-foreground mt-0.5">{item.variantName} · x{item.quantity}</p>
                <p className="text-sm font-medium text-primary mt-0.5">{formatPrice(item.price)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Breakdown */}
      <div className="rounded-xl border border-white/8 bg-card p-5 space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-muted-foreground">Tạm tính</span><span>{formatPrice(order.itemsSubtotal)}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Phí vận chuyển</span><span>{formatPrice(order.shippingFee)}</span></div>
        <Separator className="bg-white/8" />
        <div className="flex justify-between text-base font-bold"><span>Tổng cộng</span><span className="text-primary">{formatPrice(order.totalAmount)}</span></div>
        <p className="text-xs text-muted-foreground pt-1">Thanh toán: {order.paymentMethod ?? '—'} · {order.paymentStatus}</p>
      </div>
    </div>
  );
}
