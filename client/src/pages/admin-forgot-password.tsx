/**
 * KSYK Admin — Forgot Password.  v1.0.2 Wilma polish.
 *
 * Same document shell as FAQ / Privacy / Support / Settings / AdminLogin:
 * hairline top header + uppercase masthead + big navy H1 + hairline
 * sections + navy CTA + sticky footer meta.
 */
import { useState } from "react";
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft, ArrowRight, CheckCircle2, Lock, Mail, AlertCircle,
} from "lucide-react";
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
    if (!email.trim()) { setError("Enter your admin email."); return; }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          resetPath: "/admin/reset-password",
        }),
      });
      if (res.ok || res.status === 200) setSent(true);
      else {
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
    <div className={cn(
      "min-h-screen flex flex-col",
      darkMode ? "bg-gray-950 text-gray-100" : "bg-gray-50 text-gray-900",
    )}
    style={{
      paddingTop: "env(safe-area-inset-top, 0px)",
      paddingBottom: "env(safe-area-inset-bottom, 0px)",
    }}>
      {/* Document header */}
      <header className="border-b border-[#d5dae0] dark:border-[#2a3040] shrink-0 bg-white dark:bg-gray-950">
        <div className="max-w-md mx-auto px-4 h-12 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setLocation("/admin")}
            className="inline-flex items-center gap-1.5 h-9 -ml-2 px-2 rounded-[6px] text-[13px] font-semibold text-gray-700 dark:text-gray-300 hover:text-[#003d82] dark:hover:text-[#4a90d9] hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2.25} />
            Sign in
          </button>
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-[0.08em] uppercase text-gray-500 dark:text-gray-400">
            <Lock className="h-3 w-3" strokeWidth={2.5} />
            Protected
          </span>
        </div>
      </header>

      <main className="flex-1 w-full max-w-md mx-auto px-4 sm:px-5 py-8 sm:py-12 flex flex-col justify-center">
        {/* Title block */}
        <div className="mb-6 pb-4 border-b border-[#d5dae0] dark:border-[#2a3040]">
          <p className="text-[10px] font-bold tracking-[0.08em] uppercase text-[#003d82] dark:text-[#4a90d9] mb-1">
            Admin
          </p>
          <h1 className="text-[24px] sm:text-[28px] font-bold tracking-tight leading-[1.15] text-gray-900 dark:text-white">
            Reset password
          </h1>
          <p className="text-[13px] mt-1.5 text-gray-500 dark:text-gray-400">
            Enter the email tied to your KSYK admin account. We'll send a link to set a new password.
          </p>
        </div>

        {sent ? (
          <div className="space-y-5">
            <div className="rounded-[6px] border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/30 p-4 flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[4px] bg-emerald-600 dark:bg-emerald-500 text-white">
                <CheckCircle2 className="h-4 w-4" strokeWidth={2.25} />
              </span>
              <div className="min-w-0">
                <p className="text-[14px] font-bold text-emerald-900 dark:text-emerald-100">
                  Check your email
                </p>
                <p className="text-[12px] text-emerald-800 dark:text-emerald-200/80 mt-1 leading-relaxed break-words">
                  If <span className="font-mono font-semibold">{email}</span> matches an admin account, we sent a link. It's valid for 1 hour.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setLocation("/admin")}
              className="w-full h-11 rounded-[6px] bg-[#003d82] hover:bg-[#002d5f] text-white text-[14px] font-bold inline-flex items-center justify-center gap-2 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" strokeWidth={2.25} />
              Back to sign in
            </button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-5">
            {error && (
              <div className="rounded-[6px] border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 p-3 flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" strokeWidth={2.25} />
                <p className="text-[13px] font-semibold text-red-800 dark:text-red-200">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="admin-forgot-email" className="text-[11px] font-bold uppercase tracking-[0.06em] text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                <Mail className="h-3 w-3" strokeWidth={2.25} />
                Email
              </Label>
              <Input
                id="admin-forgot-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@ksyk.fi"
                className="h-11 rounded-[6px] text-[15px] border-[#d5dae0] dark:border-[#2a3040] focus-visible:border-[#003d82] focus-visible:ring-2 focus-visible:ring-[#003d82]/20"
                data-testid="admin-forgot-email"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 rounded-[6px] bg-[#003d82] hover:bg-[#002d5f] disabled:opacity-50 disabled:cursor-not-allowed text-white text-[14px] font-bold inline-flex items-center justify-center gap-2 transition-colors"
              data-testid="admin-forgot-submit"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin" />
                  Sending…
                </>
              ) : (
                <>
                  Send reset link
                  <ArrowRight className="w-4 h-4" strokeWidth={2.25} />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setLocation("/admin")}
              className="w-full text-[12px] font-semibold text-gray-500 dark:text-gray-400 hover:text-[#003d82] dark:hover:text-[#4a90d9] inline-flex items-center justify-center gap-1 transition-colors"
            >
              <ArrowLeft className="w-3 h-3" strokeWidth={2.25} />
              Back to sign in
            </button>
          </form>
        )}

        <p className="mt-8 pt-4 border-t border-[#d5dae0] dark:border-[#2a3040] text-[11px] text-center text-gray-500 dark:text-gray-500">
          © {new Date().getFullYear()} KSYK Maps · Admin
        </p>
      </main>
    </div>
  );
}
