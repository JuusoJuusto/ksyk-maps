import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Clock, User, Monitor, Search, Navigation, MapPin, Eye, Zap, Filter } from 'lucide-react';
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
type AppLogLevel = 'debug' | 'info' | 'warning' | 'error' | 'fatal' | 'success';

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


type LogEntry = LoginLog | AppLog;

// Map any raw log level onto one of the four config keys the UI can render.
// `warn` → `warning` matches the server's vocabulary; `debug` and every other
// unknown value fall back to `info`, so a level the UI has no config for can
// never produce an undefined lookup and blank the whole panel.
const normalizeLevel = (level: string): AppLogLevel => {
  switch (level) {
    case 'debug':   return 'debug';
    case 'info':    return 'info';
    case 'success': return 'success';
    case 'warning': return 'warning';
    case 'error':   return 'error';
    case 'fatal':   return 'fatal';
    case 'warn':    return 'warning';
    case 'critical':
    case 'crit':    return 'fatal';
    default:        return 'info';
  }
};

export default function AppLogsManager() {
  const [activeTab, setActiveTab] = useState('all');
  // v4.7.17 — row-click opens a right-side sheet with full details
  // instead of inline expansion (which made every row a huge card).
  const [openLog, setOpenLog] = useState<LogEntry | null>(null);
  // v4.7.17 — client-side pagination on the fetched limit.
  const PAGE_SIZE = 50;
  const [page, setPage] = useState(0);
  useEffect(() => { setPage(0); }, [activeTab]);

  // ── Log filters — declared early so they can be included in query keys.
  const [levelFilter, setLevelFilter] = useState<'all' | 'debug' | 'info' | 'warning' | 'error' | 'fatal'>('all');
  const [rangeFilter, setRangeFilter] = useState<'24h' | '7d' | '30d' | 'all'>('24h');
  const [searchQuery, setSearchQuery] = useState('');

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

  // v4.7.19 — client-side cursor pagination. First page auto-fetches;
  // "Load older" appends the next page via /api/logs?cursor=<lastTs>.
  // Cursor stack lets us reset back to page 1 on filter/tab changes
  // without re-fetching everything the user already saw.
  const [appLogCursors, setAppLogCursors] = useState<string[]>([]);
  const [appLogPages, setAppLogPages] = useState<AppLog[][]>([]);
  const [appLogHasMore, setAppLogHasMore] = useState(true);
  const [appLogsLoadingMore, setAppLogsLoadingMore] = useState(false);

  // Reset cursor stack whenever filters change so stale older pages
  // don't mix with a freshly filtered first page.
  useEffect(() => {
    setAppLogPages([]);
    setAppLogCursors([]);
    setAppLogHasMore(true);
  }, [levelFilter, rangeFilter]);

  const { data: appLogFirstPage, isLoading: appLogsLoading } = useQuery<{
    rows: AppLog[]; nextCursor: string | null;
  }>({
    queryKey: ['app-logs', 'v2', levelFilter, rangeFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('limit', '100');
      if (levelFilter !== 'all') params.set('level', levelFilter);
      if (rangeFilter !== 'all') params.set('range', rangeFilter);
      const qs = params.toString() ? `?${params.toString()}` : '';
      const res = await fetch(`/api/logs${qs}`, {
        credentials: 'include',
        headers: (() => {
          try {
            const t = localStorage.getItem('ksyk_admin_token');
            const h: Record<string, string> = {};
            if (t) h.Authorization = `Bearer ${t}`;
            return h;
          } catch { return {} as Record<string, string>; }
        })(),
      });
      if (!res.ok) return { rows: [], nextCursor: null };
      const body = await res.json().catch(() => ({}));
      const rawRows: Array<{
        id: string; level: AppLog['level']; message: string;
        source?: string; timestamp: unknown;
      }> = Array.isArray(body?.rows) ? body.rows : Array.isArray(body) ? body : [];
      return {
        rows: rawRows.map((log) => ({
          id: log.id,
          level: log.level,
          message: log.message,
          details: log.source,
          action: log.source?.toUpperCase() || 'UNKNOWN',
          createdAt: log.timestamp,
          type: 'app' as const,
        })),
        nextCursor: (body?.nextCursor ?? null) as string | null,
      };
    },
    refetchInterval: 30000,
  });

  // Reset the older-pages stack whenever the first page is fetched
  // fresh (initial load or refetch). Older pages become stale because
  // new events may have arrived on top.
  useEffect(() => {
    if (appLogFirstPage) {
      setAppLogPages([]);
      setAppLogCursors(appLogFirstPage.nextCursor ? [appLogFirstPage.nextCursor] : []);
      setAppLogHasMore(!!appLogFirstPage.nextCursor);
    }
  }, [appLogFirstPage]);

  const appLogs: AppLog[] = useMemo(() => [
    ...(appLogFirstPage?.rows ?? []),
    ...appLogPages.flat(),
  ], [appLogFirstPage, appLogPages]);

  const loadOlderAppLogs = async () => {
    const cursor = appLogCursors[appLogCursors.length - 1];
    if (!cursor || appLogsLoadingMore) return;
    setAppLogsLoadingMore(true);
    try {
      const res = await fetch(`/api/logs?limit=100&cursor=${encodeURIComponent(cursor)}`, {
        credentials: 'include',
        headers: (() => {
          try {
            const t = localStorage.getItem('ksyk_admin_token');
            const h: Record<string, string> = {};
            if (t) h.Authorization = `Bearer ${t}`;
            return h;
          } catch { return {} as Record<string, string>; }
        })(),
      });
      if (!res.ok) return;
      const body = await res.json().catch(() => ({}));
      const raw: Array<{ id: string; level: AppLog['level']; message: string; source?: string; timestamp: unknown }> =
        Array.isArray(body?.rows) ? body.rows : [];
      const mapped: AppLog[] = raw.map((log) => ({
        id: log.id,
        level: log.level,
        message: log.message,
        details: log.source,
        action: log.source?.toUpperCase() || 'UNKNOWN',
        createdAt: log.timestamp,
        type: 'app' as const,
      }));
      setAppLogPages((prev) => [...prev, mapped]);
      if (body?.nextCursor) {
        setAppLogCursors((prev) => [...prev, body.nextCursor]);
        setAppLogHasMore(true);
      } else {
        setAppLogHasMore(false);
      }
    } finally {
      setAppLogsLoadingMore(false);
    }
  };

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
      if (levelFilter === 'debug'   && lvl !== 'debug') return false;
      if (levelFilter === 'info'    && !(lvl === 'info' || lvl === 'success')) return false;
      if (levelFilter === 'warning' && lvl !== 'warning') return false;
      if (levelFilter === 'error'   && lvl !== 'error') return false;
      if (levelFilter === 'fatal'   && lvl !== 'fatal') return false;
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
      debug:   "text-slate-400 dark:text-slate-500",
      info:    "text-blue-600 dark:text-blue-400",
      success: "text-emerald-600 dark:text-emerald-400",
      warning: "text-amber-600 dark:text-amber-400",
      error:   "text-red-600 dark:text-red-400",
      fatal:   "text-red-900 dark:text-red-300 font-bold",
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
            <div className="flex items-center gap-1 rounded-lg bg-gray-100 dark:bg-gray-800 p-1 flex-wrap">
              {([
                { value: 'all',     label: 'All' },
                { value: 'debug',   label: 'Debug' },
                { value: 'info',    label: 'Info' },
                { value: 'warning', label: 'Warn' },
                { value: 'error',   label: 'Error' },
                { value: 'fatal',   label: 'Fatal' },
              ] as const).map(({ value: lvl, label }) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setLevelFilter(lvl)}
                  className={cn(
                    'text-xs px-2.5 py-1 rounded-md active:scale-[0.98] transition-all',
                    levelFilter === lvl
                      ? cn(
                          'bg-white dark:bg-gray-700 shadow-sm font-semibold',
                          lvl === 'fatal'   && 'text-red-800 dark:text-red-300',
                          lvl === 'error'   && 'text-red-600 dark:text-red-400',
                          lvl === 'warning' && 'text-amber-600 dark:text-amber-400',
                          lvl === 'debug'   && 'text-slate-500',
                        )
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {label}
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
            {(levelFilter !== 'all' || rangeFilter !== '24h' || searchQuery.trim()) && (
              <button
                type="button"
                onClick={() => { setLevelFilter('all'); setRangeFilter('24h'); setSearchQuery(''); }}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline shrink-0"
              >
                Reset filters
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
              <div className="mb-4 p-4 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[14px] font-semibold text-gray-900 dark:text-white">Live activity feed</span>
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Real-time</span>
                </div>
                <p className="text-[12px] text-muted-foreground mt-1">
                  Showing real user activity on KSYK Maps (updates every 10 seconds).
                </p>
              </div>
              
              <ScrollArea className="h-[600px]">
                <div className="space-y-3">
                  {eventsLoading ? (
                    <div className="text-center py-12">
                      <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto" />
                      <p className="mt-3 text-xs text-muted-foreground">Loading live events…</p>
                    </div>
                  ) : analyticsEvents.length === 0 ? (
                    <div className="text-center py-12">
                      <Eye className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                      <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">No Live Activity</h3>
                      <p className="text-gray-500 dark:text-gray-400">User activity will appear here in real-time</p>
                    </div>
                  ) : (
                    analyticsEvents.map((event: any) => (
                      <div
                        key={event.id}
                        className="border border-gray-200 dark:border-gray-800 rounded-xl p-4 transition-colors bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-700"
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
              {(loginLogsLoading || appLogsLoading) ? (
                <div className="py-10 text-center">
                  <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto" />
                  <p className="mt-3 text-xs text-muted-foreground">Loading logs…</p>
                </div>
              ) : (
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
              )}
            </TabsContent>

            <TabsContent value="logins" className="mt-4">
              {loginLogsLoading ? (
                <div className="py-10 text-center">
                  <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto" />
                  <p className="mt-3 text-xs text-muted-foreground">Loading logins…</p>
                </div>
              ) : (
                <LogTable
                  rows={loginLogs as LogEntry[]}
                  page={page}
                  pageSize={PAGE_SIZE}
                  onPageChange={setPage}
                  emptyTitle="No login activity"
                  emptyHint="Login attempts will appear here."
                  renderRow={renderCompactRow}
                />
              )}
            </TabsContent>

            <TabsContent value="app" className="mt-4">
              {appLogsLoading ? (
                <div className="py-10 text-center">
                  <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto" />
                  <p className="mt-3 text-xs text-muted-foreground">Loading app events…</p>
                </div>
              ) : (
              <LogTable
                rows={appLogs as LogEntry[]}
                page={page}
                pageSize={PAGE_SIZE}
                onPageChange={setPage}
                emptyTitle="No app events"
                emptyHint="Application events will appear here."
                renderRow={renderCompactRow}
              />
              )}
              {/* v4.7.19 — Load older button. Only appears on the last
               *  page of the current stack so users don't get a stale
               *  cursor when they're mid-way through browsing. */}
              {appLogHasMore && appLogs.length > 0 && (
                <div className="flex justify-center pt-3">
                  <button
                    type="button"
                    onClick={loadOlderAppLogs}
                    disabled={appLogsLoadingMore}
                    className={cn(
                      "h-8 px-4 rounded-md text-[12px] font-semibold transition-colors",
                      "border border-slate-200 dark:border-slate-800",
                      "hover:bg-slate-50 dark:hover:bg-slate-900",
                      "disabled:opacity-50 disabled:cursor-not-allowed",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1",
                    )}
                  >
                    {appLogsLoadingMore ? "Loading…" : "Load older"}
                  </button>
                </div>
              )}
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
                <th scope="col" className="text-left px-3 py-2 font-semibold">Time</th>
                <th scope="col" className="text-left px-3 py-2 font-semibold">Level</th>
                <th scope="col" className="text-left px-3 py-2 font-semibold">Message</th>
                <th scope="col" className="text-left px-3 py-2 font-semibold">Source</th>
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
