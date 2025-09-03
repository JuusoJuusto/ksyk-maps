import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from "@tanstack/react-query";
import { Search, MapPin, Route, Navigation as NavigationIcon, Clock, ArrowRight } from "lucide-react";
import type { Room } from "@shared/schema";

interface NavigationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (from: string, to: string) => void;
}

export default function NavigationModal({ isOpen, onClose, onNavigate }: NavigationModalProps) {
  const [fromRoom, setFromRoom] = useState("");
  const [toRoom, setToRoom] = useState("");
  const [fromSearch, setFromSearch] = useState("");
  const [toSearch, setToSearch] = useState("");

  const { data: rooms = [] } = useQuery<Room[]>({
    queryKey: ["/api/rooms"],
    enabled: isOpen,
  });

  // Memoized room filtering for performance
  const { fromSuggestions, toSuggestions } = useMemo(() => {
    const filterRooms = (query: string) => rooms.filter(room =>
      room.roomNumber.toLowerCase().includes(query.toLowerCase()) ||
      room.nameEn?.toLowerCase().includes(query.toLowerCase()) ||
      room.nameFi?.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 8);

    return {
      fromSuggestions: filterRooms(fromSearch),
      toSuggestions: filterRooms(toSearch)
    };
  }, [rooms, fromSearch, toSearch]);

  const handleNavigate = () => {
    if (fromRoom && toRoom) {
      onNavigate(fromRoom, toRoom);
      onClose();
      setFromRoom("");
      setToRoom("");
      setFromSearch("");
      setToSearch("");
    }
  };

  const handleRoomSelect = (room: Room, type: 'from' | 'to') => {
    if (type === 'from') {
      setFromRoom(room.roomNumber);
      setFromSearch("");
    } else {
      setToRoom(room.roomNumber);
      setToSearch("");
    }
  };

  // Get estimated time based on room distance
  const getEstimatedTime = (): string => {
    if (!fromRoom || !toRoom) return "";
    const fromRoomData = rooms.find(r => r.roomNumber === fromRoom);
    const toRoomData = rooms.find(r => r.roomNumber === toRoom);
    if (!fromRoomData || !toRoomData) return "";
    
    const distance = Math.sqrt(
      Math.pow(toRoomData.mapPositionX - fromRoomData.mapPositionX, 2) + 
      Math.pow(toRoomData.mapPositionY - fromRoomData.mapPositionY, 2)
    );
    const estimatedMinutes = Math.max(1, Math.round(distance / 50));
    return `~${estimatedMinutes} min`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <NavigationIcon className="w-6 h-6 text-blue-600" />
            Campus Navigation
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* From Room Section */}
          <div className="space-y-3">
            <Label htmlFor="from-room" className="text-sm font-semibold flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              Starting Point
            </Label>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="from-room"
                placeholder="Search or type room (e.g., M12, U30, Gym 1)"
                value={fromRoom || fromSearch}
                onChange={(e) => {
                  const value = e.target.value;
                  setFromSearch(value);
                  if (!value) setFromRoom("");
                }}
                className="pl-10"
                data-testid="input-from-room"
              />
            </div>
            
            {/* From room suggestions */}
            {fromSearch && fromSuggestions.length > 0 && (
              <ScrollArea className="max-h-32 border rounded-md">
                <div className="p-1">
                  {fromSuggestions.map(room => (
                    <button
                      key={room.id}
                      className="w-full text-left p-2 hover:bg-muted rounded-sm transition-colors text-sm"
                      onClick={() => handleRoomSelect(room, 'from')}
                      data-testid={`suggestion-from-${room.roomNumber}`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium">{room.roomNumber}</span>
                          <span className="text-muted-foreground ml-2">
                            {room.nameEn || room.nameFi}
                          </span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {room.type?.replace('_', ' ') || 'Room'}
                        </Badge>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}

            {fromRoom && (
              <div className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-md">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-green-600" />
                  <span className="font-medium text-green-800 dark:text-green-200">{fromRoom}</span>
                  <span className="text-green-600 dark:text-green-400 text-sm">
                    - {rooms.find(r => r.roomNumber === fromRoom)?.nameEn || 'Selected'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* To Room Section */}
          <div className="space-y-3">
            <Label htmlFor="to-room" className="text-sm font-semibold flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              Destination
            </Label>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="to-room"
                placeholder="Search or type destination (e.g., K15, A20)"
                value={toRoom || toSearch}
                onChange={(e) => {
                  const value = e.target.value;
                  setToSearch(value);
                  if (!value) setToRoom("");
                }}
                className="pl-10"
                data-testid="input-to-room"
              />
            </div>
            
            {/* To room suggestions */}
            {toSearch && toSuggestions.length > 0 && (
              <ScrollArea className="max-h-32 border rounded-md">
                <div className="p-1">
                  {toSuggestions.map(room => (
                    <button
                      key={room.id}
                      className="w-full text-left p-2 hover:bg-muted rounded-sm transition-colors text-sm"
                      onClick={() => handleRoomSelect(room, 'to')}
                      data-testid={`suggestion-to-${room.roomNumber}`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium">{room.roomNumber}</span>
                          <span className="text-muted-foreground ml-2">
                            {room.nameEn || room.nameFi}
                          </span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {room.type?.replace('_', ' ') || 'Room'}
                        </Badge>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}

            {toRoom && (
              <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-red-600" />
                  <span className="font-medium text-red-800 dark:text-red-200">{toRoom}</span>
                  <span className="text-red-600 dark:text-red-400 text-sm">
                    - {rooms.find(r => r.roomNumber === toRoom)?.nameEn || 'Selected'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Route Summary */}
          {fromRoom && toRoom && (
            <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Route className="w-4 h-4 text-blue-600" />
                  <span className="font-medium text-blue-800 dark:text-blue-200">Route Summary</span>
                </div>
                <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400 text-sm">
                  <Clock className="w-3 h-3" />
                  {getEstimatedTime()}
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-blue-700 dark:text-blue-300">{fromRoom}</span>
                <ArrowRight className="w-4 h-4 text-blue-600" />
                <span className="text-blue-700 dark:text-blue-300">{toRoom}</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-2">
            <Button 
              onClick={onClose} 
              variant="outline" 
              className="flex-1"
              data-testid="button-cancel-navigation"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleNavigate}
              disabled={!fromRoom || !toRoom}
              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              data-testid="button-show-route"
            >
              <Route className="w-4 h-4 mr-2" />
              Show Route
            </Button>
          </div>

          {/* Quick Examples */}
          {!fromRoom && !toRoom && rooms.length > 0 && (
            <div className="mt-4 p-3 bg-muted rounded-md">
              <div className="text-xs font-medium text-muted-foreground mb-2">Popular Routes:</div>
              <div className="space-y-1">
                {[
                  { from: 'M12', to: 'U30', desc: 'Music Room to Classroom' },
                  { from: 'K15', to: 'Gym 1', desc: 'Main Office to Gymnasium' },
                  { from: 'A20', to: 'M12', desc: 'Computer Lab to Music Room' }
                ].map((route, idx) => (
                  <button
                    key={idx}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    onClick={() => {
                      setFromRoom(route.from);
                      setToRoom(route.to);
                    }}
                    data-testid={`quick-route-${idx}`}
                  >
                    {route.from} → {route.to} ({route.desc})
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}