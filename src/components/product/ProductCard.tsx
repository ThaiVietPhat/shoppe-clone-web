'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Star, ShoppingCart, Heart } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn, formatPrice, formatPriceRange } from '@/lib/utils';
import { ProductCardResponse } from '@/types/api';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { toast } from 'sonner';

interface ProductCardProps {
  product: ProductCardResponse;
  className?: string;
  wishlisted?: boolean;
  onWishlistChange?: (productId: string, wishlisted: boolean) => void;
}

export function ProductCard({ product, className, wishlisted, onWishlistChange }: ProductCardProps) {
  const { user } = useAuthStore();
  const [imageFailed, setImageFailed] = useState(false);
  const [localWishlisted, setLocalWishlisted] = useState(wishlisted ?? false);
  const [wishlistPending, setWishlistPending] = useState(false);

  useEffect(() => {
    if (wishlisted !== undefined) setLocalWishlisted(wishlisted);
  }, [wishlisted]);

  async function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault();
    if (!user) {
      toast.error('Vui lòng đăng nhập để thêm vào giỏ hàng');
      return;
    }
    // Navigate to product detail for variant selection
    window.location.href = `/products/${product.id}`;
  }

  async function handleToggleWishlist(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast.error('Vui lòng đăng nhập để lưu sản phẩm yêu thích');
      return;
    }
    if (wishlistPending) return;
    setWishlistPending(true);
    const next = !localWishlisted;
    try {
      if (next) {
        await api.post(`/api/wishlist/${product.id}`);
      } else {
        await api.delete(`/api/wishlist/${product.id}`);
      }
      setLocalWishlisted(next);
      onWishlistChange?.(product.id, next);
    } catch {
      toast.error('Thao tác thất bại');
    } finally {
      setWishlistPending(false);
    }
  }

  const imageUrl = imageFailed ? null : product.coverImageUrl;
  const hasRange = product.minPrice !== product.maxPrice;

  return (
    <Link
      href={`/products/${product.id}`}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-xl bg-card border border-white/6',
        'hover:border-primary/30 hover:shadow-lg hover:shadow-black/40 transition-all duration-200',
        className
      )}
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-white/3">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground/30">
            <ShoppingCart className="h-10 w-10" />
          </div>
        )}

        <button
          type="button"
          onClick={handleToggleWishlist}
          disabled={wishlistPending}
          title={localWishlisted ? 'Bỏ khỏi yêu thích' : 'Thêm vào yêu thích'}
          className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm hover:bg-black/70 transition-colors disabled:opacity-50"
        >
          <Heart className={cn('h-4 w-4', localWishlisted ? 'fill-red-500 text-red-500' : 'text-white')} />
        </button>

        {!product.checkoutEligible && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <span className="text-xs font-medium text-white/70 bg-black/40 px-2 py-1 rounded">
              Hết hàng
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col gap-1.5 p-3">
        <p className="text-sm font-medium text-foreground line-clamp-2 leading-snug">
          {product.name}
        </p>

        {/* Price */}
        <div className="flex items-baseline gap-1">
          <span className="text-base font-bold text-primary">
            {hasRange
              ? formatPriceRange(product.minPrice, product.maxPrice)
              : formatPrice(product.minPrice)}
          </span>
        </div>

        {/* Stats */}
        {product.shopRating != null && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            <span>{product.shopRating.toFixed(1)}</span>
          </div>
        )}

        {/* Shop */}
        <p className="text-xs text-muted-foreground/70 truncate">{product.shopName}</p>
      </div>

      {/* Quick add — visible on hover */}
      {product.checkoutEligible && (
        <div className="absolute bottom-0 left-0 right-0 translate-y-full group-hover:translate-y-0 transition-transform duration-200">
          <Button
            size="sm"
            className="w-full rounded-t-none rounded-b-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs"
            onClick={handleAddToCart}
          >
            <ShoppingCart className="h-3.5 w-3.5 mr-1" />
            Xem & Thêm vào giỏ
          </Button>
        </div>
      )}
    </Link>
  );
}
