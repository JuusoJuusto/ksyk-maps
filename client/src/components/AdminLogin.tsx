import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, ArrowRight, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useDarkMode } from '@/contexts/DarkModeContext';
import { cn } from '@/lib/utils';

/**
 * KSYK Admin Login — minimal split.
 *
 * Left: the wilma-bg.jpg photo with a soft white wash so it reads as a
 * calm campus backdrop, not a marketing splash. Brand mark, one tagline.
 * Right: tight white form. No gradients, no glow, no "shouting" copy.
 * The whole page is built around restraint — appropriate for an admin
 * surface used daily by one or two people.
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
        body: JSON.stringify({ email, password }),
      });
      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('ksyk_admin_logged_in', 'true');
        localStorage.setItem('ksyk_admin_user', JSON.stringify(data.user));
        localStorage.setItem('ksyk_admin_login_at', String(Date.now()));
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
    <div className="min-h-screen flex bg-white">
      {/* ── LEFT · photo panel ──────────────────────────────────────── */}
      <div className="hidden lg:block relative w-1/2 xl:w-[55%] bg-gray-100 overflow-hidden">
        <img
          src="/wilma-bg.jpg"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
        />
        {/* Soft white wash so text on top reads clearly */}
        <div className="absolute inset-0 bg-white/55" />
        {/* Bottom-left brand block */}
        <div className="absolute inset-0 flex flex-col justify-between p-12 xl:p-14 text-gray-900">
          <div>
            <p className="text-[10px] font-bold tracking-[0.42em] text-gray-500 uppercase">
              KSYK · Maps
            </p>
            <p className="text-sm font-semibold mt-1">Admin Portal</p>
          </div>
          <div className="space-y-2 max-w-md">
            <h1 className="text-4xl xl:text-5xl font-semibold leading-[1.05] tracking-tight">
              Run the campus map.
            </h1>
            <p className="text-sm text-gray-600 leading-relaxed">
              Manage rooms, schedules, security and the 3D experience that
              students see every day.
            </p>
          </div>
          <div className="flex items-center justify-between text-[11px] text-gray-500">
            <span>© KSYK · Nordbyte Studio</span>
            <a href="/" className="hover:text-gray-900 transition-colors">
              ← Back to map
            </a>
          </div>
        </div>
      </div>

      {/* ── RIGHT · login form ──────────────────────────────────────── */}
      <div className={cn(
        "relative flex-1 flex items-center justify-center px-5 sm:px-12 py-12",
        darkMode ? "bg-gray-950" : "bg-white",
      )}>
        {/* Mobile brand strip */}
        <div className="lg:hidden absolute top-0 inset-x-0 flex items-center justify-between px-5 pt-5">
          <div>
            <p className={cn(
              "text-[9px] font-bold tracking-[0.42em] uppercase",
              darkMode ? "text-gray-500" : "text-gray-400",
            )}>
              KSYK · Maps
            </p>
            <p className={cn(
              "text-xs font-semibold",
              darkMode ? "text-white" : "text-gray-900",
            )}>
              Admin
            </p>
          </div>
          <a
            href="/"
            className={cn(
              "text-xs transition-colors",
              darkMode ? "text-gray-500 hover:text-white" : "text-gray-500 hover:text-gray-900",
            )}
          >
            ← Map
          </a>
        </div>

        <div className="w-full max-w-[22rem]">
          {/* Header */}
          <div className="space-y-2 mb-8">
            <h2 className={cn(
              "text-2xl font-semibold tracking-tight",
              darkMode ? "text-white" : "text-gray-900",
            )}>
              Sign in
            </h2>
            <p className={cn(
              "text-sm",
              darkMode ? "text-gray-400" : "text-gray-500",
            )}>
              Continue to the KSYK admin panel.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive" className="rounded-lg text-sm">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email" className={cn(
                "text-xs font-medium",
                darkMode ? "text-gray-300" : "text-gray-700",
              )}>
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@ksyk.fi"
                required
                autoComplete="email"
                autoFocus
                className={cn(
                  "h-10 rounded-lg text-sm",
                  darkMode
                    ? "bg-gray-900 border-gray-800 text-white"
                    : "bg-white border-gray-300 text-gray-900",
                )}
                data-testid="admin-email-input"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className={cn(
                "text-xs font-medium",
                darkMode ? "text-gray-300" : "text-gray-700",
              )}>
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className={cn(
                    "h-10 pr-10 rounded-lg text-sm",
                    darkMode
                      ? "bg-gray-900 border-gray-800 text-white"
                      : "bg-white border-gray-300 text-gray-900",
                  )}
                  data-testid="admin-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={cn(
                    "absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md transition-colors",
                    darkMode
                      ? "text-gray-500 hover:text-white hover:bg-white/10"
                      : "text-gray-400 hover:text-gray-700 hover:bg-gray-100",
                  )}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className={cn(
                "w-full h-10 font-semibold rounded-lg gap-2 text-sm mt-2",
                darkMode
                  ? "bg-white hover:bg-gray-100 text-gray-900"
                  : "bg-gray-900 hover:bg-gray-800 text-white",
              )}
              disabled={isLoading}
              data-testid="admin-login-submit"
            >
              {isLoading ? (
                <>
                  <div className={cn(
                    "w-3.5 h-3.5 border-2 border-t-transparent rounded-full animate-spin",
                    darkMode ? "border-gray-900" : "border-white",
                  )} />
                  Signing in…
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="w-3.5 h-3.5 opacity-70" />
                </>
              )}
            </Button>
          </form>

          {/* Alternative providers */}
          <div className="mt-6 space-y-2">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className={cn(
                  "w-full border-t",
                  darkMode ? "border-gray-800" : "border-gray-200",
                )} />
              </div>
              <div className="relative flex justify-center">
                <span className={cn(
                  "px-2 text-[10px] font-medium uppercase tracking-wider",
                  darkMode ? "bg-gray-950 text-gray-500" : "bg-white text-gray-400",
                )}>
                  or
                </span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() => (window.location.href = '/api/auth/microsoft/start')}
              className={cn(
                "w-full h-10 rounded-lg gap-2 font-medium text-sm",
                darkMode
                  ? "bg-transparent border-gray-800 text-gray-200 hover:bg-white/5"
                  : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50",
              )}
              data-testid="microsoft-auth-button"
            >
              <MicrosoftLogo />
              Microsoft · @ksyk.fi
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                const guest = {
                  id: `guest-${Date.now()}`,
                  email: 'student@guest.ksyk.fi',
                  role: 'student',
                  provider: 'guest',
                };
                try { localStorage.setItem('ksyk_user', JSON.stringify(guest)); } catch { /* */ }
                window.location.href = '/';
              }}
              className={cn(
                "w-full h-9 rounded-lg text-xs font-medium",
                darkMode ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-900",
              )}
              data-testid="student-guest-button"
            >
              Continue as student (guest) →
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
                className={cn(
                  "w-full h-8 text-[11px]",
                  darkMode ? "text-amber-400 hover:text-amber-300" : "text-amber-600 hover:text-amber-700",
                )}
                data-testid="dev-login-button"
              >
                Dev quick access
              </Button>
            )}
          </div>

          {/* Footer */}
          <div className={cn(
            "mt-8 pt-5 border-t flex items-center justify-between text-[11px]",
            darkMode ? "border-gray-900 text-gray-500" : "border-gray-100 text-gray-400",
          )}>
            <span className="flex items-center gap-1.5">
              <Lock className="h-3 w-3" />
              Protected
            </span>
            <a
              href="/"
              className={cn(
                "transition-colors",
                darkMode ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-900",
              )}
            >
              Back to map →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function MicrosoftLogo() {
  return (
    <svg width="14" height="14" viewBox="0 0 23 23" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="1"  y="1"  width="10" height="10" fill="#F25022" />
      <rect x="12" y="1"  width="10" height="10" fill="#7FBA00" />
      <rect x="1"  y="12" width="10" height="10" fill="#00A4EF" />
      <rect x="12" y="12" width="10" height="10" fill="#FFB900" />
    </svg>
  );
}
