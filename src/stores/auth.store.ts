import { create } from 'zustand';
import { User } from '@/types/api';
import { setAccessToken } from '@/lib/api';

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
    setAccessToken(token);
    set({ user });
  },

  logout: () => {
    setAccessToken(null);
    set({ user: null });
  },

  setHydrated: () => set({ isHydrated: true }),
}));
