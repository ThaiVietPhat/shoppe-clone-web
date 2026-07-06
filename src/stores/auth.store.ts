import { create } from 'zustand';
import { User } from '@/types/api';
import { setAccessToken } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';

interface AuthState {
  user: User | null;
  isHydrated: boolean;
  setUser: (user: User | null) => void;
  login: (token: string, user: User) => void;
  logout: () => void;
  setHydrated: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isHydrated: false,

  setUser: (user) => set({ user }),

  login: (token, user) => {
    // Xoá cache cũ trước khi set user mới — queryClient là singleton toàn app,
    // không tự biết "user" đã đổi nên sẽ tiếp tục trả cart/orders/... của tài khoản trước
    // (cùng query key, còn trong staleTime) nếu không clear ở đây.
    queryClient.clear();
    setAccessToken(token);
    set({ user });
  },

  logout: () => {
    queryClient.clear();
    setAccessToken(null);
    set({ user: null });
  },

  setHydrated: () => set({ isHydrated: true }),
}));
