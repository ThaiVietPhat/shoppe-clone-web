'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Wallet, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { WalletResponse, WalletTransaction, WalletTransactionType } from '@/types/api';
import { pageFrom, PagedResponse } from '@/lib/page';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination } from '@/components/shared/Pagination';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatPrice, formatDateTime, cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { useRequireAuth } from '@/hooks/use-require-auth';

// Buyer-facing counterpart of src/app/(seller)/seller/wallet/page.tsx — same shared
// per-user wallet (GET /api/wallet works for any role), but read-only here: withdrawal
// is SELLER-only (backend returns 403 for buyers), so there is no withdraw action.
// This is where a buyer can see the refund credit from an approved return request —
// see 12-wallet-return-wishlist.md.
const TRANSACTION_LABEL: Record<WalletTransactionType, string> = {
  SELLER_EARNING: 'Doanh thu đơn hàng',
  RETURN_REFUND: 'Hoàn tiền trả hàng',
  RETURN_CLAWBACK: 'Thu hồi do trả hàng',
  WITHDRAWAL: 'Rút tiền',
};

export default function BuyerWalletPage() {
  const { user } = useAuthStore();
  const { ready } = useRequireAuth();
  const [page, setPage] = useState(0);

  const { data: wallet, isLoading: walletLoading } = useQuery({
    queryKey: ['buyer-wallet'],
    queryFn: async () => {
      const { data } = await api.get<{ data: WalletResponse }>('/api/wallet');
      return data.data;
    },
    enabled: !!user,
  });

  const { data: transactions, isLoading: txLoading } = useQuery({
    queryKey: ['buyer-wallet-transactions', page],
    queryFn: async () => {
      const { data } = await api.get<{ data: PagedResponse<WalletTransaction> }>(
        `/api/wallet/transactions?page=${page}&size=20`
      );
      return pageFrom(data.data);
    },
    enabled: !!user,
  });

  if (!ready) return null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="text-lg font-semibold text-foreground mb-4">Ví của tôi</h1>

      <div className="rounded-xl border border-white/8 bg-card p-6 mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/15 text-primary">
          <Wallet className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Số dư khả dụng</p>
          {walletLoading ? (
            <Skeleton className="h-7 w-32 bg-white/5 mt-1" />
          ) : (
            <p className="text-2xl font-bold text-primary">{formatPrice(wallet?.balance ?? 0)}</p>
          )}
        </div>
      </div>

      <h2 className="text-sm font-semibold text-foreground mb-3">Lịch sử giao dịch</h2>

      {txLoading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl bg-white/5" />)}</div>
      ) : !transactions || transactions.content.length === 0 ? (
        <EmptyState icon={Wallet} title="Chưa có giao dịch nào" />
      ) : (
        <>
          <div className="space-y-2">
            {transactions.content.map((tx) => {
              const isCredit = tx.amount >= 0;
              return (
                <div key={tx.id} className="flex items-center justify-between gap-4 rounded-xl border border-white/8 bg-card p-4">
                  <div className="flex items-center gap-3 min-w-0">
                    {isCredit ? (
                      <ArrowDownCircle className="h-5 w-5 text-green-400 shrink-0" />
                    ) : (
                      <ArrowUpCircle className="h-5 w-5 text-destructive shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{TRANSACTION_LABEL[tx.type] ?? tx.type}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{formatDateTime(tx.createdAt)}</p>
                    </div>
                  </div>
                  <span className={cn('text-sm font-bold shrink-0', isCredit ? 'text-green-400' : 'text-destructive')}>
                    {isCredit ? '+' : ''}{formatPrice(tx.amount)}
                  </span>
                </div>
              );
            })}
          </div>
          <Pagination className="mt-8" page={transactions.page} totalPages={transactions.totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
