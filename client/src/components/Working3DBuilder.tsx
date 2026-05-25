/**
 * WORKING 3D BUILDER - ACTUALLY FUNCTIONAL
 * Real 3D visualization with working controls
 */

import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { parseBuildingShape, getShapeBounds } from "@/lib/mapGeometry";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KSYK_WING_PRESETS } from "@/lib/ksykWings";
import { useAppSettings } from "@/hooks/useAppSettings";
import { KSYK_BUILDING_OUTLINES, outlinesAs3DBuildings } from "@/lib/ksykCampusOutlines";
import { cn } from "@/lib/utils";
import {
  Box,
  Move,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Eye,
  Save,
  Download,
  Trash2,
  Grid3x3,
  Sun,
  Moon,
  Home,
  Building2,
  Layers,
  Play,
  Pause,
} from "lucide-react";

interface Building3D {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  depth: number;
  color: string;
  rotation: number;
}

interface Room3D {
  id: string;
  buildingId: string;
  name: string;
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  depth: number;
  color: string;
  floor: number;
}

type Working3DBuilderProps = { embedded?: boolean };

export default function Working3DBuilder({ embedded = false }: Working3DBuilderProps) {
  const queryClient = useQueryClient();
  const { settings } = useAppSettings();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [viewMode, setViewMode] = useState<"3d" | "2d" | "split">("3d");
  const [editMode, setEditMode] = useState<"select" | "move" | "rotate" | "scale">("select");
  const [selectedFloor, setSelectedFloor] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState({ x: 30, y: 45, z: 0 });
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [lightMode, setLightMode] = useState<"day" | "night">("day");
  const [showGrid, setShowGrid] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState<Building3D | null>(null);
  const [showAddBuilding, setShowAddBuilding] = useState(false);
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [showEditBuilding, setShowEditBuilding] = useState(false);
  
  // Form states
  const [newBuilding, setNewBuilding] = useState({
    name: "",
    nameEn: "",
    nameFi: "",
    floors: 3,
    x: 0,
    y: 0,
    z: 0,
    width: 100,
    height: 120,
    depth: 80,
    color: "#3B82F6",
  });

  const [newRoom, setNewRoom] = useState({
    buildingId: "",
    roomNumber: "",
    name: "",
    floor: 1,
    capacity: 30,
    type: "classroom",
  });
  
  // Fetch buildings from API
  const refreshMapData = () => {
    queryClient.invalidateQueries({ queryKey: ["buildings"] });
    queryClient.invalidateQueries({ queryKey: ["rooms"] });
  };

  const { data: buildings = [] } = useQuery({
    queryKey: ["buildings"],
    queryFn: async () => {
      const response = await fetch("/api/buildings", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch buildings");
      return response.json();
    },
  });

  const { data: rooms = [] } = useQuery({
    queryKey: ["rooms"],
    queryFn: async () => {
      const response = await fetch("/api/rooms", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch rooms");
      return response.json();
    },
  });

  const campusWings3D = useMemo(
    () =>
      outlinesAs3DBuildings().map((b) => ({
        ...b,
        rotation: 0,
      })),
    []
  );

  const apiBuildings3D: Building3D[] = buildings.map((b: any, i: number) => {
    const shape = parseBuildingShape(b);
    const bounds = getShapeBounds(shape);
    const mapX = b.mapPositionX ?? bounds.minX;
    const mapY = b.mapPositionY ?? bounds.minY;
    return {
      id: b.id,
      name: b.name || b.nameEn || `Building ${i + 1}`,
      x: mapX - 200,
      y: 0,
      z: mapY - 200,
      width: Math.max(bounds.width, 80),
      height: Math.max((b.floors || 3) * 40, 60),
      depth: Math.max(bounds.height, 60),
      color: b.colorCode?.startsWith("#") ? b.colorCode : "#2563eb",
      rotation: 0,
    };
  });

  const buildings3D = embedded ? campusWings3D : apiBuildings3D;

  useEffect(() => {
    if (settings.threeDAutoRotate) setIsAnimating(true);
  }, [settings.threeDAutoRotate]);

  // Animation loop
  useEffect(() => {
    if (!isAnimating) return;
    const speed = settings.threeDQuality === "low" ? 80 : settings.threeDQuality === "medium" ? 60 : 40;
    const interval = setInterval(() => {
      setRotation((prev) => ({ ...prev, y: (prev.y + 1) % 360 }));
    }, speed);
    return () => clearInterval(interval);
  }, [isAnimating, settings.threeDQuality]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, settings.threeDQuality === "high" ? 2 : 1.5);
      canvas.width = Math.floor(canvas.offsetWidth * dpr);
      canvas.height = Math.floor(canvas.offsetHeight * dpr);
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [settings.threeDQuality, embedded]);

  // Render 3D scene
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, settings.threeDQuality === "high" ? 2 : 1.5);
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;
    if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    const drawW = w;
    const drawH = h;

    const grad = ctx.createLinearGradient(0, 0, drawW, drawH);
    if (embedded) {
      if (lightMode === "day") {
        grad.addColorStop(0, "#dbeafe");
        grad.addColorStop(0.45, "#f0f9ff");
        grad.addColorStop(1, "#e2e8f0");
      } else {
        grad.addColorStop(0, "#0c1222");
        grad.addColorStop(0.5, "#111827");
        grad.addColorStop(1, "#0f172a");
      }
    } else if (lightMode === "day") {
      grad.addColorStop(0, "#e0f2fe");
      grad.addColorStop(0.5, "#f8fafc");
      grad.addColorStop(1, "#e2e8f0");
    } else {
      grad.addColorStop(0, "#0f172a");
      grad.addColorStop(0.5, "#1e293b");
      grad.addColorStop(1, "#0f1419");
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, drawW, drawH);

    const centerX = drawW / 2 + pan.x;
    const centerY = drawH / 2 + pan.y;
    const scale = embedded ? 0.42 : 1;

    // Draw grid
    if (showGrid && (!embedded || settings.devShowDebug)) {
      ctx.strokeStyle = lightMode === "day" ? "#cbd5e0" : "#2d3748";
      ctx.lineWidth = 1;
      
      const gridSize = 50 * zoom;
      const gridCount = 20;
      
      for (let i = -gridCount; i <= gridCount; i++) {
        // Horizontal lines
        ctx.beginPath();
        ctx.moveTo(centerX - gridCount * gridSize, centerY + i * gridSize);
        ctx.lineTo(centerX + gridCount * gridSize, centerY + i * gridSize);
        ctx.stroke();
        
        // Vertical lines
        ctx.beginPath();
        ctx.moveTo(centerX + i * gridSize, centerY - gridCount * gridSize);
        ctx.lineTo(centerX + i * gridSize, centerY + gridCount * gridSize);
        ctx.stroke();
      }
    }

    if (!embedded) {
      const axisLength = 100;
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(centerX + axisLength, centerY);
      ctx.stroke();
      ctx.fillStyle = "#ef4444";
      ctx.font = "bold 14px sans-serif";
      ctx.fillText("X", centerX + axisLength + 10, centerY);

      ctx.strokeStyle = "#10b981";
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(centerX, centerY - axisLength);
      ctx.stroke();
      ctx.fillStyle = "#10b981";
      ctx.fillText("Y", centerX, centerY - axisLength - 10);

      ctx.strokeStyle = "#3b82f6";
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      const zX = centerX - axisLength * 0.7;
      const zY = centerY + axisLength * 0.7;
      ctx.lineTo(zX, zY);
      ctx.stroke();
      ctx.fillStyle = "#3b82f6";
      ctx.fillText("Z", zX - 20, zY + 10);
    }

    // Draw buildings in 3D
    buildings3D.forEach((building) => {
      // Apply transformations
      const radY = (rotation.y * Math.PI) / 180;
      const radX = (rotation.x * Math.PI) / 180;

      // 3D to 2D projection (isometric)
      const project = (x: number, y: number, z: number) => {
        // Rotate around Y axis
        const rotatedX = x * Math.cos(radY) - z * Math.sin(radY);
        const rotatedZ = x * Math.sin(radY) + z * Math.cos(radY);
        
        // Rotate around X axis
        const rotatedY = y * Math.cos(radX) - rotatedZ * Math.sin(radX);
        const finalZ = y * Math.sin(radX) + rotatedZ * Math.cos(radX);

        const screenX = centerX + (rotatedX - finalZ * 0.5) * zoom * scale;
        const screenY = centerY - rotatedY * zoom * scale + finalZ * 0.25 * zoom * scale;

        return { x: screenX, y: screenY, z: finalZ };
      };

      const bx = building.x * scale;
      const by = building.y;
      const bz = building.z * scale;
      const bw = building.width * scale;
      const bh = building.height * (embedded ? 1.1 : 1);
      const bd = building.depth * scale;

      const corners = [
        project(bx, by, bz),
        project(bx + bw, by, bz),
        project(bx + bw, by, bz + bd),
        project(bx, by, bz + bd),
        project(bx, by + bh, bz),
        project(bx + bw, by + bh, bz),
        project(bx + bw, by + bh, bz + bd),
        project(bx, by + bh, bz + bd),
      ];

      const rgb = hexToRgb(building.color || "#2563eb");
      const faces: { indices: number[]; shade: number }[] = [
        { indices: [0, 1, 2, 3], shade: 0.35 },
        { indices: [4, 5, 6, 7], shade: 1 },
        { indices: [0, 1, 5, 4], shade: 0.72 },
        { indices: [1, 2, 6, 5], shade: 0.58 },
        { indices: [2, 3, 7, 6], shade: 0.48 },
        { indices: [3, 0, 4, 7], shade: 0.65 },
      ];
      const sortedFaces = [...faces].sort((a, b) => {
        const az =
          a.indices.reduce((s, i) => s + corners[i].z, 0) / a.indices.length;
        const bz =
          b.indices.reduce((s, i) => s + corners[i].z, 0) / b.indices.length;
        return az - bz;
      });

      sortedFaces.forEach(({ indices, shade }) => {
        ctx.beginPath();
        ctx.moveTo(corners[indices[0]].x, corners[indices[0]].y);
        indices.slice(1).forEach((i) => ctx.lineTo(corners[i].x, corners[i].y));
        ctx.closePath();
        ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${embedded ? 0.22 * shade : 0.18 * shade})`;
        ctx.fill();
      });

      const edgePairs: [number, number][] = [
        [0, 1], [1, 2], [2, 3], [3, 0],
        [4, 5], [5, 6], [6, 7], [7, 4],
        [0, 4], [1, 5], [2, 6], [3, 7],
      ];
      if (settings.threeDShadows && settings.threeDQuality !== "low") {
        const base = [corners[0], corners[1], corners[2], corners[3]];
        ctx.beginPath();
        ctx.moveTo(base[0].x + 8, base[0].y + 8);
        base.forEach((c, i) => {
          if (i > 0) ctx.lineTo(c.x + 8, c.y + 8);
        });
        ctx.closePath();
        ctx.fillStyle = embedded ? "rgba(0,0,0,0.08)" : "rgba(0,0,0,0.12)";
        ctx.fill();
      }

      ctx.strokeStyle = building.color || "#2563eb";
      ctx.lineWidth = embedded ? 2.5 : settings.threeDQuality === "high" ? 2.5 : 2;
      edgePairs.forEach(([a, b]) => {
        ctx.beginPath();
        ctx.moveTo(corners[a].x, corners[a].y);
        ctx.lineTo(corners[b].x, corners[b].y);
        ctx.stroke();
      });

      const labelPos = project(
        bx + bw / 2,
        by + bh + (embedded ? 8 : 20),
        bz + bd / 2
      );
      if (embedded || settings.showWingLabels) {
        const labelSize = embedded ? 15 : 12;
        ctx.fillStyle = lightMode === "day" ? "#0f172a" : "#f8fafc";
        ctx.font = `bold ${labelSize}px system-ui, sans-serif`;
        ctx.textAlign = "center";
        if (embedded) {
          ctx.strokeStyle = lightMode === "day" ? "#fff" : "#0f172a";
          ctx.lineWidth = 4;
          ctx.strokeText(building.name, labelPos.x, labelPos.y);
        }
        ctx.fillText(building.name, labelPos.x, labelPos.y);
      }
    });

    if (!embedded) {
      ctx.fillStyle = lightMode === "day" ? "#2d3748" : "#f7fafc";
      ctx.font = "bold 16px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`Floor: ${selectedFloor}`, 20, 30);
      ctx.fillText(`Zoom: ${(zoom * 100).toFixed(0)}%`, 20, 55);
      ctx.fillText(`Rotation: ${rotation.y.toFixed(0)}°`, 20, 80);
    }

  }, [buildings3D, zoom, rotation, pan, lightMode, showGrid, selectedFloor, viewMode, settings.threeDShadows, settings.threeDQuality, embedded]);

  const embeddedControls = (
    <div className="absolute bottom-[max(5rem,calc(0.75rem+env(safe-area-inset-bottom)))] sm:bottom-4 left-3 right-3 sm:left-4 sm:right-4 flex flex-wrap items-center justify-between gap-2 z-10 pointer-events-none">
      <div className="pointer-events-auto flex gap-1.5 p-1.5 rounded-2xl bg-white/90 dark:bg-gray-900/90 shadow-2xl backdrop-blur-xl">
        <Button variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={() => setZoom((z) => Math.min(3, z + 0.15))}>
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={() => setZoom((z) => Math.max(0.5, z - 0.15))}>
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={() => setRotation({ x: 30, y: 45, z: 0 })}>
          <Home className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={() => setIsAnimating((a) => !a)}>
          {isAnimating ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        <Button variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={() => setLightMode(lightMode === "day" ? "night" : "day")}>
          {lightMode === "day" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </Button>
      </div>
      {settings.devShowDebug && (
        <span className="pointer-events-none text-xs font-mono px-2 py-1 rounded-lg bg-black/50 text-white">
          {buildings3D.length} wings · zoom {(zoom * 100).toFixed(0)}%
        </span>
      )}
    </div>
  );

  // Helper function
  const hexToRgb = (color: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color);
    if (result) {
      return {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      };
    }
    return { r: 37, g: 99, b: 235 };
  };

  // Handle add building
  const quickAddWing = async (letter: string, nameEn: string, nameFi: string, color: string, floors: number) => {
    const offset = buildings3D.length * 140;
    try {
      const response = await fetch("/api/buildings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: letter,
          nameEn,
          nameFi,
          floors,
          mapPositionX: 200 + offset,
          mapPositionY: 200 + (offset % 3) * 80,
          colorCode: color,
          isActive: true,
          description: JSON.stringify({
            customShape: [
              { x: 200 + offset, y: 200 },
              { x: 320 + offset, y: 200 },
              { x: 320 + offset, y: 320 },
              { x: 200 + offset, y: 320 },
            ],
          }),
        }),
      });
      if (!response.ok) throw new Error("Failed");
      refreshMapData();
    } catch {
      alert(`Could not add wing ${letter}`);
    }
  };

  const handleAddBuilding = async () => {
    try {
      const response = await fetch("/api/buildings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: newBuilding.name,
          nameEn: newBuilding.nameEn,
          nameFi: newBuilding.nameFi,
          floors: newBuilding.floors,
          mapPositionX: newBuilding.x + 200,
          mapPositionY: newBuilding.z + 200,
          colorCode: newBuilding.color,
          isActive: true,
        }),
      });

      if (!response.ok) throw new Error("Failed to create building");

      // Reset form and close modal
      setNewBuilding({
        name: "",
        nameEn: "",
        nameFi: "",
        floors: 3,
        x: 0,
        y: 0,
        z: 0,
        width: 100,
        height: 120,
        depth: 80,
        color: "#3B82F6",
      });
      setShowAddBuilding(false);
      refreshMapData();
    } catch (error) {
      console.error("Error adding building:", error);
      alert("Failed to add building");
    }
  };

  // Handle update building
  const handleUpdateBuilding = async () => {
    if (!selectedBuilding) return;

    try {
      const response = await fetch(`/api/buildings/${selectedBuilding.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: selectedBuilding.name,
          mapPositionX: selectedBuilding.x + 200,
          mapPositionY: selectedBuilding.z + 200,
          colorCode: selectedBuilding.color,
          floors: Math.floor(selectedBuilding.height / 40),
        }),
      });

      if (!response.ok) throw new Error("Failed to update building");

      setShowEditBuilding(false);
      refreshMapData();
    } catch (error) {
      console.error("Error updating building:", error);
      alert("Failed to update building");
    }
  };

  // Handle delete building
  const handleDeleteBuilding = async () => {
    if (!selectedBuilding) return;
    
    if (!confirm(`Delete building "${selectedBuilding.name}"? This will also delete all rooms in this building.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/buildings/${selectedBuilding.id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) throw new Error("Failed to delete building");

      setSelectedBuilding(null);
      setShowEditBuilding(false);
      refreshMapData();
    } catch (error) {
      console.error("Error deleting building:", error);
      alert("Failed to delete building");
    }
  };

  // Handle add room
  const handleAddRoom = async () => {
    try {
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          buildingId: newRoom.buildingId,
          roomNumber: newRoom.roomNumber,
          name: newRoom.name,
          floor: newRoom.floor,
          capacity: newRoom.capacity,
          type: newRoom.type,
          isActive: true,
          isPublic: true,
        }),
      });

      if (!response.ok) throw new Error("Failed to create room");

      // Reset form and close modal
      setNewRoom({
        buildingId: "",
        roomNumber: "",
        name: "",
        floor: 1,
        capacity: 30,
        type: "classroom",
      });
      setShowAddRoom(false);
      refreshMapData();
    } catch (error) {
      console.error("Error adding room:", error);
      alert("Failed to add room");
    }
  };

  if (embedded) {
    return (
      <div className="h-full relative bg-slate-100 dark:bg-gray-950">
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-grab active:cursor-grabbing"
          onMouseDown={(e) => {
            const startX = e.clientX;
            const startY = e.clientY;
            const startPan = { ...pan };
            const handleMouseMove = (ev: MouseEvent) => {
              setPan({ x: startPan.x + (ev.clientX - startX), y: startPan.y + (ev.clientY - startY) });
            };
            const handleMouseUp = () => {
              document.removeEventListener("mousemove", handleMouseMove);
              document.removeEventListener("mouseup", handleMouseUp);
            };
            document.addEventListener("mousemove", handleMouseMove);
            document.addEventListener("mouseup", handleMouseUp);
          }}
          onWheel={(e) => {
            e.preventDefault();
            setZoom((z) => Math.min(3, Math.max(0.4, z + (e.deltaY > 0 ? -0.08 : 0.08))));
          }}
        />
        {embeddedControls}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-100 dark:bg-gray-900">
      {/* Top Toolbar */}
      <div className="bg-white dark:bg-gray-800 border-b shadow-sm p-3 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Box className="w-6 h-6 text-blue-600" />
          <h1 className="text-xl font-bold">KSYK 3D Campus Builder</h1>
          <span className="text-xs text-gray-500 hidden sm:inline">
            {buildings.length} wings · {rooms.length} rooms
          </span>
        </div>

        {/* View Mode */}
        <div className="flex gap-2">
          <Button
            variant={viewMode === "3d" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("3d")}
          >
            <Box className="w-4 h-4 mr-2" />
            3D
          </Button>
          <Button
            variant={viewMode === "2d" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("2d")}
          >
            <Layers className="w-4 h-4 mr-2" />
            2D
          </Button>
        </div>

        {/* Controls */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowAddBuilding(true)}>
            <Building2 className="w-4 h-4 mr-2" />
            Add Building
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowAddRoom(true)}>
            <Layers className="w-4 h-4 mr-2" />
            Add Room
          </Button>
          <Button variant="outline" size="sm" onClick={() => setZoom(z => Math.min(3, z + 0.2))}>
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setZoom(z => Math.max(0.5, z - 0.2))}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAnimating(!isAnimating)}
          >
            {isAnimating ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLightMode(lightMode === "day" ? "night" : "day")}
          >
            {lightMode === "day" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowGrid(!showGrid)}
          >
            <Grid3x3 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-gray-800 border-b px-3 py-2 flex flex-wrap gap-2 items-center">
        <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 mr-1">Quick add wing:</span>
        {KSYK_WING_PRESETS.map((w) => (
          <Button
            key={w.letter}
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs font-bold"
            style={{ borderColor: w.color, color: w.color }}
            onClick={() => quickAddWing(w.letter, w.nameEn, w.nameFi, w.color, w.floors)}
          >
            {w.letter}
          </Button>
        ))}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Canvas */}
        <div className="flex-1 relative">
          <canvas
            ref={canvasRef}
            className="w-full h-full cursor-move"
            onMouseDown={(e) => {
              const startX = e.clientX;
              const startY = e.clientY;
              const startPan = { ...pan };

              const handleMouseMove = (e: MouseEvent) => {
                setPan({
                  x: startPan.x + (e.clientX - startX),
                  y: startPan.y + (e.clientY - startY),
                });
              };

              const handleMouseUp = () => {
                document.removeEventListener("mousemove", handleMouseMove);
                document.removeEventListener("mouseup", handleMouseUp);
              };

              document.addEventListener("mousemove", handleMouseMove);
              document.addEventListener("mouseup", handleMouseUp);
            }}
            onWheel={(e) => {
              e.preventDefault();
              const delta = e.deltaY > 0 ? -0.1 : 0.1;
              setZoom(z => Math.max(0.5, Math.min(3, z + delta)));
            }}
          />

          {/* Floating Controls */}
          <div className="absolute bottom-4 left-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 space-y-3">
            <div>
              <Label className="text-xs">Rotation Y: {rotation.y.toFixed(0)}°</Label>
              <Slider
                value={[rotation.y]}
                onValueChange={([value]) => setRotation(r => ({ ...r, y: value }))}
                min={0}
                max={360}
                step={1}
                className="w-48"
              />
            </div>
            <div>
              <Label className="text-xs">Rotation X: {rotation.x.toFixed(0)}°</Label>
              <Slider
                value={[rotation.x]}
                onValueChange={([value]) => setRotation(r => ({ ...r, x: value }))}
                min={0}
                max={90}
                step={1}
                className="w-48"
              />
            </div>
            <div>
              <Label className="text-xs">Floor: {selectedFloor}</Label>
              <Slider
                value={[selectedFloor]}
                onValueChange={([value]) => setSelectedFloor(value)}
                min={0}
                max={3}
                step={1}
                className="w-48"
              />
            </div>
          </div>
        </div>

        {/* Right Sidebar - Building List */}
        <div className="w-64 bg-white dark:bg-gray-800 border-l p-4 overflow-y-auto">
          <h3 className="font-bold mb-4">Buildings ({buildings3D.length})</h3>
          <div className="space-y-2">
            {buildings3D.map((building) => (
              <Card
                key={building.id}
                className={`cursor-pointer transition-all ${
                  selectedBuilding?.id === building.id ? "ring-2 ring-blue-500" : ""
                }`}
                onClick={() => setSelectedBuilding(building)}
                onDoubleClick={() => {
                  setSelectedBuilding(building);
                  setShowEditBuilding(true);
                }}
              >
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: building.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{building.name}</p>
                      <p className="text-xs text-gray-500">
                        {building.width}x{building.depth}x{building.height}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {selectedBuilding && (
            <div className="mt-4 pt-4 border-t">
              <h4 className="font-semibold mb-2">Selected Building</h4>
              <p className="text-sm mb-2">{selectedBuilding.name}</p>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setShowEditBuilding(true)}
                >
                  Edit Properties
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full"
                  onClick={handleDeleteBuilding}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Building Modal */}
      {showAddBuilding && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold mb-4">Add New Building</h3>
              <div className="space-y-4">
                <div>
                  <Label>Building Name</Label>
                  <Input
                    value={newBuilding.name}
                    onChange={(e) => setNewBuilding({ ...newBuilding, name: e.target.value })}
                    placeholder="e.g., Main Building"
                  />
                </div>
                <div>
                  <Label>English Name</Label>
                  <Input
                    value={newBuilding.nameEn}
                    onChange={(e) => setNewBuilding({ ...newBuilding, nameEn: e.target.value })}
                    placeholder="e.g., Main Building"
                  />
                </div>
                <div>
                  <Label>Finnish Name</Label>
                  <Input
                    value={newBuilding.nameFi}
                    onChange={(e) => setNewBuilding({ ...newBuilding, nameFi: e.target.value })}
                    placeholder="e.g., Päärakennus"
                  />
                </div>
                <div>
                  <Label>Number of Floors</Label>
                  <Input
                    type="number"
                    value={newBuilding.floors}
                    onChange={(e) => setNewBuilding({ ...newBuilding, floors: parseInt(e.target.value) || 1 })}
                    min="1"
                    max="10"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label>X Position</Label>
                    <Input
                      type="number"
                      value={newBuilding.x}
                      onChange={(e) => setNewBuilding({ ...newBuilding, x: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label>Y Position</Label>
                    <Input
                      type="number"
                      value={newBuilding.y}
                      onChange={(e) => setNewBuilding({ ...newBuilding, y: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label>Z Position</Label>
                    <Input
                      type="number"
                      value={newBuilding.z}
                      onChange={(e) => setNewBuilding({ ...newBuilding, z: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label>Width</Label>
                    <Input
                      type="number"
                      value={newBuilding.width}
                      onChange={(e) => setNewBuilding({ ...newBuilding, width: parseInt(e.target.value) || 100 })}
                    />
                  </div>
                  <div>
                    <Label>Height</Label>
                    <Input
                      type="number"
                      value={newBuilding.height}
                      onChange={(e) => setNewBuilding({ ...newBuilding, height: parseInt(e.target.value) || 120 })}
                    />
                  </div>
                  <div>
                    <Label>Depth</Label>
                    <Input
                      type="number"
                      value={newBuilding.depth}
                      onChange={(e) => setNewBuilding({ ...newBuilding, depth: parseInt(e.target.value) || 80 })}
                    />
                  </div>
                </div>
                <div>
                  <Label>Color</Label>
                  <Input
                    type="color"
                    value={newBuilding.color}
                    onChange={(e) => setNewBuilding({ ...newBuilding, color: e.target.value })}
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <Button onClick={handleAddBuilding} className="flex-1">
                    <Save className="w-4 h-4 mr-2" />
                    Create Building
                  </Button>
                  <Button variant="outline" onClick={() => setShowAddBuilding(false)} className="flex-1">
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Building Modal */}
      {showEditBuilding && selectedBuilding && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold mb-4">Edit Building</h3>
              <div className="space-y-4">
                <div>
                  <Label>Building Name</Label>
                  <Input
                    value={selectedBuilding.name}
                    onChange={(e) => setSelectedBuilding({ ...selectedBuilding, name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label>X Position</Label>
                    <Input
                      type="number"
                      value={selectedBuilding.x}
                      onChange={(e) => setSelectedBuilding({ ...selectedBuilding, x: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label>Y Position</Label>
                    <Input
                      type="number"
                      value={selectedBuilding.y}
                      onChange={(e) => setSelectedBuilding({ ...selectedBuilding, y: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label>Z Position</Label>
                    <Input
                      type="number"
                      value={selectedBuilding.z}
                      onChange={(e) => setSelectedBuilding({ ...selectedBuilding, z: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <div>
                  <Label>Color</Label>
                  <Input
                    type="color"
                    value={selectedBuilding.color}
                    onChange={(e) => setSelectedBuilding({ ...selectedBuilding, color: e.target.value })}
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <Button onClick={handleUpdateBuilding} className="flex-1">
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </Button>
                  <Button variant="outline" onClick={() => setShowEditBuilding(false)} className="flex-1">
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add Room Modal */}
      {showAddRoom && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold mb-4">Add New Room</h3>
              <div className="space-y-4">
                <div>
                  <Label>Building</Label>
                  <select
                    className="w-full border rounded-lg px-3 py-2"
                    value={newRoom.buildingId}
                    onChange={(e) => setNewRoom({ ...newRoom, buildingId: e.target.value })}
                  >
                    <option value="">Select Building</option>
                    {buildings.map((b: any) => (
                      <option key={b.id} value={b.id}>
                        {b.name || b.nameEn}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Room Number</Label>
                  <Input
                    value={newRoom.roomNumber}
                    onChange={(e) => setNewRoom({ ...newRoom, roomNumber: e.target.value })}
                    placeholder="e.g., A101"
                  />
                </div>
                <div>
                  <Label>Room Name</Label>
                  <Input
                    value={newRoom.name}
                    onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })}
                    placeholder="e.g., Computer Lab"
                  />
                </div>
                <div>
                  <Label>Floor</Label>
                  <Input
                    type="number"
                    value={newRoom.floor}
                    onChange={(e) => setNewRoom({ ...newRoom, floor: parseInt(e.target.value) || 1 })}
                    min="0"
                    max="10"
                  />
                </div>
                <div>
                  <Label>Capacity</Label>
                  <Input
                    type="number"
                    value={newRoom.capacity}
                    onChange={(e) => setNewRoom({ ...newRoom, capacity: parseInt(e.target.value) || 1 })}
                    min="1"
                  />
                </div>
                <div>
                  <Label>Room Type</Label>
                  <select
                    className="w-full border rounded-lg px-3 py-2"
                    value={newRoom.type}
                    onChange={(e) => setNewRoom({ ...newRoom, type: e.target.value })}
                  >
                    <option value="classroom">Classroom</option>
                    <option value="lab">Laboratory</option>
                    <option value="office">Office</option>
                    <option value="meeting">Meeting Room</option>
                    <option value="studio">Studio</option>
                    <option value="gymnasium">Gymnasium</option>
                    <option value="library">Library</option>
                  </select>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button onClick={handleAddRoom} className="flex-1">
                    <Save className="w-4 h-4 mr-2" />
                    Create Room
                  </Button>
                  <Button variant="outline" onClick={() => setShowAddRoom(false)} className="flex-1">
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
