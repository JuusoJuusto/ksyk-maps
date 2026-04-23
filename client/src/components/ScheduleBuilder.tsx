import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Save, Copy, Download, Upload, Calendar, Clock, User, MapPin, Settings } from "lucide-react";
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
}

export default function ScheduleBuilder() {
  const { toast } = useToast();
  const [selectedClass, setSelectedClass] = useState("9A");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ScheduleEntry | null>(null);
  const [scheduleEntries, setScheduleEntries] = useState<ScheduleEntry[]>([]);
  
  const [entryForm, setEntryForm] = useState({
    dayIndex: 0,
    timeSlot: "",
    subject: "",
    teacher: "",
    room: "",
    color: "#003d82",
  });

  const days = ["Maanantai", "Tiistai", "Keskiviikko", "Torstai", "Perjantai"];
  const timeSlots = [
    "08:00-09:30",
    "09:45-11:15",
    "11:30-13:00",
    "13:15-14:45",
    "15:00-16:30",
  ];

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
    if (!entryForm.subject || !entryForm.timeSlot) {
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
        description: "Uusi oppitunti lisätty lukujärjestykseen",
      });
    }

    setShowAddDialog(false);
  };

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
                <Calendar className="w-6 h-6 text-white" />
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
    </div>
  );
}
