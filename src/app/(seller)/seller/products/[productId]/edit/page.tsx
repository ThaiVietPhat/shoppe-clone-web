'use client';

import { use, useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, ChevronLeft, Eye, EyeOff, Save } from 'lucide-react';
import { api } from '@/lib/api';
import { ProductDetail } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { formatPrice } from '@/lib/utils';
import { toast } from 'sonner';

export default function EditProductPage({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = use(params);
  const qc = useQueryClient();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [brand, setBrand] = useState('');
  const [stocks, setStocks] = useState<Record<string, string>>({});

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', productId],
    queryFn: async () => {
      const { data } = await api.get<{ data: ProductDetail }>(`/api/products/${productId}`);
      return data.data;
    },
  });

  useEffect(() => {
    if (product) {
      setName(product.name);
      setDescription(product.description ?? '');
      setBrand(product.brand ?? '');
    }
  }, [product]);

  const saveInfo = useMutation({
    mutationFn: () => api.patch(`/api/products/${productId}`, { name, description, brand: brand || null }),
    onSuccess: () => {
      toast.success('Đã lưu thông tin');
      qc.invalidateQueries({ queryKey: ['product', productId] });
    },
    onError: () => toast.error('Không thể lưu'),
  });

  const updateStock = useMutation({
    mutationFn: ({ variantId, quantity }: { variantId: string; quantity: number }) =>
      api.patch(`/api/inventories/variants/${variantId}/stock`, { quantity, note: 'Cập nhật từ trang quản lý' }),
    onSuccess: () => {
      toast.success('Đã cập nhật tồn kho');
      qc.invalidateQueries({ queryKey: ['product', productId] });
    },
    onError: () => toast.error('Không thể cập nhật tồn kho'),
  });

  const togglePublish = useMutation({
    mutationFn: (publish: boolean) => api.post(`/api/products/${productId}/${publish ? 'publish' : 'unpublish'}`),
    onSuccess: (_d, publish) => {
      toast.success(publish ? 'Đã đăng bán' : 'Đã ẩn');
      qc.invalidateQueries({ queryKey: ['product', productId] });
    },
    onError: (err: unknown) => {
      const ax = err as { response?: { data?: { message?: string } } };
      toast.error(ax?.response?.data?.message ?? 'Thao tác thất bại');
    },
  });

  if (isLoading) {
    return <div className="max-w-3xl space-y-4"><Skeleton className="h-8 w-40 bg-white/5" /><Skeleton className="h-64 w-full rounded-xl bg-white/5" /></div>;
  }
  if (!product) {
    return <div className="py-20 text-center text-muted-foreground">Không tìm thấy sản phẩm.</div>;
  }

  const isActive = product.status === 'ACTIVE';

  return (
    <div className="max-w-3xl">
      <Link href="/seller/products" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
        <ChevronLeft className="h-4 w-4" /> Danh sách sản phẩm
      </Link>

      <div className="flex items-center justify-between mb-5">
        <h1 className="text-lg font-semibold text-foreground">Chỉnh sửa sản phẩm</h1>
        {isActive ? (
          <Button variant="outline" className="border-white/10 gap-1.5" disabled={togglePublish.isPending} onClick={() => togglePublish.mutate(false)}>
            <EyeOff className="h-4 w-4" /> Ẩn sản phẩm
          </Button>
        ) : (
          <Button className="bg-primary gap-1.5" disabled={togglePublish.isPending} onClick={() => togglePublish.mutate(true)}>
            <Eye className="h-4 w-4" /> Đăng bán
          </Button>
        )}
      </div>

      <section className="rounded-xl border border-white/8 bg-card p-5 mb-5 space-y-3">
        <h2 className="text-sm font-semibold text-foreground mb-1">Thông tin cơ bản</h2>
        <Field label="Tên sản phẩm"><Input value={name} onChange={(e) => setName(e.target.value)} className="bg-white/5 border-white/10" /></Field>
        <Field label="Thương hiệu"><Input value={brand} onChange={(e) => setBrand(e.target.value)} className="bg-white/5 border-white/10" /></Field>
        <Field label="Mô tả"><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="bg-white/5 border-white/10 resize-none" /></Field>
        <Button className="bg-primary gap-1.5" disabled={saveInfo.isPending} onClick={() => saveInfo.mutate()}>
          {saveInfo.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4" /> Lưu thông tin</>}
        </Button>
      </section>

      <section className="rounded-xl border border-white/8 bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground mb-3">Phiên bản & tồn kho</h2>
        <div className="space-y-3">
          {product.variants.map((v) => (
            <div key={v.id} className="flex items-center gap-3 rounded-lg border border-white/8 p-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{Object.values(v.optionLabels).join(', ') || v.sku}</p>
                <p className="text-xs text-muted-foreground">{v.sku} · {formatPrice(v.price)} · Còn {v.availableStock}</p>
              </div>
              <Input
                inputMode="numeric"
                placeholder={String(v.availableStock)}
                value={stocks[v.id] ?? ''}
                onChange={(e) => setStocks((s) => ({ ...s, [v.id]: e.target.value }))}
                className="w-24 h-8 bg-white/5 border-white/10 text-sm"
              />
              <Button size="sm" variant="outline" className="border-white/10 text-xs"
                disabled={updateStock.isPending || stocks[v.id] === undefined || stocks[v.id] === ''}
                onClick={() => updateStock.mutate({ variantId: v.id, quantity: Number(stocks[v.id]) })}>
                Cập nhật
              </Button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-foreground/80">{label}</Label>
      {children}
    </div>
  );
}
