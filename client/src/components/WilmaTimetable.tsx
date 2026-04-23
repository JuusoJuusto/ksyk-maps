import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Calendar, Clock, MapPin, User, Plus, Edit, Trash2, Settings, Save, X, Download, Upload, Grid3x3, List } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Lesson {
  id: string;
  time: string;
  subject: string;
  teacher: string;
  room: string;
  color: string;
}

interface TimetableDay {
  day: string;
  date: string;
  lessons: Lesson[];
}

export default function WilmaTimetable() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [currentWeek, setCurrentWeek] = useState(0);
  const [viewMode, setViewMode] = useState<'week' | 'day' | 'list'>('week');
  const [selectedDay, setSelectedDay] = useState(0);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // Settings state
  const [settings, setSettings] = useState({
    showTeacher: true,
    showRoom: true,
    showTime: true,
    compactView: false,
    colorCoded: true,
    weekStartsMonday: true,
    show24Hour: true,
  });

  // Form state for lesson editing
  const [lessonForm, setLessonForm] = useState({
    time: "",
    subject: "",
    teacher: "",
    room: "",
    color: "#003d82",
    dayIndex: 0,
  });

  // Mock data - replace with real API data
  const weekData: TimetableDay[] = [
    {
      day: "Maanantai",
      date: "22.4.2026",
      lessons: [
        { id: "1", time: "08:00-09:30", subject: "Matematiikka", teacher: "M. Virtanen", room: "A201", color: "#003d82" },
        { id: "2", time: "09:45-11:15", subject: "Englanti", teacher: "A. Korhonen", room: "B105", color: "#7cb342" },
        { id: "3", time: "12:00-13:30", subject: "Fysiikka", teacher: "P. Nieminen", room: "C301", color: "#f57c00" },
        { id: "4", time: "13:45-15:15", subject: "Historia", teacher: "L. Mäkinen", room: "A105", color: "#5e35b1" },
      ],
    },
    {
      day: "Tiistai",
      date: "23.4.2026",
      lessons: [
        { id: "5", time: "08:00-09:30", subject: "Kemia", teacher: "S. Lahtinen", room: "C201", color: "#00897b" },
        { id: "6", time: "09:45-11:15", subject: "Ruotsi", teacher: "K. Andersson", room: "B203", color: "#d32f2f" },
        { id: "7", time: "12:00-13:30", subject: "Liikunta", teacher: "J. Koskinen", room: "Sali", color: "#1976d2" },
        { id: "8", time: "13:45-15:15", subject: "Musiikki", teacher: "E. Virtanen", room: "Musiikkiluokka", color: "#c2185b" },
      ],
    },
    {
      day: "Keskiviikko",
      date: "24.4.2026",
      lessons: [
        { id: "9", time: "08:00-09:30", subject: "Matematiikka", teacher: "M. Virtanen", room: "A201", color: "#003d82" },
        { id: "10", time: "09:45-11:15", subject: "Biologia", teacher: "T. Heikkinen", room: "C102", color: "#388e3c" },
        { id: "11", time: "12:00-13:30", subject: "Maantieto", teacher: "R. Salo", room: "A304", color: "#f57c00" },
      ],
    },
    {
      day: "Torstai",
      date: "25.4.2026",
      lessons: [
        { id: "12", time: "08:00-09:30", subject: "Englanti", teacher: "A. Korhonen", room: "B105", color: "#7cb342" },
        { id: "13", time: "09:45-11:15", subject: "Fysiikka", teacher: "P. Nieminen", room: "C301", color: "#f57c00" },
        { id: "14", time: "12:00-13:30", subject: "Äidinkieli", teacher: "M. Lehtonen", room: "A102", color: "#5e35b1" },
        { id: "15", time: "13:45-15:15", subject: "Kuvataide", teacher: "L. Virtanen", room: "Taideluokka", color: "#e91e63" },
      ],
    },
    {
      day: "Perjantai",
      date: "26.4.2026",
      lessons: [
        { id: "16", time: "08:00-09:30", subject: "Historia", teacher: "L. Mäkinen", room: "A105", color: "#5e35b1" },
        { id: "17", time: "09:45-11:15", subject: "Matematiikka", teacher: "M. Virtanen", room: "A201", color: "#003d82" },
        { id: "18", time: "12:00-13:30", subject: "Uskonto", teacher: "P. Korhonen", room: "A203", color: "#795548" },
      ],
    },
  ];

  const nextWeek = () => setCurrentWeek(prev => prev + 1);
  const prevWeek = () => setCurrentWeek(prev => prev - 1);

  // Handle lesson editing
  const handleEditLesson = (lesson: Lesson, dayIndex: number) => {
    setEditingLesson(lesson);
    setLessonForm({
      time: lesson.time,
      subject: lesson.subject,
      teacher: lesson.teacher,
      room: lesson.room,
      color: lesson.color,
      dayIndex,
    });
    setShowEditDialog(true);
  };

  const handleAddLesson = (dayIndex: number) => {
    setEditingLesson(null);
    setLessonForm({
      time: "",
      subject: "",
      teacher: "",
      room: "",
      color: "#003d82",
      dayIndex,
    });
    setShowEditDialog(true);
  };

  const handleSaveLesson = () => {
    // TODO: Implement API call to save lesson
    toast({
      title: "✅ Tallennettu",
      description: editingLesson ? "Oppitunti päivitetty" : "Uusi oppitunti lisätty",
    });
    setShowEditDialog(false);
  };

  const handleDeleteLesson = (lessonId: string) => {
    if (confirm("Haluatko varmasti poistaa tämän oppitunnin?")) {
      // TODO: Implement API call to delete lesson
      toast({
        title: "🗑️ Poistettu",
        description: "Oppitunti poistettu",
      });
    }
  };

  const handleExportSchedule = () => {
    // TODO: Implement export to PDF/iCal
    toast({
      title: "📥 Viedään",
      description: "Lukujärjestys viedään...",
    });
  };

  const handleImportSchedule = () => {
    // TODO: Implement import from file
    toast({
      title: "📤 Tuodaan",
      description: "Lukujärjestys tuodaan...",
    });
  };

  const saveSettings = () => {
    localStorage.setItem('timetableSettings', JSON.stringify(settings));
    toast({
      title: "✅ Asetukset tallennettu",
      description: "Lukujärjestyksen asetukset on päivitetty",
    });
    setShowSettingsDialog(false);
  };

  // Load settings on mount
  useEffect(() => {
    const saved = localStorage.getItem('timetableSettings');
    if (saved) {
      setSettings(JSON.parse(saved));
    }
  }, []);

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <Card className="border-[#dddddd] shadow-md">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            {/* Top Row */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#003d82] rounded-lg">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Lukujärjestys</h2>
                  <p className="text-sm text-gray-600">Viikko {18 + currentWeek} • {weekData[0].date} - {weekData[4].date}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditMode(!isEditMode)}
                  className={isEditMode ? 'bg-[#7cb342] text-white border-[#7cb342]' : ''}
                >
                  <Edit className="w-4 h-4 mr-1" />
                  {isEditMode ? 'Muokkaus päällä' : 'Muokkaa'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSettingsDialog(true)}
                >
                  <Settings className="w-4 h-4 mr-1" />
                  Asetukset
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportSchedule}
                >
                  <Download className="w-4 h-4 mr-1" />
                  Vie
                </Button>
              </div>
            </div>

            {/* Bottom Row - View Controls */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewMode('week')}
                  className={viewMode === 'week' ? 'bg-[#003d82] text-white border-[#003d82]' : ''}
                >
                  <Grid3x3 className="w-4 h-4 mr-1" />
                  Viikko
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewMode('day')}
                  className={viewMode === 'day' ? 'bg-[#003d82] text-white border-[#003d82]' : ''}
                >
                  <Calendar className="w-4 h-4 mr-1" />
                  Päivä
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className={viewMode === 'list' ? 'bg-[#003d82] text-white border-[#003d82]' : ''}
                >
                  <List className="w-4 h-4 mr-1" />
                  Lista
                </Button>
              </div>
              
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={prevWeek}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setCurrentWeek(0)}
                  className="min-w-[80px]"
                >
                  Tänään
                </Button>
                <Button variant="outline" size="sm" onClick={nextWeek}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Week View */}
      {viewMode === 'week' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          {weekData.map((day, dayIndex) => (
            <Card key={dayIndex} className="border-[#dddddd] shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="p-3 bg-gradient-to-r from-[#003d82] to-[#0052a3] text-white">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">
                    {day.day}
                    <span className="block text-xs font-normal opacity-90 mt-0.5">{day.date}</span>
                  </CardTitle>
                  {isEditMode && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-white hover:bg-white/20"
                      onClick={() => handleAddLesson(dayIndex)}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-2 space-y-2">
                {day.lessons.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-xs text-gray-500 mb-2">Ei oppitunteja</p>
                    {isEditMode && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAddLesson(dayIndex)}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Lisää tunti
                      </Button>
                    )}
                  </div>
                ) : (
                  day.lessons.map((lesson) => (
                    <div
                      key={lesson.id}
                      className={`p-2 rounded-lg border-l-4 transition-all ${
                        settings.compactView ? 'p-1.5' : 'p-2'
                      } ${
                        settings.colorCoded ? 'bg-gray-50' : 'bg-white border'
                      } hover:bg-gray-100 cursor-pointer group relative`}
                      style={{ borderLeftColor: settings.colorCoded ? lesson.color : '#ddd' }}
                    >
                      {isEditMode && (
                        <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => handleEditLesson(lesson, dayIndex)}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 text-red-600"
                            onClick={() => handleDeleteLesson(lesson.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                      <div className="flex items-start justify-between gap-1">
                        <div className="flex-1 min-w-0">
                          <p className={`font-semibold text-gray-900 truncate ${
                            settings.compactView ? 'text-xs' : 'text-xs'
                          }`}>
                            {lesson.subject}
                          </p>
                          {settings.showTime && (
                            <div className="flex items-center gap-1 mt-1">
                              <Clock className="w-3 h-3 text-gray-500 flex-shrink-0" />
                              <p className="text-xs text-gray-600">{lesson.time}</p>
                            </div>
                          )}
                          {settings.showTeacher && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <User className="w-3 h-3 text-gray-500 flex-shrink-0" />
                              <p className="text-xs text-gray-600 truncate">{lesson.teacher}</p>
                            </div>
                          )}
                          {settings.showRoom && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 text-gray-500 flex-shrink-0" />
                              <p className="text-xs text-gray-600">{lesson.room}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Day View */}
      {viewMode === 'day' && (
        <div className="space-y-3">
          {/* Day Selector */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {weekData.map((day, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => setSelectedDay(index)}
                className={selectedDay === index ? 'bg-[#003d82] text-white' : ''}
              >
                {day.day}
                <span className="ml-2 text-xs opacity-70">{day.date}</span>
              </Button>
            ))}
          </div>

          {/* Selected Day Lessons */}
          <Card className="border-[#dddddd]">
            <CardHeader className="p-4 bg-[#003d82] text-white">
              <CardTitle className="text-base">
                {weekData[selectedDay].day} - {weekData[selectedDay].date}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {weekData[selectedDay].lessons.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">Ei oppitunteja tänään</p>
              ) : (
                weekData[selectedDay].lessons.map((lesson) => (
                  <div
                    key={lesson.id}
                    className="p-4 rounded-lg border-l-4 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                    style={{ borderLeftColor: lesson.color }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-base font-semibold text-gray-900">{lesson.subject}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-500" />
                            <span className="text-sm text-gray-600">{lesson.time}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-500" />
                            <span className="text-sm text-gray-600">{lesson.teacher}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-gray-500" />
                            <span className="text-sm text-gray-600">{lesson.room}</span>
                          </div>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        Näytä
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <Card className="border-[#dddddd] shadow-sm">
          <CardHeader className="p-4 bg-gradient-to-r from-[#003d82] to-[#0052a3] text-white">
            <CardTitle className="text-base">Kaikki oppitunnit - Viikko {18 + currentWeek}</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-4">
              {weekData.map((day, dayIndex) => (
                <div key={dayIndex} className="border-b pb-4 last:border-b-0">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {day.day} <span className="text-sm text-gray-600 font-normal">({day.date})</span>
                    </h3>
                    {isEditMode && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAddLesson(dayIndex)}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Lisää tunti
                      </Button>
                    )}
                  </div>
                  {day.lessons.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">Ei oppitunteja</p>
                  ) : (
                    <div className="space-y-2">
                      {day.lessons.map((lesson) => (
                        <div
                          key={lesson.id}
                          className="flex items-center justify-between p-3 rounded-lg border-l-4 bg-gray-50 hover:bg-gray-100 transition-colors group"
                          style={{ borderLeftColor: settings.colorCoded ? lesson.color : '#ddd' }}
                        >
                          <div className="flex items-center gap-4 flex-1">
                            <div className="flex items-center gap-2 min-w-[100px]">
                              <Clock className="w-4 h-4 text-gray-500" />
                              <span className="text-sm font-medium text-gray-900">{lesson.time}</span>
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-gray-900">{lesson.subject}</p>
                              <div className="flex items-center gap-4 mt-1 text-xs text-gray-600">
                                {settings.showTeacher && (
                                  <span className="flex items-center gap-1">
                                    <User className="w-3 h-3" />
                                    {lesson.teacher}
                                  </span>
                                )}
                                {settings.showRoom && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    {lesson.room}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          {isEditMode && (
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEditLesson(lesson, dayIndex)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-600"
                                onClick={() => handleDeleteLesson(lesson.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit/Add Lesson Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingLesson ? 'Muokkaa oppituntia' : 'Lisää uusi oppitunti'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Päivä</Label>
              <select
                className="w-full border rounded-md px-3 py-2 mt-1"
                value={lessonForm.dayIndex}
                onChange={(e) => setLessonForm({ ...lessonForm, dayIndex: parseInt(e.target.value) })}
              >
                {weekData.map((day, index) => (
                  <option key={index} value={index}>
                    {day.day} ({day.date})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Aika</Label>
              <Input
                value={lessonForm.time}
                onChange={(e) => setLessonForm({ ...lessonForm, time: e.target.value })}
                placeholder="esim. 08:00-09:30"
              />
            </div>
            <div>
              <Label>Oppiaine</Label>
              <Input
                value={lessonForm.subject}
                onChange={(e) => setLessonForm({ ...lessonForm, subject: e.target.value })}
                placeholder="esim. Matematiikka"
              />
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
              <Label>Väri</Label>
              <div className="flex gap-2 mt-1">
                {['#003d82', '#7cb342', '#f57c00', '#5e35b1', '#00897b', '#d32f2f', '#1976d2', '#c2185b'].map((color) => (
                  <button
                    key={color}
                    className={`w-8 h-8 rounded-full border-2 ${
                      lessonForm.color === color ? 'border-gray-900 scale-110' : 'border-gray-300'
                    } transition-transform`}
                    style={{ backgroundColor: color }}
                    onClick={() => setLessonForm({ ...lessonForm, color })}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              <X className="w-4 h-4 mr-1" />
              Peruuta
            </Button>
            <Button onClick={handleSaveLesson} className="bg-[#003d82] hover:bg-[#002d5f]">
              <Save className="w-4 h-4 mr-1" />
              Tallenna
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Lukujärjestyksen asetukset
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <Label>Näytä opettaja</Label>
              <input
                type="checkbox"
                checked={settings.showTeacher}
                onChange={(e) => setSettings({ ...settings, showTeacher: e.target.checked })}
                className="w-4 h-4"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Näytä luokka</Label>
              <input
                type="checkbox"
                checked={settings.showRoom}
                onChange={(e) => setSettings({ ...settings, showRoom: e.target.checked })}
                className="w-4 h-4"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Näytä aika</Label>
              <input
                type="checkbox"
                checked={settings.showTime}
                onChange={(e) => setSettings({ ...settings, showTime: e.target.checked })}
                className="w-4 h-4"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Tiivis näkymä</Label>
              <input
                type="checkbox"
                checked={settings.compactView}
                onChange={(e) => setSettings({ ...settings, compactView: e.target.checked })}
                className="w-4 h-4"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Värikoodattu</Label>
              <input
                type="checkbox"
                checked={settings.colorCoded}
                onChange={(e) => setSettings({ ...settings, colorCoded: e.target.checked })}
                className="w-4 h-4"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Viikko alkaa maanantaista</Label>
              <input
                type="checkbox"
                checked={settings.weekStartsMonday}
                onChange={(e) => setSettings({ ...settings, weekStartsMonday: e.target.checked })}
                className="w-4 h-4"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>24h aikamuoto</Label>
              <input
                type="checkbox"
                checked={settings.show24Hour}
                onChange={(e) => setSettings({ ...settings, show24Hour: e.target.checked })}
                className="w-4 h-4"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSettingsDialog(false)}>
              Peruuta
            </Button>
            <Button onClick={saveSettings} className="bg-[#003d82] hover:bg-[#002d5f]">
              <Save className="w-4 h-4 mr-1" />
              Tallenna asetukset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
