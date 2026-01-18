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

  // Pathfinding algorithm - finds route through hallways and stairways only
  const findPath = (from: Room, to: Room): Room[] | null => {
    // If same room, no path needed
    if (from.id === to.id) return [from];
    
    // Get all hallways and stairways (navigation nodes)
    const navRooms = rooms.filter((r: Room) => 
      r.type === 'hallway' || r.type === 'stairway' || r.type === 'elevator'
    );
    
    // Build adjacency graph - rooms connect if they're in same building and adjacent floors
    const buildGraph = () => {
      const graph = new Map<string, string[]>();
      
      // Add start and end rooms
      const allNodes = [from, to, ...navRooms];
      
      allNodes.forEach(room => {
        graph.set(room.id, []);
      });
      
      // Connect rooms in same building
      allNodes.forEach(roomA => {
        allNodes.forEach(roomB => {
          if (roomA.id === roomB.id) return;
          
          // Same building connections
          if (roomA.buildingId === roomB.buildingId) {
            // Same floor - can connect if both are nav rooms or one is start/end
            if (roomA.floor === roomB.floor) {
              const isNavConnection = 
                (roomA.type === 'hallway' || roomA.type === 'stairway' || roomA.type === 'elevator') &&
                (roomB.type === 'hallway' || roomB.type === 'stairway' || roomB.type === 'elevator');
              
              const isStartEnd = 
                (roomA.id === from.id || roomA.id === to.id) ||
                (roomB.id === from.id || roomB.id === to.id);
              
              if (isNavConnection || isStartEnd) {
                graph.get(roomA.id)?.push(roomB.id);
              }
            }
            // Adjacent floors - only through stairways/elevators
            else if (Math.abs(roomA.floor - roomB.floor) === 1) {
              if ((roomA.type === 'stairway' || roomA.type === 'elevator') &&
                  (roomB.type === 'stairway' || roomB.type === 'elevator')) {
                graph.get(roomA.id)?.push(roomB.id);
              }
            }
          }
        });
      });
      
      return graph;
    };
    
    // A* pathfinding
    const graph = buildGraph();
    const openSet = new Set([from.id]);
    const cameFrom = new Map<string, string>();
    const gScore = new Map<string, number>();
    const fScore = new Map<string, number>();
    
    gScore.set(from.id, 0);
    fScore.set(from.id, 0);
    
    while (openSet.size > 0) {
      // Get node with lowest fScore
      let current = '';
      let lowestF = Infinity;
      openSet.forEach(id => {
        const f = fScore.get(id) || Infinity;
        if (f < lowestF) {
          lowestF = f;
          current = id;
        }
      });
      
      if (current === to.id) {
        // Reconstruct path
        const path: Room[] = [];
        let curr = current;
        while (curr) {
          const room = rooms.find((r: Room) => r.id === curr) || (curr === from.id ? from : to);
          path.unshift(room);
          curr = cameFrom.get(curr) || '';
        }
        return path;
      }
      
      openSet.delete(current);
      const neighbors = graph.get(current) || [];
      
      neighbors.forEach(neighborId => {
        const tentativeG = (gScore.get(current) || 0) + 1;
        
        if (tentativeG < (gScore.get(neighborId) || Infinity)) {
          cameFrom.set(neighborId, current);
          gScore.set(neighborId, tentativeG);
          fScore.set(neighborId, tentativeG + 1); // Simple heuristic
          openSet.add(neighborId);
        }
      });
    }
    
    return null; // No path found
  };

  const handleNavigation = () => {
    if (selectedFrom && selectedTo) {
      try {
        const fromLabel = `${selectedFrom.roomNumber} - ${selectedFrom.name || selectedFrom.nameEn}`;
        const toLabel = `${selectedTo.roomNumber} - ${selectedTo.name || selectedTo.nameEn}`;
        
        // Find path through hallways/stairways
        const path = findPath(selectedFrom, selectedTo);
        
        if (!path) {
          alert(`❌ No route found!\n\nCannot find a path through hallways and stairways between these rooms.\n\nThis might mean:\n• The rooms are in different buildings\n• Missing hallway/stairway connections\n• Rooms are on different floors without stairway access`);
          return;
        }
        
        // Build route description with better formatting
        const routeSteps = path.map((room, idx) => {
          if (idx === 0) return `📍 Start: ${room.roomNumber} (Floor ${room.floor})`;
          if (idx === path.length - 1) return `🎯 Arrive: ${room.roomNumber} (Floor ${room.floor})`;
          
          if (room.type === 'stairway') return `🪜 Stairway ${room.roomNumber} → Floor ${room.floor}`;
          if (room.type === 'elevator') return `🛗 Elevator ${room.roomNumber} → Floor ${room.floor}`;
          if (room.type === 'hallway') return `🚶 Hallway ${room.roomNumber}`;
          if (room.type === 'door') return `🚪 Door ${room.roomNumber}`;
          return `→ ${room.roomNumber}`;
        }).join('\n');
        
        const estimatedTime = Math.max(1, Math.ceil(path.length * 0.5)); // 30 seconds per step
        const floorChanges = path.filter((room, idx) => idx > 0 && room.floor !== path[idx-1].floor).length;
        
        // Call the navigation handler
        onNavigate(fromLabel, toLabel);
        
        // Show success message with detailed route
        alert(`🎯 Navigation Set!\n\n📍 From: ${fromLabel}\n🎯 To: ${toLabel}\n\n📋 Route (${path.length} steps, ${floorChanges} floor changes):\n${routeSteps}\n\n⏱️ Estimated time: ~${estimatedTime} min\n\n✅ Follow the highlighted path on the map!`);
        
        // Close modal
        onClose();
        
        // Reset form
        setFromQuery("");
        setToQuery("");
        setSelectedFrom(null);
        setSelectedTo(null);
        setFromResults([]);
        setToResults([]);
      } catch (error) {
        console.error('Navigation error:', error);
        alert('❌ Navigation failed: ' + (error as Error).message);
      }
    }
  };

  const popularDestinations: any[] = [];

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