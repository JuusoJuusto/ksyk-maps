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
  RefreshCw, Eye, EyeOff, Egg,
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
};

export default function AppSettingsManager() {
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
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Settings className="h-5 w-5 text-muted-foreground" />
            App Settings
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">Global configuration — changes apply to all users immediately after saving.</p>
        </div>
        <div className="flex items-center gap-2">
          {dirty && <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/30">Unsaved changes</Badge>}
          <Button
            onClick={() => localSettings && saveMutation.mutate(localSettings)}
            disabled={saveMutation.isPending || !dirty}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            {saveMutation.isPending ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {s.maintenanceMode && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm font-medium">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Maintenance mode is ON — the app is hidden from regular users.
        </div>
      )}

      <Tabs defaultValue="general">
        <TabsList className="grid w-full grid-cols-4 h-9">
          <TabsTrigger value="general" className="gap-1.5 text-xs">
            <Globe className="h-3.5 w-3.5" />General
          </TabsTrigger>
          <TabsTrigger value="content" className="gap-1.5 text-xs">
            <Bell className="h-3.5 w-3.5" />Content
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
