'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ProductCard } from '@/components/product/ProductCard';
import { ProductCardSkeleton } from '@/components/product/ProductCardSkeleton';
import { ProductCardResponse, CategoryNode } from '@/types/api';
import { pageFrom, PagedResponse } from '@/lib/page';
import Link from 'next/link';
import { ChevronRight, Zap, TrendingUp, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function HomePage() {
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['homepage-products'],
    queryFn: async () => {
      const { data } = await api.get<{ data: PagedResponse<ProductCardResponse> }>(
        '/api/products/homepage?page=0&size=20'
      );
      return pageFrom(data.data);
    },
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await api.get<{ data: CategoryNode[] }>('/api/categories');
      return data.data;
    },
    staleTime: 30 * 60 * 1000,
  });

  const { data: recommendData } = useQuery({
    queryKey: ['home-recommendations'],
    queryFn: async () => {
      const { data } = await api.get<{ data: PagedResponse<ProductCardResponse> }>('/api/recommendations/home?page=0&size=8');
      return pageFrom(data.data);
    },
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 space-y-10">
      {/* Hero banner */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-950/60 via-black to-black border border-primary/20 p-8 md:p-12">
        <div className="relative z-10 max-w-lg">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium text-primary uppercase tracking-wider">Khám phá ngay</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3 leading-tight">
            Mua sắm thông minh,<br />
            <span className="text-primary">giá tốt mỗi ngày</span>
          </h1>
          <p className="text-muted-foreground text-sm mb-6">
            Hàng ngàn sản phẩm từ các shop uy tín, giao hàng nhanh, thanh toán an toàn.
          </p>
          <Link
            href="/search?q="
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium px-5 py-2.5 rounded-lg transition-colors glow-primary-sm"
          >
            Mua ngay
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Decorative bg */}
        <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-primary/5 to-transparent" />
        <div className="absolute -right-8 -top-8 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -right-4 -bottom-8 h-32 w-32 rounded-full bg-primary/8 blur-2xl" />
      </section>

      {/* Categories */}
      {categories && categories.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <span className="h-4 w-1 bg-primary rounded-full" />
              Danh mục
            </h2>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
            {categories.slice(0, 16).map((cat) => (
              <Link
                key={cat.id}
                href={`/categories/${cat.id}`}
                className="flex flex-col items-center gap-2 p-3 rounded-xl bg-card border border-white/6 hover:border-primary/30 hover:bg-white/3 transition-all group"
              >
                <div className="h-10 w-10 rounded-lg bg-white/5 group-hover:bg-primary/10 transition-colors flex items-center justify-center">
                  <span className="text-lg">{getCategoryEmoji(cat.name)}</span>
                </div>
                <span className="text-[11px] text-muted-foreground group-hover:text-foreground text-center leading-tight line-clamp-2 transition-colors">
                  {cat.name}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* AI Recommendations */}
      {recommendData?.content && recommendData.content.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <span className="h-4 w-1 bg-primary rounded-full" />
              <Sparkles className="h-4 w-4 text-primary" />
              Gợi ý cho bạn
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {recommendData.content.slice(0, 5).map((product: ProductCardResponse) => (
              <ProductCard key={product.productId} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* Homepage products */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <span className="h-4 w-1 bg-primary rounded-full" />
            <TrendingUp className="h-4 w-4 text-primary" />
            Sản phẩm nổi bật
          </h2>
          <Link href="/search?q=" className="text-xs text-primary hover:text-primary/80 flex items-center gap-1">
            Xem tất cả <ChevronRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {productsLoading
            ? Array.from({ length: 10 }).map((_, i) => <ProductCardSkeleton key={i} />)
            : productsData?.content.map((product) => (
                <ProductCard key={product.productId} product={product} />
              ))}
        </div>
      </section>
    </div>
  );
}

function getCategoryEmoji(name: string): string {
  const map: Record<string, string> = {
    'Điện tử': '📱', 'Laptop': '💻', 'Thời trang': '👗', 'Giày dép': '👟',
    'Nhà cửa': '🏠', 'Thực phẩm': '🛒', 'Sách': '📚', 'Thể thao': '⚽',
    'Mỹ phẩm': '💄', 'Đồ chơi': '🧸', 'Ô tô': '🚗', 'Máy tính': '🖥️',
    'Đồng hồ': '⌚', 'Túi xách': '👜', 'Trang sức': '💍',
  };
  for (const [key, emoji] of Object.entries(map)) {
    if (name.toLowerCase().includes(key.toLowerCase())) return emoji;
  }
  return '🏷️';
}
