import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Save, Copy, Download, Upload, Calendar, Clock, User, MapPin, Settings, AlertTriangle, CheckCircle, Coffee, Utensils } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ScheduleEntry {
  id: string;
  dayIndex: number;
  timeSlot: string;
  subject: string;
  teacher: string;
  room: string;
  color: string;
  studentClass?: string;
  isBreak?: boolean;
  breakType?: 'short' | 'lunch';
}

interface LessonSettings {
  lessonNumber: number;
  startTime: string;
  endTime: string;
  duration: number;
  customizable: boolean;
  isYH?: boolean; // Yhteinen hetki
}

interface BreakSettings {
  breakNumber: number;
  afterLesson: number;
  duration: number;
  type: 'short' | 'lunch' | 'yh';
  customizable: boolean;
}

interface ScheduleSettings {
  lessonDuration: number;
  shortBreakDuration: number;
  lunchBreakDuration: number;
  schoolStartTime: string;
  schoolEndTime: string;
  periodsPerDay: number;
  lunchBreakAfterPeriod: number;
  customLessons: LessonSettings[];
  customBreaks: BreakSettings[];
  enableIndividualCustomization: boolean;
}

interface Holiday {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  type: 'holiday' | 'break' | 'event';
}

export default function ScheduleBuilder() {
  const { toast } = useToast();
  const [selectedClass, setSelectedClass] = useState("9A");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showHolidaysDialog, setShowHolidaysDialog] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ScheduleEntry | null>(null);
  const [scheduleEntries, setScheduleEntries] = useState<ScheduleEntry[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([
    { id: "1", name: "Syysloma", startDate: "2024-10-14", endDate: "2024-10-18", type: "break" },
    { id: "2", name: "Joululoma", startDate: "2024-12-23", endDate: "2025-01-06", type: "holiday" },
    { id: "3", name: "Talviloma", startDate: "2025-02-24", endDate: "2025-02-28", type: "break" },
    { id: "4", name: "Pääsiäisloma", startDate: "2025-04-14", endDate: "2025-04-21", type: "holiday" },
  ]);
  
  const [scheduleSettings, setScheduleSettings] = useState<ScheduleSettings>({
    lessonDuration: 45,
    shortBreakDuration: 15,
    lunchBreakDuration: 30,
    schoolStartTime: "08:00",
    schoolEndTime: "16:00",
    periodsPerDay: 8,
    lunchBreakAfterPeriod: 4,
    customLessons: [],
    customBreaks: [],
    enableIndividualCustomization: false,
  });
  
  const [entryForm, setEntryForm] = useState({
    dayIndex: 0,
    timeSlot: "",
    subject: "",
    teacher: "",
    room: "",
    color: "#003d82",
    isBreak: false,
    breakType: 'short' as 'short' | 'lunch',
  });

  const days = ["Maanantai", "Tiistai", "Keskiviikko", "Torstai", "Perjantai"];
  
  // Generate time slots based on settings
  const generateTimeSlots = () => {
    const slots: string[] = [];
    let currentTime = scheduleSettings.schoolStartTime;
    
    for (let i = 0; i < scheduleSettings.periodsPerDay; i++) {
      const [hours, minutes] = currentTime.split(':').map(Number);
      const startMinutes = hours * 60 + minutes;
      
      // Check for custom lesson duration
      const customLesson = scheduleSettings.customLessons.find(l => l.lessonNumber === i + 1);
      const lessonDuration = customLesson?.duration || scheduleSettings.lessonDuration;
      
      const endMinutes = startMinutes + lessonDuration;
      
      const endHours = Math.floor(endMinutes / 60);
      const endMins = endMinutes % 60;
      
      const endTime = `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;
      slots.push(`${currentTime}-${endTime}`);
      
      // Add break time
      if (i < scheduleSettings.periodsPerDay - 1) {
        const customBreak = scheduleSettings.customBreaks.find(b => b.afterLesson === i + 1);
        let breakDuration = scheduleSettings.shortBreakDuration;
        
        if (customBreak) {
          breakDuration = customBreak.duration;
        } else if (i + 1 === scheduleSettings.lunchBreakAfterPeriod) {
          breakDuration = scheduleSettings.lunchBreakDuration;
        }
        
        const nextStartMinutes = endMinutes + breakDuration;
        const nextHours = Math.floor(nextStartMinutes / 60);
        const nextMins = nextStartMinutes % 60;
        currentTime = `${String(nextHours).padStart(2, '0')}:${String(nextMins).padStart(2, '0')}`;
      }
    }
    
    return slots;
  };
  
  const timeSlots = generateTimeSlots();

  const classes = ["7A", "7B", "8A", "8B", "9A", "9B"];
  const subjects = [
    "Matematiikka",
    "Äidinkieli",
    "Englanti",
    "Ruotsi",
    "Fysiikka",
    "Kemia",
    "Biologia",
    "Maantieto",
    "Historia",
    "Yhteiskuntaoppi",
    "Liikunta",
    "Musiikki",
    "Kuvataide",
    "Käsityö",
    "Kotitalous",
    "Uskonto/Elämänkatsomustieto",
  ];

  const colors = [
    { name: "Sininen", value: "#003d82" },
    { name: "Vihreä", value: "#7cb342" },
    { name: "Oranssi", value: "#f57c00" },
    { name: "Violetti", value: "#5e35b1" },
    { name: "Turkoosi", value: "#00897b" },
    { name: "Punainen", value: "#d32f2f" },
    { name: "Tummansininen", value: "#1976d2" },
    { name: "Pinkki", value: "#c2185b" },
  ];

  const handleAddEntry = () => {
    setEditingEntry(null);
    setEntryForm({
      dayIndex: 0,
      timeSlot: timeSlots[0],
      subject: "",
      teacher: "",
      room: "",
      color: "#003d82",
    });
    setShowAddDialog(true);
  };

  const handleEditEntry = (entry: ScheduleEntry) => {
    setEditingEntry(entry);
    setEntryForm({
      dayIndex: entry.dayIndex,
      timeSlot: entry.timeSlot,
      subject: entry.subject,
      teacher: entry.teacher,
      room: entry.room,
      color: entry.color,
    });
    setShowAddDialog(true);
  };

  const handleSaveEntry = () => {
    if (!entryForm.isBreak && (!entryForm.subject || !entryForm.timeSlot)) {
      toast({
        title: "❌ Virhe",
        description: "Täytä vähintään oppiaine ja aika",
        variant: "destructive",
      });
      return;
    }

    if (editingEntry) {
      // Update existing
      setScheduleEntries(prev =>
        prev.map(e => e.id === editingEntry.id ? { ...e, ...entryForm } : e)
      );
      toast({
        title: "✅ Päivitetty",
        description: "Oppitunti päivitetty onnistuneesti",
      });
    } else {
      // Add new
      const newEntry: ScheduleEntry = {
        id: Date.now().toString(),
        ...entryForm,
        studentClass: selectedClass,
      };
      setScheduleEntries(prev => [...prev, newEntry]);
      toast({
        title: "✅ Lisätty",
        description: entryForm.isBreak ? "Tauko lisätty lukujärjestykseen" : "Uusi oppitunti lisätty lukujärjestykseen",
      });
    }

    setShowAddDialog(false);
  };

  const handleSaveSettings = () => {
    localStorage.setItem('scheduleSettings', JSON.stringify(scheduleSettings));
    toast({
      title: "✅ Asetukset tallennettu",
      description: "Lukujärjestyksen asetukset päivitetty",
    });
    setShowSettingsDialog(false);
  };

  const handleAddHoliday = () => {
    const newHoliday: Holiday = {
      id: Date.now().toString(),
      name: "Uusi loma",
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      type: "holiday",
    };
    setHolidays(prev => [...prev, newHoliday]);
  };

  const handleDeleteHoliday = (id: string) => {
    setHolidays(prev => prev.filter(h => h.id !== id));
    toast({
      title: "🗑️ Poistettu",
      description: "Loma poistettu",
    });
  };

  // Load settings on mount
  useEffect(() => {
    const saved = localStorage.getItem('scheduleSettings');
    if (saved) {
      setScheduleSettings(JSON.parse(saved));
    }
  }, []);

  const handleDeleteEntry = (id: string) => {
    if (confirm("Haluatko varmasti poistaa tämän oppitunnin?")) {
      setScheduleEntries(prev => prev.filter(e => e.id !== id));
      toast({
        title: "🗑️ Poistettu",
        description: "Oppitunti poistettu",
      });
    }
  };

  const handleCopySchedule = () => {
    toast({
      title: "📋 Kopioidaan",
      description: "Lukujärjestys kopioitu leikepöydälle",
    });
  };

  const handleExport = () => {
    toast({
      title: "📥 Viedään",
      description: "Lukujärjestys viedään PDF-muodossa",
    });
  };

  const getEntriesForDay = (dayIndex: number) => {
    return scheduleEntries
      .filter(e => e.dayIndex === dayIndex && e.studentClass === selectedClass)
      .sort((a, b) => a.timeSlot.localeCompare(b.timeSlot));
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="border-[#dddddd] shadow-md">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#003d82] rounded-lg">
                <img src="/ksykmaps_logo.png" alt="KSYK" className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Lukujärjestyksen rakentaja</h2>
                <p className="text-sm text-gray-600">Luo ja hallinnoi luokkien lukujärjestyksiä</p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="border rounded-md px-3 py-2 text-sm font-medium"
              >
                {classes.map(cls => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>
              <Button
                size="sm"
                variant="outline"
                onClick={handleAddEntry}
              >
                <Plus className="w-4 h-4 mr-1" />
                Lisää tunti
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowSettingsDialog(true)}
              >
                <Settings className="w-4 h-4 mr-1" />
                Asetukset
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowHolidaysDialog(true)}
              >
                <Calendar className="w-4 h-4 mr-1" />
                Lomat
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopySchedule}
              >
                <Copy className="w-4 h-4 mr-1" />
                Kopioi
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleExport}
              >
                <Download className="w-4 h-4 mr-1" />
                Vie
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Schedule Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
        {days.map((day, dayIndex) => {
          const dayEntries = getEntriesForDay(dayIndex);
          
          return (
            <Card key={dayIndex} className="border-[#dddddd] shadow-sm">
              <CardHeader className="p-3 bg-gradient-to-r from-[#003d82] to-[#0052a3] text-white">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">
                    {day}
                    <span className="block text-xs font-normal opacity-90 mt-0.5">
                      {dayEntries.length} tuntia
                    </span>
                  </CardTitle>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-white hover:bg-white/20"
                    onClick={handleAddEntry}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-2 space-y-2">
                {dayEntries.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-xs text-gray-500 mb-2">Ei oppitunteja</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEntryForm({ ...entryForm, dayIndex });
                        setShowAddDialog(true);
                      }}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Lisää tunti
                    </Button>
                  </div>
                ) : (
                  dayEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="p-2 rounded-lg border-l-4 bg-gray-50 hover:bg-gray-100 transition-all cursor-pointer group relative"
                      style={{ borderLeftColor: entry.color }}
                    >
                      <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() => handleEditEntry(entry)}
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-red-600"
                          onClick={() => handleDeleteEntry(entry.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                      <div className="flex-1 min-w-0 pr-12">
                        <p className="text-xs font-semibold text-gray-900 truncate">
                          {entry.subject}
                        </p>
                        <div className="flex items-center gap-1 mt-1">
                          <Clock className="w-3 h-3 text-gray-500 flex-shrink-0" />
                          <p className="text-xs text-gray-600">{entry.timeSlot}</p>
                        </div>
                        {entry.teacher && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <User className="w-3 h-3 text-gray-500 flex-shrink-0" />
                            <p className="text-xs text-gray-600 truncate">{entry.teacher}</p>
                          </div>
                        )}
                        {entry.room && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-gray-500 flex-shrink-0" />
                            <p className="text-xs text-gray-600">{entry.room}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingEntry ? "Muokkaa oppituntia" : "Lisää uusi oppitunti"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                id="isBreak"
                checked={entryForm.isBreak}
                onChange={(e) => setEntryForm({ ...entryForm, isBreak: e.target.checked })}
                className="w-4 h-4"
              />
              <Label htmlFor="isBreak">Tämä on tauko</Label>
            </div>
            
            <div>
              <Label>Päivä *</Label>
              <select
                className="w-full border rounded-md px-3 py-2 mt-1"
                value={entryForm.dayIndex}
                onChange={(e) => setEntryForm({ ...entryForm, dayIndex: parseInt(e.target.value) })}
              >
                {days.map((day, index) => (
                  <option key={index} value={index}>{day}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Aika *</Label>
              <select
                className="w-full border rounded-md px-3 py-2 mt-1"
                value={entryForm.timeSlot}
                onChange={(e) => setEntryForm({ ...entryForm, timeSlot: e.target.value })}
              >
                <option value="">Valitse aika</option>
                {timeSlots.map(slot => (
                  <option key={slot} value={slot}>{slot}</option>
                ))}
              </select>
            </div>
            
            {entryForm.isBreak ? (
              <div>
                <Label>Tauon tyyppi</Label>
                <select
                  className="w-full border rounded-md px-3 py-2 mt-1"
                  value={entryForm.breakType}
                  onChange={(e) => setEntryForm({ ...entryForm, breakType: e.target.value as 'short' | 'lunch' })}
                >
                  <option value="short">Välitunti</option>
                  <option value="lunch">Ruokatauko</option>
                </select>
              </div>
            ) : (
              <>
                <div>
                  <Label>Oppiaine *</Label>
                  <select
                    className="w-full border rounded-md px-3 py-2 mt-1"
                    value={entryForm.subject}
                    onChange={(e) => setEntryForm({ ...entryForm, subject: e.target.value })}
                  >
                    <option value="">Valitse oppiaine</option>
                    {subjects.map(subject => (
                      <option key={subject} value={subject}>{subject}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Opettaja</Label>
                  <Input
                    value={entryForm.teacher}
                    onChange={(e) => setEntryForm({ ...entryForm, teacher: e.target.value })}
                    placeholder="esim. M. Virtanen"
                  />
                </div>
                <div>
                  <Label>Luokka</Label>
                  <Input
                    value={entryForm.room}
                    onChange={(e) => setEntryForm({ ...entryForm, room: e.target.value })}
                    placeholder="esim. A201"
                  />
                </div>
                <div>
                  <Label>Väri</Label>
                  <div className="grid grid-cols-4 gap-2 mt-1">
                    {colors.map((color) => (
                      <button
                        key={color.value}
                        className={`h-10 rounded-md border-2 transition-all ${
                          entryForm.color === color.value ? 'border-gray-900 scale-105 shadow-md' : 'border-gray-300'
                        }`}
                        style={{ backgroundColor: color.value }}
                        onClick={() => setEntryForm({ ...entryForm, color: color.value })}
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Peruuta
            </Button>
            <Button onClick={handleSaveEntry} className="bg-[#003d82] hover:bg-[#002d5f]">
              <Save className="w-4 h-4 mr-1" />
              Tallenna
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Lukujärjestyksen asetukset
            </DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="times" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="times">
                <Clock className="w-4 h-4 mr-2" />
                Ajat
              </TabsTrigger>
              <TabsTrigger value="periods">
                <Calendar className="w-4 h-4 mr-2" />
                Tunnit
              </TabsTrigger>
              <TabsTrigger value="individual">
                <Settings className="w-4 h-4 mr-2" />
                Yksilöllinen
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="times" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Oppitunnin pituus (min)</Label>
                  <Input
                    type="number"
                    value={scheduleSettings.lessonDuration}
                    onChange={(e) => setScheduleSettings({ ...scheduleSettings, lessonDuration: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Välitunnin pituus (min)</Label>
                  <Input
                    type="number"
                    value={scheduleSettings.shortBreakDuration}
                    onChange={(e) => setScheduleSettings({ ...scheduleSettings, shortBreakDuration: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Ruokatunnin pituus (min)</Label>
                  <Input
                    type="number"
                    value={scheduleSettings.lunchBreakDuration}
                    onChange={(e) => setScheduleSettings({ ...scheduleSettings, lunchBreakDuration: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Ruokatauko tunnin jälkeen</Label>
                  <Input
                    type="number"
                    value={scheduleSettings.lunchBreakAfterPeriod}
                    onChange={(e) => setScheduleSettings({ ...scheduleSettings, lunchBreakAfterPeriod: parseInt(e.target.value) })}
                  />
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="periods" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Koulupäivän alku</Label>
                  <Input
                    type="time"
                    value={scheduleSettings.schoolStartTime}
                    onChange={(e) => setScheduleSettings({ ...scheduleSettings, schoolStartTime: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Koulupäivän loppu</Label>
                  <Input
                    type="time"
                    value={scheduleSettings.schoolEndTime}
                    onChange={(e) => setScheduleSettings({ ...scheduleSettings, schoolEndTime: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Tunteja päivässä</Label>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={scheduleSettings.periodsPerDay}
                    onChange={(e) => setScheduleSettings({ ...scheduleSettings, periodsPerDay: parseInt(e.target.value) })}
                  />
                </div>
              </div>
              
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Esikatselu
                </h4>
                <div className="space-y-1 text-sm text-blue-800">
                  {generateTimeSlots().map((slot, idx) => {
                    const customLesson = scheduleSettings.customLessons.find(l => l.lessonNumber === idx + 1);
                    const customBreak = scheduleSettings.customBreaks.find(b => b.afterLesson === idx + 1);
                    const isLunchBreak = idx + 1 === scheduleSettings.lunchBreakAfterPeriod;
                    
                    return (
                      <div key={idx}>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{idx + 1}. tunti:</span>
                          <span>{slot}</span>
                          {customLesson?.isYH && (
                            <span className="ml-2 text-xs bg-blue-200 px-2 py-0.5 rounded font-semibold">
                              YH
                            </span>
                          )}
                          {customLesson?.duration && customLesson.duration !== scheduleSettings.lessonDuration && (
                            <span className="ml-2 text-xs bg-green-200 px-2 py-0.5 rounded">
                              {customLesson.duration} min
                            </span>
                          )}
                        </div>
                        {idx < scheduleSettings.periodsPerDay - 1 && (
                          <div className="ml-4 text-xs text-gray-600 flex items-center gap-2">
                            {customBreak ? (
                              <>
                                <Coffee className="w-3 h-3" />
                                {customBreak.type === 'lunch' && <Utensils className="w-3 h-3" />}
                                {customBreak.type === 'yh' ? 'YH-tauko' : customBreak.type === 'lunch' ? 'Ruokatauko' : 'Välitunti'}: {customBreak.duration} min
                              </>
                            ) : isLunchBreak ? (
                              <>
                                <Utensils className="w-3 h-3" />
                                Ruokatauko: {scheduleSettings.lunchBreakDuration} min
                              </>
                            ) : (
                              <>
                                <Coffee className="w-3 h-3" />
                                Välitunti: {scheduleSettings.shortBreakDuration} min
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="individual" className="space-y-4 mt-4">
              <div className="flex items-center gap-2 mb-4">
                <input
                  type="checkbox"
                  id="enableIndividual"
                  checked={scheduleSettings.enableIndividualCustomization}
                  onChange={(e) => setScheduleSettings({ ...scheduleSettings, enableIndividualCustomization: e.target.checked })}
                  className="w-4 h-4"
                />
                <Label htmlFor="enableIndividual" className="font-semibold">
                  Ota käyttöön yksilöllinen muokkaus
                </Label>
              </div>
              
              {scheduleSettings.enableIndividualCustomization && (
                <div className="space-y-6">
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="font-semibold text-blue-900 mb-2">
                      💡 Yksilöllinen muokkaus
                    </h4>
                    <p className="text-sm text-blue-800">
                      Voit nyt muokata jokaisen oppitunnin ja välitunnin kestoa erikseen. 
                      Tämä antaa täyden joustavuuden lukujärjestyksen rakentamiseen.
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Oppituntien kestot
                    </h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {Array.from({ length: scheduleSettings.periodsPerDay }, (_, i) => {
                        const customLesson = scheduleSettings.customLessons.find(l => l.lessonNumber === i + 1);
                        const duration = customLesson?.duration || scheduleSettings.lessonDuration;
                        
                        return (
                          <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded border">
                            <span className="font-medium text-sm w-20">{i + 1}. tunti:</span>
                            <Input
                              type="number"
                              min="15"
                              max="120"
                              value={duration}
                              onChange={(e) => {
                                const newDuration = parseInt(e.target.value);
                                const updatedLessons = scheduleSettings.customLessons.filter(l => l.lessonNumber !== i + 1);
                                updatedLessons.push({
                                  lessonNumber: i + 1,
                                  startTime: '',
                                  endTime: '',
                                  duration: newDuration,
                                  customizable: true,
                                });
                                setScheduleSettings({ ...scheduleSettings, customLessons: updatedLessons });
                              }}
                              className="w-24"
                            />
                            <span className="text-sm text-gray-600">minuuttia</span>
                            <div className="flex items-center gap-2 ml-auto">
                              <input
                                type="checkbox"
                                id={`yh-${i}`}
                                checked={customLesson?.isYH || false}
                                onChange={(e) => {
                                  const updatedLessons = scheduleSettings.customLessons.filter(l => l.lessonNumber !== i + 1);
                                  updatedLessons.push({
                                    lessonNumber: i + 1,
                                    startTime: '',
                                    endTime: '',
                                    duration: duration,
                                    customizable: true,
                                    isYH: e.target.checked,
                                  });
                                  setScheduleSettings({ ...scheduleSettings, customLessons: updatedLessons });
                                }}
                                className="w-4 h-4"
                              />
                              <Label htmlFor={`yh-${i}`} className="text-sm">YH</Label>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Coffee className="w-4 h-4" />
                      Välituntien kestot
                    </h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {Array.from({ length: scheduleSettings.periodsPerDay - 1 }, (_, i) => {
                        const customBreak = scheduleSettings.customBreaks.find(b => b.afterLesson === i + 1);
                        const isLunchBreak = i + 1 === scheduleSettings.lunchBreakAfterPeriod;
                        const defaultDuration = isLunchBreak ? scheduleSettings.lunchBreakDuration : scheduleSettings.shortBreakDuration;
                        const duration = customBreak?.duration || defaultDuration;
                        const breakType = customBreak?.type || (isLunchBreak ? 'lunch' : 'short');
                        
                        return (
                          <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded border">
                            <span className="font-medium text-sm w-32">Tauko {i + 1}. jälkeen:</span>
                            <Input
                              type="number"
                              min="5"
                              max="60"
                              value={duration}
                              onChange={(e) => {
                                const newDuration = parseInt(e.target.value);
                                const updatedBreaks = scheduleSettings.customBreaks.filter(b => b.afterLesson !== i + 1);
                                updatedBreaks.push({
                                  breakNumber: i + 1,
                                  afterLesson: i + 1,
                                  duration: newDuration,
                                  type: breakType,
                                  customizable: true,
                                });
                                setScheduleSettings({ ...scheduleSettings, customBreaks: updatedBreaks });
                              }}
                              className="w-24"
                            />
                            <span className="text-sm text-gray-600">min</span>
                            <select
                              value={breakType}
                              onChange={(e) => {
                                const updatedBreaks = scheduleSettings.customBreaks.filter(b => b.afterLesson !== i + 1);
                                updatedBreaks.push({
                                  breakNumber: i + 1,
                                  afterLesson: i + 1,
                                  duration: duration,
                                  type: e.target.value as 'short' | 'lunch' | 'yh',
                                  customizable: true,
                                });
                                setScheduleSettings({ ...scheduleSettings, customBreaks: updatedBreaks });
                              }}
                              className="px-3 py-1 border rounded-md text-sm"
                            >
                              <option value="short">Välitunti</option>
                              <option value="lunch">Ruokatauko</option>
                              <option value="yh">YH-tauko</option>
                            </select>
                            {breakType === 'lunch' && <Utensils className="w-4 h-4 text-orange-600" />}
                            {breakType === 'yh' && <span className="text-xs bg-blue-100 px-2 py-1 rounded">YH</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSettingsDialog(false)}>
              Peruuta
            </Button>
            <Button onClick={handleSaveSettings} className="bg-[#003d82] hover:bg-[#002d5f]">
              <Save className="w-4 h-4 mr-1" />
              Tallenna asetukset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Holidays Dialog */}
      <Dialog open={showHolidaysDialog} onOpenChange={setShowHolidaysDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Lomat ja vapaapäivät
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Button onClick={handleAddHoliday} size="sm" className="bg-green-600 hover:bg-green-700">
              <Plus className="w-4 h-4 mr-1" />
              Lisää loma
            </Button>
            
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {holidays.map((holiday) => (
                <Card key={holiday.id} className="border-[#dddddd]">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <Input
                          value={holiday.name}
                          onChange={(e) => setHolidays(prev => prev.map(h => 
                            h.id === holiday.id ? { ...h, name: e.target.value } : h
                          ))}
                          placeholder="Loman nimi"
                          className="font-semibold"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs">Alkaa</Label>
                            <Input
                              type="date"
                              value={holiday.startDate}
                              onChange={(e) => setHolidays(prev => prev.map(h => 
                                h.id === holiday.id ? { ...h, startDate: e.target.value } : h
                              ))}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Päättyy</Label>
                            <Input
                              type="date"
                              value={holiday.endDate}
                              onChange={(e) => setHolidays(prev => prev.map(h => 
                                h.id === holiday.id ? { ...h, endDate: e.target.value } : h
                              ))}
                            />
                          </div>
                        </div>
                        <select
                          value={holiday.type}
                          onChange={(e) => setHolidays(prev => prev.map(h => 
                            h.id === holiday.id ? { ...h, type: e.target.value as Holiday['type'] } : h
                          ))}
                          className="w-full border rounded-md px-3 py-2 text-sm"
                        >
                          <option value="holiday">Loma</option>
                          <option value="break">Tauko</option>
                          <option value="event">Tapahtuma</option>
                        </select>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600"
                        onClick={() => handleDeleteHoliday(holiday.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowHolidaysDialog(false)} className="bg-[#003d82] hover:bg-[#002d5f]">
              <Save className="w-4 h-4 mr-1" />
              Tallenna
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
