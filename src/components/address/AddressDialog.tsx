'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Address } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
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

export function AddressDialog({
  open, initial, onOpenChange, onSaved,
}: {
  open: boolean;
  initial?: Address;
  onOpenChange: (v: boolean) => void;
  onSaved: (addr: Address) => void;
}) {
  const isEdit = !!initial;
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<AddressForm>({
    resolver: zodResolver(addressSchema),
    defaultValues: initial ? {
      recipientName: initial.recipientName,
      phone: initial.phone,
      addressLine: initial.addressLine,
      wardName: initial.wardName,
      districtName: initial.districtName,
      provinceName: initial.provinceName,
      isDefault: initial.isDefault,
    } : undefined,
  });

  async function onSubmit(values: AddressForm) {
    try {
      // Backend requires GHN-compatible ward/district/province codes alongside display names.
      // There is no location-picker/GHN reference data wired up yet, so the entered name is
      // reused as the code — this satisfies validation but is not a real GHN code lookup.
      const body = {
        ...values,
        wardCode: values.wardName,
        districtCode: values.districtName,
        provinceCode: values.provinceName,
      };
      const { data } = isEdit
        ? await api.put<{ data: Address }>(`/api/addresses/${initial.id}`, body)
        : await api.post<{ data: Address }>('/api/addresses', body);
      toast.success(isEdit ? 'Đã cập nhật địa chỉ' : 'Đã thêm địa chỉ');
      onSaved(data.data);
      reset();
      onOpenChange(false);
    } catch {
      toast.error(isEdit ? 'Không thể cập nhật địa chỉ' : 'Không thể thêm địa chỉ');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-white/10">
        <DialogHeader><DialogTitle>{isEdit ? 'Sửa địa chỉ' : 'Thêm địa chỉ'}</DialogTitle></DialogHeader>
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
