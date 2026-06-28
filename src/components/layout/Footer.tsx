'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';

// Các đường dẫn yêu cầu đăng nhập — khách bấm vào sẽ được đưa sang trang login.
const AUTH_REQUIRED_PREFIXES = ['/orders', '/cart', '/seller'];

function isAuthRequired(href: string) {
  return AUTH_REQUIRED_PREFIXES.some(
    (prefix) => href === prefix || href.startsWith(`${prefix}/`)
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  const router = useRouter();
  const { user, isHydrated } = useAuthStore();

  function handleClick(e: React.MouseEvent) {
    // Chỉ chặn khi đã hydrate xong và xác định là khách — tránh redirect nhầm
    // người dùng đã đăng nhập ở lần render đầu.
    if (isHydrated && !user && isAuthRequired(href)) {
      e.preventDefault();
      router.push(`/login?redirect=${encodeURIComponent(href)}`);
    }
  }

  return (
    <Link
      href={href}
      onClick={handleClick}
      className="hover:text-foreground transition-colors"
    >
      {children}
    </Link>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-white/8 bg-black/60 mt-16">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
                <span className="text-xs font-black text-primary-foreground">P</span>
              </div>
              <span className="font-bold text-foreground">PMarket</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Mua sắm thông minh, giá tốt mỗi ngày.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">Người mua</h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li><FooterLink href="/">Trang chủ</FooterLink></li>
              <li><FooterLink href="/orders">Đơn hàng</FooterLink></li>
              <li><FooterLink href="/cart">Giỏ hàng</FooterLink></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">Người bán</h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li><FooterLink href="/seller/dashboard">Dashboard</FooterLink></li>
              <li><FooterLink href="/seller/products">Quản lý sản phẩm</FooterLink></li>
              <li><FooterLink href="/seller/orders">Quản lý đơn hàng</FooterLink></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">Hỗ trợ</h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li><span className="cursor-default">Trung tâm hỗ trợ</span></li>
              <li><span className="cursor-default">Chính sách bảo mật</span></li>
              <li><span className="cursor-default">Điều khoản dịch vụ</span></li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-white/8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            © 2025 PMarket. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            Được xây dựng với Next.js + Spring Boot
          </p>
        </div>
      </div>
    </footer>
  );
}
