'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Heart } from 'lucide-react';
import { api } from '@/lib/api';
import { ProductCardResponse } from '@/types/api';
import { pageFrom, PagedResponse } from '@/lib/page';
import { ProductCard } from '@/components/product/ProductCard';
import { ProductCardSkeleton } from '@/components/product/ProductCardSkeleton';
import { Pagination } from '@/components/shared/Pagination';
import { EmptyState } from '@/components/shared/EmptyState';
import { useAuthStore } from '@/stores/auth.store';
import { useRequireAuth } from '@/hooks/use-require-auth';

export default function WishlistPage() {
  const { user } = useAuthStore();
  const { ready } = useRequireAuth();
  const qc = useQueryClient();
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ['wishlist', page],
    queryFn: async () => {
      const { data } = await api.get<{ data: PagedResponse<ProductCardResponse> }>(
        `/api/wishlist?page=${page}&size=20`
      );
      return pageFrom(data.data);
    },
    enabled: !!user,
  });

  if (!ready) return null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <h1 className="text-lg font-semibold text-foreground mb-5 flex items-center gap-2">
        <Heart className="h-5 w-5 text-primary" /> Sản phẩm yêu thích
      </h1>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}
        </div>
      ) : !data || data.content.length === 0 ? (
        <EmptyState icon={Heart} title="Chưa có sản phẩm yêu thích nào" />
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {data.content.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                wishlisted
                onWishlistChange={(_, w) => !w && qc.invalidateQueries({ queryKey: ['wishlist'] })}
              />
            ))}
          </div>
          <Pagination className="mt-8" page={data.page} totalPages={data.totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
