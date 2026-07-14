/**
 * KSYK Maps — Builder page.
 *
 * Top-level `/builder` route. Admin-only campus map editor. Draws
 * buildings, rooms, hallways directly on the Leaflet campus map (not on
 * a fake SVG canvas) and includes the Map Defaults & Rotation controls
 * inline.
 *
 * Stub for now — the actual editor is spawned by a subagent in the next
 * commit. This file exists so the `/builder` route resolves and lets
 * the AdminDashboard nav link work while the real editor is built.
 */
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import MapSettingsPanel from "@/components/MapSettingsPanel";

export default function BuilderPage() {
  const [, setLocation] = useLocation();
  const [authState, setAuthState] = useState<"checking" | "allowed" | "denied">("checking");

  useEffect(() => {
    // Match the auth gate the AdminDashboard uses — only owners/admins
    // reach the builder.
    const loggedIn = localStorage.getItem("ksyk_admin_logged_in") === "true";
    const userRaw = localStorage.getItem("ksyk_admin_user");
    if (!loggedIn || !userRaw) {
      setAuthState("denied");
      return;
    }
    try {
      const user = JSON.parse(userRaw);
      const role = user?.role;
      if (role === "admin" || role === "owner" || role === "editor") {
        setAuthState("allowed");
      } else {
        setAuthState("denied");
      }
    } catch {
      setAuthState("denied");
    }
  }, []);

  if (authState === "checking") {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (authState === "denied") {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card border border-border rounded-2xl shadow-sm p-6 text-center">
          <div className="h-14 w-14 mx-auto mb-4 rounded-2xl bg-red-50 dark:bg-red-950/40 ring-1 ring-red-100 dark:ring-red-900/60 flex items-center justify-center">
            <ShieldAlert className="h-7 w-7 text-red-600 dark:text-red-400" strokeWidth={2.25} />
          </div>
          <div className="text-[10px] font-bold tracking-[0.22em] uppercase text-red-600 dark:text-red-400 mb-2">
            Restricted
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground mb-2">
            Builder is admin-only
          </h1>
          <p className="text-sm text-muted-foreground mb-5">
            Sign in as an admin or owner to edit the campus map.
          </p>
          <Button
            onClick={() => setLocation("/admin")}
            className="h-11 px-6 rounded-xl font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-600/25 active:scale-[0.98]"
          >
            Go to admin login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
      <Header />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Placeholder content — the real editor will replace this. */}
        <div className="p-4 sm:p-6 max-w-5xl mx-auto w-full space-y-4">
          <div className="bg-card border border-border rounded-2xl shadow-sm p-5">
            <div className="text-[10px] font-bold tracking-[0.22em] uppercase text-blue-600 dark:text-blue-400 mb-2">
              KSYK Maps · Builder
            </div>
            <h1 className="text-[22px] sm:text-[28px] font-bold tracking-[-0.02em] text-foreground leading-tight">
              Campus editor
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              Draw buildings, rooms, and hallways directly on the campus map.
              The full editor is being built — for now, use the Map Defaults
              & Rotation controls below to configure the base map.
            </p>
          </div>

          <MapSettingsPanel showPublish />
        </div>
      </div>
    </div>
  );
}
