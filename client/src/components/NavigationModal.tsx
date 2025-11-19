import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  X, 
  Navigation, 
  MapPin, 
  ArrowRight, 
  Clock,
  Route,
  Zap
} from "lucide-react";

interface NavigationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (from: string, to: string) => void;
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

export default function NavigationModal({ isOpen, onClose, onNavigate }: NavigationModalProps) {
  const [fromQuery, setFromQuery] = useState("");
  const [toQuery, setToQuery] = useState("");
  const [fromResults, setFromResults] = useState<Room[]>([]);
  const [toResults, setToResults] = useState<Room[]>([]);
  const [selectedFrom, setSelectedFrom] = useState<Room | null>(null);
  const [selectedTo, setSelectedTo] = useState<Room | null>(null);

  // Fetch rooms for search
  const { data: rooms = [] } = useQuery({
    queryKey: ["rooms"],
    queryFn: async () => {
      const response = await fetch("/api/rooms");
      if (!response.ok) throw new Error("Failed to fetch rooms");
      return response.json();
    },
  });

  // Handle search for starting point
  const handleFromSearch = (query: string) => {
    setFromQuery(query);
    if (query.trim()) {
      const filtered = rooms.filter((room: Room) =>
        room.roomNumber.toLowerCase().includes(query.toLowerCase()) ||
        room.name?.toLowerCase().includes(query.toLowerCase()) ||
        room.nameEn?.toLowerCase().includes(query.toLowerCase()) ||
        room.type.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 5);
      setFromResults(filtered);
    } else {
      setFromResults([]);
    }
  };

  // Handle search for destination
  const handleToSearch = (query: string) => {
    setToQuery(query);
    if (query.trim()) {
      const filtered = rooms.filter((room: Room) =>
        room.roomNumber.toLowerCase().includes(query.toLowerCase()) ||
        room.name?.toLowerCase().includes(query.toLowerCase()) ||
        room.nameEn?.toLowerCase().includes(query.toLowerCase()) ||
        room.type.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 5);
      setToResults(filtered);
    } else {
      setToResults([]);
    }
  };

  const handleNavigation = () => {
    if (selectedFrom && selectedTo) {
      const fromLabel = `${selectedFrom.roomNumber} (${selectedFrom.name || selectedFrom.nameEn})`;
      const toLabel = `${selectedTo.roomNumber} (${selectedTo.name || selectedTo.nameEn})`;
      onNavigate(fromLabel, toLabel);
      onClose();
      
      // Reset form
      setFromQuery("");
      setToQuery("");
      setSelectedFrom(null);
      setSelectedTo(null);
      setFromResults([]);
      setToResults([]);
    }
  };

  const popularDestinations = [
    { id: "library", name: "Library", room: "U40", type: "library" },
    { id: "gym", name: "Main Gymnasium", room: "L01", type: "gymnasium" },
    { id: "cafeteria", name: "Cafeteria", room: "K20", type: "cafeteria" },
    { id: "office", name: "Principal's Office", room: "A35", type: "office" },
    { id: "lab", name: "Chemistry Lab", room: "R10", type: "lab" },
    { id: "music", name: "Music Room", room: "M12", type: "music_room" }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl border-0">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-700 text-white">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl flex items-center">
              <Navigation className="mr-3 h-7 w-7" />
              🧭 Campus Navigation
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white hover:bg-white/20"
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
          <p className="text-blue-100">Find the best route between any two locations on campus</p>
        </CardHeader>
        
        <CardContent className="p-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* From Location */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  📍 Starting Point
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <Input
                    type="text"
                    placeholder="Search starting location..."
                    value={fromQuery}
                    onChange={(e) => handleFromSearch(e.target.value)}
                    className="pl-10 py-3 text-lg border-2 border-gray-200 focus:border-blue-500"
                  />
                </div>
                
                {selectedFrom && (
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold text-blue-700">{selectedFrom.roomNumber}</span>
                        <span className="ml-2 text-blue-600">{selectedFrom.name || selectedFrom.nameEn}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedFrom(null);
                          setFromQuery("");
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
                
                {fromResults.length > 0 && !selectedFrom && (
                  <div className="mt-2 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {fromResults.map((room: Room) => (
                      <div
                        key={room.id}
                        className="p-3 hover:bg-blue-50 cursor-pointer border-b last:border-b-0"
                        onClick={() => {
                          setSelectedFrom(room);
                          setFromQuery(`${room.roomNumber} - ${room.name || room.nameEn}`);
                          setFromResults([]);
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-semibold text-blue-600">{room.roomNumber}</span>
                            <span className="ml-2 text-gray-700">{room.name || room.nameEn}</span>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            Floor {room.floor}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* To Location */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  🎯 Destination
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <Input
                    type="text"
                    placeholder="Search destination..."
                    value={toQuery}
                    onChange={(e) => handleToSearch(e.target.value)}
                    className="pl-10 py-3 text-lg border-2 border-gray-200 focus:border-green-500"
                  />
                </div>
                
                {selectedTo && (
                  <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold text-green-700">{selectedTo.roomNumber}</span>
                        <span className="ml-2 text-green-600">{selectedTo.name || selectedTo.nameEn}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedTo(null);
                          setToQuery("");
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
                
                {toResults.length > 0 && !selectedTo && (
                  <div className="mt-2 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {toResults.map((room: Room) => (
                      <div
                        key={room.id}
                        className="p-3 hover:bg-green-50 cursor-pointer border-b last:border-b-0"
                        onClick={() => {
                          setSelectedTo(room);
                          setToQuery(`${room.roomNumber} - ${room.name || room.nameEn}`);
                          setToResults([]);
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-semibold text-green-600">{room.roomNumber}</span>
                            <span className="ml-2 text-gray-700">{room.name || room.nameEn}</span>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            Floor {room.floor}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Popular Destinations */}
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">🌟 Popular Destinations</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {popularDestinations.map((dest) => (
                <Button
                  key={dest.id}
                  variant="outline"
                  className="p-4 h-auto flex flex-col items-start hover:bg-blue-50 hover:border-blue-300"
                  onClick={() => {
                    const room = rooms.find((r: Room) => r.roomNumber === dest.room);
                    if (room) {
                      setSelectedTo(room);
                      setToQuery(`${room.roomNumber} - ${room.name || room.nameEn}`);
                      setToResults([]);
                    }
                  }}
                >
                  <div className="font-semibold text-blue-600">{dest.room}</div>
                  <div className="text-sm text-gray-600">{dest.name}</div>
                </Button>
              ))}
            </div>
          </div>

          {/* Navigation Button */}
          <div className="mt-8 flex justify-center">
            <Button
              size="lg"
              onClick={handleNavigation}
              disabled={!selectedFrom || !selectedTo}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-12 py-4 text-lg shadow-xl disabled:opacity-50"
            >
              <Route className="mr-3 h-6 w-6" />
              Get Directions
              <ArrowRight className="ml-3 h-6 w-6" />
            </Button>
          </div>

          {/* Route Preview */}
          {selectedFrom && selectedTo && (
            <div className="mt-6 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200">
              <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                <Zap className="mr-2 h-5 w-5 text-blue-600" />
                Route Preview
              </h4>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="text-center">
                    <div className="w-3 h-3 bg-blue-500 rounded-full mx-auto mb-1"></div>
                    <div className="text-sm font-semibold">{selectedFrom.roomNumber}</div>
                    <div className="text-xs text-gray-600">Start</div>
                  </div>
                  <div className="flex-1 h-0.5 bg-gradient-to-r from-blue-500 to-green-500 mx-4"></div>
                  <div className="text-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full mx-auto mb-1"></div>
                    <div className="text-sm font-semibold">{selectedTo.roomNumber}</div>
                    <div className="text-xs text-gray-600">Destination</div>
                  </div>
                </div>
                <div className="text-right ml-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <Clock className="mr-1 h-4 w-4" />
                    ~3 min walk
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}