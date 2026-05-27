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
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Clock,
  AlertTriangle,
  Layers,
  MessageSquare,
  Settings,
  Sparkles,
  Brain,
  Zap,
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

function isValidTab(s?: string): s is TabSlug {
  return !!s && (TAB_SLUGS as readonly string[]).includes(s);
}

export default function AdminDashboard({ section }: { section?: string }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const initialTab = isValidTab(section) ? section : "overview";
  const [activeTab, setActiveTab] = useState<string>(initialTab);

  // Sync with URL when the browser navigates back/forward or the section prop changes
  useEffect(() => {
    const next = isValidTab(section) ? section : "overview";
    if (next !== activeTab) setActiveTab(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section]);

  const navigate = (tab: string) => {
    setActiveTab(tab);
    const path = tab === "overview" ? ADMIN_BASE : `${ADMIN_BASE}/${tab}`;
    setLocation(path);
  };
  const [builderSubtab, setBuilderSubtab] = useState<"rooms" | "map">("rooms");
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: "",
    titleEn: "",
    titleFi: "",
    content: "",
    contentEn: "",
    contentFi: "",
    priority: "normal",
    publishDate: new Date().toISOString().slice(0, 16), // datetime-local format
    expiresAt: "" // optional expiry date
  });
  
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
  
  // Builder state
  const [builderMode, setBuilderMode] = useState<'buildings' | 'rooms' | 'hallways'>('buildings');
  const [editingRoom, setEditingRoom] = useState<any>(null);

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

  // Create announcement mutation
  const createAnnouncementMutation = useMutation({
    mutationFn: async (announcement: any) => {
      const response = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(announcement),
      });
      if (!response.ok) throw new Error("Failed to create announcement");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      setNewAnnouncement({
        title: "",
        titleEn: "",
        titleFi: "",
        content: "",
        contentEn: "",
        contentFi: "",
        priority: "normal",
        publishDate: new Date().toISOString().slice(0, 16),
        expiresAt: ""
      });
    },
  });

  // Update announcement mutation
  const updateAnnouncementMutation = useMutation({
    mutationFn: async ({ id, ...announcement }: any) => {
      const response = await fetch(`/api/announcements/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(announcement),
      });
      if (!response.ok) throw new Error("Failed to update announcement");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      setEditingAnnouncement(null);
    },
  });

  // Delete announcement mutation
  const deleteAnnouncementMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/announcements/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete announcement");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
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

  const handleCreateAnnouncement = () => {
    if (!newAnnouncement.title || !newAnnouncement.content) {
      toast({ title: "Required fields missing", description: "Please fill in title and content.", variant: "destructive" });
      return;
    }
    createAnnouncementMutation.mutate(newAnnouncement);
  };

  const handleUpdateAnnouncement = () => {
    if (!editingAnnouncement) return;
    updateAnnouncementMutation.mutate(editingAnnouncement);
  };

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

  const handleDeleteStaff = (id: string, name: string) => {
    if (!confirm(`Delete staff member ${name}?`)) return;
    deleteStaffMutation.mutate(id);
  };


  const logoutFn = () => {
    if (!window.confirm("Log out?")) return;
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
    <div className="flex h-full overflow-hidden bg-white dark:bg-gray-900">

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
      <Tabs value={activeTab} onValueChange={navigate} className="flex-1 flex flex-col min-h-0 overflow-hidden bg-gray-50 dark:bg-gray-950">
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

        {/* Scrollable content */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="p-4 sm:p-6">

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
            {(buildings as any[]).length > 0 && (
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
                      Manage →
                    </button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
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
                </CardContent>
              </Card>
            )}

            {/* Latest announcements */}
            {(announcements as any[]).length > 0 && (
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
                      Manage →
                    </button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {(announcements as Announcement[]).slice(0, 4).map((a) => (
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
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="users" className="mt-0 space-y-6">
          {!isOwner ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Users className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">Owner Access Only</h3>
                <p className="text-gray-500 dark:text-gray-400">User management is restricted to the owner account for security.</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>User Management (Owner Only)</CardTitle>
                    <CardDescription>
                      Add and manage users in the system. Roles: visitor, user, admin, owner.
                    </CardDescription>
                  </div>
                  <Button 
                    onClick={() => {
                      setShowUserForm(true);
                      setEditingUser(null);
                      setNewUser({ email: "", firstName: "", lastName: "", role: "admin", password: "", passwordOption: "manual" });
                      setShowPasswordField(false);
                    }}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
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
                              {user.email !== "JuusoJuusto112@gmail.com" && (
                                <div className="flex space-x-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setEditingUser(user);
                                      setShowUserForm(true);
                                      setShowPasswordField(false);
                                    }}
                                    title="Edit user"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-blue-600 hover:text-blue-700"
                                    onClick={() => setViewingPassword(user.id)}
                                    title="View password"
                                  >
                                    👁️
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-600 hover:text-red-700"
                                    onClick={async () => {
                                      if (confirm(`Delete user ${user.email}?\n\nThis action cannot be undone.`)) {
                                        try {
                                          const response = await fetch(`/api/users/${user.id}`, {
                                            method: 'DELETE'
                                          });
                                          
                                          if (!response.ok) {
                                            const error = await response.json();
                                            throw new Error(error.message || 'Failed to delete user');
                                          }

                                          toast({ title: "User deleted", description: "Account removed." });
                                          queryClient.invalidateQueries({ queryKey: ["users"] });
                                        } catch (error: any) {
                                          toast({ title: "Error", description: error.message, variant: "destructive" });
                                        }
                                      }
                                    }}
                                    title="Delete user"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}
                              {user.email === "JuusoJuusto112@gmail.com" && (
                                <Badge className="bg-yellow-100 text-yellow-800">Owner</Badge>
                              )}
                            </td>
                          </tr>
                        ))}
                        {users.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                              No users found. Click "Add User" to create one.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">Owner Account Information</h4>
                    <div className="space-y-1 text-sm text-blue-800 dark:text-blue-300">
                      <p><strong>Email:</strong> JuusoJuusto112@gmail.com</p>
                      <p><strong>Name:</strong> Juuso Kaikula</p>
                      <p><strong>Role:</strong> Owner/Admin</p>
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                        This account is hardcoded and cannot be edited or deleted.
                      </p>
                    </div>
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

        <TabsContent value="campus-map" className="mt-0 h-[calc(100dvh-14rem)] lg:h-[calc(100dvh-9.5rem)] min-h-[500px] overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
          <KSYKMapView />
        </TabsContent>

        <TabsContent value="ksyk-builder" className="mt-0 h-[calc(100dvh-14rem)] lg:h-[calc(100dvh-9.5rem)] min-h-[500px] flex flex-col overflow-hidden rounded-xl">
          {/* Builder sub-tabs — rooms / map defaults */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-gray-100 dark:bg-gray-800 self-start mb-3 shadow-sm">
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
                <MapSettingsPanel />
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="logs" className="mt-0 space-y-6">
          <AppLogsManager />
        </TabsContent>

        <TabsContent value="schedules" className="mt-0 space-y-6">
          <SchedulesManager rooms={rooms as Room[]} />
        </TabsContent>

        <TabsContent value="tickets" className="mt-0 space-y-6">
          <TicketManager />
        </TabsContent>

        <TabsContent value="staff" className="mt-0 space-y-6">
          {/* Staff Form */}
          {showStaffForm && (
            <Card className="border border-gray-200 dark:border-gray-700 shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{editingStaff ? "Edit Staff Member" : "Add New Staff Member"}</CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      {editingStaff ? "Update staff member information" : "Fill in the details to add a new staff member"}
                    </CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => { setShowStaffForm(false); setEditingStaff(null); }}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>First Name *</Label>
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
                    <Label>Last Name *</Label>
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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Email</Label>
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
                    <Label>Phone</Label>
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

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Position (Default)</Label>
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
                    <Label>Position (English)</Label>
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
                    <Label>Position (Finnish)</Label>
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

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Department (Default)</Label>
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
                    <Label>Department (English)</Label>
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
                    <Label>Department (Finnish)</Label>
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

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={editingStaff ? editingStaff.isActive : newStaff.isActive}
                    onChange={(e) => {
                      if (editingStaff) {
                        setEditingStaff({ ...editingStaff, isActive: e.target.checked });
                      } else {
                        setNewStaff({ ...newStaff, isActive: e.target.checked });
                      }
                    }}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="isActive">Active</Label>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowStaffForm(false);
                      setEditingStaff(null);
                    }}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    className="bg-green-600 hover:bg-green-700"
                    onClick={editingStaff ? handleUpdateStaff : handleCreateStaff}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {editingStaff ? "Update" : "Create"} Staff Member
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
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Staff Directory</CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    {staff.length === 0
                      ? "No staff members added yet."
                      : `${staff.length} member${staff.length === 1 ? "" : "s"}`}
                  </CardDescription>
                </div>
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
                <div className="text-center py-12">
                  <Users className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Staff Members</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">Get started by adding your first staff member</p>
                  <Button 
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={() => {
                      setShowStaffForm(true);
                      setEditingStaff(null);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Staff Member
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {staff.slice(0, 20).map((member: Staff) => (
                    <div key={member.id} className="flex items-center justify-between p-3 rounded-xl border border-transparent hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:border-gray-200 dark:hover:border-gray-700 transition-all">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                          {member.firstName?.[0]}{member.lastName?.[0]}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                            {member.firstName} {member.lastName}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {member.position || 'No position'} • {member.department || 'No department'}
                          </p>
                          {member.email && (
                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{member.email}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={member.isActive ? "default" : "secondary"} className={member.isActive ? "bg-green-600" : ""}>
                          {member.isActive ? "Active" : "Inactive"}
                        </Badge>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-8 w-8 p-0"
                          onClick={() => {
                            setEditingStaff(member);
                            setShowStaffForm(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                          onClick={() => handleDeleteStaff(member.id, `${member.firstName} ${member.lastName}`)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {staff.length > 20 && (
                    <div className="text-center py-4 border-t">
                      <p className="text-sm text-muted-foreground">
                        Showing 20 of {staff.length} staff members
                      </p>
                      <Button variant="outline" size="sm" className="mt-2">
                        Load More
                      </Button>
                    </div>
                  )}
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
                
                <Button
                  variant="destructive"
                  size="lg"
                  className="w-full bg-red-600 hover:bg-red-700"
                  onClick={async () => {
                    const confirmText = prompt(
                      'This will DELETE ALL DATA from the map!\n\n' +
                      'Type "DELETE_EVERYTHING" to confirm this destructive action:'
                    );
                    
                    if (confirmText !== 'DELETE_EVERYTHING') {
                      alert('Cleanup cancelled. Data is safe.');
                      return;
                    }
                    
                    const finalConfirm = confirm(
                      'FINAL CONFIRMATION:\n\n' +
                      'Are you absolutely sure you want to delete ALL buildings, rooms, hallways, stairs, announcements, and staff?\n\n' +
                      'This action CANNOT be undone!'
                    );
                    
                    if (!finalConfirm) {
                      alert('Cleanup cancelled. Data is safe.');
                      return;
                    }
                    
                    try {
                      console.log('🗑️ Starting complete data cleanup...');
                      
                      const response = await fetch('/api/admin/cleanup-all', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        credentials: 'include',
                        body: JSON.stringify({
                          confirmDelete: 'DELETE_EVERYTHING'
                        })
                      });
                      
                      const result = await response.json();
                      
                      if (response.ok) {
                        alert(
                          '✅ SUCCESS! All data has been deleted.\n\n' +
                          `📊 Deletion Summary:\n` +
                          `🏢 Buildings: ${result.deleted.buildings}\n` +
                          `🚪 Rooms: ${result.deleted.rooms}\n` +
                          `🛤️ Hallways: ${result.deleted.hallways}\n` +
                          `🏗️ Floors: ${result.deleted.floors}\n` +
                          `📢 Announcements: ${result.deleted.announcements}\n` +
                          `👥 Staff: ${result.deleted.staff}\n\n` +
                          '🎯 The map is now completely empty!'
                        );
                        
                        // Refresh all data
                        queryClient.invalidateQueries({ queryKey: ["buildings"] });
                        queryClient.invalidateQueries({ queryKey: ["rooms"] });
                        queryClient.invalidateQueries({ queryKey: ["announcements"] });
                        queryClient.invalidateQueries({ queryKey: ["staff"] });
                        
                        // Refresh the page to show empty state
                        window.location.reload();
                      } else {
                        alert(`❌ Failed to delete data: ${result.message}`);
                      }
                    } catch (error: any) {
                      console.error('Cleanup error:', error);
                      alert(`❌ Error during cleanup: ${error.message}`);
                    }
                  }}
                >
                  <Trash2 className="h-5 w-5 mr-2" />
                  DELETE ALL MAP DATA
                </Button>
                
                <p className="text-xs text-red-600 text-center">
                  This button will completely empty the KSYK Maps database
                </p>
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