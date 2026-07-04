'use client';

import { use, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Star, ShoppingCart, MessageCircle, Store, ChevronRight,
  Minus, Plus, Shield, Truck, RotateCcw, ZoomIn,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { ProductDetail, ProductVariant, ProductReviewListResponse } from '@/types/api';
import { pageFrom } from '@/lib/page';
import { cn, formatPrice, formatRelative, getStockStatus } from '@/lib/utils';
import { toast } from 'sonner';
import Link from 'next/link';

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = use(params);
  const router = useRouter();
  const { user } = useAuthStore();

  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', productId],
    queryFn: async () => {
      const { data } = await api.get<{ data: ProductDetail }>(`/api/products/${productId}`);
      return data.data;
    },
  });

  const { data: reviewsData } = useQuery({
    queryKey: ['product-reviews', productId],
    queryFn: async () => {
      const { data } = await api.get<{ data: ProductReviewListResponse }>(
        `/api/products/${productId}/reviews?page=0&size=10`
      );
      return { ...pageFrom(data.data.reviews), ratingAvg: data.data.ratingAvg, ratingCount: data.data.ratingCount };
    },
    enabled: !!product,
  });

  // Build option groups từ variants (optionLabels là map name -> value cho mỗi variant)
  const optionGroups = product
    ? Object.entries(
        product.variants.reduce<Record<string, Set<string>>>((acc, v) => {
          Object.entries(v.optionLabels).forEach(([name, value]) => {
            if (!acc[name]) acc[name] = new Set();
            acc[name].add(value);
          });
          return acc;
        }, {})
      ).map(([name, values]) => ({ name, values: Array.from(values) }))
    : [];

  // Tìm variant khớp với selectedOptions
  function findVariant(opts: Record<string, string>): ProductVariant | null {
    if (!product) return null;
    return (
      product.variants.find((v) =>
        Object.entries(v.optionLabels).every(([name, value]) => opts[name] === value)
      ) ?? null
    );
  }

  function selectOption(name: string, value: string) {
    const next = { ...selectedOptions, [name]: value };
    setSelectedOptions(next);
    // Chỉ set variant khi đã chọn đủ tất cả options
    if (Object.keys(next).length === optionGroups.length) {
      setSelectedVariant(findVariant(next));
    } else {
      setSelectedVariant(null);
    }
    setQuantity(1);
  }

  const maxQty = selectedVariant?.availableStock ?? 99;

  async function handleAddToCart() {
    if (!user) {
      toast.error('Vui lòng đăng nhập để thêm vào giỏ hàng');
      router.push('/login');
      return;
    }
    if (optionGroups.length > 0 && !selectedVariant) {
      toast.error('Vui lòng chọn phiên bản sản phẩm');
      return;
    }
    const variantId = selectedVariant?.id ?? product?.variants[0]?.id;
    if (!variantId) return;

    try {
      await api.post('/api/cart/items', { variantId, quantity });
      toast.success('Đã thêm vào giỏ hàng');
    } catch {
      toast.error('Không thể thêm vào giỏ hàng');
    }
  }

  async function handleBuyNow() {
    await handleAddToCart();
    router.push('/cart');
  }

  async function handleChat() {
    if (!user) { router.push('/login'); return; }
    if (!product) return;
    try {
      const { data } = await api.post('/api/chat/rooms', { shopId: product.shop.id });
      router.push(`/chat?roomId=${data.data.roomId}`);
    } catch {
      toast.error('Không thể mở chat');
    }
  }

  if (isLoading) return <ProductDetailSkeleton />;
  if (!product) return (
    <div className="flex items-center justify-center min-h-96">
      <p className="text-muted-foreground">Không tìm thấy sản phẩm.</p>
    </div>
  );

  const currentVariant = selectedVariant ?? (product.variants.length === 1 ? product.variants[0] : null);
  const displayPrice = currentVariant
    ? formatPrice(currentVariant.price)
    : product.minPrice === product.maxPrice
      ? formatPrice(product.minPrice)
      : `${formatPrice(product.minPrice)} – ${formatPrice(product.maxPrice)}`;

  const stockStatus = currentVariant ? getStockStatus(currentVariant.availableStock) : undefined;
  const canBuy = currentVariant ? currentVariant.checkoutEligible : product.eligibilityIssues.length === 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-6">
        <Link href="/" className="hover:text-foreground transition-colors">Trang chủ</Link>
        <ChevronRight className="h-3 w-3" />
        {product.categoryPath && (
          <>
            <span>{product.categoryPath}</span>
            <ChevronRight className="h-3 w-3" />
          </>
        )}
        <span className="text-foreground line-clamp-1">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
        {/* Images */}
        <div className="space-y-3">
          <div className="relative aspect-square rounded-2xl overflow-hidden bg-white/3 border border-white/8 group">
            {product.media.length > 0 ? (
              <Image
                src={product.media[activeImage]?.publicUrl ?? product.media[0].publicUrl}
                alt={product.name}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
                priority
              />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground/20">
                <ShoppingCart className="h-16 w-16" />
              </div>
            )}
            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="bg-black/60 rounded-lg p-1.5">
                <ZoomIn className="h-4 w-4 text-white" />
              </div>
            </div>
          </div>

          {/* Thumbnails */}
          {product.media.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {product.media.map((m, i) => (
                <button
                  key={m.mediaId}
                  onClick={() => setActiveImage(i)}
                  className={cn(
                    'relative h-16 w-16 shrink-0 rounded-lg overflow-hidden border-2 transition-all',
                    i === activeImage
                      ? 'border-primary shadow-primary/30 shadow-md'
                      : 'border-white/10 hover:border-white/30'
                  )}
                >
                  <Image src={m.publicUrl} alt="" fill sizes="64px" className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="space-y-5">
          {/* Title & badges */}
          <div>
            {product.brand && (
              <p className="text-xs text-primary font-medium uppercase tracking-wider mb-1">
                {product.brand}
              </p>
            )}
            <h1 className="text-xl font-bold text-foreground leading-snug">{product.name}</h1>

            {reviewsData && reviewsData.ratingCount > 0 && (
              <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <span className="font-medium text-foreground">{reviewsData.ratingAvg.toFixed(1)}</span>
                  <span>({reviewsData.ratingCount} đánh giá)</span>
                </div>
              </div>
            )}
          </div>

          {/* Price */}
          <div className="rounded-xl bg-white/3 border border-white/6 px-4 py-3">
            <p className="text-3xl font-bold text-primary">{displayPrice}</p>
            {stockStatus && (
              <div className="mt-1.5">
                <StockBadge status={stockStatus} />
              </div>
            )}
          </div>

          {/* Variant selector */}
          {optionGroups.map((group) => (
            <div key={group.name}>
              <p className="text-sm font-medium text-foreground mb-2">
                {group.name}
                {selectedOptions[group.name] && (
                  <span className="ml-2 text-primary font-normal">{selectedOptions[group.name]}</span>
                )}
              </p>
              <div className="flex flex-wrap gap-2">
                {group.values.map((value) => {
                  const testOpts = { ...selectedOptions, [group.name]: value };
                  const matchedVariant = findVariant(
                    Object.keys(testOpts).length === optionGroups.length ? testOpts : {}
                  );
                  const unavailable = matchedVariant
                    ? !matchedVariant.checkoutEligible
                    : false;
                  const isSelected = selectedOptions[group.name] === value;

                  return (
                    <button
                      key={value}
                      disabled={unavailable}
                      onClick={() => selectOption(group.name, value)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg border text-sm transition-all',
                        isSelected
                          ? 'border-primary bg-primary/10 text-primary font-medium'
                          : 'border-white/10 text-muted-foreground hover:border-white/30 hover:text-foreground',
                        unavailable && 'opacity-40 cursor-not-allowed line-through'
                      )}
                    >
                      {value}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Quantity */}
          <div>
            <p className="text-sm font-medium text-foreground mb-2">Số lượng</p>
            <div className="flex items-center gap-3">
              <div className="flex items-center border border-white/10 rounded-lg overflow-hidden">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-12 text-center text-sm font-medium">{quantity}</span>
                <button
                  onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                  disabled={quantity >= maxQty}
                  className="px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              {currentVariant && (
                <span className="text-xs text-muted-foreground">
                  Còn {currentVariant.availableStock} sản phẩm
                </span>
              )}
            </div>
          </div>

          {/* CTA buttons */}
          <div className="flex gap-3 pt-1">
            <Button
              variant="outline"
              className="flex-1 border-primary/40 text-primary hover:bg-primary/10 hover:border-primary gap-2"
              onClick={handleAddToCart}
              disabled={!canBuy}
            >
              <ShoppingCart className="h-4 w-4" />
              Thêm vào giỏ
            </Button>
            <Button
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-medium glow-primary-sm"
              onClick={handleBuyNow}
              disabled={!canBuy}
            >
              Mua ngay
            </Button>
          </div>

          {!canBuy && (
            <p className="text-xs text-destructive text-center">Sản phẩm hiện không thể mua</p>
          )}

          {/* Trust badges */}
          <div className="grid grid-cols-3 gap-3 pt-2">
            {[
              { icon: Shield, label: 'Chính hàng 100%' },
              { icon: Truck, label: 'Giao hàng nhanh' },
              { icon: RotateCcw, label: 'Đổi trả dễ dàng' },
            ].map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex flex-col items-center gap-1.5 rounded-lg bg-white/2 border border-white/6 p-2.5 text-center"
              >
                <Icon className="h-4 w-4 text-primary" />
                <span className="text-[11px] text-muted-foreground leading-tight">{label}</span>
              </div>
            ))}
          </div>

          {/* Shop info */}
          <div className="flex items-center justify-between rounded-xl border border-white/8 bg-white/2 p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Store className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">{product.shop.name}</p>
                <Link
                  href={`/shops/${product.shop.id}`}
                  className="text-xs text-primary hover:text-primary/80 transition-colors"
                >
                  Xem shop
                </Link>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-white/10 gap-2 text-xs"
              onClick={handleChat}
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Chat
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs: Description + Reviews */}
      <Tabs defaultValue="description">
        <TabsList className="bg-white/5 border border-white/8">
          <TabsTrigger value="description" className="data-[state=active]:bg-white/10">
            Mô tả sản phẩm
          </TabsTrigger>
          <TabsTrigger value="reviews" className="data-[state=active]:bg-white/10">
            Đánh giá ({reviewsData?.ratingCount ?? 0})
          </TabsTrigger>
          {Object.keys(product.attributes).length > 0 && (
            <TabsTrigger value="specs" className="data-[state=active]:bg-white/10">
              Thông số
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="description" className="mt-4">
          <div className="rounded-xl border border-white/8 bg-card p-6">
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
              {product.description || 'Chưa có mô tả.'}
            </p>
          </div>
        </TabsContent>

        <TabsContent value="reviews" className="mt-4">
          <div className="rounded-xl border border-white/8 bg-card p-6 space-y-6">
            {/* Summary */}
            {reviewsData && reviewsData.ratingCount > 0 && (
              <div className="flex items-center gap-8 pb-6 border-b border-white/8">
                <div className="text-center">
                  <p className="text-4xl font-bold text-primary">
                    {reviewsData.ratingAvg.toFixed(1)}
                  </p>
                  <div className="flex gap-0.5 mt-1 justify-center">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          'h-4 w-4',
                          i < Math.round(reviewsData.ratingAvg)
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-white/20'
                        )}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {reviewsData.ratingCount} đánh giá
                  </p>
                </div>
              </div>
            )}

            {/* Review list */}
            {reviewsData?.content.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-6">
                Chưa có đánh giá nào.
              </p>
            ) : (
              <div className="space-y-5">
                {reviewsData?.content.map((review) => (
                  <div key={review.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary">
                          <Store className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Khách hàng</p>
                          <div className="flex gap-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={cn(
                                  'h-3 w-3',
                                  i < review.rating
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'text-white/20'
                                )}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatRelative(review.createdAt)}
                      </span>
                    </div>
                    {review.comment && (
                      <p className="text-sm text-foreground/80 leading-relaxed">{review.comment}</p>
                    )}
                    {reviewsData.content.indexOf(review) < reviewsData.content.length - 1 && (
                      <Separator className="bg-white/6 mt-4" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {Object.keys(product.attributes).length > 0 && (
          <TabsContent value="specs" className="mt-4">
            <div className="rounded-xl border border-white/8 bg-card p-6">
              <div className="divide-y divide-white/6">
                {Object.entries(product.attributes).map(([name, value]) => (
                  <div key={name} className="flex py-3 text-sm">
                    <span className="w-40 shrink-0 text-muted-foreground">{name}</span>
                    <span className="text-foreground">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function StockBadge({ status }: { status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' }) {
  if (status === 'IN_STOCK') return <Badge className="bg-green-500/15 text-green-400 border-green-500/20 text-[11px]">Còn hàng</Badge>;
  if (status === 'LOW_STOCK') return <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/20 text-[11px]">Sắp hết hàng</Badge>;
  return <Badge className="bg-destructive/15 text-destructive border-destructive/20 text-[11px]">Hết hàng</Badge>;
}

function ProductDetailSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-3">
          <Skeleton className="aspect-square w-full rounded-2xl bg-white/5" />
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-16 rounded-lg bg-white/5" />
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <Skeleton className="h-7 w-3/4 bg-white/5" />
          <Skeleton className="h-5 w-1/2 bg-white/5" />
          <Skeleton className="h-12 w-full rounded-xl bg-white/5" />
          <Skeleton className="h-20 w-full rounded-xl bg-white/5" />
          <div className="flex gap-3">
            <Skeleton className="h-10 flex-1 rounded-lg bg-white/5" />
            <Skeleton className="h-10 flex-1 rounded-lg bg-white/5" />
          </div>
        </div>
      </div>
    </div>
  );
}
