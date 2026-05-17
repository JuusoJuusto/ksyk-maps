/**
 * Auth Hook
 * React hook for JWT/cookie-based authentication
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, type SessionUser } from '@/lib/auth/session';
import { api } from '@/lib/api/client';

export function useAuth(requireAuth: boolean = false) {
  const router = useRouter();
  const { user, token, isAuthenticated, isLoading, setUser, setToken, setLoading, setError, clearSession } = useAuthStore();
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    useAuthStore.getState().initialize();
  }, []);

  useEffect(() => {
    if (requireAuth && !isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [requireAuth, isLoading, isAuthenticated, router]);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setLocalError(null);
    setError(null);

    try {
      const response = await api.post<{ user: SessionUser; token: string }>('/api/auth/login', {
        email,
        password,
      });

      if (response.success && response.data) {
        setUser(response.data.user);
        setToken(response.data.token);
        return response.data;
      }

      throw new Error(response.error || 'Login failed');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setLocalError(message);
      setError(message);
      setLoading(false);
      throw new Error(message);
    }
  }, [setLoading, setError, setUser, setToken]);

  const register = useCallback(async (data: { name: string; email: string; password: string; gradeLevel?: number }) => {
    setLoading(true);
    setLocalError(null);
    setError(null);

    try {
      const response = await api.post<{ user: SessionUser; token: string }>('/api/auth/register', data);

      if (response.success && response.data) {
        setUser(response.data.user);
        setToken(response.data.token);
        return response.data;
      }

      throw new Error(response.error || 'Registration failed');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      setLocalError(message);
      setError(message);
      setLoading(false);
      throw new Error(message);
    }
  }, [setLoading, setError, setUser, setToken]);

  const logout = useCallback(async () => {
    try {
      await api.post('/api/auth/logout');
    } catch {
      // Ignore logout errors
    }
    clearSession();
    router.push('/login');
  }, [clearSession, router]);

  return {
    user,
    token,
    isAuthenticated,
    isLoading,
    error: localError,
    login,
    register,
    logout,
  };
}

export function useRequireAuth() {
  return useAuth(true);
}

export function useUser() {
  const { user } = useAuthStore();
  return user;
}
