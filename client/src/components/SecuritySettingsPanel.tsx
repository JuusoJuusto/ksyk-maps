/**
 * KSYK Maps — Security & Access Control admin panel.
 *
 * Everything that controls who can use the map lives here. The owner can
 * preview the current decision for a hypothetical user without affecting
 * real traffic (dry-run mode).
 */

import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useSecuritySettings, saveSecurityToServer, loadSecurityFromServer } from "@/hooks/useSecuritySettings";
import { evaluateAccess } from "@/lib/accessControl";
import {
  DAY_KEYS,
  DAY_LABELS,
  DEFAULT_SECURITY_SETTINGS,
  type AccessTier,
  type DayKey,
  type Holiday,
  type IpRule,
  type SecuritySettings,
  type UserException,
} from "@/lib/securitySettings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Shield, Clock, Wifi, Mail, UserCheck, Plus, Trash2, Save,
  Calendar, AlertTriangle, CheckCircle2, FlaskConical, Inbox,
  XCircle, RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TIER_OPTIONS: { value: AccessTier; label: string; color: string }[] = [
  { value: "full",       label: "Full access",       color: "text-emerald-600 dark:text-emerald-400" },
  { value: "restricted", label: "Restricted",        color: "text-amber-600 dark:text-amber-400" },
  { value: "blocked",    label: "Blocked",           color: "text-red-600 dark:text-red-400" },
];

function TierSelect({ value, onChange }: { value: AccessTier; onChange: (v: AccessTier) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as AccessTier)}
      className="h-9 rounded-lg border border-input bg-background px-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
    >
      {TIER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function genId() {
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function SecuritySettingsPanel() {
  const { settings, setAll, reset } = useSecuritySettings();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  /** Edit local draft so we can save / discard atomically. */
  const [draft, setDraft] = useState<SecuritySettings>(settings);
  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(settings), [draft, settings]);

  // Poll every 2 seconds so new access requests appear live.
  useEffect(() => {
    const id = setInterval(loadSecurityFromServer, 2000);
    return () => clearInterval(id);
  }, []);

  // When the server delivers new accessRequests, sync only that field
  // into draft so the inbox stays live without triggering false-dirty.
  useEffect(() => {
    setDraft(prev => {
      if (JSON.stringify(prev.accessRequests) === JSON.stringify(settings.accessRequests)) return prev;
      return { ...prev, accessRequests: settings.accessRequests };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.accessRequests]);

  const patch =<K extends keyof SecuritySettings>(key: K, value: SecuritySettings[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveSecurityToServer(draft);
      setAll(draft);
      toast({
        title: "Saved",
        description: "Live for all users — propagates within 60 s.",
      });
    } catch (e: any) {
      if (e?.status === 401) {
        toast({
          title: "Session expired",
          description: "Your admin session has expired. Sign out and sign back in, then try again.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Save failed",
          description: e?.message || "Network or auth error. Try again.",
          variant: "destructive",
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => setDraft(settings);

  const handleResetDefaults = () => {
    if (!confirm("Reset all security settings to defaults? This will not delete pending access requests.")) return;
    const next = { ...DEFAULT_SECURITY_SETTINGS, accessRequests: settings.accessRequests };
    setDraft(next);
    reset();
  };

  return (
    <div className="space-y-5">
      {/* Hero strip */}
      <Card className="border-0 shadow-md overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-600" />
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-sm">
              <Shield className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-base">Security & access</CardTitle>
              <CardDescription className="text-xs">
                Control who can use the map, when, and from where. Owner / admin accounts always bypass these rules.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Label htmlFor="sec-master" className="text-xs font-semibold">
                {draft.enabled ? "Active" : "Disabled"}
              </Label>
              <Switch
                id="sec-master"
                checked={draft.enabled}
                onCheckedChange={(v) => patch("enabled", v)}
              />
            </div>
          </div>
        </CardHeader>
        {!draft.enabled && (
          <CardContent className="pt-0">
            <Alert variant="default" className="border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-xs text-amber-900 dark:text-amber-200">
                Security gate is currently <strong>disabled</strong> — every visitor gets full access.
              </AlertDescription>
            </Alert>
          </CardContent>
        )}
      </Card>

      {/* Decision preview — always visible so you know what you're shipping. */}
      <DecisionPreview draft={draft} />

      {/* Time window */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-500/15 text-orange-600 dark:text-orange-400">
              <Clock className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-sm">Time-based access</CardTitle>
              <CardDescription className="text-xs">School hours, weekends, holidays.</CardDescription>
            </div>
            <Switch checked={draft.timeWindowEnabled} onCheckedChange={(v) => patch("timeWindowEnabled", v)} />
          </div>
        </CardHeader>
        {draft.timeWindowEnabled && (
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {DAY_KEYS.map((day) => (
                <DayRow
                  key={day}
                  day={day}
                  win={draft.schedule[day]}
                  onChange={(win) =>
                    patch("schedule", { ...draft.schedule, [day]: win })
                  }
                />
              ))}
            </div>
            <div className="flex items-center gap-3 pt-2 border-t border-gray-200 dark:border-gray-800">
              <Label className="text-xs font-semibold shrink-0">Outside hours →</Label>
              <TierSelect value={draft.outsideHoursTier} onChange={(v) => patch("outsideHoursTier", v)} />
              <span className="text-xs text-muted-foreground">
                Applied when a non-admin visits outside the listed hours or on a holiday.
              </span>
            </div>
            <HolidayManager
              holidays={draft.holidays}
              onChange={(h) => patch("holidays", h)}
            />
          </CardContent>
        )}
      </Card>

      {/* IP gate */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400">
              <Wifi className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-sm">Network / IP gate</CardTitle>
              <CardDescription className="text-xs">Only allow the school Wi-Fi (or any list of CIDR ranges).</CardDescription>
            </div>
            <Switch checked={draft.ipGateEnabled} onCheckedChange={(v) => patch("ipGateEnabled", v)} />
          </div>
        </CardHeader>
        {draft.ipGateEnabled && (
          <CardContent className="space-y-3">
            <IpAllowlistEditor rules={draft.ipAllowlist} onChange={(r) => patch("ipAllowlist", r)} />
            <div className="flex items-center gap-3 pt-2 border-t border-gray-200 dark:border-gray-800">
              <Label className="text-xs font-semibold shrink-0">Off-network →</Label>
              <TierSelect value={draft.offNetworkTier} onChange={(v) => patch("offNetworkTier", v)} />
            </div>
          </CardContent>
        )}
      </Card>

      {/* Login gate */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/15 text-purple-600 dark:text-purple-400">
              <Mail className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-sm">School-email login</CardTitle>
              <CardDescription className="text-xs">
                Require sign-in with a @ksyk.fi (or any) domain via Microsoft.
              </CardDescription>
            </div>
            <Switch checked={draft.loginGateEnabled} onCheckedChange={(v) => patch("loginGateEnabled", v)} />
          </div>
        </CardHeader>
        {draft.loginGateEnabled && (
          <CardContent className="space-y-4">
            <DomainEditor
              domains={draft.allowedEmailDomains}
              onChange={(d) => patch("allowedEmailDomains", d)}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Signed-in tier</Label>
                <TierSelect value={draft.loggedInTier} onChange={(v) => patch("loggedInTier", v)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Guest tier</Label>
                <TierSelect value={draft.guestTier} onChange={(v) => patch("guestTier", v)} />
              </div>
            </div>

            <div className="pt-2 border-t border-gray-200 dark:border-gray-800">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
                Features disabled at "Restricted" tier
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {(Object.keys(draft.restrictedDisabledFeatures) as Array<keyof typeof draft.restrictedDisabledFeatures>).map((k) => (
                  <label key={k} className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 cursor-pointer text-xs">
                    <Switch
                      checked={draft.restrictedDisabledFeatures[k]}
                      onCheckedChange={(v) =>
                        patch("restrictedDisabledFeatures", { ...draft.restrictedDisabledFeatures, [k]: v })
                      }
                    />
                    <span className="capitalize">{k.replace(/([A-Z])/g, " $1")}</span>
                  </label>
                ))}
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Exceptions */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <UserCheck className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-sm">Per-user exceptions</CardTitle>
              <CardDescription className="text-xs">
                Override the computed tier for specific users (e.g. give a guest full access).
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ExceptionsEditor
            exceptions={draft.userExceptions}
            onChange={(ex) => patch("userExceptions", ex)}
          />
        </CardContent>
      </Card>

      {/* Access requests inbox */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-400">
              <Inbox className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-sm">Access requests</CardTitle>
              <CardDescription className="text-xs">
                Submitted from the lockout screen. Approving creates a "full" exception for that email.
              </CardDescription>
            </div>
            <Badge variant="secondary" className="text-[10px]">
              {draft.accessRequests.filter((r) => r.status === "pending").length} pending
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <RequestsInbox
            requests={draft.accessRequests}
            onApprove={(req) => {
              const next = draft.accessRequests.map((r) => r.id === req.id ? { ...r, status: "approved" as const } : r);
              const ex: UserException = {
                id: genId(), email: req.email, tier: "full",
                note: req.reason || "Approved from request inbox",
              };
              patch("userExceptions", [...draft.userExceptions, ex]);
              patch("accessRequests", next);
            }}
            onDeny={(req) => {
              patch("accessRequests", draft.accessRequests.map((r) => r.id === req.id ? { ...r, status: "denied" as const } : r));
            }}
            onClear={() => patch("accessRequests", draft.accessRequests.filter((r) => r.status === "pending"))}
          />
        </CardContent>
      </Card>

      {/* Lockout message + dry run */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Lockout screen</CardTitle>
          <CardDescription className="text-xs">Shown to blocked users.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Label className="text-xs font-semibold">Message</Label>
          <textarea
            value={draft.lockoutMessage}
            onChange={(e) => patch("lockoutMessage", e.target.value)}
            rows={3}
            className="w-full text-sm p-2.5 border border-input bg-background rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none resize-y"
          />
          <label className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 cursor-pointer">
            <FlaskConical className="h-4 w-4 text-amber-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">Dry-run mode</p>
              <p className="text-[11px] text-amber-700 dark:text-amber-300/80">
                Logs the decision but doesn't enforce it. Use to test rules safely.
              </p>
            </div>
            <Switch checked={draft.dryRun} onCheckedChange={(v) => patch("dryRun", v)} />
          </label>
        </CardContent>
      </Card>

      {/* Bottom action bar — sticky-ish via mt-auto */}
      <div className={cn(
        "sticky bottom-0 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-t border-gray-200 dark:border-gray-800 flex items-center gap-2 z-10",
        dirty && "shadow-2xl",
      )}>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleResetDefaults}
          className="text-xs gap-1.5 text-muted-foreground hover:text-red-600"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Reset to defaults
        </Button>
        <div className="flex-1" />
        {dirty && (
          <Button variant="outline" size="sm" onClick={handleDiscard}>Discard</Button>
        )}
        <Button
          size="sm"
          onClick={handleSave}
          disabled={!dirty || saving}
          className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
        >
          <Save className="h-3.5 w-3.5" />
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}

/* ── Sub-components ───────────────────────────────────────────────────── */

function DecisionPreview({ draft }: { draft: SecuritySettings }) {
  const [previewEmail, setPreviewEmail] = useState("");
  const [previewIp, setPreviewIp] = useState("");
  const [previewWhen, setPreviewWhen] = useState<"now" | "after-hours" | "weekend">("now");

  const previewDate = useMemo(() => {
    const d = new Date();
    if (previewWhen === "after-hours") d.setHours(22, 0, 0, 0);
    if (previewWhen === "weekend") {
      const dayShift = (6 - d.getDay() + 7) % 7 || 7;
      d.setDate(d.getDate() + dayShift);
    }
    return d;
  }, [previewWhen]);

  const decision = useMemo(
    () => evaluateAccess({
      settings: draft,
      user: previewEmail ? { email: previewEmail, role: "student" } : null,
      ip: previewIp || null,
      now: previewDate,
    }),
    [draft, previewEmail, previewIp, previewDate],
  );

  const tierColor = decision.tier === "full" ? "emerald" : decision.tier === "restricted" ? "amber" : "red";

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-4 w-4 text-blue-500" />
          <CardTitle className="text-sm">Live decision preview</CardTitle>
        </div>
        <CardDescription className="text-xs">
          Test how a specific user / IP / time would be treated under your current draft.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Input
            placeholder="user@ksyk.fi"
            value={previewEmail}
            onChange={(e) => setPreviewEmail(e.target.value)}
            className="h-9 text-sm"
          />
          <Input
            placeholder="192.168.1.10"
            value={previewIp}
            onChange={(e) => setPreviewIp(e.target.value)}
            className="h-9 text-sm font-mono"
          />
          <select
            value={previewWhen}
            onChange={(e) => setPreviewWhen(e.target.value as typeof previewWhen)}
            className="h-9 rounded-lg border border-input bg-background px-2.5 text-sm"
          >
            <option value="now">Right now</option>
            <option value="after-hours">After hours (10pm)</option>
            <option value="weekend">Saturday morning</option>
          </select>
        </div>
        <div className={cn(
          "flex items-start gap-3 p-3 rounded-lg border",
          tierColor === "emerald" && "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50",
          tierColor === "amber" && "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50",
          tierColor === "red" && "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/50",
        )}>
          <span className={cn(
            "shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
            tierColor === "emerald" && "bg-emerald-500 text-white",
            tierColor === "amber" && "bg-amber-500 text-white",
            tierColor === "red" && "bg-red-500 text-white",
          )}>
            {decision.tier}
          </span>
          <p className="text-xs flex-1 min-w-0">
            {decision.reason}
            {decision.nextOpen && <span className="block mt-1 text-muted-foreground">Opens {decision.nextOpen.en}</span>}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function DayRow({ day, win, onChange }: { day: DayKey; win: SecuritySettings["schedule"][DayKey]; onChange: (w: SecuritySettings["schedule"][DayKey]) => void }) {
  const closed = win === null;
  return (
    <div className="flex items-center gap-3">
      <span className="w-12 text-xs font-bold text-muted-foreground">{DAY_LABELS[day]}</span>
      <Switch
        checked={!closed}
        onCheckedChange={(v) => onChange(v ? { open: "07:30", close: "17:00" } : null)}
      />
      {closed ? (
        <span className="text-xs text-muted-foreground italic flex-1">Closed</span>
      ) : (
        <div className="flex items-center gap-2 flex-1">
          <Input
            type="time"
            value={win?.open ?? "07:30"}
            onChange={(e) => win && onChange({ ...win, open: e.target.value })}
            className="h-8 w-24 text-sm font-mono"
          />
          <span className="text-xs text-muted-foreground">→</span>
          <Input
            type="time"
            value={win?.close ?? "17:00"}
            onChange={(e) => win && onChange({ ...win, close: e.target.value })}
            className="h-8 w-24 text-sm font-mono"
          />
        </div>
      )}
    </div>
  );
}

function HolidayManager({ holidays, onChange }: { holidays: Holiday[]; onChange: (h: Holiday[]) => void }) {
  const [name, setName] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  const add = () => {
    if (!name.trim() || !start || !end) return;
    onChange([...holidays, { id: genId(), name: name.trim(), start, end: end || start }]);
    setName(""); setStart(""); setEnd("");
  };

  const remove = (id: string) => onChange(holidays.filter((h) => h.id !== id));

  return (
    <div className="pt-2 border-t border-gray-200 dark:border-gray-800 space-y-2">
      <div className="flex items-center gap-2 mb-1">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Holidays</Label>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-[1fr,auto,auto,auto] gap-2 items-end">
        <Input placeholder="e.g. Autumn break" value={name} onChange={(e) => setName(e.target.value)} className="h-8 text-sm" />
        <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="h-8 text-sm" />
        <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="h-8 text-sm" />
        <Button size="sm" variant="outline" onClick={add} className="h-8 text-xs gap-1"><Plus className="h-3.5 w-3.5" />Add</Button>
      </div>
      {holidays.length > 0 && (
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {holidays.map((h) => (
            <div key={h.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800/40 text-xs">
              <span className="font-medium flex-1 truncate">{h.name}</span>
              <span className="text-muted-foreground font-mono shrink-0">{h.start} → {h.end}</span>
              <Button size="sm" variant="ghost" onClick={() => remove(h.id)} className="h-6 w-6 p-0 text-red-500 hover:text-red-700">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function IpAllowlistEditor({ rules, onChange }: { rules: IpRule[]; onChange: (r: IpRule[]) => void }) {
  const [cidr, setCidr] = useState("");
  const [label, setLabel] = useState("");

  const add = () => {
    if (!cidr.trim()) return;
    onChange([...rules, { id: genId(), cidr: cidr.trim(), label: label.trim() || undefined }]);
    setCidr(""); setLabel("");
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 sm:grid-cols-[1fr,1fr,auto] gap-2">
        <Input placeholder="e.g. 10.0.0.0/8" value={cidr} onChange={(e) => setCidr(e.target.value)} className="h-9 text-sm font-mono" />
        <Input placeholder="Label (school Wi-Fi)" value={label} onChange={(e) => setLabel(e.target.value)} className="h-9 text-sm" />
        <Button variant="outline" onClick={add} className="h-9 text-xs gap-1"><Plus className="h-3.5 w-3.5" />Add</Button>
      </div>
      {rules.length === 0 ? (
        <p className="text-xs text-muted-foreground italic py-2 text-center">
          No rules — IP gate will block everyone while enabled.
        </p>
      ) : (
        <div className="space-y-1">
          {rules.map((r) => (
            <div key={r.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800/40 text-xs">
              <code className="font-mono shrink-0 px-1.5 py-0.5 rounded bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400">{r.cidr}</code>
              {r.label && <span className="text-muted-foreground truncate">{r.label}</span>}
              <span className="flex-1" />
              <Button size="sm" variant="ghost" onClick={() => onChange(rules.filter((x) => x.id !== r.id))} className="h-6 w-6 p-0 text-red-500 hover:text-red-700">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DomainEditor({ domains, onChange }: { domains: string[]; onChange: (d: string[]) => void }) {
  const [val, setVal] = useState("");
  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold">Allowed email domains</Label>
      <div className="flex flex-wrap gap-1.5">
        {domains.map((d, i) => (
          <Badge key={i} variant="secondary" className="text-xs gap-1 pr-1">
            {d}
            <button onClick={() => onChange(domains.filter((_, j) => j !== i))} className="ml-0.5 text-muted-foreground hover:text-red-500">
              <XCircle className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          placeholder="@ksyk.fi"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (val.trim()) { onChange([...domains, val.trim()]); setVal(""); } } }}
          className="h-8 text-sm font-mono"
        />
        <Button variant="outline" size="sm" onClick={() => { if (val.trim()) { onChange([...domains, val.trim()]); setVal(""); } }} className="h-8 text-xs gap-1">
          <Plus className="h-3.5 w-3.5" />Add
        </Button>
      </div>
    </div>
  );
}

function ExceptionsEditor({ exceptions, onChange }: { exceptions: UserException[]; onChange: (e: UserException[]) => void }) {
  const [email, setEmail] = useState("");
  const [tier, setTier] = useState<AccessTier>("full");
  const [note, setNote] = useState("");

  const add = () => {
    if (!email.trim()) return;
    onChange([...exceptions, { id: genId(), email: email.trim().toLowerCase(), tier, note: note.trim() || undefined }]);
    setEmail(""); setNote("");
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-[1fr,auto,1fr,auto] gap-2 items-end">
        <Input placeholder="user@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-9 text-sm" />
        <TierSelect value={tier} onChange={setTier} />
        <Input placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} className="h-9 text-sm" />
        <Button variant="outline" onClick={add} className="h-9 text-xs gap-1"><Plus className="h-3.5 w-3.5" />Add</Button>
      </div>
      {exceptions.length === 0 ? (
        <p className="text-xs text-muted-foreground italic py-2 text-center">No exceptions yet.</p>
      ) : (
        <div className="space-y-1 max-h-60 overflow-y-auto">
          {exceptions.map((ex) => (
            <div key={ex.id} className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-gray-50 dark:bg-gray-800/40 text-xs">
              <span className="font-mono text-blue-600 dark:text-blue-400 truncate flex-1">{ex.email}</span>
              <Badge
                variant="secondary"
                className={cn(
                  "text-[10px] shrink-0",
                  ex.tier === "full" && "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
                  ex.tier === "restricted" && "bg-amber-500/15 text-amber-700 dark:text-amber-300",
                  ex.tier === "blocked" && "bg-red-500/15 text-red-700 dark:text-red-300",
                )}
              >
                {ex.tier}
              </Badge>
              {ex.note && <span className="text-muted-foreground truncate max-w-[140px]">{ex.note}</span>}
              <Button size="sm" variant="ghost" onClick={() => onChange(exceptions.filter((x) => x.id !== ex.id))} className="h-6 w-6 p-0 text-red-500 hover:text-red-700">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RequestsInbox({ requests, onApprove, onDeny, onClear }: {
  requests: SecuritySettings["accessRequests"];
  onApprove: (r: SecuritySettings["accessRequests"][number]) => void;
  onDeny: (r: SecuritySettings["accessRequests"][number]) => void;
  onClear: () => void;
}) {
  if (requests.length === 0) {
    return <p className="text-xs text-muted-foreground italic py-3 text-center">No access requests yet.</p>;
  }
  return (
    <div className="space-y-2">
      <div className="space-y-1.5 max-h-72 overflow-y-auto">
        {requests.map((r) => (
          <div key={r.id} className={cn(
            "flex items-start gap-3 p-2.5 rounded-lg border",
            r.status === "pending" && "bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/50 dark:border-amber-900/30",
            r.status === "approved" && "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/50 dark:border-emerald-900/30",
            r.status === "denied" && "bg-gray-50 dark:bg-gray-800/40 border-gray-200/50 dark:border-gray-800/50 opacity-60",
          )}>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate">{r.email}</p>
              {r.reason && <p className="text-[11px] text-muted-foreground truncate">{r.reason}</p>}
              <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(r.createdAt).toLocaleString()}</p>
            </div>
            {r.status === "pending" ? (
              <div className="flex gap-1 shrink-0">
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-emerald-600 border-emerald-300" onClick={() => onApprove(r)}>
                  <CheckCircle2 className="h-3 w-3" />Approve
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs text-red-600" onClick={() => onDeny(r)}>
                  Deny
                </Button>
              </div>
            ) : (
              <Badge variant="secondary" className={cn(
                "text-[10px] shrink-0 capitalize",
                r.status === "approved" && "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
                r.status === "denied" && "bg-red-500/15 text-red-700 dark:text-red-300",
              )}>{r.status}</Badge>
            )}
          </div>
        ))}
      </div>
      <Button variant="ghost" size="sm" onClick={onClear} className="text-xs text-muted-foreground">
        Clear processed
      </Button>
    </div>
  );
}
