import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, ArrowLeft, ArrowRight, Lock, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useDarkMode } from '@/contexts/DarkModeContext';
import { cn } from '@/lib/utils';
import posthog from '@/lib/posthog';

/**
 * KSYK admin login — v4.7.45 Wilma document rewrite.
 *
 * Was a split-screen photo + card design.  Now uses the same
 * institutional document masthead as FAQ / Privacy / Support / Settings:
 * hairline top-header + uppercase masthead + big navy H1 + hairline
 * form + Wilma-navy CTA.
 */

interface AdminLoginProps {
  onLoginSuccess: () => void;
}

export function AdminLogin({ onLoginSuccess }: AdminLoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { toast } = useToast();
  const { darkMode } = useDarkMode();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch('/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('ksyk_admin_logged_in', 'true');
        localStorage.setItem('ksyk_admin_user', JSON.stringify(data.user));
        localStorage.setItem('ksyk_admin_login_at', String(Date.now()));
        if (data.adminToken) localStorage.setItem('ksyk_admin_token', data.adminToken);
        if (typeof data.user?.id === 'string' && data.user.id) {
          posthog.identify(data.user.id, {
            email: typeof data.user.email === 'string' ? data.user.email : undefined,
            role: typeof data.user.role === 'string' ? data.user.role : undefined,
          });
        }
        posthog.capture('admin_login_succeeded', { auth_method: 'password' });
        toast({ title: 'Signed in', description: 'Welcome back.' });
        onLoginSuccess();
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.message || 'Invalid credentials');
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn(
      'min-h-screen flex flex-col',
      darkMode ? 'bg-gray-950 text-gray-100' : 'bg-gray-50 text-gray-900',
    )}
    style={{
      paddingTop: 'env(safe-area-inset-top, 0px)',
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    }}>
      {/* ── Document header — matches FAQ / Privacy / Support / Settings */}
      <header className="border-b border-[#d5dae0] dark:border-[#2a3040] shrink-0 bg-white dark:bg-gray-950">
        <div className="max-w-2xl mx-auto px-4 h-12 flex items-center justify-between">
          <a
            href="/"
            className="inline-flex items-center gap-1.5 h-9 -ml-2 px-2 rounded-[6px] text-[13px] font-semibold text-gray-700 dark:text-gray-300 hover:text-[#003d82] dark:hover:text-[#4a90d9] hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2.25} />
            Map
          </a>
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-[0.08em] uppercase text-gray-500 dark:text-gray-400">
            <Lock className="h-3 w-3" strokeWidth={2.5} />
            Protected
          </span>
        </div>
      </header>

      <main className="flex-1 max-w-md w-full mx-auto px-4 sm:px-5 py-6 sm:py-10">
        {/* Document title block */}
        <div className="mb-6 pb-4 border-b border-[#d5dae0] dark:border-[#2a3040]">
          <p className="text-[10px] font-bold tracking-[0.08em] uppercase text-[#003d82] dark:text-[#4a90d9] mb-1">
            Admin
          </p>
          <h1 className="text-[22px] sm:text-[26px] font-bold tracking-tight leading-[1.15] text-gray-900 dark:text-white">
            Sign in
          </h1>
          <p className="text-[13px] mt-1 text-gray-500 dark:text-gray-400">
            Continue to the KSYK Maps administration panel.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div
              className="rounded-[6px] border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 p-3 flex items-start gap-2.5"
              role="alert"
            >
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" strokeWidth={2.25} />
              <p className="text-[13px] font-semibold text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email" className="text-[12px] font-bold tracking-[0.06em] uppercase text-gray-600 dark:text-gray-400">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value.toLowerCase())}
              placeholder="you@ksyk.fi"
              required
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              autoFocus
              className="h-11 rounded-[6px] text-[15px] border-[#d5dae0] dark:border-[#2a3040] focus-visible:border-[#003d82] focus-visible:ring-2 focus-visible:ring-[#003d82]/20"
              data-testid="admin-email-input"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-[12px] font-bold tracking-[0.06em] uppercase text-gray-600 dark:text-gray-400">
                Password
              </Label>
              <a
                href="/admin/forgot-password"
                className="text-[12px] font-semibold text-[#003d82] dark:text-[#4a90d9] hover:underline underline-offset-2"
                data-testid="forgot-password-link"
              >
                Forgot password?
              </a>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="h-11 pr-11 rounded-[6px] text-[15px] border-[#d5dae0] dark:border-[#2a3040] focus-visible:border-[#003d82] focus-visible:ring-2 focus-visible:ring-[#003d82]/20"
                data-testid="admin-password-input"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9 rounded-[6px] flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" strokeWidth={2} /> : <Eye className="h-4 w-4" strokeWidth={2} />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-11 rounded-[6px] text-[14px] font-bold gap-2 bg-[#003d82] hover:bg-[#002d5f] text-white"
            disabled={isLoading}
            data-testid="admin-login-submit"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin" />
                Signing in…
              </>
            ) : (
              <>
                Sign in
                <ArrowRight className="w-4 h-4" strokeWidth={2.25} />
              </>
            )}
          </Button>
        </form>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#d5dae0] dark:border-[#2a3040]" />
          </div>
          <div className="relative flex justify-center">
            <span className={cn(
              'px-3 text-[10px] font-bold uppercase tracking-[0.08em]',
              darkMode ? 'bg-gray-950 text-gray-500' : 'bg-gray-50 text-gray-500',
            )}>
              Or
            </span>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => (window.location.href = '/api/auth/microsoft/start')}
          className="w-full h-11 rounded-[6px] text-[14px] font-semibold gap-2.5 border border-[#d5dae0] dark:border-[#2a3040] bg-white dark:bg-gray-950 hover:bg-gray-50 dark:hover:bg-gray-900 text-gray-900 dark:text-gray-100"
          data-testid="microsoft-auth-button"
        >
          <MicrosoftLogo />
          Continue with Microsoft
          <span className="text-[11px] font-normal text-gray-500 dark:text-gray-400">@ksyk.fi</span>
        </Button>

        {process.env.NODE_ENV === 'development' && (
          <Button
            type="button"
            variant="ghost"
            onClick={async () => {
              try {
                const response = await fetch('/api/auth/dev-login', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                });
                if (response.ok) {
                  localStorage.setItem('ksyk_admin_logged_in', 'true');
                  localStorage.setItem('ksyk_admin_login_at', String(Date.now()));
                  onLoginSuccess();
                }
              } catch (err) {
                console.error('Dev login failed:', err);
              }
            }}
            className="w-full h-9 mt-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300"
            data-testid="dev-login-button"
          >
            Dev quick access
          </Button>
        )}

        <p className="mt-8 pt-4 border-t border-[#d5dae0] dark:border-[#2a3040] text-[11px] text-center text-gray-500 dark:text-gray-500">
          © {new Date().getFullYear()} KSYK Maps · Admin
        </p>
      </main>
    </div>
  );
}

function MicrosoftLogo() {
  return (
    <svg width="14" height="14" viewBox="0 0 23 23" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="1" y="1" width="10" height="10" fill="#F25022" />
      <rect x="12" y="1" width="10" height="10" fill="#7FBA00" />
      <rect x="1" y="12" width="10" height="10" fill="#00A4EF" />
      <rect x="12" y="12" width="10" height="10" fill="#FFB900" />
    </svg>
  );
}
