import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, CheckCircle2, AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import { useDarkMode } from "@/contexts/DarkModeContext";
import { cn } from "@/lib/utils";

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const { darkMode } = useDarkMode();
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const t = p.get("token");
    if (t) {
      setToken(t);
    } else {
      setError("Virheellinen palautuslinkki");
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (newPassword.length < 8) {
      setError("Salasanan on oltava vähintään 8 merkkiä");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Salasanat eivät täsmää");
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => setLocation("/"), 3000);
      } else {
        setError(data.message || "Salasanan palautus epäonnistui");
      }
    } catch {
      setError("Yhteysvirhe. Yritä uudelleen.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("min-h-screen flex items-center justify-center p-4", darkMode ? "bg-gray-950" : "bg-gray-50")}>
      <div className="w-full max-w-sm">
        {success ? (
          <div className={cn(
            "rounded-2xl border p-8 text-center shadow-xl",
            darkMode ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200",
          )}>
            <div className={cn(
              "mx-auto mb-5 h-14 w-14 rounded-full flex items-center justify-center",
              darkMode ? "bg-emerald-950/50 ring-1 ring-emerald-900/50" : "bg-emerald-50 ring-1 ring-emerald-200",
            )}>
              <CheckCircle2 className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h1 className={cn("text-xl font-bold mb-2", darkMode ? "text-white" : "text-gray-900")}>
              Salasana vaihdettu
            </h1>
            <p className={cn("text-sm mb-3", darkMode ? "text-gray-400" : "text-gray-500")}>
              Salasanasi on vaihdettu onnistuneesti. Sinut ohjataan kirjautumissivulle…
            </p>
            <div className="flex justify-center">
              <div className="h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          </div>
        ) : (
          <div className={cn(
            "rounded-2xl border p-8 shadow-xl",
            darkMode ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200",
          )}>
            <div className="mb-6">
              <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-blue-600 dark:text-blue-400 mb-1">
                KSYK Maps
              </p>
              <h1 className={cn("text-2xl font-bold tracking-tight", darkMode ? "text-white" : "text-gray-900")}>
                Palauta salasana
              </h1>
              <p className={cn("text-sm mt-1.5", darkMode ? "text-gray-400" : "text-gray-500")}>
                Syötä uusi salasanasi.
              </p>
            </div>

            {!token && !error ? null : !token ? (
              <div className={cn(
                "rounded-xl p-4 flex items-start gap-2 text-sm",
                darkMode ? "bg-red-950/40 ring-1 ring-red-900/50 text-red-300" : "bg-red-50 ring-1 ring-red-200 text-red-700",
              )}>
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>Virheellinen palautuslinkki. Pyydä uusi linkki sähköpostiisi.</span>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="new-password" className={cn("text-[11px] font-semibold uppercase tracking-wider mb-2 block", darkMode ? "text-gray-400" : "text-gray-500")}>
                    Uusi salasana
                  </Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Vähintään 8 merkkiä"
                      required
                      disabled={isLoading}
                      autoComplete="new-password"
                      className="h-11 pr-11"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className={cn("absolute right-3 top-1/2 -translate-y-1/2 transition-colors", darkMode ? "text-gray-500 hover:text-gray-300" : "text-gray-400 hover:text-gray-600")}
                      aria-label={showPassword ? "Piilota salasana" : "Näytä salasana"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="confirm-password" className={cn("text-[11px] font-semibold uppercase tracking-wider mb-2 block", darkMode ? "text-gray-400" : "text-gray-500")}>
                    Vahvista salasana
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      type={showConfirm ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Kirjoita salasana uudelleen"
                      required
                      disabled={isLoading}
                      autoComplete="new-password"
                      className="h-11 pr-11"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      className={cn("absolute right-3 top-1/2 -translate-y-1/2 transition-colors", darkMode ? "text-gray-500 hover:text-gray-300" : "text-gray-400 hover:text-gray-600")}
                      aria-label={showConfirm ? "Piilota salasana" : "Näytä salasana"}
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className={cn(
                    "rounded-xl p-3 flex items-start gap-2 text-sm",
                    darkMode ? "bg-red-950/40 ring-1 ring-red-900/50 text-red-300" : "bg-red-50 ring-1 ring-red-200 text-red-700",
                  )}>
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isLoading || !token}
                  className="w-full h-11 rounded-xl font-semibold bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isLoading ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Vaihdetaan…</>
                  ) : (
                    <><Lock className="h-4 w-4 mr-2" /> Vaihda salasana</>
                  )}
                </Button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
