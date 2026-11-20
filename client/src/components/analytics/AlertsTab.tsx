/**
 * Alerts — owner-only. Where crashes, error spikes, brute-force sign-ins and
 * new tickets are delivered (Slack + the owner's phone) and how sensitive each
 * rule is. The Slack webhook is write-only: the server never sends it back.
 */
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { EmptyState, Masthead, PANEL, adminGet, timeAgo } from "./shared";

interface Rules {
  crash: { enabled: boolean; cooldownMin: number };
  newError: { enabled: boolean };
  errorSpike: { enabled: boolean; threshold: number; windowMin: number; cooldownMin: number };
  loginFailures: { enabled: boolean; threshold: number; windowMin: number };
  adminLogin: { enabled: boolean };
  ticket: { enabled: boolean };
  dailyDigest: { enabled: boolean };
}
interface Settings {
  slackEnabled: boolean;
  pushEnabled: boolean;
  rules: Rules;
  slackConfigured: boolean;
  slackSource: "settings" | "env" | null;
  slackHint: string | null;
  fcmConfigured: boolean;
  cronConfigured: boolean;
}
interface Device { id: string; label: string | null; appVersion: string | null; updatedAt: string }
interface HistoryRow { id: string; kind: string; severity: string; title: string; body: string | null; slack: string | null; pushSent: number; pushFailed: number; createdAt: string }
interface AlertsResponse { settings: Settings; devices: Device[]; history: HistoryRow[] }
interface DeliveryResult { status: string; slack?: string; push?: { sent: number; failed: number }; error?: string }

type RuleKey = keyof Rules;
const RULES: { key: RuleKey; title: string; desc: string; fields?: { k: string; label: string; unit?: string; min: number; max: number }[] }[] = [
  { key: "crash", title: "App crash", desc: "The Android app or the website reports a fatal crash.", fields: [{ k: "cooldownMin", label: "Quiet for", unit: "min", min: 1, max: 1440 }] },
  { key: "newError", title: "New error", desc: "An error that has not been seen in the last 30 days." },
  { key: "errorSpike", title: "Error spike", desc: "Too many errors in a short window.", fields: [
    { k: "threshold", label: "Errors", min: 1, max: 1000 },
    { k: "windowMin", label: "within", unit: "min", min: 1, max: 1440 },
    { k: "cooldownMin", label: "quiet for", unit: "min", min: 1, max: 1440 },
  ] },
  { key: "loginFailures", title: "Failed admin sign-ins", desc: "Several wrong passwords in a row: someone may be guessing.", fields: [
    { k: "threshold", label: "Attempts", min: 2, max: 100 },
    { k: "windowMin", label: "within", unit: "min", min: 1, max: 1440 },
  ] },
  { key: "adminLogin", title: "Every admin sign-in", desc: "A ping whenever an admin signs in from a new address. Off by default." },
  { key: "ticket", title: "New support ticket", desc: "Someone files a ticket from the app or website." },
  { key: "dailyDigest", title: "Daily digest", desc: "Yesterday in numbers plus the top errors, every morning." },
];

const KIND_LABEL: Record<string, string> = {
  crash: "Crash", new_error: "New error", error_spike: "Spike", login_failures: "Sign-ins",
  admin_login: "Sign-in", ticket: "Ticket", digest: "Digest", test: "Test",
};

function describe(r: DeliveryResult): string {
  if (r.status === "no_channel") return "No channel is set up yet: add a Slack webhook or register a phone first.";
  if (r.status === "error") return r.error || "Something went wrong.";
  const parts: string[] = [];
  if (r.slack) parts.push(`Slack: ${r.slack}`);
  if (r.push) parts.push(`Phones: ${r.push.sent} delivered${r.push.failed ? `, ${r.push.failed} failed` : ""}`);
  return parts.join(" · ") || r.status;
}

function Row({ title, desc, checked, onChange, children }: {
  title: string; desc: string; checked: boolean; onChange: (v: boolean) => void; children?: React.ReactNode;
}) {
  return (
    <div className="py-3.5 flex items-start gap-3">
      <Switch checked={checked} onCheckedChange={onChange} aria-label={title} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-gray-900 dark:text-white">{title}</p>
        <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5">{desc}</p>
        {children}
      </div>
    </div>
  );
}

function Btn({ children, onClick, disabled, quiet }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; quiet?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "h-9 px-3.5 rounded-md text-[13px] font-semibold disabled:opacity-50 transition-colors",
        quiet
          ? "border border-[#d5dae0] dark:border-[#2a3040] text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-900"
          : "bg-[#003d82] text-white hover:bg-[#002f66]",
      )}
    >
      {children}
    </button>
  );
}

export default function AlertsTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const q = useQuery<AlertsResponse>({
    queryKey: ["owner-alerts"],
    queryFn: () => adminGet<AlertsResponse>("/api/admin/alerts"),
    retry: false,
    refetchInterval: 30_000,
  });
  const [draft, setDraft] = useState<Pick<Settings, "slackEnabled" | "pushEnabled" | "rules"> | null>(null);
  const [hook, setHook] = useState("");

  const server = q.data?.settings;
  useEffect(() => {
    if (server && !draft) setDraft({ slackEnabled: server.slackEnabled, pushEnabled: server.pushEnabled, rules: server.rules });
  }, [server, draft]);

  const dirty = !!(server && draft && JSON.stringify(draft) !== JSON.stringify({ slackEnabled: server.slackEnabled, pushEnabled: server.pushEnabled, rules: server.rules }));

  const fail = (e: unknown) => toast({
    title: "Couldn't do that",
    description: e instanceof Error ? e.message.replace(/^\d+:\s*/, "").replace(/^\{"message":"(.*)"\}$/, "$1") : "Try again.",
    variant: "destructive",
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["owner-alerts"] });

  const save = useMutation({
    mutationFn: async (body: object) => (await apiRequest("PUT", "/api/admin/alerts/settings", body)).json(),
    onSuccess: () => { setDraft(null); setHook(""); refresh(); toast({ title: "Saved" }); },
    onError: fail,
  });
  const removeHook = useMutation({
    mutationFn: async () => (await apiRequest("DELETE", "/api/admin/alerts/slack")).json(),
    onSuccess: () => { refresh(); toast({ title: "Slack webhook removed" }); },
    onError: fail,
  });
  const send = useMutation({
    mutationFn: async (path: string) => (await apiRequest("POST", path, {})).json() as Promise<DeliveryResult>,
    onSuccess: (r) => { refresh(); toast({ title: r.status === "sent" ? "Sent" : "Not sent", description: describe(r), variant: r.status === "sent" ? undefined : "destructive" }); },
    onError: fail,
  });

  if (q.isError) {
    const forbidden = /^403/.test(q.error instanceof Error ? q.error.message : "");
    return (
      <div className={PANEL}>
        <EmptyState
          title={forbidden ? "Only the owner can manage alerts" : "Couldn't load alert settings"}
          hint={forbidden ? "Alerts hold the Slack webhook and the owner's devices, so other admins can't see them." : "Check your connection and try again."}
        />
      </div>
    );
  }
  if (!server || !draft) return <div className="h-64 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-900" />;

  const setRule = <K extends RuleKey>(key: K, patch: Partial<Rules[K]>) =>
    setDraft({ ...draft, rules: { ...draft.rules, [key]: { ...draft.rules[key], ...patch } } });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Btn onClick={() => send.mutate("/api/admin/alerts/test")} disabled={send.isPending}>Send test alert</Btn>
        <Btn quiet onClick={() => send.mutate("/api/admin/alerts/digest")} disabled={send.isPending}>Send digest now</Btn>
        <span className="text-[12px] text-gray-500 dark:text-gray-400">
          Slack {server.slackConfigured ? "connected" : "not connected"} · {q.data!.devices.length} phone{q.data!.devices.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <section className={`${PANEL} p-4`}>
          <Masthead>Slack</Masthead>
          <Row title="Send alerts to Slack" desc={server.slackConfigured ? `Connected (${server.slackHint}${server.slackSource === "env" ? ", from the server environment" : ""}).` : "Not connected yet."} checked={draft.slackEnabled} onChange={(v) => setDraft({ ...draft, slackEnabled: v })} />
          <div className="mt-1 space-y-2">
            <label className="block text-[12px] font-semibold text-gray-700 dark:text-gray-200" htmlFor="slack-hook">Incoming webhook URL</label>
            <input
              id="slack-hook"
              type="password"
              autoComplete="off"
              value={hook}
              onChange={(e) => setHook(e.target.value)}
              placeholder={server.slackConfigured ? "Paste a new URL to replace it" : "https://hooks.slack.com/services/…"}
              className="h-9 w-full px-3 rounded-md border border-[#d5dae0] dark:border-[#2a3040] bg-transparent text-[13px] font-mono focus:outline-none focus:ring-2 focus:ring-[#003d82]"
            />
            <div className="flex items-center gap-2">
              <Btn onClick={() => save.mutate({ slackWebhookUrl: hook })} disabled={!hook.trim() || save.isPending}>Connect</Btn>
              {server.slackSource === "settings" && <Btn quiet onClick={() => removeHook.mutate()} disabled={removeHook.isPending}>Remove</Btn>}
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
              In Slack open api.slack.com/apps, create an app, turn on Incoming Webhooks, add one to the channel you want, and paste its URL here. It is stored on the server and never shown again.
            </p>
          </div>
        </section>

        <section className={`${PANEL} p-4`}>
          <Masthead>Your phone</Masthead>
          <Row title="Push to my devices" desc="Alerts arrive as a notification on every phone registered below." checked={draft.pushEnabled} onChange={(v) => setDraft({ ...draft, pushEnabled: v })} />
          {!server.fcmConfigured && (
            <p className="text-[12px] text-amber-700 dark:text-amber-400 mb-2">Push is not configured on the server (FIREBASE_* variables are missing), so phones can't be notified yet.</p>
          )}
          {q.data!.devices.length === 0 ? (
            <p className="text-[12px] text-gray-500 dark:text-gray-400">
              No phone registered. In the Android app open Admin → Alerts and switch on "Notify this phone".
            </p>
          ) : (
            <ul className="divide-y divide-[#d5dae0] dark:divide-[#2a3040] text-[12px]">
              {q.data!.devices.map((d) => (
                <li key={d.id} className="py-2 flex justify-between gap-3">
                  <span className="text-gray-900 dark:text-gray-100">{d.label || "Android phone"} <span className="text-gray-400">…{d.id}</span></span>
                  <span className="text-gray-500 dark:text-gray-400 shrink-0">{d.appVersion ? `v${d.appVersion} · ` : ""}{timeAgo(d.updatedAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className={`${PANEL} p-4`}>
        <Masthead right={dirty ? <Btn onClick={() => save.mutate(draft)} disabled={save.isPending}>Save changes</Btn> : undefined}>What to alert on</Masthead>
        <div className="divide-y divide-[#d5dae0] dark:divide-[#2a3040]">
          {RULES.map((r) => (
            <Row key={r.key} title={r.title} desc={r.desc} checked={draft.rules[r.key].enabled} onChange={(v) => setRule(r.key, { enabled: v } as never)}>
              {r.fields && draft.rules[r.key].enabled && (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-2">
                  {r.fields.map((f) => (
                    <label key={f.k} className="inline-flex items-center gap-1.5 text-[12px] text-gray-600 dark:text-gray-300">
                      {f.label}
                      <input
                        type="number"
                        inputMode="numeric"
                        min={f.min}
                        max={f.max}
                        value={(draft.rules[r.key] as unknown as Record<string, number>)[f.k]}
                        onChange={(e) => setRule(r.key, { [f.k]: Number(e.target.value) } as never)}
                        className="h-7 w-16 px-2 rounded border border-[#d5dae0] dark:border-[#2a3040] bg-transparent text-[12px] tabular-nums focus:outline-none focus:ring-2 focus:ring-[#003d82]"
                      />
                      {f.unit}
                    </label>
                  ))}
                </div>
              )}
              {r.key === "dailyDigest" && draft.rules.dailyDigest.enabled && !server.cronConfigured && (
                <p className="text-[12px] text-amber-700 dark:text-amber-400 mt-2">
                  The schedule needs a CRON_SECRET environment variable on Vercel. Until it is set, use "Send digest now".
                </p>
              )}
            </Row>
          ))}
        </div>
      </section>

      <section className={`${PANEL} p-4`}>
        <Masthead>History</Masthead>
        {q.data!.history.length === 0 ? (
          <EmptyState title="No alerts sent yet" hint="Send a test alert to check that everything is connected." />
        ) : (
          <ul className="divide-y divide-[#d5dae0] dark:divide-[#2a3040]">
            {q.data!.history.map((h) => (
              <li key={h.id} className="py-2.5 flex items-start gap-3">
                <span className={cn(
                  "mt-0.5 shrink-0 w-[58px] text-center rounded px-1 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                  h.severity === "critical" ? "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                    : h.severity === "warning" ? "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                    : "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300",
                )}>{KIND_LABEL[h.kind] ?? h.kind}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] text-gray-900 dark:text-gray-100">{h.title}</span>
                  {h.body && <span className="block text-[12px] text-gray-500 dark:text-gray-400 whitespace-pre-line line-clamp-3">{h.body}</span>}
                  <span className="block text-[11px] text-gray-400 mt-0.5">
                    {timeAgo(h.createdAt)}
                    {h.slack ? ` · Slack ${h.slack}` : ""}
                    {h.pushSent || h.pushFailed ? ` · ${h.pushSent} phone${h.pushSent === 1 ? "" : "s"}${h.pushFailed ? `, ${h.pushFailed} failed` : ""}` : ""}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
