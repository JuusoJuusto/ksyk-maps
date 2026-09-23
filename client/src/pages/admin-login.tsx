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

  /**
   * v4.7.14 — post-login redirect target. Reads `?redirect=` from the
   * URL and validates it's a safe internal path before honoring it.
   *
   * Rejected forms (open-redirect vectors):
   *   - absolute URLs        (http://…, https://…)
   *   - protocol-relative    (//evil.com)
   *   - non-http schemes     (javascript:, data:)
   *   - anything not starting with a single `/`
   *
   * Falls back to the canonical admin base URL when the param is
   * missing or fails validation. Never trusts the raw value.
   */
  const resolveRedirect = (): string => {
    const fallback = "/admin-ksyk-management-portal";
    if (typeof window === "undefined") return fallback;
    try {
      const raw = new URLSearchParams(window.location.search).get("redirect");
      if (!raw) return fallback;
      // Must start with exactly one `/` (single leading slash), no protocol.
      if (!raw.startsWith("/") || raw.startsWith("//")) return fallback;
      if (/^[a-z]+:/i.test(raw)) return fallback;
      // Reject anything trying to escape the origin via URL parsing.
      const u = new URL(raw, window.location.origin);
      if (u.origin !== window.location.origin) return fallback;
      return u.pathname + u.search + u.hash;
    } catch {
      return fallback;
    }
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
          window.location.href = resolveRedirect();
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

  // v4.7.20 — apple-design pass on the login page. Killed:
  //   - full-page gradient bg (bg-gradient-to-br from-slate-50 via-blue-50…)
  //   - 3 animate-pulse blur-3xl blob divs
  //   - backdrop-blur-xl glassmorphism card
  //   - rounded-3xl + shadow-2xl chrome
  //   - decorative "Admin Portal" badge
  //   - gradient bg-clip-text on the title
  //   - gradient button fill + hover
  //   - decorative 1.5px top gradient strip
  // Replaced with: quiet centered form, plain background, standard border,
  // solid button. Matches Apple's own sign-in surfaces (System Settings, iCloud).
  const cardClass = "bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden";

  return (
    <div className="min-h-[100dvh] flex items-center justify-center px-4 py-10 bg-gray-50 dark:bg-black">
      <Link
        href="/"
        className="absolute top-4 left-4 inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-[12px] font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-50 dark:focus-visible:ring-offset-black"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to map
      </Link>

      <AnimatePresence mode="wait">

        {/* ── Login screen ──────────────────────────────────────────── */}
        {screen === "login" && (
          <motion.div
            key="login"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="w-full max-w-[380px]"
          >
            <motion.div
              key={shake}
              animate={shake ? { x: [-6, 6, -4, 4, -2, 2, 0] } : {}}
              transition={{ duration: 0.35 }}
              className={cardClass}
            >
              <div className="px-8 pt-10 pb-8">
                <div className="flex flex-col items-center text-center mb-8">
                  <KSYKLogo size="lg" priority className="mb-4" />
                  <h1 className="text-[22px] font-semibold tracking-tight text-gray-900 dark:text-white">
                    KSYK Maps
                  </h1>
                  <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1">
                    Admin sign-in
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.15 }}
                      >
                        <Alert variant="destructive" className="py-2.5 px-3 rounded-lg">
                          <AlertDescription className="text-[13px] leading-snug">{error}</AlertDescription>
                        </Alert>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-[12px] font-medium text-gray-700 dark:text-gray-300">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@school.fi"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loginMutation.isPending}
                      required
                      className="h-10 rounded-lg text-[14px]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="password" className="text-[12px] font-medium text-gray-700 dark:text-gray-300">
                      Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={loginMutation.isPending}
                        required
                        className="h-10 pr-10 rounded-lg text-[14px]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((s) => !s)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 flex items-center justify-center rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                        disabled={loginMutation.isPending}
                        tabIndex={-1}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loginMutation.isPending || !email || !password}
                    className="w-full h-10 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-[14px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-950 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loginMutation.isPending ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing in…</>
                    ) : (
                      "Sign in"
                    )}
                  </Button>
                </form>

                <p className="mt-6 text-center text-[11px] text-gray-500 dark:text-gray-400">
                  Owner / admin access only. Contact the system owner for credentials.
                </p>
              </div>
            </motion.div>
            <p className="text-[11px] text-center text-gray-400 dark:text-gray-600 mt-6 tabular-nums">
              © {new Date().getFullYear()} KSYK Maps
            </p>
          </motion.div>
        )}

        {/* ── 2FA screen ────────────────────────────────────────────── */}
        {screen === "2fa" && (
          <motion.div
            key="2fa"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="w-full max-w-[380px]"
          >
            <motion.div
              key={shake}
              animate={shake ? { x: [-6, 6, -4, 4, -2, 2, 0] } : {}}
              transition={{ duration: 0.35 }}
              className={cardClass}
            >
              <div className="px-8 py-10">
                <div className="flex flex-col items-center text-center mb-6">
                  <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-900 flex items-center justify-center mb-3">
                    <Smartphone className="h-5 w-5 text-gray-600 dark:text-gray-400" strokeWidth={1.75} />
                  </div>
                  <h2 className="text-[18px] font-semibold tracking-tight text-gray-900 dark:text-white">
                    Two-factor code
                  </h2>
                  <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1">
                    Enter the 6-digit code from your authenticator app.
                  </p>
                </div>

                <form onSubmit={handle2FA} className="space-y-4">
                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.15 }}
                      >
                        <Alert variant="destructive" className="py-2.5 px-3 rounded-lg">
                          <AlertDescription className="text-[13px] leading-snug">{error}</AlertDescription>
                        </Alert>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div>
                    <Label htmlFor="twofa" className="sr-only">Authentication code</Label>
                    <Input
                      id="twofa"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="000000"
                      value={twoFactorCode}
                      onChange={(e) => setTwoFactorCode(e.target.value.replace(/[^0-9\s]/g, "").slice(0, 7))}
                      disabled={twoFactorMutation.isPending}
                      autoFocus
                      className="h-14 text-center text-[24px] font-mono tabular-nums tracking-[0.4em] rounded-lg"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={twoFactorMutation.isPending || twoFactorCode.replace(/\s/g, "").length < 6}
                    className="w-full h-10 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-[14px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-950 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {twoFactorMutation.isPending ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Verifying…</>
                    ) : (
                      "Verify"
                    )}
                  </Button>

                  <button
                    type="button"
                    onClick={() => { setScreen("login"); setError(""); setTwoFactorCode(""); }}
                    className="w-full text-[12px] text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 transition-colors py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-950 rounded"
                  >
                    ← Back to sign-in
                  </button>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* ── Change password screen ────────────────────────────────── */}
        {screen === "changepw" && (
          <motion.div
            key="changepw"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="w-full max-w-[380px]"
          >
            <motion.div
              key={shake}
              animate={shake ? { x: [-6, 6, -4, 4, -2, 2, 0] } : {}}
              transition={{ duration: 0.35 }}
              className={cardClass}
            >
              <div className="px-8 py-10">
                <div className="flex flex-col items-center text-center mb-6">
                  <KSYKLogo size="lg" className="mb-3" />
                  <h2 className="text-[18px] font-semibold tracking-tight text-gray-900 dark:text-white">
                    Set a new password
                  </h2>
                  <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1">
                    Your current password is temporary. Choose a permanent one (min 8 characters).
                  </p>
                </div>

                <div className="space-y-4">
                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.15 }}
                      >
                        <Alert variant="destructive" className="py-2.5 px-3 rounded-lg">
                          <AlertDescription className="text-[13px] leading-snug">{error}</AlertDescription>
                        </Alert>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="space-y-1.5">
                    <Label htmlFor="newpw" className="text-[12px] font-medium text-gray-700 dark:text-gray-300">
                      New password
                    </Label>
                    <div className="relative">
                      <Input
                        id="newpw"
                        type={showNewPassword ? "text" : "password"}
                        autoComplete="new-password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="At least 8 characters"
                        className="h-10 pr-10 rounded-lg text-[14px]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword((s) => !s)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 flex items-center justify-center rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                        tabIndex={-1}
                        aria-label={showNewPassword ? "Hide password" : "Show password"}
                      >
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="confirmpw" className="text-[12px] font-medium text-gray-700 dark:text-gray-300">
                      Confirm password
                    </Label>
                    <div className="relative">
                      <Input
                        id="confirmpw"
                        type={showConfirmPassword ? "text" : "password"}
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repeat new password"
                        className="h-10 pr-10 rounded-lg text-[14px]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((s) => !s)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 flex items-center justify-center rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                        tabIndex={-1}
                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    onClick={handlePasswordChange}
                    disabled={!newPassword || !confirmPassword}
                    className="w-full h-10 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-[14px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-950 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Save &amp; continue
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
