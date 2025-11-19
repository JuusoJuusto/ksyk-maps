import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Square, 
  Trash2, 
  Save, 
  Undo, 
  Grid3x3,
  Move,
  MousePointer,
  Pencil,
  Circle,
  Minus
} from "lucide-react";

interface Point {
  x: number;
  y: number;
}

interface Shape {
  id: string;
  type: 'wall' | 'room' | 'hallway' | 'door';
  points: Point[];
  color: string;
  label?: string;
  closed?: boolean;
}

export default function AdvancedMapBuilder() {
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [currentShape, setCurrentShape] = useState<Point[]>([]);
  const [drawMode, setDrawMode] = useState<'wall' | 'room' | 'hallway' | 'door' | null>(null);
  const [selectedColor, setSelectedColor] = useState("#3B82F6");
  const [shapeLabel, setShapeLabel] = useState("");
  const [gridSize, setGridSize] = useState(20);
  const [showGrid, setShowGrid] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  const snapToGrid = (point: Point): Point => {
    if (!showGrid) return point;
    return {
      x: Math.round(point.x / gridSize) * gridSize,
      y: Math.round(point.y / gridSize) * gridSize
    };
  };

  const getSVGPoint = (e: React.MouseEvent<SVGSVGElement>): Point => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());
    return snapToGrid({ x: svgP.x, y: svgP.y });
  };

  const handleCanvasClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!drawMode || isDragging) return;
    
    const point = getSVGPoint(e);
    
    // Check if clicking near the first point to close the shape
    if (currentShape.length > 2) {
      const firstPoint = currentShape[0];
      const distance = Math.sqrt(
        Math.pow(point.x - firstPoint.x, 2) + Math.pow(point.y - firstPoint.y, 2)
      );
      
      if (distance < gridSize * 2) {
        // Close the shape
        finishShape(true);
        return;
      }
    }
    
    setCurrentShape([...currentShape, point]);
  };

  const finishShape = (closed: boolean = false) => {
    if (currentShape.length < 2) {
      setCurrentShape([]);
      return;
    }

    const newShape: Shape = {
      id: Date.now().toString(),
      type: drawMode!,
      points: currentShape,
      color: selectedColor,
      label: shapeLabel || `${drawMode} ${shapes.length + 1}`,
      closed
    };

    setShapes([...shapes, newShape]);
    setCurrentShape([]);
    setShapeLabel("");
  };

  const undoLastPoint = () => {
    if (currentShape.length > 0) {
      setCurrentShape(currentShape.slice(0, -1));
    }
  };

  const deleteShape = (id: string) => {
    setShapes(shapes.filter(s => s.id !== id));
  };

  const clearAll = () => {
    if (confirm("Clear all shapes?")) {
      setShapes([]);
      setCurrentShape([]);
    }
  };

  const exportShapes = () => {
    const data = JSON.stringify(shapes, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `campus-map-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    alert(`✅ Exported ${shapes.length} shapes to JSON file!`);
  };

  const importShapes = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        if (Array.isArray(imported)) {
          setShapes(imported);
          alert(`✅ Imported ${imported.length} shapes successfully!`);
        } else {
          alert('❌ Invalid file format');
        }
      } catch (error) {
        alert('❌ Failed to import file');
      }
    };
    reader.readAsText(file);
  };

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (drawMode) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isDragging && !drawMode) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const renderShape = (shape: Shape) => {
    if (shape.points.length < 2) return null;

    const pathData = shape.points.map((p, i) => 
      `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
    ).join(' ') + (shape.closed ? ' Z' : '');

    const strokeWidth = shape.type === 'wall' ? 4 : shape.type === 'door' ? 2 : 3;
    const fillOpacity = shape.closed ? 0.3 : 0;

    return (
      <g key={shape.id}>
        <path
          d={pathData}
          stroke={shape.color}
          strokeWidth={strokeWidth}
          fill={shape.color}
          fillOpacity={fillOpacity}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {shape.label && shape.points.length > 0 && (
          <text
            x={shape.points[0].x + 10}
            y={shape.points[0].y - 10}
            fill={shape.color}
            fontSize="12"
            fontWeight="bold"
          >
            {shape.label}
          </text>
        )}
        {/* Show points */}
        {shape.points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="3"
            fill={shape.color}
            stroke="white"
            strokeWidth="1"
          />
        ))}
      </g>
    );
  };

  const renderCurrentShape = () => {
    if (currentShape.length === 0) return null;

    return (
      <g>
        {/* Lines */}
        {currentShape.map((p, i) => {
          if (i === 0) return null;
          const prev = currentShape[i - 1];
          return (
            <line
              key={i}
              x1={prev.x}
              y1={prev.y}
              x2={p.x}
              y2={p.y}
              stroke={selectedColor}
              strokeWidth="3"
              strokeDasharray="5,5"
            />
          );
        })}
        {/* Points */}
        {currentShape.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="4"
            fill={selectedColor}
            stroke="white"
            strokeWidth="2"
          />
        ))}
        {/* First point indicator */}
        {currentShape.length > 0 && (
          <circle
            cx={currentShape[0].x}
            cy={currentShape[0].y}
            r="8"
            fill="none"
            stroke={selectedColor}
            strokeWidth="2"
            className="animate-pulse"
          />
        )}
      </g>
    );
  };

  const colors = [
    { name: "Blue", value: "#3B82F6" },
    { name: "Red", value: "#EF4444" },
    { name: "Green", value: "#10B981" },
    { name: "Purple", value: "#8B5CF6" },
    { name: "Orange", value: "#F97316" },
    { name: "Gray", value: "#6B7280" },
    { name: "Black", value: "#000000" },
    { name: "Brown", value: "#92400E" }
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full">
      {/* Toolbar */}
      <div className="lg:col-span-1 space-y-4">
        <Card>
          <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
            <CardTitle className="text-lg">Drawing Tools</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            {/* Draw Modes */}
            <div>
              <Label className="text-sm font-semibold mb-2 block">Draw Mode</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={drawMode === 'wall' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDrawMode(drawMode === 'wall' ? null : 'wall')}
                  className="w-full"
                >
                  <Minus className="h-4 w-4 mr-1" />
                  Wall
                </Button>
                <Button
                  variant={drawMode === 'room' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDrawMode(drawMode === 'room' ? null : 'room')}
                  className="w-full"
                >
                  <Square className="h-4 w-4 mr-1" />
                  Room
                </Button>
                <Button
                  variant={drawMode === 'hallway' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDrawMode(drawMode === 'hallway' ? null : 'hallway')}
                  className="w-full"
                >
                  <Move className="h-4 w-4 mr-1" />
                  Hallway
                </Button>
                <Button
                  variant={drawMode === 'door' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDrawMode(drawMode === 'door' ? null : 'door')}
                  className="w-full"
                >
                  <Circle className="h-4 w-4 mr-1" />
                  Door
                </Button>
              </div>
            </div>

            {/* Label Input */}
            {drawMode && (
              <div>
                <Label htmlFor="label" className="text-sm">Label (optional)</Label>
                <Input
                  id="label"
                  value={shapeLabel}
                  onChange={(e) => setShapeLabel(e.target.value)}
                  placeholder={`e.g., Room 101`}
                  className="mt-1"
                />
              </div>
            )}

            {/* Color Picker */}
            <div>
              <Label className="text-sm font-semibold mb-2 block">Color</Label>
              <div className="grid grid-cols-4 gap-2">
                {colors.map((color) => (
                  <button
                    key={color.value}
                    className={`w-10 h-10 rounded-lg border-2 transition-all ${
                      selectedColor === color.value 
                        ? 'border-gray-900 scale-110' 
                        : 'border-gray-300 hover:scale-105'
                    }`}
                    style={{ backgroundColor: color.value }}
                    onClick={() => setSelectedColor(color.value)}
                    title={color.name}
                  />
                ))}
              </div>
            </div>

            {/* Grid Settings */}
            <div>
              <Label className="text-sm font-semibold mb-2 block">Grid</Label>
              <div className="flex items-center space-x-2 mb-2">
                <input
                  type="checkbox"
                  checked={showGrid}
                  onChange={(e) => setShowGrid(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm">Show Grid</span>
              </div>
              <div className="flex items-center space-x-2">
                <Label className="text-xs">Size:</Label>
                <Input
                  type="number"
                  value={gridSize}
                  onChange={(e) => setGridSize(parseInt(e.target.value) || 20)}
                  min="10"
                  max="50"
                  className="w-20 h-8"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={undoLastPoint}
                disabled={currentShape.length === 0}
                className="w-full"
              >
                <Undo className="h-4 w-4 mr-2" />
                Undo Point
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => finishShape(false)}
                disabled={currentShape.length < 2}
                className="w-full"
              >
                <Save className="h-4 w-4 mr-2" />
                Finish Shape
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => finishShape(true)}
                disabled={currentShape.length < 3}
                className="w-full"
              >
                <Save className="h-4 w-4 mr-2" />
                Close Shape
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader className="bg-gray-800 text-white">
            <CardTitle className="text-sm">How to Use</CardTitle>
          </CardHeader>
          <CardContent className="p-4 text-xs space-y-2">
            <p>1. Select a draw mode (Wall, Room, Hallway, Door)</p>
            <p>2. Click on canvas to add points</p>
            <p>3. Click near first point to close shape</p>
            <p>4. Or click "Finish Shape" for open shapes</p>
            <p>5. Drag canvas when no mode is selected</p>
            <p>6. Export/Import your floor plans as JSON</p>
            <p className="text-blue-600 font-semibold pt-2">💡 Tip: Shapes snap to grid for precision!</p>
            <p className="text-green-600 font-semibold">✨ Save your work with Export!</p>
          </CardContent>
        </Card>
      </div>

      {/* Canvas */}
      <div className="lg:col-span-3 space-y-4">
        <Card>
          <CardHeader className="bg-gradient-to-r from-green-600 to-blue-600 text-white">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Canvas</CardTitle>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">{shapes.length} shapes</Badge>
                <label className="cursor-pointer inline-block">
                  <input
                    type="file"
                    accept=".json"
                    onChange={importShapes}
                    className="hidden"
                  />
                  <span className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3">
                    📥 Import
                  </span>
                </label>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={exportShapes}
                  disabled={shapes.length === 0}
                >
                  <Save className="h-4 w-4 mr-1" />
                  Export
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={clearAll}
                  disabled={shapes.length === 0}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Clear All
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="relative bg-gray-50 overflow-hidden" style={{ height: '600px' }}>
              {/* Status Bar */}
              <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur px-4 py-2 rounded-lg shadow-lg">
                <div className="text-sm font-semibold">
                  {drawMode ? (
                    <span className="text-blue-600">
                      Drawing: {drawMode} ({currentShape.length} points)
                    </span>
                  ) : (
                    <span className="text-gray-600">Pan Mode - Drag to move</span>
                  )}
                </div>
              </div>

              <svg
                ref={svgRef}
                viewBox="0 0 1000 600"
                className={`w-full h-full ${
                  drawMode ? 'cursor-crosshair' : isDragging ? 'cursor-grabbing' : 'cursor-grab'
                }`}
                onClick={handleCanvasClick}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                {/* Grid */}
                {showGrid && (
                  <defs>
                    <pattern id="smallGrid" width={gridSize} height={gridSize} patternUnits="userSpaceOnUse">
                      <path d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`} fill="none" stroke="#e5e7eb" strokeWidth="0.5"/>
                    </pattern>
                    <pattern id="grid" width={gridSize * 5} height={gridSize * 5} patternUnits="userSpaceOnUse">
                      <rect width={gridSize * 5} height={gridSize * 5} fill="url(#smallGrid)"/>
                      <path d={`M ${gridSize * 5} 0 L 0 0 0 ${gridSize * 5}`} fill="none" stroke="#d1d5db" strokeWidth="1"/>
                    </pattern>
                  </defs>
                )}
                <rect width="100%" height="100%" fill="white" />
                {showGrid && <rect width="100%" height="100%" fill="url(#grid)" />}

                {/* Rendered Shapes */}
                {shapes.map(renderShape)}

                {/* Current Shape Being Drawn */}
                {renderCurrentShape()}
              </svg>
            </div>
          </CardContent>
        </Card>

        {/* Shape List */}
        <Card>
          <CardHeader className="bg-gray-800 text-white">
            <CardTitle className="text-sm">Created Shapes ({shapes.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-32 overflow-y-auto">
              {shapes.map((shape) => (
                <div
                  key={shape.id}
                  className="flex items-center justify-between p-2 border rounded hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-2">
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: shape.color }}
                    />
                    <span className="text-xs font-medium truncate">{shape.label}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteShape(shape.id)}
                    className="h-6 w-6 p-0"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
