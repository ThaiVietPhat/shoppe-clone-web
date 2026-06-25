'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle2, XCircle, Clock, Loader2, LifeBuoy, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import { PaymentStatusResponse } from '@/types/api';
import { Button } from '@/components/ui/button';

const POLL_INTERVAL = 3000;
const POLL_TIMEOUT = 15 * 60 * 1000;

function PaymentReturnContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [result, setResult] = useState<PaymentStatusResponse | null>(null);
  const [error, setError] = useState(false);
  const startRef = useRef(Date.now());
  const sessionRef = useRef<string | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let cancelled = false;

    async function poll() {
      try {
        const sessionId = sessionRef.current;
        const res = sessionId
          ? await api.get<{ data: PaymentStatusResponse }>(`/api/payments/status/${sessionId}`)
          : await api.get<{ data: PaymentStatusResponse }>(`/api/payments/vnpay/return?${params.toString()}`);
        if (cancelled) return;

        const data = res.data.data;
        sessionRef.current = data.checkoutSessionId;
        setResult(data);

        if (data.status === 'SUCCEEDED' && data.orderIds[0]) {
          router.replace(`/orders/${data.orderIds[0]}`);
          return;
        }
        if (data.status === 'PENDING' && Date.now() - startRef.current < POLL_TIMEOUT) {
          timer = setTimeout(poll, POLL_INTERVAL);
        }
      } catch {
        if (!cancelled) setError(true);
      }
    }

    poll();
    return () => { cancelled = true; clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return <ResultCard icon={XCircle} iconClass="text-destructive" title="Không xác minh được thanh toán"
      desc="Đã xảy ra lỗi khi kiểm tra trạng thái. Vui lòng kiểm tra trong mục đơn hàng." actions={
        <Button onClick={() => router.push('/orders')} className="bg-primary">Xem đơn hàng</Button>
      } />;
  }

  if (!result || result.status === 'PENDING') {
    return <ResultCard icon={Loader2} iconClass="text-primary animate-spin" title="Đang xử lý thanh toán..."
      desc="Vui lòng không đóng trang. Chúng tôi đang xác nhận giao dịch của bạn." />;
  }

  if (result.status === 'SUCCEEDED') {
    return <ResultCard icon={CheckCircle2} iconClass="text-green-400" title="Thanh toán thành công" desc="Đang chuyển đến đơn hàng..." />;
  }

  if (result.status === 'FAILED') {
    return <ResultCard icon={XCircle} iconClass="text-destructive" title="Thanh toán thất bại"
      desc="Giao dịch không thành công. Bạn có thể thử thanh toán lại." actions={
        <div className="flex gap-3">
          <Button variant="outline" className="border-white/10" onClick={() => router.push('/orders')}>Xem đơn hàng</Button>
          <Button className="bg-primary gap-2" onClick={async () => {
            try {
              const { data } = await api.post('/api/payments/initiate', { checkoutSessionId: result.checkoutSessionId, paymentMethod: 'VNPAY' });
              if (data.data.paymentUrl) window.location.href = data.data.paymentUrl;
            } catch { /* noop */ }
          }}><RefreshCw className="h-4 w-4" /> Thử lại</Button>
        </div>
      } />;
  }

  if (result.status === 'EXPIRED') {
    return <ResultCard icon={Clock} iconClass="text-amber-400" title="Phiên thanh toán đã hết hạn"
      desc="Vui lòng tạo lại đơn hàng." actions={<Button onClick={() => router.push('/cart')} className="bg-primary">Về giỏ hàng</Button>} />;
  }

  return <ResultCard icon={LifeBuoy} iconClass="text-amber-400" title="Cần đối soát giao dịch"
    desc={result.reconciliationReason ?? 'Vui lòng liên hệ bộ phận hỗ trợ để được xử lý.'} actions={
      <Button onClick={() => router.push('/orders')} className="bg-primary">Xem đơn hàng</Button>
    } />;
}

function ResultCard({ icon: Icon, iconClass, title, desc, actions }: {
  icon: typeof CheckCircle2; iconClass: string; title: string; desc: string; actions?: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <div className="flex justify-center mb-5"><Icon className={`h-16 w-16 ${iconClass}`} /></div>
      <h1 className="text-xl font-bold text-foreground">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
      {actions && <div className="mt-6 flex justify-center">{actions}</div>}
    </div>
  );
}

export default function PaymentReturnPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-sm text-muted-foreground">Đang tải…</div>}>
      <PaymentReturnContent />
    </Suspense>
  );
}
