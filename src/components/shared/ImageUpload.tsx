'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { Loader2, Upload, X } from 'lucide-react';
import { api } from '@/lib/api';
import { MediaUploadResponse } from '@/types/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type Purpose = 'PRODUCT_IMAGE' | 'SHOP_LOGO' | 'SHOP_BANNER' | 'AVATAR';

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 10 * 1024 * 1024;

async function uploadImage(file: File, purpose: Purpose): Promise<MediaUploadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('purpose', purpose);
  const { data } = await api.post<{ data: MediaUploadResponse }>('/api/media/images', formData);
  return data.data;
}

interface ImageUploadProps {
  purpose: Purpose;
  value?: { mediaId: string; url: string } | null;
  onChange: (media: { mediaId: string; url: string } | null) => void;
  className?: string;
  aspect?: 'square' | 'banner';
}

export function ImageUpload({ purpose, value, onChange, className, aspect = 'square' }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    if (!ACCEPTED.includes(file.type)) {
      toast.error('Chỉ chấp nhận ảnh JPEG, PNG, WEBP');
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.error('Ảnh tối đa 10MB');
      return;
    }
    setUploading(true);
    try {
      const media = await uploadImage(file, purpose);
      onChange({ mediaId: media.mediaId, url: media.url });
    } catch {
      toast.error('Tải ảnh thất bại');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border border-dashed border-white/15 bg-white/3',
        aspect === 'square' ? 'aspect-square' : 'aspect-[3/1]',
        className
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(',')}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = '';
        }}
      />

      {value?.url ? (
        <>
          <Image src={value.url} alt="" fill sizes="300px" className="object-cover" />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute top-2 right-2 rounded-lg bg-black/70 p-1.5 text-white hover:bg-black/90 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground hover:bg-white/3 transition-colors"
        >
          {uploading ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <>
              <Upload className="h-6 w-6" />
              <span className="text-xs">Tải ảnh lên</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
