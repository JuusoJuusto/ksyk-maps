import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import AnnouncementManager from "@/components/AnnouncementManager";
import ImprovedKSYKBuilder from "@/components/ImprovedKSYKBuilder";
import MapSettingsPanel from "@/components/MapSettingsPanel";
import KSYKMapView from "@/components/KSYKMapView";
import AppSettingsManager from "@/components/AppSettingsManager";
import CampusSettingsPanel from "@/components/CampusSettingsPanel";
import AppLogsManager from "@/components/AppLogsManager";
import TicketManager from "@/components/TicketManager";
import TwoFactorAuth from "@/components/TwoFactorAuth";
import EnhancedWilmaUserManager from "@/components/EnhancedWilmaUserManager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Building,
  Users,
  Calendar,
  Megaphone,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  MapPin,
  Clock,
  AlertTriangle,
  Layers,
  MessageSquare,
  Settings,
  Sparkles,
  Brain,
  Zap,
  Shield,
  Box,
  LayoutDashboard,
  GraduationCap,
  Ticket,
  ScrollText,
  IdCard,
} from "lucide-react";

interface Building {
  id: string;
  name: string;
  nameEn?: string;
  nameFi?: string;
  description?: string;
  floors: number;
  capacity?: number;
  colorCode: string;
  mapPositionX?: number;
  mapPositionY?: number;
  isActive: boolean;
}

interface Room {
  id: string;
  buildingId: string;
  roomNumber: string;
  name?: string;
  nameEn?: string;
  nameFi?: string;
  floor: number;
  capacity?: number;
  type: string;
  isActive: boolean;
}

interface Staff {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  position?: string;
  department?: string;
  isActive: boolean;
}

interface Announcement {
  id: string;
  title: string;
  titleEn?: string;
  titleFi?: string;
  content: string;
  contentEn?: string;
  contentFi?: string;
  priority: string;
  isActive: boolean;
  createdAt: string;
  expiresAt?: string;
}

// BuildingCard Component - Extracted to fix React Hooks rules
function BuildingCard({ 
  building, 
  rooms, 
  queryClient,
  setActiveTab,
  setBuilderMode,
  setEditingRoom
}: { 
  building: Building;
  rooms: Room[];
  queryClient: QueryClient;
  setActiveTab: (tab: string) => void;
  setBuilderMode: (mode: 'buildings' | 'rooms' | 'hallways') => void;
  setEditingRoom: (room: any) => void;
}) {
  const { toast } = useToast();
  const buildingRooms = rooms.filter((r: Room) => r.buildingId === building.id);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: building.name,
    nameEn: building.nameEn || '',
    nameFi: building.nameFi || '',
    floors: building.floors,
    capacity: building.capacity || 0,
    colorCode: building.colorCode,
    description: building.description || ''
  });

  return (
    <Card className="border-2 hover:shadow-lg transition-all">
      <CardContent className="p-6">
        {/* Building Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start space-x-4 flex-1">
            <div 
              className="w-16 h-16 rounded-xl shadow-lg flex items-center justify-center text-white text-2xl font-bold"
              style={{ backgroundColor: building.colorCode }}
            >
              {building.name}
            </div>
            <div className="flex-1">
              {!isEditing ? (
                <>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold text-gray-900">{building.name}</h3>
                    <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                      {building.nameEn || 'No English name'}
                    </Badge>
                    {building.nameFi && (
                      <Badge className="bg-green-100 text-green-800 border-green-200">
                        {building.nameFi}
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Layers className="h-4 w-4" />
                      <span className="font-semibold">{building.floors}</span> floors
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span className="font-semibold">{building.capacity || 'N/A'}</span> capacity
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      <span className="font-semibold">{buildingRooms.length}</span> rooms
                    </div>
                    {building.mapPositionX && building.mapPositionY && (
                      <div className="flex items-center gap-1 text-gray-500">
                        <span className="text-xs">Position: ({building.mapPositionX}, {building.mapPositionY})</span>
                      </div>
                    )}
                  </div>
                  {building.description && (
                    <p className="text-sm text-gray-600 mt-2">{building.description}</p>
                  )}
                </>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs font-bold">Building Code *</Label>
                      <Input
                        value={editData.name}
                        onChange={(e) => setEditData({...editData, name: e.target.value})}
                        placeholder="M, K, L"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-bold">English Name</Label>
                      <Input
                        value={editData.nameEn}
                        onChange={(e) => setEditData({...editData, nameEn: e.target.value})}
                        placeholder="Music Building"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-bold">Finnish Name</Label>
                      <Input
                        value={editData.nameFi}
                        onChange={(e) => setEditData({...editData, nameFi: e.target.value})}
                        placeholder="Musiikkitalo"
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs font-bold">Floors</Label>
                      <Input
                        type="number"
                        min="1"
                        value={editData.floors}
                        onChange={(e) => setEditData({...editData, floors: parseInt(e.target.value) || 1})}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-bold">Capacity</Label>
                      <Input
                        type="number"
                        min="0"
                        value={editData.capacity}
                        onChange={(e) => setEditData({...editData, capacity: parseInt(e.target.value) || 0})}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-bold">Color</Label>
                      <div className="flex gap-2 mt-1">
                        <Input
                          type="color"
                          value={editData.colorCode}
                          onChange={(e) => setEditData({...editData, colorCode: e.target.value})}
                          className="w-16 h-10 p-1"
                        />
                        <Input
                          value={editData.colorCode}
                          onChange={(e) => setEditData({...editData, colorCode: e.target.value})}
                          placeholder="#3B82F6"
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs font-bold">Description</Label>
                    <Textarea
                      value={editData.description}
                      onChange={(e) => setEditData({...editData, description: e.target.value})}
                      placeholder="Building description..."
                      className="mt-1"
                      rows={2}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setIsEditing(true)}
                  className="hover:bg-blue-50 hover:border-blue-300"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="hover:bg-green-50 hover:border-green-300"
                >
                  <MapPin className="h-4 w-4 mr-1" />
                  {isExpanded ? 'Hide' : 'Show'} Rooms ({buildingRooms.length})
                </Button>
                <Button 
                  size="sm" 
                  variant="destructive"
                  onClick={async () => {
                    if (!confirm(`Delete building ${building.name}? This will also delete all ${buildingRooms.length} rooms in this building.`)) return;
                    try {
                      const response = await fetch(`/api/buildings/${building.id}`, {
                        method: 'DELETE',
                        credentials: 'include'
                      });
                      if (response.ok) {
                        toast({ title: "Building deleted", description: `${building.name} has been removed.` });
                        queryClient.invalidateQueries({ queryKey: ["buildings"] });
                        queryClient.invalidateQueries({ queryKey: ["rooms"] });
                      } else {
                        toast({ title: "Delete failed", description: "Failed to delete building.", variant: "destructive" });
                      }
                    } catch (error) {
                      console.error('Error deleting building:', error);
                      toast({ title: "Error", description: "Could not delete building.", variant: "destructive" });
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    setEditData({
                      name: building.name,
                      nameEn: building.nameEn || '',
                      nameFi: building.nameFi || '',
                      floors: building.floors,
                      capacity: building.capacity || 0,
                      colorCode: building.colorCode,
                      description: building.description || ''
                    });
                  }}
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
                <Button 
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                  onClick={async () => {
                    try {
                      const response = await fetch(`/api/buildings/${building.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify(editData)
                      });
                      if (response.ok) {
                        toast({ title: "Building updated", description: `${building.name} saved successfully.` });
                        queryClient.invalidateQueries({ queryKey: ["buildings"] });
                        setIsEditing(false);
                      } else {
                        toast({ title: "Save failed", description: "Failed to update building.", variant: "destructive" });
                      }
                    } catch (error) {
                      console.error('Error updating building:', error);
                      toast({ title: "Error", description: "Could not update building.", variant: "destructive" });
                    }
                  }}
                >
                  <Save className="h-4 w-4 mr-1" />
                  Save Changes
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Rooms Section */}
        {isExpanded && (
          <div className="mt-6 pt-6 border-t">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-lg font-semibold text-gray-900">
                Rooms in {building.name}
              </h4>
              <Button 
                size="sm"
                onClick={() => {
                  setActiveTab('ksyk-builder');
                  setBuilderMode('rooms');
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Room
              </Button>
            </div>
            
            {buildingRooms.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <MapPin className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                <p className="text-gray-600">No rooms in this building yet</p>
                <Button 
                  size="sm" 
                  variant="outline"
                  className="mt-3"
                  onClick={() => {
                    setActiveTab('ksyk-builder');
                    setBuilderMode('rooms');
                  }}
                >
                  Add First Room
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {buildingRooms.map((room: Room) => (
                  <div 
                    key={room.id} 
                    className="border rounded-lg p-3 hover:shadow-md transition-all bg-white"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
                          {room.roomNumber}
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{room.roomNumber}</p>
                          <p className="text-xs text-gray-500">Floor {room.floor}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {room.type}
                      </Badge>
                    </div>
                    {(room.name || room.nameEn) && (
                      <p className="text-xs text-gray-600 mb-2">
                        {room.name || room.nameEn}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Capacity: {room.capacity || 'N/A'}</span>
                      <div className="flex gap-1">
                        <Button 
                          size="sm" 
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() => {
                            setActiveTab('ksyk-builder');
                            setBuilderMode('rooms');
                            setEditingRoom(room);
                          }}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={async () => {
                            if (!window.confirm(`Delete room ${room.roomNumber}?`)) return;
                            try {
                              const response = await fetch(`/api/rooms/${room.id}`, {
                                method: 'DELETE',
                                credentials: 'include'
                              });
                              if (response.ok) {
                                toast({ title: "Room deleted", description: `Room ${room.roomNumber} removed.` });
                                queryClient.invalidateQueries({ queryKey: ["rooms"] });
                              } else {
                                toast({ title: "Delete failed", description: "Failed to delete room.", variant: "destructive" });
                              }
                            } catch (error) {
                              console.error('Error deleting room:', error);
                              toast({ title: "Error", description: "Could not delete room.", variant: "destructive" });
                            }
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── SchedulesManager ─────────────────────────────────────────────────────────
// Inline sub-component — kept here so it shares the dashboard's toast context
// and TanStack Query client without prop-drilling. Manages wilma_schedules
// rows that the GET /api/rooms/:id/schedule endpoint reads back to the map.
interface WilmaScheduleRow {
  id: string;
  studentId: string;
  dayOfWeek: number;
  timeSlot: string;
  subject: string;
  room: string;
  teacherName: string;
  teacherId?: string | null;
  isActive: boolean;
}

const DAY_LABELS: Record<number, string> = { 1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri" };

function SchedulesManager({ rooms }: { rooms: Room[] }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [filterRoom, setFilterRoom] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    room: "", dayOfWeek: 1, timeSlot: "08:00-09:30",
    subject: "", teacherName: "", studentId: "00000",
  });

  const { data: schedules = [], isLoading } = useQuery<WilmaScheduleRow[]>({
    queryKey: ["wilma-schedules-all"],
    queryFn: async () => {
      const r = await fetch("/api/wilma/schedules");
      if (!r.ok) return [];
      return r.json();
    },
    staleTime: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const r = await fetch("/api/wilma/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...data, isActive: true }),
      });
      if (!r.ok) throw new Error("Failed to create");
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wilma-schedules-all"] });
      toast({ title: "Schedule entry added" });
      setShowForm(false);
      setForm({ room: "", dayOfWeek: 1, timeSlot: "08:00-09:30", subject: "", teacherName: "", studentId: "00000" });
    },
    onError: () => toast({ title: "Failed to add entry", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/wilma/schedules/${id}`, { method: "DELETE", credentials: "include" });
      if (!r.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wilma-schedules-all"] });
      toast({ title: "Entry deleted" });
    },
    onError: () => toast({ title: "Delete failed", variant: "destructive" }),
  });

  const roomOptions = Array.from(new Set(rooms.map((r) => r.roomNumber).filter(Boolean))).sort();
  const filtered = (schedules as WilmaScheduleRow[]).filter((s) =>
    !filterRoom || s.room?.toUpperCase() === filterRoom.toUpperCase()
  );

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={filterRoom}
          onChange={(e) => setFilterRoom(e.target.value)}
          className="h-9 rounded-lg border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none min-w-[140px]"
        >
          <option value="">All rooms</option>
          {roomOptions.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <span className="text-sm text-muted-foreground ml-1">
          {filtered.length} entr{filtered.length === 1 ? "y" : "ies"}
        </span>
        <div className="flex-1" />
        <Button size="sm" onClick={() => setShowForm(!showForm)} className="gap-1.5">
          <Plus className="h-4 w-4" />
          Add entry
        </Button>
      </div>

      {/* Add form */}
      {showForm && (
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold">New Schedule Entry</CardTitle>
            <CardDescription className="text-xs">Adds a recurring weekly entry shown on the classroom schedule panel.</CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs mb-1 block">Room *</Label>
                <select
                  value={form.room}
                  onChange={(e) => setForm({ ...form, room: e.target.value })}
                  className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">Select room…</option>
                  {roomOptions.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-xs mb-1 block">Day *</Label>
                <select
                  value={form.dayOfWeek}
                  onChange={(e) => setForm({ ...form, dayOfWeek: Number(e.target.value) })}
                  className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {Object.entries(DAY_LABELS).map(([v, label]) => (
                    <option key={v} value={v}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs mb-1 block">Time slot *</Label>
                <Input
                  value={form.timeSlot}
                  onChange={(e) => setForm({ ...form, timeSlot: e.target.value })}
                  placeholder="08:00-09:30"
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Subject *</Label>
                <Input
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  placeholder="e.g. Mathematics"
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Teacher</Label>
                <Input
                  value={form.teacherName}
                  onChange={(e) => setForm({ ...form, teacherName: e.target.value })}
                  placeholder="Teacher name"
                  className="h-9 text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button
                size="sm"
                disabled={!form.room || !form.subject || createMutation.isPending}
                onClick={() => createMutation.mutate(form)}
              >
                <Save className="h-3.5 w-3.5 mr-1.5" />
                Save entry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Schedule table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-800 py-12 text-center">
          <Calendar className="h-10 w-10 mx-auto text-gray-300 dark:text-gray-700 mb-3" />
          <p className="text-sm text-muted-foreground font-medium">No schedule entries yet</p>
          <p className="text-xs text-muted-foreground mt-1">Add entries above — they appear in the classroom panel on the map.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-900/50">
                <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground px-4 py-2.5">Room</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2.5">Day</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2.5">Time</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2.5">Subject</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2.5 hidden sm:table-cell">Teacher</th>
                <th className="px-3 py-2.5 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors">
                  <td className="px-4 py-2.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-mono text-xs font-bold">
                      {s.room}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-xs font-medium">{DAY_LABELS[s.dayOfWeek] ?? s.dayOfWeek}</td>
                  <td className="px-3 py-2.5 font-mono text-xs">{s.timeSlot}</td>
                  <td className="px-3 py-2.5 font-medium max-w-[12rem] truncate">{s.subject}</td>
                  <td className="px-3 py-2.5 text-muted-foreground text-xs hidden sm:table-cell">{s.teacherName || "—"}</td>
                  <td className="px-3 py-2.5 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                      onClick={() => deleteMutation.mutate(s.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Entries are stored in <code className="font-mono bg-muted px-1 rounded">wilma_schedules</code> — the same table the map's classroom schedule panel reads.
        Future Wilma sync will populate this automatically.
      </p>
    </div>
  );
}

export default function AdminDashboard() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [builderSubtab, setBuilderSubtab] = useState<"rooms" | "map">("rooms");
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: "",
    titleEn: "",
    titleFi: "",
    content: "",
    contentEn: "",
    contentFi: "",
    priority: "normal",
    publishDate: new Date().toISOString().slice(0, 16), // datetime-local format
    expiresAt: "" // optional expiry date
  });
  
  // User management state
  const [editingUser, setEditingUser] = useState<any>(null);
  const [newUser, setNewUser] = useState({
    email: "",
    firstName: "",
    lastName: "",
    role: "admin",
    password: "",
    passwordOption: "manual" // "manual" or "email"
  });
  const [showUserForm, setShowUserForm] = useState(false);
  const [showPasswordField, setShowPasswordField] = useState(false);
  const [viewingPassword, setViewingPassword] = useState<string | null>(null);
  
  // Staff management state
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const [showStaffForm, setShowStaffForm] = useState(false);
  const [newStaff, setNewStaff] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    position: "",
    positionEn: "",
    positionFi: "",
    department: "",
    departmentEn: "",
    departmentFi: "",
    bio: "",
    bioEn: "",
    bioFi: "",
    isActive: true
  });
  
  // Get current user from localStorage
  const getCurrentUser = () => {
    try {
      const storedUser = localStorage.getItem('ksyk_admin_user');
      if (storedUser) {
        return JSON.parse(storedUser);
      }
    } catch (error) {
      console.error('Error getting current user:', error);
    }
    return null;
  };
  
  const currentUser = getCurrentUser();
  const isOwner = currentUser?.email === "JuusoJuusto112@gmail.com" || currentUser?.id === "owner-admin-user";
  const isAdmin = currentUser?.role === "admin" || isOwner; // Admin or owner

  // Auto-redirect to /admin-login if no valid session is present, OR if the
  // server says our session is gone. localStorage flag alone is trust-on-write;
  // we additionally probe /api/auth/me on mount and on tab focus and bounce
  // out on 401/403.
  useEffect(() => {
    const flagged = localStorage.getItem("ksyk_admin_logged_in") === "true";
    if (!flagged || !currentUser) {
      window.location.replace("/admin-login");
      return;
    }
    let cancelled = false;
    const verify = async () => {
      try {
        const r = await fetch("/api/auth/me", { credentials: "include" });
        if (cancelled) return;
        if (r.status === 401 || r.status === 403) {
          localStorage.removeItem("ksyk_admin_logged_in");
          localStorage.removeItem("ksyk_admin_user");
          window.location.replace("/admin-login");
        }
      } catch {
        // Network errors are non-fatal — keep the user in the panel.
      }
    };
    verify();
    const onFocus = () => verify();
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Builder state
  const [builderMode, setBuilderMode] = useState<'buildings' | 'rooms' | 'hallways'>('buildings');
  const [editingRoom, setEditingRoom] = useState<any>(null);

  // Fetch data
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

  const { data: staff = [] } = useQuery({
    queryKey: ["staff"],
    queryFn: async () => {
      const response = await fetch("/api/staff");
      if (!response.ok) throw new Error("Failed to fetch staff");
      return response.json();
    },
  });

  const { data: announcements = [] } = useQuery({
    queryKey: ["announcements"],
    queryFn: async () => {
      const response = await fetch("/api/announcements?limit=50");
      if (!response.ok) throw new Error("Failed to fetch announcements");
      return response.json();
    },
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const response = await fetch("/api/users");
      if (!response.ok) throw new Error("Failed to fetch users");
      return response.json();
    },
  });

  // Create announcement mutation
  const createAnnouncementMutation = useMutation({
    mutationFn: async (announcement: any) => {
      const response = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(announcement),
      });
      if (!response.ok) throw new Error("Failed to create announcement");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      setNewAnnouncement({
        title: "",
        titleEn: "",
        titleFi: "",
        content: "",
        contentEn: "",
        contentFi: "",
        priority: "normal",
        publishDate: new Date().toISOString().slice(0, 16),
        expiresAt: ""
      });
    },
  });

  // Update announcement mutation
  const updateAnnouncementMutation = useMutation({
    mutationFn: async ({ id, ...announcement }: any) => {
      const response = await fetch(`/api/announcements/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(announcement),
      });
      if (!response.ok) throw new Error("Failed to update announcement");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      setEditingAnnouncement(null);
    },
  });

  // Delete announcement mutation
  const deleteAnnouncementMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/announcements/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete announcement");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
    },
  });

  // Staff mutations
  const createStaffMutation = useMutation({
    mutationFn: async (staff: any) => {
      const response = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(staff),
      });
      if (!response.ok) throw new Error("Failed to create staff member");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      setShowStaffForm(false);
      setNewStaff({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        position: "",
        positionEn: "",
        positionFi: "",
        department: "",
        departmentEn: "",
        departmentFi: "",
        bio: "",
        bioEn: "",
        bioFi: "",
        isActive: true
      });
    },
  });

  const updateStaffMutation = useMutation({
    mutationFn: async ({ id, ...staff }: any) => {
      const response = await fetch(`/api/staff/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(staff),
      });
      if (!response.ok) throw new Error("Failed to update staff member");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      setEditingStaff(null);
      setShowStaffForm(false);
    },
  });

  const deleteStaffMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/staff/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete staff member");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
    },
  });

  const handleCreateAnnouncement = () => {
    if (!newAnnouncement.title || !newAnnouncement.content) {
      toast({ title: "Required fields missing", description: "Please fill in title and content.", variant: "destructive" });
      return;
    }
    createAnnouncementMutation.mutate(newAnnouncement);
  };

  const handleUpdateAnnouncement = () => {
    if (!editingAnnouncement) return;
    updateAnnouncementMutation.mutate(editingAnnouncement);
  };

  const handleCreateStaff = () => {
    if (!newStaff.firstName || !newStaff.lastName) {
      toast({ title: "Required fields missing", description: "Please fill in first and last name.", variant: "destructive" });
      return;
    }
    createStaffMutation.mutate(newStaff);
  };

  const handleUpdateStaff = () => {
    if (!editingStaff) return;
    updateStaffMutation.mutate(editingStaff);
  };

  const handleDeleteStaff = (id: string, name: string) => {
    if (!confirm(`Delete staff member ${name}?`)) return;
    deleteStaffMutation.mutate(id);
  };


  return (
    <div className="space-y-6 h-full flex flex-col p-6">
      {/* Account chip — sits above the tab bar; shows the signed-in user
          and a quick sign-out. Click avatar/initial to log out. */}
      {currentUser && (
        <div className="flex items-center justify-end gap-2 mb-2">
          <div className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
            <span
              aria-hidden="true"
              className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-[11px] font-bold shadow-inner"
            >
              {(currentUser.email || currentUser.name || "?").slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0 leading-tight pr-1">
              <p className="text-[11px] font-semibold truncate max-w-[14ch]">
                {currentUser.name || currentUser.email}
              </p>
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground">
                {isOwner ? "Owner" : isAdmin ? "Admin" : "Staff"}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[11px] font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-full"
              onClick={() => {
                if (!window.confirm("Log out?")) return;
                localStorage.removeItem("ksyk_admin_logged_in");
                localStorage.removeItem("ksyk_admin_user");
                localStorage.removeItem("ksyk_admin_login_at");
                fetch("/api/auth/logout", { method: "POST", credentials: "include" }).finally(() => {
                  window.location.replace("/admin-login");
                });
              }}
              title="Sign out"
            >
              Sign out
            </Button>
          </div>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        {/* Horizontally scrollable, icon-led tab bar — fits ~11 entries
           cleanly on desktop and slides on mobile instead of cramming.
           Each trigger is a pill with icon + label; active trigger gets
           the primary fill via the underlying Radix data-state.
           Sticky so it stays visible while scrolling content tabs. */}
        <div className="-mx-1 px-1 overflow-x-auto scrollbar-none sticky top-0 z-20 py-2 bg-background/95 backdrop-blur-sm">
          <TabsList className="inline-flex w-max gap-1 p-1 bg-gray-100/80 dark:bg-gray-900/60 rounded-2xl shadow-sm border border-gray-200/60 dark:border-gray-800">
            {([
              { value: "overview", label: "Overview", Icon: LayoutDashboard },
              { value: "users", label: "Users", Icon: Users },
              { value: "wilma", label: "Wilma", Icon: GraduationCap },
              { value: "campus-map", label: "Map", Icon: MapPin },
              { value: "ksyk-builder", label: "Builder", Icon: Box },
              { value: "schedules", label: "Schedules", Icon: Calendar },
              { value: "tickets", label: "Tickets", Icon: Ticket },
              { value: "logs", label: "Logs", Icon: ScrollText },
              { value: "staff", label: "Staff", Icon: IdCard },
              { value: "announcements", label: "Announcements", Icon: Megaphone },
              ...(isOwner ? [{ value: "2fa", label: "2FA", Icon: Shield }] : []),
              ...(isOwner ? [{ value: "settings", label: "Settings", Icon: Settings }] : []),
            ]).map(({ value, label, Icon }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:shadow-sm data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-300 rounded-xl px-3 py-2 text-xs sm:text-sm font-semibold gap-1.5 inline-flex items-center transition-all duration-200 whitespace-nowrap"
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* Section header — auto-rendered from the current tab so every
           section gets a consistent title + description without touching
           each TabsContent. Sits between the tab bar and content. */}
        {(() => {
          const sectionMeta: Record<string, { title: string; description: string; Icon: typeof LayoutDashboard }> = {
            overview: { title: "Overview", description: "At-a-glance state of the campus.", Icon: LayoutDashboard },
            users: { title: "Users", description: "Manage Wilma and admin accounts.", Icon: Users },
            wilma: { title: "Wilma", description: "Wilma school-system integration.", Icon: GraduationCap },
            "campus-map": { title: "Campus Map", description: "Live preview of what users see.", Icon: MapPin },
            "ksyk-builder": { title: "Builder", description: "Rooms, floors and global map defaults.", Icon: Box },
            schedules: { title: "Room Schedules", description: "Manage classroom timetables shown on the map.", Icon: Calendar },
            tickets: { title: "Tickets", description: "Support requests and bug reports.", Icon: Ticket },
            logs: { title: "Application Logs", description: "Server-side activity and errors.", Icon: ScrollText },
            staff: { title: "Staff", description: "Public-facing staff directory entries.", Icon: IdCard },
            announcements: { title: "Announcements", description: "Banner messages shown to all users.", Icon: Megaphone },
            "2fa": { title: "Two-Factor Auth", description: "Enroll and manage 2FA for your account.", Icon: Shield },
            settings: { title: "Settings", description: "Global application configuration.", Icon: Settings },
          };
          const meta = sectionMeta[activeTab];
          if (!meta) return null;
          const Icon = meta.Icon;
          return (
            <div className="flex items-center gap-3 px-1 mt-1 mb-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-sm">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-bold tracking-tight leading-tight">
                  {meta.title}
                </h2>
                <p className="text-xs text-muted-foreground leading-tight truncate">
                  {meta.description}
                </p>
              </div>
            </div>
          );
        })()}

        <TabsContent value="overview" className="space-y-6">
          {/* Quick stats — at-a-glance KPI cards, each navigates to its tab */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {[
              {
                label: "Buildings",
                value: (buildings as any[])?.length ?? 0,
                accent: "from-blue-500 to-indigo-500",
                icon: Building,
                tab: "campus-map",
              },
              {
                label: "Rooms",
                value: (rooms as any[])?.length ?? 0,
                accent: "from-emerald-500 to-teal-500",
                icon: MapPin,
                tab: "ksyk-builder",
              },
              {
                label: "Floors",
                value: Math.max(
                  1,
                  ...(((rooms as any[]) ?? []).map((r) => r?.floor ?? 1)),
                  ...(((buildings as any[]) ?? []).map((b) => b?.floors ?? 1))
                ),
                accent: "from-amber-500 to-orange-500",
                icon: Layers,
                tab: "ksyk-builder",
              },
              {
                label: "Announcements",
                value: (announcements as any[])?.length ?? 0,
                accent: "from-rose-500 to-pink-500",
                icon: AlertTriangle,
                tab: "announcements",
              },
            ].map(({ label, value, accent, icon: Icon, tab }) => (
              <button
                key={label}
                type="button"
                onClick={() => setActiveTab(tab)}
                className="text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900 rounded-xl"
                aria-label={`Go to ${label} tab`}
              >
                <Card className="relative overflow-hidden border-0 shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
                  <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accent}`} />
                  <CardContent className="p-4 md:p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
                        <p className="text-3xl md:text-4xl font-bold mt-1 tabular-nums">{value}</p>
                      </div>
                      <div className={`p-2 rounded-xl bg-gradient-to-br ${accent} text-white shadow-sm`}>
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </button>
            ))}
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { label: "New Announcement", desc: "Post a notice to all users", icon: Megaphone, tab: "announcements", accent: "bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/30 dark:border-rose-800" },
              { label: "Manage Staff", desc: "Update the staff directory", icon: Users, tab: "staff", accent: "bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100 dark:bg-violet-950/30 dark:border-violet-800" },
              { label: "Open Builder", desc: "Edit rooms and floors", icon: Box, tab: "ksyk-builder", accent: "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/30 dark:border-amber-800" },
              { label: "Campus Map", desc: "Preview the live map", icon: MapPin, tab: "campus-map", accent: "bg-teal-50 border-teal-200 text-teal-700 hover:bg-teal-100 dark:bg-teal-950/30 dark:border-teal-800" },
              { label: "View Tickets", desc: "Check open support requests", icon: Ticket, tab: "tickets", accent: "bg-sky-50 border-sky-200 text-sky-700 hover:bg-sky-100 dark:bg-sky-950/30 dark:border-sky-800" },
              { label: "App Logs", desc: "Server activity & errors", icon: ScrollText, tab: "logs", accent: "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 dark:bg-slate-950/30 dark:border-slate-800" },
            ].map(({ label, desc, icon: Icon, tab, accent }) => (
              <button
                key={label}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-3 p-4 rounded-xl border text-left transition-colors ${accent}`}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/60 dark:bg-gray-900/40">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{label}</p>
                  <p className="text-xs opacity-70 truncate">{desc}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Latest announcements */}
          {(announcements as any[]).length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Megaphone className="h-4 w-4 text-rose-500" />
                  Recent Announcements
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {(announcements as Announcement[]).slice(0, 3).map((a) => (
                    <div key={a.id} className="flex items-start gap-3 py-2 border-b last:border-0">
                      <span className={`mt-0.5 shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${
                        a.priority === "urgent" ? "bg-red-100 text-red-700" :
                        a.priority === "high" ? "bg-orange-100 text-orange-700" :
                        "bg-blue-100 text-blue-700"
                      }`}>{a.priority}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{a.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{a.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          {!isOwner ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Users className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">Owner Access Only</h3>
                <p className="text-gray-500">User management is restricted to the owner account for security.</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>User Management (Owner Only)</CardTitle>
                    <CardDescription>
                      Add and manage users in the system. Roles: visitor, user, admin, owner.
                    </CardDescription>
                  </div>
                  <Button 
                    onClick={() => {
                      setShowUserForm(true);
                      setEditingUser(null);
                      setNewUser({ email: "", firstName: "", lastName: "", role: "admin", password: "", passwordOption: "manual" });
                      setShowPasswordField(false);
                    }}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add User
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* User Form */}
                  {showUserForm && (
                    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-800/40 p-5 shadow-sm">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-semibold">
                          {editingUser ? "Edit User" : "Add New User"}
                        </h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setShowUserForm(false);
                            setEditingUser(null);
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>First Name</Label>
                          <Input
                            value={editingUser ? editingUser.firstName : newUser.firstName}
                            onChange={(e) => editingUser 
                              ? setEditingUser({...editingUser, firstName: e.target.value})
                              : setNewUser({...newUser, firstName: e.target.value})
                            }
                            placeholder="John"
                          />
                        </div>
                        <div>
                          <Label>Last Name</Label>
                          <Input
                            value={editingUser ? editingUser.lastName : newUser.lastName}
                            onChange={(e) => editingUser 
                              ? setEditingUser({...editingUser, lastName: e.target.value})
                              : setNewUser({...newUser, lastName: e.target.value})
                            }
                            placeholder="Doe"
                          />
                        </div>
                        <div>
                          <Label>Email</Label>
                          <Input
                            type="email"
                            value={editingUser ? editingUser.email : newUser.email}
                            onChange={(e) => editingUser 
                              ? setEditingUser({...editingUser, email: e.target.value})
                              : setNewUser({...newUser, email: e.target.value})
                            }
                            placeholder="john@example.com"
                          />
                        </div>
                        <div>
                          <Label>Role</Label>
                          <select
                            className="w-full h-10 border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
                            value={editingUser ? editingUser.role : newUser.role}
                            onChange={(e) => editingUser
                              ? setEditingUser({...editingUser, role: e.target.value})
                              : setNewUser({...newUser, role: e.target.value})
                            }
                          >
                            <option value="visitor">Visitor</option>
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                            <option value="owner">Owner</option>
                          </select>
                        </div>
                        {!editingUser && (
                          <>
                            <div className="col-span-2">
                              <Label className="mb-3 block">Password Setup</Label>
                              <div className="space-y-3">
                                <div className="flex items-center space-x-4">
                                  <label className="flex items-center space-x-2 cursor-pointer">
                                    <input
                                      type="radio"
                                      name="passwordOption"
                                      value="manual"
                                      checked={newUser.passwordOption === "manual"}
                                      onChange={(e) => setNewUser({...newUser, passwordOption: e.target.value, password: ""})}
                                      className="w-4 h-4 text-blue-600"
                                    />
                                    <span className="text-sm font-medium">Set password manually</span>
                                  </label>
                                  <label className="flex items-center space-x-2 cursor-pointer">
                                    <input
                                      type="radio"
                                      name="passwordOption"
                                      value="email"
                                      checked={newUser.passwordOption === "email"}
                                      onChange={(e) => setNewUser({...newUser, passwordOption: e.target.value, password: ""})}
                                      className="w-4 h-4 text-blue-600"
                                    />
                                    <span className="text-sm font-medium">Send email invitation</span>
                                  </label>
                                </div>
                                
                                {newUser.passwordOption === "manual" && (
                                  <div>
                                    <Input
                                      type="password"
                                      value={newUser.password}
                                      onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                                      placeholder="Enter password"
                                      className="mt-2"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                      User will use this password to login
                                    </p>
                                  </div>
                                )}
                                
                                {newUser.passwordOption === "email" && (
                                  <div className="bg-blue-50 border border-blue-200 rounded p-3">
                                    <p className="text-sm text-blue-800">
                                      📧 An email will be sent to <strong>{newUser.email || "the user"}</strong> with instructions to set their password.
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </>
                        )}
                        
                        {editingUser && (
                          <div className="col-span-2">
                            <div className="flex items-center justify-between mb-2">
                              <Label>Password</Label>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowPasswordField(!showPasswordField)}
                                className="text-blue-600 hover:text-blue-700"
                              >
                                {showPasswordField ? "Hide" : "Change Password"}
                              </Button>
                            </div>
                            {showPasswordField && (
                              <div className="space-y-2">
                                <Input
                                  type="password"
                                  placeholder="Enter new password"
                                  onChange={(e) => setEditingUser({...editingUser, newPassword: e.target.value})}
                                />
                                <p className="text-xs text-gray-500">
                                  Leave empty to keep current password
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex justify-end space-x-2 mt-4">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowUserForm(false);
                            setEditingUser(null);
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          className="bg-blue-600 hover:bg-blue-700"
                          onClick={async () => {
                            try {
                              if (editingUser) {
                                // Update user
                                const response = await fetch(`/api/users/${editingUser.id}`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify(editingUser)
                                });
                                
                                if (!response.ok) {
                                  const error = await response.json();
                                  throw new Error(error.message || 'Failed to update user');
                                }

                                toast({ title: "User updated", description: "User account saved successfully." });
                                queryClient.invalidateQueries({ queryKey: ["users"] });
                                setShowUserForm(false);
                                setEditingUser(null);
                              } else {
                                // Create user
                                if (!newUser.email || !newUser.firstName || !newUser.lastName) {
                                  toast({ title: "Required fields missing", description: "Please fill in all required fields.", variant: "destructive" });
                                  return;
                                }

                                if (newUser.passwordOption === 'manual' && !newUser.password) {
                                  toast({ title: "Password required", description: "Please enter a password or choose email invitation.", variant: "destructive" });
                                  return;
                                }
                                
                                const response = await fetch('/api/users', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify(newUser)
                                });
                                
                                if (!response.ok) {
                                  const error = await response.json();
                                  throw new Error(error.message || 'Failed to create user');
                                }
                                
                                const result = await response.json();
                                
                                const description = newUser.passwordOption === 'email'
                                  ? `Invitation sent to ${newUser.email}.`
                                  : "User account created.";
                                toast({ title: "User created", description });
                                queryClient.invalidateQueries({ queryKey: ["users"] });
                                setShowUserForm(false);
                                setNewUser({ email: "", firstName: "", lastName: "", role: "admin", password: "", passwordOption: "manual" });
                              }
                            } catch (error: any) {
                              toast({ title: "Error", description: error.message, variant: "destructive" });
                            }
                          }}
                        >
                          <Save className="h-4 w-4 mr-2" />
                          {editingUser ? "Update User" : "Create User"}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Password Viewer Modal */}
                  {viewingPassword && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-lg font-semibold text-gray-900">User Password</h3>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewingPassword(null)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="bg-gray-50 border border-gray-200 rounded p-4 mb-4">
                          <p className="text-sm text-gray-600 mb-2">Email:</p>
                          <p className="font-mono text-sm font-semibold text-gray-900 mb-4">
                            {users.find((u: any) => u.id === viewingPassword)?.email}
                          </p>
                          <p className="text-sm text-gray-600 mb-2">Password:</p>
                          <p className="font-mono text-lg font-bold text-blue-600 bg-blue-50 p-3 rounded border border-blue-200">
                            {users.find((u: any) => u.id === viewingPassword)?.password || "No password set"}
                          </p>
                        </div>
                        <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                          <p className="text-xs text-yellow-800">
                            ⚠️ Keep this password secure. Share it only with the intended user.
                          </p>
                        </div>
                        <div className="flex justify-end mt-4">
                          <Button
                            onClick={() => setViewingPassword(null)}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            Close
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Users Table */}
                  <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50/80 dark:bg-gray-800/60">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Role</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {users.map((user: any) => (
                          <tr key={user.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div className="font-medium">{user.firstName} {user.lastName}</div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">{user.email}</td>
                            <td className="px-4 py-3">
                              <Badge className={`capitalize text-xs font-semibold px-2 py-0.5 ${
                                user.role === 'owner' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                                user.role === 'admin' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                                user.role === 'user' ? 'bg-green-100 text-green-800 border-green-200' :
                                'bg-gray-100 text-gray-600 border-gray-200'
                              }`}>
                                {user.role}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <Badge className="bg-green-100 text-green-800">Active</Badge>
                            </td>
                            <td className="px-4 py-3">
                              {user.email !== "JuusoJuusto112@gmail.com" && (
                                <div className="flex space-x-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setEditingUser(user);
                                      setShowUserForm(true);
                                      setShowPasswordField(false);
                                    }}
                                    title="Edit user"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-blue-600 hover:text-blue-700"
                                    onClick={() => setViewingPassword(user.id)}
                                    title="View password"
                                  >
                                    👁️
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-600 hover:text-red-700"
                                    onClick={async () => {
                                      if (confirm(`Delete user ${user.email}?\n\nThis action cannot be undone.`)) {
                                        try {
                                          const response = await fetch(`/api/users/${user.id}`, {
                                            method: 'DELETE'
                                          });
                                          
                                          if (!response.ok) {
                                            const error = await response.json();
                                            throw new Error(error.message || 'Failed to delete user');
                                          }

                                          toast({ title: "User deleted", description: "Account removed." });
                                          queryClient.invalidateQueries({ queryKey: ["users"] });
                                        } catch (error: any) {
                                          toast({ title: "Error", description: error.message, variant: "destructive" });
                                        }
                                      }
                                    }}
                                    title="Delete user"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}
                              {user.email === "JuusoJuusto112@gmail.com" && (
                                <Badge className="bg-yellow-100 text-yellow-800">Owner</Badge>
                              )}
                            </td>
                          </tr>
                        ))}
                        {users.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                              No users found. Click "Add User" to create one.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-900 mb-2">Owner Account Information</h4>
                    <div className="space-y-1 text-sm text-blue-800">
                      <p><strong>Email:</strong> JuusoJuusto112@gmail.com</p>
                      <p><strong>Name:</strong> Juuso Kaikula</p>
                      <p><strong>Role:</strong> Owner/Admin</p>
                      <p className="text-xs text-blue-600 mt-2">
                        This account is hardcoded and cannot be edited or deleted.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="wilma" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Wilma User Management (Temporary)</CardTitle>
              <CardDescription>
                Manage Wilma system users. This tab is temporarily added for quick access.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EnhancedWilmaUserManager />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campus-map" className="min-h-[70vh] h-[75vh] overflow-hidden rounded-lg border border-gray-200">
          <KSYKMapView />
        </TabsContent>

        <TabsContent value="ksyk-builder" className="min-h-[70vh] flex flex-col overflow-hidden">
          {/* Builder sub-tabs — rooms / map defaults */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-gray-100 dark:bg-gray-800 self-start mb-3 shadow-sm">
            {([
              { id: "rooms" as const, label: "Rooms & Floors" },
              { id: "map" as const, label: "Map Defaults" },
            ]).map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setBuilderSubtab(id)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  builderSubtab === id
                    ? "bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-300"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
                }`}
                aria-pressed={builderSubtab === id}
              >
                {label}
              </button>
            ))}
          </div>

          {builderSubtab === "rooms" ? (
            <div className="flex-1 min-h-0 h-[70vh] overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
              <ImprovedKSYKBuilder />
            </div>
          ) : (
            <div className="max-w-3xl">
              <MapSettingsPanel />
            </div>
          )}
        </TabsContent>

        <TabsContent value="logs" className="space-y-6">
          <AppLogsManager />
        </TabsContent>

        <TabsContent value="schedules" className="space-y-6">
          <SchedulesManager rooms={rooms as Room[]} />
        </TabsContent>

        <TabsContent value="tickets" className="space-y-6">
          <TicketManager />
        </TabsContent>

        <TabsContent value="staff" className="space-y-6">
          <div className="flex justify-end mb-2">
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => {
                setShowStaffForm(true);
                setEditingStaff(null);
                setNewStaff({
                  firstName: "",
                  lastName: "",
                  email: "",
                  phone: "",
                  position: "",
                  positionEn: "",
                  positionFi: "",
                  department: "",
                  departmentEn: "",
                  departmentFi: "",
                  bio: "",
                  bioEn: "",
                  bioFi: "",
                  isActive: true
                });
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Staff Member
            </Button>
          </div>

          {/* Staff Form */}
          {showStaffForm && (
            <Card className="border border-gray-200 dark:border-gray-700 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">{editingStaff ? "Edit Staff Member" : "Add New Staff Member"}</CardTitle>
                <CardDescription>
                  {editingStaff ? "Update staff member information" : "Fill in the details to add a new staff member"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>First Name *</Label>
                    <Input
                      value={editingStaff ? editingStaff.firstName : newStaff.firstName}
                      onChange={(e) => {
                        if (editingStaff) {
                          setEditingStaff({ ...editingStaff, firstName: e.target.value });
                        } else {
                          setNewStaff({ ...newStaff, firstName: e.target.value });
                        }
                      }}
                      placeholder="John"
                    />
                  </div>
                  <div>
                    <Label>Last Name *</Label>
                    <Input
                      value={editingStaff ? editingStaff.lastName : newStaff.lastName}
                      onChange={(e) => {
                        if (editingStaff) {
                          setEditingStaff({ ...editingStaff, lastName: e.target.value });
                        } else {
                          setNewStaff({ ...newStaff, lastName: e.target.value });
                        }
                      }}
                      placeholder="Doe"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={editingStaff ? editingStaff.email || "" : newStaff.email}
                      onChange={(e) => {
                        if (editingStaff) {
                          setEditingStaff({ ...editingStaff, email: e.target.value });
                        } else {
                          setNewStaff({ ...newStaff, email: e.target.value });
                        }
                      }}
                      placeholder="john.doe@ksyk.fi"
                    />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input
                      value={editingStaff ? editingStaff.phone || "" : newStaff.phone}
                      onChange={(e) => {
                        if (editingStaff) {
                          setEditingStaff({ ...editingStaff, phone: e.target.value });
                        } else {
                          setNewStaff({ ...newStaff, phone: e.target.value });
                        }
                      }}
                      placeholder="+358 40 123 4567"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Position (Default)</Label>
                    <Input
                      value={editingStaff ? editingStaff.position || "" : newStaff.position}
                      onChange={(e) => {
                        if (editingStaff) {
                          setEditingStaff({ ...editingStaff, position: e.target.value });
                        } else {
                          setNewStaff({ ...newStaff, position: e.target.value });
                        }
                      }}
                      placeholder="Teacher"
                    />
                  </div>
                  <div>
                    <Label>Position (English)</Label>
                    <Input
                      value={editingStaff ? editingStaff.positionEn || "" : newStaff.positionEn}
                      onChange={(e) => {
                        if (editingStaff) {
                          setEditingStaff({ ...editingStaff, positionEn: e.target.value });
                        } else {
                          setNewStaff({ ...newStaff, positionEn: e.target.value });
                        }
                      }}
                      placeholder="Teacher"
                    />
                  </div>
                  <div>
                    <Label>Position (Finnish)</Label>
                    <Input
                      value={editingStaff ? editingStaff.positionFi || "" : newStaff.positionFi}
                      onChange={(e) => {
                        if (editingStaff) {
                          setEditingStaff({ ...editingStaff, positionFi: e.target.value });
                        } else {
                          setNewStaff({ ...newStaff, positionFi: e.target.value });
                        }
                      }}
                      placeholder="Opettaja"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Department (Default)</Label>
                    <Input
                      value={editingStaff ? editingStaff.department || "" : newStaff.department}
                      onChange={(e) => {
                        if (editingStaff) {
                          setEditingStaff({ ...editingStaff, department: e.target.value });
                        } else {
                          setNewStaff({ ...newStaff, department: e.target.value });
                        }
                      }}
                      placeholder="Music"
                    />
                  </div>
                  <div>
                    <Label>Department (English)</Label>
                    <Input
                      value={editingStaff ? editingStaff.departmentEn || "" : newStaff.departmentEn}
                      onChange={(e) => {
                        if (editingStaff) {
                          setEditingStaff({ ...editingStaff, departmentEn: e.target.value });
                        } else {
                          setNewStaff({ ...newStaff, departmentEn: e.target.value });
                        }
                      }}
                      placeholder="Music"
                    />
                  </div>
                  <div>
                    <Label>Department (Finnish)</Label>
                    <Input
                      value={editingStaff ? editingStaff.departmentFi || "" : newStaff.departmentFi}
                      onChange={(e) => {
                        if (editingStaff) {
                          setEditingStaff({ ...editingStaff, departmentFi: e.target.value });
                        } else {
                          setNewStaff({ ...newStaff, departmentFi: e.target.value });
                        }
                      }}
                      placeholder="Musiikki"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={editingStaff ? editingStaff.isActive : newStaff.isActive}
                    onChange={(e) => {
                      if (editingStaff) {
                        setEditingStaff({ ...editingStaff, isActive: e.target.checked });
                      } else {
                        setNewStaff({ ...newStaff, isActive: e.target.checked });
                      }
                    }}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="isActive">Active</Label>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowStaffForm(false);
                      setEditingStaff(null);
                    }}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    className="bg-green-600 hover:bg-green-700"
                    onClick={editingStaff ? handleUpdateStaff : handleCreateStaff}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {editingStaff ? "Update" : "Create"} Staff Member
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Staff Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Staff</p>
                    <p className="text-2xl font-bold">{staff.length}</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Active</p>
                    <p className="text-2xl font-bold text-green-600">
                      {staff.filter((s: Staff) => s.isActive).length}
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Departments</p>
                    <p className="text-2xl font-bold">
                      {new Set(staff.map((s: Staff) => s.department).filter(Boolean)).size}
                    </p>
                  </div>
                  <Building className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Positions</p>
                    <p className="text-2xl font-bold">
                      {new Set(staff.map((s: Staff) => s.position).filter(Boolean)).size}
                    </p>
                  </div>
                  <Layers className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Staff Directory</CardTitle>
              <CardDescription>
                {staff.length === 0 
                  ? "No staff members found. Add staff members to get started."
                  : `Showing ${Math.min(staff.length, 20)} of ${staff.length} staff members`
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {staff.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Staff Members</h3>
                  <p className="text-gray-600 mb-6">Get started by adding your first staff member</p>
                  <Button 
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={() => {
                      setShowStaffForm(true);
                      setEditingStaff(null);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Staff Member
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {staff.slice(0, 20).map((member: Staff) => (
                    <div key={member.id} className="flex items-center justify-between p-3 rounded-xl border border-transparent hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:border-gray-200 dark:hover:border-gray-700 transition-all">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                          {member.firstName?.[0]}{member.lastName?.[0]}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {member.firstName} {member.lastName}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {member.position || 'No position'} • {member.department || 'No department'}
                          </p>
                          {member.email && (
                            <p className="text-xs text-gray-500 mt-1">{member.email}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={member.isActive ? "default" : "secondary"} className={member.isActive ? "bg-green-600" : ""}>
                          {member.isActive ? "Active" : "Inactive"}
                        </Badge>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-8 w-8 p-0"
                          onClick={() => {
                            setEditingStaff(member);
                            setShowStaffForm(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                          onClick={() => handleDeleteStaff(member.id, `${member.firstName} ${member.lastName}`)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {staff.length > 20 && (
                    <div className="text-center py-4 border-t">
                      <p className="text-sm text-muted-foreground">
                        Showing 20 of {staff.length} staff members
                      </p>
                      <Button variant="outline" size="sm" className="mt-2">
                        Load More
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="announcements" className="space-y-6">
          <AnnouncementManager />
        </TabsContent>

        {isOwner && (
          <TabsContent value="2fa" className="space-y-6">
            <TwoFactorAuth />
          </TabsContent>
        )}

        {isOwner && (
          <TabsContent value="settings" className="space-y-6">
            <CampusSettingsPanel />
            <AppSettingsManager />
          
          {/* Danger Zone - Complete Data Cleanup */}
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="text-red-800 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Danger Zone - Complete Data Cleanup
              </CardTitle>
              <CardDescription className="text-red-700">
                ⚠️ This will permanently delete ALL buildings, rooms, hallways, stairs, announcements, and staff data. This action cannot be undone!
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert className="border-red-300 bg-red-100">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    <strong>WARNING:</strong> This will completely empty the map and remove all data:
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>All buildings and their floor plans</li>
                      <li>All rooms, hallways, and stairs</li>
                      <li>All announcements and staff information</li>
                      <li>All map data and configurations</li>
                    </ul>
                  </AlertDescription>
                </Alert>
                
                <Button
                  variant="destructive"
                  size="lg"
                  className="w-full bg-red-600 hover:bg-red-700"
                  onClick={async () => {
                    const confirmText = prompt(
                      'This will DELETE ALL DATA from the map!\n\n' +
                      'Type "DELETE_EVERYTHING" to confirm this destructive action:'
                    );
                    
                    if (confirmText !== 'DELETE_EVERYTHING') {
                      alert('Cleanup cancelled. Data is safe.');
                      return;
                    }
                    
                    const finalConfirm = confirm(
                      'FINAL CONFIRMATION:\n\n' +
                      'Are you absolutely sure you want to delete ALL buildings, rooms, hallways, stairs, announcements, and staff?\n\n' +
                      'This action CANNOT be undone!'
                    );
                    
                    if (!finalConfirm) {
                      alert('Cleanup cancelled. Data is safe.');
                      return;
                    }
                    
                    try {
                      console.log('🗑️ Starting complete data cleanup...');
                      
                      const response = await fetch('/api/admin/cleanup-all', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        credentials: 'include',
                        body: JSON.stringify({
                          confirmDelete: 'DELETE_EVERYTHING'
                        })
                      });
                      
                      const result = await response.json();
                      
                      if (response.ok) {
                        alert(
                          '✅ SUCCESS! All data has been deleted.\n\n' +
                          `📊 Deletion Summary:\n` +
                          `🏢 Buildings: ${result.deleted.buildings}\n` +
                          `🚪 Rooms: ${result.deleted.rooms}\n` +
                          `🛤️ Hallways: ${result.deleted.hallways}\n` +
                          `🏗️ Floors: ${result.deleted.floors}\n` +
                          `📢 Announcements: ${result.deleted.announcements}\n` +
                          `👥 Staff: ${result.deleted.staff}\n\n` +
                          '🎯 The map is now completely empty!'
                        );
                        
                        // Refresh all data
                        queryClient.invalidateQueries({ queryKey: ["buildings"] });
                        queryClient.invalidateQueries({ queryKey: ["rooms"] });
                        queryClient.invalidateQueries({ queryKey: ["announcements"] });
                        queryClient.invalidateQueries({ queryKey: ["staff"] });
                        
                        // Refresh the page to show empty state
                        window.location.reload();
                      } else {
                        alert(`❌ Failed to delete data: ${result.message}`);
                      }
                    } catch (error: any) {
                      console.error('Cleanup error:', error);
                      alert(`❌ Error during cleanup: ${error.message}`);
                    }
                  }}
                >
                  <Trash2 className="h-5 w-5 mr-2" />
                  DELETE ALL MAP DATA
                </Button>
                
                <p className="text-xs text-red-600 text-center">
                  This button will completely empty the KSYK Maps database
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        )}
      </Tabs>
    </div>
  );
}