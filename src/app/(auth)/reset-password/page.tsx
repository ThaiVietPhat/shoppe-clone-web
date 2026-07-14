'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle2, Eye, EyeOff, Loader2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/error';
import { cn } from '@/lib/utils';

const schema = z.object({
  newPassword: z
    .string()
    .min(8, 'Mật khẩu ít nhất 8 ký tự')
    .regex(/[A-Z]/, 'Cần ít nhất 1 chữ hoa')
    .regex(/[0-9]/, 'Cần ít nhất 1 số'),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: 'Mật khẩu xác nhận không khớp',
  path: ['confirmPassword'],
});

type FormData = z.infer<typeof schema>;

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [globalError, setGlobalError] = useState('');
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormData) {
    setGlobalError('');
    try {
      await api.post('/api/auth/reset-password', { token, newPassword: values.newPassword });
      setSuccess(true);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { code?: number } } };
      const code = axiosErr?.response?.data?.code;

      if (code === 429) {
        setGlobalError('Quá nhiều lần thử. Vui lòng thử lại sau.');
      } else {
        setGlobalError(getApiErrorMessage(err, 'Link đặt lại mật khẩu đã hết hạn hoặc không hợp lệ.'));
      }
    }
  }

  if (!token) {
    return (
      <div className="text-center">
        <XCircle className="h-14 w-14 text-destructive mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">Link không hợp lệ</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Link đặt lại mật khẩu không hợp lệ. Vui lòng yêu cầu link mới.
        </p>
        <Button
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
          onClick={() => router.push('/forgot-password')}
        >
          Yêu cầu link mới
        </Button>
      </div>
    );
  }

  if (success) {
    return (
      <div className="text-center">
        <CheckCircle2 className="h-14 w-14 text-primary mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">Đặt lại mật khẩu thành công!</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Mật khẩu của bạn đã được cập nhật. Tất cả phiên đăng nhập cũ đã bị đăng xuất.
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
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Đặt lại mật khẩu</h1>
        <p className="mt-1 text-sm text-muted-foreground">Nhập mật khẩu mới cho tài khoản của bạn.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {globalError && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2.5 text-sm text-destructive">
            {globalError}
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="newPassword" className="text-sm text-foreground/80">Mật khẩu mới</Label>
          <div className="relative">
            <Input
              id="newPassword"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              autoComplete="new-password"
              className={cn(
                'bg-white/5 border-white/10 focus-visible:ring-primary/50 pr-10',
                errors.newPassword && 'border-destructive/50'
              )}
              {...register('newPassword')}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.newPassword && (
            <p className="text-xs text-destructive">{errors.newPassword.message}</p>
          )}
        </div>

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
              Đang cập nhật...
            </>
          ) : (
            'Đặt lại mật khẩu'
          )}
        </Button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="w-full max-w-md">
      <div className="rounded-2xl border border-white/8 bg-card p-8 shadow-xl shadow-black/40">
        <Suspense fallback={
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          </div>
        }>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
