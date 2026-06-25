'use client';

import { use, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PackageSearch } from 'lucide-react';
import { api } from '@/lib/api';
import { Page, ProductCardResponse } from '@/types/api';
import { ProductCard } from '@/components/product/ProductCard';
import { ProductCardSkeleton } from '@/components/product/ProductCardSkeleton';
import { Pagination } from '@/components/shared/Pagination';
import { EmptyState } from '@/components/shared/EmptyState';

export default function CategoryPage({ params }: { params: Promise<{ categoryId: string }> }) {
  const { categoryId } = use(params);
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ['category-products', categoryId, page],
    queryFn: async () => {
      const { data } = await api.get<{ data: Page<ProductCardResponse> }>(
        `/api/categories/${categoryId}/products?page=${page}&size=20`
      );
      return data.data;
    },
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <h1 className="text-lg font-semibold text-foreground mb-5">Sản phẩm theo danh mục</h1>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {Array.from({ length: 10 }).map((_, i) => <ProductCardSkeleton key={i} />)}
        </div>
      ) : !data || data.content.length === 0 ? (
        <EmptyState icon={PackageSearch} title="Danh mục chưa có sản phẩm" />
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {data.content.map((p) => <ProductCard key={p.productId} product={p} />)}
          </div>
          <Pagination className="mt-8" page={data.page} totalPages={data.totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
