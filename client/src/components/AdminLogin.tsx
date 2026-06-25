import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Eye, EyeOff, LogIn, MapPin, ArrowRight, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useDarkMode } from '@/contexts/DarkModeContext';
import { cn } from '@/lib/utils';

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
        // The 12-hour expiry in AdminDashboard reads this timestamp.
        localStorage.setItem('ksyk_admin_logged_in', 'true');
        localStorage.setItem('ksyk_admin_user', JSON.stringify(data.user));
        localStorage.setItem('ksyk_admin_login_at', String(Date.now()));

        toast({
          title: 'Welcome back',
          description: 'Signed in to KSYK Admin.',
        });
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
    <div
      className={cn(
        'min-h-screen flex relative overflow-hidden',
        darkMode ? 'bg-gray-950' : 'bg-white',
      )}
    >
      {/* ── Left panel — brand artwork + mission. Hidden on mobile. ────── */}
      <div className="hidden lg:flex relative w-1/2 xl:w-[55%] overflow-hidden">
        <img
          src="/wilma-bg.jpg"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
          loading="eager"
          fetchPriority="high"
        />
        {/* Brand gradient over the photo — keeps text readable, ties to KSYK colours. */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/90 via-indigo-900/80 to-slate-950/95" />
        {/* Subtle grid texture so the white panel doesn't feel flat */}
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between h-full p-10 xl:p-14 text-white">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-md shadow-lg ring-1 ring-white/30">
                <MapPin className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xs font-bold tracking-[0.18em] text-white/70 uppercase">KSYK</p>
                <p className="text-base font-bold tracking-tight">Admin Portal</p>
              </div>
            </div>
          </div>

          <div className="space-y-5 max-w-md">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-md text-[10px] font-bold tracking-widest uppercase ring-1 ring-white/20">
              <Sparkles className="h-3 w-3 text-amber-300" />
              Campus Operations
            </span>
            <h1 className="text-4xl xl:text-5xl font-bold leading-[1.05] tracking-tight">
              Run the campus map.<br />
              <span className="bg-gradient-to-r from-cyan-200 to-amber-100 bg-clip-text text-transparent">
                In one place.
              </span>
            </h1>
            <p className="text-sm text-white/75 leading-relaxed">
              Manage rooms, schedules, security gates, and the 3D map experience that
              students see every day.
            </p>
            <ul className="space-y-2 pt-2">
              {[
                'Live map editor with floor-aware 3D extrusion',
                'Time + IP + email gates with one-click overrides',
                'Wilma integration and per-room schedule sync',
              ].map((line) => (
                <li key={line} className="flex items-start gap-2 text-sm text-white/85">
                  <ArrowRight className="h-4 w-4 mt-0.5 text-cyan-300 shrink-0" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-center justify-between text-[11px] text-white/55">
            <span>© KSYK Maps · Nordbyte Studio</span>
            <a href="/" className="hover:text-white transition-colors">Back to map →</a>
          </div>
        </div>
      </div>

      {/* ── Right panel — sign-in form. Always full width on mobile. ──── */}
      <div
        className={cn(
          'relative flex-1 flex items-center justify-center p-5 sm:p-10',
          darkMode
            ? 'bg-gradient-to-br from-gray-950 via-slate-950 to-gray-900'
            : 'bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50',
        )}
      >
        {/* Mobile brand strip — only shows when the left panel is hidden. */}
        <div className="lg:hidden absolute top-0 inset-x-0 flex items-center justify-between px-5 pt-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-md">
              <MapPin className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-[9px] font-bold tracking-[0.18em] text-muted-foreground uppercase">KSYK</p>
              <p className="text-sm font-bold leading-tight">Admin Portal</p>
            </div>
          </div>
          <a href="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">← Map</a>
        </div>

        <div className="w-full max-w-md space-y-7">
          {/* Header */}
          <div className="space-y-2 text-center sm:text-left">
            <div className="hidden lg:inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25 mb-3">
              <Shield className="h-5 w-5" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
              Welcome back
            </h2>
            <p className="text-sm text-muted-foreground">
              Sign in to manage the KSYK Maps platform.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive" className="rounded-xl border-red-200 dark:border-red-900/50">
                <AlertDescription className="text-sm">{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
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
                className="h-11 rounded-xl text-sm"
                data-testid="admin-email-input"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                  Password
                </Label>
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
                  className="h-11 pr-11 rounded-xl text-sm"
                  data-testid="admin-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-md shadow-blue-500/20 gap-2"
              disabled={isLoading}
              data-testid="admin-login-submit"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Sign in
                </>
              )}
            </Button>
          </form>

          {/* Alternative providers */}
          <div className="space-y-3">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200 dark:border-gray-800" />
              </div>
              <div className="relative flex justify-center text-[10px]">
                <span className="bg-slate-50 dark:bg-slate-950 px-3 text-muted-foreground font-semibold uppercase tracking-widest">
                  or continue with
                </span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() => (window.location.href = '/api/auth/microsoft/start')}
              className="w-full h-11 rounded-xl gap-2.5 font-semibold text-sm"
              data-testid="microsoft-auth-button"
            >
              <MicrosoftLogo />
              Microsoft (@ksyk.fi)
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={() => (window.location.href = '/api/login')}
              className="w-full h-9 text-xs text-muted-foreground hover:text-foreground"
              data-testid="replit-auth-button"
            >
              Continue with Replit Auth
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
                  } catch (error) {
                    console.error('Dev login failed:', error);
                  }
                }}
                className="w-full h-9 text-xs text-amber-600 hover:text-amber-700"
                data-testid="dev-login-button"
              >
                🚀 Quick Dev Access
              </Button>
            )}
          </div>

          <p className="text-center text-[11px] text-muted-foreground">
            Protected by KSYK Maps security gates ·{' '}
            <a href="/" className="text-blue-600 dark:text-blue-400 hover:underline">
              go to map
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

function MicrosoftLogo() {
  return (
    <svg width="16" height="16" viewBox="0 0 23 23" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="1"  y="1"  width="10" height="10" fill="#F25022" />
      <rect x="12" y="1"  width="10" height="10" fill="#7FBA00" />
      <rect x="1"  y="12" width="10" height="10" fill="#00A4EF" />
      <rect x="12" y="12" width="10" height="10" fill="#FFB900" />
    </svg>
  );
}
