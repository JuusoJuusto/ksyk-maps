import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Building, InsertBuilding, insertBuildingSchema } from "@shared/schema";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Building as BuildingIcon, Plus, Edit, Trash2, MapPin } from "lucide-react";

type FormData = InsertBuilding;

export default function BuildingManagement() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState<Building | null>(null);

  const { data: buildings = [], isLoading } = useQuery<Building[]>({
    queryKey: ["/api/buildings"],
  });

  const createBuildingMutation = useMutation({
    mutationFn: async (building: InsertBuilding) => {
      const response = await apiRequest("/api/buildings", "POST", building);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/buildings"] });
      setIsDialogOpen(false);
      toast({
        title: "Success",
        description: "Building created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create building",
        variant: "destructive",
      });
    },
  });

  const updateBuildingMutation = useMutation({
    mutationFn: async ({ id, building }: { id: string; building: Partial<InsertBuilding> }) => {
      const response = await apiRequest(`/api/buildings/${id}`, "PUT", building);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/buildings"] });
      setIsDialogOpen(false);
      setEditingBuilding(null);
      toast({
        title: "Success",
        description: "Building updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update building",
        variant: "destructive",
      });
    },
  });

  const deleteBuildingMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest(`/api/buildings/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/buildings"] });
      toast({
        title: "Success",
        description: "Building deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete building",
        variant: "destructive",
      });
    },
  });

  const form = useForm<FormData>({
    resolver: zodResolver(insertBuildingSchema),
    defaultValues: {
      name: "",
      nameEn: "",
      nameFi: "",
      description: "",
      descriptionEn: "",
      descriptionFi: "",
      accessInfo: "",
      colorCode: "#3b82f6",
      mapPositionX: 0,
      mapPositionY: 0,
      isActive: true,
    },
  });

  const handleSubmit = (data: FormData) => {
    if (editingBuilding) {
      updateBuildingMutation.mutate({ id: editingBuilding.id, building: data });
    } else {
      createBuildingMutation.mutate(data);
    }
  };

  const openEditDialog = (building: Building) => {
    setEditingBuilding(building);
    form.reset({
      name: building.name,
      nameEn: building.nameEn || "",
      nameFi: building.nameFi || "",
      description: building.description || "",
      descriptionEn: building.descriptionEn || "",
      descriptionFi: building.descriptionFi || "",
      accessInfo: building.accessInfo || "",
      colorCode: building.colorCode || "#3b82f6",
      mapPositionX: building.mapPositionX || 0,
      mapPositionY: building.mapPositionY || 0,
      isActive: building.isActive ?? true,
    });
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingBuilding(null);
    form.reset({
      name: "",
      nameEn: "",
      nameFi: "",
      description: "",
      descriptionEn: "",
      descriptionFi: "",
      accessInfo: "",
      colorCode: "#3b82f6",
      mapPositionX: 0,
      mapPositionY: 0,
      isActive: true,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this building?")) {
      deleteBuildingMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Building Management</h2>
          <p className="text-muted-foreground">Manage campus buildings and their properties</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog} data-testid="add-building-button">
              <Plus className="w-4 h-4 mr-2" />
              Add Building
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingBuilding ? "Edit Building" : "Create New Building"}
              </DialogTitle>
              <DialogDescription>
                {editingBuilding 
                  ? "Update the building information below."
                  : "Fill in the details for the new building."
                }
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              
              const buildingData = {
                name: formData.get("name") as string,
                nameEn: formData.get("nameEn") as string || undefined,
                nameFi: formData.get("nameFi") as string || undefined,
                description: formData.get("description") as string || undefined,
                descriptionEn: formData.get("descriptionEn") as string || undefined,
                descriptionFi: formData.get("descriptionFi") as string || undefined,
                accessInfo: formData.get("accessInfo") as string || undefined,
                colorCode: formData.get("colorCode") as string || "#3b82f6",
                mapPositionX: formData.get("mapPositionX") ? Number(formData.get("mapPositionX")) : 0,
                mapPositionY: formData.get("mapPositionY") ? Number(formData.get("mapPositionY")) : 0,
                isActive: (e.target as HTMLFormElement).querySelector<HTMLInputElement>('[name="isActive"]')?.checked ?? true,
              };

              if (editingBuilding) {
                updateBuildingMutation.mutate({ id: editingBuilding.id, building: buildingData });
              } else {
                createBuildingMutation.mutate(buildingData);
              }
            }} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Building Code *</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={editingBuilding?.name || ""}
                  placeholder="e.g., M, K, L"
                  required
                  data-testid="building-name-input"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nameEn">Name (English)</Label>
                  <Input
                    id="nameEn"
                    name="nameEn"
                    defaultValue={editingBuilding?.nameEn || ""}
                    placeholder="Music Building"
                    data-testid="building-name-en-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nameFi">Name (Finnish)</Label>
                  <Input
                    id="nameFi"
                    name="nameFi"
                    defaultValue={editingBuilding?.nameFi || ""}
                    placeholder="Musiikkitalo"
                    data-testid="building-name-fi-input"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="accessInfo">Access Information</Label>
                <Input
                  id="accessInfo"
                  name="accessInfo"
                  defaultValue={editingBuilding?.accessInfo || ""}
                  placeholder="Access instructions or address"
                  data-testid="building-access-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="colorCode">Color Code</Label>
                <Input
                  id="colorCode"
                  name="colorCode"
                  type="color"
                  defaultValue={editingBuilding?.colorCode || "#3b82f6"}
                  data-testid="building-color-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mapPositionX">Map Position X</Label>
                  <Input
                    id="mapPositionX"
                    name="mapPositionX"
                    type="number"
                    defaultValue={editingBuilding?.mapPositionX?.toString() || "0"}
                    placeholder="0"
                    data-testid="building-x-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mapPositionY">Map Position Y</Label>
                  <Input
                    id="mapPositionY"
                    name="mapPositionY"
                    type="number"
                    defaultValue={editingBuilding?.mapPositionY?.toString() || "0"}
                    placeholder="0"
                    data-testid="building-y-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="descriptionEn">Description (English)</Label>
                  <Textarea
                    id="descriptionEn"
                    name="descriptionEn"
                    defaultValue={editingBuilding?.descriptionEn || ""}
                    placeholder="Building description in English"
                    rows={3}
                    data-testid="building-desc-en-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="descriptionFi">Description (Finnish)</Label>
                  <Textarea
                    id="descriptionFi"
                    name="descriptionFi"
                    defaultValue={editingBuilding?.descriptionFi || ""}
                    placeholder="Rakennuksen kuvaus suomeksi"
                    rows={3}
                    data-testid="building-desc-fi-input"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isActive"
                  name="isActive"
                  defaultChecked={editingBuilding?.isActive ?? true}
                  data-testid="building-active-switch"
                  className="h-4 w-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
                <Label htmlFor="isActive">Active</Label>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createBuildingMutation.isPending || updateBuildingMutation.isPending}
                  data-testid="save-building-button"
                >
                  {editingBuilding ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-300 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {buildings.map((building) => (
            <Card key={building.id} className="relative">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="p-2 rounded-lg text-white"
                      style={{ backgroundColor: building.colorCode || "#3b82f6" }}
                    >
                      <BuildingIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{building.name}</CardTitle>
                      <CardDescription>
                        {building.nameEn || building.nameFi || "No name provided"}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant={building.isActive ? "default" : "secondary"}>
                    {building.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {building.accessInfo && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <MapPin className="w-4 h-4" />
                    {building.accessInfo}
                  </div>
                )}
                {(building.descriptionEn || building.descriptionFi) && (
                  <p className="text-sm text-muted-foreground mb-4">
                    {building.descriptionEn || building.descriptionFi}
                  </p>
                )}
                {(building.mapPositionX !== null && building.mapPositionY !== null) && (
                  <p className="text-xs text-muted-foreground mb-4">
                    Map Position: ({building.mapPositionX}, {building.mapPositionY})
                  </p>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(building)}
                    data-testid={`edit-building-${building.id}`}
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(building.id)}
                    className="text-red-600 hover:text-red-700"
                    data-testid={`delete-building-${building.id}`}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && buildings.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <BuildingIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No buildings found</h3>
            <p className="text-muted-foreground mb-4">
              Get started by creating your first building.
            </p>
            <Button onClick={openCreateDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Add Building
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}