'use client';
import { useContext } from 'react';
import { AuthContext } from './AuthProvider';

export default function useAuth() {
  const ctx = useContext(AuthContext as any);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
