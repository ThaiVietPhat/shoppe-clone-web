'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { Loader2, Store } from 'lucide-react';
import { api, setAccessToken } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/error';
import { useAuthStore } from '@/stores/auth.store';
import { CurrentUserResponse } from '@/types/api';
import { toStoreUser } from '@/lib/user';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export default function BecomeSellerPage() {
  const router = useRouter();
  const { setUser } = useAuthStore();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const createShop = useMutation({
    mutationFn: () => api.post('/api/shops', { name, description: description || null }),
    onSuccess: async () => {
      // The shop is already created at this point; refreshing the token just picks up the
      // new SELLER role sooner. If it fails here, the axios 401 interceptor will still pick
      // it up on the next authenticated request, so don't block success on it.
      try {
        const { data: refreshed } = await api.post<{ data: { accessToken: string } }>('/api/auth/refresh');
        setAccessToken(refreshed.data.accessToken);

        const { data: me } = await api.get<{ data: CurrentUserResponse }>('/api/users/me');
        setUser(toStoreUser(me.data));
      } catch {
        // Ignored — see comment above.
      }

      toast.success('Đăng ký bán hàng thành công!');
      router.push('/seller/dashboard');
    },
    onError: (err: unknown) => {
      toast.error(getApiErrorMessage(err, 'Không thể đăng ký bán hàng'));
    },
  });

  function handleSubmit() {
    if (name.trim().length < 3) return toast.error('Tên shop phải từ 3 ký tự trở lên');
    createShop.mutate();
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-10">
      <div className="mb-6 flex items-center gap-2">
        <Store className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-semibold text-foreground">Đăng ký bán hàng</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Tạo shop của riêng bạn để bắt đầu đăng bán sản phẩm trên nền tảng.
      </p>

      <div className="rounded-xl border border-white/8 bg-card p-5 space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-foreground/80">Tên shop</Label>
          <Input
            value={name}
            maxLength={100}
            placeholder="vd: TechHub Store"
            className="bg-white/5 border-white/10"
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-foreground/80">Mô tả (tuỳ chọn)</Label>
          <Textarea
            value={description}
            maxLength={1000}
            rows={4}
            className="bg-white/5 border-white/10 resize-none"
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <Button className="bg-primary gap-1.5 w-full" disabled={createShop.isPending} onClick={handleSubmit}>
          {createShop.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Tạo shop'}
        </Button>
      </div>
    </div>
  );
}
