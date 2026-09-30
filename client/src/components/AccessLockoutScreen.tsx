/**
 * KSYK Maps — Access Lockout (full page).  v4.7.54 Wilma document
 * rewrite — same shell as FAQ / Privacy / AdminLogin / StudentLoginGate:
 * hairline top bar → uppercase masthead → big navy H1 → hairline
 * sections → primary CTA → hairline footer.  No animated pulse dot,
 * no rounded-full pills, no ring-* boxes.
 */

import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Clock, Wifi, Mail, AlertTriangle, Send, ArrowRight, Calendar,
  Shield, ExternalLink, ArrowLeft,
} from "lucide-react";
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
      darkMode ? "bg-gray-950 text-gray-100" : "bg-gray-50 text-gray-900",
    )}
    style={{
      paddingTop: "env(safe-area-inset-top, 0px)",
      paddingBottom: "env(safe-area-inset-bottom, 0px)",
    }}>
      {/* ── Document header — matches every other Wilma page ────────── */}
      <header className="border-b border-[#d5dae0] dark:border-[#2a3040] shrink-0 bg-white dark:bg-gray-950">
        <div className="max-w-2xl mx-auto px-4 h-12 flex items-center justify-between">
          <a
            href="/"
            className="inline-flex items-center gap-1.5 h-9 -ml-2 px-2 rounded-[6px] text-[13px] font-semibold text-gray-700 dark:text-gray-300 hover:text-[#003d82] dark:hover:text-[#4a90d9] hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2.25} />
            {isFi ? "Kartta" : "Map"}
          </a>
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-[0.08em] uppercase text-red-700 dark:text-red-400">
            <span className="h-1.5 w-1.5 rounded-[1px] bg-red-600 dark:bg-red-400" />
            {isFi ? "Rajoitettu" : "Restricted"}
          </span>
        </div>
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 sm:px-5 py-6 sm:py-8">
        {/* Document title block */}
        <div className="mb-6 pb-4 border-b border-[#d5dae0] dark:border-[#2a3040]">
          <p className="text-[10px] font-bold tracking-[0.08em] uppercase text-red-700 dark:text-red-400 mb-1 flex items-center gap-1.5">
            <Icon className="h-3 w-3" strokeWidth={2.5} />
            {isFi ? "Pääsy rajoitettu" : "Access restricted"}
          </p>
          <h1 className="text-[24px] sm:text-[28px] font-bold tracking-tight leading-[1.1] text-gray-900 dark:text-white">
            {isFi
              ? decision.reasonCode === "outside-hours" ? "Suljettu juuri nyt"
              : decision.reasonCode === "holiday" ? "Loma tai vapaapäivä"
              : decision.reasonCode === "off-network" ? "Kouluverkon ulkopuolella"
              : decision.reasonCode === "guest-login-required" ? "Kirjautuminen vaaditaan"
              : "Pääsy estetty"
              : decision.reasonCode === "outside-hours" ? "Closed right now"
              : decision.reasonCode === "holiday" ? "School holiday"
              : decision.reasonCode === "off-network" ? "Off the school network"
              : decision.reasonCode === "guest-login-required" ? "Sign in to continue"
              : "Access blocked"}
          </h1>
          <p className="text-[14px] leading-[1.6] mt-2 text-gray-600 dark:text-gray-400 max-w-xl">
            {isFi
              ? decision.reasonCode === "outside-hours" ? "Sovellus on käytössä vain koulupäivinä ja kouluaikana."
              : decision.reasonCode === "holiday" ? "Tänään on loma tai vapaapäivä."
              : decision.reasonCode === "off-network" ? "Olet koulun verkon ulkopuolella. Yhdistä kouluverkkoon nähdäksesi kartan."
              : decision.reasonCode === "guest-login-required" ? "Kirjaudu sisään @ksyk.fi-tunnuksella täyden pääsyn saamiseksi."
              : decision.reason
              : decision.reason}
          </p>
          {decision.nextOpen && (
            <div className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-bold px-2.5 py-1 rounded-[4px] border border-[#d5dae0] dark:border-[#2a3040] bg-white dark:bg-gray-950 text-gray-700 dark:text-gray-300">
              <Clock className="h-3.5 w-3.5 text-[#003d82] dark:text-[#4a90d9]" strokeWidth={2.25} />
              {isFi ? "Avoinna" : "Opens"} {decision.nextOpen[isFi ? "fi" : "en"]}
            </div>
          )}
        </div>

        {/* Schedule preview */}
        {settings.timeWindowEnabled && (
          <section className="mb-6">
            <p className="text-[10px] font-bold tracking-[0.08em] uppercase text-gray-500 dark:text-gray-400 mb-2">
              {isFi ? "Aukioloajat" : "Opening hours"}
            </p>
            <div className="border border-[#d5dae0] dark:border-[#2a3040] rounded-[6px] bg-white dark:bg-gray-950 divide-y divide-[#d5dae0] dark:divide-[#2a3040] overflow-hidden">
              {DAY_KEYS.map((d) => {
                const win = settings.schedule[d];
                const isToday = today === d;
                return (
                  <div
                    key={d}
                    className={cn(
                      "flex items-center px-4 py-2.5 text-[13px]",
                      isToday && "bg-[#e6ecf3] dark:bg-[#4a90d9]/10",
                    )}
                  >
                    <span className={cn(
                      "w-14 text-[10px] font-bold uppercase tracking-[0.06em]",
                      isToday
                        ? "text-[#003d82] dark:text-[#4a90d9]"
                        : "text-gray-500 dark:text-gray-400",
                    )}>
                      {DAY_LABELS[d]}
                    </span>
                    <span className={cn(
                      "flex-1 font-semibold tabular-nums",
                      darkMode ? "text-gray-200" : "text-gray-900",
                    )}>
                      {win
                        ? `${win.open} – ${win.close}`
                        : (isFi ? "Suljettu" : "Closed")}
                    </span>
                    {isToday && (
                      <span className="text-[10px] font-bold uppercase tracking-[0.06em] text-[#003d82] dark:text-[#4a90d9]">
                        {isFi ? "Tänään" : "Today"}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Sign-in CTA */}
        {settings.loginGateEnabled && (
          <section className="mb-6">
            <p className="text-[10px] font-bold tracking-[0.08em] uppercase text-gray-500 dark:text-gray-400 mb-2">
              {isFi ? "Kirjaudu sisään" : "Sign in"}
            </p>
            <button
              type="button"
              onClick={handleMsLogin}
              className="w-full h-11 rounded-[6px] bg-[#003d82] hover:bg-[#002d5f] text-white text-[14px] font-bold inline-flex items-center gap-2.5 px-4 transition-colors"
            >
              <MicrosoftLogo />
              <span className="flex-1 text-left">
                {isFi ? "Kirjaudu Microsoftilla" : "Sign in with Microsoft"}
              </span>
              <ArrowRight className="h-4 w-4 opacity-80" strokeWidth={2.25} />
            </button>
          </section>
        )}

        {/* Custom lockout message */}
        {settings.lockoutMessage && (
          <div className="mb-6 rounded-[6px] border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30 p-4 text-[13px] text-amber-900 dark:text-amber-200 leading-relaxed">
            {settings.lockoutMessage}
          </div>
        )}

        {/* Request access */}
        <section>
          {!submitted ? (
            <>
              <p className="text-[10px] font-bold tracking-[0.08em] uppercase text-gray-500 dark:text-gray-400 mb-2">
                {isFi ? "Tarvitsetko pääsyn?" : "Need access?"}
              </p>
              <div className="border border-[#d5dae0] dark:border-[#2a3040] rounded-[6px] bg-white dark:bg-gray-950 overflow-hidden">
                <div className="p-4 space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="ra-email" className="text-[11px] font-bold uppercase tracking-[0.06em] text-gray-500 dark:text-gray-400">
                      {isFi ? "Sähköposti" : "Email"}
                    </Label>
                    <Input
                      id="ra-email"
                      type="email"
                      placeholder={isFi ? "sinun@sahkoposti.fi" : "you@example.com"}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-10 rounded-[6px] text-[14px] border-[#d5dae0] dark:border-[#2a3040]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ra-reason" className="text-[11px] font-bold uppercase tracking-[0.06em] text-gray-500 dark:text-gray-400">
                      {isFi ? "Syy (valinnainen)" : "Reason (optional)"}
                    </Label>
                    <Input
                      id="ra-reason"
                      type="text"
                      placeholder={isFi ? "Miksi tarvitset pääsyn" : "Why you need access"}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="h-10 rounded-[6px] text-[14px] border-[#d5dae0] dark:border-[#2a3040]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleRequestAccess}
                    disabled={submitting || !email.trim()}
                    className="w-full h-10 rounded-[6px] bg-[#003d82] hover:bg-[#002d5f] disabled:opacity-40 disabled:cursor-not-allowed text-white text-[13px] font-bold inline-flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Send className={cn("h-4 w-4", submitting && "animate-pulse")} strokeWidth={2} />
                    {submitting
                      ? (isFi ? "Lähetetään…" : "Sending…")
                      : (isFi ? "Lähetä pyyntö" : "Send request")}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-[6px] border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/30 p-5 flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[4px] bg-emerald-600 dark:bg-emerald-500 text-white">
                <Send className="h-4 w-4" strokeWidth={2.25} />
              </span>
              <div className="min-w-0">
                <p className="text-[14px] font-bold text-emerald-900 dark:text-emerald-100">
                  {isFi ? "Pyyntö lähetetty" : "Request sent"}
                </p>
                <p className="text-[12px] text-emerald-800 dark:text-emerald-200/80 mt-1 leading-relaxed">
                  {isFi
                    ? "Sähköpostiisi tulee vastaus kun admin on hyväksynyt tai hylännyt pyynnön."
                    : "You'll get an email when an admin approves or denies your request."}
                </p>
              </div>
            </div>
          )}
        </section>

        {/* Footer meta */}
        <div className="mt-10 pt-4 border-t border-[#d5dae0] dark:border-[#2a3040] flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-500">
          <span>© KSYK Maps</span>
          <a
            href="/admin"
            className="inline-flex items-center gap-1 text-[#003d82] dark:text-[#4a90d9] hover:underline underline-offset-2 font-semibold"
          >
            {isFi ? "Admin" : "Admin"}
            <ExternalLink className="h-3 w-3" strokeWidth={2.25} />
          </a>
        </div>
      </main>
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
