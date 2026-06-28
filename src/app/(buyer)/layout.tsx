import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ChatLauncher } from '@/components/chat/ChatLauncher';

export default function BuyerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <ChatLauncher />
    </div>
  );
}
