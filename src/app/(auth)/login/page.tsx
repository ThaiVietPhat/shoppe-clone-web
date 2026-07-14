'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { api, setAccessToken } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/error';
import { useAuthStore } from '@/stores/auth.store';
import { CurrentUserResponse, LoginResponse } from '@/types/api';
import { toStoreUser } from '@/lib/user';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const schema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
});

type FormData = z.infer<typeof schema>;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, user, isHydrated } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [globalError, setGlobalError] = useState('');

  useEffect(() => {
    if (isHydrated && user) {
      router.replace(user.role === 'SELLER' ? '/seller/dashboard' : '/');
    }
  }, [isHydrated, user, router]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormData) {
    setGlobalError('');
    try {
      const { data } = await api.post<{ data: LoginResponse }>('/api/auth/login', values);
      setAccessToken(data.data.accessToken);
      const { data: me } = await api.get<{ data: CurrentUserResponse }>('/api/users/me');
      const user = toStoreUser(me.data);
      login(data.data.accessToken, user);
      toast.success(`Chào mừng trở lại, ${user.fullName ?? user.email}!`);

      // Nếu khách bị chuyển tới login từ một trang cần đăng nhập, quay lại đúng trang đó.
      const redirect = searchParams.get('redirect');
      if (redirect && redirect.startsWith('/')) {
        router.push(redirect);
        return;
      }

      if (user.role === 'SELLER') router.push('/seller/dashboard');
      else if (user.role === 'ADMIN') router.push('/admin');
      else router.push('/');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { code?: number } } };
      const code = axiosErr?.response?.data?.code;

      if (code === 429) {
        setGlobalError('Quá nhiều lần thử. Vui lòng thử lại sau.');
      } else {
        setGlobalError(getApiErrorMessage(err, 'Đăng nhập thất bại. Vui lòng thử lại.'));
      }
    }
  }

  function handleOAuth(provider: 'google') {
    const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8080';
    window.location.href = `${base}/oauth2/authorization/${provider}`;
  }

  return (
    <div className="w-full max-w-md">
      <div className="rounded-2xl border border-white/8 bg-card p-8 shadow-xl shadow-black/40">
        {/* Heading */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Đăng nhập</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Chưa có tài khoản?{' '}
            <Link href="/register" className="text-primary hover:text-primary/80 font-medium transition-colors">
              Đăng ký ngay
            </Link>
          </p>
        </div>

        {/* OAuth */}
        <div className="space-y-2 mb-6">
          <Button
            type="button"
            variant="outline"
            className="w-full border-white/10 bg-white/3 hover:bg-white/6 gap-3"
            onClick={() => handleOAuth('google')}
          >
            <GoogleIcon />
            Tiếp tục với Google
          </Button>
        </div>

        <div className="relative mb-6">
          <Separator className="bg-white/8" />
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-xs text-muted-foreground">
            hoặc
          </span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {globalError && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2.5 text-sm text-destructive">
              {globalError}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-sm text-foreground/80">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              className={cn(
                'bg-white/5 border-white/10 focus-visible:ring-primary/50',
                errors.email && 'border-destructive/50 focus-visible:ring-destructive/30'
              )}
              {...register('email')}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-sm text-foreground/80">Mật khẩu</Label>
              <Link href="/forgot-password" className="text-xs text-primary hover:text-primary/80 transition-colors">
                Quên mật khẩu?
              </Link>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="current-password"
                className={cn(
                  'bg-white/5 border-white/10 focus-visible:ring-primary/50 pr-10',
                  errors.password && 'border-destructive/50 focus-visible:ring-destructive/30'
                )}
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium glow-primary-sm mt-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang đăng nhập...
              </>
            ) : (
              'Đăng nhập'
            )}
          </Button>
        </form>
      </div>

      {/* Demo accounts */}
      <div className="mt-4 rounded-xl border border-white/6 bg-white/2 p-4">
        <p className="text-xs text-muted-foreground font-medium mb-2">Tài khoản demo:</p>
        <div className="space-y-1 text-xs text-muted-foreground/70 font-mono">
          <p>Buyer: demo-buyer@shopee.local / password</p>
          <p>Seller: demo-seller@shopee.local / password</p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="w-full max-w-md text-sm text-muted-foreground">Đang tải…</div>}>
      <LoginForm />
    </Suspense>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="#1877F2">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}
