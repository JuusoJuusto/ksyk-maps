import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Clock, 
  MapPin, 
  Activity,
  Zap,
  Calendar,
  Globe,
  Monitor,
  Search,
  Navigation
} from 'lucide-react';

export function AdvancedAnalytics() {
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['analytics-summary'],
    queryFn: async () => {
      const response = await fetch('/api/analytics/summary', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch analytics summary');
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: topSearches, isLoading: searchesLoading } = useQuery({
    queryKey: ['analytics-searches'],
    queryFn: async () => {
      const response = await fetch('/api/analytics/searches', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch top searches');
      return response.json();
    },
    refetchInterval: 60000, // Refresh every minute
  });

  const { data: popularRooms, isLoading: roomsLoading } = useQuery({
    queryKey: ['analytics-rooms'],
    queryFn: async () => {
      const response = await fetch('/api/analytics/rooms', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch popular rooms');
      return response.json();
    },
    refetchInterval: 60000,
  });

  const { data: visitorStats, isLoading: visitorsLoading } = useQuery({
    queryKey: ['analytics-visitors'],
    queryFn: async () => {
      const response = await fetch('/api/analytics/visitors', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch visitor stats');
      return response.json();
    },
    refetchInterval: 60000,
  });

  const isLoading = summaryLoading || searchesLoading || roomsLoading || visitorsLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-16 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-64 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
          <Card className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-64 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const stats = [
    {
      title: "Total Visitors",
      value: summary?.totalVisitors?.toLocaleString() || '0',
      change: visitorStats?.newVisitors ? `+${Math.round((visitorStats.newVisitors / summary?.totalVisitors) * 100)}%` : '+0%',
      icon: Users,
      color: "text-blue-600"
    },
    {
      title: "Page Views",
      value: summary?.totalPageViews?.toLocaleString() || '0',
      change: "+12%",
      icon: Monitor,
      color: "text-green-600"
    },
    {
      title: "Searches",
      value: summary?.totalSearches?.toLocaleString() || '0',
      change: "+8%",
      icon: Search,
      color: "text-purple-600"
    },
    {
      title: "Navigation Requests",
      value: summary?.totalNavigationRequests?.toLocaleString() || '0',
      change: "+15%",
      icon: Navigation,
      color: "text-orange-600"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-green-600">{stat.change}</span>
                  </div>
                </div>
                <stat.icon className={`w-8 h-8 ${stat.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Popular Rooms */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              Most Visited Rooms
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {popularRooms?.slice(0, 5).map((room: any, index: number) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{room.roomNumber}</span>
                      <Badge variant="secondary" className="text-xs">{room.building}</Badge>
                    </div>
                    <span className="text-sm text-gray-600">{room.visits} visits</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min((room.visits / (popularRooms[0]?.visits || 1)) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              )) || (
                <div className="text-center text-gray-500 py-8">
                  No room visit data available yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Searches */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5 text-blue-600" />
              Top Searches
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topSearches?.slice(0, 5).map((search: any, index: number) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">"{search.query}"</span>
                      <Badge variant="outline" className="text-xs">{search.type}</Badge>
                    </div>
                    <span className="text-sm text-gray-600">{search.count} searches</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min((search.count / (topSearches[0]?.count || 1)) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              )) || (
                <div className="text-center text-gray-500 py-8">
                  No search data available yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Browser & Country Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-blue-600" />
              Top Countries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {summary?.topCountries?.slice(0, 5).map((country: any, index: number) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="font-medium">{country.country}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full"
                        style={{ width: `${(country.count / (summary.topCountries[0]?.count || 1)) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-600 w-12 text-right">{country.count}</span>
                  </div>
                </div>
              )) || (
                <div className="text-center text-gray-500 py-8">
                  No country data available yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Browser Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="w-5 h-5 text-blue-600" />
              Browser Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {summary?.topBrowsers?.slice(0, 5).map((browser: any, index: number) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="font-medium">{browser.browser}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${(browser.count / (summary.topBrowsers[0]?.count || 1)) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-600 w-12 text-right">{browser.count}</span>
                  </div>
                </div>
              )) || (
                <div className="text-center text-gray-500 py-8">
                  No browser data available yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Visitor Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Visitor Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{visitorStats?.uniqueVisitors || 0}</div>
              <div className="text-sm text-gray-600">Unique Visitors</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{visitorStats?.returningVisitors || 0}</div>
              <div className="text-sm text-gray-600">Returning Visitors</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{Math.round((visitorStats?.bounceRate || 0) * 100)}%</div>
              <div className="text-sm text-gray-600">Bounce Rate</div>
            </div>
          </div>
          <div className="mt-6">
            <div className="text-sm text-gray-600 mb-2">Average Session Duration</div>
            <div className="text-xl font-semibold">
              {Math.floor((summary?.avgSessionDuration || 0) / 60)}m {Math.round((summary?.avgSessionDuration || 0) % 60)}s
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}