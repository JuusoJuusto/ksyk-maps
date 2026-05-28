import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Shield, Eye, EyeOff, ArrowLeft, Lock, Mail, Smartphone } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import KSYKLogo from "@/components/KSYKLogo";

type Screen = "login" | "2fa" | "changepw";

interface LoginResponse {
  success: boolean;
  user?: { id: string; email: string; role?: string };
  message?: string;
  requirePasswordChange?: boolean;
  requiresTwoFactor?: boolean;
  userId?: string;
}

export default function AdminLogin() {
  const [screen, setScreen] = useState<Screen>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [pendingUserId, setPendingUserId] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [shake, setShake] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const triggerError = (msg: string) => {
    setError(msg);
    setShake((s) => s + 1);
  };

  const loginMutation = useMutation({
    mutationFn: async (creds: { email: string; password: string }): Promise<LoginResponse> => {
      const r = await fetch("/api/auth/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(creds),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e.message || `Login failed (${r.status})`);
      }
      return r.json();
    },
    onSuccess: (data) => {
      if (data.requiresTwoFactor && data.userId) {
        setPendingUserId(data.userId);
        setError("");
        setScreen("2fa");
        return;
      }
      if (data.success && data.user) {
        localStorage.setItem("ksyk_admin_user", JSON.stringify(data.user));
        localStorage.setItem("ksyk_admin_logged_in", "true");
        localStorage.setItem("ksyk_admin_login_at", String(Date.now()));
        if (data.requirePasswordChange) {
          setScreen("changepw");
        } else {
          window.location.href = "/admin-ksyk-management-portal";
        }
      } else {
        triggerError(data.message || "Login failed");
      }
    },
    onError: (e: Error) => triggerError(e.message),
  });

  const twoFactorMutation = useMutation({
    mutationFn: async ({ userId, code }: { userId: string; code: string }): Promise<LoginResponse> => {
      const r = await fetch("/api/auth/2fa/complete-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, code }),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e.message || `2FA failed (${r.status})`);
      }
      return r.json();
    },
    onSuccess: (data) => {
      if (data.success && data.user) {
        localStorage.setItem("ksyk_admin_user", JSON.stringify(data.user));
        localStorage.setItem("ksyk_admin_logged_in", "true");
        localStorage.setItem("ksyk_admin_login_at", String(Date.now()));
        window.location.href = "/admin-ksyk-management-portal";
      } else {
        triggerError(data.message || "Invalid code");
      }
    },
    onError: (e: Error) => triggerError(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) { triggerError("Please enter both email and password"); return; }
    loginMutation.mutate({ email: email.toLowerCase().trim(), password });
  };

  const handle2FA = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const clean = twoFactorCode.replace(/\s/g, "");
    if (clean.length < 6) { triggerError("Enter your 6-digit code"); return; }
    twoFactorMutation.mutate({ userId: pendingUserId, code: clean });
  };

  const handlePasswordChange = async () => {
    setError("");
    if (newPassword !== confirmPassword) { triggerError("Passwords don't match"); return; }
    if (newPassword.length < 8) { triggerError("Password must be at least 8 characters"); return; }
    try {
      const userData = JSON.parse(localStorage.getItem("ksyk_admin_user") || "{}");
      const r = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ newPassword, userId: userData.id, email: userData.email }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.message || "Failed to change password");
      }
      window.location.href = "/admin-ksyk-management-portal";
    } catch (e: any) {
      triggerError(e?.message || "Failed to change password");
    }
  };

  const cardClass = "bg-white/90 dark:bg-gray-900/85 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/60 dark:border-gray-700/50 overflow-hidden";

  return (
    <div className="min-h-[100dvh] relative flex items-center justify-center px-4 py-10 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-950 dark:via-slate-900 dark:to-blue-950 overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-blue-300/30 dark:bg-blue-600/20 blur-3xl animate-pulse" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-indigo-300/30 dark:bg-indigo-700/20 blur-3xl animate-pulse" style={{ animationDelay: "1.5s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[28rem] h-[28rem] rounded-full bg-cyan-200/20 dark:bg-cyan-800/10 blur-3xl" />
      </div>

      <Link href="/" className="absolute top-4 left-4 z-20 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border border-gray-200/70 dark:border-gray-700/60 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 transition shadow-sm">
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to map
      </Link>

      <AnimatePresence mode="wait">

        {/* ── Login screen ──────────────────────────────────────────── */}
        {screen === "login" && (
          <motion.div key="login" initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -16, scale: 0.98 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }} className="relative z-10 w-full max-w-md">
            <motion.div key={shake} animate={shake ? { x: [-8, 8, -6, 6, -3, 3, 0] } : {}} transition={{ duration: 0.45 }} className={cardClass}>
              <div className="h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500" />
              <div className="px-7 sm:px-9 pt-8 pb-6">
                <div className="flex flex-col items-center text-center">
                  <KSYKLogo size="xl" priority className="drop-shadow-md mb-3" />
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-100/80 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[10px] font-bold uppercase tracking-wider mb-2">
                    <Shield className="h-3 w-3" />
                    Admin Portal
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">KSYK Maps</h1>
                  <p className="text-sm text-muted-foreground mt-1">Sign in to manage the campus</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 mt-6">
                  <AnimatePresence>
                    {error && (
                      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                        <Alert variant="destructive" className="rounded-xl"><AlertDescription className="text-sm">{error}</AlertDescription></Alert>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs font-semibold text-gray-700 dark:text-gray-300">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                      <Input id="email" type="email" autoComplete="email" placeholder="you@school.fi" value={email} onChange={(e) => setEmail(e.target.value)} disabled={loginMutation.isPending} required className="pl-10 h-11 rounded-xl" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="password" className="text-xs font-semibold text-gray-700 dark:text-gray-300">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                      <Input id="password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={loginMutation.isPending} required className="pl-10 pr-10 h-11 rounded-xl" />
                      <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors" disabled={loginMutation.isPending} tabIndex={-1} aria-label={showPassword ? "Hide password" : "Show password"}>
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <Button type="submit" className="w-full h-11 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all" disabled={loginMutation.isPending}>
                    {loginMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing in…</> : "Sign in"}
                  </Button>
                </form>
              </div>
              <div className="px-7 sm:px-9 pb-7 pt-2">
                <div className="text-center text-[11px] text-muted-foreground space-y-1 border-t border-gray-200/70 dark:border-gray-700/50 pt-4">
                  <p className="font-semibold text-gray-700 dark:text-gray-300">Owner / admin access only</p>
                  <p>Contact the system owner to request credentials.</p>
                </div>
              </div>
            </motion.div>
            <p className="text-[11px] text-center text-gray-500 dark:text-gray-400 mt-4">© {new Date().getFullYear()} Nordbyte Studio · KSYK Maps</p>
          </motion.div>
        )}

        {/* ── 2FA screen ────────────────────────────────────────────── */}
        {screen === "2fa" && (
          <motion.div key="2fa" initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -16, scale: 0.98 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }} className="relative z-10 w-full max-w-md">
            <motion.div key={shake} animate={shake ? { x: [-8, 8, -6, 6, -3, 3, 0] } : {}} transition={{ duration: 0.45 }} className={cardClass}>
              <div className="h-1.5 bg-gradient-to-r from-violet-500 via-indigo-500 to-blue-500" />
              <div className="px-7 sm:px-9 py-8">
                <div className="flex flex-col items-center text-center mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center mb-3 shadow-inner">
                    <Smartphone className="h-7 w-7 text-indigo-600 dark:text-indigo-300" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Two-factor authentication</h2>
                  <p className="text-sm text-muted-foreground mt-1">Enter the 6-digit code from your authenticator app or a backup code.</p>
                </div>

                <form onSubmit={handle2FA} className="space-y-4">
                  <AnimatePresence>
                    {error && (
                      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                        <Alert variant="destructive" className="rounded-xl"><AlertDescription className="text-sm">{error}</AlertDescription></Alert>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="space-y-1.5">
                    <Label htmlFor="twofa" className="text-xs font-semibold text-gray-700 dark:text-gray-300">Authentication code</Label>
                    <Input
                      id="twofa"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="000 000"
                      value={twoFactorCode}
                      onChange={(e) => setTwoFactorCode(e.target.value.replace(/[^0-9\s]/g, "").slice(0, 7))}
                      disabled={twoFactorMutation.isPending}
                      autoFocus
                      className="h-14 text-center text-2xl font-mono tracking-[0.4em] rounded-xl"
                    />
                  </div>

                  <Button type="submit" className="w-full h-11 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-semibold shadow-lg transition-all" disabled={twoFactorMutation.isPending}>
                    {twoFactorMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Verifying…</> : "Verify"}
                  </Button>

                  <button type="button" onClick={() => { setScreen("login"); setError(""); setTwoFactorCode(""); }} className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors pt-1">
                    ← Back to login
                  </button>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* ── Change password screen ────────────────────────────────── */}
        {screen === "changepw" && (
          <motion.div key="changepw" initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -16, scale: 0.98 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }} className="relative z-10 w-full max-w-md">
            <motion.div key={shake} animate={shake ? { x: [-8, 8, -6, 6, -3, 3, 0] } : {}} transition={{ duration: 0.45 }} className={cardClass}>
              <div className="h-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500" />
              <div className="px-7 sm:px-9 py-8">
                <div className="flex flex-col items-center text-center mb-5">
                  <KSYKLogo size="lg" className="mb-3" />
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Set a new password</h2>
                  <p className="text-sm text-muted-foreground mt-1">Your current password is temporary. Choose a permanent one (≥ 8 chars).</p>
                </div>

                <div className="space-y-4">
                  <AnimatePresence>
                    {error && (
                      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                        <Alert variant="destructive" className="rounded-xl"><AlertDescription className="text-sm">{error}</AlertDescription></Alert>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">New password</Label>
                    <div className="relative">
                      <Input type={showNewPassword ? "text" : "password"} autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 8 characters" className="pr-10 h-11 rounded-xl" />
                      <button type="button" onClick={() => setShowNewPassword((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabIndex={-1}>
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Confirm password</Label>
                    <div className="relative">
                      <Input type={showConfirmPassword ? "text" : "password"} autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repeat new password" className="pr-10 h-11 rounded-xl" />
                      <button type="button" onClick={() => setShowConfirmPassword((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabIndex={-1}>
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <Button onClick={handlePasswordChange} className="w-full h-11 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold">
                    Save & continue
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
