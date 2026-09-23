/**
 * KSYK Maps — Access Lockout (full page).
 *
 * Whole-page minimal layout for blocked visitors. Replaces the prior
 * card-in-the-middle treatment with a proper page: top status ticker,
 * hero "why you're locked out", schedule preview if a time window
 * applies, sign-in CTA, request-access form below the fold.
 *
 * Used by KSYKMapView when the access engine returns tier="blocked".
 * Time-window rules apply to logged-in students too — the check fires
 * before the login-tier check — so after-school hours mean lockout for
 * everyone except admins.
 */

import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Clock, Wifi, Mail, AlertTriangle, Send, ArrowRight, Calendar,
  Shield, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useDarkMode } from "@/contexts/DarkModeContext";
import type { AccessDecision } from "@/lib/accessControl";
import { useSecuritySettings } from "@/hooks/useSecuritySettings";
import { DAY_KEYS, DAY_LABELS, dayKeyForDate } from "@/lib/securitySettings";
import { cn } from "@/lib/utils";

interface Props {
  decision: AccessDecision;
}

const ICON_FOR_REASON: Record<AccessDecision["reasonCode"], typeof Clock> = {
  disabled: Shield,
  "owner-bypass": Shield,
  "user-exception": Shield,
  "granted-by-token": Shield,
  holiday: Calendar,
  "outside-hours": Clock,
  "off-network": Wifi,
  "guest-login-required": Mail,
  "wrong-domain": Mail,
  "logged-in": Shield,
  default: AlertTriangle,
};

export default function AccessLockoutScreen({ decision }: Props) {
  const { darkMode } = useDarkMode();
  const { settings } = useSecuritySettings();
  const { i18n } = useTranslation();
  const { toast } = useToast();
  const isFi = i18n.language === "fi";

  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const Icon = ICON_FOR_REASON[decision.reasonCode] ?? AlertTriangle;
  const today = useMemo(() => dayKeyForDate(new Date()), []);

  const handleMsLogin = () => {
    window.location.href = "/api/auth/microsoft/start";
  };

  const handleRequestAccess = async () => {
    if (!email.trim()) {
      toast({ title: isFi ? "Sähköposti puuttuu" : "Email is required", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const r = await fetch("/api/security-settings/request-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), reason: reason.trim() }),
      });
      if (!r.ok) throw new Error("Request failed");
      setSubmitted(true);
      toast({
        title: isFi ? "Pyyntö lähetetty" : "Request sent",
        description: isFi ? "Saat vastauksen sähköpostiisi." : "We'll email you when it's reviewed.",
      });
    } catch {
      toast({
        title: isFi ? "Lähetys epäonnistui" : "Could not send",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={cn(
      "min-h-screen w-full flex flex-col",
      darkMode ? "bg-gray-950 text-gray-100" : "bg-white text-gray-900",
    )}>
      {/* ── Top status ticker ───────────────────────────────────────── */}
      <header className={cn(
        "shrink-0 px-5 sm:px-10 py-3 flex items-center gap-3 sm:gap-6 text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.28em] border-b",
        darkMode
          ? "border-gray-900 text-gray-400"
          : "border-gray-100 text-gray-500",
      )}>
        <span className="inline-flex items-center gap-2">
          <span className={cn(
            "h-1.5 w-1.5 rounded-full animate-pulse",
            decision.reasonCode === "outside-hours" || decision.reasonCode === "holiday"
              ? "bg-amber-500"
              : "bg-red-500",
          )} />
          {isFi ? "Pääsy rajoitettu" : "Access restricted"}
        </span>
        <span className="ml-auto opacity-50">KSYK Maps</span>
      </header>

      {/* ── Body ────────────────────────────────────────────────────── */}
      {/* v4.7.21 apple-design pass — dropped: redundant "Access restricted"
       *  badge (header already says it), tiny caps "KSYK Maps" label
       *  (also in header). Heading shrunk 3xl/5xl → 2xl/3xl so it sits
       *  where the reader's eye actually lands. Logo trimmed 80px → 56px
       *  and given proper alt="" since decorative here. */}
      <main className="flex-1 flex flex-col items-center justify-center px-5 sm:px-10 py-12">
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center text-center mb-10">
            <img
              src="/favicon-128.png"
              alt=""
              width={56}
              height={56}
              className="h-14 w-14 object-contain mb-6 opacity-90"
            />

            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight leading-tight">
              {isFi ? "Suljettu juuri nyt" : "Closed right now"}
            </h1>

            <p className={cn(
              "mt-4 max-w-md text-sm sm:text-base leading-relaxed",
              darkMode ? "text-gray-400" : "text-gray-500",
            )}>
              {isFi
                ? decision.reasonCode === "outside-hours"
                  ? "Sovellus on käytössä vain koulupäivinä ja kouluaikana."
                  : decision.reasonCode === "holiday"
                  ? "Tänään on loma tai vapaapäivä."
                  : decision.reasonCode === "off-network"
                  ? "Olet koulun verkon ulkopuolella."
                  : decision.reasonCode === "guest-login-required"
                  ? "Kirjaudu sisään @ksyk.fi-tunnuksella täyden pääsyn saamiseksi."
                  : decision.reason
                : decision.reason}
            </p>

            {decision.nextOpen && (
              <div className={cn(
                "mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold",
                darkMode ? "bg-gray-900 text-gray-200 ring-1 ring-gray-800" : "bg-gray-100 text-gray-800 ring-1 ring-gray-200",
              )}>
                <Clock className="h-3.5 w-3.5 opacity-70" />
                {isFi ? "Avoinna" : "Opens"} {decision.nextOpen[isFi ? "fi" : "en"]}
              </div>
            )}
          </div>

          {/* Schedule preview — only when a time window is active */}
          {settings.timeWindowEnabled && (
            <div className={cn(
              "mb-12 rounded-2xl border overflow-hidden",
              darkMode ? "border-gray-900" : "border-gray-200",
            )}>
              <div className={cn(
                "px-4 py-2.5 flex items-center justify-between border-b",
                darkMode ? "bg-gray-900 border-gray-800" : "bg-gray-50 border-gray-200",
              )}>
                <p className="text-[10px] font-bold tracking-[0.28em] uppercase text-gray-500">
                  {isFi ? "Aukioloajat" : "Opening hours"}
                </p>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-900">
                {DAY_KEYS.map((d) => {
                  const win = settings.schedule[d];
                  const isToday = today === d;
                  return (
                    <div
                      key={d}
                      className={cn(
                        "flex items-center px-4 py-2.5 text-sm",
                        isToday && (darkMode ? "bg-gray-900/60" : "bg-amber-50/60"),
                      )}
                    >
                      <span className={cn(
                        "w-12 text-xs font-bold uppercase tracking-wider",
                        isToday
                          ? (darkMode ? "text-amber-400" : "text-amber-600")
                          : (darkMode ? "text-gray-400" : "text-gray-500"),
                      )}>
                        {DAY_LABELS[d]}
                      </span>
                      <span className={cn(
                        "flex-1 font-medium",
                        darkMode ? "text-gray-200" : "text-gray-900",
                      )}>
                        {win
                          ? `${win.open} – ${win.close}`
                          : (isFi ? "Suljettu" : "Closed")}
                      </span>
                      {isToday && (
                        <span className={cn(
                          "text-[10px] font-bold uppercase tracking-wider",
                          darkMode ? "text-amber-400" : "text-amber-700",
                        )}>
                          {isFi ? "Tänään" : "Today"}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sign-in CTAs */}
          {settings.loginGateEnabled && (
            <div className="space-y-3 mb-12">
              <div className="text-center">
                <p className="text-[10px] font-bold tracking-[0.32em] uppercase text-gray-400 mb-2">
                  {isFi ? "Tai" : "Or"}
                </p>
              </div>
              <button
                type="button"
                onClick={handleMsLogin}
                className={cn(
                  "w-full h-11 rounded-xl text-sm font-semibold flex items-center gap-2.5 px-4 transition-all duration-150",
                  "bg-blue-600 text-white shadow-sm shadow-blue-600/25",
                  "hover:bg-blue-700 hover:shadow-md hover:shadow-blue-700/30 hover:-translate-y-px",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
                  darkMode ? "focus-visible:ring-offset-gray-950" : "focus-visible:ring-offset-white",
                  "active:translate-y-0 active:shadow-sm active:scale-[0.98]",
                )}
              >
                <MicrosoftLogo />
                <span className="flex-1 text-left">
                  {isFi ? "Kirjaudu Microsoftilla" : "Sign in with Microsoft"}
                </span>
                <ArrowRight className="h-4 w-4 opacity-80" />
              </button>
            </div>
          )}

          {/* Custom lockout message from admin */}
          {settings.lockoutMessage && (
            <p className={cn(
              "max-w-md mx-auto text-center text-sm leading-relaxed mb-12",
              darkMode ? "text-gray-400" : "text-gray-600",
            )}>
              {settings.lockoutMessage}
            </p>
          )}

          {/* Divider */}
          <div className={cn(
            "h-px max-w-md mx-auto mb-10",
            darkMode ? "bg-gray-900" : "bg-gray-200",
          )} />

          {/* Request access */}
          {!submitted ? (
            <div className="max-w-md mx-auto space-y-3">
              <div className="text-center">
                <p className="text-[10px] font-bold tracking-[0.32em] uppercase text-gray-400 mb-1">
                  {isFi ? "Tarvitsetko pääsyn?" : "Need access?"}
                </p>
                <h3 className="text-base font-semibold tracking-tight">
                  {isFi ? "Pyydä admineja" : "Ask the admins"}
                </h3>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ra-email" className="sr-only">Email</Label>
                <Input
                  id="ra-email"
                  type="email"
                  placeholder={isFi ? "Sähköpostisi" : "Your email"}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={cn(
                    "h-10 rounded-lg text-sm",
                    darkMode
                      ? "bg-gray-900 border-gray-800 text-white"
                      : "bg-white border-gray-300 text-gray-900",
                  )}
                />
                <Input
                  id="ra-reason"
                  type="text"
                  placeholder={isFi ? "Syy (valinnainen)" : "Reason (optional)"}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className={cn(
                    "h-10 rounded-lg text-sm",
                    darkMode
                      ? "bg-gray-900 border-gray-800 text-white"
                      : "bg-white border-gray-300 text-gray-900",
                  )}
                />
                <button
                  type="button"
                  onClick={handleRequestAccess}
                  disabled={submitting || !email.trim()}
                  className={cn(
                    "w-full h-11 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-150",
                    // Base — solid primary blue with real depth so the CTA reads
                    "bg-blue-600 text-white shadow-sm shadow-blue-600/25",
                    // Hover — lift + darker fill (only when enabled)
                    "hover:enabled:bg-blue-700 hover:enabled:shadow-md hover:enabled:shadow-blue-700/30 hover:enabled:-translate-y-px",
                    // Focus ring — visible for keyboard users
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
                    darkMode ? "focus-visible:ring-offset-gray-950" : "focus-visible:ring-offset-white",
                    // Active — press it back down
                    "active:enabled:translate-y-0 active:enabled:shadow-sm active:enabled:scale-[0.98]",
                    // Disabled — clearly non-interactive
                    "disabled:opacity-45 disabled:cursor-not-allowed disabled:shadow-none",
                  )}
                >
                  <Send className={cn("h-3.5 w-3.5", submitting && "animate-pulse")} />
                  {submitting
                    ? (isFi ? "Lähetetään…" : "Sending…")
                    : (isFi ? "Lähetä pyyntö" : "Send request")}
                </button>
              </div>
            </div>
          ) : (
            <div className={cn(
              "max-w-md mx-auto rounded-2xl border p-5 text-center",
              darkMode
                ? "border-emerald-900/50 bg-emerald-950/30"
                : "border-emerald-200 bg-emerald-50/70",
            )}>
              <div className={cn(
                "inline-flex items-center justify-center h-10 w-10 rounded-full mb-3",
                darkMode ? "bg-emerald-900/50 text-emerald-300" : "bg-emerald-100 text-emerald-700",
              )}>
                <Send className="h-5 w-5" strokeWidth={2.25} />
              </div>
              <p className={cn(
                "text-sm font-semibold mb-1",
                darkMode ? "text-emerald-200" : "text-emerald-800",
              )}>
                {isFi ? "Pyyntö lähetetty" : "Request sent"}
              </p>
              <p className={cn(
                "text-xs",
                darkMode ? "text-emerald-400/80" : "text-emerald-700/80",
              )}>
                {isFi
                  ? "Sähköpostiisi tulee vastaus kun admin on hyväksynyt tai hylännyt pyynnön."
                  : "You'll get an email when an admin approves or denies your request."}
              </p>
            </div>
          )}
        </div>
      </main>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer className={cn(
        "shrink-0 border-t px-5 sm:px-10 py-4 flex items-center justify-between text-[11px]",
        darkMode ? "border-gray-900 text-gray-500" : "border-gray-100 text-gray-400",
      )}>
        <span>© KSYK Maps</span>
        <a
          href="/admin"
          className={cn(
            "inline-flex items-center gap-1 transition-colors",
            darkMode ? "hover:text-white" : "hover:text-gray-900",
          )}
        >
          {isFi ? "Admin kirjautuminen" : "Admin sign-in"}
          <ExternalLink className="h-3 w-3" />
        </a>
      </footer>
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
