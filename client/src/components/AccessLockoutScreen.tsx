import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Shield, Clock, Wifi, Mail, AlertTriangle, Send, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useDarkMode } from "@/contexts/DarkModeContext";
import type { AccessDecision } from "@/lib/accessControl";
import { useSecuritySettings } from "@/hooks/useSecuritySettings";
import { cn } from "@/lib/utils";

interface Props {
  decision: AccessDecision;
}

const ICON_FOR_REASON: Record<AccessDecision["reasonCode"], typeof Clock> = {
  disabled: Shield,
  "owner-bypass": Shield,
  "user-exception": Shield,
  holiday: Clock,
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

  const handleMsLogin = () => {
    // Routes to the Microsoft OAuth handler — server picks up the tenant.
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
        description: isFi ? "Yritä uudelleen." : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={cn(
        "min-h-[100dvh] flex items-center justify-center p-4",
        darkMode
          ? "bg-gradient-to-br from-gray-950 via-slate-900 to-gray-900"
          : "bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50",
      )}
    >
      <Card
        className={cn(
          "w-full max-w-md shadow-2xl border-0 backdrop-blur-md",
          darkMode ? "bg-gray-900/95" : "bg-white/95",
        )}
      >
        <CardContent className="p-8 text-center">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30">
            <Icon className="h-10 w-10 text-white" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isFi ? "Pääsy rajoitettu" : "Access restricted"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {decision.reason}
          </p>

          {decision.nextOpen && (
            <p className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-300 text-xs font-semibold">
              <Clock className="h-3.5 w-3.5" />
              {isFi ? "Avoinna" : "Opens"} {decision.nextOpen}
            </p>
          )}

          <p className="mt-6 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            {settings.lockoutMessage}
          </p>

          <div className="mt-7 space-y-2.5">
            {settings.loginGateEnabled && (
              <Button
                onClick={handleMsLogin}
                className="w-full h-11 bg-[#2F2F2F] hover:bg-black text-white font-semibold rounded-xl gap-2"
              >
                <MicrosoftLogo />
                {isFi ? "Kirjaudu Microsoftilla" : "Sign in with Microsoft"}
                <ArrowRight className="h-4 w-4 ml-auto" />
              </Button>
            )}

            {!submitted ? (
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-800 space-y-2 text-left">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">
                  {isFi ? "Pyydä pääsyä" : "Request access"}
                </p>
                <Input
                  type="email"
                  placeholder={isFi ? "Sähköpostisi" : "Your email"}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-10 rounded-xl"
                />
                <Input
                  type="text"
                  placeholder={isFi ? "Syy (valinnainen)" : "Reason (optional)"}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="h-10 rounded-xl"
                />
                <Button
                  onClick={handleRequestAccess}
                  disabled={submitting}
                  variant="outline"
                  className="w-full h-10 rounded-xl gap-2"
                >
                  <Send className="h-4 w-4" />
                  {submitting
                    ? isFi ? "Lähetetään…" : "Sending…"
                    : isFi ? "Lähetä pyyntö" : "Send request"}
                </Button>
              </div>
            ) : (
              <p className="mt-3 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                ✓ {isFi ? "Pyyntö lähetetty admin-paneeliin." : "Request sent to the admin panel."}
              </p>
            )}
          </div>

          <p className="mt-6 text-[11px] text-gray-400 dark:text-gray-500">
            KSYK Maps · {isFi ? "Suojattu pääsy" : "Protected access"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function MicrosoftLogo() {
  return (
    <svg width="16" height="16" viewBox="0 0 23 23" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="1" y="1" width="10" height="10" fill="#F25022" />
      <rect x="12" y="1" width="10" height="10" fill="#7FBA00" />
      <rect x="1" y="12" width="10" height="10" fill="#00A4EF" />
      <rect x="12" y="12" width="10" height="10" fill="#FFB900" />
    </svg>
  );
}
