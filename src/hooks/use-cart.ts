'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Cart } from '@/types/api';
import { useAuthStore } from '@/stores/auth.store';

async function fetchCart(): Promise<Cart> {
  const { data } = await api.get<{ data: Cart }>('/api/cart');
  return data.data;
}

export function useCart() {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: ['cart'],
    queryFn: fetchCart,
    enabled: !!user,
  });
}

export function useCartMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['cart'] });

  const addItem = useMutation({
    mutationFn: (vars: { variantId: string; quantity: number }) =>
      api.post('/api/cart/items', vars),
    onSuccess: invalidate,
  });

  const updateQuantity = useMutation({
    mutationFn: (vars: { variantId: string; quantity: number }) =>
      api.put(`/api/cart/items/${vars.variantId}`, { quantity: vars.quantity }),
    onSuccess: invalidate,
  });

  const removeItem = useMutation({
    mutationFn: (variantId: string) => api.delete(`/api/cart/items/${variantId}`),
    onSuccess: invalidate,
  });

  const selectItems = useMutation({
    mutationFn: (vars: { variantIds: string[]; selected: boolean }) =>
      api.post(`/api/cart/items/${vars.selected ? 'select' : 'deselect'}`, { variantIds: vars.variantIds }),
    onSuccess: invalidate,
  });

  const selectAll = useMutation({
    mutationFn: (selected: boolean) => {
      const variantIds = qc.getQueryData<Cart>(['cart'])?.items.map((i) => i.variantId) ?? [];
      if (variantIds.length === 0) return Promise.resolve(null);
      return api.post(`/api/cart/items/${selected ? 'select' : 'deselect'}`, { variantIds });
    },
    onSuccess: invalidate,
  });

  const clearCart = useMutation({
    mutationFn: () => api.delete('/api/cart'),
    onSuccess: invalidate,
  });

  return { addItem, updateQuantity, removeItem, selectItems, selectAll, clearCart };
}
