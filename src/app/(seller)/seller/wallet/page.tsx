'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Wallet, ArrowDownCircle, ArrowUpCircle, Loader2, Banknote } from 'lucide-react';
import { api } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/error';
import { WalletResponse, WalletTransaction, WalletTransactionType } from '@/types/api';
import { pageFrom, PagedResponse } from '@/lib/page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Pagination } from '@/components/shared/Pagination';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatPrice, formatDateTime, cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { toast } from 'sonner';

const TRANSACTION_LABEL: Record<WalletTransactionType, string> = {
  SELLER_EARNING: 'Doanh thu đơn hàng',
  RETURN_REFUND: 'Hoàn tiền trả hàng',
  RETURN_CLAWBACK: 'Thu hồi do trả hàng',
  WITHDRAWAL: 'Rút tiền',
};

export default function SellerWalletPage() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const [page, setPage] = useState(0);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [amount, setAmount] = useState('');

  const { data: wallet, isLoading: walletLoading } = useQuery({
    queryKey: ['seller-wallet'],
    queryFn: async () => {
      const { data } = await api.get<{ data: WalletResponse }>('/api/wallet');
      return data.data;
    },
    enabled: !!user,
  });

  const { data: transactions, isLoading: txLoading } = useQuery({
    queryKey: ['seller-wallet-transactions', page],
    queryFn: async () => {
      const { data } = await api.get<{ data: PagedResponse<WalletTransaction> }>(
        `/api/wallet/transactions?page=${page}&size=20`
      );
      return pageFrom(data.data);
    },
    enabled: !!user,
  });

  const withdraw = useMutation({
    mutationFn: (value: number) => api.post<{ data: WalletResponse }>('/api/wallet/withdraw', { amount: value }),
    onSuccess: () => {
      toast.success('Rút tiền thành công');
      setWithdrawOpen(false);
      setAmount('');
      qc.invalidateQueries({ queryKey: ['seller-wallet'] });
      qc.invalidateQueries({ queryKey: ['seller-wallet-transactions'] });
    },
    onError: (err: unknown) => toast.error(getApiErrorMessage(err, 'Rút tiền thất bại')),
  });

  function handleWithdraw() {
    const value = Number(amount);
    if (!value || value <= 0) {
      toast.error('Số tiền không hợp lệ');
      return;
    }
    withdraw.mutate(value);
  }

  return (
    <div>
      <h1 className="text-lg font-semibold text-foreground mb-4">Ví của tôi</h1>

      <div className="rounded-xl border border-white/8 bg-card p-6 mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
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
        <Button className="bg-primary gap-1.5" onClick={() => setWithdrawOpen(true)}>
          <Banknote className="h-4 w-4" /> Rút tiền
        </Button>
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

      <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
        <DialogContent className="bg-card border-white/10">
          <DialogHeader><DialogTitle>Rút tiền</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Số dư khả dụng: <span className="text-primary font-medium">{formatPrice(wallet?.balance ?? 0)}</span>
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="amount">Số tiền muốn rút</Label>
            <Input id="amount" type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)}
              className="bg-white/5 border-white/10" placeholder="0" />
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-white/10" onClick={() => setWithdrawOpen(false)}>Đóng</Button>
            <Button className="bg-primary" disabled={withdraw.isPending} onClick={handleWithdraw}>
              {withdraw.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Xác nhận rút'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
