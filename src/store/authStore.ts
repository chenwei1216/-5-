import { create } from 'zustand';
import { User } from '@/types';
import { api } from '@/lib/api';

interface AuthStore {
  user: User | null;
  isLoggedIn: boolean;
  token: string | null;
  login: (user: User, token: string) => void;
  logout: () => Promise<void>;
  updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  isLoggedIn: false,
  token: null,
  login: (user, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({ user, isLoggedIn: true, token });
  },
  logout: async () => {
    try {
      await api('/api/auth/logout', { method: 'POST' });
    } catch {
      // 即使后端登出失败也清除本地状态
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ user: null, isLoggedIn: false, token: null });
  },
  updateUser: (updates) => {
    const current = get().user;
    if (current) {
      const updatedUser = { ...current, ...updates };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      set({ user: updatedUser });
    }
  },
}));

export const loadStoredUser = () => {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');

  if (token && userStr) {
    try {
      const user = JSON.parse(userStr);
      useAuthStore.setState({ user, isLoggedIn: true, token });
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  }
};
