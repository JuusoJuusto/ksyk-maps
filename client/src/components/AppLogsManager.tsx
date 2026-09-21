import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Shield, CheckCircle, XCircle, Clock, User, Mail, Monitor, Activity, AlertTriangle, Info, Users, Search, Navigation, MapPin, Eye, Zap, Globe, Smartphone, Filter } from 'lucide-react';
import { useDarkMode } from '@/contexts/DarkModeContext';
import { cn } from '@/lib/utils';
import { fetchList } from '@/lib/fetchList';

interface LoginLog {
  id: string;
  userId: string | null;
  email: string;
  userName: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  loginStatus: 'success' | 'failed';
  failureReason: string | null;
  sessionId: string | null;
  createdAt: any;
  type: 'login';
}

// Config keys the log UI knows how to style.
type AppLogLevel = 'info' | 'warning' | 'error' | 'success';

interface AppLog {
  id: string;
  // `app_logs.level` is an unconstrained varchar, so the server can write
  // levels the UI has no config for — the rate limiter emits `warn`, and the
  // schema also documents `debug`. Keep this a plain string and normalize at
  // every read site (see `normalizeLevel`) instead of trusting a narrow union.
  level: string;
  message: string;
  details?: string;
  userId?: string | null;
  userName?: string | null;
  action?: string;
  createdAt: any;
  type: 'app';
}

interface LiveActivity {
  id: string;
  type: 'page_view' | 'search' | 'room_view' | 'building_view' | 'navigation' | 'feature_use';
  description: string;
  user: string;
  location?: string;
  timestamp: Date;
  details?: any;
}

type LogEntry = LoginLog | AppLog;

// Map any raw log level onto one of the four config keys the UI can render.
// `warn` → `warning` matches the server's vocabulary; `debug` and every other
// unknown value fall back to `info`, so a level the UI has no config for can
// never produce an undefined lookup and blank the whole panel.
const normalizeLevel = (level: string): AppLogLevel => {
  switch (level) {
    case 'info':
    case 'success':
    case 'warning':
    case 'error':
      return level;
    case 'warn':
      return 'warning';
    default:
      return 'info';
  }
};

export default function AppLogsManager() {
  const { darkMode } = useDarkMode();
  const [activeTab, setActiveTab] = useState('all');
  // v4.7.17 — row-click opens a right-side sheet with full details
  // instead of inline expansion (which made every row a huge card).
  const [openLog, setOpenLog] = useState<LogEntry | null>(null);
  // v4.7.17 — client-side pagination on the fetched limit.
  const PAGE_SIZE = 50;
  const [page, setPage] = useState(0);
  useEffect(() => { setPage(0); }, [activeTab]);

  // Every list query goes through fetchList so a 404 / auth redirect
  // can't leak a non-array into the `.map` chains that used to crash
  // the whole panel.
  const { data: loginLogs = [], isLoading: loginLogsLoading } = useQuery<LoginLog[]>({
    queryKey: ['admin-login-logs'],
    queryFn: async () => {
      const rows = await fetchList<Omit<LoginLog, 'type'>>('/api/admin-login-logs?limit=100');
      return rows.map((log) => ({ ...log, type: 'login' as const }));
    },
    refetchInterval: 30000,
  });

  const { data: appLogs = [], isLoading: appLogsLoading } = useQuery<AppLog[]>({
    queryKey: ['app-logs'],
    queryFn: async () => {
      const rows = await fetchList<{
        id: string; level: AppLog['level']; message: string;
        source?: string; timestamp: unknown;
      }>('/api/logs');
      return rows.map((log) => ({
        id: log.id,
        level: log.level,
        message: log.message,
        details: log.source,
        action: log.source?.toUpperCase() || 'UNKNOWN',
        createdAt: log.timestamp,
        type: 'app' as const,
      }));
    },
    refetchInterval: 30000,
  });

  // The analytics queries feed a lot of downstream `any`-typed
  // recharts + rendering code — cast to `any[]` / `any` at the boundary
  // so we get the runtime array guarantee without breaking downstream
  // sites that were already relying on unchecked shapes.
  const { data: analyticsEvents = [], isLoading: eventsLoading } = useQuery<any[]>({
    queryKey: ['analytics-events'],
    queryFn: async () => (await fetchList<unknown>('/api/telemetry/events')) as any[],
    refetchInterval: 10000,
  });

  // v4.7.6 — removed analytics-summary, analytics-searches, and
  // analytics-rooms queries here. Their tabs moved to AdminAnalyticsDashboard
  // which owns the aggregate views; keeping the fetches here just wasted
  // /api round-trips.

  // ── Log filters ────────────────────────────────────────────────────
  // The unfiltered stream can be firehose-loud on a busy day, so we surface
  // three cheap controls: level (info/warn/error), date range (24h/7d/30d/
  // all), and a free-text search. All filters compose. Defaults to 24h so
  // the panel opens focused on the most recent activity.
  const [levelFilter, setLevelFilter] = useState<'all' | 'info' | 'warning' | 'error'>('all');
  const [rangeFilter, setRangeFilter] = useState<'24h' | '7d' | '30d' | 'all'>('24h');
  const [searchQuery, setSearchQuery] = useState('');

  const rawAllLogs: LogEntry[] = useMemo(() => (
    [...loginLogs, ...appLogs].sort((a, b) => {
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
      return dateB.getTime() - dateA.getTime();
    })
  ), [loginLogs, appLogs]);

  const rangeCutoff = useMemo(() => {
    const ms = { '24h': 86_400_000, '7d': 7 * 86_400_000, '30d': 30 * 86_400_000 } as const;
    if (rangeFilter === 'all') return 0;
    return Date.now() - ms[rangeFilter];
  }, [rangeFilter]);

  const allLogs: LogEntry[] = useMemo(() => rawAllLogs.filter((log) => {
    // Range
    const raw = log.createdAt?.toDate ? log.createdAt.toDate() : new Date(log.createdAt);
    if (rangeCutoff && raw.getTime() < rangeCutoff) return false;
    // Level (login logs pass through only when 'all' is selected)
    if (levelFilter !== 'all') {
      if (log.type !== 'app') return false;
      const lvl = normalizeLevel((log as AppLog).level);
      if (levelFilter === 'info' && !(lvl === 'info' || lvl === 'success')) return false;
      if (levelFilter === 'warning' && lvl !== 'warning') return false;
      if (levelFilter === 'error' && lvl !== 'error') return false;
    }
    // Search — cheap contains match on message + email + userName
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const hay = log.type === 'login'
        ? `${(log as LoginLog).email || ''} ${(log as LoginLog).userName || ''} ${(log as LoginLog).failureReason || ''}`
        : `${(log as AppLog).message || ''} ${(log as AppLog).details || ''} ${(log as AppLog).action || ''}`;
      if (!hay.toLowerCase().includes(q)) return false;
    }
    return true;
  // Show newest first, capped to 100 to keep the DOM light for large
  // datasets — the filters are the escape hatch to see more.
  }).slice(0, 100), [rawAllLogs, rangeCutoff, levelFilter, searchQuery]);

  // Sparkline data — bucket the last 24h of raw logs into hour-of-day
  // slots for a "log volume" strip at the top of the panel.
  const sparkline24h = useMemo(() => {
    const cutoff = Date.now() - 86_400_000;
    const buckets = Array.from({ length: 24 }, () => 0);
    for (const log of rawAllLogs) {
      const raw = log.createdAt?.toDate ? log.createdAt.toDate() : new Date(log.createdAt);
      const t = raw.getTime();
      if (t < cutoff) continue;
      // Bucket by hour offset from cutoff (0=oldest, 23=newest).
      const hourOffset = Math.min(23, Math.max(0, Math.floor((t - cutoff) / 3_600_000)));
      buckets[hourOffset] += 1;
    }
    return buckets;
  }, [rawAllLogs]);
  const sparklineMax = Math.max(1, ...sparkline24h);
  const sparklineTotal = sparkline24h.reduce((a, b) => a + b, 0);

  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const loginSuccessCount = loginLogs.filter((log: any) => log.loginStatus === 'success').length;
  const loginFailedCount = loginLogs.filter((log: any) => log.loginStatus === 'failed').length;
  const appInfoCount = appLogs.filter((log) => {
    const lvl = normalizeLevel(log.level);
    return lvl === 'info' || lvl === 'success';
  }).length;
  const appWarningCount = appLogs.filter((log) => {
    const lvl = normalizeLevel(log.level);
    return lvl === 'warning' || lvl === 'error';
  }).length;

  const isLoading = loginLogsLoading || appLogsLoading || eventsLoading;

  // Prepare chart data from real analytics
  const activityByHour = Array.from({ length: 24 }, (_, hour) => {
    const hourEvents = analyticsEvents.filter((event: any) => {
      const eventDate = new Date(event.timestamp);
      return eventDate.getHours() === hour;
    });
    return {
      hour: `${hour}:00`,
      events: hourEvents.length
    };
  });

  const eventsByType = analyticsEvents.reduce((acc: any, event: any) => {
    const type = event.type || 'other';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  const eventTypeData = Object.entries(eventsByType).map(([name, value]) => ({
    // Defensive coercion — KV blob rows from older client builds sometimes
    // lack `type`, which crashed the entire admin page ("Cannot read
    // properties of undefined (reading 'replace')"). Now we always end up
    // with a string.
    name: String(name ?? 'other').replace(/_/g, ' ').toUpperCase(),
    value
  }));

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  if (isLoading) {
    return (
      <Card className={cn(darkMode && "bg-gray-900 border-gray-700")}>
        <CardContent className="p-12 text-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading logs...</p>
        </CardContent>
      </Card>
    );
  }

  /**
   * v4.7.17 — compact row renderer. Every log (login or app) collapses
   * to a single scannable line: time · level chip · message · source.
   * Row click opens the detail sheet with everything else. Old
   * bulky renderers replaced entirely.
   */
  const renderCompactRow = (log: LogEntry) => {
    const time = formatDate(log.createdAt);
    const isLogin = log.type === "login";
    const level = isLogin
      ? ((log as LoginLog).loginStatus === "success" ? "success" : "error")
      : normalizeLevel((log as AppLog).level);
    const levelColor: Record<string, string> = {
      info:    "text-blue-600 dark:text-blue-400",
      success: "text-emerald-600 dark:text-emerald-400",
      warning: "text-amber-600 dark:text-amber-400",
      error:   "text-red-600 dark:text-red-400",
    };
    const message = isLogin
      ? `${(log as LoginLog).userName || (log as LoginLog).email} · ${(log as LoginLog).loginStatus}`
      : (log as AppLog).message;
    const source = isLogin ? "login" : ((log as AppLog).action ?? "app");
    return (
      <tr
        key={log.id}
        onClick={() => setOpenLog(log)}
        className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/60 focus-visible:outline-none focus-visible:bg-slate-100 dark:focus-visible:bg-slate-900"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpenLog(log); }}}
      >
        <td className="px-3 py-2 text-[11px] font-mono text-slate-500 whitespace-nowrap tabular-nums">
          {time}
        </td>
        <td className="px-3 py-2">
          <span className={cn("text-[10px] font-bold uppercase tracking-wider", levelColor[level])}>
            {level}
          </span>
        </td>
        <td className="px-3 py-2 text-sm max-w-[520px] truncate">{message}</td>
        <td className="px-3 py-2 text-[11px] text-slate-500 font-mono">{source}</td>
      </tr>
    );
  };

  const renderLoginLog = (log: LoginLog) => (
    <div
      key={log.id}
      className={cn(
        'border rounded-lg p-4 transition-all hover:shadow-md',
        log.loginStatus === 'success'
          ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30'
          : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30'
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          {log.loginStatus === 'success' ? (
            <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
          ) : (
            <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
          )}
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-gray-900 dark:text-white">
                {log.userName || 'Unknown User'}
              </span>
              <Badge variant={log.loginStatus === 'success' ? 'default' : 'destructive'}>
                {log.loginStatus}
              </Badge>
              <Badge variant="outline">LOGIN</Badge>
            </div>
            <div className="flex items-center space-x-2 mt-1">
              <Mail className="h-3 w-3 text-gray-500 dark:text-gray-400" />
              <span className="text-sm text-gray-600 dark:text-gray-400">{log.email}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
          <Clock className="h-4 w-4" />
          <span>{formatDate(log.createdAt)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        {log.ipAddress && (
          <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
            <Monitor className="h-4 w-4" />
            <span>IP: {log.ipAddress}</span>
          </div>
        )}
        {log.sessionId && (
          <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
            <User className="h-4 w-4" />
            <span className="truncate">Session: {log.sessionId.substring(0, 16)}...</span>
          </div>
        )}
      </div>

      {log.failureReason && (
        <div className="mt-3 p-2 bg-red-100 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded text-sm text-red-800 dark:text-red-300">
          <strong>Failure Reason:</strong> {log.failureReason}
        </div>
      )}

      {log.userAgent && (
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 truncate">
          {log.userAgent}
        </div>
      )}
    </div>
  );

  const renderAppLog = (log: AppLog) => {
    const levelConfig = {
      info: { icon: Info, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-blue-200 dark:border-blue-800' },
      success: { icon: CheckCircle, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-950/30', border: 'border-green-200 dark:border-green-800' },
      warning: { icon: AlertTriangle, color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-950/30', border: 'border-yellow-200 dark:border-yellow-700' },
      error: { icon: XCircle, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950/30', border: 'border-red-200 dark:border-red-800' },
    };

    const config = levelConfig[normalizeLevel(log.level)];
    const Icon = config.icon;

    return (
      <div
        key={log.id}
        className={`border rounded-lg p-4 transition-all hover:shadow-md ${config.border} ${config.bg}`}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center space-x-3">
            <Icon className={`h-6 w-6 ${config.color}`} />
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-gray-900 dark:text-white">{log.message}</span>
                <Badge variant="outline">{log.level.toUpperCase()}</Badge>
                {log.action && <Badge variant="secondary">{log.action}</Badge>}
              </div>
              {log.userName && (
                <div className="flex items-center space-x-2 mt-1">
                  <User className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">{log.userName}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
            <Clock className="h-4 w-4" />
            <span>{formatDate(log.createdAt)}</span>
          </div>
        </div>

        {log.details && (
          <div className="mt-2 text-sm text-gray-700 dark:text-gray-300 pl-9">
            {log.details}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* v4.7.14 apple-design pass 2 — trimmed the 4 giant colored stat
       *  cards into a single quiet inline row. Same information, a
       *  quarter of the visual weight. Icons only where they help
       *  recognition; no colored circles. */}
      <div className="flex flex-wrap items-baseline gap-x-8 gap-y-3 text-sm border-b border-border pb-4">
        <StatInline label="Total logs"  value={allLogs.length} />
        <StatInline label="Live events" value={analyticsEvents.length} />
        <StatInline label="Logins"      value={loginLogs.length} />
        <StatInline label="App events"  value={appLogs.length} />
      </div>

      {/* Sparkline — 24h log volume in a compact strip so the admin can
          spot bursts at a glance without reading the full stream. */}
      <Card className="rounded-2xl ring-1 ring-black/5 dark:ring-white/5 bg-card">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground">
                Log volume · last 24h
              </p>
              <p className="text-lg font-semibold tabular-nums mt-0.5">
                {sparklineTotal}
                <span className="text-xs text-muted-foreground ml-1.5">events</span>
              </p>
            </div>
            <div className="text-xs text-muted-foreground">
              peak {sparklineMax}/hr
            </div>
          </div>
          {/* Inline SVG sparkline — no extra deps, matches KSYK blue accent. */}
          <svg viewBox="0 0 240 40" className="w-full h-10" preserveAspectRatio="none">
            <polyline
              fill="none"
              stroke="#2563eb"
              strokeWidth="1.5"
              strokeLinejoin="round"
              points={sparkline24h.map((v, i) => {
                const x = (i / (sparkline24h.length - 1)) * 240;
                const y = 40 - (v / sparklineMax) * 34 - 3;
                return `${x.toFixed(1)},${y.toFixed(1)}`;
              }).join(' ')}
            />
            {/* Bar chips under the line for a bit of depth. */}
            {sparkline24h.map((v, i) => {
              const w = 240 / sparkline24h.length - 1;
              const x = (i / sparkline24h.length) * 240;
              const h = (v / sparklineMax) * 34;
              return (
                <rect
                  key={i}
                  x={x}
                  y={40 - h - 3}
                  width={w}
                  height={h}
                  fill="#2563eb"
                  opacity="0.15"
                />
              );
            })}
          </svg>
        </CardContent>
      </Card>

      {/* Filter bar — three composable controls above the tabs. Filters
          persist while the panel is open but reset on remount. */}
      <Card className="rounded-2xl ring-1 ring-black/5 dark:ring-white/5 bg-card">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 shrink-0">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground">
                Filters
              </span>
            </div>
            {/* Level pills */}
            <div className="flex items-center gap-1 rounded-lg bg-gray-100 dark:bg-gray-800 p-1">
              {(['all', 'info', 'warning', 'error'] as const).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setLevelFilter(lvl)}
                  className={cn(
                    'text-xs px-2.5 py-1 rounded-md active:scale-[0.98] transition-all capitalize',
                    levelFilter === lvl
                      ? 'bg-white dark:bg-gray-700 shadow-sm font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {lvl}
                </button>
              ))}
            </div>
            {/* Range pills */}
            <div className="flex items-center gap-1 rounded-lg bg-gray-100 dark:bg-gray-800 p-1">
              {(['24h', '7d', '30d', 'all'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRangeFilter(r)}
                  className={cn(
                    'text-xs px-2.5 py-1 rounded-md active:scale-[0.98] transition-all',
                    rangeFilter === r
                      ? 'bg-white dark:bg-gray-700 shadow-sm font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
            {/* Search */}
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search messages, emails, actions…"
                className="pl-8 h-8 text-xs"
              />
            </div>
            {(levelFilter !== 'all' || rangeFilter !== '24h' || searchQuery) && (
              <button
                type="button"
                onClick={() => { setLevelFilter('all'); setRangeFilter('24h'); setSearchQuery(''); }}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline shrink-0"
              >
                Reset
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Logs Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Live log stream</CardTitle>
          <CardDescription>
            Raw event stream, logins, and app events (latest 100 · filters apply).
            For aggregate metrics, features, and sessions see the <b>Analytics</b> pill.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* v4.7.6 — trimmed from 7 to 4 tabs. Analytics / Insights /
           *  Easter Eggs used to live here AND in the Analytics pill —
           *  admins asked why every card appeared twice. Kept only the
           *  raw-log views here; aggregate views live in Analytics. */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">All Logs ({allLogs.length})</TabsTrigger>
              <TabsTrigger value="live">Live Events ({analyticsEvents.length})</TabsTrigger>
              <TabsTrigger value="logins">Logins ({loginLogs.length})</TabsTrigger>
              <TabsTrigger value="app">App Events ({appLogs.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="live" className="mt-4">
              <div className="mb-4 p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-green-800 dark:text-green-300 font-semibold">Live Activity Feed</span>
                  <Badge variant="outline" className="text-green-700 dark:text-green-400 border-green-300 dark:border-green-700">
                    Real-time
                  </Badge>
                </div>
                <p className="text-sm text-green-700 dark:text-green-400 mt-1">
                  Showing real user activity on KSYK Maps (updates every 10 seconds)
                </p>
              </div>
              
              <ScrollArea className="h-[600px]">
                <div className="space-y-3">
                  {analyticsEvents.length === 0 ? (
                    <div className="text-center py-12">
                      <Eye className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                      <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">No Live Activity</h3>
                      <p className="text-gray-500 dark:text-gray-400">User activity will appear here in real-time</p>
                    </div>
                  ) : (
                    analyticsEvents.map((event: any) => (
                      <div
                        key={event.id}
                        className="border rounded-lg p-4 transition-all hover:shadow-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0">
                              {event.type === 'page_view' && <Eye className="h-5 w-5 text-blue-600" />}
                              {event.type === 'search' && <Search className="h-5 w-5 text-purple-600" />}
                              {event.type === 'room_view' && <MapPin className="h-5 w-5 text-green-600" />}
                              {event.type === 'building_view' && <Monitor className="h-5 w-5 text-orange-600" />}
                              {event.type === 'navigation' && <Navigation className="h-5 w-5 text-red-600" />}
                              {!['page_view', 'search', 'room_view', 'building_view', 'navigation'].includes(String(event.type ?? '')) && <Zap className="h-5 w-5 text-yellow-600" />}
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="font-medium text-gray-900 dark:text-white">{event.message}</span>
                                <Badge variant="outline" className="text-xs">
                                  {String(event.type ?? 'other').replace(/_/g, ' ').toUpperCase()}
                                </Badge>
                              </div>
                              <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600 dark:text-gray-400">
                                {event.userId && (
                                  <div className="flex items-center space-x-1">
                                    <User className="h-3 w-3" />
                                    <span>{event.userId.substring(0, 8)}...</span>
                                  </div>
                                )}
                                {event.userAgent && (
                                  <div className="flex items-center space-x-1">
                                    <Monitor className="h-3 w-3" />
                                    <span className="truncate max-w-[200px]">{event.userAgent.split(' ')[0]}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                            <Clock className="h-4 w-4" />
                            <span>{new Date(event.timestamp).toLocaleTimeString()}</span>
                          </div>
                        </div>
                        {event.details && (
                          <div className="mt-2 text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 p-2 rounded">
                            {event.details}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="all" className="mt-4">
              <LogTable
                rows={allLogs}
                page={page}
                pageSize={PAGE_SIZE}
                onPageChange={setPage}
                emptyTitle="No logs yet"
                emptyHint={searchQuery || levelFilter !== 'all' || rangeFilter !== '24h'
                  ? 'No logs match the current filters.'
                  : 'System activity will appear here.'}
                renderRow={renderCompactRow}
              />
            </TabsContent>

            <TabsContent value="logins" className="mt-4">
              <LogTable
                rows={loginLogs as LogEntry[]}
                page={page}
                pageSize={PAGE_SIZE}
                onPageChange={setPage}
                emptyTitle="No login activity"
                emptyHint="Login attempts will appear here."
                renderRow={renderCompactRow}
              />
            </TabsContent>

            <TabsContent value="app" className="mt-4">
              <LogTable
                rows={appLogs as LogEntry[]}
                page={page}
                pageSize={PAGE_SIZE}
                onPageChange={setPage}
                emptyTitle="No app events"
                emptyHint="Application events will appear here."
                renderRow={renderCompactRow}
              />
            </TabsContent>

          </Tabs>
        </CardContent>
      </Card>

      {/* v4.7.17 — row-click detail sheet. Full log payload with
       *  human-readable fields on top and monospace technical fields
       *  below. Escape closes; focus is trapped by the Sheet. */}
      <LogDetailSheet log={openLog} onClose={() => setOpenLog(null)} />
    </div>
  );
}

/**
 * v4.7.14 — quiet inline stat. Replaces the giant colored StatCard
 * per admin redesign pass 2. No card, no icon circle, no colored bar
 * — just a label and a large tabular value that reads well next to
 * its siblings.
 */
function StatInline({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
        {label}
      </span>
      <span className="text-2xl font-semibold tabular-nums tracking-tight text-slate-900 dark:text-white mt-0.5 leading-none">
        {value.toLocaleString()}
      </span>
    </div>
  );
}

/**
 * v4.7.17 — clean log table + pagination. Renders `rows.slice(page,
 * page+pageSize)` in a compact scannable table. When the row set is
 * empty and there's no filter, shows the two-line empty state; when
 * a filter is applied, shows a Clear-filters affordance path
 * (surfaced by the parent via `emptyHint`).
 */
function LogTable({
  rows,
  page,
  pageSize,
  onPageChange,
  emptyTitle,
  emptyHint,
  renderRow,
}: {
  rows: LogEntry[];
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  emptyTitle: string;
  emptyHint: string;
  renderRow: (log: LogEntry) => JSX.Element;
}) {
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const clampedPage = Math.min(page, totalPages - 1);
  const start = clampedPage * pageSize;
  const slice = rows.slice(start, start + pageSize);

  if (total === 0) {
    return (
      <div className="py-14 text-center">
        <p className="text-sm text-slate-700 dark:text-slate-200">{emptyTitle}</p>
        <p className="text-xs text-slate-500 mt-1">{emptyHint}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/70 dark:bg-slate-900/40 text-[10px] uppercase tracking-[0.12em] text-slate-500">
              <tr>
                <th className="text-left px-3 py-2 font-semibold">Time</th>
                <th className="text-left px-3 py-2 font-semibold">Level</th>
                <th className="text-left px-3 py-2 font-semibold">Message</th>
                <th className="text-left px-3 py-2 font-semibold">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {slice.map(renderRow)}
            </tbody>
          </table>
        </div>
      </div>

      {/* v4.7.17 — pagination footer. Prev/Next + page indicator.
       *  Server-side cursor pagination is a follow-up round. */}
      <div className="flex items-center justify-between px-1 text-[11px] text-slate-500">
        <span className="tabular-nums">
          Showing {start + 1}–{Math.min(start + pageSize, total)} of {total.toLocaleString()}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPageChange(Math.max(0, clampedPage - 1))}
            disabled={clampedPage === 0}
            className={cn(
              "h-7 px-2 rounded-md font-semibold transition-colors",
              "hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1",
            )}
          >
            ‹ Prev
          </button>
          <span className="tabular-nums px-2">
            {clampedPage + 1} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => onPageChange(Math.min(totalPages - 1, clampedPage + 1))}
            disabled={clampedPage >= totalPages - 1}
            className={cn(
              "h-7 px-2 rounded-md font-semibold transition-colors",
              "hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1",
            )}
          >
            Next ›
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * v4.7.17 — log detail sheet. Right-side slide-in with the full log
 * payload split into human-readable fields (top) and monospace
 * technical detail (below). Escape closes; focus is trapped by the
 * Sheet primitive.
 */
function LogDetailSheet({
  log,
  onClose,
}: {
  log: LogEntry | null;
  onClose: () => void;
}) {
  const isOpen = log !== null;
  return (
    <Sheet open={isOpen} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        {log && (
          <>
            <SheetHeader>
              <SheetTitle className="text-base font-semibold">
                {log.type === "login" ? "Login event" : "App event"}
              </SheetTitle>
              <SheetDescription className="text-xs">
                {new Date(log.createdAt).toLocaleString()}
              </SheetDescription>
            </SheetHeader>

            <div className="mt-6 space-y-4">
              {log.type === "login" && (
                <>
                  <Field label="User" value={(log as LoginLog).userName || (log as LoginLog).email} />
                  <Field label="Email" value={(log as LoginLog).email} mono />
                  <Field label="Status" value={(log as LoginLog).loginStatus} />
                  {(log as LoginLog).failureReason && (
                    <Field label="Failure reason" value={(log as LoginLog).failureReason!} />
                  )}
                  {(log as LoginLog).ipAddress && (
                    <Field label="IP" value={(log as LoginLog).ipAddress!} mono />
                  )}
                  {(log as LoginLog).sessionId && (
                    <Field label="Session" value={(log as LoginLog).sessionId!} mono />
                  )}
                  {(log as LoginLog).userAgent && (
                    <Field label="User agent" value={(log as LoginLog).userAgent!} mono wrap />
                  )}
                </>
              )}
              {log.type === "app" && (
                <>
                  <Field label="Level" value={(log as AppLog).level} />
                  <Field label="Message" value={(log as AppLog).message} />
                  {(log as AppLog).action && (
                    <Field label="Action" value={(log as AppLog).action!} mono />
                  )}
                  {(log as AppLog).userName && (
                    <Field label="User" value={(log as AppLog).userName!} />
                  )}
                  {(log as AppLog).details && (
                    <div>
                      <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-slate-500 mb-1">
                        Details
                      </p>
                      <pre className="text-[11px] font-mono bg-slate-50 dark:bg-slate-900 p-3 rounded-lg overflow-x-auto max-h-64 whitespace-pre-wrap break-all">
                        {(log as AppLog).details}
                      </pre>
                    </div>
                  )}
                </>
              )}
              <Field label="Log ID" value={log.id} mono />
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Field({
  label,
  value,
  mono = false,
  wrap = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  wrap?: boolean;
}) {
  return (
    <div>
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>
      <p
        className={cn(
          "text-sm text-slate-900 dark:text-slate-100 mt-0.5",
          mono && "font-mono text-[12px]",
          wrap && "break-all",
        )}
      >
        {value}
      </p>
    </div>
  );
}
