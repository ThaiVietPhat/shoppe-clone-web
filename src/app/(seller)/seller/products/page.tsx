'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Package, Plus, Pencil, Eye, EyeOff } from 'lucide-react';
import { api } from '@/lib/api';
import { SellerProduct } from '@/types/api';
import { pageFrom, PagedResponse } from '@/lib/page';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination } from '@/components/shared/Pagination';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatPriceRange, formatDateTime, cn } from '@/lib/utils';
import { toast } from 'sonner';

const STATUS_FILTERS = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'ACTIVE', label: 'Đang bán' },
  { value: 'DRAFT', label: 'Nháp' },
  { value: 'INACTIVE', label: 'Đã ẩn' },
];

const STATUS_CLASS: Record<string, string> = {
  ACTIVE: 'bg-green-500/15 text-green-400 border-green-500/20',
  DRAFT: 'bg-white/10 text-muted-foreground border-white/15',
  INACTIVE: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Đang bán', DRAFT: 'Nháp', INACTIVE: 'Đã ẩn', DELETED: 'Đã xoá',
};

export default function SellerProductsPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState('ALL');
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ['seller-products', status, page],
    queryFn: async () => {
      const { data } = await api.get<{ data: PagedResponse<SellerProduct> }>(
        `/api/seller/products?page=${page}&size=20&status=${status}`
      );
      return pageFrom(data.data);
    },
  });

  const togglePublish = useMutation({
    mutationFn: ({ id, publish }: { id: string; publish: boolean }) =>
      api.post(`/api/products/${id}/${publish ? 'publish' : 'unpublish'}`),
    onSuccess: (_d, vars) => {
      toast.success(vars.publish ? 'Đã đăng bán' : 'Đã ẩn sản phẩm');
      qc.invalidateQueries({ queryKey: ['seller-products'] });
    },
    onError: (err: unknown) => {
      const ax = err as { response?: { data?: { message?: string } } };
      toast.error(ax?.response?.data?.message ?? 'Thao tác thất bại');
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-lg font-semibold text-foreground">Sản phẩm</h1>
        <Link href="/seller/products/new">
          <Button className="bg-primary gap-1.5"><Plus className="h-4 w-4" /> Thêm sản phẩm</Button>
        </Link>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {STATUS_FILTERS.map((f) => (
          <button key={f.value} onClick={() => { setStatus(f.value); setPage(0); }}
            className={cn('text-sm px-3 py-1.5 rounded-lg transition-colors',
              status === f.value ? 'bg-primary text-primary-foreground font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-white/5')}>
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl bg-white/5" />)}</div>
      ) : !data || data.content.length === 0 ? (
        <EmptyState icon={Package} title="Chưa có sản phẩm"
          action={<Link href="/seller/products/new"><Button className="bg-primary gap-1.5"><Plus className="h-4 w-4" /> Thêm sản phẩm</Button></Link>} />
      ) : (
        <>
          <div className="space-y-3">
            {data.content.map((p) => {
              const cover = p.media.find((m) => m.cover) ?? p.media[0];
              return (
              <div key={p.id} className="flex items-center gap-4 rounded-xl border border-white/8 bg-card p-4">
                <div className="relative h-16 w-16 shrink-0 rounded-lg overflow-hidden bg-white/5">
                  {cover ? <Image src={cover.publicUrl} alt="" fill sizes="64px" className="object-cover" /> : (
                    <div className="flex h-full items-center justify-center text-muted-foreground/30"><Package className="h-6 w-6" /></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium line-clamp-1">{p.name}</p>
                    <Badge className={cn('text-[10px] border shrink-0', STATUS_CLASS[p.status] ?? STATUS_CLASS.DRAFT)}>{STATUS_LABEL[p.status] ?? p.status}</Badge>
                  </div>
                  <p className="text-sm text-primary font-medium mt-0.5">{formatPriceRange(p.minPrice, p.maxPrice)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {p.variants.length} phiên bản · Kho {p.totalAvailableStock} · {formatDateTime(p.updatedAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link href={`/seller/products/${p.id}/edit`}>
                    <Button size="sm" variant="outline" className="border-white/10 gap-1 text-xs"><Pencil className="h-3.5 w-3.5" /> Sửa</Button>
                  </Link>
                  {p.status === 'ACTIVE' ? (
                    <Button size="sm" variant="outline" className="border-white/10 gap-1 text-xs"
                      disabled={togglePublish.isPending}
                      onClick={() => togglePublish.mutate({ id: p.id, publish: false })}>
                      <EyeOff className="h-3.5 w-3.5" /> Ẩn
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" className="border-primary/40 text-primary gap-1 text-xs"
                      disabled={togglePublish.isPending}
                      onClick={() => togglePublish.mutate({ id: p.id, publish: true })}>
                      <Eye className="h-3.5 w-3.5" /> Đăng bán
                    </Button>
                  )}
                </div>
              </div>
              );
            })}
          </div>
          <Pagination className="mt-8" page={data.page} totalPages={data.totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
