import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Eye, EyeOff, LogIn } from 'lucide-react';
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
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Important: Include cookies for session
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Store authentication in localStorage
        localStorage.setItem('ksyk_admin_logged_in', 'true');
        localStorage.setItem('ksyk_admin_user', JSON.stringify(data.user));
        
        toast({
          title: "Login Successful",
          description: "Welcome to KSYK Admin Portal",
        });
        onLoginSuccess();
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Invalid credentials');
      }
    } catch (error) {
      setError('Connection error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn(
      "min-h-screen flex items-center justify-center p-4",
      darkMode
        ? "bg-gradient-to-br from-gray-950 via-gray-900 to-slate-900"
        : "bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50"
    )}>
      <Card className={cn(
        "w-full max-w-md shadow-2xl border",
        darkMode
          ? "bg-gray-900/95 border-gray-700/80"
          : "bg-white/95 border-gray-200/80"
      )}>
        <CardHeader className="text-center pb-6">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/25">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
            KSYK Admin Portal
          </CardTitle>
          <p className="text-gray-500 dark:text-gray-400 mt-1.5 text-sm">
            Secure access to campus management
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <Alert variant="destructive" className="rounded-xl">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Admin Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your-email@example.com"
                required
                className="h-11 rounded-xl"
                data-testid="admin-email-input"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter admin password"
                  required
                  className="h-11 pr-11 rounded-xl"
                  data-testid="admin-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-sm"
              disabled={isLoading}
              data-testid="admin-login-submit"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Signing in…
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <LogIn className="w-4 h-4" />
                  Sign in to Admin Panel
                </div>
              )}
            </Button>
          </form>

          <div className="mt-5 pt-5 border-t border-gray-200 dark:border-gray-700/60">
            <div className="text-center">
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
                Alternative authentication methods
              </p>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  onClick={() => window.location.href = "/api/auth/microsoft/start"}
                  className="w-full h-10 text-sm gap-2 font-semibold"
                  data-testid="microsoft-auth-button"
                >
                  <svg width="14" height="14" viewBox="0 0 23 23" aria-hidden="true">
                    <rect x="1"  y="1"  width="10" height="10" fill="#F25022" />
                    <rect x="12" y="1"  width="10" height="10" fill="#7FBA00" />
                    <rect x="1"  y="12" width="10" height="10" fill="#00A4EF" />
                    <rect x="12" y="12" width="10" height="10" fill="#FFB900" />
                  </svg>
                  Sign in with Microsoft (@ksyk.fi)
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.location.href = "/api/login"}
                  className="w-full h-10 text-sm"
                  data-testid="replit-auth-button"
                >
                  🔐 Continue with Replit Auth
                </Button>

                {process.env.NODE_ENV === 'development' && (
                  <Button
                    variant="outline"
                    onClick={async () => {
                      try {
                        const response = await fetch('/api/auth/dev-login', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' }
                        });
                        if (response.ok) {
                          onLoginSuccess();
                        }
                      } catch (error) {
                        console.error('Dev login failed:', error);
                      }
                    }}
                    className="w-full h-10 text-sm"
                    data-testid="dev-login-button"
                  >
                    🚀 Quick Dev Access
                  </Button>
                )}
              </div>
            </div>
          </div>
          
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Protected by advanced security protocols
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}