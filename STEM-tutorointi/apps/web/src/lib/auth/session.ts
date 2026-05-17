/**
 * Client-side auth session management
 * Handles cookie-based JWT authentication
 */

import { create } from 'zustand';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar?: string;
  emailVerified: boolean;
  isActive: boolean;
  subscriptionTier: string;
  lastLoginAt?: string;
  createdAt: string;
  profile?: {
    gradeLevel?: number;
    school?: string;
    country: string;
    language: string;
    darkMode: boolean;
    notifications: boolean;
    soundEffects: boolean;
  };
}

interface AuthSessionState {
  user: SessionUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  setUser: (user: SessionUser | null) => void;
  setToken: (token: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearSession: () => void;
  initialize: () => Promise<void>;
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}

function deleteCookie(name: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
}

export const useAuthStore = create<AuthSessionState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setToken: (token) => set({ token }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  clearSession: () => {
    deleteCookie('auth-token');
    set({ user: null, token: null, isAuthenticated: false, error: null });
  },

  initialize: async () => {
    set({ isLoading: true });
    try {
      const res = await fetch('/api/auth/session', {
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          const token = getCookie('auth-token');
          set({
            user: data.user,
            token,
            isAuthenticated: true,
            isLoading: false,
          });
          return;
        }
      }

      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
    } catch {
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
