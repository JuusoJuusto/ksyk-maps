import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, 
  MapPin, 
  Building, 
  Users, 
  Mail, 
  Phone,
  User,
  Briefcase,
  GraduationCap
} from "lucide-react";

interface Room {
  id: string;
  roomNumber: string;
  name?: string;
  nameEn?: string;
  type: string;
  floor: number;
  capacity?: number;
  buildingId: string;
}

interface Staff {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  position?: string;
  positionEn?: string;
  department?: string;
  departmentEn?: string;
  officeRoomId?: string;
}

interface Building {
  id: string;
  name: string;
  nameEn?: string;
  nameFi?: string;
  floors: number;
  colorCode: string;
}

export default function Directory() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedRoomType, setSelectedRoomType] = useState("");

  // Fetch data
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

  const { data: buildings = [] } = useQuery({
    queryKey: ["buildings"],
    queryFn: async () => {
      const response = await fetch("/api/buildings");
      if (!response.ok) throw new Error("Failed to fetch buildings");
      return response.json();
    },
  });

  // Filter functions
  const filteredRooms = rooms.filter((room: Room) => {
    const matchesSearch = !searchQuery || 
      room.roomNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      room.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      room.nameEn?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      room.type.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = !selectedRoomType || room.type === selectedRoomType;
    
    return matchesSearch && matchesType;
  });

  const filteredStaff = staff.filter((member: Staff) => {
    const matchesSearch = !searchQuery ||
      member.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.position?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.department?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesDepartment = !selectedDepartment || member.department === selectedDepartment;
    
    return matchesSearch && matchesDepartment;
  });

  // Get unique values for filters
  const roomTypes = [...new Set(rooms.map((room: Room) => room.type))];
  const departments = [...new Set(staff.map((member: Staff) => member.department).filter(Boolean))];

  const getBuildingName = (buildingId: string) => {
    const building = buildings.find((b: Building) => b.id === buildingId);
    return building ? building.nameEn || building.name : 'Unknown';
  };

  const getRoomTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'classroom': return '🏫';
      case 'lab': return '🧪';
      case 'library': return '📚';
      case 'gymnasium': return '🏃';
      case 'cafeteria': return '🍽️';
      case 'office': return '🏢';
      case 'music_room': return '🎵';
      case 'art_studio': return '🎨';
      default: return '📍';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            📖 Campus Directory
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Find rooms, staff, and facilities across the KSYK campus
          </p>
        </div>

        {/* Search and Filters */}
        <Card className="mb-8 shadow-lg">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  type="text"
                  placeholder="Search rooms, staff, departments..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 py-3 text-lg"
                />
              </div>
              <Button 
                variant={searchQuery ? "default" : "outline"}
                onClick={() => setSearchQuery("")}
                className="px-6"
              >
                {searchQuery ? "Clear" : "Search All"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <Tabs defaultValue="rooms" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-md mx-auto">
            <TabsTrigger value="rooms" className="flex items-center">
              <MapPin className="mr-2 h-4 w-4" />
              Rooms
            </TabsTrigger>
            <TabsTrigger value="staff" className="flex items-center">
              <Users className="mr-2 h-4 w-4" />
              Staff
            </TabsTrigger>
            <TabsTrigger value="buildings" className="flex items-center">
              <Building className="mr-2 h-4 w-4" />
              Buildings
            </TabsTrigger>
          </TabsList>

          {/* Rooms Tab */}
          <TabsContent value="rooms" className="space-y-6">
            {/* Room Type Filter */}
            <div className="flex flex-wrap gap-2 justify-center">
              <Button
                variant={selectedRoomType === "" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedRoomType("")}
              >
                All Types
              </Button>
              {roomTypes.map((type) => (
                <Button
                  key={type}
                  variant={selectedRoomType === type ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedRoomType(type)}
                  className="capitalize"
                >
                  {getRoomTypeIcon(type)} {type.replace('_', ' ')}
                </Button>
              ))}
            </div>

            {/* Rooms Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRooms.map((room: Room) => (
                <Card key={room.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-2xl font-bold text-blue-600">{room.roomNumber}</h3>
                        <p className="text-gray-700 font-medium">{room.name || room.nameEn}</p>
                      </div>
                      <div className="text-2xl">{getRoomTypeIcon(room.type)}</div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center text-sm text-gray-600">
                        <Building className="h-4 w-4 mr-2" />
                        {getBuildingName(room.buildingId)} - Floor {room.floor}
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="capitalize">
                          {room.type.replace('_', ' ')}
                        </Badge>
                        {room.capacity && (
                          <span className="text-sm text-gray-500">
                            Capacity: {room.capacity}
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredRooms.length === 0 && (
              <div className="text-center py-12">
                <MapPin className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">No rooms found</h3>
                <p className="text-gray-500">Try adjusting your search or filters</p>
              </div>
            )}
          </TabsContent>

          {/* Staff Tab */}
          <TabsContent value="staff" className="space-y-6">
            {/* Department Filter */}
            <div className="flex flex-wrap gap-2 justify-center">
              <Button
                variant={selectedDepartment === "" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedDepartment("")}
              >
                All Departments
              </Button>
              {departments.map((dept) => (
                <Button
                  key={dept}
                  variant={selectedDepartment === dept ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedDepartment(dept)}
                >
                  {dept}
                </Button>
              ))}
            </div>

            {/* Staff Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredStaff.map((member: Staff) => (
                <Card key={member.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900">
                          {member.firstName} {member.lastName}
                        </h3>
                        
                        {member.position && (
                          <div className="flex items-center text-gray-600 mt-1">
                            <Briefcase className="h-4 w-4 mr-2" />
                            <span className="text-sm">{member.positionEn || member.position}</span>
                          </div>
                        )}
                        
                        {member.department && (
                          <div className="flex items-center text-gray-600 mt-1">
                            <GraduationCap className="h-4 w-4 mr-2" />
                            <span className="text-sm">{member.departmentEn || member.department}</span>
                          </div>
                        )}
                        
                        {member.email && (
                          <div className="flex items-center text-blue-600 mt-2">
                            <Mail className="h-4 w-4 mr-2" />
                            <a href={`mailto:${member.email}`} className="text-sm hover:underline">
                              {member.email}
                            </a>
                          </div>
                        )}
                        
                        {member.phone && (
                          <div className="flex items-center text-gray-600 mt-1">
                            <Phone className="h-4 w-4 mr-2" />
                            <span className="text-sm">{member.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredStaff.length === 0 && (
              <div className="text-center py-12">
                <Users className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">No staff found</h3>
                <p className="text-gray-500">Try adjusting your search or filters</p>
              </div>
            )}
          </TabsContent>

          {/* Buildings Tab */}
          <TabsContent value="buildings" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {buildings.map((building: Building) => (
                <Card key={building.id} className="hover:shadow-xl transition-all cursor-pointer transform hover:scale-105">
                  <CardContent className="p-8 text-center">
                    <div 
                      className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg"
                      style={{ backgroundColor: building.colorCode }}
                    >
                      <span className="text-white font-bold text-3xl">{building.name}</span>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">{building.nameEn}</h3>
                    <p className="text-gray-600 mb-4">{building.nameFi}</p>
                    <div className="flex items-center justify-center space-x-4 text-sm text-gray-500">
                      <span>{building.floors} floors</span>
                      <span>•</span>
                      <span>{rooms.filter((r: Room) => r.buildingId === building.id).length} rooms</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}