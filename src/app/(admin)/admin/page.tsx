'use client';

import Link from 'next/link';
import { ShieldCheck, ArrowLeft } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';

export default function AdminPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="flex justify-center mb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15">
              <ShieldCheck className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-xl font-bold text-foreground">Trang quản trị</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Khu vực quản trị viên đang được phát triển. Các công cụ quản lý hệ thống sẽ sớm có mặt tại đây.
          </p>
          <Link href="/">
            <Button variant="outline" className="mt-6 border-white/10 gap-2">
              <ArrowLeft className="h-4 w-4" /> Về trang chủ
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
