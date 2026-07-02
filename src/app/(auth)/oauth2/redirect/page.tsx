'use client';

import { useEffect, useRef, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api, setAccessToken } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { ApiResponse, CurrentUserResponse } from '@/types/api';
import { toStoreUser } from '@/lib/user';

function RedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuthStore();
  const [error, setError] = useState('');
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    const code = searchParams.get('code');
    if (!code) {
      setError('Đăng nhập OAuth2 thất bại. Vui lòng thử lại.');
      return;
    }

    api.get('/api/auth/csrf')
      .catch(() => {})
      .then(() => api.post<ApiResponse<{ accessToken: string }>>('/api/auth/oauth2/exchange', { code }))
      .then(({ data }) => {
        const token = data.data.accessToken;
        setAccessToken(token);
        return api.get<ApiResponse<CurrentUserResponse>>('/api/users/me').then(({ data: meData }) => {
          const user = toStoreUser(meData.data);
          login(token, user);
          if (user.role === 'SELLER') router.push('/seller/dashboard');
          else if (user.role === 'ADMIN') router.push('/admin');
          else router.push('/');
        });
      })
      .catch(() => {
        setError('Không thể hoàn tất đăng nhập. Link có thể đã hết hạn, vui lòng thử lại.');
      });
  }, [searchParams, login, router]);

  if (error) {
    return (
      <div className="text-center">
        <XCircle className="h-14 w-14 text-destructive mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">Đăng nhập thất bại</h2>
        <p className="text-sm text-muted-foreground mb-6">{error}</p>
        <Button
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
          onClick={() => router.push('/login')}
        >
          Thử lại
        </Button>
      </div>
    );
  }

  return (
    <div className="text-center">
      <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
      <p className="text-muted-foreground">Đang hoàn tất đăng nhập...</p>
    </div>
  );
}

export default function OAuth2RedirectPage() {
  return (
    <div className="w-full max-w-md">
      <div className="rounded-2xl border border-white/8 bg-card p-10 shadow-xl shadow-black/40">
        <Suspense fallback={
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          </div>
        }>
          <RedirectContent />
        </Suspense>
      </div>
    </div>
  );
}
