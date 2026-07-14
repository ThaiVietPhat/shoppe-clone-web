'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/error';
import { cn } from '@/lib/utils';

const schema = z.object({
  email: z.string().email('Email không hợp lệ'),
});

type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const router = useRouter();
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
      await api.post('/api/auth/forgot-password', values);
      setSuccess(true);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { code?: number } } };
      const code = axiosErr?.response?.data?.code;

      if (code === 429) {
        setGlobalError('Quá nhiều lần thử. Vui lòng thử lại sau.');
      } else {
        setGlobalError(getApiErrorMessage(err, 'Có lỗi xảy ra. Vui lòng thử lại.'));
      }
    }
  }

  if (success) {
    return (
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-white/8 bg-card p-10 shadow-xl shadow-black/40 text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle2 className="h-14 w-14 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Kiểm tra email của bạn</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Nếu email này đã đăng ký tài khoản, chúng tôi đã gửi một link đặt lại mật khẩu đến hộp thư của bạn.
          </p>
          <Button
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
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
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Quên mật khẩu?</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Nhập email của bạn, chúng tôi sẽ gửi link đặt lại mật khẩu.
          </p>
        </div>

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

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium glow-primary-sm mt-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang gửi...
              </>
            ) : (
              'Gửi link đặt lại mật khẩu'
            )}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Nhớ mật khẩu?{' '}
            <Link href="/login" className="text-primary hover:text-primary/80 font-medium transition-colors">
              Đăng nhập
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
