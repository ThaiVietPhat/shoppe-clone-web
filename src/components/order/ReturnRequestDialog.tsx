'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/error';
import { ReturnReasonCategory } from '@/types/api';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ImageUpload } from '@/components/shared/ImageUpload';
import { useAuthStore } from '@/stores/auth.store';
import { toast } from 'sonner';

const REASON_OPTIONS: { value: ReturnReasonCategory; label: string }[] = [
  { value: 'DEFECTIVE', label: 'Sản phẩm lỗi' },
  { value: 'WRONG_ITEM', label: 'Giao sai sản phẩm' },
  { value: 'NOT_AS_DESCRIBED', label: 'Không đúng mô tả' },
  { value: 'CHANGED_MIND', label: 'Đổi ý' },
  { value: 'OTHER', label: 'Khác' },
];

const MAX_EVIDENCE = 3;

interface ReturnRequestDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  orderId: string;
}

export function ReturnRequestDialog({ open, onOpenChange, orderId }: ReturnRequestDialogProps) {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const [reasonCategory, setReasonCategory] = useState<ReturnReasonCategory>('DEFECTIVE');
  const [description, setDescription] = useState('');
  const [evidence, setEvidence] = useState<Array<{ mediaId: string; url: string } | null>>([null]);

  const submit = useMutation({
    mutationFn: () =>
      api.post(`/api/buyer/orders/${orderId}/return`, {
        reasonCategory,
        description: description || undefined,
        evidenceMediaIds: evidence.filter((e): e is { mediaId: string; url: string } => !!e).map((e) => e.mediaId),
      }),
    onSuccess: () => {
      toast.success('Đã gửi yêu cầu trả hàng/hoàn tiền');
      qc.invalidateQueries({ queryKey: ['order', orderId] });
      qc.invalidateQueries({ queryKey: ['order-return', orderId] });
      onOpenChange(false);
      setDescription('');
      setEvidence([null]);
    },
    onError: (err: unknown) => toast.error(getApiErrorMessage(err, 'Gửi yêu cầu thất bại')),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-white/10 max-w-lg">
        <DialogHeader><DialogTitle>Yêu cầu trả hàng / hoàn tiền</DialogTitle></DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="reasonCategory">Lý do</Label>
            <select id="reasonCategory" value={reasonCategory}
              onChange={(e) => setReasonCategory(e.target.value as ReturnReasonCategory)}
              className="w-full h-9 rounded-md border border-white/10 bg-white/5 px-3 text-sm">
              {REASON_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Mô tả chi tiết</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
              placeholder="Mô tả tình trạng sản phẩm..." className="bg-white/5 border-white/10 resize-none" />
          </div>

          <div className="space-y-1.5">
            <Label>Hình ảnh minh chứng (tuỳ chọn, tối đa {MAX_EVIDENCE} ảnh)</Label>
            <div className="grid grid-cols-3 gap-2">
              {evidence.map((img, i) => (
                <ImageUpload
                  key={i}
                  purpose="RETURN_EVIDENCE"
                  ownerId={user?.id ?? ''}
                  ownerType="USER"
                  value={img}
                  onChange={(v) => setEvidence((prev) => prev.map((p, idx) => (idx === i ? v : p)))}
                />
              ))}
              {evidence.length < MAX_EVIDENCE && evidence[evidence.length - 1] != null && (
                <button type="button"
                  onClick={() => setEvidence((prev) => [...prev, null])}
                  className="aspect-square rounded-xl border border-dashed border-white/15 bg-white/3 text-xs text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors">
                  + Thêm ảnh
                </button>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" className="border-white/10" onClick={() => onOpenChange(false)}>Đóng</Button>
          <Button className="bg-primary" disabled={submit.isPending} onClick={() => submit.mutate()}>
            {submit.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Gửi yêu cầu'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
