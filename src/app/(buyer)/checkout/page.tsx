'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';
import { MapPin, Plus, Loader2, CreditCard, Banknote, AlertCircle, Check, Pencil, Trash2, Star } from 'lucide-react';
import { api } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/error';
import { Address, CheckoutPreview, CheckoutResponse, PaymentStatusResponse } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { AddressDialog } from '@/components/address/AddressDialog';
import { formatPrice, cn } from '@/lib/utils';
import { CHECKOUT_INVALID_REASON } from '@/lib/orderStatus';
import { useAuthStore } from '@/stores/auth.store';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { toast } from 'sonner';

export default function CheckoutPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const { ready } = useRequireAuth();
  const [idempotencyKey] = useState(() => uuidv4());
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'VNPAY' | 'COD'>('COD');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [deletingAddressId, setDeletingAddressId] = useState<string | null>(null);

  const { data: addresses, isLoading: addrLoading } = useQuery({
    queryKey: ['addresses'],
    queryFn: async () => {
      const { data } = await api.get<{ data: Address[] }>('/api/addresses');
      const list = data.data;
      const def = list.find((a) => a.isDefault) ?? list[0];
      if (def && !selectedAddressId) setSelectedAddressId(def.id);
      return list;
    },
    enabled: !!user,
  });

  const invalidateAddresses = () => qc.invalidateQueries({ queryKey: ['addresses'] });

  const deleteAddress = useMutation({
    mutationFn: (addressId: string) => api.delete(`/api/addresses/${addressId}`),
    onSuccess: () => {
      toast.success('Đã xoá địa chỉ');
      invalidateAddresses();
      setDeletingAddressId(null);
    },
    onError: () => toast.error('Không thể xoá địa chỉ'),
  });

  const setDefaultAddress = useMutation({
    mutationFn: (addressId: string) => api.patch(`/api/addresses/${addressId}/default`),
    onSuccess: () => {
      toast.success('Đã đặt làm địa chỉ mặc định');
      invalidateAddresses();
    },
    onError: () => toast.error('Không thể đặt làm mặc định'),
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
      toast.error(getApiErrorMessage(err, 'Đặt hàng thất bại, vui lòng thử lại'));
    },
  });

  const canPlaceOrder = !!selectedAddressId && !!preview?.allItemsValid && !previewLoading;

  if (!ready) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-6 space-y-3">
        <Skeleton className="h-8 w-40 bg-white/5" />
        <Skeleton className="h-24 w-full rounded-lg bg-white/5" />
        <Skeleton className="h-24 w-full rounded-lg bg-white/5" />
      </div>
    );
  }

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
                <div
                  key={a.id}
                  className={cn(
                    'flex w-full items-start gap-3 rounded-lg border p-3 transition-colors',
                    selectedAddressId === a.id
                      ? 'border-primary bg-primary/5'
                      : 'border-white/10 hover:border-white/20'
                  )}
                >
                  <button onClick={() => setSelectedAddressId(a.id)} className="flex flex-1 items-start gap-3 text-left min-w-0">
                    <div className={cn(
                      'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
                      selectedAddressId === a.id ? 'border-primary bg-primary' : 'border-white/30'
                    )}>
                      {selectedAddressId === a.id && <Check className="h-3 w-3 text-primary-foreground" />}
                    </div>
                    <div className="text-sm min-w-0">
                      <p className="font-medium text-foreground">
                        {a.recipientName} <span className="text-muted-foreground font-normal">· {a.phone}</span>
                        {a.isDefault && <span className="ml-2 text-xs text-primary">[Mặc định]</span>}
                      </p>
                      <p className="text-muted-foreground mt-0.5">
                        {a.addressLine}, {a.wardName}, {a.districtName}, {a.provinceName}
                      </p>
                    </div>
                  </button>
                  <div className="flex items-center gap-1 shrink-0">
                    {!a.isDefault && (
                      <button title="Đặt làm mặc định" disabled={setDefaultAddress.isPending}
                        onClick={() => setDefaultAddress.mutate(a.id)}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-white/5 transition-colors">
                        <Star className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button title="Sửa địa chỉ" onClick={() => setEditingAddress(a)}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button title="Xoá địa chỉ" onClick={() => setDeletingAddressId(a.id)}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-white/5 transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
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
        onSaved={(addr) => {
          invalidateAddresses();
          setSelectedAddressId(addr.id);
        }}
      />

      {editingAddress && (
        <AddressDialog
          open
          initial={editingAddress}
          onOpenChange={(v) => !v && setEditingAddress(null)}
          onSaved={() => {
            invalidateAddresses();
            setEditingAddress(null);
          }}
        />
      )}

      <Dialog open={!!deletingAddressId} onOpenChange={(v) => !v && setDeletingAddressId(null)}>
        <DialogContent className="bg-card border-white/10">
          <DialogHeader><DialogTitle>Xoá địa chỉ</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Bạn có chắc chắn muốn xoá địa chỉ này?</p>
          <DialogFooter>
            <Button variant="outline" className="border-white/10" onClick={() => setDeletingAddressId(null)}>Đóng</Button>
            <Button variant="outline" className="border-destructive/30 text-destructive hover:bg-destructive/10"
              disabled={deleteAddress.isPending} onClick={() => deletingAddressId && deleteAddress.mutate(deletingAddressId)}>
              {deleteAddress.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Xoá'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
