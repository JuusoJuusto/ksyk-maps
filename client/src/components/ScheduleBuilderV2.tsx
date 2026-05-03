import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Save, Trash2, Copy, Download, Upload, AlertTriangle, CheckCircle2, FileText, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Types
interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  label: string;
}

interface Lesson {
  id: string;
  timeSlotId: string;
  day: number; // 0-4 (Mon-Fri)
  subject: string;
  teacher: string;
  room: string;
  group?: string;
  color: string;
}

interface ScheduleTemplate {
  id: string;
  name: string;
  timeSlots: TimeSlot[];
  lessons: Lesson[];
}

// Constants
const DEFAULT_TIME_SLOTS: TimeSlot[] = [
  { id: '1', startTime: '08:00', endTime: '08:45', label: '1. tunti' },
  { id: '2', startTime: '08:50', endTime: '09:35', label: '2. tunti' },
  { id: '3', startTime: '09:40', endTime: '10:25', label: '3. tunti' },
  { id: '4', startTime: '10:45', endTime: '11:30', label: '4. tunti' },
  { id: '5', startTime: '11:35', endTime: '12:20', label: '5. tunti' },
  { id: '6', startTime: '12:25', endTime: '13:10', label: 'Lounas' },
  { id: '7', startTime: '13:15', endTime: '14:00', label: '6. tunti' },
  { id: '8', startTime: '14:05', endTime: '14:50', label: '7. tunti' },
];

const SUBJECT_COLORS = [
  { name: 'Matematiikka', color: '#003d82' },
  { name: 'Äidinkieli', color: '#7cb342' },
  { name: 'Englanti', color: '#f57c00' },
  { name: 'Ruotsi', color: '#5e35b1' },
  { name: 'Fysiikka', color: '#00897b' },
  { name: 'Kemia', color: '#d32f2f' },
  { name: 'Biologia', color: '#1976d2' },
  { name: 'Maantieto', color: '#c2185b' },
  { name: 'Historia', color: '#795548' },
  { name: 'Yhteiskuntaoppi', color: '#607d8b' },
  { name: 'Uskonto', color: '#9c27b0' },
  { name: 'Liikunta', color: '#4caf50' },
  { name: 'Musiikki', color: '#ff9800' },
  { name: 'Kuvataide', color: '#e91e63' },
  { name: 'Käsityö', color: '#3f51b5' },
  { name: 'Kotitalous', color: '#009688' },
];

const DAYS = ['Maanantai', 'Tiistai', 'Keskiviikko', 'Torstai', 'Perjantai'];

export default function ScheduleBuilderV2() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Get current user from auth context
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userId = user.id || '';
  
  // State
  const [timeSlots] = useState<TimeSlot[]>(DEFAULT_TIME_SLOTS);
  const [selectedCell, setSelectedCell] = useState<{ day: number; timeSlotId: string } | null>(null);
  const [showLessonDialog, setShowLessonDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [conflicts, setConflicts] = useState<string[]>([]);
  const [draggedLesson, setDraggedLesson] = useState<Lesson | null>(null);
  const [templates, setTemplates] = useState<ScheduleTemplate[]>([]);
  
  // Form state
  const [lessonForm, setLessonForm] = useState({
    subject: '',
    teacher: '',
    room: '',
    group: '',
    color: '#003d82',
  });
  const [selectedClassId, setSelectedClassId] = useState<string>('all');

  // Fetch lessons from API
  const { data: lessons = [], isLoading } = useQuery({
    queryKey: ['schedule-builder', userId, selectedClassId],
    queryFn: async () => {
      if (!userId) return [];
      const response = await fetch(`/api/wilma/schedules/${userId}`);
      if (!response.ok) throw new Error('Failed to fetch schedules');
      const schedules = await response.json();
      
      // Transform API data to component format
      const allLessons = schedules.map((s: any) => ({
        id: s.id,
        timeSlotId: s.timeSlotId || '1',
        day: s.dayOfWeek,
        subject: s.subject,
        teacher: s.teacher || '',
        room: s.room || '',
        group: s.group || '',
        color: s.color || '#003d82',
        classId: s.classId || s.group, // Use classId or group for filtering
      }));
      
      // Filter by selected class if not "all"
      if (selectedClassId !== 'all') {
        return allLessons.filter((lesson: any) => 
          lesson.classId === selectedClassId || lesson.group === selectedClassId
        );
      }
      
      return allLessons;
    },
    enabled: !!userId,
  });

  // Fetch teachers for dropdown
  const { data: teachers = [] } = useQuery({
    queryKey: ['teachers'],
    queryFn: async () => {
      const response = await fetch('/api/wilma/teachers');
      if (!response.ok) return [];
      return await response.json();
    },
  });

  // Fetch classes for dropdown
  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const response = await fetch('/api/wilma/classes');
      if (!response.ok) return [];
      return await response.json();
    },
  });

  // Fetch rooms for dropdown
  const { data: rooms = [] } = useQuery({
    queryKey: ['rooms'],
    queryFn: async () => {
      const response = await fetch('/api/rooms');
      if (!response.ok) return [];
      return await response.json();
    },
  });

  // Create lesson mutation
  const createLesson = useMutation({
    mutationFn: async (lessonData: any) => {
      const response = await fetch('/api/wilma/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          dayOfWeek: lessonData.day,
          timeSlotId: lessonData.timeSlotId,
          subject: lessonData.subject,
          teacher: lessonData.teacher,
          room: lessonData.room,
          group: lessonData.group,
          color: lessonData.color,
        }),
      });
      if (!response.ok) throw new Error('Failed to create lesson');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule-builder'] });
      toast({
        title: "✅ Lisätty",
        description: "Uusi oppitunti lisätty",
      });
    },
  });

  // Update lesson mutation
  const updateLesson = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await fetch(`/api/wilma/schedules/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update lesson');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule-builder'] });
      toast({
        title: "✅ Päivitetty",
        description: "Oppitunti päivitetty",
      });
    },
  });

  // Delete lesson mutation
  const deleteLesson = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/wilma/schedules/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete lesson');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule-builder'] });
      toast({
        title: "🗑️ Poistettu",
        description: "Oppitunti poistettu",
      });
    },
  });

  // Detect conflicts whenever lessons change
  useEffect(() => {
    if (!lessons || lessons.length === 0) return;
    
    const foundConflicts: string[] = [];
    
    // Teacher conflicts
    const teacherSlots = new Map<string, Lesson[]>();
    lessons.forEach(lesson => {
      const key = `${lesson.teacher}-${lesson.timeSlotId}-${lesson.day}`;
      if (!teacherSlots.has(key)) teacherSlots.set(key, []);
      teacherSlots.get(key)!.push(lesson);
    });
    
    teacherSlots.forEach((lessonsInSlot, key) => {
      if (lessonsInSlot.length > 1) {
        const [teacher, timeSlotId, day] = key.split('-');
        const timeSlot = timeSlots.find(t => t.id === timeSlotId);
        foundConflicts.push(
          `${teacher} on kahdessa paikassa ${DAYS[parseInt(day)]} ${timeSlot?.label}`
        );
      }
    });
    
    // Room conflicts
    const roomSlots = new Map<string, Lesson[]>();
    lessons.forEach(lesson => {
      if (lesson.room) {
        const key = `${lesson.room}-${lesson.timeSlotId}-${lesson.day}`;
        if (!roomSlots.has(key)) roomSlots.set(key, []);
        roomSlots.get(key)!.push(lesson);
      }
    });
    
    roomSlots.forEach((lessonsInSlot, key) => {
      if (lessonsInSlot.length > 1) {
        const [room, timeSlotId, day] = key.split('-');
        const timeSlot = timeSlots.find(t => t.id === timeSlotId);
        foundConflicts.push(
          `Luokka ${room} on varattu kahdesti ${DAYS[parseInt(day)]} ${timeSlot?.label}`
        );
      }
    });
    
    setConflicts(foundConflicts);
  }, [lessons, timeSlots]);

  // Load templates on mount
  useEffect(() => {
    const savedTemplates = localStorage.getItem('schedule_templates_v2');
    if (savedTemplates) {
      try {
        setTemplates(JSON.parse(savedTemplates));
      } catch (e) {
        console.error('Failed to load templates:', e);
      }
    }
  }, []);

  // Save schedule (no longer needed - auto-saved via API)
  const saveSchedule = () => {
    toast({
      title: "✅ Tallennettu",
      description: "Lukujärjestys tallennettu automaattisesti",
    });
  };

  // Handle cell click
  const handleCellClick = (day: number, timeSlotId: string) => {
    const existingLesson = lessons.find(l => l.day === day && l.timeSlotId === timeSlotId);
    
    if (existingLesson) {
      setEditingLesson(existingLesson);
      setLessonForm({
        subject: existingLesson.subject,
        teacher: existingLesson.teacher,
        room: existingLesson.room,
        group: existingLesson.group || '',
        color: existingLesson.color,
      });
    } else {
      setEditingLesson(null);
      setLessonForm({
        subject: '',
        teacher: '',
        room: '',
        group: '',
        color: '#003d82',
      });
    }
    
    setSelectedCell({ day, timeSlotId });
    setShowLessonDialog(true);
  };

  // Save lesson
  const saveLesson = () => {
    if (!selectedCell) return;
    
    if (!lessonForm.subject) {
      toast({
        title: "❌ Virhe",
        description: "Oppiaine on pakollinen",
        variant: "destructive",
      });
      return;
    }

    const lessonData = {
      ...lessonForm,
      day: selectedCell.day,
      timeSlotId: selectedCell.timeSlotId,
    };

    if (editingLesson) {
      updateLesson.mutate({ id: editingLesson.id, data: lessonData });
    } else {
      createLesson.mutate(lessonData);
    }
    
    setShowLessonDialog(false);
    setSelectedCell(null);
  };

  // Delete lesson
  const deleteLessonHandler = () => {
    if (!editingLesson) return;
    
    deleteLesson.mutate(editingLesson.id);
    setShowLessonDialog(false);
    setEditingLesson(null);
  };

  // Copy lesson to all days
  const copyLessonToAllDays = (lesson: Lesson) => {
    const newLessons: any[] = [];
    for (let day = 0; day < 5; day++) {
      if (day !== lesson.day) {
        const existingLesson = lessons.find(l => l.day === day && l.timeSlotId === lesson.timeSlotId);
        if (!existingLesson) {
          newLessons.push({
            subject: lesson.subject,
            teacher: lesson.teacher,
            room: lesson.room,
            group: lesson.group,
            color: lesson.color,
            day,
            timeSlotId: lesson.timeSlotId,
          });
        }
      }
    }
    
    // Create all lessons
    Promise.all(newLessons.map(l => createLesson.mutateAsync(l)))
      .then(() => {
        toast({
          title: "📋 Kopioitu",
          description: `Oppitunti kopioitu ${newLessons.length} päivälle`,
        });
      });
  };

  // Drag handlers
  const handleDragStart = (lesson: Lesson) => {
    setDraggedLesson(lesson);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (day: number, timeSlotId: string) => {
    if (!draggedLesson) return;
    
    const existingLesson = lessons.find(l => l.day === day && l.timeSlotId === timeSlotId);
    if (existingLesson) {
      toast({
        title: "❌ Virhe",
        description: "Kohderuutu on jo varattu",
        variant: "destructive",
      });
      setDraggedLesson(null);
      return;
    }
    
    updateLesson.mutate({
      id: draggedLesson.id,
      data: {
        ...draggedLesson,
        day,
        timeSlotId,
      }
    });
    
    setDraggedLesson(null);
  };

  // Save as template
  const saveAsTemplate = () => {
    const templateName = prompt("Anna lukujärjestyspohjan nimi:");
    if (!templateName) return;
    
    const newTemplate: ScheduleTemplate = {
      id: Date.now().toString(),
      name: templateName,
      timeSlots,
      lessons,
    };
    
    const updatedTemplates = [...templates, newTemplate];
    setTemplates(updatedTemplates);
    localStorage.setItem('schedule_templates_v2', JSON.stringify(updatedTemplates));
    
    toast({
      title: "✅ Pohja tallennettu",
      description: `Lukujärjestyspohja "${templateName}" tallennettu`,
    });
  };

  // Load template
  const loadTemplate = (template: ScheduleTemplate) => {
    if (lessons.length > 0) {
      if (!confirm("Nykyinen lukujärjestys korvataan pohjalla. Haluatko jatkaa?")) {
        return;
      }
    }
    
    // Delete all current lessons and create new ones from template
    Promise.all(lessons.map(l => deleteLesson.mutateAsync(l.id)))
      .then(() => Promise.all(template.lessons.map(l => createLesson.mutateAsync(l))))
      .then(() => {
        setShowTemplateDialog(false);
        toast({
          title: "✅ Pohja ladattu",
          description: `Lukujärjestyspohja "${template.name}" ladattu`,
        });
      });
  };

  // Delete template
  const deleteTemplate = (templateId: string) => {
    const updatedTemplates = templates.filter(t => t.id !== templateId);
    setTemplates(updatedTemplates);
    localStorage.setItem('schedule_templates_v2', JSON.stringify(updatedTemplates));
    
    toast({
      title: "🗑️ Poistettu",
      description: "Lukujärjestyspohja poistettu",
    });
  };

  // Export schedule
  const exportSchedule = () => {
    const data = { timeSlots, lessons };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lukujarjestys_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    toast({
      title: "📥 Viety",
      description: "Lukujärjestys viety tiedostoon",
    });
  };

  // Import schedule
  const importSchedule = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        setLessons(data.lessons || []);
        toast({
          title: "📤 Tuotu",
          description: "Lukujärjestys tuotu onnistuneesti",
        });
      } catch (error) {
        toast({
          title: "❌ Virhe",
          description: "Tiedoston tuonti epäonnistui",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
  };

  // Get lesson for cell
  const getLessonForCell = (day: number, timeSlotId: string) => {
    return lessons.find(l => l.day === day && l.timeSlotId === timeSlotId);
  };

  // Get subject color
  const getSubjectColor = (subject: string) => {
    const found = SUBJECT_COLORS.find(s => s.name === subject);
    return found ? found.color : '#003d82';
  };

  // Handle subject change
  const handleSubjectChange = (subject: string) => {
    setLessonForm({
      ...lessonForm,
      subject,
      color: getSubjectColor(subject),
    });
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-4">
      {/* Header - Kurre Style: Clean and Minimal */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-1">
              Lukujärjestyksen rakentaja
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Luo ja hallinnoi lukujärjestyksiä helposti
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {/* Class Selector */}
            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Valitse luokka" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Kaikki luokat</SelectItem>
                {classes.map((cls: any) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.name} ({cls.studentCount || 0} oppilasta)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={saveSchedule}
              className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Save className="w-4 h-4 mr-1.5" />
              Tallenna
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={saveAsTemplate}
              className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <FileText className="w-4 h-4 mr-1.5" />
              Tallenna pohjaksi
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => setShowTemplateDialog(true)}
              className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <FileText className="w-4 h-4 mr-1.5" />
              Pohjat ({templates.length})
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={exportSchedule}
              className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Download className="w-4 h-4 mr-1.5" />
              Vie
            </Button>
            <label>
              <Button 
                size="sm" 
                variant="ghost" 
                as="span"
                className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
              >
                <Upload className="w-4 h-4 mr-1.5" />
                Tuo
              </Button>
              <input
                type="file"
                accept=".json"
                onChange={importSchedule}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Conflicts Alert - Kurre Style: Subtle and Clean */}
      {conflicts.length > 0 ? (
        <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-red-900 dark:text-red-200 mb-2">
                Löydetty {conflicts.length} konfliktia
              </p>
              <ul className="space-y-1.5">
                {conflicts.map((conflict, idx) => (
                  <li key={idx} className="text-sm text-red-700 dark:text-red-300 flex items-start gap-2">
                    <span className="text-red-400 dark:text-red-500 mt-0.5">•</span>
                    <span>{conflict}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : lessons.length > 0 ? (
        <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
            <p className="font-medium text-green-900 dark:text-green-200">
              Ei konflikteja! Lukujärjestys on valmis.
            </p>
          </div>
        </div>
      ) : null}

      {/* Schedule Grid - Kurre Style: Clean, Minimal, Professional */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/50">
                <th className="border-b border-gray-200 dark:border-gray-700 p-4 text-left text-sm font-medium text-gray-700 dark:text-gray-300 w-32">
                  Aika
                </th>
                {DAYS.map((day, index) => (
                  <th key={index} className="border-b border-gray-200 dark:border-gray-700 p-4 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {timeSlots.map((slot, slotIndex) => (
                <tr key={slot.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/30 transition-colors">
                  <td className="border-b border-gray-100 dark:border-gray-800 p-3 bg-gray-50/50 dark:bg-gray-900/20">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{slot.label}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {slot.startTime} - {slot.endTime}
                    </div>
                  </td>
                  {DAYS.map((_, dayIndex) => {
                    const lesson = getLessonForCell(dayIndex, slot.id);
                    return (
                      <td
                        key={dayIndex}
                        className="border-b border-gray-100 dark:border-gray-800 p-2 cursor-pointer hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-all"
                        onClick={() => handleCellClick(dayIndex, slot.id)}
                        onDragOver={handleDragOver}
                        onDrop={() => handleDrop(dayIndex, slot.id)}
                      >
                        {lesson ? (
                          <div
                            className="p-3 rounded-lg text-white text-xs h-full min-h-[90px] flex flex-col justify-between cursor-move shadow-sm hover:shadow-md transition-all"
                            style={{ backgroundColor: lesson.color }}
                            draggable
                            onDragStart={() => handleDragStart(lesson)}
                          >
                            <div>
                              <div className="font-semibold text-sm mb-1.5">{lesson.subject}</div>
                              {lesson.teacher && (
                                <div className="opacity-90 text-xs flex items-center gap-1">
                                  <span className="opacity-75">👤</span> {lesson.teacher}
                                </div>
                              )}
                              {lesson.room && (
                                <div className="opacity-90 text-xs flex items-center gap-1 mt-0.5">
                                  <span className="opacity-75">📍</span> {lesson.room}
                                </div>
                              )}
                              {lesson.group && (
                                <div className="opacity-80 text-xs mt-1.5 pt-1.5 border-t border-white/20">
                                  👥 {lesson.group}
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 text-center text-gray-300 dark:text-gray-600 text-xs min-h-[90px] flex items-center justify-center hover:text-blue-500 dark:hover:text-blue-400 transition-colors rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50">
                            <Plus className="w-5 h-5" />
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
      </div>

      {/* Statistics */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-4">Tilastot</h3>
        <div className="grid grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl font-semibold text-blue-600 dark:text-blue-400">{lessons.length}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Oppituntia</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-semibold text-green-600 dark:text-green-400">
              {new Set(lessons.map(l => l.subject)).size}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Oppiainetta</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-semibold text-orange-600 dark:text-orange-400">
              {new Set(lessons.map(l => l.teacher)).size}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Opettajaa</div>
          </div>
        </div>
      </div>

      {/* Lesson Dialog - Kurre Style: Clean and Professional */}
      <Dialog open={showLessonDialog} onOpenChange={setShowLessonDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {editingLesson ? 'Muokkaa oppituntia' : 'Lisää oppitunti'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Oppiaine *</Label>
              <Select value={lessonForm.subject} onValueChange={handleSubjectChange}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Valitse oppiaine" />
                </SelectTrigger>
                <SelectContent>
                  {SUBJECT_COLORS.map((subject) => (
                    <SelectItem key={subject.name} value={subject.name}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: subject.color }}
                        />
                        {subject.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Opettaja</Label>
              <Select value={lessonForm.teacher} onValueChange={(value) => setLessonForm({ ...lessonForm, teacher: value })}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Valitse opettaja" />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map((teacher: any) => (
                    <SelectItem key={teacher.id} value={`${teacher.firstName} ${teacher.lastName}`}>
                      {teacher.firstName} {teacher.lastName} {teacher.department && `• ${teacher.department}`}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">Muu opettaja...</SelectItem>
                </SelectContent>
              </Select>
              {lessonForm.teacher === 'custom' && (
                <Input
                  value={lessonForm.teacher}
                  onChange={(e) => setLessonForm({ ...lessonForm, teacher: e.target.value })}
                  placeholder="Kirjoita opettajan nimi"
                  className="mt-2"
                />
              )}
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Luokka</Label>
              <Select value={lessonForm.room} onValueChange={(value) => setLessonForm({ ...lessonForm, room: value })}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Valitse luokka" />
                </SelectTrigger>
                <SelectContent>
                  {rooms.map((room: any) => (
                    <SelectItem key={room.id} value={room.roomNumber}>
                      {room.roomNumber} • {room.building || 'Rakennus'}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">Muu luokka...</SelectItem>
                </SelectContent>
              </Select>
              {lessonForm.room === 'custom' && (
                <Input
                  value={lessonForm.room}
                  onChange={(e) => setLessonForm({ ...lessonForm, room: e.target.value })}
                  placeholder="Kirjoita luokan numero"
                  className="mt-2"
                />
              )}
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Ryhmä (valinnainen)</Label>
              <Input
                value={lessonForm.group}
                onChange={(e) => setLessonForm({ ...lessonForm, group: e.target.value })}
                placeholder="esim. Ryhmä A"
                className="mt-1.5"
              />
            </div>
          </div>
          <DialogFooter className="flex justify-between gap-2">
            <div className="flex gap-2">
              {editingLesson && (
                <>
                  <Button 
                    variant="outline" 
                    onClick={deleteLessonHandler}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="w-4 h-4 mr-1.5" />
                    Poista
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (editingLesson) {
                        copyLessonToAllDays(editingLesson);
                        setShowLessonDialog(false);
                      }
                    }}
                    className="text-gray-700 dark:text-gray-300"
                  >
                    <Copy className="w-4 h-4 mr-1.5" />
                    Kopioi kaikille
                  </Button>
                </>
              )}
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowLessonDialog(false)}
                className="text-gray-700 dark:text-gray-300"
              >
                Peruuta
              </Button>
              <Button 
                onClick={saveLesson} 
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Save className="w-4 h-4 mr-1.5" />
                Tallenna
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Dialog - Kurre Style */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Lukujärjestyspohjat
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4 max-h-[60vh] overflow-y-auto">
            {templates.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Ei tallennettuja pohjia</p>
                <p className="text-sm mt-1">Tallenna nykyinen lukujärjestys pohjaksi</p>
              </div>
            ) : (
              templates.map((template) => (
                <div key={template.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 dark:text-gray-100">{template.name}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {template.lessons.length} oppituntia • {new Set(template.lessons.map(l => l.subject)).size} oppiainetta
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => loadTemplate(template)}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        Lataa
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (confirm(`Haluatko varmasti poistaa pohjan "${template.name}"?`)) {
                            deleteTemplate(template.id);
                          }
                        }}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowTemplateDialog(false)}
              className="text-gray-700 dark:text-gray-300"
            >
              Sulje
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
