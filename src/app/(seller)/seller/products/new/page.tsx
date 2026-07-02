'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Plus, Trash2, Loader2, Package } from 'lucide-react';
import { api } from '@/lib/api';
import { CategoryNode, ShopDetail } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ImageUpload } from '@/components/shared/ImageUpload';
import { toast } from 'sonner';

interface OptionInput { name: string; value: string }
interface VariantInput {
  sku: string;
  name: string;
  price: string;
  initialStock: string;
  options: OptionInput[];
}
interface AttrInput { name: string; value: string }
type Media = { mediaId: string; url: string };

function flattenCategories(nodes: CategoryNode[]): { id: string; label: string }[] {
  return [...nodes]
    .sort((a, b) => (a.path ?? a.name).localeCompare(b.path ?? b.name))
    .map((n) => ({ id: n.id, label: n.path || n.name }));
}

export default function NewProductPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [brand, setBrand] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [cover, setCover] = useState<Media | null>(null);
  const [gallery, setGallery] = useState<(Media | null)[]>([null, null, null]);
  const [attributes, setAttributes] = useState<AttrInput[]>([]);
  const [variants, setVariants] = useState<VariantInput[]>([
    { sku: '', name: '', price: '', initialStock: '', options: [{ name: '', value: '' }] },
  ]);
  const [submitting, setSubmitting] = useState(false);

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await api.get<{ data: CategoryNode[] }>('/api/categories');
      return data.data;
    },
    staleTime: 30 * 60 * 1000,
  });

  const { data: shop } = useQuery({
    queryKey: ['my-shop'],
    queryFn: async () => {
      const { data } = await api.get<{ data: ShopDetail }>('/api/shops/me');
      return data.data;
    },
  });
  const shopId = shop?.id ?? '';

  const flatCategories = categories ? flattenCategories(categories) : [];

  function updateVariant(i: number, patch: Partial<VariantInput>) {
    setVariants((vs) => vs.map((v, idx) => (idx === i ? { ...v, ...patch } : v)));
  }

  async function handleSubmit(publish: boolean) {
    if (!shopId) return toast.error('Không tìm thấy shop của bạn');
    if (!name.trim()) return toast.error('Nhập tên sản phẩm');
    if (!categoryId) return toast.error('Chọn danh mục');
    if (!cover) return toast.error('Tải ảnh bìa');
    if (variants.some((v) => !v.sku.trim() || !v.name.trim() || !v.price)) {
      return toast.error('Nhập đầy đủ tên, SKU và giá cho mỗi phiên bản');
    }

    setSubmitting(true);
    try {
      const mediaIds = [cover.mediaId, ...gallery.filter((g): g is Media => !!g).map((g) => g.mediaId)];

      const { data: created } = await api.post<{ data: { id: string } }>('/api/products', {
        shopId, name, description, brand: brand || null, categoryId,
        attributes: Object.fromEntries(attributes.filter((a) => a.name && a.value).map((a) => [a.name, a.value])),
        mediaIds,
      });
      const productId = created.data.id;

      for (const v of variants) {
        const optionLabels = Object.fromEntries(
          v.options.filter((o) => o.name && o.value).map((o) => [o.name, o.value])
        );
        const { data: vRes } = await api.post<{ data: { id: string } }>(`/api/products/${productId}/variants`, {
          sku: v.sku,
          name: v.name,
          price: Number(v.price),
          optionLabels,
        });
        await api.post('/api/inventories', {
          variantId: vRes.data.id,
          initialStock: Number(v.initialStock || 0),
        });
      }

      if (publish) {
        await api.post(`/api/products/${productId}/publish`);
        toast.success('Đã tạo và đăng bán sản phẩm');
      } else {
        toast.success('Đã lưu sản phẩm (nháp)');
      }
      router.push('/seller/products');
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      toast.error(ax?.response?.data?.message ?? 'Không thể tạo sản phẩm');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-lg font-semibold text-foreground mb-5">Thêm sản phẩm</h1>

      <div className="space-y-5">
        {/* Basic info */}
        <Section title="Thông tin cơ bản">
          <div className="space-y-3">
            <Field label="Tên sản phẩm">
              <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-white/5 border-white/10" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Thương hiệu">
                <Input value={brand} onChange={(e) => setBrand(e.target.value)} className="bg-white/5 border-white/10" />
              </Field>
              <Field label="Danh mục">
                <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
                  className="h-9 w-full rounded-md border border-white/10 bg-white/5 px-3 text-sm text-foreground">
                  <option value="">-- Chọn danh mục --</option>
                  {flatCategories.map((c) => <option key={c.id} value={c.id} className="bg-card">{c.label}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Mô tả">
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="bg-white/5 border-white/10 resize-none" />
            </Field>
          </div>
        </Section>

        {/* Images */}
        <Section title="Hình ảnh">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Ảnh bìa</p>
              <ImageUpload purpose="PRODUCT_IMAGE" ownerId={shopId} ownerType="SHOP" value={cover} onChange={setCover} />
            </div>
            {gallery.map((g, i) => (
              <div key={i}>
                <p className="text-xs text-muted-foreground mb-1.5">Ảnh {i + 1}</p>
                <ImageUpload purpose="PRODUCT_IMAGE" ownerId={shopId} ownerType="SHOP" value={g}
                  onChange={(m) => setGallery((gs) => gs.map((x, idx) => (idx === i ? m : x)))} />
              </div>
            ))}
          </div>
        </Section>

        {/* Attributes */}
        <Section title="Thông số kỹ thuật" action={
          <Button size="sm" variant="ghost" className="text-primary gap-1 text-xs" onClick={() => setAttributes((a) => [...a, { name: '', value: '' }])}>
            <Plus className="h-3.5 w-3.5" /> Thêm
          </Button>
        }>
          {attributes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có thông số nào.</p>
          ) : (
            <div className="space-y-2">
              {attributes.map((a, i) => (
                <div key={i} className="flex gap-2">
                  <Input placeholder="Tên (vd: Chất liệu)" value={a.name} className="bg-white/5 border-white/10"
                    onChange={(e) => setAttributes((arr) => arr.map((x, idx) => idx === i ? { ...x, name: e.target.value } : x))} />
                  <Input placeholder="Giá trị" value={a.value} className="bg-white/5 border-white/10"
                    onChange={(e) => setAttributes((arr) => arr.map((x, idx) => idx === i ? { ...x, value: e.target.value } : x))} />
                  <Button size="icon" variant="ghost" className="text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => setAttributes((arr) => arr.filter((_, idx) => idx !== i))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Variants */}
        <Section title="Phiên bản & tồn kho" action={
          <Button size="sm" variant="ghost" className="text-primary gap-1 text-xs"
            onClick={() => setVariants((v) => [...v, { sku: '', name: '', price: '', initialStock: '', options: [{ name: '', value: '' }] }])}>
            <Plus className="h-3.5 w-3.5" /> Thêm phiên bản
          </Button>
        }>
          <div className="space-y-4">
            {variants.map((v, i) => (
              <div key={i} className="rounded-lg border border-white/10 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Phiên bản {i + 1}</p>
                  {variants.length > 1 && (
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => setVariants((vs) => vs.filter((_, idx) => idx !== i))}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <Field label="Tên phiên bản">
                  <Input value={v.name} placeholder="vd: Đỏ / L" className="bg-white/5 border-white/10" onChange={(e) => updateVariant(i, { name: e.target.value })} />
                </Field>
                <div className="grid grid-cols-3 gap-2">
                  <Field label="SKU"><Input value={v.sku} className="bg-white/5 border-white/10" onChange={(e) => updateVariant(i, { sku: e.target.value })} /></Field>
                  <Field label="Giá (VND)"><Input value={v.price} inputMode="numeric" className="bg-white/5 border-white/10" onChange={(e) => updateVariant(i, { price: e.target.value })} /></Field>
                  <Field label="Tồn kho"><Input value={v.initialStock} inputMode="numeric" className="bg-white/5 border-white/10" onChange={(e) => updateVariant(i, { initialStock: e.target.value })} /></Field>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs text-muted-foreground">Tuỳ chọn (vd: Màu = Đỏ)</p>
                    <Button size="sm" variant="ghost" className="text-primary gap-1 text-xs h-6"
                      onClick={() => updateVariant(i, { options: [...v.options, { name: '', value: '' }] })}>
                      <Plus className="h-3 w-3" /> Tuỳ chọn
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {v.options.map((o, oi) => (
                      <div key={oi} className="flex gap-2">
                        <Input placeholder="Tên" value={o.name} className="bg-white/5 border-white/10 h-8 text-xs"
                          onChange={(e) => updateVariant(i, { options: v.options.map((x, idx) => idx === oi ? { ...x, name: e.target.value } : x) })} />
                        <Input placeholder="Giá trị" value={o.value} className="bg-white/5 border-white/10 h-8 text-xs"
                          onChange={(e) => updateVariant(i, { options: v.options.map((x, idx) => idx === oi ? { ...x, value: e.target.value } : x) })} />
                        {v.options.length > 1 && (
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                            onClick={() => updateVariant(i, { options: v.options.filter((_, idx) => idx !== oi) })}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <div className="flex gap-3 sticky bottom-0 bg-background/80 backdrop-blur py-3">
          <Button variant="outline" className="border-white/10" disabled={submitting} onClick={() => handleSubmit(false)}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Lưu nháp'}
          </Button>
          <Button className="bg-primary gap-1.5" disabled={submitting} onClick={() => handleSubmit(true)}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Package className="h-4 w-4" /> Tạo & đăng bán</>}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-white/8 bg-card p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {action}
      </div>
      {children}
    </section>
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
