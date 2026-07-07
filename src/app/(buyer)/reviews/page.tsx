'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Star, MessageSquareText, Loader2, Pencil } from 'lucide-react';
import { api } from '@/lib/api';
import { Review } from '@/types/api';
import { pageFrom, PagedResponse } from '@/lib/page';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Pagination } from '@/components/shared/Pagination';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatDateTime, cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { toast } from 'sonner';

export default function MyReviewsPage() {
  const { user } = useAuthStore();
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<Review | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['my-reviews', page],
    queryFn: async () => {
      const { data } = await api.get<{ data: PagedResponse<Review> }>(
        `/api/reviews/me?page=${page}&size=20`
      );
      return pageFrom(data.data);
    },
    enabled: !!user,
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="text-lg font-semibold text-foreground mb-4">Đánh giá của tôi</h1>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl bg-white/5" />)}</div>
      ) : !data || data.content.length === 0 ? (
        <EmptyState icon={MessageSquareText} title="Bạn chưa có đánh giá nào" />
      ) : (
        <>
          <div className="space-y-3">
            {data.content.map((r) => (
              <div key={r.id} className="rounded-xl border border-white/8 bg-card p-4">
                <div className="flex items-center justify-between">
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={cn('h-4 w-4', i < r.rating ? 'fill-amber-400 text-amber-400' : 'text-white/20')} />
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">{formatDateTime(r.createdAt)}</span>
                </div>
                {r.comment && <p className="text-sm text-foreground/80 mt-2 leading-relaxed">{r.comment}</p>}
                <div className="flex items-center justify-between mt-3">
                  <Link href={`/products/${r.productId}`} className="text-xs text-primary hover:text-primary/80 transition-colors">
                    Xem sản phẩm
                  </Link>
                  <Button size="sm" variant="outline" className="border-white/10 gap-1 text-xs" onClick={() => setEditing(r)}>
                    <Pencil className="h-3.5 w-3.5" /> Sửa
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <Pagination className="mt-8" page={data.page} totalPages={data.totalPages} onPageChange={setPage} />
        </>
      )}

      {editing && (
        <EditReviewDialog review={editing} onOpenChange={(v) => !v && setEditing(null)} />
      )}
    </div>
  );
}

function EditReviewDialog({ review, onOpenChange }: { review: Review; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient();
  const [rating, setRating] = useState(review.rating);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState(review.comment ?? '');

  const save = useMutation({
    mutationFn: () => api.patch(`/api/reviews/${review.id}`, { rating, comment }),
    onSuccess: () => {
      toast.success('Đã cập nhật đánh giá');
      qc.invalidateQueries({ queryKey: ['my-reviews'] });
      onOpenChange(false);
    },
    onError: () => toast.error('Không thể cập nhật đánh giá'),
  });

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-white/10">
        <DialogHeader><DialogTitle>Sửa đánh giá</DialogTitle></DialogHeader>
        <div className="flex justify-center gap-1.5 py-2">
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
          <Button variant="outline" className="border-white/10" onClick={() => onOpenChange(false)}>Đóng</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending} className="bg-primary">
            {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Lưu'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
