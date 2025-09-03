import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Building, Room, Hallway } from "@shared/schema";
import { Edit, MapPin, Route, Square, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function InteractiveMapEditor() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [placementMode, setPlacementMode] = useState<'room' | 'hallway' | null>(null);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>("");
  const mapRef = useRef<HTMLDivElement>(null);

  const { data: buildings = [], isLoading } = useQuery<Building[]>({
    queryKey: ["/api/buildings"],
  });

  const { data: rooms = [] } = useQuery<Room[]>({
    queryKey: ["/api/rooms"],
  });

  const { data: hallways = [] } = useQuery<Hallway[]>({
    queryKey: ["/api/hallways"],
  });

  const isAdmin = (user as any)?.role === 'admin';

  const createRoomMutation = useMutation({
    mutationFn: async (roomData: any) => {
      const response = await apiRequest("/api/rooms", "POST", roomData);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      toast({ title: "Room created successfully" });
      setPlacementMode(null);
    },
    onError: (error) => {
      toast({ title: "Error creating room", description: error.message, variant: "destructive" });
    },
  });

  const createHallwayMutation = useMutation({
    mutationFn: async (hallwayData: any) => {
      const response = await apiRequest("/api/hallways", "POST", hallwayData);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hallways"] });
      toast({ title: "Hallway created successfully" });
      setPlacementMode(null);
    },
    onError: (error) => {
      toast({ title: "Error creating hallway", description: error.message, variant: "destructive" });
    },
  });

  const handleMapClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!isEditMode || !placementMode || !mapRef.current || !selectedBuildingId) {
      if (!selectedBuildingId && placementMode) {
        toast({ title: "Please select a building first", variant: "destructive" });
      }
      return;
    }

    const rect = mapRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left - rect.width / 2;
    const y = event.clientY - rect.top - rect.height / 2;

    if (placementMode === 'room') {
      const roomName = prompt("Enter room name (e.g., U30, K15):");
      if (!roomName) return;

      createRoomMutation.mutate({
        buildingId: selectedBuildingId,
        roomNumber: roomName,
        name: roomName,
        nameEn: roomName,
        nameFi: roomName,
        type: "classroom",
        mapPositionX: Math.round(x),
        mapPositionY: Math.round(y),
        width: 40,
        height: 30,
        floor: 1,
      });
    } else if (placementMode === 'hallway') {
      const hallwayName = prompt("Enter hallway name (e.g., Main Corridor):");
      if (!hallwayName) return;

      createHallwayMutation.mutate({
        buildingId: selectedBuildingId,
        name: hallwayName,
        nameEn: hallwayName,
        nameFi: hallwayName,
        startX: Math.round(x - 30),
        startY: Math.round(y),
        endX: Math.round(x + 30),
        endY: Math.round(y),
        width: 4,
      });
    }
  };

  const getBuildingIcon = (name: string) => {
    switch(name) {
      case 'M': return 'fas fa-music';
      case 'K': return 'fas fa-university';  
      case 'L': case 'OG': return 'fas fa-dumbbell';
      case 'U': case 'A': return 'fas fa-chalkboard-teacher';
      case 'R': return 'fas fa-coffee';
      default: return 'fas fa-building';
    }
  };

  const handleBuildingClick = (building: Building) => {
    setSelectedBuilding(building);
    if (isEditMode) {
      setSelectedBuildingId(building.id);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-foreground">{t('map.title')}</h2>
          <div className="flex space-x-2">
            {isAdmin && (
              <>
                <Button 
                  variant={isEditMode ? "default" : "outline"} 
                  size="sm" 
                  onClick={() => {
                    setIsEditMode(!isEditMode);
                    setPlacementMode(null);
                    setSelectedBuildingId("");
                  }}
                  data-testid="button-edit-mode"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  {isEditMode ? 'Exit Edit' : 'Edit Mode'}
                </Button>
                {isEditMode && (
                  <>
                    <Select value={selectedBuildingId} onValueChange={setSelectedBuildingId}>
                      <SelectTrigger className="w-40" data-testid="select-target-building">
                        <SelectValue placeholder="Select building" />
                      </SelectTrigger>
                      <SelectContent>
                        {buildings.map((building) => (
                          <SelectItem key={building.id} value={building.id}>
                            {building.name} - {building.nameEn}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button 
                      variant={placementMode === 'room' ? "default" : "outline"} 
                      size="sm" 
                      onClick={() => setPlacementMode(placementMode === 'room' ? null : 'room')}
                      disabled={!selectedBuildingId}
                      data-testid="button-place-room"
                    >
                      <Square className="h-4 w-4 mr-1" />
                      Place Room
                    </Button>
                    <Button 
                      variant={placementMode === 'hallway' ? "default" : "outline"} 
                      size="sm" 
                      onClick={() => setPlacementMode(placementMode === 'hallway' ? null : 'hallway')}
                      disabled={!selectedBuildingId}
                      data-testid="button-place-hallway"
                    >
                      <Route className="h-4 w-4 mr-1" />
                      Place Hallway
                    </Button>
                    {placementMode && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setPlacementMode(null)}
                        data-testid="button-cancel-placement"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </>
                )}
              </>
            )}
            <Button variant="outline" size="sm" data-testid="button-zoom-in">
              <i className="fas fa-search-plus mr-1"></i>{t('map.zoomIn')}
            </Button>
            <Button variant="outline" size="sm" data-testid="button-floors">
              <i className="fas fa-layer-group mr-1"></i>{t('map.floors')}
            </Button>
          </div>
        </div>
        
        {isEditMode && placementMode && (
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <MapPin className="h-4 w-4 inline mr-1" />
              Click anywhere on the map to place a {placementMode} in {buildings.find(b => b.id === selectedBuildingId)?.name}
            </p>
          </div>
        )}
        
        {/* Interactive campus map */}
        <div 
          ref={mapRef}
          className={`relative bg-muted rounded-lg p-8 min-h-[500px] overflow-hidden ${isEditMode && placementMode ? 'cursor-crosshair' : 'cursor-default'}`} 
          onClick={handleMapClick}
          data-testid="campus-map"
        >
          {/* Buildings */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            {buildings.map((building, index) => (
              <div
                key={building.id}
                className="map-building absolute rounded-md shadow-lg flex items-center justify-center text-white font-semibold hover:shadow-xl cursor-pointer transition-all hover:scale-105"
                style={{
                  backgroundColor: building.colorCode,
                  top: `${building.mapPositionY || (index * 80 - 120)}px`,
                  left: `${building.mapPositionX || (index * 100 - 300)}px`,
                  width: '120px',
                  height: '80px',
                  border: selectedBuildingId === building.id ? '3px solid #FFD700' : 'none',
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleBuildingClick(building);
                }}
                data-testid={`building-${building.name}`}
              >
                <div className="text-center">
                  <i className={`${getBuildingIcon(building.name)} text-lg mb-1`}></i>
                  <div className="text-sm font-bold">{building.name}</div>
                  <div className="text-xs opacity-75">{building.nameEn}</div>
                </div>
              </div>
            ))}
            
            {/* Rooms */}
            {(rooms as Room[]).map((room) => (
              <div
                key={room.id}
                className="absolute border-2 border-gray-600 bg-white/90 rounded text-black text-xs flex items-center justify-center cursor-pointer hover:bg-white transition-all"
                style={{
                  top: `${room.mapPositionY || 0}px`,
                  left: `${room.mapPositionX || 0}px`,
                  width: `${room.width || 40}px`,
                  height: `${room.height || 30}px`,
                  backgroundColor: room.colorCode || '#F3F4F6',
                }}
                title={`${room.roomNumber} - ${room.name}`}
                data-testid={`room-${room.id}`}
              >
                <span className="font-semibold">{room.roomNumber}</span>
              </div>
            ))}
            
            {/* Hallways */}
            {(hallways as Hallway[]).map((hallway) => (
              <div
                key={hallway.id}
                className="absolute rounded cursor-pointer hover:opacity-80 transition-all"
                style={{
                  backgroundColor: hallway.colorCode || "#9CA3AF",
                  top: `${Math.min(hallway.startY || 0, hallway.endY || 0)}px`,
                  left: `${Math.min(hallway.startX || 0, hallway.endX || 0)}px`,
                  width: `${Math.abs((hallway.endX || 0) - (hallway.startX || 0)) || 60}px`,
                  height: `${Math.max(hallway.width || 4, Math.abs((hallway.endY || 0) - (hallway.startY || 0)) || 4)}px`,
                  border: hallway.emergencyRoute ? '2px dashed #EF4444' : 'none',
                }}
                title={`${hallway.name}${hallway.emergencyRoute ? ' (Emergency Route)' : ''}`}
                data-testid={`hallway-${hallway.id}`}
              />
            ))}

            {/* Grid overlay for edit mode */}
            {isEditMode && (
              <div className="absolute inset-0 opacity-20 pointer-events-none">
                <svg className="w-full h-full">
                  <defs>
                    <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#666" strokeWidth="1"/>
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" />
                </svg>
              </div>
            )}
          </div>
          
          {/* Legend */}
          <div className="absolute bottom-4 right-4 bg-card p-3 rounded-md border border-border shadow-sm">
            <div className="text-sm font-medium text-foreground mb-2">{t('map.legend')}</div>
            <div className="space-y-1 text-xs">
              <div className="flex items-center">
                <div className="w-3 h-3 rounded mr-2" style={{ backgroundColor: '#9333EA' }}></div>
                Music Building (M)
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded mr-2" style={{ backgroundColor: '#DC2626' }}></div>
                Central Hall (K)
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded mr-2" style={{ backgroundColor: '#059669' }}></div>
                Gym (L)
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded mr-2" style={{ backgroundColor: '#2563EB' }}></div>
                U Building
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-white border border-gray-600 rounded mr-2"></div>
                Classrooms
              </div>
              <div className="flex items-center">
                <div className="w-8 h-1 bg-gray-400 rounded mr-2"></div>
                Hallways
              </div>
            </div>
          </div>
          
          {/* Navigation Compass */}
          <div className="absolute top-4 right-4 w-12 h-12 bg-card border border-border rounded-full flex items-center justify-center shadow-sm">
            <i className="fas fa-compass text-muted-foreground text-lg"></i>
          </div>

          {/* Crosshair when in placement mode */}
          {isEditMode && placementMode && (
            <div className="absolute top-4 left-4 bg-blue-100 dark:bg-blue-900 p-2 rounded-md border border-blue-300 dark:border-blue-700">
              <div className="text-sm text-blue-800 dark:text-blue-200">
                {placementMode === 'room' ? 'Room Placement Mode' : 'Hallway Placement Mode'}
              </div>
            </div>
          )}
        </div>
        
        {/* Building Information Panel */}
        {selectedBuilding && (
          <div className="mt-6 p-4 bg-muted rounded-md border border-border" data-testid="building-info">
            <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
              <i className={getBuildingIcon(selectedBuilding.name)}></i>
              {selectedBuilding.name} - {selectedBuilding.nameEn || selectedBuilding.nameFi}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
              <div><strong>Floors:</strong> {selectedBuilding.floors}</div>
              <div><strong>Description:</strong> {selectedBuilding.descriptionEn || selectedBuilding.descriptionFi}</div>
              {selectedBuilding.capacity && (
                <div><strong>Capacity:</strong> {selectedBuilding.capacity}</div>
              )}
              {selectedBuilding.facilities && selectedBuilding.facilities.length > 0 && (
                <div><strong>Facilities:</strong> {selectedBuilding.facilities.join(', ')}</div>
              )}
            </div>
          </div>
        )}

        {/* Room and Hallway Statistics */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">{buildings.length}</div>
              <div className="text-sm text-muted-foreground">Buildings</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{(rooms as Room[]).length}</div>
              <div className="text-sm text-muted-foreground">Rooms</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{(hallways as Hallway[]).length}</div>
              <div className="text-sm text-muted-foreground">Hallways</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">
                {(rooms as Room[]).filter(r => r.type === 'classroom').length}
              </div>
              <div className="text-sm text-muted-foreground">Classrooms</div>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}