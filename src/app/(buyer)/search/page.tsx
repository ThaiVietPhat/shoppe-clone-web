'use client';

import { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Search as SearchIcon, SlidersHorizontal, AlertTriangle, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import { SearchResult, ProductCardResponse } from '@/types/api';
import { pageFrom, PagedResponse } from '@/lib/page';

// Backend SearchResponse nests the page under `products`, not flat at the top level.
type RawSearch = { products: PagedResponse<ProductCardResponse>; degraded: boolean; degradedReason: string | null };
const toSearchResult = (d: RawSearch): SearchResult => ({ ...pageFrom(d.products), degraded: d.degraded, degradedReason: d.degradedReason });
import { ProductCard } from '@/components/product/ProductCard';
import { ProductCardSkeleton } from '@/components/product/ProductCardSkeleton';
import { Pagination } from '@/components/shared/Pagination';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

// Backend chỉ hỗ trợ 3 giá trị này (ProductSortOrder) — không có sort theo soldCount/rating.
const SORT_OPTIONS = [
  { value: 'RELEVANCE', label: 'Liên quan' },
  { value: 'PRICE_ASC', label: 'Giá thấp → cao' },
  { value: 'PRICE_DESC', label: 'Giá cao → thấp' },
  { value: 'NEWEST', label: 'Mới nhất' },
];

function SearchContent() {
  const router = useRouter();
  const params = useSearchParams();

  const q = params.get('q') ?? '';
  const categoryId = params.get('categoryId') ?? '';
  const sort = params.get('sort') ?? 'RELEVANCE';
  const brand = params.get('brand') ?? '';
  const minPrice = params.get('minPrice') ?? '';
  const maxPrice = params.get('maxPrice') ?? '';
  const semantic = params.get('semantic') === '1';
  const page = Number(params.get('page') ?? '0');

  const [priceMin, setPriceMin] = useState(minPrice);
  const [priceMax, setPriceMax] = useState(maxPrice);

  function updateParams(next: Record<string, string | number | null>) {
    const sp = new URLSearchParams(params.toString());
    Object.entries(next).forEach(([k, v]) => {
      if (v === null || v === '') sp.delete(k);
      else sp.set(k, String(v));
    });
    if (!('page' in next)) sp.set('page', '0');
    router.push(`/search?${sp.toString()}`);
  }

  const { data, isLoading } = useQuery({
    queryKey: ['search', q, categoryId, sort, brand, minPrice, maxPrice, semantic, page],
    queryFn: async () => {
      if (semantic) {
        const { data } = await api.get<{ data: RawSearch }>(
          `/api/search/products/semantic?q=${encodeURIComponent(q)}&page=${page}&size=20`
        );
        return toSearchResult(data.data);
      }
      const sp = new URLSearchParams({ q, sort, page: String(page), size: '20' });
      if (categoryId) sp.set('categoryId', categoryId);
      if (brand) sp.set('brand', brand);
      if (minPrice) sp.set('priceMin', minPrice);
      if (maxPrice) sp.set('priceMax', maxPrice);
      const { data } = await api.get<{ data: RawSearch }>(`/api/search/products?${sp.toString()}`);
      return toSearchResult(data.data);
    },
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-5">
        <h1 className="text-lg font-semibold text-foreground">
          {q ? <>Kết quả cho “<span className="text-primary">{q}</span>”</> : 'Tất cả sản phẩm'}
        </h1>
        {data && (
          <p className="text-sm text-muted-foreground mt-0.5">
            {data.totalElements.toLocaleString('vi-VN')} sản phẩm
          </p>
        )}
      </div>

      {data?.degraded && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Tìm kiếm đang hoạt động ở chế độ rút gọn, kết quả có thể chưa đầy đủ.
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Filters */}
        <aside className="lg:w-60 shrink-0 space-y-5">
          <div className="rounded-xl border border-white/8 bg-card p-4 space-y-5">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <SlidersHorizontal className="h-4 w-4 text-primary" />
              Bộ lọc
            </div>

            <Button
              variant={semantic ? 'default' : 'outline'}
              size="sm"
              className={cn('w-full gap-2 text-xs', semantic ? 'bg-primary' : 'border-white/10')}
              onClick={() => updateParams({ semantic: semantic ? null : '1' })}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Tìm kiếm AI {semantic ? '(bật)' : ''}
            </Button>

            {!semantic && (
              <>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Khoảng giá</p>
                  <div className="flex items-center gap-2">
                    <Input
                      value={priceMin}
                      onChange={(e) => setPriceMin(e.target.value)}
                      placeholder="Từ"
                      inputMode="numeric"
                      className="h-8 text-xs bg-white/5 border-white/10"
                    />
                    <span className="text-muted-foreground">–</span>
                    <Input
                      value={priceMax}
                      onChange={(e) => setPriceMax(e.target.value)}
                      placeholder="Đến"
                      inputMode="numeric"
                      className="h-8 text-xs bg-white/5 border-white/10"
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full mt-2 text-xs border-white/10"
                    onClick={() => updateParams({ minPrice: priceMin || null, maxPrice: priceMax || null })}
                  >
                    Áp dụng
                  </Button>
                </div>
              </>
            )}
          </div>
        </aside>

        {/* Results */}
        <div className="flex-1">
          {/* Sort bar */}
          {!semantic && (
            <div className="flex flex-wrap items-center gap-2 mb-4 rounded-lg bg-white/3 border border-white/6 px-3 py-2">
              <span className="text-xs text-muted-foreground mr-1">Sắp xếp:</span>
              {SORT_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  onClick={() => updateParams({ sort: o.value })}
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
          )}

          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {Array.from({ length: 12 }).map((_, i) => <ProductCardSkeleton key={i} />)}
            </div>
          ) : !data || data.content.length === 0 ? (
            <EmptyState
              icon={SearchIcon}
              title="Không tìm thấy sản phẩm"
              description="Thử từ khoá khác hoặc bỏ bớt bộ lọc."
            />
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {data.content.map((p) => <ProductCard key={p.id} product={p} />)}
              </div>
              <Pagination
                className="mt-8"
                page={data.page}
                totalPages={data.totalPages}
                onPageChange={(p) => updateParams({ page: p })}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-10 text-sm text-muted-foreground">Đang tải…</div>}>
      <SearchContent />
    </Suspense>
  );
}
