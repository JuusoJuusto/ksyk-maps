import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, CheckCircle2, AlertCircle, ArrowLeft, Loader2 } from "lucide-react";
import { useDarkMode } from "@/contexts/DarkModeContext";
import { cn } from "@/lib/utils";

export default function ForgotPassword() {
  const [, setLocation] = useLocation();
  const { darkMode } = useDarkMode();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim()) {
      setError("Syötä sähköpostiosoite");
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      if (res.ok || res.status === 200) {
        setSent(true);
      } else {
        const data = await res.json().catch(() => ({}));
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
        {sent ? (
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
              Sähköposti lähetetty
            </h1>
            <p className={cn("text-sm mb-6", darkMode ? "text-gray-400" : "text-gray-500")}>
              Jos sähköpostiosoite on rekisteröity, lähetimme sinulle linkin salasanan palauttamiseen. Tarkista myös roskapostikansio. Linkki on voimassa 1 tunnin.
            </p>
            <Button
              onClick={() => setLocation("/")}
              variant="outline"
              className="w-full h-11 rounded-xl font-semibold"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Takaisin etusivulle
            </Button>
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
                Unohditko salasanan?
              </h1>
              <p className={cn("text-sm mt-1.5", darkMode ? "text-gray-400" : "text-gray-500")}>
                Syötä sähköpostiosoitteesi niin lähetämme palautuslinkin.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email" className={cn("text-[11px] font-semibold uppercase tracking-wider mb-2 block", darkMode ? "text-gray-400" : "text-gray-500")}>
                  Sähköpostiosoite
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nimi@koulu.fi"
                  required
                  disabled={isLoading}
                  autoComplete="email"
                  className="h-11"
                />
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
                disabled={isLoading}
                className="w-full h-11 rounded-xl font-semibold bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isLoading ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Lähetetään…</>
                ) : (
                  <><Mail className="h-4 w-4 mr-2" /> Lähetä palautuslinkki</>
                )}
              </Button>
            </form>

            <div className="mt-5 text-center">
              <button
                type="button"
                onClick={() => setLocation("/")}
                className={cn("text-sm font-semibold inline-flex items-center gap-1.5 transition-colors", darkMode ? "text-gray-400 hover:text-gray-200" : "text-gray-500 hover:text-gray-800")}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Takaisin kirjautumiseen
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
