import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";

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
      <div className="min-h-screen bg-gray-100 dark:bg-gray-950 flex items-center justify-center p-6">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-red-200 dark:border-red-900/50 p-8 text-center max-w-sm w-full">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/40 mx-auto mb-4">
            <span className="text-3xl">⚠️</span>
          </div>
          <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">Access Denied</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            Admin privileges required. Signed in as{" "}
            <span className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
              {user?.email}
            </span>
          </p>
          <button
            onClick={() => setLocation("/")}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl transition-colors font-semibold text-sm shadow"
          >
            Back to Map
          </button>
        </div>
      </div>
    );
  }

  // Full-height layout — the public header is intentionally omitted here.
  // The admin dashboard owns its own header, sidebar, and navigation.
  return (
    <div className={cn("h-[100dvh] overflow-hidden", darkMode ? "bg-gray-950" : "bg-slate-50")}>
      <AdminDashboard section={section} />
    </div>
  );
}
