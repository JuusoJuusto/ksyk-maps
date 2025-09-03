import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery } from "@tanstack/react-query";
import type { Room } from "@shared/schema";

interface NavigationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (from: string, to: string) => void;
}

export default function NavigationModal({ isOpen, onClose, onNavigate }: NavigationModalProps) {
  const [fromRoom, setFromRoom] = useState("");
  const [toRoom, setToRoom] = useState("");

  const { data: rooms = [] } = useQuery<Room[]>({
    queryKey: ["/api/rooms"],
    enabled: isOpen,
  });

  const handleNavigate = () => {
    if (fromRoom && toRoom) {
      onNavigate(fromRoom, toRoom);
      onClose();
      setFromRoom("");
      setToRoom("");
    }
  };

  const roomSuggestions = rooms.map(room => ({
    value: room.roomNumber,
    label: `${room.roomNumber} - ${room.nameEn || room.nameFi || 'Room'}`,
    building: room.buildingId
  }));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            🧭 Campus Navigation
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="from-room">From Room</Label>
            <Input
              id="from-room"
              placeholder="e.g., U34, M12, L05"
              value={fromRoom}
              onChange={(e) => setFromRoom(e.target.value.toUpperCase())}
              data-testid="input-from-room"
            />
            <p className="text-xs text-muted-foreground">
              Enter room number or select from suggestions
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="to-room">To Room</Label>
            <Input
              id="to-room"
              placeholder="e.g., U34, M12, L05"
              value={toRoom}
              onChange={(e) => setToRoom(e.target.value.toUpperCase())}
              data-testid="input-to-room"
            />
            <p className="text-xs text-muted-foreground">
              Enter destination room number
            </p>
          </div>

          {roomSuggestions.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Available Rooms:</Label>
              <div className="max-h-32 overflow-y-auto space-y-1 text-xs">
                {roomSuggestions.slice(0, 8).map((room, index) => (
                  <div 
                    key={index}
                    className="text-muted-foreground cursor-pointer hover:text-foreground"
                    onClick={() => {
                      if (!fromRoom) {
                        setFromRoom(room.value);
                      } else if (!toRoom) {
                        setToRoom(room.value);
                      }
                    }}
                  >
                    {room.label}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between gap-3">
          <Button 
            variant="outline" 
            onClick={onClose}
            data-testid="button-cancel-navigation"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleNavigate}
            disabled={!fromRoom || !toRoom}
            className="bg-blue-600 hover:bg-blue-700"
            data-testid="button-start-navigation"
          >
            🧭 Show Route
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}