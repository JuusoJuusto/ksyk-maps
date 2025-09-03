import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "react-i18next";
import { BarChart3, Users, MapPin, Clock, TrendingUp, Eye, Navigation, Calendar, Settings, Building as BuildingIcon, Map, Layers, Route } from "lucide-react";
import RoomManagement from "@/components/RoomManagement";
import FloorManagement from "@/components/FloorManagement";
import HallwayManagement from "@/components/HallwayManagement";
import BuildingManagement from "@/components/BuildingManagement";
import InteractiveMapEditor from "@/components/InteractiveMapEditor";
import type { Staff, Building as BuildingType, Room } from "@shared/schema";

export default function AdminDashboard() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("dashboard");

  const { data: staff = [], isLoading: isLoadingStaff } = useQuery<Staff[]>({
    queryKey: ["/api/staff"],
    retry: false,
  });

  const { data: buildings = [], isLoading: isLoadingBuildings } = useQuery<BuildingType[]>({
    queryKey: ["/api/buildings"],
    retry: false,
  });

  const { data: rooms = [], isLoading: isLoadingRooms } = useQuery<Room[]>({
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
        <ScrollArea className="w-full">
          <TabsList className="flex w-max min-w-full h-auto gap-1 p-1 bg-blue-50">
            <TabsTrigger value="dashboard" data-testid="tab-dashboard" className="flex items-center gap-2 px-2 md:px-4 whitespace-nowrap data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <BarChart3 className="w-4 h-4" />
              <span>Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="map" data-testid="tab-map" className="flex items-center gap-2 px-2 md:px-4 whitespace-nowrap data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <Map className="w-4 h-4" />
              <span>Map</span>
            </TabsTrigger>
            <TabsTrigger value="rooms" data-testid="tab-rooms" className="flex items-center gap-2 px-2 md:px-4 whitespace-nowrap data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <MapPin className="w-4 h-4" />
              <span>Rooms</span>
            </TabsTrigger>
            <TabsTrigger value="floors" data-testid="tab-floors" className="flex items-center gap-2 px-2 md:px-4 whitespace-nowrap data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <Layers className="w-4 h-4" />
              <span>Floors</span>
            </TabsTrigger>
            <TabsTrigger value="hallways" data-testid="tab-hallways" className="flex items-center gap-2 px-2 md:px-4 whitespace-nowrap data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <Route className="w-4 h-4" />
              <span>Hallways</span>
            </TabsTrigger>
            <TabsTrigger value="buildings" data-testid="tab-buildings" className="flex items-center gap-2 px-2 md:px-4 whitespace-nowrap data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <BuildingIcon className="w-4 h-4" />
              <span>Buildings</span>
            </TabsTrigger>
            <TabsTrigger value="staff" data-testid="tab-staff" className="flex items-center gap-2 px-2 md:px-4 whitespace-nowrap data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <Users className="w-4 h-4" />
              <span>Staff</span>
            </TabsTrigger>
          </TabsList>
        </ScrollArea>
        
        <TabsContent value="dashboard" className="space-y-6">

        {/* Navigation Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
          <Card className="touch-card">
            <CardContent className="p-3 md:p-6">
              {isLoadingBuildings ? (
                <div className="flex items-center">
                  <Skeleton className="w-8 h-8 md:w-10 md:h-10 rounded-lg flex-shrink-0" />
                  <div className="ml-2 md:ml-4 min-w-0 flex-1">
                    <Skeleton className="h-6 md:h-8 w-16 mb-1" />
                    <Skeleton className="h-3 md:h-4 w-24" />
                  </div>
                </div>
              ) : (
                <div className="flex items-center">
                  <div className="p-2 md:p-3 bg-blue-600 rounded-lg flex-shrink-0">
                    <Navigation className="text-primary-foreground w-4 h-4 md:w-6 md:h-6" />
                  </div>
                  <div className="ml-2 md:ml-4 min-w-0">
                    <p className="text-lg md:text-2xl font-semibold text-foreground truncate" data-testid="stat-navigations">{navigationStats.totalNavigations.toLocaleString()}</p>
                    <p className="text-xs md:text-sm text-muted-foreground">Total Navigations</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card className="touch-card">
            <CardContent className="p-3 md:p-6">
              {isLoadingStaff ? (
                <div className="flex items-center">
                  <Skeleton className="w-8 h-8 md:w-10 md:h-10 rounded-lg flex-shrink-0" />
                  <div className="ml-2 md:ml-4 min-w-0 flex-1">
                    <Skeleton className="h-6 md:h-8 w-16 mb-1" />
                    <Skeleton className="h-3 md:h-4 w-24" />
                  </div>
                </div>
              ) : (
                <div className="flex items-center">
                  <div className="p-2 md:p-3 bg-blue-600 rounded-lg flex-shrink-0">
                    <Users className="text-white w-4 h-4 md:w-6 md:h-6" />
                  </div>
                  <div className="ml-2 md:ml-4 min-w-0">
                    <p className="text-lg md:text-2xl font-semibold text-foreground truncate" data-testid="stat-users">{navigationStats.uniqueUsers.toLocaleString()}</p>
                    <p className="text-xs md:text-sm text-muted-foreground">Unique Users</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card className="touch-card">
            <CardContent className="p-3 md:p-6">
              {isLoadingBuildings ? (
                <div className="flex items-center">
                  <Skeleton className="w-8 h-8 md:w-10 md:h-10 rounded-lg flex-shrink-0" />
                  <div className="ml-2 md:ml-4 min-w-0 flex-1">
                    <Skeleton className="h-6 md:h-8 w-16 mb-1" />
                    <Skeleton className="h-3 md:h-4 w-24" />
                  </div>
                </div>
              ) : (
                <div className="flex items-center">
                  <div className="p-2 md:p-3 bg-blue-600 rounded-lg flex-shrink-0">
                    <MapPin className="text-white w-4 h-4 md:w-6 md:h-6" />
                  </div>
                  <div className="ml-2 md:ml-4 min-w-0">
                    <p className="text-lg md:text-2xl font-semibold text-foreground truncate" data-testid="stat-buildings">{buildings.length}</p>
                    <p className="text-xs md:text-sm text-muted-foreground">Campus Buildings</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card className="touch-card">
            <CardContent className="p-3 md:p-6">
              <div className="flex items-center">
                <div className="p-2 md:p-3 bg-blue-600 rounded-lg flex-shrink-0">
                  <Clock className="text-white w-4 h-4 md:w-6 md:h-6" />
                </div>
                <div className="ml-2 md:ml-4 min-w-0">
                  <p className="text-lg md:text-2xl font-semibold text-foreground truncate" data-testid="stat-session-time">{navigationStats.avgSessionTime}</p>
                  <p className="text-xs md:text-sm text-muted-foreground">Avg Session Time</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Analytics Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* Popular Destinations */}
          <Card className="touch-card">
            <CardHeader className="pb-3 md:pb-6">
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                <MapPin className="w-4 h-4 md:w-5 md:h-5" />
                Most Searched Rooms
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3 md:space-y-4">
                {navigationStats.popularDestinations.map((dest, index) => {
                  const maxSearches = navigationStats.popularDestinations[0].searches;
                  return (
                    <div key={dest.room} className="flex items-center justify-between" data-testid={`destination-${dest.room}`}>
                      <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                        <Badge variant="outline" className="w-6 h-6 md:w-8 md:h-8 flex items-center justify-center flex-shrink-0 text-xs">
                          {index + 1}
                        </Badge>
                        <div className="min-w-0">
                          <p className="font-medium text-sm md:text-base truncate">{dest.room}</p>
                          <p className="text-xs md:text-sm text-muted-foreground">{dest.searches} searches</p>
                        </div>
                      </div>
                      <div className="w-16 md:w-24 ml-2">
                        <Progress value={(dest.searches / maxSearches) * 100} className="h-1.5 md:h-2" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Building Usage */}
          <Card className="touch-card">
            <CardHeader className="pb-3 md:pb-6">
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                <BarChart3 className="w-4 h-4 md:w-5 md:h-5" />
                Building Usage Statistics
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ScrollArea className="h-[300px] md:h-auto">
                <div className="space-y-3 md:space-y-4 pr-3">
                  {navigationStats.buildingUsage.map((building) => (
                    <div key={building.building} className="flex items-center justify-between" data-testid={`building-${building.building}`}>
                      <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                        <div className="w-6 h-6 md:w-8 md:h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xs md:text-sm flex-shrink-0">
                          {building.building}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm md:text-base truncate">{building.name}</p>
                          <p className="text-xs md:text-sm text-muted-foreground">{building.usage}% of total traffic</p>
                        </div>
                      </div>
                      <div className="w-16 md:w-24 ml-2">
                        <Progress value={building.usage} className="h-1.5 md:h-2" />
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Hourly Usage Chart */}
        <Card className="touch-card">
          <CardHeader className="pb-3 md:pb-6">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <TrendingUp className="w-4 h-4 md:w-5 md:h-5" />
              Navigation Activity by Hour
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ScrollArea className="w-full">
              <div className="space-y-2 min-w-[600px] md:min-w-0" data-testid="chart-hourly">
                <div className="grid grid-cols-8 gap-1 md:gap-2 text-xs md:text-sm text-muted-foreground">
                  {navigationStats.hourlyUsage.map((hour) => (
                    <div key={hour.hour} className="text-center">
                      {hour.hour}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-8 gap-1 md:gap-2 h-24 md:h-32">
                  {(() => {
                    const maxSearches = Math.max(...navigationStats.hourlyUsage.map(h => h.searches));
                    return navigationStats.hourlyUsage.map((hour) => {
                      const height = (hour.searches / maxSearches) * 100;
                      return (
                        <div key={hour.hour} className="flex flex-col justify-end items-center touch-target">
                          <div 
                            className="bg-blue-600 rounded-t-sm w-full transition-all duration-300 hover:bg-blue-700 active:bg-blue-800"
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
            </ScrollArea>
          </CardContent>
        </Card>
        
        {/* Additional Statistics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* Real-time Activity Feed */}
          <Card className="touch-card">
            <CardHeader className="pb-3 md:pb-6">
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                <Eye className="w-4 h-4 md:w-5 md:h-5" />
                Recent Navigation Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ScrollArea className="h-[400px] md:h-auto">
                <div className="space-y-2 md:space-y-3 pr-3">
                  {recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-2 md:gap-3 p-2 md:p-3 bg-muted rounded-md touch-target">
                      <div className="flex-shrink-0 mt-0.5">
                        {activity.type === 'navigation' && <Navigation className="w-3 h-3 md:w-4 md:h-4 text-blue-500" />}
                        {activity.type === 'analytics' && <BarChart3 className="w-3 h-3 md:w-4 md:h-4 text-green-500" />}
                        {activity.type === 'search' && <MapPin className="w-3 h-3 md:w-4 md:h-4 text-purple-500" />}
                        {activity.type === 'trend' && <TrendingUp className="w-3 h-3 md:w-4 md:h-4 text-orange-500" />}
                        {activity.type === 'usage' && <Clock className="w-3 h-3 md:w-4 md:h-4 text-red-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs md:text-sm font-medium text-foreground line-clamp-2" data-testid={`activity-${activity.id}`}>
                          {activity.description}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">{activity.timestamp}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
          
          {/* Quick Admin Actions */}
          <Card className="touch-card">
            <CardHeader className="pb-3 md:pb-6">
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                <Settings className="w-4 h-4 md:w-5 md:h-5" />
                Quick Admin Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3">
                <Button 
                  className="p-3 md:p-4 h-auto flex-col space-y-1 md:space-y-2 bg-blue-600 hover:bg-blue-700 text-white active:bg-blue-800 touch-target w-full min-h-[4rem]"
                  onClick={() => setActiveTab("rooms")}
                  data-testid="admin-manage-rooms"
                >
                  <MapPin className="w-4 h-4 md:w-6 md:h-6" />
                  <span className="text-xs md:text-sm font-medium text-center">Manage Rooms</span>
                </Button>
                <Button 
                  className="p-3 md:p-4 h-auto flex-col space-y-1 md:space-y-2 bg-blue-600 hover:bg-blue-700 text-white active:bg-blue-800 touch-target w-full min-h-[4rem]"
                  onClick={() => setActiveTab("map")}
                  data-testid="admin-map-editor"
                >
                  <Map className="w-4 h-4 md:w-6 md:h-6" />
                  <span className="text-xs md:text-sm font-medium text-center">Map Editor</span>
                </Button>
                <Button 
                  className="p-3 md:p-4 h-auto flex-col space-y-1 md:space-y-2 bg-blue-600 hover:bg-blue-700 text-white active:bg-blue-800 touch-target w-full min-h-[4rem]"
                  onClick={() => setActiveTab("staff")}
                  data-testid="admin-manage-staff"
                >
                  <Users className="w-4 h-4 md:w-6 md:h-6" />
                  <span className="text-xs md:text-sm font-medium text-center">Staff Management</span>
                </Button>
                <Button 
                  className="p-3 md:p-4 h-auto flex-col space-y-1 md:space-y-2 bg-blue-600 hover:bg-blue-700 text-white active:bg-blue-800 touch-target w-full min-h-[4rem]"
                  onClick={() => setActiveTab("buildings")}
                  data-testid="admin-manage-buildings"
                >
                  <BarChart3 className="w-4 h-4 md:w-6 md:h-6" />
                  <span className="text-xs md:text-sm font-medium text-center">Analytics</span>
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
          <BuildingManagement />
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
