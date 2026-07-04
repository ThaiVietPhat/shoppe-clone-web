'use client';

import { Suspense, useState } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Package, ShoppingBag } from 'lucide-react';
import { api } from '@/lib/api';
import { OrderSummary } from '@/types/api';
import { pageFrom, PagedResponse } from '@/lib/page';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination } from '@/components/shared/Pagination';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatPrice, formatDateTime, cn } from '@/lib/utils';
import { ORDER_STATUS_LABEL, ORDER_STATUS_CLASS, ORDER_STATUS_FILTERS } from '@/lib/orderStatus';

function OrdersContent() {
  const router = useRouter();
  const params = useSearchParams();
  const status = params.get('status') ?? '';
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ['buyer-orders', status, page],
    queryFn: async () => {
      const statusQuery = status ? `&status=${status}` : '';
      const { data } = await api.get<{ data: PagedResponse<OrderSummary> }>(
        `/api/buyer/orders?page=${page}&size=20${statusQuery}`
      );
      return pageFrom(data.data);
    },
  });

  function setStatus(s: string) {
    setPage(0);
    router.push(s ? `/orders?status=${s}` : '/orders');
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="text-lg font-semibold text-foreground mb-4">Đơn hàng của tôi</h1>

      <div className="flex flex-wrap gap-2 mb-5 border-b border-white/8 pb-3">
        {ORDER_STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatus(f.value)}
            className={cn(
              'text-sm px-3 py-1.5 rounded-lg transition-colors',
              status === f.value ? 'bg-primary text-primary-foreground font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-xl bg-white/5" />)}
        </div>
      ) : !data || data.content.length === 0 ? (
        <EmptyState icon={ShoppingBag} title="Chưa có đơn hàng nào"
          description="Các đơn hàng của bạn sẽ hiển thị ở đây." />
      ) : (
        <>
          <div className="space-y-3">
            {data.content.map((order) => (
              <button
                key={order.orderId}
                onClick={() => router.push(`/orders/${order.orderId}`)}
                className="block w-full rounded-xl border border-white/8 bg-card p-4 text-left hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-foreground">{order.shopName}</span>
                  <Badge className={cn('text-[11px] border', ORDER_STATUS_CLASS[order.status])}>
                    {ORDER_STATUS_LABEL[order.status]}
                  </Badge>
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative h-14 w-14 shrink-0 rounded-lg overflow-hidden bg-white/5">
                    {order.coverImageUrl ? (
                      <Image src={order.coverImageUrl} alt="" fill sizes="56px" className="object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-muted-foreground/30"><Package className="h-5 w-5" /></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm line-clamp-1 text-foreground">{order.coverProductName ?? `${order.itemCount} sản phẩm`}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {order.itemCount > 1 ? `và ${order.itemCount - 1} sản phẩm khác` : `x${order.coverItemQuantity}`}
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-0.5">{formatDateTime(order.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Tổng tiền</p>
                    <p className="text-base font-bold text-primary">{formatPrice(order.totalAmount)}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
          <Pagination className="mt-8" page={data.page} totalPages={data.totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-4xl px-4 py-10 text-sm text-muted-foreground">Đang tải…</div>}>
      <OrdersContent />
    </Suspense>
  );
}
