import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Globe, Bell, Wrench, Save, AlertTriangle, Settings,
  RefreshCw, Eye, EyeOff, Egg, Sparkles, Video, Calendar, Camera, Flame, Megaphone,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { getAdminHeaders } from '@/lib/adminAuth';

interface AppSettings {
  id?: string;
  appName?: string;
  appNameEn?: string;
  appNameFi?: string;
  defaultLanguage?: string;
  theme?: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
  showStats?: boolean;
  showAnnouncements?: boolean;
  enableSearch?: boolean;
  enableAnimations?: boolean;
  compactMode?: boolean;
  enableEasterEgg?: boolean;
  maintenanceMode?: boolean;
  maintenanceMessage?: string | null;
  footerTextEn?: string | null;
  footerTextFi?: string | null;
  showGetAppPopup?: boolean;
  getAppUrl?: string | null;
  // v4.7.13 — Feature toggles for recently-shipped surfaces so admins
  // can turn things off without a deploy.
  enableSessionReplay?: boolean;      // rrweb recorder on public routes
  enableCampusEvents?: boolean;       // events pin layer on the public map
  enablePanoramaSpots?: boolean;      // 360° panorama layer on the public map
  enableHeatmapForAdmins?: boolean;   // room-popularity heatmap in admin analytics
  enableAnnouncementBanner?: boolean; // top-of-map announcement carousel
  enableFooterCredits?: boolean;      // "Made by…" line in the footer
  [key: string]: any;
}

const DEFAULT_SETTINGS: AppSettings = {
  appName: 'KSYK Maps',
  appNameEn: 'KSYK Maps',
  appNameFi: 'KSYK Kartat',
  defaultLanguage: 'fi',
  theme: 'system',
  contactEmail: '',
  contactPhone: '',
  showStats: true,
  showAnnouncements: true,
  enableSearch: true,
  enableAnimations: true,
  compactMode: false,
  enableEasterEgg: true,
  maintenanceMode: false,
  maintenanceMessage: '',
  footerTextEn: '',
  footerTextFi: '',
  showGetAppPopup: false,
  getAppUrl: '/download',
  enableSessionReplay: true,
  enableCampusEvents: true,
  enablePanoramaSpots: true,
  enableHeatmapForAdmins: true,
  enableAnnouncementBanner: true,
  enableFooterCredits: true,
};

interface AppSettingsManagerProps {
  subtab?: string;
  onSubtabChange?: (tab: string) => void;
}

export default function AppSettingsManager({ subtab, onSubtabChange }: AppSettingsManagerProps = {}) {
  // v4.7.56 — tab param driven by URL (:subtab) when passed from the
  // AdminDashboard route.  Falls back to "general".
  const activeTab = subtab && ["general", "content", "features", "schedule", "maintenance"].includes(subtab)
    ? subtab : "general";
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [localSettings, setLocalSettings] = useState<AppSettings | null>(null);
  const [dirty, setDirty] = useState(false);

  const { data: serverSettings, isLoading, isError } = useQuery<AppSettings>({
    queryKey: ['app-settings'],
    queryFn: async () => {
      // Cache-bust the CDN. /api/settings gates maintenanceMode, so a
      // stale CDN copy would leave the site in maintenance mode for up
      // to 30 minutes after disabling it.
      const res = await fetch('/api/settings?t=' + Date.now(), {
        credentials: 'include',
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('Failed to load settings');
      return res.json();
    },
    staleTime: 0,
    gcTime: 0,
  });

  useEffect(() => {
    if (serverSettings) {
      setLocalSettings({ ...DEFAULT_SETTINGS, ...serverSettings });
      setDirty(false);
    }
  }, [serverSettings]);

  const saveMutation = useMutation({
    mutationFn: async (settings: AppSettings) => {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAdminHeaders() },
        credentials: 'include',
        body: JSON.stringify(settings),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Save failed');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-settings'] });
      setDirty(false);
      toast({ title: 'Settings saved', description: 'Changes are live for all users.' });
    },
    onError: (err: any) => {
      toast({ title: 'Save failed', description: err.message, variant: 'destructive' });
    },
  });

  const update = (patch: Partial<AppSettings>) => {
    setLocalSettings((s) => ({ ...(s ?? DEFAULT_SETTINGS), ...patch }));
    setDirty(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />Loading settings…
      </div>
    );
  }

  if (isError || !localSettings) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-amber-500" />
          <p>Could not load settings. Make sure you are logged in as admin.</p>
        </CardContent>
      </Card>
    );
  }

  const s = localSettings;

  return (
    <div className="space-y-5">
      {/* v4.7.49 — AdminDashboard already renders a section masthead
       *  above every panel.  We only render an action row here, no
       *  duplicate H2. */}
      <div className="flex items-center justify-end gap-3">
          {dirty && (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.06em] text-amber-600 dark:text-amber-400">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              Unsaved
            </span>
          )}
          <button
            type="button"
            onClick={() => localSettings && saveMutation.mutate(localSettings)}
            disabled={saveMutation.isPending || !dirty}
            className="h-10 px-3.5 rounded-[6px] bg-[#003d82] hover:bg-[#002d5f] disabled:opacity-40 disabled:cursor-not-allowed text-white text-[13px] font-bold inline-flex items-center gap-1.5 transition-colors"
          >
            <Save className="h-4 w-4" strokeWidth={2} />
            {saveMutation.isPending ? 'Saving…' : 'Save changes'}
          </button>
      </div>

      {s.maintenanceMode && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-[6px] border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 text-[13px]">
          <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" strokeWidth={2.25} />
          <span className="text-red-800 dark:text-red-200"><strong>Maintenance mode is on</strong> — the app is hidden from regular users.</span>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={(v) => onSubtabChange?.(v)}>
        <TabsList className="grid w-full grid-cols-5 h-9">
          <TabsTrigger value="general" className="gap-1.5 text-xs">
            <Globe className="h-3.5 w-3.5" />General
          </TabsTrigger>
          <TabsTrigger value="content" className="gap-1.5 text-xs">
            <Bell className="h-3.5 w-3.5" />Content
          </TabsTrigger>
          <TabsTrigger value="features" className="gap-1.5 text-xs">
            <Sparkles className="h-3.5 w-3.5" />Features
          </TabsTrigger>
          <TabsTrigger value="schedule" className="gap-1.5 text-xs">
            <Wrench className="h-3.5 w-3.5" />Schedule
          </TabsTrigger>
          <TabsTrigger value="maintenance" className="gap-1.5 text-xs">
            <Wrench className="h-3.5 w-3.5" />Maintenance
          </TabsTrigger>
        </TabsList>

        {/* ── Schedule (jaksot editor) ────────────────────── */}
        <TabsContent value="schedule" className="mt-4 space-y-4">
          <JaksotEditor />
        </TabsContent>

        {/* ── General ─────────────────────────────────────── */}
        <TabsContent value="general" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">App Identity</CardTitle>
              <CardDescription>Name shown in the browser title and header.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs mb-1 block">App name (default)</Label>
                  <Input value={s.appName ?? ''} onChange={(e) => update({ appName: e.target.value })} className="h-9 text-sm" />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">English name</Label>
                  <Input value={s.appNameEn ?? ''} onChange={(e) => update({ appNameEn: e.target.value })} className="h-9 text-sm" />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Finnish name</Label>
                  <Input value={s.appNameFi ?? ''} onChange={(e) => update({ appNameFi: e.target.value })} className="h-9 text-sm" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Language & Theme</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs mb-1 block">Default language</Label>
                  <Select value={s.defaultLanguage ?? 'fi'} onValueChange={(v) => update({ defaultLanguage: v })}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fi">Finnish (Suomi)</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Default theme</Label>
                  <Select value={s.theme ?? 'system'} onValueChange={(v) => update({ theme: v })}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System (follows OS)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Contact info</CardTitle>
              <CardDescription>Shown in the footer and help sections.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs mb-1 block">Contact email</Label>
                <Input type="email" value={s.contactEmail ?? ''} onChange={(e) => update({ contactEmail: e.target.value })} className="h-9 text-sm" placeholder="info@example.fi" />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Contact phone</Label>
                <Input type="tel" value={s.contactPhone ?? ''} onChange={(e) => update({ contactPhone: e.target.value })} className="h-9 text-sm" placeholder="+358 …" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Footer text</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs mb-1 block">English</Label>
                <Textarea value={s.footerTextEn ?? ''} onChange={(e) => update({ footerTextEn: e.target.value })} className="text-sm h-20 resize-none" placeholder="© 2025 KSYK" />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Finnish</Label>
                <Textarea value={s.footerTextFi ?? ''} onChange={(e) => update({ footerTextFi: e.target.value })} className="text-sm h-20 resize-none" placeholder="© 2025 KSYK" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Content ─────────────────────────────────────── */}
        <TabsContent value="content" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Features visible to all users</CardTitle>
              <CardDescription>Toggle which sections and features are shown on the public map.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {([
                { key: 'showStats', label: 'Show campus stats', desc: 'Visitor counts and room statistics panel' },
                { key: 'showAnnouncements', label: 'Show announcements', desc: 'Announcement banner on the map page' },
                { key: 'enableSearch', label: 'Enable room search', desc: 'Search bar and autocomplete in the map' },
                { key: 'enableAnimations', label: 'Enable animations', desc: 'Smooth transitions and map effects' },
                { key: 'compactMode', label: 'Compact mode', desc: 'Tighter spacing across the whole UI' },
              ] as { key: keyof AppSettings; label: string; desc: string }[]).map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between py-1">
                  <div>
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                  <Switch
                    checked={!!s[key]}
                    onCheckedChange={(v) => update({ [key]: v })}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Egg className="h-4 w-4 text-amber-500" />
                Easter egg
              </CardTitle>
              <CardDescription>Hidden secret accessible via a special interaction on the map.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Enable easter egg</p>
                  <p className="text-xs text-muted-foreground">When off, the easter egg trigger is disabled site-wide</p>
                </div>
                <Switch
                  checked={!!s.enableEasterEgg}
                  onCheckedChange={(v) => update({ enableEasterEgg: v })}
                />
              </div>
            </CardContent>
          </Card>

          {/* v1.83.0: 'Get the app' popup — feature flag + URL */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">"Get the app" popup</CardTitle>
              <CardDescription>Prompt web visitors to install the mobile app. Popup appears once per session on the landing page.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Show popup on the landing page</p>
                  <p className="text-xs text-muted-foreground">Only shown once per session, dismissible</p>
                </div>
                <Switch
                  checked={!!s.showGetAppPopup}
                  onCheckedChange={(v) => update({ showGetAppPopup: v })}
                />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Download link (URL)</Label>
                <Input
                  value={s.getAppUrl ?? ''}
                  onChange={(e) => update({ getAppUrl: e.target.value })}
                  placeholder="https://ksykmaps.fi/download"
                  className="text-sm"
                />
                <p className="text-[10px] text-muted-foreground mt-1">Where the "Download" button in the popup takes the user.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Features (v4.7.13) ──────────────────────────────
         *  Client-facing feature flags. Each toggle maps to a runtime
         *  check in a component; turning something off here hides it
         *  from students without needing a deploy. */}
        <TabsContent value="features" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Public map features</CardTitle>
              <CardDescription>Layers and overlays students see on the main campus map.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <FeatureRow
                icon={Calendar}
                title="Campus events on map"
                subtitle="Amber star pins for active/upcoming events. Click opens details."
                checked={s.enableCampusEvents !== false}
                onChange={(v) => update({ enableCampusEvents: v })}
              />
              <FeatureRow
                icon={Camera}
                title="360° panorama spots"
                subtitle="Fuchsia pins that open a fullscreen spherical viewer on click."
                checked={s.enablePanoramaSpots !== false}
                onChange={(v) => update({ enablePanoramaSpots: v })}
              />
              <FeatureRow
                icon={Megaphone}
                title="Announcement banner"
                subtitle="Top-of-map carousel of active announcements."
                checked={s.enableAnnouncementBanner !== false}
                onChange={(v) => update({ enableAnnouncementBanner: v })}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Analytics + telemetry</CardTitle>
              <CardDescription>Recording and admin-only visualizations.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <FeatureRow
                icon={Video}
                title="Session replay recording"
                subtitle="Record DOM snapshots on public routes for admin playback (rrweb). Turn off to stop new recordings."
                checked={s.enableSessionReplay !== false}
                onChange={(v) => update({ enableSessionReplay: v })}
              />
              <FeatureRow
                icon={Flame}
                title="Heatmap in admin analytics"
                subtitle="Room-popularity heatmap card in the Analytics tab. Admin-only anyway; toggle hides the card entirely."
                checked={s.enableHeatmapForAdmins !== false}
                onChange={(v) => update({ enableHeatmapForAdmins: v })}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Miscellaneous</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <FeatureRow
                icon={EyeOff}
                title="Footer credits"
                subtitle="Show 'Made by…' line in the page footer."
                checked={s.enableFooterCredits !== false}
                onChange={(v) => update({ enableFooterCredits: v })}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Maintenance ─────────────────────────────────── */}
        <TabsContent value="maintenance" className="mt-4 space-y-4">
          <Card className={s.maintenanceMode ? 'border-red-300 dark:border-red-800' : ''}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                {s.maintenanceMode
                  ? <><AlertTriangle className="h-4 w-4 text-red-500" />Maintenance mode — ACTIVE</>
                  : <><Eye className="h-4 w-4 text-green-500" />Site is live</>
                }
              </CardTitle>
              <CardDescription>
                When maintenance mode is on, visitors see only the maintenance message. Admin login still works.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Maintenance mode</p>
                  <p className="text-xs text-muted-foreground">Hides the app from non-admin visitors</p>
                </div>
                <Switch
                  checked={!!s.maintenanceMode}
                  onCheckedChange={(v) => update({ maintenanceMode: v })}
                />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Maintenance message</Label>
                <Textarea
                  value={s.maintenanceMessage ?? ''}
                  onChange={(e) => update({ maintenanceMessage: e.target.value })}
                  className="text-sm h-24 resize-none"
                  placeholder="We're updating the campus map. Back soon!"
                />
                <p className="text-xs text-muted-foreground mt-1">Shown to visitors during maintenance. Leave blank for a generic message.</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Data management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg border border-dashed">
                <div>
                  <p className="text-sm font-medium">Reload settings from database</p>
                  <p className="text-xs text-muted-foreground">Discard unsaved local changes</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => {
                  setLocalSettings({ ...DEFAULT_SETTINGS, ...serverSettings });
                  setDirty(false);
                }} className="gap-1.5">
                  <RefreshCw className="h-3.5 w-3.5" />Reload
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* v1.82.0: Danger zone — analytics + logs bulk wipes */}
          <Card className="border border-gray-200 dark:border-gray-800 rounded-2xl bg-white dark:bg-gray-900">
            <CardHeader className="pb-3">
              <CardTitle className="text-[15px] font-semibold flex items-center gap-2 text-gray-900 dark:text-white">
                <AlertTriangle className="h-[18px] w-[18px] text-red-500" strokeWidth={1.75} />
                Danger zone
              </CardTitle>
              <CardDescription className="text-[13px]">Every button here wipes production data. There is no confirm-undo.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { scope: 'events', label: 'Analytics events', desc: 'Clears telemetry_events + feature_usage + performance_events + easter_egg_events + telemetry_sessions' },
                { scope: 'logs',   label: 'App logs',         desc: 'Clears the server-side app_logs feed only' },
                { scope: 'all',    label: 'ALL analytics + logs', desc: 'Combines both above (starts the analytics/logs history fresh)' },
              ].map(({ scope, label, desc }) => (
                <div key={scope} className="flex items-center justify-between p-3.5 rounded-xl border border-gray-200 dark:border-gray-800">
                  <div>
                    <p className="text-[14px] font-medium text-gray-900 dark:text-white">Reset: {label}</p>
                    <p className="text-[12px] text-muted-foreground">{desc}</p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={async () => {
                      if (!confirm(`Really wipe ${label.toLowerCase()}? This can't be undone.`)) return;
                      try {
                        const r = await fetch('/api/analytics/reset', {
                          method: 'DELETE',
                          headers: { 'Content-Type': 'application/json', ...getAdminHeaders() },
                          body: JSON.stringify({ scope }),
                        });
                        const data = await r.json();
                        toast({
                          title: r.ok ? 'Wiped' : 'Failed',
                          description: r.ok
                            ? Object.entries(data).filter(([k]) => k !== 'success').map(([k, v]) => `${k}: ${v}`).join(' · ')
                            : data.message,
                          variant: r.ok ? 'default' : 'destructive',
                        });
                      } catch (e: any) {
                        toast({ title: 'Failed', description: e?.message, variant: 'destructive' });
                      }
                    }}
                    className="gap-1.5"
                  >
                    Wipe
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Jaksot editor ────────────────────────────────────────────
// School-period date ranges. Stored server-side in KV so both the
// web timetable and the mobile Wilma import agree on which jakso
// a given date belongs to. Falls back to reasonable defaults when
// the KV doc is empty.
interface Jakso {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

function JaksotEditor() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: server, isLoading } = useQuery<Jakso[]>({
    queryKey: ['jaksot'],
    queryFn: async () => {
      const r = await fetch('/api/jaksot');
      if (!r.ok) throw new Error('fetch failed');
      return r.json();
    },
  });
  const [rows, setRows] = useState<Jakso[]>([]);
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    if (server) { setRows(server); setDirty(false); }
  }, [server]);

  const save = useMutation({
    mutationFn: async () => {
      const r = await fetch('/api/jaksot', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAdminHeaders() },
        body: JSON.stringify(rows),
      });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['jaksot'] });
      setDirty(false);
      toast({ title: 'Jaksot saved', description: 'The mobile app will pick them up on next refresh.' });
    },
    onError: (e: any) => toast({ title: 'Save failed', description: e?.message, variant: 'destructive' }),
  });

  const update = (idx: number, patch: Partial<Jakso>) => {
    setRows((rs) => rs.map((r, i) => i === idx ? { ...r, ...patch } : r));
    setDirty(true);
  };

  const invalid = rows.some((r) => !/^\d{4}-\d{2}-\d{2}$/.test(r.startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(r.endDate) || r.startDate > r.endDate);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />Loading jaksot…
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">School periods (jaksot)</CardTitle>
        <CardDescription>
          Date ranges that group weekly lessons. Both the website timetable and
          the mobile app read this. Wilma import uses the ranges to tag every
          imported lesson with the correct period.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map((row, i) => (
          <div key={row.id} className="grid grid-cols-[70px_1fr_1fr_1fr] gap-2 items-end">
            <div>
              <Label className="text-xs mb-1 block">ID</Label>
              <Input value={row.id} disabled className="h-9 text-sm" />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Name</Label>
              <Input
                value={row.name}
                onChange={(e) => update(i, { name: e.target.value })}
                className="h-9 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Start (YYYY-MM-DD)</Label>
              <Input
                value={row.startDate}
                onChange={(e) => update(i, { startDate: e.target.value })}
                className="h-9 text-sm font-mono"
              />
            </div>
            <div>
              <Label className="text-xs mb-1 block">End (YYYY-MM-DD)</Label>
              <Input
                value={row.endDate}
                onChange={(e) => update(i, { endDate: e.target.value })}
                className="h-9 text-sm font-mono"
              />
            </div>
          </div>
        ))}
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            {invalid ? 'Fix invalid rows before saving.' : `${rows.length} periods loaded.`}
          </p>
          <Button
            size="sm"
            disabled={!dirty || save.isPending || invalid}
            onClick={() => save.mutate()}
            className="gap-2"
          >
            <Save className="h-3.5 w-3.5" />
            {save.isPending ? 'Saving…' : 'Save jaksot'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * v4.7.13 — one-row feature toggle. Icon on the left, title + subtitle,
 * Switch on the right. Same footprint as the existing ad-hoc rows in
 * the Content tab, extracted so the Features tab stays consistent.
 */
function FeatureRow({
  icon: Icon,
  title,
  subtitle,
  checked,
  onChange,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-card/60 p-3">
      <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground leading-snug">{subtitle}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
