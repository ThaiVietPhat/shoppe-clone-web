'use client';

import { useState } from 'react';
import { Star, Loader2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/error';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ReviewDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  orderItemId: string;
  productName: string;
  orderId: string;
}

export function ReviewDialog({ open, onOpenChange, orderItemId, productName, orderId }: ReviewDialogProps) {
  const qc = useQueryClient();
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');

  const submit = useMutation({
    mutationFn: () => api.post('/api/reviews', { orderItemId, rating, comment }),
    onSuccess: () => {
      toast.success('Cảm ơn đánh giá của bạn!');
      qc.invalidateQueries({ queryKey: ['order', orderId] });
      onOpenChange(false);
      setComment('');
      setRating(5);
    },
    onError: (err: unknown) => {
      toast.error(getApiErrorMessage(err, 'Không thể gửi đánh giá'));
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-white/10">
        <DialogHeader><DialogTitle>Đánh giá sản phẩm</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground line-clamp-1">{productName}</p>

        <div className="flex justify-center gap-1.5 py-3">
          {[1, 2, 3, 4, 5].map((s) => (
            <button key={s} type="button" onMouseEnter={() => setHover(s)} onMouseLeave={() => setHover(0)} onClick={() => setRating(s)}>
              <Star className={cn('h-8 w-8 transition-colors', s <= (hover || rating) ? 'fill-amber-400 text-amber-400' : 'text-white/20')} />
            </button>
          ))}
        </div>

        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Chia sẻ cảm nhận của bạn về sản phẩm..."
          rows={4}
          className="bg-white/5 border-white/10 resize-none"
        />

        <DialogFooter>
          <Button onClick={() => submit.mutate()} disabled={submit.isPending} className="bg-primary">
            {submit.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Gửi đánh giá'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
