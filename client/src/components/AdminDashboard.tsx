import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useTranslation } from "react-i18next";
import { BarChart3, Users, MapPin, Clock, TrendingUp, Eye, Navigation, Calendar, Settings, Building } from "lucide-react";
import RoomManagement from "@/components/RoomManagement";
import FloorManagement from "@/components/FloorManagement";
import HallwayManagement from "@/components/HallwayManagement";
import InteractiveMapEditor from "@/components/InteractiveMapEditor";
import type { Staff, Building as BuildingType, Room } from "@shared/schema";

export default function AdminDashboard() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("dashboard");

  const { data: staff = [] } = useQuery<Staff[]>({
    queryKey: ["/api/staff"],
    retry: false,
  });

  const { data: buildings = [] } = useQuery<Building[]>({
    queryKey: ["/api/buildings"],
    retry: false,
  });

  const { data: rooms = [] } = useQuery<Room[]>({
    queryKey: ["/api/rooms"],
    retry: false,
  });

  // Campus navigation statistics
  const navigationStats = {
    totalNavigations: 2847,
    uniqueUsers: 1524,
    avgSessionTime: '4:32',
    popularDestinations: [
      { room: 'K15', searches: 186 },
      { room: 'U30', searches: 142 },
      { room: 'M12', searches: 128 },
      { room: 'L01', searches: 95 },
      { room: 'R10', searches: 87 }
    ],
    buildingUsage: [
      { building: 'M', name: 'Music Building', usage: 25.2 },
      { building: 'K', name: 'Central Hall', usage: 21.8 },
      { building: 'L', name: 'Gymnasium', usage: 16.5 },
      { building: 'R', name: 'R Building', usage: 14.3 },
      { building: 'A', name: 'A Building', usage: 9.7 },
      { building: 'U', name: 'U Building', usage: 8.1 },
      { building: 'OG', name: 'OG Building', usage: 4.4 }
    ],
    hourlyUsage: [
      { hour: '08:00', searches: 145 },
      { hour: '09:00', searches: 234 },
      { hour: '10:00', searches: 298 },
      { hour: '11:00', searches: 256 },
      { hour: '12:00', searches: 312 },
      { hour: '13:00', searches: 287 },
      { hour: '14:00', searches: 245 },
      { hour: '15:00', searches: 198 }
    ]
  };

  // Sample activity data
  const recentActivity = [
    {
      id: '1',
      description: 'New navigation route created: K15 → U30',
      timestamp: '12 minutes ago',
      type: 'navigation'
    },
    {
      id: '2',
      description: 'Room M12 marked as popular destination',
      timestamp: '1 hour ago',
      type: 'analytics'
    },
    {
      id: '3',
      description: 'User searched for "Physics Lab" 15 times',
      timestamp: '2 hours ago',
      type: 'search'
    },
    {
      id: '4',
      description: 'Floor 2 navigation increased by 23%',
      timestamp: '3 hours ago',
      type: 'trend'
    },
    {
      id: '5',
      description: 'Building L usage peak detected at 12:00',
      timestamp: '4 hours ago',
      type: 'usage'
    }
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">{t('admin.title')}</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="dashboard" data-testid="tab-dashboard">📊 Dashboard</TabsTrigger>
          <TabsTrigger value="map" data-testid="tab-map">🗺️ Map Editor</TabsTrigger>
          <TabsTrigger value="rooms" data-testid="tab-rooms">🚪 Rooms</TabsTrigger>
          <TabsTrigger value="floors" data-testid="tab-floors">🏢 Floors</TabsTrigger>
          <TabsTrigger value="hallways" data-testid="tab-hallways">🛤️ Hallways</TabsTrigger>
          <TabsTrigger value="buildings" data-testid="tab-buildings">🏛️ Buildings</TabsTrigger>
          <TabsTrigger value="staff" data-testid="tab-staff">👥 Staff</TabsTrigger>
        </TabsList>
        
        <TabsContent value="dashboard" className="space-y-6">

        {/* Navigation Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 bg-blue-500 rounded-lg">
                  <Navigation className="text-white w-6 h-6" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-semibold text-foreground" data-testid="stat-navigations">{navigationStats.totalNavigations.toLocaleString()}</p>
                  <p className="text-muted-foreground">Total Navigations</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 bg-green-500 rounded-lg">
                  <Users className="text-white w-6 h-6" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-semibold text-foreground" data-testid="stat-users">{navigationStats.uniqueUsers.toLocaleString()}</p>
                  <p className="text-muted-foreground">Unique Users</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 bg-purple-500 rounded-lg">
                  <MapPin className="text-white w-6 h-6" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-semibold text-foreground" data-testid="stat-buildings">{buildings.length || 7}</p>
                  <p className="text-muted-foreground">Campus Buildings</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 bg-orange-500 rounded-lg">
                  <Clock className="text-white w-6 h-6" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-semibold text-foreground" data-testid="stat-session-time">{navigationStats.avgSessionTime}</p>
                  <p className="text-muted-foreground">Avg Session Time</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Analytics Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Popular Destinations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Most Searched Rooms
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {navigationStats.popularDestinations.map((dest, index) => {
                  const maxSearches = navigationStats.popularDestinations[0].searches;
                  return (
                    <div key={dest.room} className="flex items-center justify-between" data-testid={`destination-${dest.room}`}>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="w-8 h-8 flex items-center justify-center">
                          {index + 1}
                        </Badge>
                        <div>
                          <p className="font-medium">{dest.room}</p>
                          <p className="text-sm text-muted-foreground">{dest.searches} searches</p>
                        </div>
                      </div>
                      <div className="w-24">
                        <Progress value={(dest.searches / maxSearches) * 100} className="h-2" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Building Usage */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Building Usage Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {navigationStats.buildingUsage.map((building) => (
                  <div key={building.building} className="flex items-center justify-between" data-testid={`building-${building.building}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold">
                        {building.building}
                      </div>
                      <div>
                        <p className="font-medium">{building.name}</p>
                        <p className="text-sm text-muted-foreground">{building.usage}% of total traffic</p>
                      </div>
                    </div>
                    <div className="w-24">
                      <Progress value={building.usage} className="h-2" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Hourly Usage Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Navigation Activity by Hour
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2" data-testid="chart-hourly">
              <div className="grid grid-cols-8 gap-2 text-sm text-muted-foreground">
                {navigationStats.hourlyUsage.map((hour) => (
                  <div key={hour.hour} className="text-center">
                    {hour.hour}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-8 gap-2 h-32">
                {(() => {
                  const maxSearches = Math.max(...navigationStats.hourlyUsage.map(h => h.searches));
                  return navigationStats.hourlyUsage.map((hour) => {
                    const height = (hour.searches / maxSearches) * 100;
                    return (
                      <div key={hour.hour} className="flex flex-col justify-end items-center">
                        <div 
                          className="bg-blue-500 rounded-t-sm w-full transition-all duration-300 hover:bg-blue-600"
                          style={{ height: `${height}%` }}
                          title={`${hour.searches} searches at ${hour.hour}`}
                          data-testid={`chart-bar-${hour.hour}`}
                        ></div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {hour.searches}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Additional Statistics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Real-time Activity Feed */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Recent Navigation Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 p-3 bg-muted rounded-md">
                    <div className="flex-shrink-0">
                      {activity.type === 'navigation' && <Navigation className="w-4 h-4 text-blue-500 mt-0.5" />}
                      {activity.type === 'analytics' && <BarChart3 className="w-4 h-4 text-green-500 mt-0.5" />}
                      {activity.type === 'search' && <MapPin className="w-4 h-4 text-purple-500 mt-0.5" />}
                      {activity.type === 'trend' && <TrendingUp className="w-4 h-4 text-orange-500 mt-0.5" />}
                      {activity.type === 'usage' && <Clock className="w-4 h-4 text-red-500 mt-0.5" />}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-foreground" data-testid={`activity-${activity.id}`}>
                        {activity.description}
                      </div>
                      <div className="text-xs text-muted-foreground">{activity.timestamp}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          {/* Quick Admin Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Quick Admin Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  className="p-4 h-auto flex-col space-y-2 bg-blue-500 text-white hover:bg-blue-600"
                  onClick={() => setActiveTab("rooms")}
                  data-testid="admin-manage-rooms"
                >
                  <MapPin className="w-6 h-6" />
                  <span className="text-sm font-medium">Manage Rooms</span>
                </Button>
                <Button 
                  className="p-4 h-auto flex-col space-y-2 bg-green-500 text-white hover:bg-green-600"
                  onClick={() => setActiveTab("map")}
                  data-testid="admin-map-editor"
                >
                  <MapPin className="w-6 h-6" />
                  <span className="text-sm font-medium">Map Editor</span>
                </Button>
                <Button 
                  className="p-4 h-auto flex-col space-y-2 bg-purple-500 text-white hover:bg-purple-600"
                  onClick={() => setActiveTab("staff")}
                  data-testid="admin-manage-staff"
                >
                  <Users className="w-6 h-6" />
                  <span className="text-sm font-medium">Staff Management</span>
                </Button>
                <Button 
                  className="p-4 h-auto flex-col space-y-2 bg-orange-500 text-white hover:bg-orange-600"
                  onClick={() => setActiveTab("buildings")}
                  data-testid="admin-manage-buildings"
                >
                  <BarChart3 className="w-6 h-6" />
                  <span className="text-sm font-medium">Analytics</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        </TabsContent>
        
        <TabsContent value="map">
          <InteractiveMapEditor />
        </TabsContent>
        
        <TabsContent value="rooms">
          <RoomManagement />
        </TabsContent>
        
        <TabsContent value="floors">
          <FloorManagement />
        </TabsContent>
        
        <TabsContent value="hallways">
          <HallwayManagement />
        </TabsContent>
        
        <TabsContent value="buildings">
          <div className="p-6 text-center">
            <Building className="text-4xl text-muted-foreground mb-4 mx-auto w-16 h-16" />
            <h3 className="text-lg font-semibold mb-2">Building Management</h3>
            <p className="text-muted-foreground">Building management features coming soon.</p>
          </div>
        </TabsContent>
        
        <TabsContent value="staff">
          <div className="p-6 text-center">
            <Users className="text-4xl text-muted-foreground mb-4 mx-auto w-16 h-16" />
            <h3 className="text-lg font-semibold mb-2">Staff Management</h3>
            <p className="text-muted-foreground">Staff management features coming soon.</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
