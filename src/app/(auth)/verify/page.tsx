'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/error';
import { Suspense } from 'react';

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setMessage('Link xác minh không hợp lệ.');
      return;
    }

    api.post('/api/auth/verify', { token })
      .then(() => setStatus('success'))
      .catch((err) => {
        setStatus('error');
        setMessage(getApiErrorMessage(err, 'Link xác minh đã hết hạn hoặc không hợp lệ.'));
      });
  }, [searchParams]);

  if (status === 'loading') {
    return (
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Đang xác minh email...</p>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="text-center">
        <CheckCircle2 className="h-14 w-14 text-primary mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">Email đã được xác minh!</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Tài khoản của bạn đã được kích hoạt. Bạn có thể đăng nhập ngay.
        </p>
        <Button
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
          onClick={() => router.push('/login')}
        >
          Đăng nhập ngay
        </Button>
      </div>
    );
  }

  return (
    <div className="text-center">
      <XCircle className="h-14 w-14 text-destructive mx-auto mb-4" />
      <h2 className="text-xl font-bold mb-2">Xác minh thất bại</h2>
      <p className="text-sm text-muted-foreground mb-6">{message}</p>
      <Button
        variant="outline"
        className="border-white/10"
        onClick={() => router.push('/login')}
      >
        Về trang đăng nhập
      </Button>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <div className="w-full max-w-md">
      <div className="rounded-2xl border border-white/8 bg-card p-10 shadow-xl shadow-black/40">
        <Suspense fallback={
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          </div>
        }>
          <VerifyContent />
        </Suspense>
      </div>
    </div>
  );
}
