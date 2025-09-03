import React from 'react';
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
  Calendar
} from 'lucide-react';

export function AdvancedAnalytics() {
  const stats = [
    {
      title: "Peak Usage Hours",
      value: "10:00 - 14:00",
      change: "+23%",
      icon: Clock,
      color: "text-blue-600"
    },
    {
      title: "Most Popular Rooms",
      value: "M12, K15, L20",
      change: "+8%",
      icon: MapPin,
      color: "text-green-600"
    },
    {
      title: "Navigation Requests",
      value: "1,247",
      change: "+45%",
      icon: Activity,
      color: "text-purple-600"
    },
    {
      title: "Active Users Today",
      value: "89",
      change: "+12%",
      icon: Users,
      color: "text-orange-600"
    }
  ];

  const roomPopularity = [
    { room: "M12", usage: 95, type: "Music Room" },
    { room: "K15", usage: 87, type: "Classroom" },
    { room: "L20", usage: 79, type: "Library" },
    { room: "A10", usage: 72, type: "Assembly" },
    { room: "U05", usage: 68, type: "Utility" }
  ];

  const weeklyTrends = [
    { day: "Mon", searches: 145, navigations: 89 },
    { day: "Tue", searches: 167, navigations: 102 },
    { day: "Wed", searches: 189, navigations: 134 },
    { day: "Thu", searches: 201, navigations: 156 },
    { day: "Fri", searches: 178, navigations: 123 }
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
        {/* Room Popularity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              Room Popularity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {roomPopularity.map((room, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{room.room}</span>
                      <Badge variant="secondary" className="text-xs">{room.type}</Badge>
                    </div>
                    <span className="text-sm text-gray-600">{room.usage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${room.usage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Weekly Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              Weekly Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {weeklyTrends.map((day, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{day.day}</span>
                    <div className="flex gap-4 text-sm">
                      <span className="text-blue-600">{day.searches} searches</span>
                      <span className="text-green-600">{day.navigations} routes</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="w-full bg-blue-100 rounded-full h-1.5">
                      <div 
                        className="bg-blue-600 h-1.5 rounded-full"
                        style={{ width: `${(day.searches / 250) * 100}%` }}
                      />
                    </div>
                    <div className="w-full bg-green-100 rounded-full h-1.5">
                      <div 
                        className="bg-green-600 h-1.5 rounded-full"
                        style={{ width: `${(day.navigations / 200) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Real-time Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-blue-600" />
            Real-time Activity Feed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              <span className="text-sm">User navigated from M12 to K15</span>
              <span className="text-xs text-gray-500 ml-auto">2 min ago</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm">New room L25 added to system</span>
              <span className="text-xs text-gray-500 ml-auto">5 min ago</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
              <span className="text-sm">Peak usage threshold reached</span>
              <span className="text-xs text-gray-500 ml-auto">8 min ago</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}