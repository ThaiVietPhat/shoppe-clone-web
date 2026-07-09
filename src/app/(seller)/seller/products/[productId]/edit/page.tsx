'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, ChevronLeft, Eye, EyeOff, Save, Trash2, Pencil, History } from 'lucide-react';
import { api } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/error';
import { Inventory, InventoryMovement, ProductDetail, ProductVariant } from '@/types/api';
import { pageFrom, PagedResponse } from '@/lib/page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import Link from 'next/link';
import { formatPrice, formatDateTime } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { toast } from 'sonner';

const MOVEMENT_TYPE_LABEL: Record<InventoryMovement['movementType'], string> = {
  INITIAL: 'Khởi tạo',
  STOCK_UPDATE: 'Cập nhật thủ công',
  RESERVE: 'Giữ hàng (đặt hàng)',
  CONFIRM: 'Xác nhận bán',
  RELEASE: 'Trả lại tồn kho',
};

export default function EditProductPage({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = use(params);
  const router = useRouter();
  const qc = useQueryClient();
  const { user } = useAuthStore();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [brand, setBrand] = useState('');
  const [stocks, setStocks] = useState<Record<string, string>>({});
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editVariant, setEditVariant] = useState<ProductVariant | null>(null);
  const [historyVariantId, setHistoryVariantId] = useState<string | null>(null);

  const { data: product, isLoading } = useQuery({
    queryKey: ['seller-product', productId],
    queryFn: async () => {
      const { data } = await api.get<{ data: ProductDetail }>(`/api/seller/products/${productId}`);
      return data.data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (product) {
      setName(product.name);
      setDescription(product.description ?? '');
      setBrand(product.brand ?? '');
    }
  }, [product]);

  const invalidateProduct = () => qc.invalidateQueries({ queryKey: ['seller-product', productId] });

  const saveInfo = useMutation({
    mutationFn: () => api.patch(`/api/products/${productId}`, { name, description, brand: brand || null }),
    onSuccess: () => {
      toast.success('Đã lưu thông tin');
      invalidateProduct();
    },
    onError: () => toast.error('Không thể lưu'),
  });

  const updateStock = useMutation({
    mutationFn: ({ variantId, availableStock }: { variantId: string; availableStock: number }) =>
      api.patch(`/api/inventories/variants/${variantId}/stock`, { availableStock }),
    onSuccess: () => {
      toast.success('Đã cập nhật tồn kho');
      invalidateProduct();
    },
    onError: () => toast.error('Không thể cập nhật tồn kho'),
  });

  const togglePublish = useMutation({
    mutationFn: (publish: boolean) => api.post(`/api/products/${productId}/${publish ? 'publish' : 'unpublish'}`),
    onSuccess: (_d, publish) => {
      toast.success(publish ? 'Đã đăng bán' : 'Đã ẩn');
      invalidateProduct();
    },
    onError: (err: unknown) => {
      toast.error(getApiErrorMessage(err, 'Thao tác thất bại'));
    },
  });

  const deleteProduct = useMutation({
    mutationFn: () => api.delete(`/api/products/${productId}`),
    onSuccess: () => {
      toast.success('Đã xoá sản phẩm');
      qc.invalidateQueries({ queryKey: ['seller-products'] });
      router.push('/seller/products');
    },
    onError: () => toast.error('Không thể xoá sản phẩm'),
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
        <div className="flex items-center gap-2">
          {isActive ? (
            <Button variant="outline" className="border-white/10 gap-1.5" disabled={togglePublish.isPending} onClick={() => togglePublish.mutate(false)}>
              <EyeOff className="h-4 w-4" /> Ẩn sản phẩm
            </Button>
          ) : (
            <Button className="bg-primary gap-1.5" disabled={togglePublish.isPending} onClick={() => togglePublish.mutate(true)}>
              <Eye className="h-4 w-4" /> Đăng bán
            </Button>
          )}
          <Button variant="outline" className="border-destructive/30 text-destructive hover:bg-destructive/10 gap-1.5" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-4 w-4" /> Xoá
          </Button>
        </div>
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
                <p className="text-sm font-medium">{Object.values(v.optionLabels).join(', ') || v.name}</p>
                <p className="text-xs text-muted-foreground">{v.sku} · {formatPrice(v.price)} · Còn {v.availableStock} {!v.active && '· Ngừng bán'}</p>
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
                onClick={() => updateStock.mutate({ variantId: v.id, availableStock: Number(stocks[v.id]) })}>
                Cập nhật
              </Button>
              <Button size="sm" variant="outline" className="border-white/10 text-xs px-2" title="Sửa phiên bản" onClick={() => setEditVariant(v)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant="outline" className="border-white/10 text-xs px-2" title="Lịch sử tồn kho" onClick={() => setHistoryVariantId(v.id)}>
                <History className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </section>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="bg-card border-white/10">
          <DialogHeader><DialogTitle>Xoá sản phẩm</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Sản phẩm sẽ bị ẩn khỏi cửa hàng và không thể khôi phục qua giao diện. Bạn có chắc chắn muốn xoá &quot;{product.name}&quot;?
          </p>
          <DialogFooter>
            <Button variant="outline" className="border-white/10" onClick={() => setDeleteOpen(false)}>Đóng</Button>
            <Button variant="outline" className="border-destructive/30 text-destructive hover:bg-destructive/10"
              disabled={deleteProduct.isPending} onClick={() => deleteProduct.mutate()}>
              {deleteProduct.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Xoá sản phẩm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {editVariant && (
        <EditVariantDialog
          productId={productId}
          variant={editVariant}
          onOpenChange={(v) => !v && setEditVariant(null)}
          onSaved={invalidateProduct}
        />
      )}

      {historyVariantId && (
        <InventoryHistoryDialog
          variantId={historyVariantId}
          onOpenChange={(v) => !v && setHistoryVariantId(null)}
        />
      )}
    </div>
  );
}

function EditVariantDialog({
  productId, variant, onOpenChange, onSaved,
}: {
  productId: string;
  variant: ProductVariant;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(variant.name);
  const [price, setPrice] = useState(String(variant.price));
  const [active, setActive] = useState(variant.active);

  const save = useMutation({
    mutationFn: () => api.patch(`/api/products/${productId}/variants/${variant.id}`, {
      sku: variant.sku,
      name,
      price: Number(price),
      optionLabels: variant.optionLabels,
      active,
    }),
    onSuccess: () => {
      toast.success('Đã cập nhật phiên bản');
      onSaved();
      onOpenChange(false);
    },
    onError: (err: unknown) => {
      toast.error(getApiErrorMessage(err, 'Không thể cập nhật phiên bản'));
    },
  });

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-white/10">
        <DialogHeader><DialogTitle>Sửa phiên bản</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Field label="SKU"><Input value={variant.sku} disabled className="bg-white/5 border-white/10 opacity-60" /></Field>
          <Field label="Tên phiên bản"><Input value={name} onChange={(e) => setName(e.target.value)} className="bg-white/5 border-white/10" /></Field>
          <Field label="Giá"><Input inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} className="bg-white/5 border-white/10" /></Field>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4 accent-primary" />
            Đang bán (cho phép thêm vào giỏ hàng)
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" className="border-white/10" onClick={() => onOpenChange(false)}>Đóng</Button>
          <Button className="bg-primary" disabled={save.isPending || !name.trim() || !price.trim()} onClick={() => save.mutate()}>
            {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Lưu'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InventoryHistoryDialog({ variantId, onOpenChange }: { variantId: string; onOpenChange: (v: boolean) => void }) {
  const { data: inventory, isLoading: invLoading } = useQuery({
    queryKey: ['inventory', variantId],
    queryFn: async () => {
      const { data } = await api.get<{ data: Inventory }>(`/api/inventories/variants/${variantId}`);
      return data.data;
    },
  });

  const { data: movements, isLoading: movLoading } = useQuery({
    queryKey: ['inventory-movements', variantId],
    queryFn: async () => {
      const { data } = await api.get<{ data: PagedResponse<InventoryMovement> }>(
        `/api/inventories/variants/${variantId}/movements?page=0&size=20`
      );
      return pageFrom(data.data).content;
    },
  });

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-white/10 max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Lịch sử tồn kho</DialogTitle></DialogHeader>
        {invLoading ? (
          <Skeleton className="h-12 w-full bg-white/5" />
        ) : inventory ? (
          <div className="flex items-center justify-between text-sm rounded-lg border border-white/8 p-3">
            <span className="text-muted-foreground">Khả dụng: <span className="text-foreground font-medium">{inventory.availableStock}</span></span>
            <span className="text-muted-foreground">Đang giữ: <span className="text-foreground font-medium">{inventory.reservedStock}</span></span>
          </div>
        ) : null}

        <div className="space-y-2 mt-2">
          {movLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full bg-white/5" />)
          ) : !movements || movements.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-4">Chưa có biến động tồn kho.</p>
          ) : (
            movements.map((m) => (
              <div key={m.id} className="flex items-center justify-between text-xs border-b border-white/6 pb-2">
                <div>
                  <p className="text-foreground">{MOVEMENT_TYPE_LABEL[m.movementType]}</p>
                  <p className="text-muted-foreground mt-0.5">{formatDateTime(m.createdAt)}</p>
                </div>
                <div className="text-right text-muted-foreground">
                  <p>{m.quantity >= 0 ? '+' : ''}{m.quantity}</p>
                  <p className="mt-0.5">Còn {m.availableStockAfter}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
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
