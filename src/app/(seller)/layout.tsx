import { Header } from '@/components/layout/Header';
import { SellerSidebar } from '@/components/layout/SellerSidebar';

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="mx-auto w-full max-w-7xl flex flex-col lg:flex-row gap-6 px-4 py-6 flex-1">
        <SellerSidebar />
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
