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
      api.post('/api/cart/items/select', vars),
    onSuccess: invalidate,
  });

  const selectAll = useMutation({
    mutationFn: (selected: boolean) =>
      api.post('/api/cart/items/select-all', { selected }),
    onSuccess: invalidate,
  });

  return { addItem, updateQuantity, removeItem, selectItems, selectAll };
}
