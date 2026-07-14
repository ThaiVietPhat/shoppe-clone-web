'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ticket, Plus, Loader2, Power, PowerOff, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/error';
import { Voucher } from '@/types/api';
import { pageFrom, PagedResponse } from '@/lib/page';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Pagination } from '@/components/shared/Pagination';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatDateTime, formatPrice, cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { toast } from 'sonner';

const emptyToUndefined = (v: unknown) => (v === '' || v === undefined ? undefined : v);

const schema = z.object({
  code: z.string().min(3, 'Mã ít nhất 3 ký tự').max(30),
  discountType: z.enum(['PERCENTAGE', 'FIXED_AMOUNT']),
  discountValue: z.coerce.number().positive('Giá trị giảm phải lớn hơn 0'),
  maxDiscountAmount: z.preprocess(emptyToUndefined, z.coerce.number().nonnegative().optional()),
  minOrderAmount: z.coerce.number().nonnegative('Không được âm'),
  usageLimit: z.preprocess(emptyToUndefined, z.coerce.number().positive().optional()),
  startsAt: z.string().min(1, 'Bắt buộc'),
  expiresAt: z.string().min(1, 'Bắt buộc'),
});

type FormInput = z.input<typeof schema>;
type FormData = z.output<typeof schema>;

const STATUS_CLASS: Record<string, string> = {
  ACTIVE: 'bg-green-500/15 text-green-400 border-green-500/20',
  INACTIVE: 'bg-white/10 text-muted-foreground border-white/15',
  DELETED: 'bg-red-500/15 text-red-400 border-red-500/20',
};

export default function AdminVouchersPage() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const [page, setPage] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-vouchers', page],
    queryFn: async () => {
      const { data } = await api.get<{ data: PagedResponse<Voucher> }>(
        `/api/admin/vouchers?page=${page}&size=20`
      );
      return pageFrom(data.data);
    },
    enabled: !!user,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin-vouchers'] });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormData>({
    resolver: zodResolver(schema),
    defaultValues: { discountType: 'PERCENTAGE', minOrderAmount: 0 },
  });

  const discountType = watch('discountType');

  async function onCreate(values: FormData) {
    try {
      await api.post('/api/admin/vouchers', {
        code: values.code,
        discountType: values.discountType,
        discountValue: values.discountValue,
        maxDiscountAmount: values.maxDiscountAmount ?? null,
        minOrderAmount: values.minOrderAmount,
        usageLimit: values.usageLimit ?? null,
        startsAt: new Date(values.startsAt).toISOString(),
        expiresAt: new Date(values.expiresAt).toISOString(),
      });
      toast.success('Đã tạo voucher');
      setCreateOpen(false);
      reset();
      invalidate();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Tạo voucher thất bại'));
    }
  }

  const toggleActive = useMutation({
    mutationFn: ({ id, activate }: { id: string; activate: boolean }) =>
      api.patch(`/api/admin/vouchers/${id}/${activate ? 'activate' : 'deactivate'}`),
    onSuccess: (_d, vars) => {
      toast.success(vars.activate ? 'Đã kích hoạt voucher' : 'Đã tạm ngừng voucher');
      invalidate();
    },
    onError: (err: unknown) => toast.error(getApiErrorMessage(err, 'Thao tác thất bại')),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/api/admin/vouchers/${id}`),
    onSuccess: () => {
      toast.success('Đã xoá voucher');
      invalidate();
    },
    onError: (err: unknown) => toast.error(getApiErrorMessage(err, 'Xoá thất bại')),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-lg font-semibold text-foreground">Voucher</h1>
        <Button className="bg-primary gap-1.5" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> Tạo voucher
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl bg-white/5" />)}</div>
      ) : !data || data.content.length === 0 ? (
        <EmptyState icon={Ticket} title="Chưa có voucher"
          action={<Button className="bg-primary gap-1.5" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> Tạo voucher</Button>} />
      ) : (
        <>
          <div className="space-y-3">
            {data.content.map((v) => (
              <div key={v.id} className="rounded-xl border border-white/8 bg-card p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-mono font-semibold">{v.code}</p>
                      <Badge className={cn('text-[10px] border', STATUS_CLASS[v.status] ?? STATUS_CLASS.INACTIVE)}>{v.status}</Badge>
                    </div>
                    <p className="text-sm text-primary font-medium mt-1">
                      {v.discountType === 'PERCENTAGE' ? `Giảm ${v.discountValue}%` : `Giảm ${formatPrice(v.discountValue)}`}
                      {v.maxDiscountAmount != null && ` (tối đa ${formatPrice(v.maxDiscountAmount)})`}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Đơn tối thiểu {formatPrice(v.minOrderAmount)} · Đã dùng {v.usedCount}{v.usageLimit != null ? `/${v.usageLimit}` : ''}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDateTime(v.startsAt)} — {formatDateTime(v.expiresAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {v.status === 'ACTIVE' ? (
                      <Button size="sm" variant="outline" className="border-white/10 gap-1 text-xs"
                        disabled={toggleActive.isPending}
                        onClick={() => toggleActive.mutate({ id: v.id, activate: false })}>
                        <PowerOff className="h-3.5 w-3.5" /> Tạm ngừng
                      </Button>
                    ) : v.status === 'INACTIVE' ? (
                      <Button size="sm" variant="outline" className="border-primary/40 text-primary gap-1 text-xs"
                        disabled={toggleActive.isPending}
                        onClick={() => toggleActive.mutate({ id: v.id, activate: true })}>
                        <Power className="h-3.5 w-3.5" /> Kích hoạt
                      </Button>
                    ) : null}
                    {v.status !== 'DELETED' && (
                      <Button size="sm" variant="outline" className="border-destructive/40 text-destructive gap-1 text-xs"
                        disabled={remove.isPending}
                        onClick={() => remove.mutate(v.id)}>
                        <Trash2 className="h-3.5 w-3.5" /> Xoá
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <Pagination className="mt-8" page={data.page} totalPages={data.totalPages} onPageChange={setPage} />
        </>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-card border-white/10 max-w-lg">
          <DialogHeader><DialogTitle>Tạo voucher mới</DialogTitle></DialogHeader>

          <form onSubmit={handleSubmit(onCreate)} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="code">Mã voucher</Label>
              <Input id="code" placeholder="WELCOME10" className="bg-white/5 border-white/10 uppercase" {...register('code')} />
              {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="discountType">Loại giảm giá</Label>
                <select id="discountType" className="w-full h-9 rounded-md border border-white/10 bg-white/5 px-3 text-sm"
                  {...register('discountType')}>
                  <option value="PERCENTAGE">Phần trăm (%)</option>
                  <option value="FIXED_AMOUNT">Số tiền cố định</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="discountValue">
                  {discountType === 'PERCENTAGE' ? 'Phần trăm giảm' : 'Số tiền giảm'}
                </Label>
                <Input id="discountValue" type="number" step="0.01" className="bg-white/5 border-white/10"
                  {...register('discountValue')} />
                {errors.discountValue && <p className="text-xs text-destructive">{errors.discountValue.message}</p>}
              </div>
            </div>

            {discountType === 'PERCENTAGE' && (
              <div className="space-y-1.5">
                <Label htmlFor="maxDiscountAmount">Giảm tối đa (tuỳ chọn)</Label>
                <Input id="maxDiscountAmount" type="number" step="0.01" className="bg-white/5 border-white/10"
                  {...register('maxDiscountAmount')} />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="minOrderAmount">Đơn tối thiểu</Label>
                <Input id="minOrderAmount" type="number" step="0.01" className="bg-white/5 border-white/10"
                  {...register('minOrderAmount')} />
                {errors.minOrderAmount && <p className="text-xs text-destructive">{errors.minOrderAmount.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="usageLimit">Giới hạn lượt dùng (tuỳ chọn)</Label>
                <Input id="usageLimit" type="number" className="bg-white/5 border-white/10"
                  {...register('usageLimit')} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="startsAt">Bắt đầu</Label>
                <Input id="startsAt" type="datetime-local" className="bg-white/5 border-white/10"
                  {...register('startsAt')} />
                {errors.startsAt && <p className="text-xs text-destructive">{errors.startsAt.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="expiresAt">Kết thúc</Label>
                <Input id="expiresAt" type="datetime-local" className="bg-white/5 border-white/10"
                  {...register('expiresAt')} />
                {errors.expiresAt && <p className="text-xs text-destructive">{errors.expiresAt.message}</p>}
              </div>
            </div>

            <DialogFooter>
              <Button type="submit" disabled={isSubmitting} className="bg-primary">
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Tạo voucher'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
