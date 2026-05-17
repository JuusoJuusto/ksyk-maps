/**
 * Authentication Store (Zustand)
 * JWT/cookie-based authentication - replaces Firebase
 */

import { create } from 'zustand';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar?: string;
  emailVerified: boolean;
  isActive: boolean;
  subscriptionTier: string;
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  initialized: boolean;
  error: string | null;

  setUser: (user: AuthUser | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  signOut: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: false,
  initialized: false,
  error: null,

  setUser: (user) => set({ user, loading: false, initialized: true, error: null }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error, loading: false }),
  clearError: () => set({ error: null }),
  signOut: () => set({ user: null, loading: false, error: null }),
}));
