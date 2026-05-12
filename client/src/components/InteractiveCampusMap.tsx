import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import OptimizedCampusMap from "@/components/OptimizedCampusMap";
import { 
  MapPin, 
  Building, 
  Users, 
  Search, 
  Zap,
  Navigation,
  Info,
  Star
} from "lucide-react";

interface Building {
  id: string;
  name: string;
  nameEn?: string;
  nameFi?: string;
  floors: number;
  colorCode: string;
  mapPositionX?: number;
  mapPositionY?: number;
}

interface Room {
  id: string;
  roomNumber: string;
  name?: string;
  nameEn?: string;
  type: string;
  floor: number;
  buildingId: string;
}

interface InteractiveCampusMapProps {
  selectedFloor: number;
  selectedRoom: Room | null;
  onRoomSelect: (room: Room | null) => void;
  buildings: Building[];
  rooms: Room[];
}

export default function InteractiveCampusMap({ 
  selectedFloor, 
  selectedRoom, 
  onRoomSelect, 
  buildings: propBuildings, 
  rooms: propRooms 
}: InteractiveCampusMapProps) {
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Use props or fetch data as fallback
  const buildings = propBuildings.length > 0 ? propBuildings : [];
  const rooms = propRooms.length > 0 ? propRooms : [];

  const filteredRooms = rooms.filter((room: Room) =>
    selectedBuilding ? room.buildingId === selectedBuilding.id && room.floor === selectedFloor : false
  );

  const floorRooms = rooms.filter((room: Room) => room.floor === selectedFloor);

  const getPopularRooms = () => {
    const popularTypes = ['library', 'gymnasium', 'cafeteria', 'lab', 'music_room'];
    return rooms.filter((room: Room) => 
      popularTypes.some(type => room.type.toLowerCase().includes(type))
    ).slice(0, 6);
  };

  // Convert buildings to OptimizedCampusMap format
  const optimizedBuildings = buildings.map((building: Building) => ({
    id: building.id,
    name: building.name,
    x: building.mapPositionX || 0,
    y: building.mapPositionY || 0,
    width: 150,
    height: 100,
    color: building.colorCode,
    type: 'Academic',
    floors: building.floors
  }));

  const handleBuildingClick = (building: any) => {
    const originalBuilding = buildings.find((b: Building) => b.id === building.id);
    if (originalBuilding) {
      setSelectedBuilding(originalBuilding);
    }
  };

  return (
    <div className="space-y-6">
      {/* Optimized High-Performance Map */}
      <Card className="shadow-2xl border-0 overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-700 text-white">
          <CardTitle className="text-3xl flex items-center">
            <MapPin className="mr-3 h-8 w-8" />
            KSYK Campus Map - Optimized
          </CardTitle>
          <p className="text-blue-100 text-lg">60fps rendering • Smooth zoom & pan • Search buildings</p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="h-[600px] w-full">
            <OptimizedCampusMap
              buildings={optimizedBuildings}
              onBuildingClick={handleBuildingClick}
              language="fi"
            />
          </div>
        </CardContent>
      </Card>

      {/* Building Details & Room List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Selected Building Info */}
        <Card className="shadow-xl border-0">
          <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
            <CardTitle className="flex items-center">
              <Building className="mr-2 h-6 w-6" />
              {selectedBuilding ? `Building ${selectedBuilding.name}` : "Select a Building"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {selectedBuilding ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold">{selectedBuilding.nameEn}</h3>
                  <div 
                    className="w-8 h-8 rounded-full shadow-md"
                    style={{ backgroundColor: selectedBuilding.colorCode }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{selectedBuilding.floors}</div>
                    <div className="text-sm text-blue-800">Floors</div>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{filteredRooms.length}</div>
                    <div className="text-sm text-green-800">Rooms</div>
                  </div>
                </div>
                
                {/* Room Types */}
                <div>
                  <h4 className="font-semibold mb-2">Room Types:</h4>
                  <div className="flex flex-wrap gap-2">
                    {Array.from(new Set(filteredRooms.map((room: Room) => room.type))).map((type: string) => (
                      <Badge key={type} variant="outline" className="capitalize">
                        {type.replace('_', ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Building className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">Click on a building to see details</p>
                <p className="text-sm">Explore rooms, facilities, and floor plans</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Popular Locations */}
        <Card className="shadow-xl border-0">
          <CardHeader className="bg-gradient-to-r from-orange-500 to-red-600 text-white">
            <CardTitle className="flex items-center">
              <Star className="mr-2 h-6 w-6" />
              Popular Locations
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              {getPopularRooms().map((room: Room) => (
                <div key={room.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                  <div>
                    <div className="font-semibold text-gray-900">{room.roomNumber}</div>
                    <div className="text-sm text-gray-600">{room.name || room.nameEn}</div>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="capitalize text-xs">
                      {room.type.replace('_', ' ')}
                    </Badge>
                    <div className="text-xs text-gray-500 mt-1">Floor {room.floor}</div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-6 pt-4 border-t">
              <Button className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
                <Search className="mr-2 h-4 w-4" />
                Search All Rooms
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}