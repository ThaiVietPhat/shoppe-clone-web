'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { PackageSearch, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';
import { CategoryNode, ProductCardResponse } from '@/types/api';
import { pageFrom, PagedResponse } from '@/lib/page';
import { ProductCard } from '@/components/product/ProductCard';
import { ProductCardSkeleton } from '@/components/product/ProductCardSkeleton';
import { Pagination } from '@/components/shared/Pagination';
import { EmptyState } from '@/components/shared/EmptyState';
import { cn } from '@/lib/utils';

const SORT_OPTIONS = [
  { value: 'NEWEST', label: 'Mới nhất' },
  { value: 'PRICE_ASC', label: 'Giá thấp → cao' },
  { value: 'PRICE_DESC', label: 'Giá cao → thấp' },
];

export default function CategoryPage({ params }: { params: Promise<{ categoryId: string }> }) {
  const { categoryId } = use(params);
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState('NEWEST');

  const { data: categories } = useQuery<CategoryNode[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await api.get<{ data: CategoryNode[] }>('/api/categories');
      return data.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const currentCategory = categories?.find((c) => c.id === categoryId);
  const parentCategory = currentCategory?.parentId
    ? categories?.find((c) => c.id === currentCategory.parentId)
    : undefined;
  const subCategories = categories?.filter((c) => c.parentId === categoryId) ?? [];

  const { data, isLoading } = useQuery({
    queryKey: ['category-products', categoryId, sort, page],
    queryFn: async () => {
      const { data } = await api.get<{ data: PagedResponse<ProductCardResponse> }>(
        `/api/categories/${categoryId}/products?sort=${sort}&page=${page}&size=20`
      );
      return pageFrom(data.data);
    },
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3 flex-wrap">
        <Link href="/" className="hover:text-foreground transition-colors">Trang chủ</Link>
        {parentCategory && (
          <>
            <ChevronRight className="h-3 w-3" />
            <Link href={`/categories/${parentCategory.id}`} className="hover:text-foreground transition-colors">
              {parentCategory.name}
            </Link>
          </>
        )}
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">{currentCategory?.name ?? 'Danh mục'}</span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-lg font-semibold text-foreground">
            {currentCategory?.name ?? 'Sản phẩm theo danh mục'}
          </h1>
          {data && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {data.totalElements.toLocaleString('vi-VN')} sản phẩm
            </p>
          )}
        </div>

        <div className="flex items-center gap-1.5 rounded-lg bg-white/3 border border-white/6 px-2.5 py-1.5 self-start sm:self-auto">
          <span className="text-xs text-muted-foreground mr-1">Sắp xếp:</span>
          {SORT_OPTIONS.map((o) => (
            <button
              key={o.value}
              onClick={() => { setSort(o.value); setPage(0); }}
              className={cn(
                'text-xs px-2.5 py-1 rounded-md transition-colors',
                sort === o.value
                  ? 'bg-primary text-primary-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {subCategories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {subCategories.map((sub) => (
            <Link
              key={sub.id}
              href={`/categories/${sub.id}`}
              className="text-xs px-3 py-1.5 rounded-lg bg-card border border-white/8 text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
            >
              {sub.name}
            </Link>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {Array.from({ length: 10 }).map((_, i) => <ProductCardSkeleton key={i} />)}
        </div>
      ) : !data || data.content.length === 0 ? (
        <EmptyState icon={PackageSearch} title="Danh mục chưa có sản phẩm" />
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {data.content.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
          <Pagination className="mt-8" page={data.page} totalPages={data.totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
