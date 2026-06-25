'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Package, ClipboardList, Settings, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/seller/dashboard', label: 'Tổng quan', icon: LayoutDashboard },
  { href: '/seller/products', label: 'Sản phẩm', icon: Package },
  { href: '/seller/products/new', label: 'Thêm sản phẩm', icon: Plus },
  { href: '/seller/orders', label: 'Đơn hàng', icon: ClipboardList },
  { href: '/seller/shop/settings', label: 'Cài đặt shop', icon: Settings },
];

export function SellerSidebar() {
  const pathname = usePathname();
  return (
    <aside className="lg:w-56 shrink-0">
      <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm whitespace-nowrap transition-colors',
                active ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
              )}
            >
              <Icon className="h-4 w-4" /> {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
