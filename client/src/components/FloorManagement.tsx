import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Floor, InsertFloor, Building } from "@shared/schema";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building as BuildingIcon, Plus, Edit, Trash2, Layers } from "lucide-react";

interface FloorFormData {
  buildingId: string;
  floorNumber: number;
  name?: string;
  nameEn?: string;
  nameFi?: string;
  description?: string;
  descriptionEn?: string;
  descriptionFi?: string;
  mapImageUrl?: string;
}

export default function FloorManagement() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFloor, setEditingFloor] = useState<Floor | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<string>("");

  const { data: buildings = [] } = useQuery<Building[]>({
    queryKey: ["/api/buildings"],
  });

  const { data: floors = [] } = useQuery<Floor[]>({
    queryKey: ["/api/floors", selectedBuilding],
    queryFn: async (): Promise<Floor[]> => {
      try {
        const url = `/api/floors${selectedBuilding ? `?buildingId=${selectedBuilding}` : ""}`;
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('Failed to fetch floors');
        }
        const data = await response.json();
        return data as Floor[];
      } catch (error) {
        console.error("Error fetching floors:", error);
        return [];
      }
    },
  });

  const createFloorMutation = useMutation({
    mutationFn: async (floor: InsertFloor) => {
      const response = await apiRequest("/api/floors", "POST", floor);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/floors"] });
      setIsDialogOpen(false);
      setEditingFloor(null);
      toast({ title: "Floor created successfully" });
    },
    onError: (error) => {
      toast({ title: "Error creating floor", description: error.message, variant: "destructive" });
    },
  });

  const updateFloorMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertFloor> }) => {
      const response = await apiRequest(`/api/floors/${id}`, "PUT", data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/floors"] });
      setIsDialogOpen(false);
      setEditingFloor(null);
      toast({ title: "Floor updated successfully" });
    },
    onError: (error) => {
      toast({ title: "Error updating floor", description: error.message, variant: "destructive" });
    },
  });

  const deleteFloorMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest(`/api/floors/${id}`, "DELETE");
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/floors"] });
      toast({ title: "Floor deleted successfully" });
    },
    onError: (error) => {
      toast({ title: "Error deleting floor", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const floorData: FloorFormData = {
      buildingId: formData.get("buildingId") as string,
      floorNumber: parseInt(formData.get("floorNumber") as string),
      name: formData.get("name") as string || undefined,
      nameEn: formData.get("nameEn") as string || undefined,
      nameFi: formData.get("nameFi") as string || undefined,
      description: formData.get("description") as string || undefined,
      descriptionEn: formData.get("descriptionEn") as string || undefined,
      descriptionFi: formData.get("descriptionFi") as string || undefined,
      mapImageUrl: formData.get("mapImageUrl") as string || undefined,
    };

    if (editingFloor) {
      updateFloorMutation.mutate({ id: editingFloor.id, data: floorData });
    } else {
      createFloorMutation.mutate(floorData);
    }
  };

  const handleEdit = (floor: Floor) => {
    setEditingFloor(floor);
    setIsDialogOpen(true);
  };

  const handleDelete = async (floor: Floor) => {
    if (confirm(`Are you sure you want to delete ${floor.name || `Floor ${floor.floorNumber}`}?`)) {
      deleteFloorMutation.mutate(floor.id);
    }
  };

  const getBuildingName = (buildingId: string) => {
    const building = buildings.find(b => b.id === buildingId);
    return building ? `${building.name} - ${building.nameEn || building.nameFi}` : 'Unknown Building';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Layers className="h-6 w-6" />
            Floor Management
          </h2>
          <p className="text-muted-foreground">Manage building floors and their layouts</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingFloor(null)} data-testid="button-add-floor">
              <Plus className="h-4 w-4 mr-2" />
              Add Floor
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {editingFloor ? "Edit Floor" : "Add New Floor"}
                </DialogTitle>
                <DialogDescription>
                  {editingFloor ? "Update floor information" : "Create a new floor in a building"}
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="buildingId">Building *</Label>
                    <Select name="buildingId" defaultValue={editingFloor?.buildingId} required>
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
                    <Label htmlFor="floorNumber">Floor Number *</Label>
                    <Input
                      id="floorNumber"
                      name="floorNumber"
                      type="number"
                      defaultValue={editingFloor?.floorNumber}
                      required
                      data-testid="input-floor-number"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="name">Display Name</Label>
                    <Input
                      id="name"
                      name="name"
                      defaultValue={editingFloor?.name || ""}
                      data-testid="input-floor-name"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="nameEn">Name (English)</Label>
                    <Input
                      id="nameEn"
                      name="nameEn"
                      defaultValue={editingFloor?.nameEn || ""}
                      data-testid="input-floor-name-en"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="nameFi">Name (Finnish)</Label>
                    <Input
                      id="nameFi"
                      name="nameFi"
                      defaultValue={editingFloor?.nameFi || ""}
                      data-testid="input-floor-name-fi"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="descriptionEn">Description (English)</Label>
                    <Textarea
                      id="descriptionEn"
                      name="descriptionEn"
                      defaultValue={editingFloor?.descriptionEn || ""}
                      data-testid="input-floor-description-en"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="descriptionFi">Description (Finnish)</Label>
                    <Textarea
                      id="descriptionFi"
                      name="descriptionFi"
                      defaultValue={editingFloor?.descriptionFi || ""}
                      data-testid="input-floor-description-fi"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="mapImageUrl">Floor Plan Image URL</Label>
                  <Input
                    id="mapImageUrl"
                    name="mapImageUrl"
                    type="url"
                    defaultValue={editingFloor?.mapImageUrl || ""}
                    placeholder="https://example.com/floorplan.jpg"
                    data-testid="input-floor-map-url"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  data-testid="button-cancel-floor"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createFloorMutation.isPending || updateFloorMutation.isPending}
                  data-testid="button-save-floor"
                >
                  {editingFloor ? "Update Floor" : "Create Floor"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        <div className="flex gap-4 items-center">
          <Select value={selectedBuilding} onValueChange={setSelectedBuilding}>
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
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {floors.map((floor) => (
            <Card key={floor.id} data-testid={`card-floor-${floor.id}`}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <BuildingIcon className="h-5 w-5" />
                      {floor.name || `Floor ${floor.floorNumber}`}
                    </CardTitle>
                    <CardDescription>
                      {getBuildingName(floor.buildingId)}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary" data-testid={`badge-floor-${floor.floorNumber}`}>
                    Floor {floor.floorNumber}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {(floor.descriptionEn || floor.descriptionFi) && (
                    <p className="text-sm text-muted-foreground">
                      {floor.descriptionEn || floor.descriptionFi}
                    </p>
                  )}
                  
                  {floor.mapImageUrl && (
                    <div className="text-sm text-muted-foreground">
                      📍 Has floor plan
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(floor)}
                    data-testid={`button-edit-floor-${floor.id}`}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(floor)}
                    data-testid={`button-delete-floor-${floor.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {floors.length === 0 && (
          <div className="text-center py-12">
            <Layers className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">No floors found</h3>
            <p className="text-sm text-muted-foreground">
              {selectedBuilding ? "No floors in the selected building" : "Start by adding your first floor"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}