import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building, Plus, Trash2, Save, Undo } from "lucide-react";

interface Point {
  x: number;
  y: number;
}

interface BuildingOutline {
  id: string;
  name: string;
  floor: number;
  points: Point[];
  color: string;
}

export default function BuildingOutlineEditor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [buildings, setBuildings] = useState<BuildingOutline[]>([]);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [buildingName, setBuildingName] = useState("");
  const [floor, setFloor] = useState(1);
  const [selectedColor, setSelectedColor] = useState("#3B82F6");

  const colors = [
    { name: "Blue", value: "#3B82F6" },
    { name: "Green", value: "#10B981" },
    { name: "Orange", value: "#F59E0B" },
    { name: "Purple", value: "#8B5CF6" },
    { name: "Red", value: "#EF4444" },
    { name: "Pink", value: "#EC4899" },
  ];

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newPoint = { x, y };
    setCurrentPoints([...currentPoints, newPoint]);
    setIsDrawing(true);

    // Redraw canvas
    drawCanvas([...currentPoints, newPoint]);
  };

  const drawCanvas = (points: Point[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw existing buildings
    buildings.forEach((building) => {
      if (building.points.length > 0) {
        ctx.beginPath();
        ctx.moveTo(building.points[0].x, building.points[0].y);
        building.points.forEach((point) => {
          ctx.lineTo(point.x, point.y);
        });
        ctx.closePath();
        ctx.strokeStyle = building.color;
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.fillStyle = building.color + "20";
        ctx.fill();

        // Draw building label
        const centerX = building.points.reduce((sum, p) => sum + p.x, 0) / building.points.length;
        const centerY = building.points.reduce((sum, p) => sum + p.y, 0) / building.points.length;
        ctx.fillStyle = building.color;
        ctx.font = "bold 16px Arial";
        ctx.textAlign = "center";
        ctx.fillText(`${building.name} - Floor ${building.floor}`, centerX, centerY);
      }
    });

    // Draw current points
    if (points.length > 0) {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      points.forEach((point) => {
        ctx.lineTo(point.x, point.y);
      });
      ctx.strokeStyle = selectedColor;
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 5]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw points
      points.forEach((point) => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = selectedColor;
        ctx.fill();
      });
    }
  };

  const finishBuilding = () => {
    if (currentPoints.length < 3) {
      alert("Please add at least 3 points to create a building outline");
      return;
    }

    if (!buildingName.trim()) {
      alert("Please enter a building name");
      return;
    }

    const newBuilding: BuildingOutline = {
      id: `building-${Date.now()}`,
      name: buildingName,
      floor: floor,
      points: currentPoints,
      color: selectedColor,
    };

    setBuildings([...buildings, newBuilding]);
    setCurrentPoints([]);
    setIsDrawing(false);
    setBuildingName("");
    setFloor(floor + 1);

    // Redraw canvas
    setTimeout(() => drawCanvas([]), 0);
  };

  const undoLastPoint = () => {
    if (currentPoints.length > 0) {
      const newPoints = currentPoints.slice(0, -1);
      setCurrentPoints(newPoints);
      drawCanvas(newPoints);
    }
  };

  const cancelDrawing = () => {
    setCurrentPoints([]);
    setIsDrawing(false);
    drawCanvas([]);
  };

  const deleteBuilding = (id: string) => {
    setBuildings(buildings.filter((b) => b.id !== id));
    setTimeout(() => drawCanvas(currentPoints), 0);
  };

  const saveBuildings = () => {
    console.log("Saving buildings:", buildings);
    alert(`Saved ${buildings.length} building outlines!`);
    // TODO: Send to backend
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b p-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building className="h-6 w-6" />
            Building Outline Editor
          </h1>
          <p className="text-sm text-gray-600">Click on canvas to draw building outlines</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={saveBuildings} disabled={buildings.length === 0}>
            <Save className="h-4 w-4 mr-2" />
            Save All ({buildings.length})
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-80 bg-white border-r p-4 overflow-y-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Current Building</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="buildingName">Building Name *</Label>
                <Input
                  id="buildingName"
                  placeholder="e.g., Floor 1, Floor 2"
                  value={buildingName}
                  onChange={(e) => setBuildingName(e.target.value)}
                  disabled={isDrawing}
                />
              </div>

              <div>
                <Label htmlFor="floor">Floor Number</Label>
                <Input
                  id="floor"
                  type="number"
                  min="1"
                  max="10"
                  value={floor}
                  onChange={(e) => setFloor(parseInt(e.target.value))}
                  disabled={isDrawing}
                />
              </div>

              <div>
                <Label>Outline Color</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {colors.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setSelectedColor(color.value)}
                      disabled={isDrawing}
                      className={`h-10 rounded border-2 ${
                        selectedColor === color.value ? "border-black" : "border-gray-300"
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              {isDrawing && (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">
                    Points: {currentPoints.length}
                  </p>
                  <div className="flex gap-2">
                    <Button onClick={undoLastPoint} variant="outline" size="sm" className="flex-1">
                      <Undo className="h-4 w-4 mr-1" />
                      Undo
                    </Button>
                    <Button onClick={cancelDrawing} variant="outline" size="sm" className="flex-1">
                      Cancel
                    </Button>
                  </div>
                  <Button onClick={finishBuilding} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Finish Building
                  </Button>
                </div>
              )}

              {!isDrawing && (
                <Button
                  onClick={() => setIsDrawing(true)}
                  className="w-full"
                  disabled={!buildingName.trim()}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Start Drawing
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Buildings List */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-lg">Buildings ({buildings.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {buildings.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  No buildings yet
                </p>
              ) : (
                <div className="space-y-2">
                  {buildings.map((building) => (
                    <div
                      key={building.id}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: building.color }}
                        />
                        <div>
                          <p className="font-semibold text-sm">{building.name}</p>
                          <p className="text-xs text-gray-600">
                            Floor {building.floor} • {building.points.length} points
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteBuilding(building.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Canvas */}
        <div className="flex-1 p-4 overflow-auto bg-gray-100">
          <canvas
            ref={canvasRef}
            width={1200}
            height={800}
            onClick={handleCanvasClick}
            className="bg-white border-2 border-gray-300 rounded-lg shadow-lg cursor-crosshair"
          />
          {isDrawing && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                <strong>Drawing Mode:</strong> Click on the canvas to add points for the building outline.
                When done, click "Finish Building" to complete.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
