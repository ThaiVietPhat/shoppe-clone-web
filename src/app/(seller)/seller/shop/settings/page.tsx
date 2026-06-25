'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Save } from 'lucide-react';
import { api } from '@/lib/api';
import { ShopDetail } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { ImageUpload } from '@/components/shared/ImageUpload';
import { toast } from 'sonner';

type Media = { mediaId: string; url: string };

export default function ShopSettingsPage() {
  const qc = useQueryClient();
  const [shopName, setShopName] = useState('');
  const [description, setDescription] = useState('');
  const [logo, setLogo] = useState<Media | null>(null);
  const [banner, setBanner] = useState<Media | null>(null);

  const { data: shop, isLoading } = useQuery({
    queryKey: ['my-shop'],
    queryFn: async () => {
      const { data } = await api.get<{ data: ShopDetail }>('/api/shops/me');
      return data.data;
    },
  });

  useEffect(() => {
    if (shop) {
      setShopName(shop.shopName);
      setDescription(shop.description ?? '');
      if (shop.logoUrl) setLogo({ mediaId: '', url: shop.logoUrl });
      if (shop.bannerUrl) setBanner({ mediaId: '', url: shop.bannerUrl });
    }
  }, [shop]);

  const save = useMutation({
    mutationFn: () => api.patch('/api/shops/me', {
      shopName,
      description,
      ...(logo?.mediaId ? { logoMediaId: logo.mediaId } : {}),
      ...(banner?.mediaId ? { bannerMediaId: banner.mediaId } : {}),
    }),
    onSuccess: () => { toast.success('Đã lưu thông tin shop'); qc.invalidateQueries({ queryKey: ['my-shop'] }); },
    onError: () => toast.error('Không thể lưu'),
  });

  if (isLoading) {
    return <div className="max-w-2xl space-y-4"><Skeleton className="h-8 w-40 bg-white/5" /><Skeleton className="h-64 w-full rounded-xl bg-white/5" /></div>;
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-lg font-semibold text-foreground mb-5">Cài đặt shop</h1>

      <section className="rounded-xl border border-white/8 bg-card p-5 space-y-4">
        <div>
          <p className="text-xs text-muted-foreground mb-1.5">Ảnh bìa</p>
          <ImageUpload purpose="SHOP_BANNER" aspect="banner" value={banner} onChange={setBanner} />
        </div>
        <div className="flex items-end gap-4">
          <div className="w-28">
            <p className="text-xs text-muted-foreground mb-1.5">Logo</p>
            <ImageUpload purpose="SHOP_LOGO" value={logo} onChange={setLogo} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-foreground/80">Tên shop</Label>
          <Input value={shopName} onChange={(e) => setShopName(e.target.value)} className="bg-white/5 border-white/10" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-foreground/80">Mô tả</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="bg-white/5 border-white/10 resize-none" />
        </div>
        <Button className="bg-primary gap-1.5" disabled={save.isPending} onClick={() => save.mutate()}>
          {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4" /> Lưu thay đổi</>}
        </Button>
      </section>
    </div>
  );
}
