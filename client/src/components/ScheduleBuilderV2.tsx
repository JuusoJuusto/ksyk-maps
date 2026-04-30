import { useState, useEffect } from "react";
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
  
  // State
  const [timeSlots] = useState<TimeSlot[]>(DEFAULT_TIME_SLOTS);
  const [lessons, setLessons] = useState<Lesson[]>([]);
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

  // Load data on mount
  useEffect(() => {
    const saved = localStorage.getItem('schedule_builder_v2');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setLessons(data.lessons || []);
      } catch (e) {
        console.error('Failed to load schedule:', e);
      }
    }
    
    const savedTemplates = localStorage.getItem('schedule_templates_v2');
    if (savedTemplates) {
      try {
        setTemplates(JSON.parse(savedTemplates));
      } catch (e) {
        console.error('Failed to load templates:', e);
      }
    }
  }, []);

  // Detect conflicts whenever lessons change
  useEffect(() => {
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

  // Save schedule
  const saveSchedule = () => {
    const data = { timeSlots, lessons };
    localStorage.setItem('schedule_builder_v2', JSON.stringify(data));
    toast({
      title: "✅ Tallennettu",
      description: "Lukujärjestys tallennettu onnistuneesti",
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

    if (editingLesson) {
      setLessons(lessons.map(l => 
        l.id === editingLesson.id ? { ...l, ...lessonForm } : l
      ));
      toast({
        title: "✅ Päivitetty",
        description: "Oppitunti päivitetty",
      });
    } else {
      const newLesson: Lesson = {
        id: Date.now().toString(),
        day: selectedCell.day,
        timeSlotId: selectedCell.timeSlotId,
        ...lessonForm,
      };
      setLessons([...lessons, newLesson]);
      toast({
        title: "✅ Lisätty",
        description: "Uusi oppitunti lisätty",
      });
    }
    
    setShowLessonDialog(false);
    setSelectedCell(null);
  };

  // Delete lesson
  const deleteLesson = () => {
    if (!editingLesson) return;
    
    setLessons(lessons.filter(l => l.id !== editingLesson.id));
    setShowLessonDialog(false);
    setEditingLesson(null);
    toast({
      title: "🗑️ Poistettu",
      description: "Oppitunti poistettu",
    });
  };

  // Copy lesson to all days
  const copyLessonToAllDays = (lesson: Lesson) => {
    const newLessons: Lesson[] = [];
    for (let day = 0; day < 5; day++) {
      if (day !== lesson.day) {
        const existingLesson = lessons.find(l => l.day === day && l.timeSlotId === lesson.timeSlotId);
        if (!existingLesson) {
          newLessons.push({
            ...lesson,
            id: `${Date.now()}-${day}`,
            day,
          });
        }
      }
    }
    setLessons([...lessons, ...newLessons]);
    toast({
      title: "📋 Kopioitu",
      description: `Oppitunti kopioitu ${newLessons.length} päivälle`,
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
    
    setLessons(lessons.map(l => 
      l.id === draggedLesson.id ? { ...l, day, timeSlotId } : l
    ));
    
    toast({
      title: "✅ Siirretty",
      description: "Oppitunti siirretty uuteen paikkaan",
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
    
    setLessons(template.lessons);
    setShowTemplateDialog(false);
    
    toast({
      title: "✅ Pohja ladattu",
      description: `Lukujärjestyspohja "${template.name}" ladattu`,
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
    <div className="space-y-4">
      {/* Header */}
      <Card className="border-[#dddddd] shadow-md">
        <CardHeader className="bg-gradient-to-r from-[#003d82] to-[#0052a3] text-white">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <CardTitle className="text-xl">📅 Lukujärjestyksen rakentaja</CardTitle>
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" variant="secondary" onClick={saveSchedule}>
                <Save className="w-4 h-4 mr-1" />
                Tallenna
              </Button>
              <Button size="sm" variant="secondary" onClick={saveAsTemplate}>
                <FileText className="w-4 h-4 mr-1" />
                Tallenna pohjaksi
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setShowTemplateDialog(true)}>
                <FileText className="w-4 h-4 mr-1" />
                Pohjat ({templates.length})
              </Button>
              <Button size="sm" variant="secondary" onClick={exportSchedule}>
                <Download className="w-4 h-4 mr-1" />
                Vie
              </Button>
              <label>
                <Button size="sm" variant="secondary" as="span">
                  <Upload className="w-4 h-4 mr-1" />
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
        </CardHeader>
      </Card>

      {/* Conflicts Alert */}
      {conflicts.length > 0 ? (
        <Alert variant="destructive" className="border-red-300 bg-red-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-semibold mb-2">⚠️ Löydetty {conflicts.length} konfliktia:</div>
            <ul className="list-disc list-inside space-y-1">
              {conflicts.map((conflict, idx) => (
                <li key={idx} className="text-sm">{conflict}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : lessons.length > 0 ? (
        <Alert className="border-green-300 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <div className="font-semibold">✅ Ei konflikteja! Lukujärjestys on valmis.</div>
          </AlertDescription>
        </Alert>
      ) : null}

      {/* Schedule Grid */}
      <Card className="border-[#dddddd] shadow-md overflow-x-auto">
        <CardContent className="p-0">
          <table className="w-full border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700">
                <th className="border border-gray-300 dark:border-gray-600 p-3 text-sm font-semibold w-32">
                  Aika
                </th>
                {DAYS.map((day, index) => (
                  <th key={index} className="border border-gray-300 dark:border-gray-600 p-3 text-sm font-semibold">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {timeSlots.map((slot) => (
                <tr key={slot.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <td className="border border-gray-300 dark:border-gray-600 p-2 text-xs bg-gray-50 dark:bg-gray-900">
                    <div className="font-semibold text-gray-900 dark:text-gray-100">{slot.label}</div>
                    <div className="text-gray-600 dark:text-gray-400 text-xs">
                      {slot.startTime} - {slot.endTime}
                    </div>
                  </td>
                  {DAYS.map((_, dayIndex) => {
                    const lesson = getLessonForCell(dayIndex, slot.id);
                    return (
                      <td
                        key={dayIndex}
                        className="border border-gray-300 dark:border-gray-600 p-1 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                        onClick={() => handleCellClick(dayIndex, slot.id)}
                        onDragOver={handleDragOver}
                        onDrop={() => handleDrop(dayIndex, slot.id)}
                      >
                        {lesson ? (
                          <div
                            className="p-3 rounded-lg text-white text-xs h-full min-h-[80px] flex flex-col justify-between cursor-move shadow-sm hover:shadow-md transition-shadow"
                            style={{ backgroundColor: lesson.color }}
                            draggable
                            onDragStart={() => handleDragStart(lesson)}
                          >
                            <div>
                              <div className="font-bold text-sm mb-1">{lesson.subject}</div>
                              {lesson.teacher && (
                                <div className="opacity-90 text-xs">👤 {lesson.teacher}</div>
                              )}
                              {lesson.room && (
                                <div className="opacity-90 text-xs">📍 {lesson.room}</div>
                              )}
                              {lesson.group && (
                                <div className="opacity-75 text-xs mt-1">👥 {lesson.group}</div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 text-center text-gray-400 dark:text-gray-600 text-xs min-h-[80px] flex items-center justify-center hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
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
        </CardContent>
      </Card>

      {/* Statistics */}
      <Card className="border-[#dddddd]">
        <CardHeader>
          <CardTitle className="text-base">📊 Tilastot</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-3xl font-bold text-[#003d82]">{lessons.length}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Oppituntia</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-[#7cb342]">
                {new Set(lessons.map(l => l.subject)).size}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Oppiainetta</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-[#f57c00]">
                {new Set(lessons.map(l => l.teacher)).size}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Opettajaa</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lesson Dialog */}
      <Dialog open={showLessonDialog} onOpenChange={setShowLessonDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingLesson ? '✏️ Muokkaa oppituntia' : '➕ Lisää oppitunti'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Oppiaine *</Label>
              <Select value={lessonForm.subject} onValueChange={handleSubjectChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Valitse oppiaine" />
                </SelectTrigger>
                <SelectContent>
                  {SUBJECT_COLORS.map((subject) => (
                    <SelectItem key={subject.name} value={subject.name}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded"
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
              <Label>Opettaja</Label>
              <Input
                value={lessonForm.teacher}
                onChange={(e) => setLessonForm({ ...lessonForm, teacher: e.target.value })}
                placeholder="esim. M. Virtanen"
              />
            </div>
            <div>
              <Label>Luokka</Label>
              <Input
                value={lessonForm.room}
                onChange={(e) => setLessonForm({ ...lessonForm, room: e.target.value })}
                placeholder="esim. A201"
              />
            </div>
            <div>
              <Label>Ryhmä (valinnainen)</Label>
              <Input
                value={lessonForm.group}
                onChange={(e) => setLessonForm({ ...lessonForm, group: e.target.value })}
                placeholder="esim. Ryhmä A"
              />
            </div>
          </div>
          <DialogFooter className="flex justify-between">
            <div className="flex gap-2">
              {editingLesson && (
                <>
                  <Button variant="destructive" onClick={deleteLesson}>
                    <Trash2 className="w-4 h-4 mr-1" />
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
                  >
                    <Copy className="w-4 h-4 mr-1" />
                    Kopioi kaikille
                  </Button>
                </>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowLessonDialog(false)}>
                <X className="w-4 h-4 mr-1" />
                Peruuta
              </Button>
              <Button onClick={saveLesson} className="bg-[#003d82] hover:bg-[#002d5f]">
                <Save className="w-4 h-4 mr-1" />
                Tallenna
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>📚 Lukujärjestyspohjat</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4 max-h-[60vh] overflow-y-auto">
            {templates.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Ei tallennettuja pohjia</p>
                <p className="text-sm mt-1">Tallenna nykyinen lukujärjestys pohjaksi</p>
              </div>
            ) : (
              templates.map((template) => (
                <Card key={template.id} className="border-[#dddddd]">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{template.name}</h3>
                        <p className="text-sm text-gray-600">
                          {template.lessons.length} oppituntia • {new Set(template.lessons.map(l => l.subject)).size} oppiainetta
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => loadTemplate(template)}
                          className="bg-[#003d82] hover:bg-[#002d5f]"
                        >
                          Lataa
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            if (confirm(`Haluatko varmasti poistaa pohjan "${template.name}"?`)) {
                              deleteTemplate(template.id);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTemplateDialog(false)}>
              Sulje
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
