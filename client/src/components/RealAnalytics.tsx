import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { 
  Activity, TrendingUp, Eye, Users, Globe, Monitor, 
  Search, MapPin, Clock, BarChart3, PieChart, 
  RefreshCw, Download, Filter, Zap, Database,
  Navigation, Building, Calendar, MessageSquare
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell, Area, AreaChart
} from 'recharts';

interface AnalyticsEvent {
  id: string;
  type: 'page_view' | 'search' | 'navigation' | 'room_view' | 'building_view' | 'feature_use' | 'error';
  page?: string;
  query?: string;
  roomId?: string;
  buildingId?: string;
  feature?: string;
  error?: string;
  userId?: string;
  sessionId: string;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
  duration?: number;
  referrer?: string;
  device: string;
  browser: string;
  os: string;
  country?: string;
  city?: string;
}

interface AnalyticsSummary {
  totalPageViews: number;
  uniqueVisitors: number;
  totalSessions: number;
  avgSessionDuration: number;
  bounceRate: number;
  topPages: Array<{ page: string; views: number; avgDuration: number }>;
  topSearches: Array<{ query: string; count: number; resultClicks: number }>;
  topRooms: Array<{ roomId: string; roomName: string; views: number }>;
  topBuildings: Array<{ buildingId: string; buildingName: string; views: number }>;
  deviceBreakdown: Array<{ device: string; count: number; percentage: number }>;
  browserBreakdown: Array<{ browser: string; count: number; percentage: number }>;
  countryBreakdown: Array<{ country: string; count: number; percentage: number }>;
  hourlyActivity: Array<{ hour: number; views: number; users: number }>;
  dailyActivity: Array<{ date: string; views: number; users: number; sessions: number }>;
  featureUsage: Array<{ feature: string; uses: number; uniqueUsers: number }>;
  errorStats: Array<{ error: string; count: number; affectedUsers: number }>;
}

export default function RealAnalytics() {
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState('24h');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLive, setIsLive] = useState(true);

  // Real-time analytics data
  const { data: liveStats, isLoading: liveLoading } = useQuery({
    queryKey: ['live-analytics'],
    queryFn: async () => {
      const response = await fetch('/api/analytics/live', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch live analytics');
      return response.json();
    },
    refetchInterval: isLive ? 5000 : false, // Update every 5 seconds when live
  });

  // Analytics summary
  const { data: summary, isLoading: summaryLoading } = useQuery<any>({
    queryKey: ['analytics-summary', timeRange],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/summary?timeRange=${timeRange}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch analytics summary');
      return response.json();
    },
    refetchInterval: 30000, // Update every 30 seconds
  });

  // Recent events
  const { data: recentEvents = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['analytics-events', timeRange],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/events?timeRange=${timeRange}&limit=100`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch analytics events');
      return response.json();
    },
    refetchInterval: 15000, // Update every 15 seconds
  });

  // Performance metrics
  const { data: performance, isLoading: perfLoading } = useQuery({
    queryKey: ['analytics-performance', timeRange],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/performance?timeRange=${timeRange}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch performance metrics');
      return response.json();
    },
    refetchInterval: 60000, // Update every minute
  });

  const isLoading = liveLoading || summaryLoading || eventsLoading || perfLoading;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading real analytics...</p>
        </CardContent>
      </Card>
    );
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="space-y-6">
      {/* Live Stats Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold">Real Analytics Dashboard</h2>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isLive ? 'bg-[#28a745] animate-pulse' : 'bg-gray-400'}`}></div>
            <span className="text-sm text-gray-600">{isLive ? 'Live' : 'Paused'}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={isLive ? "default" : "outline"}
            onClick={() => setIsLive(!isLive)}
          >
            <Eye className="h-4 w-4 mr-1" />
            {isLive ? 'Live' : 'Paused'}
          </Button>
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
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
        </div>
      </div>

      {/* Real-time Overview Cards - WILMA COLORS ONLY */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-[#28a745]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Users</p>
                <p className="text-2xl font-bold text-[#28a745]">{liveStats?.activeUsers || 0}</p>
                <p className="text-xs text-[#28a745]">+{liveStats?.newUsersToday || 0} today</p>
              </div>
              <Eye className="h-8 w-8 text-[#28a745]" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-[#003d82]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Page Views</p>
                <p className="text-2xl font-bold text-[#003d82]">{formatNumber(summary?.totalPageViews || 0)}</p>
                <p className="text-xs text-gray-600">Last {timeRange}</p>
              </div>
              <Activity className="h-8 w-8 text-[#003d82]" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-[#0056b3]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Unique Visitors</p>
                <p className="text-2xl font-bold text-[#0056b3]">{formatNumber(summary?.uniqueVisitors || 0)}</p>
                <p className="text-xs text-gray-600">{summary?.totalSessions || 0} sessions</p>
              </div>
              <Users className="h-8 w-8 text-[#0056b3]" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-[#666666]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Session</p>
                <p className="text-2xl font-bold text-[#666666]">
                  {formatDuration(summary?.avgSessionDuration || 0)}
                </p>
                <p className="text-xs text-gray-600">{Math.round((1 - (summary?.bounceRate || 0)) * 100)}% engaged</p>
              </div>
              <Clock className="h-8 w-8 text-[#666666]" />
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Main Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="traffic">Traffic</TabsTrigger>
          <TabsTrigger value="behavior">Behavior</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="realtime">Real-time</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Traffic Overview Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Traffic Overview
              </CardTitle>
              <CardDescription>Page views and unique visitors over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={summary?.dailyActivity || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="views" stackId="1" stroke="#003d82" fill="#003d82" fillOpacity={0.6} name="Page Views" />
                    <Area type="monotone" dataKey="users" stackId="1" stroke="#28a745" fill="#28a745" fillOpacity={0.6} name="Unique Users" />
                    <Area type="monotone" dataKey="sessions" stackId="1" stroke="#0056b3" fill="#0056b3" fillOpacity={0.6} name="Sessions" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Top Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Pages</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {summary?.topPages?.slice(0, 8).map((page: any, index: number) => (
                    <div key={index} className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{page.page}</span>
                        <Badge variant="outline" className="text-xs">
                          {formatDuration(page.avgDuration)}
                        </Badge>
                      </div>
                      <span className="text-sm text-gray-600">{formatNumber(page.views)} views</span>
                    </div>
                  )) || <div className="text-center text-gray-500 py-4">No page data available</div>}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Searches</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {summary?.topSearches?.slice(0, 8).map((search: any, index: number) => (
                    <div key={index} className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Search className="h-4 w-4 text-gray-500" />
                        <span className="text-sm font-medium">"{search.query}"</span>
                        <Badge variant="outline" className="text-xs">
                          {search.resultClicks} clicks
                        </Badge>
                      </div>
                      <span className="text-sm text-gray-600">{search.count} searches</span>
                    </div>
                  )) || <div className="text-center text-gray-500 py-4">No search data available</div>}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="traffic" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Device Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Device Types</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={summary?.deviceBreakdown || []}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="count"
                        nameKey="device"
                      >
                        {(summary?.deviceBreakdown || []).map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={['#003d82', '#28a745', '#666666', '#999999'][index % 4]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  {summary?.deviceBreakdown?.map((item: any, index: number) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ['#003d82', '#28a745', '#666666', '#999999'][index % 4] }}></div>
                      <span className="text-sm">{item.device}: {item.percentage}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Geographic Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Geographic Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {summary?.countryBreakdown?.slice(0, 10).map((country: any, index: number) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-sm font-medium">{country.country}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-[#003d82] h-2 rounded-full"
                            style={{ width: `${country.percentage}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-600 w-12 text-right">{country.count}</span>
                      </div>
                    </div>
                  )) || <div className="text-center text-gray-500 py-4">No geographic data available</div>}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Hourly Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Activity by Hour</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={summary?.hourlyActivity || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="views" fill="#003d82" name="Page Views" />
                    <Bar dataKey="users" fill="#28a745" name="Users" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="behavior" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Most Viewed Rooms */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Most Viewed Rooms
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {summary?.topRooms?.slice(0, 10).map((room: any, index: number) => (
                    <div key={index} className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-[#e6f2ff] flex items-center justify-center text-[#003d82] font-bold text-xs">
                          {index + 1}
                        </div>
                        <span className="text-sm font-medium">{room.roomName || room.roomId}</span>
                      </div>
                      <span className="text-sm text-gray-600">{room.views} views</span>
                    </div>
                  )) || <div className="text-center text-gray-500 py-4">No room data available</div>}
                </div>
              </CardContent>
            </Card>

            {/* Most Viewed Buildings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Most Viewed Buildings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {summary?.topBuildings?.slice(0, 10).map((building: any, index: number) => (
                    <div key={index} className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-[#d4edda] flex items-center justify-center text-[#28a745] font-bold text-xs">
                          {index + 1}
                        </div>
                        <span className="text-sm font-medium">{building.buildingName || building.buildingId}</span>
                      </div>
                      <span className="text-sm text-gray-600">{building.views} views</span>
                    </div>
                  )) || <div className="text-center text-gray-500 py-4">No building data available</div>}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Feature Usage */}
          <Card>
            <CardHeader>
              <CardTitle>Feature Usage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {summary?.featureUsage?.map((feature: any, index: number) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{feature.feature}</span>
                      <Badge variant="outline">{feature.uses} uses</Badge>
                    </div>
                    <div className="text-sm text-gray-600">
                      {feature.uniqueUsers} unique users
                    </div>
                  </div>
                )) || <div className="text-center text-gray-500 py-4">No feature usage data available</div>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content" className="space-y-6">
          {/* Content Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Content Performance</CardTitle>
              <CardDescription>Detailed page analytics and user engagement</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {summary?.topPages?.map((page: any, index: number) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-medium">{page.page}</h4>
                        <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                          <span>{formatNumber(page.views)} views</span>
                          <span>Avg time: {formatDuration(page.avgDuration)}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">{index + 1}</div>
                        <div className="text-xs text-gray-500">Rank</div>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-[#003d82] h-2 rounded-full"
                        style={{ width: `${(page.views / (summary.topPages[0]?.views || 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                )) || <div className="text-center text-gray-500 py-8">No content data available</div>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          {/* Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-[#28a745]">
                    {performance?.avgLoadTime || 0}ms
                  </div>
                  <div className="text-sm text-gray-600">Avg Load Time</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-[#003d82]">
                    {Math.round((1 - (performance?.errorRate || 0)) * 100)}%
                  </div>
                  <div className="text-sm text-gray-600">Success Rate</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-[#0056b3]">
                    {performance?.cacheHitRate || 0}%
                  </div>
                  <div className="text-sm text-gray-600">Cache Hit Rate</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Error Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>Error Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {summary?.errorStats?.map((error: any, index: number) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-red-50 border border-red-200 rounded">
                    <div>
                      <span className="font-medium text-red-800">{error.error}</span>
                      <div className="text-sm text-red-600">{error.affectedUsers} users affected</div>
                    </div>
                    <Badge variant="destructive">{error.count} occurrences</Badge>
                  </div>
                )) || <div className="text-center text-gray-500 py-4">No errors recorded</div>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="realtime" className="space-y-6">
          {/* Real-time Activity Feed */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Live Activity Feed
                <Badge className="bg-green-100 text-green-800">Live</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-2">
                  {recentEvents.slice(0, 50).map((event: AnalyticsEvent) => (
                    <div key={event.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded">
                      <div className="w-2 h-2 bg-[#28a745] rounded-full animate-pulse"></div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {event.type === 'page_view' && `Viewed ${event.page}`}
                            {event.type === 'search' && `Searched "${event.query}"`}
                            {event.type === 'room_view' && `Viewed room ${event.roomId}`}
                            {event.type === 'building_view' && `Viewed building ${event.buildingId}`}
                            {event.type === 'navigation' && `Used navigation`}
                            {event.type === 'feature_use' && `Used ${event.feature}`}
                            {event.type === 'error' && `Error: ${event.error}`}
                          </span>
                          <Badge variant="outline" className="text-xs">{event.device}</Badge>
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(event.timestamp).toLocaleTimeString()} • {event.country || 'Unknown location'}
                        </div>
                      </div>
                    </div>
                  ))}
                  {recentEvents.length === 0 && (
                    <div className="text-center text-gray-500 py-8">
                      No recent activity
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}