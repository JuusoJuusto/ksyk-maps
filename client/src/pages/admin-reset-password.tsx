/**
 * KSYK Admin — Reset Password.
 *
 * Reached from the emailed reset link — `?token=...` in the query
 * string carries the server-generated reset token. The user enters a
 * new password (twice); we POST { token, newPassword } to
 * /api/auth/reset-password. On success we bounce them back to /admin
 * so they can sign in with the fresh password.
 *
 * Same visual language as AdminLogin / AdminForgotPassword.
 */
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff, Lock, ShieldAlert } from "lucide-react";
import { useDarkMode } from "@/contexts/DarkModeContext";
import { cn } from "@/lib/utils";

/** Password strength scoring — 0 (empty) to 4 (great). Same heuristic
 *  we use for admin password change: length, mixed case, digits,
 *  symbols. */
function strengthOf(pw: string): number {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 8) s += 1;
  if (pw.length >= 12) s += 1;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s += 1;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) s += 1;
  return Math.min(4, s);
}

export default function AdminResetPassword() {
  const [, setLocation] = useLocation();
  const { darkMode } = useDarkMode();

  const token = useMemo(() => {
    if (typeof window === "undefined") return "";
    const p = new URLSearchParams(window.location.search);
    return p.get("token") ?? "";
  }, []);

  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) setError("Missing reset token. Use the link from your email.");
  }, [token]);

  const strength = strengthOf(newPw);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!token) { setError("Missing reset token."); return; }
    if (newPw.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (newPw !== confirmPw) { setError("Passwords don't match."); return; }
    if (strength < 2) { setError("Choose a stronger password — mix cases + digits."); return; }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token, newPassword: newPw }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body?.success !== false) {
        setDone(true);
        // Bounce to the login screen after a short beat so the user has
        // time to read the confirmation.
        window.setTimeout(() => setLocation("/admin"), 2500);
      } else {
        setError(body?.message || "Reset failed. The link may have expired.");
      }
    } catch {
      setError("Network error. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={cn(
        "min-h-screen flex items-center justify-center p-4",
        darkMode ? "bg-gray-950" : "bg-white",
      )}
    >
      <div
        className={cn(
          "w-full max-w-md rounded-2xl border p-8",
          darkMode ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200",
        )}
      >
        <div className="flex items-center gap-2.5 mb-6">
          <Lock className="h-[18px] w-[18px] text-gray-400" strokeWidth={1.75} />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-400 dark:text-gray-500">
              KSYK Admin
            </p>
            <h1 className={cn("text-[17px] font-semibold tracking-tight leading-none mt-0.5", darkMode ? "text-white" : "text-gray-900")}>
              Choose a new password
            </h1>
          </div>
        </div>

        {done ? (
          <div className={cn("rounded-xl p-4 border-2 flex items-start gap-3", "border-emerald-500/40 bg-emerald-500/5")}>
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className={cn("font-semibold text-sm", darkMode ? "text-emerald-300" : "text-emerald-800")}>
                Password updated
              </p>
              <p className={cn("text-xs mt-1", darkMode ? "text-emerald-300/70" : "text-emerald-700/80")}>
                Redirecting you to the admin sign-in…
              </p>
            </div>
          </div>
        ) : !token ? (
          <>
            <div className={cn("rounded-xl p-4 mb-4 border-2 flex items-start gap-3", "border-red-500/40 bg-red-500/5")}>
              <ShieldAlert className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className={cn("font-semibold text-sm", darkMode ? "text-red-300" : "text-red-800")}>
                  Invalid reset link
                </p>
                <p className={cn("text-xs mt-1", darkMode ? "text-red-300/70" : "text-red-700/80")}>
                  The link doesn't include a reset token. Request a new one from the login screen.
                </p>
              </div>
            </div>
            <Button
              type="button"
              onClick={() => setLocation("/admin/forgot-password")}
              className="w-full h-10 rounded-lg font-semibold gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              Request a new link
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="admin-reset-new" className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                New password
              </Label>
              <div className="relative">
                <Input
                  id="admin-reset-new"
                  type={showPw ? "text" : "password"}
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  autoComplete="new-password"
                  className="h-10 text-sm pr-9"
                  data-testid="admin-reset-new"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
                  aria-label={showPw ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              {/* Strength meter */}
              <div className="flex gap-1 mt-1.5">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={cn(
                      "h-1 flex-1 rounded-full transition-colors",
                      i < strength
                        ? strength === 1 ? "bg-red-500"
                        : strength === 2 ? "bg-amber-500"
                        : strength === 3 ? "bg-blue-500"
                        :                  "bg-emerald-500"
                        : "bg-gray-200 dark:bg-gray-800",
                    )}
                  />
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground">
                At least 8 characters. Mix upper + lower + digits for a stronger result.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="admin-reset-confirm" className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Confirm password
              </Label>
              <Input
                id="admin-reset-confirm"
                type={showPw ? "text" : "password"}
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                autoComplete="new-password"
                className="h-10 text-sm"
                data-testid="admin-reset-confirm"
              />
              {confirmPw && confirmPw !== newPw && (
                <p className="text-[10px] text-red-500">Passwords don't match.</p>
              )}
            </div>

            {error && (
              <Alert variant="destructive" className="py-2">
                <AlertDescription className="text-xs">{error}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-10 rounded-lg font-semibold gap-2 text-sm bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-600/20"
              data-testid="admin-reset-submit"
            >
              {submitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-t-transparent border-white rounded-full animate-spin" />
                  Updating…
                </>
              ) : (
                <>
                  Set new password
                  <ArrowRight className="w-3.5 h-3.5 opacity-80" />
                </>
              )}
            </Button>

            <button
              type="button"
              onClick={() => setLocation("/admin")}
              className={cn(
                "w-full text-[11px] font-medium flex items-center justify-center gap-1 transition-colors",
                darkMode ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-900",
              )}
            >
              <ArrowLeft className="w-3 h-3" />
              Back to sign in
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
