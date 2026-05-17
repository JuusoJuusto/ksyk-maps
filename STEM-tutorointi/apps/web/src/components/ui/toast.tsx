// ============================================
// STEM Genius - Toast Notifications
// Beautiful toast notifications
// ============================================

'use client';

import { Toaster as HotToaster } from 'react-hot-toast';

export function Toaster() {
  return (
    <HotToaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: '#18181b',
          color: '#fff',
          borderRadius: '12px',
          padding: '16px',
          fontSize: '14px',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
        },
        success: {
          iconTheme: {
            primary: '#10b981',
            secondary: '#fff',
          },
        },
        error: {
          iconTheme: {
            primary: '#ef4444',
            secondary: '#fff',
          },
        },
      }}
    />
  );
}
