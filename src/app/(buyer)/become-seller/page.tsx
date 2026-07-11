'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Loader2, MapPin, Plus, Store } from 'lucide-react';
import { api, setAccessToken } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/error';
import { useAuthStore } from '@/stores/auth.store';
import { Address, CurrentUserResponse } from '@/types/api';
import { toStoreUser } from '@/lib/user';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { AddressDialog } from '@/components/address/AddressDialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function BecomeSellerPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { setUser } = useAuthStore();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: addresses, isLoading: addrLoading } = useQuery({
    queryKey: ['addresses'],
    queryFn: async () => {
      const { data } = await api.get<{ data: Address[] }>('/api/addresses');
      const list = data.data;
      const def = list.find((a) => a.isDefault) ?? list[0];
      if (def && !selectedAddressId) setSelectedAddressId(def.id);
      return list;
    },
  });

  const invalidateAddresses = () => qc.invalidateQueries({ queryKey: ['addresses'] });

  const createShop = useMutation({
    mutationFn: () => api.post('/api/shops', { name, description: description || null, addressId: selectedAddressId }),
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
    if (!selectedAddressId) return toast.error('Vui lòng chọn địa chỉ shop');
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

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-foreground/80 flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-primary" /> Địa chỉ shop
            </Label>
            <Button variant="ghost" size="sm" className="text-primary gap-1 text-xs h-auto py-1" onClick={() => setDialogOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> Thêm địa chỉ
            </Button>
          </div>

          {addrLoading ? (
            <Skeleton className="h-16 w-full rounded-lg bg-white/5" />
          ) : !addresses || addresses.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">Chưa có địa chỉ. Vui lòng thêm địa chỉ shop.</p>
          ) : (
            <div className="space-y-2">
              {addresses.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setSelectedAddressId(a.id)}
                  className={cn(
                    'flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors',
                    selectedAddressId === a.id
                      ? 'border-primary bg-primary/5'
                      : 'border-white/10 hover:border-white/20'
                  )}
                >
                  <div className={cn(
                    'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
                    selectedAddressId === a.id ? 'border-primary bg-primary' : 'border-white/30'
                  )}>
                    {selectedAddressId === a.id && <Check className="h-3 w-3 text-primary-foreground" />}
                  </div>
                  <div className="text-sm min-w-0">
                    <p className="font-medium text-foreground">
                      {a.recipientName} <span className="text-muted-foreground font-normal">· {a.phone}</span>
                    </p>
                    <p className="text-muted-foreground mt-0.5">
                      {a.addressLine}, {a.wardName}, {a.districtName}, {a.provinceName}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <Button className="bg-primary gap-1.5 w-full" disabled={createShop.isPending} onClick={handleSubmit}>
          {createShop.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Tạo shop'}
        </Button>
      </div>

      <AddressDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSaved={(addr) => {
          invalidateAddresses();
          setSelectedAddressId(addr.id);
        }}
      />
    </div>
  );
}
