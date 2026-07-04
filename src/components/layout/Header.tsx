'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
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
import { api } from '@/lib/api';
import { toast } from 'sonner';

export function Header() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [cartCount, setCartCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    api.get('/api/cart')
      .then(({ data }) => {
        const items = data.data?.items ?? [];
        setCartCount(items.reduce((sum: number, item: { quantity: number }) => sum + item.quantity, 0));
      })
      .catch(() => {});
  }, [user]);

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
    } catch {
      // ignore
    }
    logout();
    router.push('/login');
    toast.success('Đã đăng xuất');
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
