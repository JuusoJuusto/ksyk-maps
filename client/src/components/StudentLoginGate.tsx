/**
 * Student login gate — first-visit modal on the main map.
 *
 * Two-step minimal flow:
 *   step 1: choose sign-in OR continue as guest
 *   step 2 (sign-in path): email + display name → creates a real session
 *
 * The session gets stored as `ksyk_user` and the access engine reads
 * the email to evaluate the loggedInTier vs guestTier rules. So if the
 * admin restricts access to "@ksyk.fi" only, a student signing in with
 * their school email lands on full access; anyone else gets the guest
 * tier (or the lockout screen depending on the rules).
 */

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDarkMode } from "@/contexts/DarkModeContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

const SEEN_KEY = "ksyk_intro_seen_v2";
const USER_KEY = "ksyk_user";

type Step = "choice" | "signin";

export default function StudentLoginGate() {
  const { darkMode } = useDarkMode();
  const { i18n } = useTranslation();
  const isFi = i18n.language === "fi";
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("choice");

  // sign-in form state
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [klass, setKlass] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const seen = localStorage.getItem(SEEN_KEY) === "true";
      const hasUser = !!(localStorage.getItem(USER_KEY) || localStorage.getItem("ksyk_admin_user"));
      if (!seen && !hasUser) setOpen(true);
    } catch {
      setOpen(true);
    }
  }, []);

  const dismiss = () => {
    try { localStorage.setItem(SEEN_KEY, "true"); } catch { /* */ }
    setOpen(false);
    setStep("choice");
  };

  const continueAsGuest = () => {
    try {
      localStorage.setItem(USER_KEY, JSON.stringify({
        id: `guest-${Date.now()}`,
        email: null,
        role: "guest",
        provider: "guest",
      }));
    } catch { /* */ }
    dismiss();
  };

  const signInWithMicrosoft = () => {
    // Saves the seen flag too so the modal doesn't reappear after redirect.
    try { localStorage.setItem(SEEN_KEY, "true"); } catch { /* */ }
    window.location.href = "/api/auth/microsoft/start";
  };

  const handleStudentSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) {
      setError(isFi ? "Anna kelvollinen sähköposti" : "Enter a valid email address");
      return;
    }
    if (!name.trim()) {
      setError(isFi ? "Anna nimesi" : "Enter your name");
      return;
    }

    setSubmitting(true);
    try {
      const user = {
        id: `student-${Date.now()}`,
        email: trimmed,
        name: name.trim(),
        klass: klass.trim() || null,
        role: "student",
        provider: "student-form",
        signedInAt: new Date().toISOString(),
      };
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      // Best-effort tell the server so the admin user-exceptions / logs
      // tables see this account exists. Failure is non-fatal.
      fetch("/api/analytics/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          events: [{
            type: "student_signin",
            ts: new Date().toISOString(),
            payload: { email: trimmed, name: user.name, klass: user.klass },
          }],
          sessionInfo: { sessionId: user.id, userId: user.id, email: trimmed },
        }),
      }).catch(() => { /* silent */ });
      dismiss();
    } catch {
      setError(isFi ? "Tallennus epäonnistui" : "Could not save session");
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-8 animate-in fade-in duration-200"
    >
      {/* Calm backdrop */}
      <div className={cn(
        "absolute inset-0",
        darkMode ? "bg-black/70 backdrop-blur-sm" : "bg-white/85 backdrop-blur-sm",
      )} />

      <div
        className={cn(
          "relative w-full max-w-sm rounded-2xl shadow-xl border animate-in slide-in-from-bottom-2 duration-200 overflow-hidden",
          darkMode
            ? "bg-gray-950 border-gray-800 text-gray-100"
            : "bg-white border-gray-200 text-gray-900",
        )}
      >
        {/* Close */}
        <button
          type="button"
          onClick={dismiss}
          aria-label="Close"
          className={cn(
            "absolute top-3 right-3 z-10 h-8 w-8 flex items-center justify-center rounded-full transition-colors",
            darkMode ? "text-gray-500 hover:text-white hover:bg-white/10" : "text-gray-400 hover:text-gray-900 hover:bg-gray-100",
          )}
        >
          <X className="h-4 w-4" />
        </button>

        {step === "choice" && (
          <div className="px-8 pt-9 pb-8 space-y-7">
            <div className="flex flex-col items-center text-center space-y-1">
              <p className={cn(
                "text-[10px] font-bold tracking-[0.42em] uppercase",
                darkMode ? "text-gray-500" : "text-gray-400",
              )}>
                KSYK · Maps
              </p>
              <h2 className="text-xl font-semibold tracking-tight">
                {isFi ? "Tervetuloa" : "Welcome"}
              </h2>
              <p className={cn("text-sm leading-relaxed pt-1", darkMode ? "text-gray-400" : "text-gray-500")}>
                {isFi ? "Kirjaudu tai jatka vieraana." : "Sign in, or continue as a guest."}
              </p>
            </div>

            <div className={cn("h-px", darkMode ? "bg-gray-800" : "bg-gray-200")} />

            <div className="space-y-2.5">
              <Button
                type="button"
                onClick={() => setStep("signin")}
                className={cn(
                  "w-full h-11 font-semibold rounded-xl gap-2 text-sm justify-between",
                  darkMode
                    ? "bg-white text-gray-900 hover:bg-gray-100"
                    : "bg-gray-900 text-white hover:bg-gray-800",
                )}
              >
                <span>{isFi ? "Kirjaudu opiskelijana" : "Sign in as student"}</span>
                <ArrowRight className="h-4 w-4 opacity-70" />
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={signInWithMicrosoft}
                className={cn(
                  "w-full h-11 font-medium rounded-xl gap-2 text-sm",
                  darkMode
                    ? "bg-transparent border-gray-800 text-gray-200 hover:bg-white/5"
                    : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50",
                )}
              >
                <MicrosoftLogo />
                {isFi ? "Microsoft (@ksyk.fi)" : "Microsoft (@ksyk.fi)"}
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={continueAsGuest}
                className={cn(
                  "w-full h-10 font-medium rounded-xl text-sm",
                  darkMode ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-900",
                )}
              >
                {isFi ? "Jatka vieraana" : "Continue as guest"}
              </Button>
            </div>

            <p className={cn(
              "text-[11px] text-center leading-relaxed",
              darkMode ? "text-gray-500" : "text-gray-400",
            )}>
              {isFi
                ? "Vieraskäyttäjillä on rajoitettu pääsy 3D-näkymään ja lukujärjestyksiin."
                : "Guests have limited access to 3D view and schedules."}
            </p>
          </div>
        )}

        {step === "signin" && (
          <form onSubmit={handleStudentSignIn} className="px-8 pt-9 pb-8 space-y-6">
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => { setStep("choice"); setError(null); }}
                className={cn(
                  "inline-flex items-center gap-1 text-[11px] font-medium mb-2",
                  darkMode ? "text-gray-500 hover:text-gray-300" : "text-gray-500 hover:text-gray-900",
                )}
              >
                <ArrowLeft className="h-3 w-3" />
                {isFi ? "Takaisin" : "Back"}
              </button>
              <h2 className="text-xl font-semibold tracking-tight">
                {isFi ? "Opiskelijan kirjautuminen" : "Student sign-in"}
              </h2>
              <p className={cn("text-xs", darkMode ? "text-gray-400" : "text-gray-500")}>
                {isFi
                  ? "Anna koulun sähköposti ja nimi."
                  : "Enter your school email and name."}
              </p>
            </div>

            {error && (
              <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-xs text-red-700 dark:text-red-300">
                {error}
              </div>
            )}

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="ks-email" className={cn(
                  "text-xs font-medium",
                  darkMode ? "text-gray-300" : "text-gray-700",
                )}>
                  {isFi ? "Sähköposti" : "Email"}
                </Label>
                <Input
                  id="ks-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="etunimi.sukunimi@ksyk.fi"
                  required
                  autoFocus
                  autoComplete="email"
                  className={cn(
                    "h-10 rounded-lg text-sm",
                    darkMode
                      ? "bg-gray-900 border-gray-800 text-white"
                      : "bg-white border-gray-300 text-gray-900",
                  )}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ks-name" className={cn(
                  "text-xs font-medium",
                  darkMode ? "text-gray-300" : "text-gray-700",
                )}>
                  {isFi ? "Nimi" : "Name"}
                </Label>
                <Input
                  id="ks-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={isFi ? "Etunimi Sukunimi" : "First Last"}
                  required
                  autoComplete="name"
                  className={cn(
                    "h-10 rounded-lg text-sm",
                    darkMode
                      ? "bg-gray-900 border-gray-800 text-white"
                      : "bg-white border-gray-300 text-gray-900",
                  )}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ks-class" className={cn(
                  "text-xs font-medium flex items-center justify-between",
                  darkMode ? "text-gray-300" : "text-gray-700",
                )}>
                  <span>{isFi ? "Luokka" : "Class"}</span>
                  <span className={cn(
                    "text-[10px] font-normal",
                    darkMode ? "text-gray-500" : "text-gray-400",
                  )}>
                    {isFi ? "valinnainen" : "optional"}
                  </span>
                </Label>
                <Input
                  id="ks-class"
                  type="text"
                  value={klass}
                  onChange={(e) => setKlass(e.target.value)}
                  placeholder="7A · 9C · LU2"
                  className={cn(
                    "h-10 rounded-lg text-sm",
                    darkMode
                      ? "bg-gray-900 border-gray-800 text-white"
                      : "bg-white border-gray-300 text-gray-900",
                  )}
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className={cn(
                "w-full h-10 font-semibold rounded-lg gap-2 text-sm",
                darkMode
                  ? "bg-white hover:bg-gray-100 text-gray-900"
                  : "bg-gray-900 hover:bg-gray-800 text-white",
              )}
            >
              {submitting
                ? (isFi ? "Tallennetaan…" : "Saving…")
                : (isFi ? "Kirjaudu kartalle" : "Continue to map")}
              <ArrowRight className="h-3.5 w-3.5 opacity-70" />
            </Button>

            <p className={cn(
              "text-[11px] text-center leading-relaxed",
              darkMode ? "text-gray-500" : "text-gray-400",
            )}>
              {isFi
                ? "Sähköposti määrää käyttöoikeustason koulun sääntöjen mukaan."
                : "Your email determines the access level set by school rules."}
            </p>
          </form>
        )}
      </div>
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
