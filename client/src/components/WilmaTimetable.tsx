import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar, Clock, MapPin, User } from "lucide-react";

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
  const [currentWeek, setCurrentWeek] = useState(0);
  const [viewMode, setViewMode] = useState<'week' | 'day'>('week');
  const [selectedDay, setSelectedDay] = useState(0);

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

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <Card className="border-[#dddddd]">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#003d82]" />
              <div>
                <h2 className="text-lg font-bold text-gray-900">Lukujärjestys</h2>
                <p className="text-sm text-gray-600">Viikko {18 + currentWeek}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode('week')}
                className={viewMode === 'week' ? 'bg-[#003d82] text-white' : ''}
              >
                Viikko
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode('day')}
                className={viewMode === 'day' ? 'bg-[#003d82] text-white' : ''}
              >
                Päivä
              </Button>
              
              <div className="flex items-center gap-1 ml-2">
                <Button variant="outline" size="sm" onClick={prevWeek}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentWeek(0)}>
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
            <Card key={dayIndex} className="border-[#dddddd]">
              <CardHeader className="p-3 bg-[#003d82] text-white">
                <CardTitle className="text-sm font-semibold">
                  {day.day}
                  <span className="block text-xs font-normal opacity-90">{day.date}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2 space-y-2">
                {day.lessons.length === 0 ? (
                  <p className="text-xs text-gray-500 text-center py-4">Ei oppitunteja</p>
                ) : (
                  day.lessons.map((lesson) => (
                    <div
                      key={lesson.id}
                      className="p-2 rounded border-l-4 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                      style={{ borderLeftColor: lesson.color }}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-900 truncate">{lesson.subject}</p>
                          <div className="flex items-center gap-1 mt-1">
                            <Clock className="w-3 h-3 text-gray-500" />
                            <p className="text-xs text-gray-600">{lesson.time}</p>
                          </div>
                          <div className="flex items-center gap-1 mt-0.5">
                            <User className="w-3 h-3 text-gray-500" />
                            <p className="text-xs text-gray-600 truncate">{lesson.teacher}</p>
                          </div>
                          <div className="flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-gray-500" />
                            <p className="text-xs text-gray-600">{lesson.room}</p>
                          </div>
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
    </div>
  );
}
