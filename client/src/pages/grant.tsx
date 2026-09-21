/**
 * /grant/:token — magic-link landing for approved access requests (v4.7.14).
 *
 * Flow:
 *   1. Admin approves a request → server mints a grant token and emails
 *      the user a link to /grant/{token}.
 *   2. This page POSTs /api/security-settings/grant/{token}.
 *   3. On success we persist `ksyk_access_granted=1` +
 *      `ksyk_granted_email=<email>` in localStorage so the access-control
 *      gate lets the user through on subsequent visits, then redirect to /.
 *
 * All state is designed. Loading, success, invalid/expired token,
 * network failure are each handled explicitly — no falling through
 * to a generic "something happened" screen.
 */
import { useEffect, useState } from "react";
import { useParams, Link } from "wouter";
import { CheckCircle2, XCircle, Loader2, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

type Status =
  | { kind: "loading" }
  | { kind: "success"; email: string }
  | { kind: "invalid" }
  | { kind: "network" };

export default function GrantPage() {
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<Status>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token) { setStatus({ kind: "invalid" }); return; }
      try {
        const r = await fetch(`/api/security-settings/grant/${encodeURIComponent(token)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        if (cancelled) return;
        if (r.status === 404 || r.status === 400) {
          setStatus({ kind: "invalid" });
          return;
        }
        if (!r.ok) {
          setStatus({ kind: "network" });
          return;
        }
        const body = await r.json().catch(() => ({} as { email?: string }));
        const email = typeof body.email === "string" ? body.email : "";
        try {
          localStorage.setItem("ksyk_access_granted", "1");
          if (email) localStorage.setItem("ksyk_granted_email", email);
        } catch { /* storage denied — grant still works for this tab */ }
        setStatus({ kind: "success", email });
        // Auto-redirect to the map after a short beat so the user
        // sees the confirmation. 1.6 s reads well without feeling stuck.
        setTimeout(() => {
          if (typeof window !== "undefined") window.location.href = "/";
        }, 1600);
      } catch {
        if (!cancelled) setStatus({ kind: "network" });
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 px-6">
      <div className="w-full max-w-sm text-center">
        <div className="mb-6 inline-flex items-center gap-2 text-[10px] font-semibold tracking-[0.28em] uppercase text-gray-500">
          <MapPin className="h-3 w-3" strokeWidth={2.5} />
          KSYK Maps
        </div>

        {status.kind === "loading" && (
          <div className="flex flex-col items-center">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            <p className="mt-4 text-[13px] text-gray-500">Verifying your link…</p>
          </div>
        )}

        {status.kind === "success" && (
          <div className="flex flex-col items-center">
            <div className="h-12 w-12 rounded-full bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" strokeWidth={2.25} />
            </div>
            <h1 className="mt-5 text-xl font-semibold tracking-tight">Access granted</h1>
            <p className="mt-2 text-sm text-gray-500">
              {status.email
                ? <>Signed in as <span className="font-medium text-gray-700 dark:text-gray-300">{status.email}</span>. Opening the map…</>
                : <>You're all set. Opening the map…</>}
            </p>
            <Link
              href="/"
              className={cn(
                "mt-6 inline-flex items-center gap-1.5 text-[13px] font-medium",
                "text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded",
              )}
            >
              Open now
            </Link>
          </div>
        )}

        {status.kind === "invalid" && (
          <div className="flex flex-col items-center">
            <div className="h-12 w-12 rounded-full bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
              <XCircle className="h-6 w-6 text-gray-400" strokeWidth={2.25} />
            </div>
            <h1 className="mt-5 text-xl font-semibold tracking-tight">Link no longer valid</h1>
            <p className="mt-2 text-sm text-gray-500">
              The request may not have been approved yet, or the link has already been used.
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex items-center gap-1.5 text-[13px] font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              Return to KSYK Maps
            </Link>
          </div>
        )}

        {status.kind === "network" && (
          <div className="flex flex-col items-center">
            <div className="h-12 w-12 rounded-full bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center">
              <XCircle className="h-6 w-6 text-amber-600 dark:text-amber-400" strokeWidth={2.25} />
            </div>
            <h1 className="mt-5 text-xl font-semibold tracking-tight">Couldn't reach the server</h1>
            <p className="mt-2 text-sm text-gray-500">
              Check your connection and try the link again.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className={cn(
                "mt-6 h-9 px-4 rounded-lg text-[13px] font-semibold transition-all",
                "bg-gray-900 dark:bg-white text-white dark:text-gray-900",
                "hover:bg-gray-700 dark:hover:bg-gray-100",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2",
                "active:scale-[0.98]",
              )}
            >
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
