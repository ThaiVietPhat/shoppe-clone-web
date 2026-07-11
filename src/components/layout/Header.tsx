'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useEffect } from 'react';
import {
  Search,
  ShoppingCart,
  Bell,
  User,
  ChevronDown,
  Store,
  Package,
  LogOut,
  LayoutDashboard,
  Star,
  MonitorX,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuthStore } from '@/stores/auth.store';
import { useCart } from '@/hooks/use-cart';
import { api } from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import { toast } from 'sonner';

const CART_PREVIEW_LIMIT = 5;

export function Header() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [cartPreviewOpen, setCartPreviewOpen] = useState(false);

  const { data: cart } = useCart();
  const cartItems = useMemo(() => cart?.items ?? [], [cart]);
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const recentCartItems = useMemo(
    () => cartItems.slice(-CART_PREVIEW_LIMIT).reverse(),
    [cartItems],
  );

  useEffect(() => {
    if (!user) return;
    const fetch = () => {
      api.get('/api/notifications/unread-count')
        .then(({ data }) => setUnreadCount(data.data.count))
        .catch(() => {});
    };
    fetch();
    const interval = setInterval(fetch, 60_000);
    return () => clearInterval(interval);
  }, [user]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
  }

  async function handleLogout() {
    try {
      await api.post('/api/auth/logout');
    } catch (err) {
      // Client state is cleared below regardless, but if this call failed the
      // refresh-token cookie was never revoked/cleared server-side — surface it
      // instead of pretending logout fully succeeded.
      console.error('Logout request failed; session may not be fully revoked', err);
      toast.warning('Đăng xuất chưa hoàn tất trên máy chủ, vui lòng thử lại nếu vẫn thấy đăng nhập.');
    }
    logout();
    router.push('/login');
    toast.success('Đã đăng xuất');
  }

  async function handleLogoutAll() {
    try {
      await api.post('/api/auth/logout-all');
    } catch (err) {
      console.error('Logout-all request failed; sessions may not be fully revoked', err);
      toast.warning('Đăng xuất chưa hoàn tất trên máy chủ, vui lòng thử lại nếu vẫn thấy đăng nhập.');
    }
    logout();
    router.push('/login');
    toast.success('Đã đăng xuất khỏi tất cả thiết bị');
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/8 bg-black/90 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex h-16 items-center gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <span className="text-sm font-black text-primary-foreground">P</span>
            </div>
            <span className="text-lg font-bold tracking-tight text-foreground">
              PMarket
            </span>
          </Link>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="hidden flex-1 max-w-xl sm:flex">
            <div className="relative flex w-full">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm sản phẩm, thương hiệu..."
                className="rounded-r-none border-r-0 bg-white/5 border-white/10 focus-visible:ring-primary/50 pr-4"
              />
              <Button
                type="submit"
                className="rounded-l-none bg-primary hover:bg-primary/90 text-primary-foreground px-4"
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </form>

          {/* Right actions */}
          <div className="ml-auto flex items-center gap-1">
            {user ? (
              <>
                {/* Notifications */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative text-muted-foreground hover:text-foreground"
                  onClick={() => router.push('/notifications')}
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] bg-primary text-primary-foreground border-0">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </Badge>
                  )}
                </Button>

                {/* Cart */}
                <div
                  className="relative"
                  onMouseEnter={() => setCartPreviewOpen(true)}
                  onMouseLeave={() => setCartPreviewOpen(false)}
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative text-muted-foreground hover:text-foreground"
                    onClick={() => router.push('/cart')}
                  >
                    <ShoppingCart className="h-5 w-5" />
                    {cartCount > 0 && (
                      <Badge className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] bg-primary text-primary-foreground border-0">
                        {cartCount > 99 ? '99+' : cartCount}
                      </Badge>
                    )}
                  </Button>

                  {cartPreviewOpen && (
                    <div className="absolute right-0 top-full w-80 pt-2 z-50">
                      <div className="rounded-lg border border-white/10 bg-card shadow-lg overflow-hidden">
                        {recentCartItems.length === 0 ? (
                          <div className="p-6 text-center text-sm text-muted-foreground">
                            Giỏ hàng trống
                          </div>
                        ) : (
                          <>
                            <div className="px-4 py-2.5 text-xs font-medium text-muted-foreground border-b border-white/8">
                              Sản phẩm mới thêm
                            </div>
                            <div className="max-h-80 overflow-y-auto divide-y divide-white/6">
                              {recentCartItems.map((item) => (
                                <Link
                                  key={item.variantId}
                                  href={`/products/${item.productId}`}
                                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors"
                                >
                                  <div className="relative h-10 w-10 shrink-0 rounded-md overflow-hidden bg-white/5">
                                    {item.coverImageUrl ? (
                                      <Image
                                        src={item.coverImageUrl}
                                        alt={item.productName}
                                        fill
                                        sizes="40px"
                                        className="object-cover"
                                      />
                                    ) : (
                                      <div className="flex h-full items-center justify-center text-muted-foreground/30">
                                        <ShoppingCart className="h-4 w-4" />
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium line-clamp-1">{item.productName}</p>
                                    <p className="text-xs font-bold text-primary mt-0.5">{formatPrice(item.price)}</p>
                                  </div>
                                  <span className="text-xs text-muted-foreground shrink-0">x{item.quantity}</span>
                                </Link>
                              ))}
                            </div>
                            <div className="p-2 border-t border-white/8">
                              <Button
                                size="sm"
                                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                                onClick={() => router.push('/cart')}
                              >
                                Xem giỏ hàng
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* User menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors outline-none"
                  >
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={user.avatarUrl ?? undefined} />
                      <AvatarFallback className="bg-primary/20 text-primary text-xs font-semibold">
                        {(user.fullName ?? user.email).charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden md:block text-sm font-medium max-w-24 truncate">
                      {user.fullName ?? user.email}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52 bg-card border-white/10">
                    <div className="px-2 py-1.5">
                      <p className="text-sm font-medium truncate">{user.fullName ?? user.email}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                    <DropdownMenuSeparator className="bg-white/8" />
                    <DropdownMenuItem onClick={() => router.push('/orders')}>
                      <Package className="h-4 w-4" />
                      Đơn hàng của tôi
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push('/reviews')}>
                      <Star className="h-4 w-4" />
                      Đánh giá của tôi
                    </DropdownMenuItem>
                    {user.role === 'SELLER' && (
                      <>
                        <DropdownMenuSeparator className="bg-white/8" />
                        <DropdownMenuItem onClick={() => router.push('/seller/dashboard')}>
                          <LayoutDashboard className="h-4 w-4" />
                          Quản lý shop
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push('/seller/products')}>
                          <Store className="h-4 w-4" />
                          Sản phẩm
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push('/seller/orders')}>
                          <Package className="h-4 w-4" />
                          Đơn hàng seller
                        </DropdownMenuItem>
                      </>
                    )}
                    {user.role === 'BUYER' && (
                      <>
                        <DropdownMenuSeparator className="bg-white/8" />
                        <DropdownMenuItem onClick={() => router.push('/become-seller')}>
                          <Store className="h-4 w-4" />
                          Đăng ký bán hàng
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator className="bg-white/8" />
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={handleLogout}
                    >
                      <LogOut className="h-4 w-4" />
                      Đăng xuất
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={handleLogoutAll}
                    >
                      <MonitorX className="h-4 w-4" />
                      Đăng xuất tất cả thiết bị
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={() => router.push('/login')}
                >
                  Đăng nhập
                </Button>
                <Button
                  size="sm"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  onClick={() => router.push('/register')}
                >
                  Đăng ký
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile search bar */}
        <div className="pb-3 sm:hidden">
          <form onSubmit={handleSearch} className="flex">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm sản phẩm..."
              className="rounded-r-none bg-white/5 border-white/10"
            />
            <Button type="submit" className="rounded-l-none bg-primary px-3">
              <Search className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
