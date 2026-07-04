'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MapPin, Plus, Loader2, CreditCard, Banknote, AlertCircle, Check } from 'lucide-react';
import { api } from '@/lib/api';
import { Address, CheckoutPreview, CheckoutResponse, PaymentStatusResponse } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { formatPrice, cn } from '@/lib/utils';
import { CHECKOUT_INVALID_REASON } from '@/lib/orderStatus';
import { toast } from 'sonner';

const addressSchema = z.object({
  recipientName: z.string().min(1, 'Nhập tên người nhận'),
  phone: z.string().min(8, 'Số điện thoại không hợp lệ'),
  addressLine: z.string().min(1, 'Nhập địa chỉ'),
  wardName: z.string().min(1, 'Nhập phường/xã'),
  districtName: z.string().min(1, 'Nhập quận/huyện'),
  provinceName: z.string().min(1, 'Nhập tỉnh/thành'),
  isDefault: z.boolean().optional(),
});
type AddressForm = z.infer<typeof addressSchema>;

export default function CheckoutPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [idempotencyKey] = useState(() => uuidv4());
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'VNPAY' | 'COD'>('COD');
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: addresses, isLoading: addrLoading } = useQuery({
    queryKey: ['addresses'],
    queryFn: async () => {
      const { data } = await api.get<{ data: Address[] }>('/api/users/me/addresses');
      const list = data.data;
      const def = list.find((a) => a.isDefault) ?? list[0];
      if (def && !selectedAddressId) setSelectedAddressId(def.id);
      return list;
    },
  });

  const { data: preview, isFetching: previewLoading } = useQuery({
    queryKey: ['checkout-preview', selectedAddressId],
    queryFn: async () => {
      const { data } = await api.post<{ data: CheckoutPreview }>('/api/orders/preview', {
        addressId: selectedAddressId,
      });
      return data.data;
    },
    enabled: !!selectedAddressId,
  });

  const placeOrder = useMutation({
    mutationFn: async () => {
      const { data: checkoutRes } = await api.post<{ data: CheckoutResponse }>(
        '/api/orders',
        { addressId: selectedAddressId },
        { headers: { 'Idempotency-Key': idempotencyKey } }
      );
      const { data: paymentRes } = await api.post<{ data: PaymentStatusResponse }>(
        '/api/payments/initiate',
        { checkoutSessionId: checkoutRes.data.checkoutSessionId, method: paymentMethod }
      );
      return { checkout: checkoutRes.data, payment: paymentRes.data };
    },
    onSuccess: ({ checkout, payment }) => {
      qc.invalidateQueries({ queryKey: ['cart'] });
      if (payment.nextAction) {
        window.location.href = payment.nextAction;
      } else {
        router.push(`/orders/${checkout.orderIds[0]}`);
      }
    },
    onError: (err: unknown) => {
      const ax = err as { response?: { data?: { message?: string } } };
      toast.error(ax?.response?.data?.message ?? 'Đặt hàng thất bại, vui lòng thử lại');
    },
  });

  const canPlaceOrder = !!selectedAddressId && !!preview?.allItemsValid && !previewLoading;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="text-lg font-semibold text-foreground mb-5">Thanh toán</h1>

      <div className="space-y-5">
        {/* Address */}
        <section className="rounded-xl border border-white/8 bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" /> Địa chỉ giao hàng
            </h2>
            <Button variant="ghost" size="sm" className="text-primary gap-1 text-xs" onClick={() => setDialogOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> Thêm địa chỉ
            </Button>
          </div>

          {addrLoading ? (
            <Skeleton className="h-16 w-full rounded-lg bg-white/5" />
          ) : !addresses || addresses.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">Chưa có địa chỉ. Vui lòng thêm địa chỉ giao hàng.</p>
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
                  <div className="text-sm">
                    <p className="font-medium text-foreground">
                      {a.recipientName} <span className="text-muted-foreground font-normal">· {a.phone}</span>
                      {a.isDefault && <span className="ml-2 text-xs text-primary">[Mặc định]</span>}
                    </p>
                    <p className="text-muted-foreground mt-0.5">
                      {a.addressLine}, {a.wardName}, {a.districtName}, {a.provinceName}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Order preview */}
        <section className="rounded-xl border border-white/8 bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground mb-3">Sản phẩm</h2>
          {previewLoading ? (
            <Skeleton className="h-24 w-full rounded-lg bg-white/5" />
          ) : !selectedAddressId ? (
            <p className="text-sm text-muted-foreground">Chọn địa chỉ để xem chi tiết đơn hàng.</p>
          ) : preview ? (
            <div className="space-y-4">
              {preview.shops.map((g) => (
                <div key={g.shopId} className="rounded-lg border border-white/6 overflow-hidden">
                  <p className="px-3 py-2 text-xs font-medium text-muted-foreground border-b border-white/6">{g.shopName}</p>
                  <div className="divide-y divide-white/6">
                    {g.items.map((it) => (
                      <div key={it.variantId} className="flex items-center justify-between px-3 py-2.5 text-sm">
                        <div className="min-w-0">
                          <p className="line-clamp-1 text-foreground">{it.productName}</p>
                          <p className="text-xs text-muted-foreground">
                            {it.variantName} · x{it.quantity}
                            {!it.valid && it.invalidReasonCode && (
                              <span className="text-destructive ml-1">
                                ({CHECKOUT_INVALID_REASON[it.invalidReasonCode] ?? it.invalidReasonCode})
                              </span>
                            )}
                          </p>
                        </div>
                        <span className="text-foreground shrink-0 ml-3">{formatPrice(it.itemTotal)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between px-3 py-2 text-xs text-muted-foreground border-t border-white/6">
                    <span>Phí vận chuyển</span>
                    <span>{formatPrice(g.shippingFee)}</span>
                  </div>
                </div>
              ))}

              {!preview.allItemsValid && preview.invalidItems.length > 0 && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Một số sản phẩm không hợp lệ:</p>
                    <ul className="mt-1 space-y-0.5 text-xs">
                      {preview.invalidItems.map((it) => (
                        <li key={it.variantId}>
                          {it.productName} — {(it.invalidReasonCode && CHECKOUT_INVALID_REASON[it.invalidReasonCode]) ?? it.invalidReasonCode}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </section>

        {/* Payment method */}
        <section className="rounded-xl border border-white/8 bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground mb-3">Phương thức thanh toán</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {([
              { value: 'COD', label: 'Thanh toán khi nhận hàng', icon: Banknote },
              { value: 'VNPAY', label: 'VNPay', icon: CreditCard },
            ] as const).map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setPaymentMethod(value)}
                className={cn(
                  'flex items-center gap-3 rounded-lg border p-3 text-sm transition-colors',
                  paymentMethod === value ? 'border-primary bg-primary/5 text-foreground' : 'border-white/10 text-muted-foreground hover:border-white/20'
                )}
              >
                <Icon className="h-5 w-5 text-primary" />
                {label}
              </button>
            ))}
          </div>
        </section>

        {/* Total + place order */}
        <section className="rounded-xl border border-white/8 bg-card p-5">
          {preview && (
            <div className="space-y-2 mb-4 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Tạm tính</span><span>{formatPrice(preview.totalItemsSubtotal)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Phí vận chuyển</span><span>{formatPrice(preview.totalShippingFee)}</span></div>
              <div className="flex justify-between pt-2 border-t border-white/8 text-base font-bold">
                <span>Tổng cộng</span><span className="text-primary">{formatPrice(preview.grandTotal)}</span>
              </div>
            </div>
          )}
          <Button
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium glow-primary-sm"
            disabled={!canPlaceOrder || placeOrder.isPending}
            onClick={() => placeOrder.mutate()}
          >
            {placeOrder.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Đang đặt hàng...</> : 'Đặt hàng'}
          </Button>
        </section>
      </div>

      <AddressDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={(addr) => {
          qc.invalidateQueries({ queryKey: ['addresses'] });
          setSelectedAddressId(addr.id);
        }}
      />
    </div>
  );
}

function AddressDialog({
  open, onOpenChange, onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (addr: Address) => void;
}) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<AddressForm>({
    resolver: zodResolver(addressSchema),
  });

  async function onSubmit(values: AddressForm) {
    try {
      // Backend requires GHN-compatible ward/district/province codes alongside display names.
      // There is no location-picker/GHN reference data wired up yet, so the entered name is
      // reused as the code — this satisfies validation but is not a real GHN code lookup.
      const { data } = await api.post<{ data: Address }>('/api/users/me/addresses', {
        ...values,
        wardCode: values.wardName,
        districtCode: values.districtName,
        provinceCode: values.provinceName,
      });
      toast.success('Đã thêm địa chỉ');
      onCreated(data.data);
      reset();
      onOpenChange(false);
    } catch {
      toast.error('Không thể thêm địa chỉ');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-white/10">
        <DialogHeader><DialogTitle>Thêm địa chỉ giao hàng</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Người nhận" error={errors.recipientName?.message}>
              <Input {...register('recipientName')} className="bg-white/5 border-white/10" />
            </Field>
            <Field label="Số điện thoại" error={errors.phone?.message}>
              <Input {...register('phone')} className="bg-white/5 border-white/10" />
            </Field>
          </div>
          <Field label="Địa chỉ (số nhà, đường)" error={errors.addressLine?.message}>
            <Input {...register('addressLine')} className="bg-white/5 border-white/10" />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Phường/Xã" error={errors.wardName?.message}>
              <Input {...register('wardName')} className="bg-white/5 border-white/10" />
            </Field>
            <Field label="Quận/Huyện" error={errors.districtName?.message}>
              <Input {...register('districtName')} className="bg-white/5 border-white/10" />
            </Field>
            <Field label="Tỉnh/Thành" error={errors.provinceName?.message}>
              <Input {...register('provinceName')} className="bg-white/5 border-white/10" />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" {...register('isDefault')} className="h-4 w-4 accent-primary" />
            Đặt làm địa chỉ mặc định
          </label>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting} className="bg-primary">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Lưu địa chỉ'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-foreground/80">{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
