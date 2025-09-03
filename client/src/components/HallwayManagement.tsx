import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Hallway, InsertHallway, Building, Floor } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Plus, Edit, Trash2, Route, AlertTriangle, Accessibility } from "lucide-react";

interface HallwayFormData {
  buildingId: string;
  floorId?: string;
  name: string;
  nameEn?: string;
  nameFi?: string;
  description?: string;
  descriptionEn?: string;
  descriptionFi?: string;
  startX?: number;
  startY?: number;
  endX?: number;
  endY?: number;
  width?: number;
  colorCode?: string;
  emergencyRoute?: boolean;
  accessibilityInfo?: string;
}

export default function HallwayManagement() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingHallway, setEditingHallway] = useState<Hallway | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<string>("");
  const [selectedFloor, setSelectedFloor] = useState<string>("");

  const { data: buildings = [] } = useQuery<Building[]>({
    queryKey: ["/api/buildings"],
  });

  const { data: floors = [] } = useQuery<Floor[]>({
    queryKey: ["/api/floors", selectedBuilding],
    queryFn: async (): Promise<Floor[]> => {
      try {
        if (!selectedBuilding) return [];
        const response = await fetch(`/api/floors?buildingId=${selectedBuilding}`);
        if (!response.ok) throw new Error('Failed to fetch floors');
        return await response.json() as Floor[];
      } catch (error) {
        console.error("Error fetching floors:", error);
        return [];
      }
    },
    enabled: !!selectedBuilding,
  });

  const { data: hallways = [] } = useQuery<Hallway[]>({
    queryKey: ["/api/hallways", selectedBuilding, selectedFloor],
    queryFn: async (): Promise<Hallway[]> => {
      try {
        const params = new URLSearchParams();
        if (selectedBuilding) params.append("buildingId", selectedBuilding);
        if (selectedFloor) params.append("floorId", selectedFloor);
        const response = await fetch(`/api/hallways${params.toString() ? `?${params.toString()}` : ""}`);
        if (!response.ok) throw new Error('Failed to fetch hallways');
        return await response.json() as Hallway[];
      } catch (error) {
        console.error("Error fetching hallways:", error);
        return [];
      }
    },
  });

  const createHallwayMutation = useMutation({
    mutationFn: async (hallway: InsertHallway) => {
      const response = await apiRequest("/api/hallways", "POST", hallway);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hallways"] });
      setIsDialogOpen(false);
      setEditingHallway(null);
      toast({ title: "Hallway created successfully" });
    },
    onError: (error) => {
      toast({ title: "Error creating hallway", description: error.message, variant: "destructive" });
    },
  });

  const updateHallwayMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertHallway> }) => {
      const response = await apiRequest(`/api/hallways/${id}`, "PUT", data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hallways"] });
      setIsDialogOpen(false);
      setEditingHallway(null);
      toast({ title: "Hallway updated successfully" });
    },
    onError: (error) => {
      toast({ title: "Error updating hallway", description: error.message, variant: "destructive" });
    },
  });

  const deleteHallwayMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest(`/api/hallways/${id}`, "DELETE");
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hallways"] });
      toast({ title: "Hallway deleted successfully" });
    },
    onError: (error) => {
      toast({ title: "Error deleting hallway", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const hallwayData: HallwayFormData = {
      buildingId: formData.get("buildingId") as string,
      floorId: formData.get("floorId") as string || undefined,
      name: formData.get("name") as string,
      nameEn: formData.get("nameEn") as string || undefined,
      nameFi: formData.get("nameFi") as string || undefined,
      description: formData.get("description") as string || undefined,
      descriptionEn: formData.get("descriptionEn") as string || undefined,
      descriptionFi: formData.get("descriptionFi") as string || undefined,
      startX: formData.get("startX") ? parseInt(formData.get("startX") as string) : undefined,
      startY: formData.get("startY") ? parseInt(formData.get("startY") as string) : undefined,
      endX: formData.get("endX") ? parseInt(formData.get("endX") as string) : undefined,
      endY: formData.get("endY") ? parseInt(formData.get("endY") as string) : undefined,
      width: formData.get("width") ? parseInt(formData.get("width") as string) : 2,
      colorCode: formData.get("colorCode") as string || "#9CA3AF",
      emergencyRoute: formData.get("emergencyRoute") === "on",
      accessibilityInfo: formData.get("accessibilityInfo") as string || undefined,
    };

    if (editingHallway) {
      updateHallwayMutation.mutate({ id: editingHallway.id, data: hallwayData });
    } else {
      createHallwayMutation.mutate(hallwayData);
    }
  };

  const handleEdit = (hallway: Hallway) => {
    setEditingHallway(hallway);
    setIsDialogOpen(true);
  };

  const handleDelete = async (hallway: Hallway) => {
    if (confirm(`Are you sure you want to delete ${hallway.name}?`)) {
      deleteHallwayMutation.mutate(hallway.id);
    }
  };

  const getBuildingName = (buildingId: string) => {
    const building = buildings.find(b => b.id === buildingId);
    return building ? `${building.name} - ${building.nameEn || building.nameFi}` : 'Unknown Building';
  };

  const getFloorName = (floorId: string) => {
    const floor = (floors as Floor[]).find(f => f.id === floorId);
    return floor ? (floor.name || `Floor ${floor.floorNumber}`) : 'Unknown Floor';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Route className="h-6 w-6" />
            Hallway Management
          </h2>
          <p className="text-muted-foreground">Manage hallways and corridors in buildings</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingHallway(null)} data-testid="button-add-hallway" className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Add Hallway
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {editingHallway ? "Edit Hallway" : "Add New Hallway"}
                </DialogTitle>
                <DialogDescription>
                  {editingHallway ? "Update hallway information" : "Create a new hallway in a building"}
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="buildingId">Building *</Label>
                    <Select name="buildingId" defaultValue={editingHallway?.buildingId} required>
                      <SelectTrigger data-testid="select-building">
                        <SelectValue placeholder="Select building" />
                      </SelectTrigger>
                      <SelectContent>
                        {buildings.map((building) => (
                          <SelectItem key={building.id} value={building.id}>
                            {building.name} - {building.nameEn || building.nameFi}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="floorId">Floor (Optional)</Label>
                    <Select name="floorId" defaultValue={editingHallway?.floorId || ""}>
                      <SelectTrigger data-testid="select-floor">
                        <SelectValue placeholder="Select floor (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">No specific floor</SelectItem>
                        {floors.map((floor: Floor) => (
                          <SelectItem key={floor.id} value={floor.id}>
                            {floor.name || `Floor ${floor.floorNumber}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="name">Hallway Name *</Label>
                    <Input
                      id="name"
                      name="name"
                      defaultValue={editingHallway?.name || ""}
                      required
                      data-testid="input-hallway-name"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="nameEn">Name (English)</Label>
                    <Input
                      id="nameEn"
                      name="nameEn"
                      defaultValue={editingHallway?.nameEn || ""}
                      data-testid="input-hallway-name-en"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="nameFi">Name (Finnish)</Label>
                    <Input
                      id="nameFi"
                      name="nameFi"
                      defaultValue={editingHallway?.nameFi || ""}
                      data-testid="input-hallway-name-fi"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="descriptionEn">Description (English)</Label>
                    <Textarea
                      id="descriptionEn"
                      name="descriptionEn"
                      defaultValue={editingHallway?.descriptionEn || ""}
                      data-testid="input-hallway-description-en"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="descriptionFi">Description (Finnish)</Label>
                    <Textarea
                      id="descriptionFi"
                      name="descriptionFi"
                      defaultValue={editingHallway?.descriptionFi || ""}
                      data-testid="input-hallway-description-fi"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="startX">Start X</Label>
                    <Input
                      id="startX"
                      name="startX"
                      type="number"
                      defaultValue={editingHallway?.startX || ""}
                      data-testid="input-start-x"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="startY">Start Y</Label>
                    <Input
                      id="startY"
                      name="startY"
                      type="number"
                      defaultValue={editingHallway?.startY || ""}
                      data-testid="input-start-y"
                    />
                  </div>

                  <div>
                    <Label htmlFor="endX">End X</Label>
                    <Input
                      id="endX"
                      name="endX"
                      type="number"
                      defaultValue={editingHallway?.endX || ""}
                      data-testid="input-end-x"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="endY">End Y</Label>
                    <Input
                      id="endY"
                      name="endY"
                      type="number"
                      defaultValue={editingHallway?.endY || ""}
                      data-testid="input-end-y"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="width">Width (px)</Label>
                    <Input
                      id="width"
                      name="width"
                      type="number"
                      defaultValue={editingHallway?.width || 2}
                      min="1"
                      data-testid="input-hallway-width"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="colorCode">Color</Label>
                    <Input
                      id="colorCode"
                      name="colorCode"
                      type="color"
                      defaultValue={editingHallway?.colorCode || "#9CA3AF"}
                      data-testid="input-hallway-color"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="emergencyRoute" 
                      name="emergencyRoute"
                      defaultChecked={editingHallway?.emergencyRoute || false}
                      data-testid="checkbox-emergency-route"
                    />
                    <Label htmlFor="emergencyRoute" className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      Emergency evacuation route
                    </Label>
                  </div>

                  <div>
                    <Label htmlFor="accessibilityInfo">Accessibility Information</Label>
                    <Textarea
                      id="accessibilityInfo"
                      name="accessibilityInfo"
                      defaultValue={editingHallway?.accessibilityInfo || ""}
                      placeholder="Wheelchair accessible, step-free access, etc."
                      data-testid="input-accessibility-info"
                    />
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  data-testid="button-cancel-hallway"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createHallwayMutation.isPending || updateHallwayMutation.isPending}
                  data-testid="button-save-hallway"
                >
                  {editingHallway ? "Update Hallway" : "Create Hallway"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        <div className="flex gap-4 items-center">
          <Select value={selectedBuilding} onValueChange={(value) => {
            setSelectedBuilding(value);
            setSelectedFloor("");
          }}>
            <SelectTrigger className="w-64" data-testid="select-filter-building">
              <SelectValue placeholder="Filter by building" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Buildings</SelectItem>
              {buildings.map((building) => (
                <SelectItem key={building.id} value={building.id}>
                  {building.name} - {building.nameEn || building.nameFi}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedBuilding && (
            <Select value={selectedFloor} onValueChange={setSelectedFloor}>
              <SelectTrigger className="w-64" data-testid="select-filter-floor">
                <SelectValue placeholder="Filter by floor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Floors</SelectItem>
                {floors.map((floor: Floor) => (
                  <SelectItem key={floor.id} value={floor.id}>
                    {floor.name || `Floor ${floor.floorNumber}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {hallways.map((hallway) => (
            <Card key={hallway.id} data-testid={`card-hallway-${hallway.id}`}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <div 
                        className="w-4 h-4 rounded" 
                        style={{ backgroundColor: hallway.colorCode || "#9CA3AF" }}
                      />
                      {hallway.name}
                    </CardTitle>
                    <CardDescription>
                      {getBuildingName(hallway.buildingId)}
                      {hallway.floorId && ` • ${getFloorName(hallway.floorId)}`}
                    </CardDescription>
                  </div>
                  <div className="flex gap-1">
                    {hallway.emergencyRoute && (
                      <Badge variant="destructive" className="text-xs" data-testid={`badge-emergency-${hallway.id}`}>
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Emergency
                      </Badge>
                    )}
                    {hallway.accessibilityInfo && (
                      <Badge variant="secondary" className="text-xs" data-testid={`badge-accessible-${hallway.id}`}>
                        <Accessibility className="h-3 w-3" />
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {(hallway.descriptionEn || hallway.descriptionFi) && (
                    <p className="text-sm text-muted-foreground">
                      {hallway.descriptionEn || hallway.descriptionFi}
                    </p>
                  )}
                  
                  {(hallway.startX !== null && hallway.startY !== null && hallway.endX !== null && hallway.endY !== null) && (
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <ArrowRight className="h-3 w-3" />
                      ({hallway.startX}, {hallway.startY}) → ({hallway.endX}, {hallway.endY})
                    </div>
                  )}

                  {hallway.accessibilityInfo && (
                    <div className="text-sm text-muted-foreground">
                      <Accessibility className="h-3 w-3 inline mr-1" />
                      {hallway.accessibilityInfo}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(hallway)}
                    data-testid={`button-edit-hallway-${hallway.id}`}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(hallway)}
                    data-testid={`button-delete-hallway-${hallway.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {hallways.length === 0 && (
          <div className="text-center py-12">
            <Route className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">No hallways found</h3>
            <p className="text-sm text-muted-foreground">
              {selectedBuilding || selectedFloor ? "No hallways in the selected filters" : "Start by adding your first hallway"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}