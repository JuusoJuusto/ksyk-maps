/**
 * OfflineBanner — persistent notice when the browser reports we're
 * offline. Reads `navigator.onLine` and listens for the `online` /
 * `offline` events.
 *
 * Sits under the top header as a slim strip. Bilingual (Finnish / English
 * follows `ksyk_language`). Auto-hides when the browser comes back
 * online; a one-shot "Back online" confirmation appears for 2s.
 */
import { useEffect, useState } from "react";
import { WifiOff, Wifi } from "lucide-react";
import { cn } from "@/lib/utils";

function readLang(): "fi" | "en" {
  try {
    const stored = localStorage.getItem("ksyk_language");
    if (!stored) return "en";
    return stored.toLowerCase().startsWith("en") ? "en" : "fi";
  } catch { return "en"; }
}

export default function OfflineBanner() {
  const [online, setOnline] = useState<boolean>(() => {
    if (typeof navigator === "undefined") return true;
    return navigator.onLine !== false;
  });
  const [justRecovered, setJustRecovered] = useState(false);
  const [lang, setLang] = useState<"fi" | "en">(() => readLang());
  const isFi = lang === "fi";

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onOnline = () => {
      setOnline(true);
      setJustRecovered(true);
      window.setTimeout(() => setJustRecovered(false), 2000);
    };
    const onOffline = () => {
      setOnline(false);
      setJustRecovered(false);
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    const onStorage = (e: StorageEvent) => {
      if (e.key === "ksyk_language") setLang(readLang());
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  if (online && !justRecovered) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "sticky top-0 z-40 w-full text-white text-[13px] font-medium",
        "flex items-center justify-center gap-2 px-4 py-2 animate-fade-in",
        online
          ? "bg-emerald-600"
          : "bg-amber-600",
      )}
    >
      {online ? (
        <>
          <Wifi className="h-3.5 w-3.5" strokeWidth={2.25} />
          <span>{isFi ? "Yhteys palautui" : "Back online"}</span>
        </>
      ) : (
        <>
          <WifiOff className="h-3.5 w-3.5" strokeWidth={2.25} />
          <span>
            {isFi
              ? "Offline — jotkin toiminnot eivät ehkä toimi"
              : "You're offline — some features may not work"}
          </span>
        </>
      )}
    </div>
  );
}
