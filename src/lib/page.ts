import { Page } from '@/types/api';

// Backend PagedResponse dùng field `items`; FE chuẩn hoá về `content` (Page<T>)
export interface PagedResponse<T> {
  items: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export function pageFrom<T>(r: PagedResponse<T>): Page<T> {
  return {
    content: r.items ?? [],
    page: r.page ?? 0,
    size: r.size ?? 0,
    totalElements: r.totalElements ?? 0,
    totalPages: r.totalPages ?? 0,
    last: r.last ?? true,
  };
}
