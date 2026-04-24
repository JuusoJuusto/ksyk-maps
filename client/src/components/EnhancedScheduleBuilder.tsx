import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Calendar, Clock, Users, MapPin, AlertTriangle, 
  Save, Copy, Download, Upload, Plus, Trash2, Edit,
  CheckCircle, XCircle, Grid, List
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ScheduleSlot {
  id: string;
  day: number; // 0-4 (Mon-Fri)
  period: number; // 1-8
  subject: string;
  teacher: string;
  teacherId: string;
  class: string;
  room: string;
  startTime: string;
  endTime: string;
}

interface Conflict {
  type: 'teacher' | 'room' | 'class';
  slots: ScheduleSlot[];
  message: string;
}

const DAYS = ['Maanantai', 'Tiistai', 'Keskiviikko', 'Torstai', 'Perjantai'];
const PERIODS = [
  { number: 1, start: '08:00', end: '08:45' },
  { number: 2, start: '08:50', end: '09:35' },
  { number: 3, start: '09:50', end: '10:35' },
  { number: 4, start: '10:40', end: '11:25' },
  { number: 5, start: '11:40', end: '12:25' },
  { number: 6, start: '12:30', end: '13:15' },
  { number: 7, start: '13:30', end: '14:15' },
  { number: 8, start: '14:20', end: '15:05' },
];

// Mock data
const mockSchedule: ScheduleSlot[] = [
  {
    id: '1',
    day: 0,
    period: 1,
    subject: 'Matematiikka',
    teacher: 'Matti Virtanen',
    teacherId: 't1',
    class: '7A',
    room: 'A301',
    startTime: '08:00',
    endTime: '08:45'
  },
  {
    id: '2',
    day: 0,
    period: 2,
    subject: 'Äidinkieli',
    teacher: 'Anna Korhonen',
    teacherId: 't2',
    class: '7A',
    room: 'B201',
    startTime: '08:50',
    endTime: '09:35'
  }
];

const mockTeachers = [
  { id: 't1', name: 'Matti Virtanen', subjects: ['Matematiikka', 'Fysiikka'] },
  { id: 't2', name: 'Anna Korhonen', subjects: ['Äidinkieli', 'Kirjallisuus'] },
  { id: 't3', name: 'Liisa Nieminen', subjects: ['Englanti'] }
];

const mockClasses = ['7A', '7B', '8A', '8B', '9A', '9B'];
const mockRooms = ['A301', 'A302', 'B201', 'B202', 'C101', 'Liikuntasali', 'Musiikkiluokka'];

export default function EnhancedScheduleBuilder() {
  const { toast } = useToast();
  const [schedule, setSchedule] = useState<ScheduleSlot[]>(mockSchedule);
  const [selectedClass, setSelectedClass] = useState('7A');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [draggedSlot, setDraggedSlot] = useState<ScheduleSlot | null>(null);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSlot, setEditingSlot] = useState<ScheduleSlot | null>(null);

  // New lesson form
  const [newLesson, setNewLesson] = useState({
    subject: '',
    teacherId: '',
    room: '',
    day: 0,
    period: 1
  });

  // Detect conflicts
  const detectConflicts = (scheduleData: ScheduleSlot[]): Conflict[] => {
    const foundConflicts: Conflict[] = [];
    
    // Check teacher conflicts
    const teacherSlots = new Map<string, ScheduleSlot[]>();
    scheduleData.forEach(slot => {
      const key = `${slot.teacherId}-${slot.day}-${slot.period}`;
      if (!teacherSlots.has(key)) {
        teacherSlots.set(key, []);
      }
      teacherSlots.get(key)!.push(slot);
    });
    
    teacherSlots.forEach((slots, key) => {
      if (slots.length > 1) {
        foundConflicts.push({
          type: 'teacher',
          slots,
          message: `${slots[0].teacher} on kahdessa paikassa samaan aikaan`
        });
      }
    });

    // Check room conflicts
    const roomSlots = new Map<string, ScheduleSlot[]>();
    scheduleData.forEach(slot => {
      const key = `${slot.room}-${slot.day}-${slot.period}`;
      if (!roomSlots.has(key)) {
        roomSlots.set(key, []);
      }
      roomSlots.get(key)!.push(slot);
    });
    
    roomSlots.forEach((slots, key) => {
      if (slots.length > 1) {
        foundConflicts.push({
          type: 'room',
          slots,
          message: `Luokka ${slots[0].room} on varattu kahdelle ryhmälle`
        });
      }
    });

    return foundConflicts;
  };

  const handleDragStart = (slot: ScheduleSlot) => {
    setDraggedSlot(slot);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (day: number, period: number) => {
    if (!draggedSlot) return;

    const updatedSchedule = schedule.map(slot => 
      slot.id === draggedSlot.id 
        ? { ...slot, day, period, startTime: PERIODS[period - 1].start, endTime: PERIODS[period - 1].end }
        : slot
    );

    setSchedule(updatedSchedule);
    setConflicts(detectConflicts(updatedSchedule));
    setDraggedSlot(null);

    toast({
      title: "Tunti siirretty",
      description: `${draggedSlot.subject} siirretty ${DAYS[day]}, ${period}. tunti`,
    });
  };

  const handleAddLesson = () => {
    const teacher = mockTeachers.find(t => t.id === newLesson.teacherId);
    if (!teacher) return;

    const newSlot: ScheduleSlot = {
      id: Date.now().toString(),
      day: newLesson.day,
      period: newLesson.period,
      subject: newLesson.subject,
      teacher: teacher.name,
      teacherId: teacher.id,
      class: selectedClass,
      room: newLesson.room,
      startTime: PERIODS[newLesson.period - 1].start,
      endTime: PERIODS[newLesson.period - 1].end
    };

    const updatedSchedule = [...schedule, newSlot];
    setSchedule(updatedSchedule);
    setConflicts(detectConflicts(updatedSchedule));
    setShowAddModal(false);
    setNewLesson({ subject: '', teacherId: '', room: '', day: 0, period: 1 });

    toast({
      title: "Tunti lisätty",
      description: `${newSlot.subject} lisätty lukujärjestykseen`,
    });
  };

  const handleDeleteSlot = (slotId: string) => {
    const updatedSchedule = schedule.filter(s => s.id !== slotId);
    setSchedule(updatedSchedule);
    setConflicts(detectConflicts(updatedSchedule));
    
    toast({
      title: "Tunti poistettu",
      description: "Tunti on poistettu lukujärjestyksestä",
    });
  };

  const handleSaveSchedule = () => {
    // TODO: API call to save schedule
    toast({
      title: "Lukujärjestys tallennettu",
      description: "Muutokset on tallennettu onnistuneesti",
    });
  };

  const handleExportSchedule = () => {
    // TODO: Export to CSV/PDF
    toast({
      title: "Vienti aloitettu",
      description: "Lukujärjestys viedään PDF-muotoon",
    });
  };

  const getSlotForCell = (day: number, period: number) => {
    return schedule.find(s => s.day === day && s.period === period && s.class === selectedClass);
  };

  const getSubjectColor = (subject: string) => {
    const colors: Record<string, string> = {
      'Matematiikka': 'bg-blue-100 border-blue-300 text-blue-900',
      'Äidinkieli': 'bg-green-100 border-green-300 text-green-900',
      'Englanti': 'bg-purple-100 border-purple-300 text-purple-900',
      'Fysiikka': 'bg-orange-100 border-orange-300 text-orange-900',
      'Kemia': 'bg-pink-100 border-pink-300 text-pink-900',
      'Biologia': 'bg-teal-100 border-teal-300 text-teal-900',
      'Historia': 'bg-amber-100 border-amber-300 text-amber-900',
      'Liikunta': 'bg-red-100 border-red-300 text-red-900',
    };
    return colors[subject] || 'bg-gray-100 border-gray-300 text-gray-900';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Lukujärjestyksen hallinta</h2>
          <p className="text-gray-600 mt-1">Luo ja muokkaa lukujärjestyksiä</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportSchedule}>
            <Download className="w-4 h-4 mr-2" />
            Vie
          </Button>
          <Button variant="outline">
            <Upload className="w-4 h-4 mr-2" />
            Tuo
          </Button>
          <Button onClick={handleSaveSchedule} className="bg-[#003d82] hover:bg-[#0052a3]">
            <Save className="w-4 h-4 mr-2" />
            Tallenna
          </Button>
        </div>
      </div>

      {/* Conflicts Alert */}
      {conflicts.length > 0 && (
        <Card className="border-2 border-red-300 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-bold text-red-900 mb-2">
                  Löydettiin {conflicts.length} ristiriita{conflicts.length !== 1 ? 'a' : ''}
                </h3>
                <ul className="space-y-1">
                  {conflicts.map((conflict, idx) => (
                    <li key={idx} className="text-sm text-red-800">
                      • {conflict.message}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <Label htmlFor="class-select">Luokka</Label>
            <select
              id="class-select"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {mockClasses.map(cls => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="bg-green-600 hover:bg-green-700">
          <Plus className="w-4 h-4 mr-2" />
          Lisää tunti
        </Button>
      </div>

      {/* Grid View */}
      {viewMode === 'grid' && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 p-3 text-left font-semibold text-gray-700 min-w-[100px]">
                      Tunti
                    </th>
                    {DAYS.map((day, idx) => (
                      <th key={idx} className="border border-gray-300 p-3 text-center font-semibold text-gray-700 min-w-[180px]">
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PERIODS.map((period) => (
                    <tr key={period.number}>
                      <td className="border border-gray-300 p-3 bg-gray-50">
                        <div className="text-sm font-semibold text-gray-900">{period.number}.</div>
                        <div className="text-xs text-gray-600">{period.start}-{period.end}</div>
                      </td>
                      {DAYS.map((_, dayIdx) => {
                        const slot = getSlotForCell(dayIdx, period.number);
                        return (
                          <td
                            key={dayIdx}
                            className="border border-gray-300 p-2 hover:bg-gray-50 transition-colors"
                            onDragOver={handleDragOver}
                            onDrop={() => handleDrop(dayIdx, period.number)}
                          >
                            {slot ? (
                              <div
                                draggable
                                onDragStart={() => handleDragStart(slot)}
                                className={`p-3 rounded-lg border-2 cursor-move hover:shadow-md transition-shadow ${getSubjectColor(slot.subject)}`}
                              >
                                <div className="flex items-start justify-between mb-1">
                                  <p className="font-bold text-sm">{slot.subject}</p>
                                  <button
                                    onClick={() => handleDeleteSlot(slot.id)}
                                    className="text-red-600 hover:text-red-800"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                                <p className="text-xs opacity-90">{slot.teacher}</p>
                                <div className="flex items-center gap-1 mt-1">
                                  <MapPin className="w-3 h-3 opacity-70" />
                                  <p className="text-xs opacity-90">{slot.room}</p>
                                </div>
                              </div>
                            ) : (
                              <div className="h-24 flex items-center justify-center text-gray-400 text-xs">
                                Tyhjä
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="space-y-4">
          {DAYS.map((day, dayIdx) => (
            <Card key={dayIdx}>
              <CardHeader className="bg-gray-50">
                <CardTitle className="text-lg">{day}</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-2">
                  {schedule
                    .filter(s => s.day === dayIdx && s.class === selectedClass)
                    .sort((a, b) => a.period - b.period)
                    .map(slot => (
                      <div key={slot.id} className={`p-4 rounded-lg border-2 ${getSubjectColor(slot.subject)}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="text-center min-w-[60px]">
                              <Clock className="w-4 h-4 mx-auto mb-1" />
                              <p className="text-sm font-semibold">{slot.startTime}</p>
                            </div>
                            <div>
                              <p className="font-bold">{slot.subject}</p>
                              <p className="text-sm opacity-90">{slot.teacher}</p>
                              <div className="flex items-center gap-1 mt-1">
                                <MapPin className="w-3 h-3" />
                                <p className="text-sm">{slot.room}</p>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="text-red-600 hover:bg-red-50"
                              onClick={() => handleDeleteSlot(slot.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  {schedule.filter(s => s.day === dayIdx && s.class === selectedClass).length === 0 && (
                    <p className="text-center text-gray-500 py-8">Ei tunteja tälle päivälle</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Lesson Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full">
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b">
              <div className="flex items-center justify-between">
                <CardTitle>Lisää uusi tunti</CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowAddModal(false)}
                >
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div>
                <Label htmlFor="subject">Aine</Label>
                <Input
                  id="subject"
                  value={newLesson.subject}
                  onChange={(e) => setNewLesson({ ...newLesson, subject: e.target.value })}
                  placeholder="esim. Matematiikka"
                />
              </div>

              <div>
                <Label htmlFor="teacher">Opettaja</Label>
                <select
                  id="teacher"
                  value={newLesson.teacherId}
                  onChange={(e) => setNewLesson({ ...newLesson, teacherId: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Valitse opettaja</option>
                  {mockTeachers.map(teacher => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.name} ({teacher.subjects.join(', ')})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="room">Luokkahuone</Label>
                <select
                  id="room"
                  value={newLesson.room}
                  onChange={(e) => setNewLesson({ ...newLesson, room: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Valitse luokka</option>
                  {mockRooms.map(room => (
                    <option key={room} value={room}>{room}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="day">Päivä</Label>
                  <select
                    id="day"
                    value={newLesson.day}
                    onChange={(e) => setNewLesson({ ...newLesson, day: parseInt(e.target.value) })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {DAYS.map((day, idx) => (
                      <option key={idx} value={idx}>{day}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="period">Tunti</Label>
                  <select
                    id="period"
                    value={newLesson.period}
                    onChange={(e) => setNewLesson({ ...newLesson, period: parseInt(e.target.value) })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {PERIODS.map(period => (
                      <option key={period.number} value={period.number}>
                        {period.number}. ({period.start}-{period.end})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={() => setShowAddModal(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Peruuta
                </Button>
                <Button 
                  onClick={handleAddLesson}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  disabled={!newLesson.subject || !newLesson.teacherId || !newLesson.room}
                >
                  Lisää tunti
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
