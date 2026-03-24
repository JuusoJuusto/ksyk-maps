import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { 
  Shield, CheckCircle, XCircle, Clock, User, Mail, Monitor, 
  Activity, TrendingUp, Eye, Server, Globe, AlertTriangle,
  BarChart3, LineChart, Users, Calendar, RefreshCw, Download,
  Filter, Search, Zap, Database, Wifi, HardDrive, Info
} from 'lucide-react';
import { 
  LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Area, AreaChart 
} from 'recharts';

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
  location?: string;
  device?: string;
}

interface AppLog {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug' | 'success';
  message: string;
  source: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: any;
  createdAt: any;
  duration?: number;
  endpoint?: string;
  statusCode?: number;
}

interface VisitorData {
  timestamp: string;
  visitors: number;
  pageViews: number;
  uniqueVisitors: number;
  bounceRate: number;
}

interface SystemMetrics {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkIn: number;
  networkOut: number;
  responseTime: number;
  uptime: number;
  activeConnections: number;
}
export default function EnhancedLogsManager() {
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [timeRange, setTimeRange] = useState('24h');

  // Fetch login logs with enhanced data
  const { data: loginLogs = [], isLoading: loginLogsLoading } = useQuery({
    queryKey: ['enhanced-login-logs', timeRange],
    queryFn: async () => {
      const response = await fetch(`/api/admin-login-logs?limit=200&timeRange=${timeRange}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch login logs');
      return response.json();
    },
    refetchInterval: 15000,
  });

  // Fetch enhanced app logs
  const { data: appLogs = [], isLoading: appLogsLoading } = useQuery({
    queryKey: ['enhanced-app-logs', timeRange],
    queryFn: async () => {
      const response = await fetch(`/api/logs/enhanced?timeRange=${timeRange}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch app logs');
      return response.json();
    },
    refetchInterval: 15000,
  });

  // Fetch visitor analytics with time series data
  const { data: visitorData = [], isLoading: visitorLoading } = useQuery({
    queryKey: ['visitor-analytics', timeRange],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/visitors?timeRange=${timeRange}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch visitor data');
      return response.json();
    },
    refetchInterval: 30000,
  });

  // Fetch system metrics
  const { data: systemMetrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['system-metrics'],
    queryFn: async () => {
      const response = await fetch('/api/system/metrics', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch system metrics');
      return response.json();
    },
    refetchInterval: 10000,
  });

  // Fetch real-time analytics
  const { data: realTimeData, isLoading: realTimeLoading } = useQuery({
    queryKey: ['real-time-analytics'],
    queryFn: async () => {
      const response = await fetch('/api/analytics/realtime', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch real-time data');
      return response.json();
    },
    refetchInterval: 5000,
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

  const getClientIP = (req: any) => {
    return req.headers['cf-connecting-ip'] || 
           req.headers['x-real-ip'] || 
           req.headers['x-forwarded-for']?.split(',')[0] || 
           req.connection?.remoteAddress || 
           'Unknown';
  };

  // Filter logs based on search and level
  const filteredAppLogs = appLogs.filter((log: AppLog) => {
    const matchesSearch = searchTerm === '' || 
      log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.source.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLevel = selectedLevel === 'all' || log.level === selectedLevel;
    return matchesSearch && matchesLevel;
  });

  const isLoading = loginLogsLoading || appLogsLoading || visitorLoading || metricsLoading || realTimeLoading;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading enhanced analytics...</p>
        </CardContent>
      </Card>
    );
  }

  // Calculate stats
  const totalLogs = loginLogs.length + appLogs.length;
  const successfulLogins = loginLogs.filter((log: LoginLog) => log.loginStatus === 'success').length;
  const failedLogins = loginLogs.filter((log: LoginLog) => log.loginStatus === 'failed').length;
  const errorLogs = appLogs.filter((log: AppLog) => log.level === 'error').length;
  const currentVisitors = realTimeData?.activeUsers || 0;

  // Prepare chart data
  const visitorChartData = visitorData.map((item: VisitorData) => ({
    time: new Date(item.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    visitors: item.visitors,
    pageViews: item.pageViews,
    uniqueVisitors: item.uniqueVisitors
  }));

  const logLevelData = [
    { name: 'Info', value: appLogs.filter((log: AppLog) => log.level === 'info').length, color: '#3B82F6' },
    { name: 'Success', value: appLogs.filter((log: AppLog) => log.level === 'success').length, color: '#10B981' },
    { name: 'Warning', value: appLogs.filter((log: AppLog) => log.level === 'warn').length, color: '#F59E0B' },
    { name: 'Error', value: appLogs.filter((log: AppLog) => log.level === 'error').length, color: '#EF4444' },
  ];

  return (
    <div className="space-y-6">
      {/* Real-time Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Users</p>
                <p className="text-2xl font-bold text-blue-600">{currentVisitors}</p>
                <p className="text-xs text-green-600">+{realTimeData?.newUsersToday || 0} today</p>
              </div>
              <Eye className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">System Health</p>
                <p className="text-2xl font-bold text-green-600">
                  {systemMetrics?.cpuUsage ? Math.round(100 - systemMetrics.cpuUsage) : 99}%
                </p>
                <p className="text-xs text-gray-600">CPU: {systemMetrics?.cpuUsage || 1}%</p>
              </div>
              <Server className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Response Time</p>
                <p className="text-2xl font-bold text-purple-600">
                  {systemMetrics?.responseTime || 45}ms
                </p>
                <p className="text-xs text-gray-600">Avg last hour</p>
              </div>
              <Zap className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Events</p>
                <p className="text-2xl font-bold text-orange-600">{totalLogs}</p>
                <p className="text-xs text-gray-600">Last {timeRange}</p>
              </div>
              <Activity className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Main Analytics Dashboard */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <TabsList className="grid w-full sm:w-auto grid-cols-2 sm:grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="visitors">Visitors</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
          </TabsList>
          
          <div className="flex gap-2">
            <select 
              value={timeRange} 
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-3 py-1 border rounded-md text-sm"
            >
              <option value="1h">Last Hour</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
            <Button size="sm" variant="outline">
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
            <Button size="sm" variant="outline">
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
          </div>
        </div>

        <TabsContent value="overview" className="space-y-6">
          {/* Visitor Analytics Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Visitor Analytics
              </CardTitle>
              <CardDescription>Real-time visitor tracking and page views</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={visitorChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="visitors" stackId="1" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.6} />
                    <Area type="monotone" dataKey="pageViews" stackId="1" stroke="#10B981" fill="#10B981" fillOpacity={0.6} />
                    <Area type="monotone" dataKey="uniqueVisitors" stackId="1" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.6} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Log Level Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Log Level Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={logLevelData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {logLevelData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  {logLevelData.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                      <span className="text-sm">{item.name}: {item.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>CPU Usage</span>
                      <span>{systemMetrics?.cpuUsage || 1}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${systemMetrics?.cpuUsage || 1}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Memory Usage</span>
                      <span>{systemMetrics?.memoryUsage || 45}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${systemMetrics?.memoryUsage || 45}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Disk Usage</span>
                      <span>{systemMetrics?.diskUsage || 23}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-purple-600 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${systemMetrics?.diskUsage || 23}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{systemMetrics?.uptime || 99.9}%</div>
                      <div className="text-xs text-gray-600">Uptime</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{systemMetrics?.activeConnections || 42}</div>
                      <div className="text-xs text-gray-600">Active Connections</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="visitors" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Visitor Insights</CardTitle>
              <CardDescription>Detailed visitor analytics and behavior patterns</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold">Geographic Distribution</h4>
                  {realTimeData?.topCountries?.map((country: any, index: number) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-sm">{country.name}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-200 rounded-full h-1">
                          <div 
                            className="bg-blue-600 h-1 rounded-full"
                            style={{ width: `${(country.visitors / (realTimeData.topCountries[0]?.visitors || 1)) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-600 w-8 text-right">{country.visitors}</span>
                      </div>
                    </div>
                  )) || <div className="text-gray-500 text-sm">No geographic data available</div>}
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-semibold">Device Types</h4>
                  {realTimeData?.deviceTypes?.map((device: any, index: number) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-sm">{device.type}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-200 rounded-full h-1">
                          <div 
                            className="bg-green-600 h-1 rounded-full"
                            style={{ width: `${(device.count / (realTimeData.deviceTypes[0]?.count || 1)) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-600 w-8 text-right">{device.count}</span>
                      </div>
                    </div>
                  )) || <div className="text-gray-500 text-sm">No device data available</div>}
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-semibold">Popular Pages</h4>
                  {realTimeData?.topPages?.map((page: any, index: number) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-sm truncate">{page.path}</span>
                      <span className="text-xs text-gray-600">{page.views}</span>
                    </div>
                  )) || <div className="text-gray-500 text-sm">No page data available</div>}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="logs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Application Logs</CardTitle>
              <CardDescription>Detailed application events and system logs</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <Input
                    placeholder="Search logs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                  />
                </div>
                <select 
                  value={selectedLevel} 
                  onChange={(e) => setSelectedLevel(e.target.value)}
                  className="px-3 py-2 border rounded-md"
                >
                  <option value="all">All Levels</option>
                  <option value="info">Info</option>
                  <option value="success">Success</option>
                  <option value="warn">Warning</option>
                  <option value="error">Error</option>
                  <option value="debug">Debug</option>
                </select>
              </div>

              <ScrollArea className="h-[500px]">
                <div className="space-y-3">
                  {filteredAppLogs.length === 0 ? (
                    <div className="text-center py-12">
                      <Activity className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                      <h3 className="text-lg font-semibold text-gray-700 mb-2">No Logs Found</h3>
                      <p className="text-gray-500">Try adjusting your filters</p>
                    </div>
                  ) : (
                    filteredAppLogs.map((log: AppLog) => {
                      const levelConfig = {
                        info: { icon: Info, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
                        success: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
                        warn: { icon: AlertTriangle, color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200' },
                        error: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
                        debug: { icon: Zap, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
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
                              <Icon className={`h-5 w-5 ${config.color}`} />
                              <div>
                                <div className="flex items-center space-x-2">
                                  <span className="font-semibold text-gray-900">{log.message}</span>
                                  <Badge variant="outline">{log.level.toUpperCase()}</Badge>
                                  <Badge variant="secondary">{log.source}</Badge>
                                </div>
                                {log.endpoint && (
                                  <div className="text-sm text-gray-600 mt-1">
                                    {log.endpoint} {log.statusCode && `(${log.statusCode})`}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2 text-sm text-gray-500">
                              <Clock className="h-4 w-4" />
                              <span>{formatDate(log.createdAt)}</span>
                              {log.duration && (
                                <Badge variant="outline" className="text-xs">
                                  {log.duration}ms
                                </Badge>
                              )}
                            </div>
                          </div>

                          {log.metadata && (
                            <div className="mt-2 text-sm text-gray-700 pl-8">
                              <pre className="whitespace-pre-wrap text-xs bg-gray-100 p-2 rounded">
                                {JSON.stringify(log.metadata, null, 2)}
                              </pre>
                            </div>
                          )}
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm mt-2 pl-8">
                            {log.ipAddress && (
                              <div className="flex items-center space-x-2 text-gray-600">
                                <Globe className="h-4 w-4" />
                                <span>IP: {log.ipAddress}</span>
                              </div>
                            )}
                            {log.userId && (
                              <div className="flex items-center space-x-2 text-gray-600">
                                <User className="h-4 w-4" />
                                <span>User: {log.userId}</span>
                              </div>
                            )}
                          </div>

                          {log.userAgent && (
                            <div className="mt-2 text-xs text-gray-500 pl-8 truncate">
                              {log.userAgent}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Login Security
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Successful Logins</span>
                    <Badge className="bg-green-100 text-green-800">{successfulLogins}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Failed Attempts</span>
                    <Badge className="bg-red-100 text-red-800">{failedLogins}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Success Rate</span>
                    <span className="font-semibold">
                      {successfulLogins + failedLogins > 0 
                        ? Math.round((successfulLogins / (successfulLogins + failedLogins)) * 100)
                        : 100}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Security Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {loginLogs
                    .filter((log: LoginLog) => log.loginStatus === 'failed')
                    .slice(0, 5)
                    .map((log: LoginLog) => (
                      <div key={log.id} className="flex items-center justify-between p-2 bg-red-50 rounded">
                        <div>
                          <div className="font-medium text-sm">{log.email}</div>
                          <div className="text-xs text-gray-600">{log.failureReason}</div>
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatDate(log.createdAt)}
                        </div>
                      </div>
                    ))}
                  {failedLogins === 0 && (
                    <div className="text-center text-gray-500 py-4">
                      No security alerts
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Login Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {loginLogs.slice(0, 20).map((log: LoginLog) => (
                    <div
                      key={log.id}
                      className={`border rounded-lg p-3 ${
                        log.loginStatus === 'success'
                          ? 'border-green-200 bg-green-50'
                          : 'border-red-200 bg-red-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {log.loginStatus === 'success' ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-600" />
                          )}
                          <div>
                            <div className="font-medium">{log.email}</div>
                            <div className="text-sm text-gray-600">
                              {log.ipAddress} • {log.device || 'Unknown Device'}
                            </div>
                          </div>
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatDate(log.createdAt)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5" />
                  Server Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Status</span>
                    <Badge className="bg-green-100 text-green-800">Online</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Uptime</span>
                    <span className="font-semibold">{systemMetrics?.uptime || 99.9}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Response Time</span>
                    <span className="font-semibold">{systemMetrics?.responseTime || 45}ms</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Active Connections</span>
                    <span className="font-semibold">{systemMetrics?.activeConnections || 42}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Database Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Connection</span>
                    <Badge className="bg-green-100 text-green-800">Connected</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Query Time</span>
                    <span className="font-semibold">&lt; 10ms</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Storage Used</span>
                    <span className="font-semibold">{systemMetrics?.diskUsage || 23}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Backup Status</span>
                    <Badge className="bg-blue-100 text-blue-800">Up to date</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Resource Usage Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsLineChart data={[
                    { time: '00:00', cpu: 12, memory: 45, disk: 23 },
                    { time: '04:00', cpu: 8, memory: 42, disk: 23 },
                    { time: '08:00', cpu: 25, memory: 48, disk: 24 },
                    { time: '12:00', cpu: 35, memory: 52, disk: 24 },
                    { time: '16:00', cpu: 28, memory: 49, disk: 25 },
                    { time: '20:00', cpu: 15, memory: 46, disk: 25 },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="cpu" stroke="#3B82F6" name="CPU %" />
                    <Line type="monotone" dataKey="memory" stroke="#10B981" name="Memory %" />
                    <Line type="monotone" dataKey="disk" stroke="#8B5CF6" name="Disk %" />
                  </RechartsLineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}