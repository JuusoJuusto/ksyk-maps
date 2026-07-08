import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { ShieldAlert, ArrowLeft } from "lucide-react";

import AdminDashboard from "@/components/AdminDashboard";
import { AdminLogin } from "@/components/AdminLogin";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useDarkMode } from "@/contexts/DarkModeContext";
import { cn } from "@/lib/utils";

export default function Admin() {
  const [, setLocation] = useLocation();
  const { darkMode } = useDarkMode();

  // Read the optional :section param from all possible route patterns
  const [, paramsLong] = useRoute("/admin-ksyk-management-portal/:section");
  const [, paramsShort] = useRoute("/admin/:section");
  const section = paramsLong?.section ?? paramsShort?.section;

  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const isLoggedIn = localStorage.getItem("ksyk_admin_logged_in");
      const storedUser = localStorage.getItem("ksyk_admin_user");
      if (isLoggedIn === "true" && storedUser) {
        setUser(JSON.parse(storedUser));
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  if (isLoading) {
    return <LoadingSpinner fullScreen message="Loading Admin Panel…" />;
  }

  if (!user) {
    return <AdminLogin onLoginSuccess={() => window.location.reload()} />;
  }

  const isAdmin = user?.role === "admin" || user?.role === "owner";

  if (!isAdmin) {
    return (
      <div
        className={cn(
          "min-h-[100dvh] flex items-center justify-center px-5 py-8",
          "pt-[max(env(safe-area-inset-top),2rem)] pb-[max(env(safe-area-inset-bottom),2rem)]",
          darkMode ? "bg-gray-950" : "bg-slate-50",
        )}
      >
        <div
          className={cn(
            "w-full max-w-md rounded-2xl p-6 sm:p-8 text-center",
            "ring-1 ring-black/5 dark:ring-white/5",
            "bg-white dark:bg-gray-900",
          )}
        >
          <div
            className={cn(
              "mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl",
              "bg-blue-50 border border-blue-200 text-blue-900",
              "dark:bg-blue-950/40 dark:border-blue-900/40 dark:text-blue-100",
            )}
          >
            <ShieldAlert className="h-6 w-6" strokeWidth={2.25} />
          </div>
          <h2 className="text-[22px] sm:text-[28px] font-bold tracking-[-0.02em] text-gray-900 dark:text-white leading-tight">
            Access Denied
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Admin privileges required.
          </p>
          <div
            className={cn(
              "mt-4 inline-flex max-w-full items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-mono",
              "bg-blue-50 border border-blue-200 text-blue-900",
              "dark:bg-blue-950/40 dark:border-blue-900/40 dark:text-blue-100",
            )}
          >
            <span className="opacity-70 shrink-0">Signed in as</span>
            <span className="truncate">{user?.email}</span>
          </div>
          <button
            onClick={() => setLocation("/")}
            className={cn(
              "mt-6 inline-flex items-center justify-center gap-2 w-full",
              "min-h-[44px] px-5 rounded-xl text-sm font-semibold",
              "bg-blue-600 hover:bg-blue-700 text-white",
              "transition-all duration-150 active:scale-[0.98]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900",
            )}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Map
          </button>
        </div>
      </div>
    );
  }

  // Full-height layout — the public header is intentionally omitted here.
  // The admin dashboard owns its own header, sidebar, and navigation.
  // Safe-area padding lives here (once) so every dashboard tab inherits it
  // on mobile without needing to know about notches.
  return (
    <div
      className={cn(
        "h-[100dvh] overflow-hidden",
        "pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]",
        darkMode ? "bg-gray-950" : "bg-slate-50",
      )}
    >
      <AdminDashboard section={section} />
    </div>
  );
}
