import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, LogIn, MapPin, ArrowRight, Compass, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useDarkMode } from '@/contexts/DarkModeContext';
import { cn } from '@/lib/utils';

/**
 * KSYK Admin Login — editorial cartographic split.
 *
 * Left: full-bleed wilma-bg.jpg behind a navy/cyan brand wash with a
 * compass watermark and a serif headline.
 * Right: refined login form, generous whitespace, no AI-slop gradients.
 *
 * Typography:
 *   display → Libre Baskerville (already loaded in index.html)
 *   body    → Plus Jakarta Sans
 *   tabular → JetBrains Mono
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
        toast({ title: 'Welcome back', description: 'Signed in to KSYK Admin.' });
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
      className="min-h-screen flex relative overflow-hidden"
      style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
    >
      {/* ── LEFT · brand panel ───────────────────────────────────────── */}
      <div className="hidden lg:flex relative w-[58%] xl:w-[60%] overflow-hidden bg-[#0b1322]">
        <img
          src="/wilma-bg.jpg"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover opacity-50"
          loading="eager"
        />
        {/* Navy → midnight overlay — turns the photo into a backdrop. */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0b1322]/95 via-[#0b1322]/82 to-[#070b16]/96" />
        {/* Soft cyan glow blob — gives the panel depth. */}
        <div
          aria-hidden="true"
          className="absolute -top-32 -right-32 w-[28rem] h-[28rem] rounded-full opacity-25 blur-3xl"
          style={{ background: 'radial-gradient(circle, #22d3ee 0%, transparent 70%)' }}
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-40 -left-32 w-[32rem] h-[32rem] rounded-full opacity-15 blur-3xl"
          style={{ background: 'radial-gradient(circle, #fbbf24 0%, transparent 70%)' }}
        />
        {/* Faint grid texture */}
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
        />
        {/* Watermark compass — huge, ghosted, behind text */}
        <Compass
          aria-hidden="true"
          className="absolute -bottom-20 -right-20 w-[34rem] h-[34rem] text-white/[0.025] stroke-[0.5]"
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between w-full p-10 xl:p-16 text-white">
          {/* Top brand strip */}
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 backdrop-blur-md ring-1 ring-white/20 shadow-lg">
              <MapPin className="h-5 w-5 text-cyan-300" strokeWidth={2.4} />
            </div>
            <div>
              <p
                className="text-[10px] font-bold tracking-[0.32em] text-cyan-300/80 uppercase"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                KSYK · 60.187°N
              </p>
              <p className="text-base font-bold tracking-tight text-white/95">
                Admin Portal
              </p>
            </div>
          </div>

          {/* Mid headline block */}
          <div className="space-y-6 max-w-xl">
            <p
              className="text-[10px] font-bold tracking-[0.4em] text-amber-200/80 uppercase"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              · Campus Operations ·
            </p>
            <h1
              className="text-[2.6rem] xl:text-[3.2rem] leading-[1.05] tracking-tight text-white"
              style={{ fontFamily: "'Libre Baskerville', Georgia, serif", fontWeight: 700 }}
            >
              Map the campus,<br />
              <em className="not-italic bg-gradient-to-r from-cyan-200 via-amber-100 to-cyan-200 bg-clip-text text-transparent">
                run the school.
              </em>
            </h1>
            <p className="text-sm text-white/65 leading-relaxed max-w-md">
              The single console for rooms, schedules, security gates and the
              3D map experience students see every day.
            </p>
            <div className="grid grid-cols-2 gap-x-5 gap-y-3 pt-3 max-w-md">
              {[
                ['01', 'Live 3D map editor'],
                ['02', 'Time · IP · email gates'],
                ['03', 'Per-user overrides'],
                ['04', 'Heavy telemetry logs'],
              ].map(([num, label]) => (
                <div key={num} className="flex items-baseline gap-2">
                  <span
                    className="text-[10px] font-bold text-cyan-300/70"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {num}
                  </span>
                  <span className="text-xs text-white/75">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom strip — coordinates + legal */}
          <div className="flex items-end justify-between text-[10px] text-white/40">
            <div className="space-y-1">
              <p style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                60.187°N · 25.006°E
              </p>
              <p>© KSYK Maps · Nordbyte Studio</p>
            </div>
            <a href="/" className="text-white/55 hover:text-white transition-colors">
              ← Back to map
            </a>
          </div>
        </div>
      </div>

      {/* ── RIGHT · login form ──────────────────────────────────────── */}
      <div
        className={cn(
          'relative flex-1 flex items-center justify-center px-5 sm:px-10 py-12',
          darkMode
            ? 'bg-gradient-to-b from-[#0b1322] via-[#0e1729] to-[#0b1322]'
            : 'bg-[#fbfaf6]',
        )}
      >
        {/* Mobile brand strip */}
        <div className="lg:hidden absolute top-0 inset-x-0 flex items-center justify-between px-5 pt-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#0b1322] to-[#1b2540] text-cyan-300 shadow-md">
              <MapPin className="h-4 w-4" />
            </div>
            <div>
              <p
                className="text-[9px] font-bold tracking-[0.28em] text-muted-foreground uppercase"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                KSYK
              </p>
              <p
                className="text-sm font-bold leading-tight"
                style={{ fontFamily: "'Libre Baskerville', Georgia, serif" }}
              >
                Admin Portal
              </p>
            </div>
          </div>
          <a href="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            ← Map
          </a>
        </div>

        <div className="w-full max-w-[26rem]">
          {/* Header */}
          <div className="space-y-3 mb-9">
            <p
              className={cn(
                'text-[10px] font-bold tracking-[0.32em] uppercase',
                darkMode ? 'text-cyan-400' : 'text-blue-700',
              )}
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              · Sign In ·
            </p>
            <h2
              className={cn(
                'text-[2.2rem] leading-[1.05] tracking-tight',
                darkMode ? 'text-white' : 'text-[#0b1322]',
              )}
              style={{ fontFamily: "'Libre Baskerville', Georgia, serif", fontWeight: 700 }}
            >
              Welcome back.
            </h2>
            <p className={cn('text-sm leading-relaxed', darkMode ? 'text-white/55' : 'text-[#0b1322]/55')}>
              Sign in to manage the KSYK Maps platform.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <Alert variant="destructive" className="rounded-xl border-red-200 dark:border-red-900/50 text-sm">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label
                htmlFor="email"
                className={cn(
                  'text-[10px] font-bold uppercase tracking-[0.18em]',
                  darkMode ? 'text-white/60' : 'text-[#0b1322]/60',
                )}
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
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
                  'h-12 rounded-xl text-sm border-2 transition-colors',
                  darkMode
                    ? 'bg-white/[0.04] border-white/10 focus-visible:border-cyan-400 focus-visible:ring-cyan-400/20 text-white placeholder:text-white/35'
                    : 'bg-white border-[#0b1322]/12 focus-visible:border-[#0b1322] focus-visible:ring-[#0b1322]/10 text-[#0b1322]',
                )}
                data-testid="admin-email-input"
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="password"
                className={cn(
                  'text-[10px] font-bold uppercase tracking-[0.18em]',
                  darkMode ? 'text-white/60' : 'text-[#0b1322]/60',
                )}
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
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
                    'h-12 pr-12 rounded-xl text-sm border-2 transition-colors',
                    darkMode
                      ? 'bg-white/[0.04] border-white/10 focus-visible:border-cyan-400 focus-visible:ring-cyan-400/20 text-white placeholder:text-white/35'
                      : 'bg-white border-[#0b1322]/12 focus-visible:border-[#0b1322] focus-visible:ring-[#0b1322]/10 text-[#0b1322]',
                  )}
                  data-testid="admin-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={cn(
                    'absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors',
                    darkMode
                      ? 'text-white/40 hover:text-white/80 hover:bg-white/10'
                      : 'text-[#0b1322]/40 hover:text-[#0b1322] hover:bg-[#0b1322]/05',
                  )}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className={cn(
                'w-full h-12 font-semibold rounded-xl gap-2 text-sm tracking-tight shadow-lg transition-all',
                darkMode
                  ? 'bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-[#0b1322] shadow-cyan-500/25'
                  : 'bg-[#0b1322] hover:bg-[#1b2540] text-white shadow-[#0b1322]/15',
              )}
              disabled={isLoading}
              data-testid="admin-login-submit"
            >
              {isLoading ? (
                <>
                  <div className={cn(
                    'w-4 h-4 border-2 border-t-transparent rounded-full animate-spin',
                    darkMode ? 'border-[#0b1322]' : 'border-white',
                  )} />
                  Signing in…
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Sign in
                  <ArrowRight className="w-4 h-4 ml-auto opacity-60" />
                </>
              )}
            </Button>
          </form>

          {/* Alternative providers */}
          <div className="mt-7 space-y-3">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className={cn('w-full border-t', darkMode ? 'border-white/10' : 'border-[#0b1322]/10')} />
              </div>
              <div className="relative flex justify-center">
                <span
                  className={cn(
                    'px-3 text-[10px] font-bold tracking-[0.28em] uppercase',
                    darkMode ? 'bg-[#0e1729] text-white/40' : 'bg-[#fbfaf6] text-[#0b1322]/40',
                  )}
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  or
                </span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() => (window.location.href = '/api/auth/microsoft/start')}
              className={cn(
                'w-full h-11 rounded-xl gap-3 font-semibold text-sm border-2',
                darkMode
                  ? 'bg-transparent border-white/15 text-white hover:bg-white/[0.04]'
                  : 'bg-white border-[#0b1322]/12 text-[#0b1322] hover:bg-[#0b1322]/[0.02]',
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
                  'w-full h-9 text-xs',
                  darkMode ? 'text-amber-300 hover:text-amber-200' : 'text-amber-700 hover:text-amber-800',
                )}
                data-testid="dev-login-button"
              >
                🚀 Quick Dev Access
              </Button>
            )}
          </div>

          {/* Footer */}
          <div className={cn(
            'mt-9 pt-6 border-t flex items-center justify-between text-[11px]',
            darkMode ? 'border-white/10 text-white/40' : 'border-[#0b1322]/10 text-[#0b1322]/45',
          )}>
            <span className="flex items-center gap-1.5">
              <Lock className="h-3 w-3" />
              Secured by KSYK gates
            </span>
            <a
              href="/"
              className={cn(
                'hover:underline transition-colors',
                darkMode ? 'text-cyan-400 hover:text-cyan-300' : 'text-blue-700 hover:text-blue-800',
              )}
            >
              go to map →
            </a>
          </div>
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
