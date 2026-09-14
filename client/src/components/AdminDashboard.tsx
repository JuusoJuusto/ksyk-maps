import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { getAdminHeaders } from "@/lib/adminAuth";
import posthog from "@/lib/posthog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import AnnouncementManager from "@/components/AnnouncementManager";
// Builder components (ImprovedKSYKBuilder, Builder3D) removed — the
// Builder is now a top-level /builder route with its own admin gate.
// Admin sidebar links out to /builder instead of embedding the editor.
import KSYKMapView from "@/components/KSYKMapView";
import AppSettingsManager from "@/components/AppSettingsManager";
import AppLogsManager from "@/components/AppLogsManager";
import AdminAnalyticsDashboard from "@/components/AdminAnalyticsDashboard";
import TicketManager from "@/components/TicketManager";
import TwoFactorAuth from "@/components/TwoFactorAuth";
import SecuritySettingsPanel from "@/components/SecuritySettingsPanel";
import BeaconSurveyor from "@/components/BeaconSurveyor";
import AnalyticsExternalPanel from "@/components/AnalyticsExternalPanel";
import OverviewInsightsCards from "@/components/OverviewInsightsCards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Building,
  Users,
  Megaphone,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  MapPin,
  AlertTriangle,
  Layers,
  Settings,
  Shield,
  Box,
  LayoutDashboard,
  Ticket,
  ScrollText,
  IdCard,
  LogOut,
  ChevronRight,
  Loader2,
  Eye,
  Home,
  Radio,
  TrendingUp,
  Bell,
  Send,
  CheckCircle2,
  Info,
  MessageSquare,
} from "lucide-react";

interface Building {
  id: string;
  name: string;
  nameEn?: string;
  nameFi?: string;
  description?: string;
  floors: number;
  capacity?: number;
  colorCode: string;
  mapPositionX?: number;
  mapPositionY?: number;
  isActive: boolean;
}

interface Room {
  id: string;
  buildingId: string;
  roomNumber: string;
  name?: string;
  nameEn?: string;
  nameFi?: string;
  floor: number;
  capacity?: number;
  type: string;
  isActive: boolean;
}

interface Staff {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  position?: string;
  department?: string;
  isActive: boolean;
}

interface Announcement {
  id: string;
  title: string;
  titleEn?: string;
  titleFi?: string;
  content: string;
  contentEn?: string;
  contentFi?: string;
  priority: string;
  isActive: boolean;
  createdAt: string;
  expiresAt?: string;
}


const ADMIN_BASE = "/admin";

// Canonical tab slugs — also used as URL path segments.
// "analytics" was folded into the Logs page as a nested tab (matches the
// data flow: analytics is a lens over the log stream, not a separate
// concept).
const TAB_SLUGS = [
  "overview","security","users","campus-map",
  "tickets","insights","staff","announcements","notifications","beacons","2fa","settings",
] as const;
type TabSlug = typeof TAB_SLUGS[number];

// Short URL aliases for the /admin/* route family.
// v1.71.0: `logs`, `analytics`, and `feedback` were merged into a single
// `insights` tab. The old slugs still resolve there so bookmarks work.
const URL_TO_TAB: Record<string, TabSlug> = {
  "map-settings": "campus-map",
  map: "campus-map",
  "2fa-setup": "2fa",
  logs: "insights",
  analytics: "insights",
  feedback: "insights",
  "analytics-logs": "insights",
};
// Reverse: canonical slug → preferred short URL segment (when on /admin/* base)
const TAB_TO_SHORT: Partial<Record<TabSlug, string>> = {
  "campus-map": "map-settings",
};

function isValidTab(s?: string): s is TabSlug {
  return !!s && ((TAB_SLUGS as readonly string[]).includes(s) || s in URL_TO_TAB);
}

function resolveTab(s?: string): TabSlug | "overview" {
  if (!s) return "overview";
  if ((TAB_SLUGS as readonly string[]).includes(s)) return s as TabSlug;
  if (s in URL_TO_TAB) return URL_TO_TAB[s];
  return "overview";
}

function NotificationsPanel({
  queryClient,
  toast,
  announcements,
  navigate,
}: {
  queryClient: ReturnType<typeof useQueryClient>;
  toast: ReturnType<typeof useToast>["toast"];
  announcements: Announcement[];
  navigate: (tab: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [lastSent, setLastSent] = useState<string | null>(null);
  const [fcmStats, setFcmStats] = useState<{ total: number; active30d: number; active7d?: number; configured: boolean; initError?: string | null; recentDevices?: any[] } | null>(null);
  const [lastResult, setLastResult] = useState<{ sent: number; failed: number; total: number; errors?: string[]; warning?: string } | null>(null);

  // Poll FCM stats every 15s so newly registered devices show up without a
  // full page reload. Uses /notifications/status which has richer diagnostics
  // (init error + recent devices + config flags) than /push-tokens.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const { getAdminHeaders } = await import("@/lib/adminAuth");
        const r = await fetch("/api/notifications/status", { headers: getAdminHeaders() });
        const data = await r.json();
        if (!cancelled) setFcmStats(data);
      } catch { /* ignore */ }
    }
    load();
    const iv = setInterval(load, 15_000);
    return () => { cancelled = true; clearInterval(iv); };
  }, []);

  const active = announcements.filter((a) => a.isActive);

  const sendPush = async (isTest: boolean) => {
    const t = isTest ? "KSYK Maps — testi" : title.trim();
    const b = isTest ? "Testipush-ilmoitus hallintapaneelista." : body.trim();
    if (!t || !b) { toast({ title: "Fill in title and message", variant: "destructive" }); return; }
    setSending(true);
    setLastResult(null);
    try {
      const { getAdminHeaders } = await import("@/lib/adminAuth");
      if (isTest) {
        // Test push — FCM only, no announcement stored
        const r = await fetch("/api/notifications/test", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...getAdminHeaders() },
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data.message || "Failed");
        setLastResult({
          sent: data.sent ?? 0,
          failed: data.failed ?? 0,
          total: data.total ?? 0,
          errors: data.errors,
          warning: data.warning,
        });
        toast({
          title: `Test push sent to ${data.sent ?? 0} device(s)`,
          description: data.warning || (data.errors?.length ? `Errors: ${data.errors[0]}` : undefined),
          variant: data.warning || (data.sent === 0 && (data.total ?? 0) > 0) ? "destructive" : "default",
        });
      } else {
        // Real broadcast — create announcement (triggers FCM) + direct FCM broadcast
        const [annRes, fcmRes] = await Promise.all([
          fetch("/api/announcements", {
            method: "POST",
            headers: { "Content-Type": "application/json", ...getAdminHeaders() },
            body: JSON.stringify({ title: t, content: b, priority: "high", isActive: true }),
          }),
          fetch("/api/notifications/broadcast", {
            method: "POST",
            headers: { "Content-Type": "application/json", ...getAdminHeaders() },
            body: JSON.stringify({ title: t, body: b, type: "announcement", screen: "news" }),
          }),
        ]);
        if (!annRes.ok) throw new Error("Failed to create announcement");
        const fcmData = await fcmRes.json();
        queryClient.invalidateQueries({ queryKey: ["announcements"] });
        setLastSent(t);
        setLastResult({
          sent: fcmData.sent ?? 0,
          failed: fcmData.failed ?? 0,
          total: fcmData.total ?? 0,
          errors: fcmData.errors,
          warning: fcmData.warning,
        });
        setTitle(""); setBody("");
        toast({
          title: "Sent!",
          description: `Push delivered to ${fcmData.sent ?? 0} of ${fcmData.total ?? 0} devices.`,
        });
      }
    } catch (e: any) {
      toast({ title: "Failed to send", description: e?.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold">Push Notifications</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Send real FCM push notifications to every installed KSYK Maps device.
        </p>
      </div>

      {/* FCM + announcement stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className={fcmStats?.configured ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30" : "border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30"}>
          <CardContent className="p-4">
            <p className={`text-xs font-semibold uppercase tracking-wide ${fcmStats?.configured ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"}`}>FCM</p>
            <p className={`text-lg font-bold ${fcmStats?.configured ? "text-green-700 dark:text-green-300" : "text-amber-700 dark:text-amber-300"}`}>
              {fcmStats === null ? "…" : fcmStats.configured ? "Ready" : "Not set up"}
            </p>
            <p className={`text-xs mt-0.5 ${fcmStats?.configured ? "text-green-500" : "text-amber-500"}`}>Firebase Admin SDK</p>
          </CardContent>
        </Card>
        <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30">
          <CardContent className="p-4">
            <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold uppercase tracking-wide">Devices</p>
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{(fcmStats as any)?.totalDevices ?? "…"}</p>
            <p className="text-xs text-blue-500 mt-0.5">registered tokens</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Active 7d</p>
            <p className="text-2xl font-bold">{(fcmStats as any)?.active7d ?? fcmStats?.active30d ?? "…"}</p>
            <p className="text-xs text-muted-foreground mt-0.5">recent devices</p>
          </CardContent>
        </Card>
        {lastResult ? (
          <Card className={lastResult.sent > 0 ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30" : "border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30"}>
            <CardContent className="p-4 flex items-start gap-2">
              <CheckCircle2 className={`h-4 w-4 mt-0.5 shrink-0 ${lastResult.sent > 0 ? "text-green-600" : "text-amber-600"}`} />
              <div className="min-w-0">
                <p className={`text-xs font-semibold ${lastResult.sent > 0 ? "text-green-600" : "text-amber-600"}`}>Last result</p>
                <p className={`text-xs ${lastResult.sent > 0 ? "text-green-700 dark:text-green-300" : "text-amber-700 dark:text-amber-300"}`}>{lastResult.sent}/{lastResult.total} delivered</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Announcements</p>
              <p className="text-2xl font-bold">{announcements.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">all time</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Per-token FCM error details from the most recent broadcast/test */}
      {(lastResult?.warning || (lastResult?.errors && lastResult.errors.length > 0)) && (
        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-amber-800 dark:text-amber-300">Last send diagnostics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-amber-800 dark:text-amber-300">
            {lastResult.warning && (
              <p className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded">{lastResult.warning}</p>
            )}
            {lastResult.errors && lastResult.errors.length > 0 && (
              <div>
                <p className="font-semibold mb-1">Per-token errors:</p>
                <ul className="space-y-0.5 font-mono text-[10px]">
                  {lastResult.errors.map((e, i) => (
                    <li key={i} className="bg-amber-100 dark:bg-amber-900/40 p-1 rounded break-all">{e}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Firebase Admin init error — surfaces the exact reason FCM sends fail */}
      {fcmStats?.initError && (
        <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30">
          <CardContent className="p-4 flex gap-3">
            <Bell className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div className="text-sm text-red-800 dark:text-red-300 flex-1 min-w-0">
              <p className="font-semibold mb-1">Firebase Admin init failed</p>
              <p className="font-mono text-xs bg-red-100 dark:bg-red-900/40 p-2 rounded break-all">{fcmStats.initError}</p>
              <p className="text-red-700 dark:text-red-400 text-xs mt-2">
                Common causes: private key not converted from <code>\n</code>, service account revoked, Firebase Cloud Messaging API V1 disabled at
                {" "}<a className="underline" href="https://console.cloud.google.com/apis/library/fcm.googleapis.com" target="_blank" rel="noopener">console.cloud.google.com/apis/library/fcm.googleapis.com</a>.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* FCM not configured warning */}
      {fcmStats && !fcmStats.configured && (
        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30">
          <CardContent className="p-4 flex gap-3">
            <Bell className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800 dark:text-amber-300">
              <p className="font-semibold mb-1">FCM not configured</p>
              <p className="text-amber-700 dark:text-amber-400 text-xs">
                Set <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">FIREBASE_PROJECT_ID</code>,{" "}
                <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">FIREBASE_CLIENT_EMAIL</code> and{" "}
                <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">FIREBASE_PRIVATE_KEY</code> environment variables on the server.
                Announcements will still be saved but push delivery will be skipped.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent devices — proves tokens ARE landing */}
      {fcmStats?.recentDevices && fcmStats.recentDevices.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Recent device registrations</CardTitle>
            <CardDescription className="text-xs">Auto-refreshes every 15 s · latest 5 tokens</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {fcmStats.recentDevices.map((d: any, i: number) => (
                <div key={i} className="flex items-center justify-between gap-3 text-xs py-1.5 border-b border-border last:border-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono">{d.platform || "android"}</Badge>
                    <span className="font-mono text-muted-foreground">v{d.app_version || "?"}</span>
                  </div>
                  <span className="text-muted-foreground">{new Date(d.updated_at).toLocaleString("fi-FI")}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Compose form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Send className="h-4 w-4" />
            Lähetä kaikille (Send to all)
          </CardTitle>
          <CardDescription>
            Creates an announcement AND sends a real FCM push notification to every registered device.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Otsikko (Title)</label>
            <Input
              placeholder="e.g. Koulu kiinni huomenna"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={sending}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Viesti (Message)</label>
            <textarea
              className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Kirjoita ilmoitus tähän…"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              disabled={sending}
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={() => sendPush(false)} disabled={sending || !title.trim() || !body.trim()} className="gap-1.5">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Lähetä kaikille
            </Button>
            <Button variant="outline" onClick={() => sendPush(true)} disabled={sending} className="gap-1.5">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Info className="h-4 w-4" />}
              Lähetä testi
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent notifications */}
      {announcements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Notifications</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            {announcements.slice(0, 8).map((a) => (
              <div key={a.id} className="py-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{a.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{a.content}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(a.createdAt).toLocaleString()}
                  </p>
                </div>
                <Badge variant={a.isActive ? "default" : "secondary"} className="shrink-0 text-xs">
                  {a.isActive ? "Live" : "Expired"}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * v1.71.0 — single "Analytics & Logs" tab that groups the four separate
 * old sidebar entries (Analytics, Logs, Feedback, External analytics)
 * behind nested pills. Reduces sidebar clutter and keeps everything an
 * admin needs when investigating an issue on one screen.
 */
function InsightsPanel() {
  const [inner, setInner] = useState<"analytics" | "errors" | "logs" | "external" | "feedback">("analytics");
  const pills: { key: typeof inner; label: string }[] = [
    { key: "analytics", label: "Analytics" },
    { key: "errors",    label: "Errors (Sentry)" },
    { key: "logs",      label: "Logs" },
    { key: "external",  label: "External" },
    { key: "feedback",  label: "Feedback, Bugs & Crashes" },
  ];
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold">Analytics &amp; Logs</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Usage metrics, error logs, external dashboards, and user-submitted feedback in one place.
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5 border-b border-border pb-3">
        {pills.map((p) => (
          <button
            key={p.key}
            onClick={() => setInner(p.key)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${inner === p.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
          >
            {p.label}
          </button>
        ))}
      </div>
      {inner === "analytics" && <AdminAnalyticsDashboard />}
      {inner === "errors"    && <ErrorsPanel />}
      {inner === "logs"      && <AppLogsManager />}
      {inner === "external"  && <AnalyticsExternalPanel />}
      {inner === "feedback"  && <FeedbackPanel />}
    </div>
  );
}

/**
 * v1.75.0 — Sentry issues surfacer. Sentry's Web API requires a bearer
 * token that we deliberately don't ship to the client; instead we render
 * a launch card + link out. Post-launch we can add a server-side proxy
 * that pulls the top N issues via /api/errors/sentry and drops the
 * bearer here, but for now the honest thing is to link out.
 */
function ErrorsPanel() {
  const SENTRY_ORG = "ksyk";
  const SENTRY_PROJECT = "ksyk-maps";
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            Sentry error tracking
          </CardTitle>
          <CardDescription>
            Web + Android crashes and unhandled exceptions are captured by Sentry.
            Individual event pages carry the linked <span className="font-mono text-[11px]">posthog_session</span> tag to jump to the replay.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <a
              href={`https://${SENTRY_ORG}.sentry.io/issues/?project=${SENTRY_PROJECT}&statsPeriod=24h`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-600 text-white text-sm font-semibold hover:bg-red-700"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              Open Sentry Issues (24 h)
            </a>
            <a
              href={`https://${SENTRY_ORG}.sentry.io/discover/?project=${SENTRY_PROJECT}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-muted text-foreground text-sm font-semibold hover:bg-muted/80"
            >
              Discover events
            </a>
            <a
              href={`https://${SENTRY_ORG}.sentry.io/replays/?project=${SENTRY_PROJECT}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-muted text-foreground text-sm font-semibold hover:bg-muted/80"
            >
              Sentry replays
            </a>
          </div>
          <div className="rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 p-3 text-xs">
            <p className="font-semibold text-amber-900 dark:text-amber-200">Also see:</p>
            <ul className="mt-1 space-y-1 text-amber-800 dark:text-amber-300">
              <li>· <strong>Feedback → Crashes</strong> tab: mobile crashes uploaded from the app's <em>Sovellus kaatui viimeksi</em> card.</li>
              <li>· <strong>Logs</strong> tab: server-side app_logs Postgres feed.</li>
              <li>· <strong>Analytics</strong> tab: session drill dialog "Watch replay in PostHog" button links to the session's recording.</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function FeedbackPanel() {
  const [tab, setTab] = useState<"feedback" | "bugs" | "crashes">("feedback");
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const endpoint =
    tab === "feedback" ? "/api/feedback" :
    tab === "bugs"     ? "/api/bug-reports" :
                         "/api/crash-reports";

  async function reload() {
    setLoading(true);
    try {
      const r = await fetch(endpoint, { headers: getAdminHeaders() });
      const data = await r.json();
      setItems(Array.isArray(data) ? data : []);
    } catch { setItems([]); }
    finally { setLoading(false); }
  }
  useEffect(() => { reload(); /* eslint-disable-line react-hooks/exhaustive-deps */ }, [tab]);

  async function setStatus(id: string, status: string) {
    const resource =
      tab === "feedback" ? "feedback" :
      tab === "bugs"     ? "bug-reports" :
                           "crash-reports";
    try {
      await fetch(`/api/${resource}/${id}`, {
        method: "PATCH",
        headers: { ...getAdminHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      // Optimistic local update
      setItems((prev) => prev.map((x) => (x.id === id ? { ...x, status } : x)));
    } catch { /* silently ignore — reload will heal on next tab switch */ }
  }

  const tabLabel =
    tab === "feedback" ? "feedback" :
    tab === "bugs"     ? "bug reports" :
                         "crash reports";

  const statusOptions =
    tab === "feedback" ? ["all", "new", "reviewed", "archived"] :
    tab === "bugs"     ? ["all", "open", "in_progress", "closed"] :
                         ["all", "open", "closed"];

  const filtered = statusFilter === "all"
    ? items
    : items.filter((it) => (it.status || (tab === "feedback" ? "new" : "open")) === statusFilter);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold">Feedback, Bugs & Crashes</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Submitted from the KSYK Maps mobile app.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setTab("feedback")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === "feedback" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
        >
          Feedback ({tab === "feedback" ? items.length : "…"})
        </button>
        <button
          onClick={() => setTab("bugs")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === "bugs" ? "bg-destructive text-destructive-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
        >
          Bug Reports ({tab === "bugs" ? items.length : "…"})
        </button>
        <button
          onClick={() => setTab("crashes")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === "crashes" ? "bg-orange-600 text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
        >
          Crashes ({tab === "crashes" ? items.length : "…"})
        </button>
      </div>
      {/* Status filter pills */}
      <div className="flex flex-wrap gap-1.5">
        {statusOptions.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${statusFilter === s ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}
          >
            {s}
          </button>
        ))}
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>No {tabLabel} {statusFilter !== "all" ? `with status "${statusFilter}"` : "yet"}.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((item: any) => {
            const currentStatus = item.status || (tab === "feedback" ? "new" : "open");
            const nextStates =
              tab === "feedback" ? ["new", "reviewed", "archived"] :
              tab === "bugs"     ? ["open", "in_progress", "closed"] :
                                   ["open", "closed"];
            return (
              <Card key={item.id}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      {tab === "feedback" && (
                        <Badge variant="secondary">{item.category || "general"}</Badge>
                      )}
                      {tab === "crashes" && item.log_lines && (
                        <Badge variant="outline">{item.log_lines} lines</Badge>
                      )}
                      <Badge
                        className={
                          currentStatus === "closed" || currentStatus === "archived"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                            : currentStatus === "in_progress" || currentStatus === "reviewed"
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                              : "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                        }
                      >
                        {currentStatus}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(item.created_at).toLocaleString("fi-FI")}
                      </span>
                    </div>
                    {item.app_version && (
                      <span className="text-xs text-muted-foreground font-mono">{item.app_version}</span>
                    )}
                  </div>
                  {tab === "crashes" ? (
                    <div className="relative">
                      <pre className="text-xs whitespace-pre-wrap font-mono max-h-64 overflow-auto p-3 pr-16 rounded bg-muted/50 select-text">{item.log_body}</pre>
                      <button
                        onClick={() => {
                          try { navigator.clipboard.writeText(item.log_body); } catch { /* ignore */ }
                        }}
                        className="absolute top-2 right-2 px-2 py-1 rounded text-[10px] font-semibold bg-background border border-border shadow-sm hover:bg-muted"
                        title="Copy full log to clipboard"
                      >
                        Copy
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap select-text">{item.message || item.description}</p>
                  )}
                  {item.steps && (
                    <div className="mt-2 p-2 rounded bg-muted/50">
                      <p className="text-xs font-semibold text-muted-foreground mb-1">Steps to reproduce:</p>
                      <p className="text-xs whitespace-pre-wrap">{item.steps}</p>
                    </div>
                  )}
                  {item.device_info && (
                    <p className="text-xs text-muted-foreground font-mono">{item.device_info}</p>
                  )}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {nextStates
                      .filter((s) => s !== currentStatus)
                      .map((s) => (
                        <button
                          key={s}
                          onClick={() => setStatus(item.id, s)}
                          className="px-2.5 py-1 rounded-md text-xs font-medium bg-muted hover:bg-muted/70 transition-colors"
                        >
                          → {s}
                        </button>
                      ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AdminDashboard({ section, openTicketId }: { section?: string; openTicketId?: string }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();

  const initialTab = resolveTab(section);
  const [activeTab, setActiveTab] = useState<string>(initialTab);

  // Sync with URL when the browser navigates back/forward or the section prop changes
  useEffect(() => {
    const next = resolveTab(section);
    if (next !== activeTab) setActiveTab(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section]);

  // Kill the PostHog toolbar on any /admin route — its keydown listener
  // crashes with `n.key.toLowerCase()` on synthetic events (Sentry Seer
  // issue cbb9866d). Also removes the floating hedgehog button.
  useEffect(() => {
    try { (posthog as any)?.toolbar?.close?.(); } catch { /* ignore */ }
  }, []);

  // Single canonical admin base — the short /admin path was retired so
  // the panel is only reachable via the obscure portal URL.
  const adminBase = ADMIN_BASE;

  const navigate = (tab: string) => {
    if (tab === "__builder") { setLocation("/builder"); return; }
    setActiveTab(tab);
    const path = tab === "overview" ? adminBase : `${adminBase}/${tab}`;
    setLocation(path);
  };
  // builderSubtab retired — Builder moved to /builder.
  // User management state
  const [editingUser, setEditingUser] = useState<any>(null);
  const [newUser, setNewUser] = useState({
    email: "",
    firstName: "",
    lastName: "",
    role: "admin",
    password: "",
    passwordOption: "manual" // "manual" or "email"
  });
  const [showUserForm, setShowUserForm] = useState(false);
  const [showPasswordField, setShowPasswordField] = useState(false);
  const [viewingPassword, setViewingPassword] = useState<string | null>(null);
  const [confirmDeleteUserId, setConfirmDeleteUserId] = useState<string | null>(null);
  const [confirmDeleteStaffId, setConfirmDeleteStaffId] = useState<string | null>(null);
  const [dangerInput, setDangerInput] = useState("");
  const [dangerDeleting, setDangerDeleting] = useState(false);

  // Staff management state
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const [showStaffForm, setShowStaffForm] = useState(false);
  const [newStaff, setNewStaff] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    position: "",
    positionEn: "",
    positionFi: "",
    department: "",
    departmentEn: "",
    departmentFi: "",
    bio: "",
    bioEn: "",
    bioFi: "",
    isActive: true
  });
  
  // Get current user from localStorage
  const getCurrentUser = () => {
    try {
      const storedUser = localStorage.getItem('ksyk_admin_user');
      if (storedUser) {
        return JSON.parse(storedUser);
      }
    } catch (error) {
      console.error('Error getting current user:', error);
    }
    return null;
  };
  
  const currentUser = getCurrentUser();
  const isOwner = currentUser?.email === "JuusoJuusto112@gmail.com" || currentUser?.id === "owner-admin-user";
  const isAdmin = currentUser?.role === "admin" || isOwner; // Admin or owner

  // Auth gate:
  // - localStorage flag must be present (you literally signed in here)
  // - Token must be < 12 h old
  // - Server probe must NOT return an explicit "invalid token" signal
  //   (we look for status 401 + message containing "invalid|expired", so
  //   a generic cold-start 401 from a serverless function doesn't bounce
  //   us out)
  // Anything else → redirect to /admin-login.
  useEffect(() => {
    const flagged = localStorage.getItem("ksyk_admin_logged_in") === "true";
    const loginAt = Number(localStorage.getItem("ksyk_admin_login_at") || 0);
    const hoursSinceLogin = (Date.now() - loginAt) / (1000 * 60 * 60);
    const wipeAndRedirect = () => {
      if (currentUser) posthog.reset();
      localStorage.removeItem("ksyk_admin_logged_in");
      localStorage.removeItem("ksyk_admin_user");
      localStorage.removeItem("ksyk_admin_login_at");
      localStorage.removeItem("ksyk_admin_token");
      window.location.replace("/admin");
    };
    if (!flagged || !currentUser || (loginAt > 0 && hoursSinceLogin > 12)) {
      wipeAndRedirect();
      return;
    }
    // Probe the server. If it tells us specifically that the token is
    // invalid (vs a generic cold-start 401), redirect.
    let cancelled = false;
    // Attach the Bearer token so the server can validate it and return
    // 200 (instead of a noisy 401 that only means "no cookie session").
    const authToken = typeof localStorage !== "undefined"
      ? localStorage.getItem("ksyk_admin_token") : null;
    fetch("/api/auth/user", {
      credentials: "include",
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
    })
      .then(async (r) => {
        if (cancelled) return;
        if (r.status === 401 || r.status === 403) {
          const data = await r.json().catch(() => ({}));
          const msg = (data?.message || "").toLowerCase();
          // Real "invalid token" signal.
          if (msg.includes("invalid") || msg.includes("expired") || msg.includes("token")) {
            wipeAndRedirect();
            return;
          }
          // Plain "Unauthorized" probably means the serverless session
          // was lost — don't bounce, keep the localStorage flag.
        }
      })
      .catch(() => { /* network errors aren't fatal */ });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  

  // Fetch data
  const { data: buildings = [], isLoading: buildingsLoading, isError: buildingsError } = useQuery({
    queryKey: ["buildings"],
    queryFn: async () => {
      const response = await fetch("/api/buildings");
      if (!response.ok) throw new Error("Failed to fetch buildings");
      return response.json();
    },
  });

  const { data: rooms = [], isLoading: roomsLoading, isError: roomsError } = useQuery({
    queryKey: ["rooms"],
    queryFn: async () => {
      const response = await fetch("/api/rooms");
      if (!response.ok) throw new Error("Failed to fetch rooms");
      return response.json();
    },
  });

  const { data: staff = [], isLoading: staffLoading } = useQuery({
    queryKey: ["staff"],
    queryFn: async () => {
      const response = await fetch("/api/staff");
      if (!response.ok) throw new Error("Failed to fetch staff");
      return response.json();
    },
  });

  const { data: announcements = [], isLoading: announcementsLoading } = useQuery({
    queryKey: ["announcements"],
    queryFn: async () => {
      const response = await fetch("/api/announcements?limit=50");
      if (!response.ok) throw new Error("Failed to fetch announcements");
      return response.json();
    },
  });

  const isLoadingOverview = buildingsLoading || roomsLoading || staffLoading || announcementsLoading;
  const hasDataError = buildingsError || roomsError;

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const response = await fetch("/api/users", { headers: getAdminHeaders(), credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch users");
      return response.json();
    },
  });

  // Staff mutations
  const createStaffMutation = useMutation({
    mutationFn: async (staff: any) => {
      const response = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(staff),
      });
      if (!response.ok) throw new Error("Failed to create staff member");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      setShowStaffForm(false);
      setNewStaff({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        position: "",
        positionEn: "",
        positionFi: "",
        department: "",
        departmentEn: "",
        departmentFi: "",
        bio: "",
        bioEn: "",
        bioFi: "",
        isActive: true
      });
    },
  });

  const updateStaffMutation = useMutation({
    mutationFn: async ({ id, ...staff }: any) => {
      const response = await fetch(`/api/staff/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(staff),
      });
      if (!response.ok) throw new Error("Failed to update staff member");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      setEditingStaff(null);
      setShowStaffForm(false);
    },
  });

  const deleteStaffMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/staff/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete staff member");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
    },
  });

  const handleCreateStaff = () => {
    if (!newStaff.firstName || !newStaff.lastName) {
      toast({ title: "Required fields missing", description: "Please fill in first and last name.", variant: "destructive" });
      return;
    }
    createStaffMutation.mutate(newStaff);
  };

  const handleUpdateStaff = () => {
    if (!editingStaff) return;
    updateStaffMutation.mutate(editingStaff);
  };

  const handleDeleteStaff = (id: string) => {
    setConfirmDeleteStaffId(id);
  };

  const logoutFn = () => {
    posthog.reset();
    localStorage.removeItem("ksyk_admin_logged_in");
    localStorage.removeItem("ksyk_admin_user");
    localStorage.removeItem("ksyk_admin_login_at");
    localStorage.removeItem("ksyk_admin_token");
    fetch("/api/auth/logout", { method: "POST", credentials: "include" }).finally(() => {
      window.location.replace("/admin");
    });
  };

  // Grouped sidebar structure (v4.5.55) — same items as before but
  // logically clustered by purpose so the sidebar reads at a glance
  // instead of being a flat 12-item wall.
  const NAV_ITEMS = [
    { value: "overview",       label: "Overview",         Icon: LayoutDashboard },
    { value: "security",       label: "Security",         Icon: Shield },
    { value: "users",          label: "Users",            Icon: Users },
    { value: "campus-map",     label: "Campus Map",       Icon: MapPin },
    { value: "__builder",      label: "Builder",          Icon: Box, href: "/builder" as const },
    { value: "tickets",        label: "Tickets",          Icon: Ticket },
    { value: "insights",       label: "Analytics & Logs", Icon: TrendingUp },
    { value: "staff",          label: "Staff",            Icon: IdCard },
    { value: "announcements",  label: "Announcements",    Icon: Megaphone },
    { value: "notifications",  label: "Notifications",    Icon: Bell },
    ...(isOwner ? [{ value: "beacons",  label: "Wi-Fi",    Icon: Radio }]    : []),
    ...(isOwner ? [{ value: "2fa",      label: "2FA",      Icon: Shield }]   : []),
    ...(isOwner ? [{ value: "settings", label: "Settings", Icon: Settings }] : []),
  ];

  const NAV_GROUPS: { label: string; values: string[] }[] = [
    { label: "Overview",   values: ["overview", "insights"] },
    { label: "Content",    values: ["announcements", "tickets", "staff"] },
    { label: "Data",       values: ["campus-map", "__builder"] },
    { label: "People",     values: ["users"] },
    { label: "Safety",     values: ["security", "notifications"] },
    ...(isOwner ? [{ label: "Owner", values: ["beacons", "2fa", "settings"] }] : []),
  ];
  const navByValue: Record<string, typeof NAV_ITEMS[number]> = Object.fromEntries(
    NAV_ITEMS.map((i) => [i.value, i]),
  ) as any;

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-white dark:bg-gray-900">

      {/* ── Desktop sidebar ──────────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-56 xl:w-64 shrink-0 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        {/* Brand strip — KSYK Maps logo, calm */}
        <div className="flex items-center gap-2.5 px-4 h-14 border-b border-gray-200 dark:border-gray-800 shrink-0 bg-white dark:bg-gray-950">
          <img
            src="/favicon-128.png"
            alt="KSYK Maps"
            width={28}
            height={28}
            className="h-7 w-7 object-contain shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-bold tracking-[0.32em] text-gray-400 dark:text-gray-500 uppercase leading-none">
              KSYK Maps
            </p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight mt-0.5">
              Admin
            </p>
          </div>
          <a
            href="/"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
            title="Back to Map"
          >
            <Home className="h-3.5 w-3.5" />
          </a>
        </div>
        {/* Nav items — grouped by purpose. Each group has a tiny caps
         *  header; renders nothing for empty groups. Owner group only
         *  appears for the owner role. */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-3">
          {NAV_GROUPS.map((group) => {
            const items = group.values
              .map((v) => navByValue[v])
              .filter(Boolean);
            if (items.length === 0) return null;
            return (
              <div key={group.label}>
                <p className="px-3 pb-1 text-[10px] uppercase tracking-[0.18em] font-semibold text-gray-400 dark:text-gray-500">
                  {group.label}
                </p>
                <div className="space-y-0.5">
                  {items.map((item) => {
                    const { value, label, Icon } = item;
                    const href = (item as { href?: string }).href;
                    const onClick = href ? () => setLocation(href) : () => navigate(value);
                    const isActive = activeTab === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={onClick}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150",
                          isActive
                            ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 ring-1 ring-blue-200/60 dark:ring-blue-900/60 shadow-sm"
                            : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100",
                        )}
                      >
                        <Icon className={cn(
                          "h-4 w-4 shrink-0",
                          isActive ? "text-blue-600 dark:text-blue-400" : "",
                        )} />
                        <span className="truncate flex-1 text-left">{label}</span>
                        {isActive && (
                          <ChevronRight className="h-3.5 w-3.5 ml-auto shrink-0 opacity-60" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
        {/* User chip */}
        {currentUser && (
          <div className="shrink-0 border-t border-gray-100 dark:border-gray-800 p-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white text-[11px] font-bold shadow-sm shadow-blue-500/30">
                {(currentUser.email || currentUser.name || "?").slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold truncate text-gray-900 dark:text-white">
                  {currentUser.name || currentUser.email}
                </p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {isOwner ? "Owner" : isAdmin ? "Admin" : "Staff"}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg shrink-0"
                onClick={logoutFn}
                title="Sign out"
              >
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </aside>

      {/* ── Main content area ────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={navigate} className="flex-1 flex flex-col h-full min-h-0 overflow-hidden bg-gray-50 dark:bg-gray-950">
        {/* Mobile: account chip + horizontal scrolling tab bar (hidden lg+).
         *  Wraps the mobile chrome in a padded container + rounded-2xl card
         *  so it matches the floating banner + header used on the main app. */}
        <div className="lg:hidden shrink-0 px-2 sm:px-3 pt-2 pb-1">
          <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900">
          {currentUser && (
            <div className="flex items-center justify-between px-4 h-12 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-2 min-w-0">
                <img
                  src="/favicon-128.png"
                  alt="KSYK Maps"
                  width={24}
                  height={24}
                  className="h-6 w-6 object-contain shrink-0"
                />
                <div className="flex flex-col min-w-0 leading-tight">
                  <span className="text-[9px] font-bold tracking-[0.28em] text-gray-400 dark:text-gray-500 uppercase leading-none">
                    KSYK Admin
                  </span>
                  <span className="text-xs font-semibold truncate text-gray-900 dark:text-white mt-0.5">
                    {currentUser.name || currentUser.email}
                  </span>
                </div>
                <span className={cn(
                  "hidden xs:inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ml-1",
                  "bg-blue-50 border border-blue-200 text-blue-900",
                  "dark:bg-blue-950/40 dark:border-blue-900/40 dark:text-blue-100",
                )}>
                  {isOwner ? "Owner" : isAdmin ? "Admin" : "Staff"}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <a
                  href="/"
                  className="inline-flex items-center justify-center h-9 min-w-9 px-2 rounded-lg text-[11px] font-semibold text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors active:scale-[0.98]"
                  title="Back to Map"
                >
                  <Home className="h-4 w-4" />
                </a>
                <button
                  type="button"
                  className="inline-flex items-center justify-center h-9 min-w-9 px-2 rounded-lg text-[11px] font-semibold text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors active:scale-[0.98]"
                  onClick={logoutFn}
                  title="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
          <div className="relative overflow-hidden">
            <div className="overflow-x-auto scrollbar-none px-3 py-2">
              <TabsList className="inline-flex w-max gap-1 p-1 bg-gray-100 dark:bg-gray-900/70 rounded-xl ring-1 ring-black/5 dark:ring-white/5 h-auto">
                {NAV_ITEMS.map(({ value, label, Icon }) => (
                  <TabsTrigger
                    key={value}
                    value={value}
                    className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:shadow-blue-600/30 rounded-lg px-3.5 min-h-[38px] text-xs font-semibold gap-1.5 inline-flex items-center transition-all duration-150 whitespace-nowrap active:scale-[0.98]"
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
            <div className="pointer-events-none absolute right-0 top-0 h-full w-8 bg-gradient-to-l from-white dark:from-gray-900 to-transparent" />
            <div className="pointer-events-none absolute left-0 top-0 h-full w-3 bg-gradient-to-r from-white dark:from-gray-900 to-transparent" />
          </div>
          </div>
        </div>

        {/* Scrollable content — full-bleed for map/builder, padded for everything else */}
        <div className={`flex-1 min-h-0 ${activeTab === "campus-map" ? "overflow-hidden" : "overflow-y-auto"}`}>
          <div className={activeTab === "campus-map" ? "h-full" : "p-4 sm:p-6 pb-8"}>

        {/* Section header — auto-rendered from the current tab so every
           section gets a consistent title + description without touching
           each TabsContent. Sits between the tab bar and content. */}
        {(() => {
          const sectionMeta: Record<string, { title: string; description: string; Icon: typeof LayoutDashboard }> = {
            overview: { title: "Overview", description: "At-a-glance state of the campus.", Icon: LayoutDashboard },
            security: { title: "Security & Access", description: "Time, IP, login, and per-user access controls.", Icon: Shield },
            users: { title: "Users", description: "Manage admin accounts and per-user access rules.", Icon: Users },
            "campus-map": { title: "Campus Map", description: "Live preview of what users see.", Icon: MapPin },
            tickets: { title: "Tickets", description: "Support requests and bug reports.", Icon: Ticket },
            logs: { title: "Application Logs", description: "Server-side activity and errors.", Icon: ScrollText },
            analytics: { title: "Analytics", description: "Cloudflare + Vercel + Firestore visitor metrics in one place.", Icon: TrendingUp },
            staff: { title: "Staff", description: "Public-facing staff directory entries.", Icon: IdCard },
            announcements: { title: "Announcements", description: "Banner messages shown to all users.", Icon: Megaphone },
            notifications: { title: "Notifications", description: "Send push notifications to all app users.", Icon: Bell },
            beacons: { title: "Wi-Fi Positioning", description: "Calibrate indoor positioning fingerprints. Live — POST /api/wifi/locate is active.", Icon: Radio },
            "2fa": { title: "Two-Factor Auth", description: "Enroll and manage 2FA for your account.", Icon: Shield },
            settings: { title: "Settings", description: "App name, branding, and danger zone.", Icon: Settings },
          };
          const meta = sectionMeta[activeTab];
          // Full-height tabs get no header — they need every pixel
          if (!meta || activeTab === "campus-map") return null;
          const Icon = meta.Icon;
          return (
            <div className="flex items-start gap-3 sm:gap-4 mb-5 sm:mb-6 pb-4 sm:pb-5 border-b border-gray-100 dark:border-gray-800">
              <div className={cn(
                "flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-2xl mt-0.5",
                "bg-blue-50 border border-blue-200 text-blue-900",
                "dark:bg-blue-950/40 dark:border-blue-900/40 dark:text-blue-100",
              )}>
                <Icon className="h-5 w-5 sm:h-5.5 sm:w-5.5" strokeWidth={2.25} />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-[22px] sm:text-[28px] font-bold tracking-[-0.02em] leading-tight text-gray-900 dark:text-white">
                  {meta.title}
                </h2>
                <p className="mt-1 text-xs sm:text-sm text-muted-foreground leading-snug">
                  {meta.description}
                </p>
              </div>
            </div>
          );
        })()}

        <TabsContent value="overview" className="mt-0 space-y-5">
          {/* Campus utilisation hero — computes all metrics in one pass */}
          {(() => {
            const usable = (rooms as Room[]).filter(r => r.type !== "hallway");
            const freeN = usable.filter(r => (r as any).currentStatus === "free").length;
            const occupiedN = usable.filter(r => (r as any).currentStatus === "occupied").length;
            const reservedN = usable.filter(r => (r as any).currentStatus === "reserved").length;
            const maintN = usable.filter(r => (r as any).currentStatus === "maintenance").length;
            const unknownN = usable.filter(r => !((r as any).currentStatus) || (r as any).currentStatus === "unknown").length;
            const total = usable.length;
            const utilPct = total > 0 ? Math.round(((occupiedN + reservedN) / total) * 100) : 0;
            const availPct = total > 0 ? Math.round((freeN / total) * 100) : 0;
            const utilColor = utilPct >= 80 ? "text-red-600 dark:text-red-400" : utilPct >= 50 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400";
            const statusDefs = [
              { key: "free" as const, label: "Free", color: "#10B981", bg: "bg-emerald-500", count: freeN },
              { key: "occupied" as const, label: "Occupied", color: "#EF4444", bg: "bg-red-500", count: occupiedN },
              { key: "reserved" as const, label: "Reserved", color: "#F59E0B", bg: "bg-amber-500", count: reservedN },
              { key: "maintenance" as const, label: "Maint.", color: "#8B5CF6", bg: "bg-purple-500", count: maintN },
              { key: "unknown" as const, label: "Unknown", color: "#6B7280", bg: "bg-gray-400", count: unknownN },
            ];
            return (
              <>
                {/* KPI cards */}
                {hasDataError && (
                  <div className="col-span-full px-4 py-2 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-sm text-red-700 dark:text-red-400">
                    Some data failed to load. Check your connection and refresh.
                  </div>
                )}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: "Buildings", value: (buildings as any[])?.length ?? 0, bar: "bg-blue-500", iconBg: "bg-blue-500", icon: Building, tab: "__builder", sub: null },
                    { label: "Rooms", value: total || (rooms as any[]).length, bar: "bg-emerald-500", iconBg: "bg-emerald-500", icon: MapPin, tab: "__builder", sub: total > 0 ? `${availPct}% available` : null },
                    { label: "Staff", value: (staff as any[])?.length ?? 0, bar: "bg-amber-500", iconBg: "bg-amber-500", icon: IdCard, tab: "staff", sub: null },
                    { label: "Announcements", value: (announcements as any[])?.filter((a: any) => a.isActive).length ?? 0, bar: "bg-rose-500", iconBg: "bg-rose-500", icon: Megaphone, tab: "announcements", sub: "active" },
                  ].map(({ label, value, bar, iconBg, icon: Icon, tab, sub }) => (
                    <button key={label} type="button"
                      onClick={() => tab === "__builder" ? setLocation("/builder") : navigate(tab)}
                      className="text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900 rounded-2xl active:scale-[0.98] transition-transform"
                      aria-label={`Go to ${label} tab`}>
                      <Card className="relative overflow-hidden border-0 rounded-2xl ring-1 ring-black/5 dark:ring-white/5 hover:ring-blue-200 dark:hover:ring-blue-900/50 transition-all duration-200 cursor-pointer">
                        <div className={`absolute inset-x-0 top-0 h-1 ${bar}`} />
                        <CardContent className="p-4 md:p-5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="text-[10px] sm:text-xs uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
                              {isLoadingOverview
                                ? <div className="h-9 w-16 mt-1 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />
                                : <p className="text-3xl md:text-4xl font-bold mt-1 tabular-nums tracking-[-0.02em] text-gray-900 dark:text-white">{value}</p>
                              }
                              {sub && !isLoadingOverview && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
                            </div>
                            <div className={`p-2 rounded-xl ${iconBg} text-white shrink-0`}>
                              <Icon className="h-5 w-5" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </button>
                  ))}
                </div>

                {/* Campus occupancy card */}
                {total > 0 && (
                  <Card className="overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-teal-500" />
                          Campus Occupancy
                        </CardTitle>
                        <div className="flex items-center gap-3">
                          <span className={`text-2xl font-black tabular-nums ${utilColor}`}>{utilPct}%</span>
                          <span className="text-xs text-muted-foreground">in use</span>
                          <span className="h-4 w-px bg-gray-200 dark:bg-gray-700" />
                          <span className="text-2xl font-black tabular-nums text-emerald-600 dark:text-emerald-400">{availPct}%</span>
                          <span className="text-xs text-muted-foreground">free</span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-3">
                      <div className="flex h-4 rounded-full overflow-hidden gap-0.5">
                        {statusDefs.map(({ key, bg, count }) => {
                          const pct = total > 0 ? (count / total) * 100 : 0;
                          if (pct === 0) return null;
                          return <div key={key} className={`${bg} transition-all first:rounded-l-full last:rounded-r-full`} style={{ width: `${pct}%` }} title={`${key}: ${count}`} />;
                        })}
                      </div>
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                        {statusDefs.map(({ key, label, color, count }) => (
                          <div key={key} className="flex flex-col gap-0.5 p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                              <span className="text-[10px] text-muted-foreground">{label}</span>
                            </div>
                            <span className="text-base font-black tabular-nums leading-none" style={{ color }}>{count}</span>
                            <span className="text-[9px] text-muted-foreground">{total > 0 ? Math.round((count / total) * 100) : 0}%</span>
                          </div>
                        ))}
                      </div>
                      {/* Per-floor breakdown */}
                      {(buildings as any[]).length > 0 && (() => {
                        const maxFloors = Math.max(...(buildings as any[]).map((b: any) => b.floors ?? 1), 1);
                        if (maxFloors <= 1) return null;
                        return (
                          <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">By Floor</p>
                            <div className="space-y-1.5">
                              {Array.from({ length: maxFloors }, (_, i) => i + 1).map(fl => {
                                const flRooms = (rooms as Room[]).filter(r => r.type !== "hallway" && (r.floor ?? 1) === fl);
                                const flFree = flRooms.filter(r => (r as any).currentStatus === "free").length;
                                const flOcc = flRooms.filter(r => (r as any).currentStatus === "occupied").length;
                                const flTotal = flRooms.length;
                                if (flTotal === 0) return null;
                                return (
                                  <div key={fl} className="flex items-center gap-3">
                                    <span className="text-xs font-bold text-muted-foreground w-12 shrink-0">Floor {fl}</span>
                                    <div className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                                      <div className="h-full rounded-full bg-red-400 transition-all" style={{ width: `${flTotal > 0 ? Math.round((flOcc / flTotal) * 100) : 0}%` }} />
                                    </div>
                                    <span className="text-xs tabular-nums text-muted-foreground w-20 text-right shrink-0">{flFree}/{flTotal} free</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}
                    </CardContent>
                  </Card>
                )}
              </>
            );
          })()}

          {/* Quick actions */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {[
              { label: "New Announcement", desc: "Post a notice to all users", icon: Megaphone, tab: "announcements", accent: "bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/30 dark:border-rose-800 dark:text-rose-400" },
              { label: "Manage Staff", desc: "Update the staff directory", icon: Users, tab: "staff", accent: "bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100 dark:bg-violet-950/30 dark:border-violet-800 dark:text-violet-400" },
              { label: "Open Builder", desc: "Edit rooms and floors", icon: Box, tab: "__builder", accent: "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-400" },
              { label: "Campus Map", desc: "Preview the live map", icon: MapPin, tab: "campus-map", accent: "bg-teal-50 border-teal-200 text-teal-700 hover:bg-teal-100 dark:bg-teal-950/30 dark:border-teal-800 dark:text-teal-400" },
              { label: "View Tickets", desc: "Check open support requests", icon: Ticket, tab: "tickets", accent: "bg-sky-50 border-sky-200 text-sky-700 hover:bg-sky-100 dark:bg-sky-950/30 dark:border-sky-800 dark:text-sky-400" },
              { label: "App Logs", desc: "Server activity & errors", icon: ScrollText, tab: "logs", accent: "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 dark:bg-slate-950/30 dark:border-slate-800 dark:text-slate-400" },
            ].map(({ label, desc, icon: Icon, tab, accent }) => (
              <button key={label} type="button"
                onClick={() => tab === "__builder" ? setLocation("/builder") : navigate(tab)}
                className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all hover:-translate-y-px ${accent}`}>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/60 dark:bg-gray-900/40">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold leading-tight">{label}</p>
                  <p className="text-[10px] opacity-65 truncate mt-0.5">{desc}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Campus buildings summary + latest announcements side by side on wide screens */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Campus buildings */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Building className="h-4 w-4 text-blue-500" />
                    Campus Buildings
                  </CardTitle>
                  <button
                    type="button"
                    onClick={() => setLocation("/builder")}
                    className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 font-medium"
                  >
                    {(buildings as any[]).length > 0 ? "Manage →" : "Add first →"}
                  </button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {(buildings as any[]).length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-6 text-center">
                    <Building className="h-8 w-8 text-gray-300 dark:text-gray-700" />
                    <p className="text-xs text-muted-foreground">No buildings yet — open the Builder to add rooms and floors.</p>
                    <Button size="sm" variant="outline" className="h-7 text-xs mt-1" onClick={() => setLocation("/builder")}>
                      Open Builder
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {(buildings as Building[]).map((b) => {
                      const roomCount = (rooms as Room[]).filter((r) => r.buildingId === b.id).length;
                      return (
                        <div key={b.id} className="flex items-center gap-3 py-1.5 rounded-lg px-1 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                          <div className="h-7 w-7 shrink-0 rounded-lg flex items-center justify-center text-white text-[10px] font-bold shadow-sm" style={{ backgroundColor: b.colorCode }}>
                            {b.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate text-gray-900 dark:text-gray-100">{b.name}</p>
                            <p className="text-[11px] text-muted-foreground">{b.floors} floor{b.floors !== 1 ? "s" : ""} · {roomCount} room{roomCount !== 1 ? "s" : ""}</p>
                          </div>
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${b.isActive ? "border-emerald-300 text-emerald-700 dark:text-emerald-400" : "border-gray-200 text-gray-400"}`}>
                            {b.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Latest announcements */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Megaphone className="h-4 w-4 text-rose-500" />
                    Active Announcements
                  </CardTitle>
                  <button
                    type="button"
                    onClick={() => navigate("announcements")}
                    className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 font-medium"
                  >
                    {(announcements as any[]).filter((a: any) => a.isActive).length > 0 ? "Manage →" : "Create →"}
                  </button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {(announcements as any[]).filter((a: any) => a.isActive).length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-6 text-center">
                    <Megaphone className="h-8 w-8 text-gray-300 dark:text-gray-700" />
                    <p className="text-xs text-muted-foreground">No active announcements — create one to notify all users.</p>
                    <Button size="sm" variant="outline" className="h-7 text-xs mt-1" onClick={() => navigate("announcements")}>
                      Create Announcement
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(announcements as Announcement[]).filter((a) => a.isActive).slice(0, 4).map((a) => (
                      <div key={a.id} className="flex items-start gap-3 py-1.5 border-b last:border-0">
                        <span className={`mt-0.5 shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${
                          a.priority === "urgent" ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400" :
                          a.priority === "high" ? "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400" :
                          "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400"
                        }`}>{a.priority}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate text-gray-900 dark:text-gray-100">{a.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{a.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Today's analytics — pageviews, top features, top searches,
              easter eggs. Data comes from /api/analytics/overview; each
              section renders its own empty state when there's nothing yet. */}
          <OverviewInsightsCards />
        </TabsContent>

        <TabsContent value="security" className="mt-0 space-y-5">
          {!isOwner ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
                <Shield className="h-10 w-10 text-gray-300 dark:text-gray-700" />
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Owner access only</p>
                <p className="text-xs text-muted-foreground">Security configuration is restricted to the owner account.</p>
              </CardContent>
            </Card>
          ) : (
            <SecuritySettingsPanel />
          )}
        </TabsContent>

        <TabsContent value="users" className="mt-0 space-y-6">
          {!isOwner ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
                <Users className="h-10 w-10 text-gray-300 dark:text-gray-700" />
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Owner access only</p>
                <p className="text-xs text-muted-foreground">User management requires the owner account.</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-4">
                  <CardDescription className="text-xs">
                    Roles: visitor · user · admin · owner
                  </CardDescription>
                  <Button
                    size="sm"
                    onClick={() => {
                      setShowUserForm(true);
                      setEditingUser(null);
                      setNewUser({ email: "", firstName: "", lastName: "", role: "admin", password: "", passwordOption: "manual" });
                      setShowPasswordField(false);
                    }}
                    className="shrink-0 bg-blue-600 hover:bg-blue-700 h-8 text-xs"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    Add User
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* User Form */}
                  {showUserForm && (
                    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-800/40 p-5 shadow-sm">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-semibold">
                          {editingUser ? "Edit User" : "Add New User"}
                        </h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setShowUserForm(false);
                            setEditingUser(null);
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>First Name</Label>
                          <Input
                            value={editingUser ? editingUser.firstName : newUser.firstName}
                            onChange={(e) => editingUser 
                              ? setEditingUser({...editingUser, firstName: e.target.value})
                              : setNewUser({...newUser, firstName: e.target.value})
                            }
                            placeholder="John"
                          />
                        </div>
                        <div>
                          <Label>Last Name</Label>
                          <Input
                            value={editingUser ? editingUser.lastName : newUser.lastName}
                            onChange={(e) => editingUser 
                              ? setEditingUser({...editingUser, lastName: e.target.value})
                              : setNewUser({...newUser, lastName: e.target.value})
                            }
                            placeholder="Doe"
                          />
                        </div>
                        <div>
                          <Label>Email</Label>
                          <Input
                            type="email"
                            value={editingUser ? editingUser.email : newUser.email}
                            onChange={(e) => editingUser 
                              ? setEditingUser({...editingUser, email: e.target.value})
                              : setNewUser({...newUser, email: e.target.value})
                            }
                            placeholder="john@example.com"
                          />
                        </div>
                        <div>
                          <Label>Role</Label>
                          <select
                            className="w-full h-10 border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
                            value={editingUser ? editingUser.role : newUser.role}
                            onChange={(e) => editingUser
                              ? setEditingUser({...editingUser, role: e.target.value})
                              : setNewUser({...newUser, role: e.target.value})
                            }
                          >
                            <option value="visitor">Visitor</option>
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                            <option value="owner">Owner</option>
                          </select>
                        </div>
                        {!editingUser && (
                          <>
                            <div className="col-span-2">
                              <Label className="mb-3 block">Password Setup</Label>
                              <div className="space-y-3">
                                <div className="flex items-center space-x-4">
                                  <label className="flex items-center space-x-2 cursor-pointer">
                                    <input
                                      type="radio"
                                      name="passwordOption"
                                      value="manual"
                                      checked={newUser.passwordOption === "manual"}
                                      onChange={(e) => setNewUser({...newUser, passwordOption: e.target.value, password: ""})}
                                      className="w-4 h-4 text-blue-600"
                                    />
                                    <span className="text-sm font-medium">Set password manually</span>
                                  </label>
                                  <label className="flex items-center space-x-2 cursor-pointer">
                                    <input
                                      type="radio"
                                      name="passwordOption"
                                      value="email"
                                      checked={newUser.passwordOption === "email"}
                                      onChange={(e) => setNewUser({...newUser, passwordOption: e.target.value, password: ""})}
                                      className="w-4 h-4 text-blue-600"
                                    />
                                    <span className="text-sm font-medium">Send email invitation</span>
                                  </label>
                                </div>
                                
                                {newUser.passwordOption === "manual" && (
                                  <div>
                                    <Input
                                      type="password"
                                      value={newUser.password}
                                      onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                                      placeholder="Enter password"
                                      className="mt-2"
                                    />
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                      User will use this password to login
                                    </p>
                                  </div>
                                )}

                                {newUser.passwordOption === "email" && (
                                  <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded p-3">
                                    <p className="text-sm text-blue-800 dark:text-blue-300">
                                      📧 An email will be sent to <strong>{newUser.email || "the user"}</strong> with instructions to set their password.
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </>
                        )}
                        
                        {editingUser && (
                          <div className="col-span-2">
                            <div className="flex items-center justify-between mb-2">
                              <Label>Password</Label>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowPasswordField(!showPasswordField)}
                                className="text-blue-600 hover:text-blue-700"
                              >
                                {showPasswordField ? "Hide" : "Change Password"}
                              </Button>
                            </div>
                            {showPasswordField && (
                              <div className="space-y-2">
                                <Input
                                  type="password"
                                  placeholder="Enter new password"
                                  onChange={(e) => setEditingUser({...editingUser, newPassword: e.target.value})}
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  Leave empty to keep current password
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex justify-end space-x-2 mt-4">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowUserForm(false);
                            setEditingUser(null);
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          className="bg-blue-600 hover:bg-blue-700"
                          onClick={async () => {
                            try {
                              if (editingUser) {
                                // Update user
                                const response = await fetch(`/api/users/${editingUser.id}`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json', ...getAdminHeaders() },
                                  credentials: 'include',
                                  body: JSON.stringify(editingUser)
                                });
                                
                                if (!response.ok) {
                                  const error = await response.json();
                                  throw new Error(error.message || 'Failed to update user');
                                }

                                toast({ title: "User updated", description: "User account saved successfully." });
                                queryClient.invalidateQueries({ queryKey: ["users"] });
                                setShowUserForm(false);
                                setEditingUser(null);
                              } else {
                                // Create user
                                if (!newUser.email || !newUser.firstName || !newUser.lastName) {
                                  toast({ title: "Required fields missing", description: "Please fill in all required fields.", variant: "destructive" });
                                  return;
                                }

                                if (newUser.passwordOption === 'manual' && !newUser.password) {
                                  toast({ title: "Password required", description: "Please enter a password or choose email invitation.", variant: "destructive" });
                                  return;
                                }
                                
                                const response = await fetch('/api/users', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json', ...getAdminHeaders() },
                                  credentials: 'include',
                                  body: JSON.stringify(newUser)
                                });
                                
                                if (!response.ok) {
                                  const error = await response.json();
                                  throw new Error(error.message || 'Failed to create user');
                                }
                                
                                const result = await response.json();

                                // If the email failed, surface the temp
                                // password so the admin can hand it over
                                // manually and know invites are broken.
                                let description: string;
                                let variant: "default" | "destructive" = "default";
                                if (newUser.passwordOption === 'email') {
                                  if (result.emailSent === false) {
                                    description = (result.warning || "Invite email failed.") + `\n\nPassword: ${result.password}`;
                                    variant = "destructive";
                                  } else {
                                    description = `Invitation sent to ${newUser.email}.`;
                                  }
                                } else {
                                  description = "User account created.";
                                }
                                toast({ title: "User created", description, variant });
                                queryClient.invalidateQueries({ queryKey: ["users"] });
                                setShowUserForm(false);
                                setNewUser({ email: "", firstName: "", lastName: "", role: "admin", password: "", passwordOption: "manual" });
                              }
                            } catch (error: any) {
                              toast({ title: "Error", description: error.message, variant: "destructive" });
                            }
                          }}
                        >
                          <Save className="h-4 w-4 mr-2" />
                          {editingUser ? "Update User" : "Create User"}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Password Viewer Modal */}
                  {viewingPassword && (
                    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
                      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">User Password</h3>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewingPassword(null)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-4">
                          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Email</p>
                          <p className="font-mono text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                            {users.find((u: any) => u.id === viewingPassword)?.email}
                          </p>
                          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Password</p>
                          <p className="font-mono text-base font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 p-3 rounded-lg border border-blue-200 dark:border-blue-800 select-all">
                            {users.find((u: any) => u.id === viewingPassword)?.password || "No password set"}
                          </p>
                        </div>
                        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                          <p className="text-xs text-amber-800 dark:text-amber-300">
                            Keep this password secure. Share it only with the intended user.
                          </p>
                        </div>
                        <div className="flex justify-end mt-4">
                          <Button
                            onClick={() => setViewingPassword(null)}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            Close
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Users Table */}
                  <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden overflow-x-auto">
                    <table className="w-full min-w-[520px]">
                      <thead className="bg-gray-50/80 dark:bg-gray-800/60">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Role</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {users.map((user: any) => (
                          <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                            <td className="px-4 py-3">
                              <div className="font-medium text-gray-900 dark:text-gray-100">{user.firstName} {user.lastName}</div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{user.email}</td>
                            <td className="px-4 py-3">
                              <Badge className={`capitalize text-xs font-semibold px-2 py-0.5 ${
                                user.role === 'owner' ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-700' :
                                user.role === 'admin' ? 'bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-700' :
                                user.role === 'user' ? 'bg-green-100 dark:bg-green-950/40 text-green-800 dark:text-green-300 border-green-200 dark:border-green-700' :
                                'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600'
                              }`}>
                                {user.role}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <Badge className={user.isActive !== false
                                ? "bg-green-100 dark:bg-green-950/40 text-green-800 dark:text-green-300"
                                : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"}>
                                {user.isActive !== false ? "Active" : "Inactive"}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              {user.email !== "JuusoJuusto112@gmail.com" ? (
                                confirmDeleteUserId === user.id ? (
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs text-red-600 dark:text-red-400 font-medium">Delete?</span>
                                    <Button
                                      variant="ghost" size="sm"
                                      className="h-7 px-2 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-700"
                                      onClick={async () => {
                                        try {
                                          const r = await fetch(`/api/users/${user.id}`, { method: "DELETE", headers: getAdminHeaders(), credentials: "include" });
                                          if (!r.ok) { const e = await r.json(); throw new Error(e.message || "Failed"); }
                                          toast({ title: "User deleted" });
                                          queryClient.invalidateQueries({ queryKey: ["users"] });
                                        } catch (e: any) {
                                          toast({ title: "Error", description: e.message, variant: "destructive" });
                                        } finally {
                                          setConfirmDeleteUserId(null);
                                        }
                                      }}
                                    >Yes</Button>
                                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs"
                                      onClick={() => setConfirmDeleteUserId(null)}>No</Button>
                                  </div>
                                ) : (
                                  <div className="flex gap-0.5">
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                                      onClick={() => { setEditingUser(user); setShowUserForm(true); setShowPasswordField(false); }}
                                      title="Edit">
                                      <Edit className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-blue-600 hover:text-blue-700"
                                      onClick={() => setViewingPassword(user.id)} title="View password">
                                      <Eye className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                                      onClick={() => setConfirmDeleteUserId(user.id)} title="Delete">
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                )
                              ) : (
                                <Badge className="text-[10px] bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700">Owner</Badge>
                              )}
                            </td>
                          </tr>
                        ))}
                        {(users as any[]).length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted-foreground">
                              No users yet — click <strong>Add User</strong> to create one.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent forceMount value="campus-map" className={cn("mt-0 h-full overflow-hidden", activeTab !== "campus-map" && "hidden")}>
          <KSYKMapView showGpsLocation={activeTab === "campus-map"} />
        </TabsContent>

        {/* Builder + Builder3D tabs removed — the Builder is now a
         *  top-level /builder route. Sidebar link "Builder" opens it. */}

        <TabsContent value="insights" className="mt-0 space-y-6">
          {/*
            v1.71.0: Analytics & Logs — Analytics dashboard, external
            analytics (PostHog/Sentry), logs, feedback, bugs, and crashes
            all live under one tab. Nested tabs let admins jump between
            them without paging through the sidebar.
          */}
          <InsightsPanel />
        </TabsContent>

        <TabsContent value="tickets" className="mt-0 space-y-6">
          <TicketManager defaultOpenId={openTicketId} />
        </TabsContent>

        <TabsContent value="staff" className="mt-0 space-y-6">
          {/* Staff Form */}
          {showStaffForm && (
            <Card className="border border-gray-200 dark:border-gray-700 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">
                    {editingStaff ? "Edit Member" : "Add New Member"}
                  </CardTitle>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setShowStaffForm(false); setEditingStaff(null); }}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs mb-1 block">First Name *</Label>
                    <Input
                      value={editingStaff ? editingStaff.firstName : newStaff.firstName}
                      onChange={(e) => {
                        if (editingStaff) {
                          setEditingStaff({ ...editingStaff, firstName: e.target.value });
                        } else {
                          setNewStaff({ ...newStaff, firstName: e.target.value });
                        }
                      }}
                      placeholder="John"
                    />
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">Last Name *</Label>
                    <Input
                      value={editingStaff ? editingStaff.lastName : newStaff.lastName}
                      onChange={(e) => {
                        if (editingStaff) {
                          setEditingStaff({ ...editingStaff, lastName: e.target.value });
                        } else {
                          setNewStaff({ ...newStaff, lastName: e.target.value });
                        }
                      }}
                      placeholder="Doe"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs mb-1 block">Email</Label>
                    <Input
                      type="email"
                      value={editingStaff ? editingStaff.email || "" : newStaff.email}
                      onChange={(e) => {
                        if (editingStaff) {
                          setEditingStaff({ ...editingStaff, email: e.target.value });
                        } else {
                          setNewStaff({ ...newStaff, email: e.target.value });
                        }
                      }}
                      placeholder="john.doe@ksyk.fi"
                    />
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">Phone</Label>
                    <Input
                      value={editingStaff ? editingStaff.phone || "" : newStaff.phone}
                      onChange={(e) => {
                        if (editingStaff) {
                          setEditingStaff({ ...editingStaff, phone: e.target.value });
                        } else {
                          setNewStaff({ ...newStaff, phone: e.target.value });
                        }
                      }}
                      placeholder="+358 40 123 4567"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs mb-1 block">Position</Label>
                    <Input
                      value={editingStaff ? editingStaff.position || "" : newStaff.position}
                      onChange={(e) => {
                        if (editingStaff) {
                          setEditingStaff({ ...editingStaff, position: e.target.value });
                        } else {
                          setNewStaff({ ...newStaff, position: e.target.value });
                        }
                      }}
                      placeholder="Teacher"
                    />
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">Position (EN)</Label>
                    <Input
                      value={editingStaff ? editingStaff.positionEn || "" : newStaff.positionEn}
                      onChange={(e) => {
                        if (editingStaff) {
                          setEditingStaff({ ...editingStaff, positionEn: e.target.value });
                        } else {
                          setNewStaff({ ...newStaff, positionEn: e.target.value });
                        }
                      }}
                      placeholder="Teacher"
                    />
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">Position (FI)</Label>
                    <Input
                      value={editingStaff ? editingStaff.positionFi || "" : newStaff.positionFi}
                      onChange={(e) => {
                        if (editingStaff) {
                          setEditingStaff({ ...editingStaff, positionFi: e.target.value });
                        } else {
                          setNewStaff({ ...newStaff, positionFi: e.target.value });
                        }
                      }}
                      placeholder="Opettaja"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs mb-1 block">Department</Label>
                    <Input
                      value={editingStaff ? editingStaff.department || "" : newStaff.department}
                      onChange={(e) => {
                        if (editingStaff) {
                          setEditingStaff({ ...editingStaff, department: e.target.value });
                        } else {
                          setNewStaff({ ...newStaff, department: e.target.value });
                        }
                      }}
                      placeholder="Music"
                    />
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">Department (EN)</Label>
                    <Input
                      value={editingStaff ? editingStaff.departmentEn || "" : newStaff.departmentEn}
                      onChange={(e) => {
                        if (editingStaff) {
                          setEditingStaff({ ...editingStaff, departmentEn: e.target.value });
                        } else {
                          setNewStaff({ ...newStaff, departmentEn: e.target.value });
                        }
                      }}
                      placeholder="Music"
                    />
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">Department (FI)</Label>
                    <Input
                      value={editingStaff ? editingStaff.departmentFi || "" : newStaff.departmentFi}
                      onChange={(e) => {
                        if (editingStaff) {
                          setEditingStaff({ ...editingStaff, departmentFi: e.target.value });
                        } else {
                          setNewStaff({ ...newStaff, departmentFi: e.target.value });
                        }
                      }}
                      placeholder="Musiikki"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Switch
                    id="staff-active"
                    checked={editingStaff ? editingStaff.isActive : newStaff.isActive}
                    onCheckedChange={(checked) => {
                      if (editingStaff) setEditingStaff({ ...editingStaff, isActive: checked });
                      else setNewStaff({ ...newStaff, isActive: checked });
                    }}
                  />
                  <Label htmlFor="staff-active" className="text-sm cursor-pointer select-none">Active</Label>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" size="sm" className="h-8 text-xs"
                    onClick={() => { setShowStaffForm(false); setEditingStaff(null); }}>
                    Cancel
                  </Button>
                  <Button size="sm" className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700"
                    disabled={createStaffMutation.isPending || updateStaffMutation.isPending}
                    onClick={editingStaff ? handleUpdateStaff : handleCreateStaff}>
                    {(createStaffMutation.isPending || updateStaffMutation.isPending)
                      ? <><span className="h-3 w-3 mr-1.5 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block" />Saving…</>
                      : <><Save className="h-3.5 w-3.5 mr-1.5" />{editingStaff ? "Update" : "Add"} Member</>}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Staff Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Total", value: staff.length, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30", Icon: Users },
              { label: "Active", value: staff.filter((s: Staff) => s.isActive).length, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30", Icon: Users },
              { label: "Departments", value: new Set(staff.map((s: Staff) => s.department).filter(Boolean)).size, color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-950/30", Icon: Building },
              { label: "Positions", value: new Set(staff.map((s: Staff) => s.position).filter(Boolean)).size, color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-950/30", Icon: Layers },
            ].map(({ label, value, color, bg, Icon }) => (
              <div key={label} className={`rounded-xl ${bg} p-4 flex items-center gap-3`}>
                <Icon className={`h-5 w-5 shrink-0 ${color}`} />
                <div>
                  <p className="text-xs text-muted-foreground font-medium">{label}</p>
                  <p className={`text-2xl font-bold tabular-nums ${color}`}>{value}</p>
                </div>
              </div>
            ))}
          </div>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription className="text-xs">
                  {staff.length === 0
                    ? "No members yet"
                    : `${staff.length} member${staff.length === 1 ? "" : "s"}`}
                </CardDescription>
                <Button
                  size="sm"
                  className="h-8 bg-blue-600 hover:bg-blue-700 text-xs"
                  onClick={() => {
                    setShowStaffForm(true);
                    setEditingStaff(null);
                    setNewStaff({ firstName: "", lastName: "", email: "", phone: "", position: "", positionEn: "", positionFi: "", department: "", departmentEn: "", departmentFi: "", bio: "", bioEn: "", bioFi: "", isActive: true });
                  }}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add Member
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {staff.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-10 text-center">
                  <Users className="h-10 w-10 text-gray-300 dark:text-gray-700" />
                  <p className="text-sm font-medium text-muted-foreground">No staff members yet</p>
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700 h-8 text-xs"
                    onClick={() => { setShowStaffForm(true); setEditingStaff(null); }}>
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    Add first member
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {(staff as Staff[]).map((member) => (
                    <div key={member.id} className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border border-transparent hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:border-gray-200 dark:hover:border-gray-700 transition-all">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white text-xs font-bold shadow-sm">
                          {(member.firstName?.[0] ?? "").toUpperCase()}{(member.lastName?.[0] ?? "").toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                            {member.firstName} {member.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {[member.position, member.department].filter(Boolean).join(" · ") || "—"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge variant={member.isActive ? "default" : "secondary"} className={`text-[10px] px-1.5 ${member.isActive ? "bg-emerald-500 hover:bg-emerald-500" : ""}`}>
                          {member.isActive ? "Active" : "Inactive"}
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => { setEditingStaff(member); setShowStaffForm(true); }}
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        {confirmDeleteStaffId === member.id ? (
                          <>
                            <span className="text-xs text-red-600 dark:text-red-400 font-medium">Delete?</span>
                            <Button size="sm" className="h-7 px-2 text-xs bg-red-600 hover:bg-red-700 text-white"
                              onClick={() => { deleteStaffMutation.mutate(member.id); setConfirmDeleteStaffId(null); }}>
                              Yes
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 px-2 text-xs"
                              onClick={() => setConfirmDeleteStaffId(null)}>No</Button>
                          </>
                        ) : (
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                            onClick={() => handleDeleteStaff(member.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="announcements" className="mt-0 space-y-6">
          <AnnouncementManager />
        </TabsContent>

        <TabsContent value="notifications" className="mt-0 space-y-6">
          <NotificationsPanel queryClient={queryClient} toast={toast} announcements={announcements as Announcement[]} navigate={navigate} />
        </TabsContent>

        {/* v1.71.0: feedback folded into "insights" tab; slug redirected via URL_TO_TAB */}

        {isOwner && (
          <TabsContent value="beacons" className="mt-0 space-y-6">
            <BeaconSurveyor />
          </TabsContent>
        )}

        {isOwner && (
          <TabsContent value="2fa" className="mt-0 space-y-6">
            <TwoFactorAuth />
          </TabsContent>
        )}

        {isOwner && (
          <TabsContent value="settings" className="mt-0 space-y-6">
            <AppSettingsManager />

          {/* Danger Zone - Complete Data Cleanup */}
          <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30">
            <CardHeader>
              <CardTitle className="text-red-800 dark:text-red-300 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Danger Zone - Complete Data Cleanup
              </CardTitle>
              <CardDescription className="text-red-700 dark:text-red-400">
                ⚠️ This will permanently delete ALL buildings, rooms, hallways, stairs, announcements, and staff data. This action cannot be undone!
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert className="border-red-300 dark:border-red-700 bg-red-100 dark:bg-red-950/50">
                  <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                  <AlertDescription className="text-red-800 dark:text-red-300">
                    <strong>WARNING:</strong> This will completely empty the map and remove all data:
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>All buildings and their floor plans</li>
                      <li>All rooms, hallways, and stairs</li>
                      <li>All announcements and staff information</li>
                      <li>All map data and configurations</li>
                    </ul>
                  </AlertDescription>
                </Alert>
                
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="danger-confirm" className="text-xs font-semibold text-red-700 dark:text-red-400">
                      Type <code className="font-mono bg-red-100 dark:bg-red-950/50 px-1 rounded">DELETE_EVERYTHING</code> to unlock
                    </Label>
                    <Input
                      id="danger-confirm"
                      value={dangerInput}
                      onChange={(e) => setDangerInput(e.target.value)}
                      placeholder="Type exactly to unlock…"
                      className="border-red-300 dark:border-red-700 focus-visible:ring-red-400 font-mono text-sm"
                      disabled={dangerDeleting}
                    />
                  </div>
                  <Button
                    variant="destructive"
                    size="lg"
                    className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-40"
                    disabled={dangerInput !== "DELETE_EVERYTHING" || dangerDeleting}
                    onClick={async () => {
                      setDangerDeleting(true);
                      try {
                        const _adminTok = localStorage.getItem('ksyk_admin_token');
                        const response = await fetch('/api/admin/cleanup-all', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            ...(_adminTok ? { 'Authorization': `Bearer ${_adminTok}` } : {}),
                          },
                          credentials: 'include',
                          body: JSON.stringify({ confirmDelete: 'DELETE_EVERYTHING' })
                        });
                        const result = await response.json();
                        if (response.ok) {
                          toast({
                            title: "All data deleted",
                            description: `Buildings: ${result.deleted?.buildings ?? 0} · Rooms: ${result.deleted?.rooms ?? 0} · Staff: ${result.deleted?.staff ?? 0}`,
                          });
                          queryClient.invalidateQueries({ queryKey: ["buildings"] });
                          queryClient.invalidateQueries({ queryKey: ["rooms"] });
                          queryClient.invalidateQueries({ queryKey: ["announcements"] });
                          queryClient.invalidateQueries({ queryKey: ["staff"] });
                          setDangerInput("");
                        } else {
                          toast({ title: "Delete failed", description: result.message, variant: "destructive" });
                        }
                      } catch (error: any) {
                        toast({ title: "Error", description: error.message, variant: "destructive" });
                      } finally {
                        setDangerDeleting(false);
                      }
                    }}
                  >
                    {dangerDeleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
                    DELETE ALL MAP DATA
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        )}
          </div>
        </div>
      </Tabs>
    </div>
  );
}