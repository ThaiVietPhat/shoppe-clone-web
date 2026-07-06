'use client';

import { use, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import { Store, Star, Package, MessageCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { ProductCardResponse, ShopDetail } from '@/types/api';
import { pageFrom, PagedResponse } from '@/lib/page';
import { ProductCard } from '@/components/product/ProductCard';
import { ProductCardSkeleton } from '@/components/product/ProductCardSkeleton';
import { Pagination } from '@/components/shared/Pagination';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/stores/auth.store';
import { toast } from 'sonner';

export default function ShopPage({ params }: { params: Promise<{ shopId: string }> }) {
  const { shopId } = use(params);
  const router = useRouter();
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [page, setPage] = useState(0);

  const { data: shop, isLoading: shopLoading } = useQuery({
    queryKey: ['shop', shopId],
    queryFn: async () => {
      const { data } = await api.get<{ data: ShopDetail }>(`/api/shops/${shopId}`);
      return data.data;
    },
  });

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['shop-products', shopId, page],
    queryFn: async () => {
      const { data } = await api.get<{ data: PagedResponse<ProductCardResponse> }>(
        `/api/shops/${shopId}/products?page=${page}&size=20`
      );
      return pageFrom(data.data);
    },
  });

  async function handleChat() {
    if (!user) { router.push('/login'); return; }
    try {
      const { data } = await api.post('/api/chat/rooms', { shopId });
      qc.invalidateQueries({ queryKey: ['chat-rooms'] });
      router.push(`/chat?roomId=${data.data.id}`);
    } catch {
      toast.error('Không thể mở chat');
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Shop header */}
      {shopLoading ? (
        <Skeleton className="h-40 w-full rounded-2xl bg-white/5 mb-6" />
      ) : shop ? (
        <div className="relative overflow-hidden rounded-2xl border border-white/8 bg-card mb-6">
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-4 p-6">
            <div className="h-20 w-20 rounded-2xl bg-primary/20 flex items-center justify-center overflow-hidden shrink-0">
              {shop.logo ? (
                <Image src={shop.logo.publicUrl} alt={shop.name} width={80} height={80} className="object-cover" />
              ) : (
                <Store className="h-9 w-9 text-primary" />
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-foreground">{shop.name}</h1>
              {shop.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2 max-w-xl">{shop.description}</p>
              )}
              <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  {shop.rating.toFixed(1)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Package className="h-4 w-4" /> {products?.totalElements ?? 0} sản phẩm
                </span>
              </div>
            </div>
            <Button variant="outline" className="border-white/10 gap-2" onClick={handleChat}>
              <MessageCircle className="h-4 w-4" /> Chat với shop
            </Button>
          </div>
        </div>
      ) : (
        <EmptyState icon={Store} title="Không tìm thấy shop" />
      )}

      {/* Products */}
      <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
        <span className="h-4 w-1 bg-primary rounded-full" />
        Sản phẩm của shop
      </h2>

      {productsLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {Array.from({ length: 10 }).map((_, i) => <ProductCardSkeleton key={i} />)}
        </div>
      ) : !products || products.content.length === 0 ? (
        <EmptyState icon={Package} title="Shop chưa có sản phẩm" />
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {products.content.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
          <Pagination className="mt-8" page={products.page} totalPages={products.totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
