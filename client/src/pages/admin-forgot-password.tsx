/**
 * KSYK Admin — Forgot Password.
 *
 * Reached from the "Forgot password?" link on the admin login screen.
 * POSTs to /api/auth/forgot-password with the entered email. The server
 * always returns success (avoid user-enumeration leaks) — actual reset
 * link goes out by email if the address matches an admin account.
 *
 * Matches the AdminLogin visual language (KSYK dark blue accent,
 * minimal glassy card) rather than the Wilma-style /forgot-password
 * page.
 */
import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, ArrowRight, CheckCircle2, Lock, Mail } from "lucide-react";
import { useDarkMode } from "@/contexts/DarkModeContext";
import { cn } from "@/lib/utils";

export default function AdminForgotPassword() {
  const [, setLocation] = useLocation();
  const { darkMode } = useDarkMode();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim()) {
      setError("Enter your admin email.");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          // Tells the server to emit an /admin/reset-password link in
          // the email instead of the default /wilma/reset-password.
          resetPath: "/admin/reset-password",
        }),
      });
      // Success is UI-only: the server returns success even for unknown
      // emails to avoid enumeration. Show the "email sent" screen
      // regardless so the UX matches the security model.
      if (res.ok || res.status === 200) {
        setSent(true);
      } else {
        const body = await res.json().catch(() => ({}));
        setError(body?.message || "Request failed. Try again.");
      }
    } catch {
      setError("Network error. Check your connection.");
    } finally {
      setIsSubmitting(false);
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
        {/* Header */}
        <div className="flex items-center gap-2.5 mb-6">
          <Lock className="h-[18px] w-[18px] text-gray-400" strokeWidth={1.75} />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-400 dark:text-gray-500">
              KSYK Admin
            </p>
            <h1 className={cn("text-[17px] font-semibold tracking-tight leading-none mt-0.5", darkMode ? "text-white" : "text-gray-900")}>
              Reset password
            </h1>
          </div>
        </div>

        {sent ? (
          <>
            <div className={cn("rounded-xl p-4 mb-4 border-2 flex items-start gap-3", "border-emerald-500/40 bg-emerald-500/5")}>
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className={cn("font-semibold text-sm", darkMode ? "text-emerald-300" : "text-emerald-800")}>
                  Check your email
                </p>
                <p className={cn("text-xs mt-1", darkMode ? "text-emerald-300/70" : "text-emerald-700/80")}>
                  If <span className="font-mono">{email}</span> matches an admin account, we sent a link. It's valid for 1 hour.
                </p>
              </div>
            </div>
            <Button
              type="button"
              onClick={() => setLocation("/admin")}
              className="w-full h-10 rounded-lg font-semibold gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to sign in
            </Button>
          </>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <p className={cn("text-xs", darkMode ? "text-gray-400" : "text-gray-500")}>
              Enter the email tied to your KSYK admin account. We'll send a link that lets you set a new password.
            </p>

            <div className="space-y-1.5">
              <Label htmlFor="admin-forgot-email" className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  id="admin-forgot-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@ksyk.fi"
                  className="pl-8 h-10 text-sm"
                  data-testid="admin-forgot-email"
                />
              </div>
            </div>

            {error && (
              <Alert variant="destructive" className="py-2">
                <AlertDescription className="text-xs">{error}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-10 rounded-lg font-semibold gap-2 text-sm bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-600/20"
              data-testid="admin-forgot-submit"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-t-transparent border-white rounded-full animate-spin" />
                  Sending…
                </>
              ) : (
                <>
                  Send reset link
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
