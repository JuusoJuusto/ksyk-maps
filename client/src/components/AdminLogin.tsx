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
 * KSYK Admin Login — flipped split:
 *   left  → narrow white sign-in column (38%)
 *   right → full-bleed wilma-bg.jpg (62%), no overlay, no marketing copy.
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
        // Belt-and-suspenders: lowercase again on submit so a paste
        // that bypasses the onChange handler still normalises.
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
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
      {/* ── LEFT · big photo, no overlay, no copy ──────────────── */}
      <div className="hidden lg:block relative flex-1 bg-gray-900 overflow-hidden">
        <img
          src="/wilma-bg.jpg"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
          loading="eager"
          fetchPriority="high"
        />
      </div>

      {/* ── RIGHT · narrow sign-in column ───────────────────────── */}
      <div className={cn(
        "relative flex flex-col w-full lg:w-[38%] xl:w-[34%] px-6 sm:px-10 lg:px-12 py-10 lg:py-14 shrink-0",
        darkMode ? "bg-gray-950" : "bg-white",
      )}>
        {/* Top brand */}
        <div className="flex items-center gap-2.5">
          <img
            src="/favicon-128.png"
            alt="KSYK Maps"
            width={36}
            height={36}
            className="h-9 w-9 object-contain"
          />
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
              "ml-auto text-xs transition-colors",
              darkMode ? "text-gray-500 hover:text-white" : "text-gray-500 hover:text-gray-900",
            )}
          >
            ← Map
          </a>
        </div>

        {/* Form column — vertically centred between the header and footer */}
        <div className="flex-1 flex flex-col justify-center py-10 max-w-sm w-full mx-auto lg:mx-0">
          <div className="space-y-2 mb-7">
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
                // Normalise the input to lowercase on the way in so users
                // can type "User@KSYK.fi" or "USER@KSYK.FI" and still
                // match the record on file — auth matching is
                // case-insensitive on the domain, but we normalise here
                // so the value round-trips cleanly through validation.
                onChange={(e) => setEmail(e.target.value.toLowerCase())}
                placeholder="you@ksyk.fi"
                required
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
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
              className="w-full h-10 font-semibold rounded-lg gap-2 text-sm mt-2 bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-600/20"
              disabled={isLoading}
              data-testid="admin-login-submit"
            >
              {isLoading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-t-transparent border-white rounded-full animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="w-3.5 h-3.5 opacity-80" />
                </>
              )}
            </Button>
          </form>

          {/* Alt providers */}
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
        </div>

        {/* Footer */}
        <div className={cn(
          "flex items-center justify-between text-[11px]",
          darkMode ? "text-gray-500" : "text-gray-400",
        )}>
          <span className="flex items-center gap-1.5">
            <Lock className="h-3 w-3" />
            Protected · KSYK
          </span>
          <a
            href="/"
            className={cn(
              "transition-colors",
              darkMode ? "hover:text-white" : "hover:text-gray-900",
            )}
          >
            Back to map →
          </a>
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
