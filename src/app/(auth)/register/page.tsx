'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { cn } from '@/lib/utils';

const schema = z.object({
  fullName: z.string().min(2, 'Họ tên ít nhất 2 ký tự'),
  email: z.string().email('Email không hợp lệ'),
  password: z
    .string()
    .min(8, 'Mật khẩu ít nhất 8 ký tự')
    .regex(/[A-Z]/, 'Cần ít nhất 1 chữ hoa')
    .regex(/[0-9]/, 'Cần ít nhất 1 số'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Mật khẩu xác nhận không khớp',
  path: ['confirmPassword'],
});

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const { user, isHydrated } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [globalError, setGlobalError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isHydrated && user) {
      router.replace(user.role === 'SELLER' ? '/seller/dashboard' : '/');
    }
  }, [isHydrated, user, router]);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const password = watch('password', '');

  const passwordChecks = [
    { label: 'Ít nhất 8 ký tự', pass: password.length >= 8 },
    { label: '1 chữ hoa', pass: /[A-Z]/.test(password) },
    { label: '1 chữ số', pass: /[0-9]/.test(password) },
  ];

  async function onSubmit(values: FormData) {
    setGlobalError('');
    setFieldErrors({});
    try {
      await api.post('/api/auth/register', {
        email: values.email,
        password: values.password,
        fullName: values.fullName,
      });
      setSuccess(true);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string; code?: number; data?: unknown } } };
      const body = axiosErr?.response?.data;

      if (body?.code === 429) {
        setGlobalError('Quá nhiều lần thử. Vui lòng thử lại sau.');
      } else if (body?.data && typeof body.data === 'object') {
        setFieldErrors(body.data as Record<string, string>);
      } else {
        setGlobalError(body?.message ?? 'Đăng ký thất bại. Vui lòng thử lại.');
      }
    }
  }

  function handleOAuth(provider: 'google') {
    const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8080';
    window.location.href = `${base}/oauth2/authorization/${provider}`;
  }

  if (success) {
    return (
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-white/8 bg-card p-10 shadow-xl shadow-black/40 text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle2 className="h-14 w-14 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Đăng ký thành công!</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Chúng tôi đã gửi email xác minh đến địa chỉ email của bạn.
            Vui lòng kiểm tra hộp thư và click vào link xác minh.
          </p>
          <Button
            className="bg-primary hover:bg-primary/90 text-primary-foreground w-full"
            onClick={() => router.push('/login')}
          >
            Về trang đăng nhập
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <div className="rounded-2xl border border-white/8 bg-card p-8 shadow-xl shadow-black/40">
        {/* Heading */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Tạo tài khoản</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Đã có tài khoản?{' '}
            <Link href="/login" className="text-primary hover:text-primary/80 font-medium transition-colors">
              Đăng nhập
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

          {/* Full name */}
          <div className="space-y-1.5">
            <Label htmlFor="fullName" className="text-sm text-foreground/80">Họ và tên</Label>
            <Input
              id="fullName"
              placeholder="Nguyen Van A"
              autoComplete="name"
              className={cn(
                'bg-white/5 border-white/10 focus-visible:ring-primary/50',
                (errors.fullName || fieldErrors.fullName) && 'border-destructive/50'
              )}
              {...register('fullName')}
            />
            {(errors.fullName || fieldErrors.fullName) && (
              <p className="text-xs text-destructive">
                {errors.fullName?.message ?? fieldErrors.fullName}
              </p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-sm text-foreground/80">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              className={cn(
                'bg-white/5 border-white/10 focus-visible:ring-primary/50',
                (errors.email || fieldErrors.email) && 'border-destructive/50'
              )}
              {...register('email')}
            />
            {(errors.email || fieldErrors.email) && (
              <p className="text-xs text-destructive">
                {errors.email?.message ?? fieldErrors.email}
              </p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-sm text-foreground/80">Mật khẩu</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="new-password"
                className={cn(
                  'bg-white/5 border-white/10 focus-visible:ring-primary/50 pr-10',
                  errors.password && 'border-destructive/50'
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

            {/* Password strength checks */}
            {password.length > 0 && (
              <div className="flex gap-3 pt-1">
                {passwordChecks.map((check) => (
                  <span
                    key={check.label}
                    className={cn(
                      'text-[11px] flex items-center gap-1 transition-colors',
                      check.pass ? 'text-green-500' : 'text-muted-foreground/50'
                    )}
                  >
                    <span className={cn('h-1.5 w-1.5 rounded-full', check.pass ? 'bg-green-500' : 'bg-white/20')} />
                    {check.label}
                  </span>
                ))}
              </div>
            )}
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            )}
          </div>

          {/* Confirm password */}
          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword" className="text-sm text-foreground/80">Xác nhận mật khẩu</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirm ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="new-password"
                className={cn(
                  'bg-white/5 border-white/10 focus-visible:ring-primary/50 pr-10',
                  errors.confirmPassword && 'border-destructive/50'
                )}
                {...register('confirmPassword')}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
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
                Đang tạo tài khoản...
              </>
            ) : (
              'Tạo tài khoản'
            )}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Bằng cách đăng ký, bạn đồng ý với{' '}
            <span className="text-foreground/60">Điều khoản dịch vụ</span> và{' '}
            <span className="text-foreground/60">Chính sách bảo mật</span> của PMarket.
          </p>
        </form>
      </div>
    </div>
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
