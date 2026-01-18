import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Building, Home, Plus, Trash2, MousePointer, Check, X, Undo, Square, Move } from "lucide-react";

interface Point { x: number; y: number; }

export default function ProfessionalKSYKBuilder() {
  const queryClient = useQueryClient();
  const svgRef = useRef<SVGSVGElement>(null);
  const [buildMode, setBuildMode] = useState<'building' | 'room' | 'stairway'>('building');
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [gridSize] = useState(50);
  const [shapeMode, setShapeMode] = useState<'custom' | 'rectangle'>('rectangle');
  const [rectStart, setRectStart] = useState<Point | null>(null);
  const [rectEnd, setRectEnd] = useState<Point | null>(null);
  
  const [buildingData, setBuildingData] = useState({
    name: "", nameEn: "", nameFi: "", floors: [1] as number[],
    capacity: 100, colorCode: "#3B82F6", mapPositionX: 0, mapPositionY: 0
  });

  const [roomData, setRoomData] = useState({
    buildingId: "", roomNumber: "", name: "", nameEn: "", nameFi: "",
    floor: 1, capacity: 30, type: "classroom"
  });

  const { data: buildings = [] } = useQuery({
    queryKey: ["buildings"],
    queryFn: async () => {
      const response = await fetch("/api/buildings");
      if (!response.ok) throw new Error("Failed to fetch buildings");
      return response.json();
    },
  });

  const { data: rooms = [] } = useQuery({
    queryKey: ["rooms"],
    queryFn: async () => {
      const response = await fetch("/api/rooms");
      if (!response.ok) throw new Error("Failed to fetch rooms");
      return response.json();
    },
  });

  const snapToGrid = (point: Point): Point => ({
    x: Math.round(point.x / gridSize) * gridSize,
    y: Math.round(point.y / gridSize) * gridSize
  });
