'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Store, Flag, Ticket } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/admin', label: 'Tổng quan', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Người dùng', icon: Users },
  { href: '/admin/shops', label: 'Shop', icon: Store },
  { href: '/admin/reports', label: 'Báo cáo', icon: Flag },
  { href: '/admin/vouchers', label: 'Voucher', icon: Ticket },
];

export function AdminSidebar() {
  const pathname = usePathname();
  return (
    <aside className="lg:w-56 shrink-0">
      <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === '/admin' ? pathname === href : pathname.startsWith(href);
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
