'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/error';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

const REASONS = [
  { value: 'COUNTERFEIT', label: 'Hàng giả/nhái' },
  { value: 'PROHIBITED', label: 'Hàng cấm' },
  { value: 'MISLEADING', label: 'Thông tin sai lệch' },
  { value: 'ABUSE', label: 'Lạm dụng/quấy rối' },
  { value: 'OTHER', label: 'Khác' },
] as const;

interface ReportDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  targetType: 'PRODUCT' | 'SHOP';
  targetId: string;
}

export function ReportDialog({ open, onOpenChange, targetType, targetId }: ReportDialogProps) {
  const [reasonCategory, setReasonCategory] = useState<(typeof REASONS)[number]['value']>('OTHER');
  const [description, setDescription] = useState('');

  const submit = useMutation({
    mutationFn: () => api.post('/api/reports', { targetType, targetId, reasonCategory, description: description || undefined }),
    onSuccess: () => {
      toast.success('Đã gửi báo cáo. Cảm ơn bạn đã phản hồi!');
      onOpenChange(false);
      setDescription('');
      setReasonCategory('OTHER');
    },
    onError: (err: unknown) => {
      toast.error(getApiErrorMessage(err, 'Không thể gửi báo cáo'));
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-white/10">
        <DialogHeader><DialogTitle>Báo cáo vi phạm</DialogTitle></DialogHeader>

        <div className="space-y-1.5">
          <Label htmlFor="reasonCategory">Lý do báo cáo</Label>
          <select
            id="reasonCategory"
            value={reasonCategory}
            onChange={(e) => setReasonCategory(e.target.value as typeof reasonCategory)}
            className="w-full h-9 rounded-md border border-white/10 bg-white/5 px-3 text-sm"
          >
            {REASONS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="description">Mô tả chi tiết (tuỳ chọn)</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Cho chúng tôi biết thêm chi tiết..."
            rows={4}
            className="bg-white/5 border-white/10 resize-none"
          />
        </div>

        <DialogFooter>
          <Button onClick={() => submit.mutate()} disabled={submit.isPending} className="bg-primary">
            {submit.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Gửi báo cáo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
