'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShoppingCart, Trash2, Minus, Plus, Store } from 'lucide-react';
import { useCart, useCartMutations } from '@/hooks/use-cart';
import { CartItem } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatPrice, cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function CartPage() {
  const router = useRouter();
  const { data: cart, isLoading } = useCart();
  const { updateQuantity, removeItem, selectItems, selectAll } = useCartMutations();

  const items = useMemo(() => cart?.items ?? [], [cart]);
  const selectedItems = items.filter((i) => i.selected);
  const allSelected = items.length > 0 && selectedItems.length === items.length;

  const groups = useMemo(() => {
    const map = new Map<string, { shopId: string; shopName: string; items: CartItem[] }>();
    for (const item of items) {
      if (!map.has(item.shopId)) {
        map.set(item.shopId, { shopId: item.shopId, shopName: item.shopName, items: [] });
      }
      map.get(item.shopId)!.items.push(item);
    }
    return Array.from(map.values());
  }, [items]);

  const selectedTotal = selectedItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

  function handleCheckout() {
    if (selectedItems.length === 0) {
      toast.error('Vui lòng chọn sản phẩm để thanh toán');
      return;
    }
    const ineligible = selectedItems.find((i) => !i.checkoutEligible);
    if (ineligible) {
      toast.error(`"${ineligible.productName}" hiện không thể mua`);
      return;
    }
    router.push('/checkout');
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-6 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl bg-white/5" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-6">
        <EmptyState
          icon={ShoppingCart}
          title="Giỏ hàng trống"
          description="Khám phá sản phẩm và thêm vào giỏ hàng của bạn."
          action={<Button onClick={() => router.push('/')} className="bg-primary">Mua sắm ngay</Button>}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-lg font-semibold text-foreground">Giỏ hàng ({items.length})</h1>
        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={(e) => selectAll.mutate(e.target.checked)}
            className="h-4 w-4 accent-primary"
          />
          Chọn tất cả
        </label>
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-6 items-start">
        <div className="space-y-4">
          {groups.map((group) => (
            <div key={group.shopId} className="rounded-xl border border-white/8 bg-card overflow-hidden">
              <Link
                href={`/shops/${group.shopId}`}
                className="flex items-center gap-2 px-4 py-3 border-b border-white/8 text-sm font-medium hover:text-primary transition-colors"
              >
                <Store className="h-4 w-4 text-muted-foreground" />
                {group.shopName}
              </Link>

              <div className="divide-y divide-white/6">
                {group.items.map((item) => (
                  <div key={item.variantId} className="flex items-center gap-3 p-4">
                    <input
                      type="checkbox"
                      checked={item.selected}
                      onChange={(e) =>
                        selectItems.mutate({ variantIds: [item.variantId], selected: e.target.checked })
                      }
                      className="h-4 w-4 accent-primary shrink-0"
                    />

                    <Link
                      href={`/products/${item.productId}`}
                      className="relative h-16 w-16 shrink-0 rounded-lg overflow-hidden bg-white/5"
                    >
                      {item.coverImage?.url ? (
                        <Image src={item.coverImage.url} alt={item.productName} fill sizes="64px" className="object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-muted-foreground/30">
                          <ShoppingCart className="h-5 w-5" />
                        </div>
                      )}
                    </Link>

                    <div className="flex-1 min-w-0">
                      <Link href={`/products/${item.productId}`} className="text-sm font-medium line-clamp-1 hover:text-primary transition-colors">
                        {item.productName}
                      </Link>
                      {item.variantOptions.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {item.variantOptions.map((o) => o.value).join(', ')}
                        </p>
                      )}
                      <p className="text-sm font-bold text-primary mt-1">{formatPrice(item.price)}</p>
                      {!item.checkoutEligible && (
                        <p className="text-xs text-destructive mt-0.5">Sản phẩm không khả dụng</p>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <button
                        onClick={() => removeItem.mutate(item.variantId)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <div className="flex items-center border border-white/10 rounded-lg overflow-hidden">
                        <button
                          onClick={() => updateQuantity.mutate({ variantId: item.variantId, quantity: item.quantity - 1 })}
                          className="px-2 py-1 text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-9 text-center text-sm">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity.mutate({ variantId: item.variantId, quantity: item.quantity + 1 })}
                          disabled={item.quantity >= item.availableStock}
                          className="px-2 py-1 text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="rounded-xl border border-white/8 bg-card p-5 lg:sticky lg:top-20 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Tóm tắt đơn hàng</h2>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Đã chọn</span>
            <span className="text-foreground">{selectedItems.length} sản phẩm</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Tạm tính</span>
            <span className="text-lg font-bold text-primary">{formatPrice(selectedTotal)}</span>
          </div>
          <p className="text-xs text-muted-foreground">Phí vận chuyển tính ở bước thanh toán.</p>
          <Button
            className={cn('w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium')}
            disabled={selectedItems.length === 0}
            onClick={handleCheckout}
          >
            Mua hàng ({selectedItems.length})
          </Button>
        </div>
      </div>
    </div>
  );
}
