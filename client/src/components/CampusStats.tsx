import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Building, 
  Users, 
  MapPin, 
  Calendar, 
  Megaphone,
  TrendingUp,
  Activity,
  Clock
} from "lucide-react";

export default function CampusStats() {
  // Fetch all data
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

  // Calculate statistics
  const totalCapacity = rooms.reduce((sum: number, room: any) => sum + (room.capacity || 0), 0);
  const activeAnnouncements = announcements.filter((a: any) => a.isActive).length;
  const roomTypes = [...new Set(rooms.map((room: any) => room.type))].length;
  const totalFloors = buildings.reduce((sum: number, building: any) => sum + (building.floors || 0), 0);

  const stats = [
    {
      title: "Buildings",
      value: buildings.length,
      icon: Building,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
      description: `${totalFloors} total floors`
    },
    {
      title: "Rooms",
      value: rooms.length,
      icon: MapPin,
      color: "text-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
      description: `${roomTypes} different types`
    },
    {
      title: "Total Capacity",
      value: totalCapacity,
      icon: Users,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-200",
      description: "Maximum occupancy"
    },
    {
      title: "Active Announcements",
      value: activeAnnouncements,
      icon: Megaphone,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      borderColor: "border-orange-200",
      description: "Current notices"
    },
    {
      title: "Staff Members",
      value: staff.length,
      icon: Users,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
      borderColor: "border-indigo-200",
      description: "Faculty & staff"
    },
    {
      title: "System Status",
      value: "Online",
      icon: Activity,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
      borderColor: "border-emerald-200",
      description: "All systems operational"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat, index) => (
          <Card key={stat.title} className={`hover:shadow-lg transition-all duration-300 border-2 ${stat.borderColor} ${stat.bgColor}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                      <stat.icon className={`h-5 w-5 ${stat.color}`} />
                    </div>
                    <h3 className="font-semibold text-gray-700">{stat.title}</h3>
                  </div>
                  <div className="space-y-1">
                    <div className={`text-3xl font-bold ${stat.color}`}>
                      {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                    </div>
                    <p className="text-sm text-gray-500">{stat.description}</p>
                  </div>
                </div>
                {index < 4 && (
                  <div className="flex items-center text-green-600">
                    <TrendingUp className="h-4 w-4 mr-1" />
                    <span className="text-sm font-medium">Active</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Room Type Breakdown */}
      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <CardTitle className="flex items-center">
            <MapPin className="mr-2 h-6 w-6" />
            Room Type Distribution
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[...new Set(rooms.map((room: any) => room.type))].map((type: string) => {
              const count = rooms.filter((room: any) => room.type === type).length;
              const percentage = rooms.length > 0 ? Math.round((count / rooms.length) * 100) : 0;
              
              return (
                <div key={type} className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{count}</div>
                  <div className="text-sm font-medium text-gray-700 capitalize">
                    {type.replace('_', ' ')}
                  </div>
                  <Badge variant="outline" className="text-xs mt-1">
                    {percentage}%
                  </Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Quick Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-green-600 to-emerald-600 text-white">
            <CardTitle className="flex items-center">
              <TrendingUp className="mr-2 h-5 w-5" />
              Campus Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <span className="text-sm font-medium">Average Room Capacity</span>
                <span className="text-lg font-bold text-green-600">
                  {rooms.length > 0 ? Math.round(totalCapacity / rooms.length) : 0}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <span className="text-sm font-medium">Rooms per Building</span>
                <span className="text-lg font-bold text-blue-600">
                  {buildings.length > 0 ? Math.round(rooms.length / buildings.length) : 0}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <span className="text-sm font-medium">Average Floors</span>
                <span className="text-lg font-bold text-purple-600">
                  {buildings.length > 0 ? Math.round(totalFloors / buildings.length) : 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
            <CardTitle className="flex items-center">
              <Clock className="mr-2 h-5 w-5" />
              System Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <span className="text-sm font-medium">Last Updated</span>
                <span className="text-sm font-bold text-purple-600">
                  {new Date().toLocaleTimeString()}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <span className="text-sm font-medium">Database Status</span>
                <Badge className="bg-green-600 text-white">Connected</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <span className="text-sm font-medium">API Status</span>
                <Badge className="bg-blue-600 text-white">Operational</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}