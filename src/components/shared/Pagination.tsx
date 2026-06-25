'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({ page, totalPages, onPageChange, className }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages: number[] = [];
  const start = Math.max(0, Math.min(page - 2, totalPages - 5));
  const end = Math.min(totalPages, start + 5);
  for (let i = start; i < end; i++) pages.push(i);

  return (
    <div className={cn('flex items-center justify-center gap-1.5', className)}>
      <Button
        variant="outline"
        size="icon"
        className="h-9 w-9 border-white/10"
        disabled={page <= 0}
        onClick={() => onPageChange(page - 1)}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {pages.map((p) => (
        <Button
          key={p}
          variant="outline"
          size="icon"
          className={cn(
            'h-9 w-9 border-white/10',
            p === page && 'border-primary bg-primary/10 text-primary'
          )}
          onClick={() => onPageChange(p)}
        >
          {p + 1}
        </Button>
      ))}

      <Button
        variant="outline"
        size="icon"
        className="h-9 w-9 border-white/10"
        disabled={page >= totalPages - 1}
        onClick={() => onPageChange(page + 1)}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
