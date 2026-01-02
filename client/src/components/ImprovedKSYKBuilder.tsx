import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Building, Home, Layers, Plus, Square, Trash2 } from "lucide-react";

export default function ImprovedKSYKBuilder() {
  const queryClient = useQueryClient();
  const [builderMode, setBuilderMode] = useState<'buildings' | 'rooms' | 'hallways'>('buildings');
  
  const [buildingData, setBuildingData] = useState({
    name: "",
    nameEn: "",
    nameFi: "",
    floors: 1,
    capacity: 100,
    colorCode: "#3B82F6",
    mapPositionX: 0,
    mapPositionY: 0,
    width: 200,
    height: 150
  });

  // Fetch buildings
  const { data: buildings = [] } = useQuery({
    queryKey: ["buildings"],
    queryFn: async () => {
      const response = await fetch("/api/buildings");
      if (!response.ok) throw new Error("Failed to fetch buildings");
      return response.json();
    },
  });

  const createBuildingMutation = useMutation({
    mutationFn: async (building: any) => {
      const response = await fetch("/api/buildings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(building),
      });
      if (!response.ok) throw new Error("Failed to create building");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buildings"] });
      alert("✅ Building created!");
      setBuildingData({
        name: "",
        nameEn: "",
        nameFi: "",
        floors: 1,
        capacity: 100,
        colorCode: "#3B82F6",
        mapPositionX: 0,
        mapPositionY: 0,
        width: 200,
        height: 150
      });
    },
  });

  const deleteBuildingMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/buildings/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete building");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buildings"] });
      alert("✅ Building deleted!");
    },
  });

  const colors = [
    { name: "Blue", value: "#3B82F6" },
    { name: "Red", value: "#EF4444" },
    { name: "Green", value: "#10B981" },
    { name: "Purple", value: "#8B5CF6" },
    { name: "Orange", value: "#F97316" },
    { name: "Pink", value: "#EC4899" },
    { name: "Indigo", value: "#6366F1" },
    { name: "Teal", value: "#14B8A6" }
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <Card className="shadow-xl border-2 border-blue-200">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <CardTitle className="text-3xl flex items-center justify-between">
            <span className="flex items-center">
              <Building className="mr-3 h-8 w-8" />
              KSYK Builder - Professional Edition
            </span>
            <Badge variant="secondary" className="bg-white/20 text-white text-lg px-4 py-2">
              {buildings.length} Buildings
            </Badge>
          </CardTitle>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Building Creator */}
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
            <CardTitle className="flex items-center">
              <Square className="mr-2 h-6 w-6" />
              Create Rectangle Building
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-bold">Building Code *</Label>
                <Input
                  value={buildingData.name}
                  onChange={(e) => setBuildingData({ ...buildingData, name: e.target.value })}
                  placeholder="M, K, L"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm font-bold">Floors</Label>
                <Input
                  type="number"
                  min="1"
                  value={buildingData.floors}
                  onChange={(e) => setBuildingData({ ...buildingData, floors: parseInt(e.target.value) || 1 })}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-bold">English Name</Label>
                <Input
                  value={buildingData.nameEn}
                  onChange={(e) => setBuildingData({ ...buildingData, nameEn: e.target.value })}
                  placeholder="Music Building"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm font-bold">Finnish Name</Label>
                <Input
                  value={buildingData.nameFi}
                  onChange={(e) => setBuildingData({ ...buildingData, nameFi: e.target.value })}
                  placeholder="Musiikkitalo"
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-bold">Position X</Label>
                <Input
                  type="number"
                  value={buildingData.mapPositionX}
                  onChange={(e) => setBuildingData({ ...buildingData, mapPositionX: parseInt(e.target.value) || 0 })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm font-bold">Position Y</Label>
                <Input
                  type="number"
                  value={buildingData.mapPositionY}
                  onChange={(e) => setBuildingData({ ...buildingData, mapPositionY: parseInt(e.target.value) || 0 })}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-bold">Width</Label>
                <Input
                  type="number"
                  min="50"
                  value={buildingData.width}
                  onChange={(e) => setBuildingData({ ...buildingData, width: parseInt(e.target.value) || 200 })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm font-bold">Height</Label>
                <Input
                  type="number"
                  min="50"
                  value={buildingData.height}
                  onChange={(e) => setBuildingData({ ...buildingData, height: parseInt(e.target.value) || 150 })}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label className="text-sm font-bold mb-2 block">Building Color</Label>
              <div className="grid grid-cols-4 gap-2">
                {colors.map((color) => (
                  <button
                    key={color.value}
                    className={`h-12 rounded-lg border-2 transition-all ${
                      buildingData.colorCode === color.value ? 'border-gray-900 scale-110 shadow-lg' : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: color.value }}
                    onClick={() => setBuildingData({ ...buildingData, colorCode: color.value })}
                    title={color.name}
                  />
                ))}
              </div>
            </div>

            <Button
              onClick={() => createBuildingMutation.mutate(buildingData)}
              disabled={!buildingData.name}
              className="w-full h-14 text-lg bg-green-600 hover:bg-green-700"
            >
              <Plus className="h-5 w-5 mr-2" />
              Create Building
            </Button>
          </CardContent>
        </Card>

        {/* Right: Building List */}
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-green-600 to-teal-600 text-white">
            <CardTitle className="flex items-center">
              <Building className="mr-2 h-6 w-6" />
              Existing Buildings ({buildings.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {buildings.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Building className="h-16 w-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg">No buildings yet</p>
                  <p className="text-sm">Create your first building!</p>
                </div>
              ) : (
                buildings.map((building: any) => (
                  <div
                    key={building.id}
                    className="border-2 rounded-lg p-4 hover:shadow-lg transition-shadow"
                    style={{ borderColor: building.colorCode }}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-bold text-xl">{building.name}</h4>
                        <p className="text-sm text-gray-600">{building.nameEn || building.nameFi}</p>
                        <div className="mt-2 text-xs text-gray-500 space-y-1">
                          <div>Position: ({building.mapPositionX}, {building.mapPositionY})</div>
                          <div>Floors: {building.floors}</div>
                        </div>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          if (confirm(`Delete ${building.name}?`)) {
                            deleteBuildingMutation.mutate(building.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
