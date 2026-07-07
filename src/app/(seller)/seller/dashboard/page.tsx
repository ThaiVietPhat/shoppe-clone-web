'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Package, PackageCheck, Clock, Truck, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';
import { SellerDashboard } from '@/types/api';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { formatPrice, formatDateTime, cn } from '@/lib/utils';
import { ORDER_STATUS_LABEL, ORDER_STATUS_CLASS } from '@/lib/orderStatus';
import { useAuthStore } from '@/stores/auth.store';

export default function SellerDashboardPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { data, isLoading } = useQuery({
    queryKey: ['seller-dashboard'],
    queryFn: async () => {
      const { data } = await api.get<{ data: SellerDashboard }>('/api/seller/dashboard');
      return data.data;
    },
    enabled: !!user,
  });

  const stats = [
    { label: 'Tổng sản phẩm', value: data?.totalProducts, icon: Package },
    { label: 'Đang bán', value: data?.activeProducts, icon: PackageCheck },
    { label: 'Chờ lấy hàng', value: data?.orderCountsByFulfillmentStatus.READY_TO_SHIP, icon: Clock },
    { label: 'Đang giao', value: data?.orderCountsByFulfillmentStatus.SHIPPED, icon: Truck },
    { label: 'Đã giao', value: data?.orderCountsByFulfillmentStatus.DELIVERED, icon: CheckCircle2 },
  ];

  return (
    <div>
      <h1 className="text-lg font-semibold text-foreground mb-5">Tổng quan</h1>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-white/8 bg-card p-4">
            <s.icon className="h-5 w-5 text-primary mb-2" />
            {isLoading ? <Skeleton className="h-7 w-12 bg-white/5" /> : (
              <p className="text-2xl font-bold text-foreground">{s.value ?? 0}</p>
            )}
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <h2 className="text-base font-semibold text-foreground mb-3">Đơn hàng cần xử lý</h2>
      <div className="rounded-xl border border-white/8 bg-card overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full bg-white/5" />)}
          </div>
        ) : !data || data.latestActionableOrders.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">Không có đơn hàng nào chờ lấy hàng.</p>
        ) : (
          <div className="divide-y divide-white/6">
            {data.latestActionableOrders.map((o) => (
              <button key={o.orderId} onClick={() => router.push(`/seller/orders?highlight=${o.orderId}`)}
                className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-white/3 transition-colors">
                <div>
                  <p className="text-sm text-foreground">{o.shippingRecipientName}</p>
                  <p className="text-xs text-muted-foreground">{o.itemCount} sản phẩm · {formatDateTime(o.createdAt)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-primary">{formatPrice(o.totalAmount)}</span>
                  <Badge className={cn('text-[11px] border', ORDER_STATUS_CLASS[o.status])}>{ORDER_STATUS_LABEL[o.status]}</Badge>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
