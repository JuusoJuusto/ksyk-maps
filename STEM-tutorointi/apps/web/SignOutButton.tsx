'use client';
import React from 'react';
import { useRouter } from 'next/navigation';

function getCookie(name: string) {
  const m = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return m ? decodeURIComponent(m[2]) : null;
}

export default function SignOutButton() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  
  async function onSignOut() {
    setLoading(true);
    const csrf = getCookie('csrf-token');
    try {
      await fetch('/api/auth/logout', { 
        method: 'POST', 
        headers: { 'x-csrf-token': csrf || '' } 
      });
    } catch (err) {
      console.error('Logout error:', err);
    }
    router.push('/login');
  }

  return (
    <button
      onClick={onSignOut}
      disabled={loading}
      className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? 'Signing out...' : 'Sign out'}
    </button>
  );
}
