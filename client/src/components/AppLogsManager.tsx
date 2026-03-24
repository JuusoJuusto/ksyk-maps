import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, CheckCircle, XCircle, Clock, User, Mail, Monitor, Activity, AlertTriangle, Info, Users, Search, Navigation, MapPin, Eye, Zap, Globe, Smartphone, TrendingUp, BarChart3 } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';

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

interface AppLog {
  id: string;
  level: 'info' | 'warning' | 'error' | 'success';
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

export default function AppLogsManager() {
  const [activeTab, setActiveTab] = useState('all');

  const { data: loginLogs = [], isLoading: loginLogsLoading } = useQuery({
    queryKey: ['admin-login-logs'],
    queryFn: async () => {
      const response = await fetch('/api/admin-login-logs?limit=100', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch login logs');
      const data = await response.json();
      return data.map((log: any) => ({ ...log, type: 'login' as const }));
    },
    refetchInterval: 30000,
  });

  // Fetch app logs from API
  const { data: appLogs = [], isLoading: appLogsLoading } = useQuery({
    queryKey: ['app-logs'],
    queryFn: async () => {
      const response = await fetch('/api/logs', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch app logs');
      const data = await response.json();
      return data.map((log: any) => ({
        id: log.id,
        level: log.level as 'info' | 'warning' | 'error' | 'success',
        message: log.message,
        details: log.source,
        action: log.source?.toUpperCase() || 'UNKNOWN',
        createdAt: log.timestamp,
        type: 'app' as const
      }));
    },
    refetchInterval: 30000,
  });

  // Fetch REAL analytics events
  const { data: analyticsEvents = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['analytics-events'],
    queryFn: async () => {
      const response = await fetch('/api/analytics/events', {
        credentials: 'include'
      });
      if (!response.ok) return [];
      return response.json();
    },
    refetchInterval: 10000, // Refresh every 10 seconds for near real-time
  });

  // Fetch analytics data
  const { data: analyticsSummary, isLoading: analyticsLoading } = useQuery({
    queryKey: ['analytics-summary'],
    queryFn: async () => {
      const response = await fetch('/api/analytics/summary', {
        credentials: 'include'
      });
      if (!response.ok) return null;
      return response.json();
    },
    refetchInterval: 60000,
  });

  const { data: topSearches, isLoading: searchesLoading } = useQuery({
    queryKey: ['analytics-searches'],
    queryFn: async () => {
      const response = await fetch('/api/analytics/searches', {
        credentials: 'include'
      });
      if (!response.ok) return [];
      return response.json();
    },
    refetchInterval: 60000,
  });

  const { data: popularRooms, isLoading: roomsLoading } = useQuery({
    queryKey: ['analytics-rooms'],
    queryFn: async () => {
      const response = await fetch('/api/analytics/rooms', {
        credentials: 'include'
      });
      if (!response.ok) return [];
      return response.json();
    },
    refetchInterval: 60000,
  });

  const allLogs: LogEntry[] = [...loginLogs, ...appLogs].sort((a, b) => {
    const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
    const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
    return dateB.getTime() - dateA.getTime();
  });

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
  const appInfoCount = appLogs.filter((log: any) => log.level === 'info' || log.level === 'success').length;
  const appWarningCount = appLogs.filter((log: any) => log.level === 'warning' || log.level === 'error').length;

  const isLoading = loginLogsLoading || appLogsLoading || analyticsLoading || searchesLoading || roomsLoading || eventsLoading;

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
    name: name.replace('_', ' ').toUpperCase(),
    value
  }));

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading logs...</p>
        </CardContent>
      </Card>
    );
  }

  const renderLoginLog = (log: LoginLog) => (
    <div
      key={log.id}
      className={`border rounded-lg p-4 transition-all hover:shadow-md ${
        log.loginStatus === 'success'
          ? 'border-green-200 bg-green-50'
          : 'border-red-200 bg-red-50'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          {log.loginStatus === 'success' ? (
            <CheckCircle className="h-6 w-6 text-green-600" />
          ) : (
            <XCircle className="h-6 w-6 text-red-600" />
          )}
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-gray-900">
                {log.userName || 'Unknown User'}
              </span>
              <Badge variant={log.loginStatus === 'success' ? 'default' : 'destructive'}>
                {log.loginStatus}
              </Badge>
              <Badge variant="outline">LOGIN</Badge>
            </div>
            <div className="flex items-center space-x-2 mt-1">
              <Mail className="h-3 w-3 text-gray-500" />
              <span className="text-sm text-gray-600">{log.email}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <Clock className="h-4 w-4" />
          <span>{formatDate(log.createdAt)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        {log.ipAddress && (
          <div className="flex items-center space-x-2 text-gray-600">
            <Monitor className="h-4 w-4" />
            <span>IP: {log.ipAddress}</span>
          </div>
        )}
        {log.sessionId && (
          <div className="flex items-center space-x-2 text-gray-600">
            <User className="h-4 w-4" />
            <span className="truncate">Session: {log.sessionId.substring(0, 16)}...</span>
          </div>
        )}
      </div>

      {log.failureReason && (
        <div className="mt-3 p-2 bg-red-100 border border-red-200 rounded text-sm text-red-800">
          <strong>Failure Reason:</strong> {log.failureReason}
        </div>
      )}

      {log.userAgent && (
        <div className="mt-2 text-xs text-gray-500 truncate">
          {log.userAgent}
        </div>
      )}
    </div>
  );

  const renderAppLog = (log: AppLog) => {
    const levelConfig = {
      info: { icon: Info, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
      success: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
      warning: { icon: AlertTriangle, color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200' },
      error: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
    };

    const config = levelConfig[log.level];
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
                <span className="font-semibold text-gray-900">{log.message}</span>
                <Badge variant="outline">{log.level.toUpperCase()}</Badge>
                {log.action && <Badge variant="secondary">{log.action}</Badge>}
              </div>
              {log.userName && (
                <div className="flex items-center space-x-2 mt-1">
                  <User className="h-3 w-3 text-gray-500" />
                  <span className="text-sm text-gray-600">{log.userName}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <Clock className="h-4 w-4" />
            <span>{formatDate(log.createdAt)}</span>
          </div>
        </div>

        {log.details && (
          <div className="mt-2 text-sm text-gray-700 pl-9">
            {log.details}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Logs</p>
                <p className="text-3xl font-bold">{allLogs.length}</p>
              </div>
              <Activity className="h-10 w-10 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Live Events</p>
                <p className="text-3xl font-bold text-green-600">{analyticsEvents.length}</p>
              </div>
              <Zap className="h-10 w-10 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Visitors</p>
                <p className="text-3xl font-bold text-purple-600">{analyticsSummary?.totalVisitors || 0}</p>
              </div>
              <Users className="h-10 w-10 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Searches</p>
                <p className="text-3xl font-bold text-orange-600">{analyticsSummary?.totalSearches || 0}</p>
              </div>
              <Search className="h-10 w-10 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Page Views</p>
                <p className="text-3xl font-bold text-blue-600">{analyticsSummary?.totalPageViews || 0}</p>
              </div>
              <Eye className="h-10 w-10 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Logs Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Application Logs</CardTitle>
          <CardDescription>
            Track all system activity, logins, and events
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="all">All Logs ({allLogs.length})</TabsTrigger>
              <TabsTrigger value="live">Live Events ({analyticsEvents.length})</TabsTrigger>
              <TabsTrigger value="logins">Logins ({loginLogs.length})</TabsTrigger>
              <TabsTrigger value="app">App Events ({appLogs.length})</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="insights">Insights</TabsTrigger>
            </TabsList>

            <TabsContent value="live" className="mt-4">
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-green-800 font-semibold">Live Activity Feed</span>
                  <Badge variant="outline" className="text-green-700 border-green-300">
                    Real-time
                  </Badge>
                </div>
                <p className="text-sm text-green-700 mt-1">
                  Showing real user activity on KSYK Maps (updates every 10 seconds)
                </p>
              </div>
              
              <ScrollArea className="h-[600px]">
                <div className="space-y-3">
                  {analyticsEvents.length === 0 ? (
                    <div className="text-center py-12">
                      <Eye className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                      <h3 className="text-lg font-semibold text-gray-700 mb-2">No Live Activity</h3>
                      <p className="text-gray-500">User activity will appear here in real-time</p>
                    </div>
                  ) : (
                    analyticsEvents.map((event: any) => (
                      <div
                        key={event.id}
                        className="border rounded-lg p-4 transition-all hover:shadow-md bg-white border-gray-200 hover:border-blue-300"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0">
                              {event.type === 'page_view' && <Eye className="h-5 w-5 text-blue-600" />}
                              {event.type === 'search' && <Search className="h-5 w-5 text-purple-600" />}
                              {event.type === 'room_view' && <MapPin className="h-5 w-5 text-green-600" />}
                              {event.type === 'building_view' && <Monitor className="h-5 w-5 text-orange-600" />}
                              {event.type === 'navigation' && <Navigation className="h-5 w-5 text-red-600" />}
                              {!['page_view', 'search', 'room_view', 'building_view', 'navigation'].includes(event.type) && <Zap className="h-5 w-5 text-yellow-600" />}
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="font-medium text-gray-900">{event.message}</span>
                                <Badge variant="outline" className="text-xs">
                                  {event.type.replace('_', ' ').toUpperCase()}
                                </Badge>
                              </div>
                              <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
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
                          <div className="flex items-center space-x-2 text-sm text-gray-500">
                            <Clock className="h-4 w-4" />
                            <span>{new Date(event.timestamp).toLocaleTimeString()}</span>
                          </div>
                        </div>
                        {event.details && (
                          <div className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded">
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
              <ScrollArea className="h-[600px]">
                <div className="space-y-3">
                  {allLogs.length === 0 ? (
                    <div className="text-center py-12">
                      <Activity className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                      <h3 className="text-lg font-semibold text-gray-700 mb-2">No Logs Yet</h3>
                      <p className="text-gray-500">Activity will appear here</p>
                    </div>
                  ) : (
                    allLogs.map((log) => 
                      log.type === 'login' ? renderLoginLog(log as LoginLog) : renderAppLog(log as AppLog)
                    )
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="logins" className="mt-4">
              <ScrollArea className="h-[600px]">
                <div className="space-y-3">
                  {loginLogs.length === 0 ? (
                    <div className="text-center py-12">
                      <Shield className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                      <h3 className="text-lg font-semibold text-gray-700 mb-2">No Login Logs Yet</h3>
                      <p className="text-gray-500">Login activity will appear here</p>
                    </div>
                  ) : (
                    loginLogs.map((log: LoginLog) => renderLoginLog(log))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="app" className="mt-4">
              <ScrollArea className="h-[600px]">
                <div className="space-y-3">
                  {appLogs.length === 0 ? (
                    <div className="text-center py-12">
                      <Info className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                      <h3 className="text-lg font-semibold text-gray-700 mb-2">No App Logs Yet</h3>
                      <p className="text-gray-500">Application events will appear here</p>
                    </div>
                  ) : (
                    appLogs.map((log: AppLog) => renderAppLog(log))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="analytics" className="mt-4">
              <div className="space-y-6">
                {/* Analytics Summary */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-2">
                        <Users className="h-8 w-8 text-blue-600" />
                        <div>
                          <p className="text-2xl font-bold">{analyticsSummary?.totalVisitors || 0}</p>
                          <p className="text-sm text-gray-600">Total Visitors</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-2">
                        <Monitor className="h-8 w-8 text-green-600" />
                        <div>
                          <p className="text-2xl font-bold">{analyticsSummary?.totalPageViews || 0}</p>
                          <p className="text-sm text-gray-600">Page Views</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-2">
                        <Search className="h-8 w-8 text-purple-600" />
                        <div>
                          <p className="text-2xl font-bold">{analyticsSummary?.totalSearches || 0}</p>
                          <p className="text-sm text-gray-600">Searches</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-2">
                        <Navigation className="h-8 w-8 text-orange-600" />
                        <div>
                          <p className="text-2xl font-bold">{analyticsSummary?.totalNavigationRequests || 0}</p>
                          <p className="text-sm text-gray-600">Navigation</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Activity by Hour Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>Activity by Hour (Last 24 Hours)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={activityByHour}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="hour" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Area type="monotone" dataKey="events" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Event Types Distribution */}
                {eventTypeData.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Event Types Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie
                              data={eventTypeData}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {eventTypeData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={eventTypeData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="value" fill="#3b82f6" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Top Searches */}
                <Card>
                  <CardHeader>
                    <CardTitle>Top Searches</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {topSearches && topSearches.length > 0 ? (
                      <div className="space-y-3">
                        {topSearches.slice(0, 10).map((search: any, index: number) => (
                          <div key={index} className="flex justify-between items-center">
                            <div className="flex items-center space-x-2">
                              <Search className="h-4 w-4 text-gray-500" />
                              <span className="font-medium">"{search.query}"</span>
                              <Badge variant="outline" className="text-xs">{search.type}</Badge>
                            </div>
                            <span className="text-sm text-gray-600">{search.count} times</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center text-gray-500 py-4">
                        No search data available yet
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Popular Rooms */}
                <Card>
                  <CardHeader>
                    <CardTitle>Most Visited Rooms</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {popularRooms && popularRooms.length > 0 ? (
                      <div className="space-y-3">
                        {popularRooms.slice(0, 10).map((room: any, index: number) => (
                          <div key={index} className="flex justify-between items-center">
                            <div className="flex items-center space-x-2">
                              <MapPin className="h-4 w-4 text-gray-500" />
                              <span className="font-medium">{room.roomNumber}</span>
                              <span className="text-sm text-gray-600">({room.building})</span>
                            </div>
                            <span className="text-sm text-gray-600">{room.visits} visits</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center text-gray-500 py-4">
                        No room visit data available yet
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="insights" className="mt-4">
              <div className="space-y-6">
                {/* Geographic Insights */}
                <Card>
                  <CardHeader>
                    <CardTitle>Geographic Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {analyticsSummary?.topCountries && analyticsSummary.topCountries.length > 0 ? (
                      <>
                        <div className="space-y-3 mb-6">
                          {analyticsSummary.topCountries.map((country: any, index: number) => (
                            <div key={index} className="flex justify-between items-center">
                              <span className="font-medium">{country.country}</span>
                              <div className="flex items-center space-x-2">
                                <div className="w-24 bg-gray-200 rounded-full h-2">
                                  <div 
                                    className="bg-blue-600 h-2 rounded-full"
                                    style={{ width: `${(country.count / (analyticsSummary.topCountries[0]?.count || 1)) * 100}%` }}
                                  />
                                </div>
                                <span className="text-sm text-gray-600 w-12 text-right">{country.count}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={analyticsSummary.topCountries}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="country" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="count" fill="#3b82f6" />
                          </BarChart>
                        </ResponsiveContainer>
                      </>
                    ) : (
                      <div className="text-center text-gray-500 py-4">
                        No geographic data available yet
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Browser Usage */}
                <Card>
                  <CardHeader>
                    <CardTitle>Browser Usage</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {analyticsSummary?.topBrowsers && analyticsSummary.topBrowsers.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          {analyticsSummary.topBrowsers.map((browser: any, index: number) => (
                            <div key={index} className="flex justify-between items-center">
                              <span className="font-medium">{browser.browser}</span>
                              <div className="flex items-center space-x-2">
                                <div className="w-24 bg-gray-200 rounded-full h-2">
                                  <div 
                                    className="bg-green-600 h-2 rounded-full"
                                    style={{ width: `${(browser.count / (analyticsSummary.topBrowsers[0]?.count || 1)) * 100}%` }}
                                  />
                                </div>
                                <span className="text-sm text-gray-600 w-12 text-right">{browser.count}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                        <ResponsiveContainer width="100%" height={250}>
                          <PieChart>
                            <Pie
                              data={analyticsSummary.topBrowsers}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ browser, count }) => `${browser}: ${count}`}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="count"
                            >
                              {analyticsSummary.topBrowsers.map((entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="text-center text-gray-500 py-4">
                        No browser data available yet
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Usage Patterns */}
                <Card>
                  <CardHeader>
                    <CardTitle>Usage Patterns</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">
                          {analyticsSummary?.avgSessionDuration ? Math.floor(analyticsSummary.avgSessionDuration / 60) : 0}m {analyticsSummary?.avgSessionDuration ? Math.round(analyticsSummary.avgSessionDuration % 60) : 0}s
                        </div>
                        <div className="text-sm text-gray-600">Avg Session Duration</div>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          {analyticsSummary?.peakHours?.join(', ') || 'N/A'}
                        </div>
                        <div className="text-sm text-gray-600">Peak Hours</div>
                      </div>
                      <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <div className="text-2xl font-bold text-purple-600">
                          {Math.round((1 - (analyticsSummary?.bounceRate || 0)) * 100)}%
                        </div>
                        <div className="text-sm text-gray-600">Engagement Rate</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Real-time Activity Trend */}
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Activity Trend</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={activityByHour}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="hour" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="events" stroke="#8b5cf6" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
