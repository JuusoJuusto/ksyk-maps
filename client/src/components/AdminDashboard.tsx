import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import AnnouncementManager from "@/components/AnnouncementManager";
import ImprovedKSYKBuilder from "@/components/ImprovedKSYKBuilder";
import MapSettingsPanel from "@/components/MapSettingsPanel";
import KSYKMapView from "@/components/KSYKMapView";
import AppSettingsManager from "@/components/AppSettingsManager";
import AppLogsManager from "@/components/AppLogsManager";
import TicketManager from "@/components/TicketManager";
import TwoFactorAuth from "@/components/TwoFactorAuth";
import EnhancedWilmaUserManager from "@/components/EnhancedWilmaUserManager";
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
  Calendar,
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
  GraduationCap,
  Ticket,
  ScrollText,
  IdCard,
  LogOut,
  ChevronRight,
  Link,
  CheckCircle2,
  XCircle,
  Loader2,
  Eye,
  EyeOff,
  Home,
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

// ── SchedulesManager ─────────────────────────────────────────────────────────
// Inline sub-component — kept here so it shares the dashboard's toast context
// and TanStack Query client without prop-drilling. Manages wilma_schedules
// rows that the GET /api/rooms/:id/schedule endpoint reads back to the map.
interface WilmaScheduleRow {
  id: string;
  studentId: string;
  dayOfWeek: number;
  timeSlot: string;
  subject: string;
  room: string;
  teacherName: string;
  teacherId?: string | null;
  isActive: boolean;
}

const DAY_LABELS: Record<number, string> = { 1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri" };

function SchedulesManager({ rooms }: { rooms: Room[] }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [filterRoom, setFilterRoom] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    room: "", dayOfWeek: 1, timeSlot: "08:00-09:30",
    subject: "", teacherName: "", studentId: "00000",
  });

  const { data: schedules = [], isLoading } = useQuery<WilmaScheduleRow[]>({
    queryKey: ["wilma-schedules-all"],
    queryFn: async () => {
      const r = await fetch("/api/wilma/schedules");
      if (!r.ok) return [];
      return r.json();
    },
    staleTime: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const r = await fetch("/api/wilma/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...data, isActive: true }),
      });
      if (!r.ok) throw new Error("Failed to create");
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wilma-schedules-all"] });
      toast({ title: "Schedule entry added" });
      setShowForm(false);
      setForm({ room: "", dayOfWeek: 1, timeSlot: "08:00-09:30", subject: "", teacherName: "", studentId: "00000" });
    },
    onError: () => toast({ title: "Failed to add entry", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/wilma/schedules/${id}`, { method: "DELETE", credentials: "include" });
      if (!r.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wilma-schedules-all"] });
      toast({ title: "Entry deleted" });
    },
    onError: () => toast({ title: "Delete failed", variant: "destructive" }),
  });

  const roomOptions = Array.from(new Set(rooms.map((r) => r.roomNumber).filter(Boolean))).sort();
  const filtered = (schedules as WilmaScheduleRow[]).filter((s) =>
    !filterRoom || s.room?.toUpperCase() === filterRoom.toUpperCase()
  );

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={filterRoom}
          onChange={(e) => setFilterRoom(e.target.value)}
          className="h-9 rounded-lg border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none min-w-[140px]"
        >
          <option value="">All rooms</option>
          {roomOptions.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <span className="text-sm text-muted-foreground ml-1">
          {filtered.length} entr{filtered.length === 1 ? "y" : "ies"}
        </span>
        <div className="flex-1" />
        <Button size="sm" onClick={() => setShowForm(!showForm)} className="gap-1.5">
          <Plus className="h-4 w-4" />
          Add entry
        </Button>
      </div>

      {/* Add form */}
      {showForm && (
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold">New Schedule Entry</CardTitle>
            <CardDescription className="text-xs">Adds a recurring weekly entry shown on the classroom schedule panel.</CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs mb-1 block">Room *</Label>
                <select
                  value={form.room}
                  onChange={(e) => setForm({ ...form, room: e.target.value })}
                  className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">Select room…</option>
                  {roomOptions.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-xs mb-1 block">Day *</Label>
                <select
                  value={form.dayOfWeek}
                  onChange={(e) => setForm({ ...form, dayOfWeek: Number(e.target.value) })}
                  className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {Object.entries(DAY_LABELS).map(([v, label]) => (
                    <option key={v} value={v}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs mb-1 block">Time slot *</Label>
                <Input
                  value={form.timeSlot}
                  onChange={(e) => setForm({ ...form, timeSlot: e.target.value })}
                  placeholder="08:00-09:30"
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Subject *</Label>
                <Input
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  placeholder="e.g. Mathematics"
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Teacher</Label>
                <Input
                  value={form.teacherName}
                  onChange={(e) => setForm({ ...form, teacherName: e.target.value })}
                  placeholder="Teacher name"
                  className="h-9 text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button
                size="sm"
                disabled={!form.room || !form.subject || createMutation.isPending}
                onClick={() => createMutation.mutate(form)}
              >
                <Save className="h-3.5 w-3.5 mr-1.5" />
                Save entry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Schedule table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-800 py-12 text-center">
          <Calendar className="h-10 w-10 mx-auto text-gray-300 dark:text-gray-700 mb-3" />
          <p className="text-sm text-muted-foreground font-medium">No schedule entries yet</p>
          <p className="text-xs text-muted-foreground mt-1">Add entries above — they appear in the classroom panel on the map.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-900/50">
                <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground px-4 py-2.5">Room</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2.5">Day</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2.5">Time</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2.5">Subject</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2.5 hidden sm:table-cell">Teacher</th>
                <th className="px-3 py-2.5 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors">
                  <td className="px-4 py-2.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-mono text-xs font-bold">
                      {s.room}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-xs font-medium">{DAY_LABELS[s.dayOfWeek] ?? s.dayOfWeek}</td>
                  <td className="px-3 py-2.5 font-mono text-xs">{s.timeSlot}</td>
                  <td className="px-3 py-2.5 font-medium max-w-[12rem] truncate">{s.subject}</td>
                  <td className="px-3 py-2.5 text-muted-foreground text-xs hidden sm:table-cell">{s.teacherName || "—"}</td>
                  <td className="px-3 py-2.5 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                      onClick={() => deleteMutation.mutate(s.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Entries are stored in <code className="font-mono bg-muted px-1 rounded">wilma_schedules</code> — the same table the map's classroom schedule panel reads.
        Future Wilma sync will populate this automatically.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// WilmaConfigPanel — owner-only, credentials never stored client-side
// ─────────────────────────────────────────────────────────────────────────────
interface WilmaConfig {
  configured: boolean;
  serverUrl: string;
  lastSync: string | null;
  connectionStatus: string;
  lastTestAt: string | null;
}

function WilmaConfigPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [serverUrl, setServerUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const { data: config, isLoading } = useQuery<WilmaConfig>({
    queryKey: ["wilma-config"],
    queryFn: async () => {
      const res = await fetch("/api/admin/wilma-config", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load config");
      return res.json();
    },
  });

  useEffect(() => {
    if (config && !hydrated) {
      if (config.serverUrl) setServerUrl(config.serverUrl);
      setHydrated(true);
    }
  }, [config, hydrated]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/wilma-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ serverUrl, username, password }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to save");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Configuration saved", description: "Wilma integration settings updated." });
      setPassword("");
      queryClient.invalidateQueries({ queryKey: ["wilma-config"] });
    },
    onError: (e: Error) => {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    },
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/wilma-config/test", {
        method: "POST",
        credentials: "include",
      });
      return res.json() as Promise<{ success: boolean; status: string; message: string }>;
    },
    onSuccess: (d) => {
      if (d.success) {
        toast({ title: "Connection successful", description: `Server responded: ${d.message}` });
      } else {
        toast({ title: "Connection failed", description: d.message || d.status, variant: "destructive" });
      }
      queryClient.invalidateQueries({ queryKey: ["wilma-config"] });
    },
    onError: (e: Error) => {
      toast({ title: "Test error", description: e.message, variant: "destructive" });
    },
  });

  const statusColors: Record<string, string> = {
    reachable: "text-emerald-600 dark:text-emerald-400",
    unreachable: "text-red-600 dark:text-red-400",
    error: "text-red-600 dark:text-red-400",
    unchecked: "text-amber-600 dark:text-amber-400",
    not_configured: "text-gray-400",
    unknown: "text-gray-400",
  };

  const statusIcon = (s: string) => {
    if (s === "reachable") return <CheckCircle2 className="h-4 w-4" />;
    if (s === "unreachable" || s === "error") return <XCircle className="h-4 w-4" />;
    return <Loader2 className="h-4 w-4 animate-spin" />;
  };

  return (
    <Card className="border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/30 dark:bg-indigo-950/10">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-sm">
            <Link className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base">Wilma Integration</CardTitle>
            <CardDescription className="text-xs">
              Connect to your school's Wilma server. Credentials are stored server-side only.
            </CardDescription>
          </div>
          {!isLoading && config && (
            <div className={cn("ml-auto flex items-center gap-1.5 text-xs font-medium", statusColors[config.connectionStatus] || "text-gray-400")}>
              {statusIcon(config.connectionStatus)}
              <span className="capitalize">{config.connectionStatus.replace("_", " ")}</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading configuration…
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="wilma-url" className="text-xs font-semibold">Wilma Server URL</Label>
                <Input
                  id="wilma-url"
                  type="url"
                  placeholder="https://wilma.yourschool.fi"
                  value={serverUrl}
                  onChange={(e) => setServerUrl(e.target.value)}
                  className="text-sm h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="wilma-user" className="text-xs font-semibold">Username</Label>
                <Input
                  id="wilma-user"
                  type="text"
                  placeholder="admin@school.fi"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="text-sm h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="wilma-pass" className="text-xs font-semibold">
                  Password {config?.configured && <span className="text-muted-foreground font-normal">(leave blank to keep current)</span>}
                </Label>
                <div className="relative">
                  <Input
                    id="wilma-pass"
                    type={showPassword ? "text" : "password"}
                    placeholder={config?.configured ? "••••••••" : "Enter password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="text-sm h-9 pr-9"
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-gray-900 dark:hover:text-white"
                    onClick={() => setShowPassword((v) => !v)}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {config?.lastTestAt && (
              <p className="text-[11px] text-muted-foreground">
                Last tested: {new Date(config.lastTestAt).toLocaleString()}
                {config.lastSync && ` · Last sync: ${new Date(config.lastSync).toLocaleString()}`}
              </p>
            )}

            <div className="flex items-center gap-2 pt-1">
              <Button
                size="sm"
                className="h-8 bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending || !serverUrl || !username}
              >
                {saveMutation.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                Save
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={() => testMutation.mutate()}
                disabled={testMutation.isPending || !config?.configured}
                title={!config?.configured ? "Save configuration first" : "Test server connection"}
              >
                {testMutation.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />}
                Test Connection
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

const ADMIN_BASE = "/admin-ksyk-management-portal";

// Canonical tab slugs — also used as URL path segments
const TAB_SLUGS = [
  "overview","users","wilma","campus-map","ksyk-builder",
  "schedules","tickets","logs","staff","announcements","2fa","settings",
] as const;
type TabSlug = typeof TAB_SLUGS[number];

// Short URL aliases for the /admin/* route family.
// e.g. /admin/builder  →  ksyk-builder
const URL_TO_TAB: Record<string, TabSlug> = {
  builder: "ksyk-builder",
  "map-settings": "campus-map",
  map: "campus-map",
  "2fa-setup": "2fa",
};
// Reverse: canonical slug → preferred short URL segment (when on /admin/* base)
const TAB_TO_SHORT: Partial<Record<TabSlug, string>> = {
  "ksyk-builder": "builder",
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

export default function AdminDashboard({ section }: { section?: string }) {
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

  // Use the URL prefix we arrived on — supports both /admin/* and the legacy
  // /admin-ksyk-management-portal/* paths without breaking deep links.
  const isShortBase = location.startsWith("/admin/") || location === "/admin";
  const adminBase = isShortBase ? "/admin" : ADMIN_BASE;

  const navigate = (tab: string) => {
    setActiveTab(tab);
    // On the /admin/* base, use short slug aliases where available
    const slug = isShortBase ? (TAB_TO_SHORT[tab as TabSlug] ?? tab) : tab;
    const path = slug === "overview" ? adminBase : `${adminBase}/${slug}`;
    setLocation(path);
  };
  const [builderSubtab, setBuilderSubtab] = useState<"rooms" | "map">("rooms");
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

  // Wilma integration config state (owner-only)
  const [showWilmaConfig, setShowWilmaConfig] = useState(false);
  const [wilmaForm, setWilmaForm] = useState({ serverUrl: "", username: "", password: "", schoolConfig: "" });
  const [showWilmaPassword, setShowWilmaPassword] = useState(false);
  const [wilmaSaving, setWilmaSaving] = useState(false);
  const [wilmaTestStatus, setWilmaTestStatus] = useState<"idle" | "testing" | "ok" | "error">("idle");
  
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

  // Auto-redirect to /admin-login if no valid session is present, OR if the
  // server says our session is gone. localStorage flag alone is trust-on-write;
  // we additionally probe /api/auth/me on mount and on tab focus and bounce
  // out on 401/403.
  useEffect(() => {
    const flagged = localStorage.getItem("ksyk_admin_logged_in") === "true";
    if (!flagged || !currentUser) {
      window.location.replace("/admin-login");
      return;
    }
    let cancelled = false;
    const verify = async () => {
      try {
        const r = await fetch("/api/auth/me", { credentials: "include" });
        if (cancelled) return;
        if (r.status === 401 || r.status === 403) {
          localStorage.removeItem("ksyk_admin_logged_in");
          localStorage.removeItem("ksyk_admin_user");
          window.location.replace("/admin-login");
        }
      } catch {
        // Network errors are non-fatal — keep the user in the panel.
      }
    };
    verify();
    const onFocus = () => verify();
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  

  // Fetch data
  const { data: buildings = [] } = useQuery({
    queryKey: ["buildings"],
    queryFn: async () => {
      const response = await fetch("/api/buildings");
      if (!response.ok) throw new Error("Failed to fetch buildings");
      return response.json();
    },
  });

  const { data: rooms = [] } = useQuery({
    queryKey: ["rooms"],
    queryFn: async () => {
      const response = await fetch("/api/rooms");
      if (!response.ok) throw new Error("Failed to fetch rooms");
      return response.json();
    },
  });

  const { data: staff = [] } = useQuery({
    queryKey: ["staff"],
    queryFn: async () => {
      const response = await fetch("/api/staff");
      if (!response.ok) throw new Error("Failed to fetch staff");
      return response.json();
    },
  });

  const { data: announcements = [] } = useQuery({
    queryKey: ["announcements"],
    queryFn: async () => {
      const response = await fetch("/api/announcements?limit=50");
      if (!response.ok) throw new Error("Failed to fetch announcements");
      return response.json();
    },
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const response = await fetch("/api/users");
      if (!response.ok) throw new Error("Failed to fetch users");
      return response.json();
    },
  });

  const { data: wilmaConfig } = useQuery<{ configured: boolean; serverUrl: string; connectionStatus: string; lastSync: string | null; lastTestAt: string | null }>({
    queryKey: ["wilma-config"],
    queryFn: async () => {
      const r = await fetch("/api/admin/wilma-config", { credentials: "include" });
      if (!r.ok) return null;
      return r.json();
    },
    enabled: isOwner,
    staleTime: 60_000,
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
    localStorage.removeItem("ksyk_admin_logged_in");
    localStorage.removeItem("ksyk_admin_user");
    localStorage.removeItem("ksyk_admin_login_at");
    fetch("/api/auth/logout", { method: "POST", credentials: "include" }).finally(() => {
      window.location.replace("/admin-login");
    });
  };

  const NAV_ITEMS = [
    { value: "overview", label: "Overview", Icon: LayoutDashboard },
    { value: "users", label: "Users", Icon: Users },
    { value: "wilma", label: "Wilma", Icon: GraduationCap },
    { value: "campus-map", label: "Campus Map", Icon: MapPin },
    { value: "ksyk-builder", label: "Builder", Icon: Box },
    { value: "schedules", label: "Schedules", Icon: Calendar },
    { value: "tickets", label: "Tickets", Icon: Ticket },
    { value: "logs", label: "Logs", Icon: ScrollText },
    { value: "staff", label: "Staff", Icon: IdCard },
    { value: "announcements", label: "Announcements", Icon: Megaphone },
    ...(isOwner ? [{ value: "2fa", label: "2FA", Icon: Shield }] : []),
    ...(isOwner ? [{ value: "settings", label: "Settings", Icon: Settings }] : []),
  ];

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-white dark:bg-gray-900">

      {/* ── Desktop sidebar ──────────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-56 xl:w-64 shrink-0 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        {/* Brand strip */}
        <div className="flex items-center gap-2.5 px-4 h-14 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-sm">
            <LayoutDashboard className="h-4 w-4" />
          </div>
          <span className="font-bold text-sm tracking-tight text-gray-900 dark:text-white flex-1">KSYK Admin</span>
          <a
            href="/"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Back to Map"
          >
            <Home className="h-3.5 w-3.5" />
          </a>
        </div>
        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          <div className="space-y-0.5">
            {NAV_ITEMS.filter(({ value }) => value !== "2fa" && value !== "settings").map(({ value, label, Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => navigate(value)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150",
                  activeTab === value
                    ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate flex-1 text-left">{label}</span>
                {activeTab === value && <ChevronRight className="h-3.5 w-3.5 ml-auto shrink-0 opacity-50" />}
              </button>
            ))}
          </div>
          {isOwner && (
            <>
              <div className="my-2 mx-1 border-t border-gray-100 dark:border-gray-800" />
              <p className="px-3 py-1 text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">Owner</p>
              <div className="space-y-0.5">
                {NAV_ITEMS.filter(({ value }) => value === "2fa" || value === "settings").map(({ value, label, Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => navigate(value)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150",
                      activeTab === value
                        ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate flex-1 text-left">{label}</span>
                    {activeTab === value && <ChevronRight className="h-3.5 w-3.5 ml-auto shrink-0 opacity-50" />}
                  </button>
                ))}
              </div>
            </>
          )}
        </nav>
        {/* User chip */}
        {currentUser && (
          <div className="shrink-0 border-t border-gray-100 dark:border-gray-800 p-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-[11px] font-bold shadow-inner">
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
        {/* Mobile: account chip + horizontal scrolling tab bar (hidden lg+) */}
        <div className="lg:hidden shrink-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
          {currentUser && (
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2 min-w-0">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-[10px] font-bold">
                  {(currentUser.email || currentUser.name || "?").slice(0, 1).toUpperCase()}
                </span>
                <span className="text-xs font-semibold truncate max-w-[20ch] text-gray-900 dark:text-white">
                  {currentUser.name || currentUser.email}
                </span>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  · {isOwner ? "Owner" : isAdmin ? "Admin" : "Staff"}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[10px] font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-full shrink-0"
                onClick={logoutFn}
              >
                Sign out
              </Button>
            </div>
          )}
          <div className="overflow-x-auto scrollbar-none px-3 py-2">
            <TabsList className="inline-flex w-max gap-1 p-1 bg-gray-100/80 dark:bg-gray-900/60 rounded-2xl shadow-sm border border-gray-200/60 dark:border-gray-800">
              {NAV_ITEMS.map(({ value, label, Icon }) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:shadow-sm data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-300 rounded-xl px-3 py-2 text-xs font-semibold gap-1.5 inline-flex items-center transition-all duration-200 whitespace-nowrap"
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </div>

        {/* Scrollable content — full-bleed for map/builder, padded for everything else */}
        <div className={`flex-1 min-h-0 ${activeTab === "campus-map" || activeTab === "ksyk-builder" ? "overflow-hidden" : "overflow-y-auto"}`}>
          <div className={activeTab === "campus-map" || activeTab === "ksyk-builder" ? "h-full" : "p-4 sm:p-6 pb-8"}>

        {/* Section header — auto-rendered from the current tab so every
           section gets a consistent title + description without touching
           each TabsContent. Sits between the tab bar and content. */}
        {(() => {
          const sectionMeta: Record<string, { title: string; description: string; Icon: typeof LayoutDashboard }> = {
            overview: { title: "Overview", description: "At-a-glance state of the campus.", Icon: LayoutDashboard },
            users: { title: "Users", description: "Manage Wilma and admin accounts.", Icon: Users },
            wilma: { title: "Wilma", description: "Wilma school-system integration.", Icon: GraduationCap },
            "campus-map": { title: "Campus Map", description: "Live preview of what users see.", Icon: MapPin },
            "ksyk-builder": { title: "Builder", description: "Rooms, floors and map defaults. Use Map Defaults tab to set home location for all users.", Icon: Box },
            schedules: { title: "Room Schedules", description: "Manage classroom timetables shown on the map.", Icon: Calendar },
            tickets: { title: "Tickets", description: "Support requests and bug reports.", Icon: Ticket },
            logs: { title: "Application Logs", description: "Server-side activity and errors.", Icon: ScrollText },
            staff: { title: "Staff", description: "Public-facing staff directory entries.", Icon: IdCard },
            announcements: { title: "Announcements", description: "Banner messages shown to all users.", Icon: Megaphone },
            "2fa": { title: "Two-Factor Auth", description: "Enroll and manage 2FA for your account.", Icon: Shield },
            settings: { title: "Settings", description: "App name, branding, and danger zone.", Icon: Settings },
          };
          const meta = sectionMeta[activeTab];
          // Full-height tabs get no header — they need every pixel
          if (!meta || activeTab === "campus-map" || activeTab === "ksyk-builder") return null;
          const Icon = meta.Icon;
          return (
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-sm">
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm sm:text-base font-bold tracking-tight leading-tight text-gray-900 dark:text-white">
                  {meta.title}
                </h2>
                <p className="text-[11px] text-muted-foreground leading-tight truncate">
                  {meta.description}
                </p>
              </div>
            </div>
          );
        })()}

        <TabsContent value="overview" className="mt-0 space-y-6">
          {/* Quick stats — at-a-glance KPI cards, each navigates to its tab */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {[
              {
                label: "Buildings",
                value: (buildings as any[])?.length ?? 0,
                accent: "from-blue-500 to-indigo-500",
                icon: Building,
                tab: "ksyk-builder",
              },
              {
                label: "Rooms",
                value: (rooms as any[])?.length ?? 0,
                accent: "from-emerald-500 to-teal-500",
                icon: MapPin,
                tab: "ksyk-builder",
              },
              {
                label: "Staff",
                value: (staff as any[])?.length ?? 0,
                accent: "from-amber-500 to-orange-500",
                icon: IdCard,
                tab: "staff",
              },
              {
                label: "Announcements",
                value: (announcements as any[])?.filter((a: any) => a.isActive).length ?? 0,
                accent: "from-rose-500 to-pink-500",
                icon: Megaphone,
                tab: "announcements",
              },
            ].map(({ label, value, accent, icon: Icon, tab }) => (
              <button
                key={label}
                type="button"
                onClick={() => navigate(tab)}
                className="text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900 rounded-xl"
                aria-label={`Go to ${label} tab`}
              >
                <Card className="relative overflow-hidden border-0 shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
                  <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accent}`} />
                  <CardContent className="p-4 md:p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
                        <p className="text-3xl md:text-4xl font-bold mt-1 tabular-nums">{value}</p>
                      </div>
                      <div className={`p-2 rounded-xl bg-gradient-to-br ${accent} text-white shadow-sm`}>
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </button>
            ))}
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { label: "New Announcement", desc: "Post a notice to all users", icon: Megaphone, tab: "announcements", accent: "bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/30 dark:border-rose-800" },
              { label: "Manage Staff", desc: "Update the staff directory", icon: Users, tab: "staff", accent: "bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100 dark:bg-violet-950/30 dark:border-violet-800" },
              { label: "Open Builder", desc: "Edit rooms and floors", icon: Box, tab: "ksyk-builder", accent: "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/30 dark:border-amber-800" },
              { label: "Campus Map", desc: "Preview the live map", icon: MapPin, tab: "campus-map", accent: "bg-teal-50 border-teal-200 text-teal-700 hover:bg-teal-100 dark:bg-teal-950/30 dark:border-teal-800" },
              { label: "View Tickets", desc: "Check open support requests", icon: Ticket, tab: "tickets", accent: "bg-sky-50 border-sky-200 text-sky-700 hover:bg-sky-100 dark:bg-sky-950/30 dark:border-sky-800" },
              { label: "App Logs", desc: "Server activity & errors", icon: ScrollText, tab: "logs", accent: "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 dark:bg-slate-950/30 dark:border-slate-800" },
            ].map(({ label, desc, icon: Icon, tab, accent }) => (
              <button
                key={label}
                type="button"
                onClick={() => navigate(tab)}
                className={`flex items-center gap-3 p-4 rounded-xl border text-left transition-colors ${accent}`}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/60 dark:bg-gray-900/40">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{label}</p>
                  <p className="text-xs opacity-70 truncate">{desc}</p>
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
                    onClick={() => navigate("ksyk-builder")}
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
                    <Button size="sm" variant="outline" className="h-7 text-xs mt-1" onClick={() => navigate("ksyk-builder")}>
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
                            {b.isActive ? "Active" : "Off"}
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
                                  headers: { 'Content-Type': 'application/json' },
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
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify(newUser)
                                });
                                
                                if (!response.ok) {
                                  const error = await response.json();
                                  throw new Error(error.message || 'Failed to create user');
                                }
                                
                                const result = await response.json();
                                
                                const description = newUser.passwordOption === 'email'
                                  ? `Invitation sent to ${newUser.email}.`
                                  : "User account created.";
                                toast({ title: "User created", description });
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
                  <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <table className="w-full">
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
                              <Badge className="bg-green-100 dark:bg-green-950/40 text-green-800 dark:text-green-300">Active</Badge>
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
                                          const r = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
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

        <TabsContent value="wilma" className="mt-0 space-y-6">
          {/* Wilma user manager */}
          <EnhancedWilmaUserManager />

          {/* Wilma integration config — owner only */}
          {isOwner && <WilmaConfigPanel />}
        </TabsContent>

        <TabsContent forceMount value="campus-map" className={cn("mt-0 h-full overflow-hidden", activeTab !== "campus-map" && "hidden")}>
          <KSYKMapView />
        </TabsContent>

        <TabsContent forceMount value="ksyk-builder" className={cn("mt-0 h-full flex flex-col overflow-hidden p-4 sm:p-6 pb-0", activeTab !== "ksyk-builder" && "hidden")}>
          {/* Builder sub-tabs — rooms / map defaults */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-gray-100 dark:bg-gray-800 self-start mb-3 shadow-sm shrink-0">
            {([
              { id: "rooms" as const, label: "Rooms & Floors" },
              { id: "map" as const, label: "Map Defaults" },
            ]).map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setBuilderSubtab(id)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  builderSubtab === id
                    ? "bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-300"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
                }`}
                aria-pressed={builderSubtab === id}
              >
                {label}
              </button>
            ))}
          </div>

          {builderSubtab === "rooms" ? (
            <div className="flex-1 min-h-0 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
              <ImprovedKSYKBuilder />
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto">
              <div className="max-w-3xl pb-6">
                <MapSettingsPanel showPublish />
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="logs" className="mt-0 space-y-6">
          <AppLogsManager />
        </TabsContent>

        <TabsContent value="schedules" className="mt-0 space-y-6">
          <SchedulesManager rooms={rooms as Room[]} />

          {/* ── Wilma integration (owner-only) ───────────────── */}
          {isOwner && (
            <Card className={cn(
              "border",
              wilmaConfig?.configured
                ? "border-emerald-200 dark:border-emerald-800"
                : "border-dashed border-gray-300 dark:border-gray-700"
            )}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                      wilmaConfig?.configured
                        ? "bg-emerald-100 dark:bg-emerald-950/40"
                        : "bg-gray-100 dark:bg-gray-800"
                    )}>
                      <GraduationCap className={cn(
                        "h-4 w-4",
                        wilmaConfig?.configured ? "text-emerald-600 dark:text-emerald-400" : "text-gray-400"
                      )} />
                    </div>
                    <div>
                      <CardTitle className="text-sm">Wilma Integration</CardTitle>
                      <CardDescription className="text-xs">
                        {wilmaConfig?.configured
                          ? `Server: ${wilmaConfig.serverUrl}`
                          : "Not configured — schedules use manual entries only"}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {wilmaConfig?.configured && (
                      <Badge variant="outline" className="text-[10px] border-emerald-300 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30">
                        <CheckCircle2 className="h-3 w-3 mr-1" />Configured
                      </Badge>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-xs text-blue-600 hover:text-blue-700"
                      onClick={() => navigate("wilma")}
                      title="Go to full Wilma integration page"
                    >
                      <ChevronRight className="h-3.5 w-3.5 mr-1" />Wilma tab
                    </Button>
                    <Button
                      size="sm"
                      variant={showWilmaConfig ? "outline" : "default"}
                      className="h-8 text-xs"
                      onClick={() => {
                        setShowWilmaConfig((v) => !v);
                        if (!showWilmaConfig && wilmaConfig) {
                          setWilmaForm({
                            serverUrl: wilmaConfig.serverUrl ?? "",
                            username: "",
                            password: "",
                            schoolConfig: "",
                          });
                        }
                      }}
                    >
                      {showWilmaConfig ? (
                        <><X className="h-3.5 w-3.5 mr-1.5" />Close</>
                      ) : (
                        <><Settings className="h-3.5 w-3.5 mr-1.5" />Configure</>
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {showWilmaConfig && (
                <CardContent className="pt-0 space-y-4">
                  <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-3 py-2.5 flex items-start gap-2 text-xs text-amber-800 dark:text-amber-300">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>Credentials are stored server-side only and are never sent back to the browser. Wilma integration is owner-only.</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs mb-1.5 block">Wilma URL *</Label>
                      <Input
                        value={wilmaForm.serverUrl}
                        onChange={(e) => setWilmaForm({ ...wilmaForm, serverUrl: e.target.value })}
                        placeholder="https://school.inschool.fi"
                        className="h-9 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs mb-1.5 block">Username *</Label>
                      <Input
                        value={wilmaForm.username}
                        onChange={(e) => setWilmaForm({ ...wilmaForm, username: e.target.value })}
                        placeholder="admin@school.fi"
                        className="h-9 text-sm"
                        autoComplete="off"
                      />
                    </div>
                    <div>
                      <Label className="text-xs mb-1.5 block">
                        Password {wilmaConfig?.configured && <span className="text-muted-foreground font-normal">(leave blank to keep current)</span>}
                      </Label>
                      <div className="relative">
                        <Input
                          type={showWilmaPassword ? "text" : "password"}
                          value={wilmaForm.password}
                          onChange={(e) => setWilmaForm({ ...wilmaForm, password: e.target.value })}
                          placeholder={wilmaConfig?.configured ? "••••••••" : "Password"}
                          className="h-9 text-sm pr-9"
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowWilmaPassword((v) => !v)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showWilmaPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs mb-1.5 block">School ID / Config</Label>
                      <Input
                        value={wilmaForm.schoolConfig}
                        onChange={(e) => setWilmaForm({ ...wilmaForm, schoolConfig: e.target.value })}
                        placeholder="e.g. school-slug or numeric ID"
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs gap-1.5"
                      disabled={!wilmaConfig?.configured || wilmaTestStatus === "testing"}
                      title={!wilmaConfig?.configured ? "Save credentials first before testing" : "Test the saved server connection"}
                      onClick={async () => {
                        setWilmaTestStatus("testing");
                        try {
                          const r = await fetch("/api/admin/wilma-config/test", {
                            method: "POST",
                            credentials: "include",
                          });
                          setWilmaTestStatus(r.ok ? "ok" : "error");
                        } catch {
                          setWilmaTestStatus("error");
                        }
                        setTimeout(() => setWilmaTestStatus("idle"), 3500);
                      }}
                    >
                      {wilmaTestStatus === "testing" ? (
                        <><Loader2 className="h-3.5 w-3.5 animate-spin" />Testing…</>
                      ) : wilmaTestStatus === "ok" ? (
                        <><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />Connected!</>
                      ) : wilmaTestStatus === "error" ? (
                        <><XCircle className="h-3.5 w-3.5 text-red-500" />Failed</>
                      ) : (
                        <><Link className="h-3.5 w-3.5" />Test Connection</>
                      )}
                    </Button>
                    <div className="flex-1" />
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => setShowWilmaConfig(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="h-8 text-xs bg-blue-600 hover:bg-blue-700"
                      disabled={!wilmaForm.serverUrl || !wilmaForm.username || wilmaSaving}
                      onClick={async () => {
                        setWilmaSaving(true);
                        try {
                          const r = await fetch("/api/admin/wilma-config", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            credentials: "include",
                            body: JSON.stringify(wilmaForm),
                          });
                          if (!r.ok) throw new Error((await r.json()).message ?? "Save failed");
                          queryClient.invalidateQueries({ queryKey: ["wilma-config"] });
                          setShowWilmaConfig(false);
                          toast({ title: "Wilma config saved", description: "Integration credentials stored securely." });
                        } catch (e: any) {
                          toast({ title: "Save failed", description: e.message, variant: "destructive" });
                        } finally {
                          setWilmaSaving(false);
                        }
                      }}
                    >
                      {wilmaSaving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                      Save credentials
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>
          )}
        </TabsContent>

        <TabsContent value="tickets" className="mt-0 space-y-6">
          <TicketManager />
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
                    onClick={editingStaff ? handleUpdateStaff : handleCreateStaff}>
                    <Save className="h-3.5 w-3.5 mr-1.5" />
                    {editingStaff ? "Update" : "Add"} Member
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
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-xs font-bold shadow-sm">
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
                        const response = await fetch('/api/admin/cleanup-all', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
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