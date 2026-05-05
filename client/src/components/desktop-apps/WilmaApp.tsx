import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  X, 
  Home, 
  Calendar, 
  MessageSquare, 
  User, 
  BookOpen,
  BarChart3,
  Settings,
  Bell,
  Search,
  GraduationCap
} from "lucide-react";

interface WilmaAppProps {
  onClose: () => void;
}

export default function WilmaApp({ onClose }: WilmaAppProps) {
  const [activeTab, setActiveTab] = useState("home");
  const [searchQuery, setSearchQuery] = useState("");

  // Mock data
  const notifications = [
    { id: 1, title: "Uusi viesti opettajalta", time: "10 min sitten", type: "message" },
    { id: 2, title: "Kotitehtävä palautettu", time: "1 tunti sitten", type: "homework" },
    { id: 3, title: "Uusi arvosana: Matematiikka", time: "2 tuntia sitten", type: "grade" },
  ];

  const schedule = [
    { time: "08:00-09:30", subject: "Matematiikka", room: "A201", teacher: "Virtanen" },
    { time: "09:45-11:15", subject: "Englanti", room: "B103", teacher: "Korhonen" },
    { time: "11:30-13:00", subject: "Fysiikka", room: "B301", teacher: "Mäkinen" },
    { time: "13:45-15:15", subject: "Historia", room: "A305", teacher: "Nieminen" },
  ];

  const grades = [
    { subject: "Matematiikka", grade: 9, teacher: "Virtanen" },
    { subject: "Englanti", grade: 10, teacher: "Korhonen" },
    { subject: "Fysiikka", grade: 8, teacher: "Mäkinen" },
    { subject: "Historia", grade: 9, teacher: "Nieminen" },
  ];

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Title Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#003d82] to-[#0052a3] text-white border-b">
        <div className="flex items-center gap-3">
          <GraduationCap className="w-5 h-5" />
          <span className="font-bold text-lg">Wilma</span>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="text-white hover:bg-white/20"
          onClick={onClose}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Search Bar */}
      <div className="p-4 border-b bg-gray-50">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Hae Wilmasta..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
          <TabsList className="w-full justify-start border-b rounded-none bg-white px-4">
            <TabsTrigger value="home" className="gap-2">
              <Home className="w-4 h-4" />
              Etusivu
            </TabsTrigger>
            <TabsTrigger value="schedule" className="gap-2">
              <Calendar className="w-4 h-4" />
              Lukujärjestys
            </TabsTrigger>
            <TabsTrigger value="grades" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              Arvosanat
            </TabsTrigger>
            <TabsTrigger value="messages" className="gap-2">
              <MessageSquare className="w-4 h-4" />
              Viestit
            </TabsTrigger>
            <TabsTrigger value="profile" className="gap-2">
              <User className="w-4 h-4" />
              Profiili
            </TabsTrigger>
          </TabsList>

          {/* Home Tab */}
          <TabsContent value="home" className="p-6 space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-4 text-[#003d82]">Tervetuloa Wilmaan! 👋</h2>
              <p className="text-gray-600 mb-6">Tässä on yhteenveto tämän päivän tapahtumista.</p>
            </div>

            {/* Notifications */}
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <Bell className="w-5 h-5 text-[#003d82]" />
                <h3 className="font-bold text-lg">Ilmoitukset</h3>
              </div>
              <div className="space-y-3">
                {notifications.map((notif) => (
                  <div key={notif.id} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-2" />
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">{notif.title}</p>
                      <p className="text-sm text-gray-500">{notif.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="p-4 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                <BookOpen className="w-8 h-8 mb-2" />
                <p className="text-2xl font-bold">4</p>
                <p className="text-sm opacity-90">Tuntia tänään</p>
              </Card>
              <Card className="p-4 bg-gradient-to-br from-green-500 to-green-600 text-white">
                <BarChart3 className="w-8 h-8 mb-2" />
                <p className="text-2xl font-bold">9.0</p>
                <p className="text-sm opacity-90">Keskiarvo</p>
              </Card>
              <Card className="p-4 bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                <MessageSquare className="w-8 h-8 mb-2" />
                <p className="text-2xl font-bold">3</p>
                <p className="text-sm opacity-90">Uutta viestiä</p>
              </Card>
            </div>
          </TabsContent>

          {/* Schedule Tab */}
          <TabsContent value="schedule" className="p-6">
            <h2 className="text-2xl font-bold mb-6 text-[#003d82]">Lukujärjestys - Tänään</h2>
            <div className="space-y-3">
              {schedule.map((lesson, idx) => (
                <Card key={idx} className="p-4 hover:shadow-lg transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <p className="text-sm font-bold text-[#003d82]">{lesson.time.split('-')[0]}</p>
                        <p className="text-xs text-gray-500">{lesson.time.split('-')[1]}</p>
                      </div>
                      <div className="w-1 h-12 bg-blue-500 rounded-full" />
                      <div>
                        <p className="font-bold text-lg">{lesson.subject}</p>
                        <p className="text-sm text-gray-600">
                          {lesson.teacher} • Luokka {lesson.room}
                        </p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline">
                      Näytä lisää
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Grades Tab */}
          <TabsContent value="grades" className="p-6">
            <h2 className="text-2xl font-bold mb-6 text-[#003d82]">Arvosanat</h2>
            <div className="space-y-3">
              {grades.map((grade, idx) => (
                <Card key={idx} className="p-4 hover:shadow-lg transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-lg">{grade.subject}</p>
                      <p className="text-sm text-gray-600">Opettaja: {grade.teacher}</p>
                    </div>
                    <div className="text-center">
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold ${
                        grade.grade >= 9 ? 'bg-green-100 text-green-700' :
                        grade.grade >= 7 ? 'bg-blue-100 text-blue-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {grade.grade}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
              <Card className="p-6 bg-gradient-to-r from-[#003d82] to-[#0052a3] text-white">
                <div className="text-center">
                  <p className="text-sm opacity-90 mb-2">Keskiarvo</p>
                  <p className="text-5xl font-bold">9.0</p>
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages" className="p-6">
            <h2 className="text-2xl font-bold mb-6 text-[#003d82]">Viestit</h2>
            <div className="space-y-3">
              <Card className="p-4 hover:shadow-lg transition-shadow cursor-pointer">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                    MV
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-bold">Matti Virtanen</p>
                      <p className="text-xs text-gray-500">10:30</p>
                    </div>
                    <p className="text-sm text-gray-600">Matematiikan kotitehtävät</p>
                    <p className="text-sm text-gray-500 mt-1">Muistakaa palauttaa kotitehtävät huomiseksi...</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4 hover:shadow-lg transition-shadow cursor-pointer">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-bold">
                    AK
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-bold">Anna Korhonen</p>
                      <p className="text-xs text-gray-500">Eilen</p>
                    </div>
                    <p className="text-sm text-gray-600">Englannin essee</p>
                    <p className="text-sm text-gray-500 mt-1">Hyvää työtä esseessä! Arvosana: 10</p>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile" className="p-6">
            <h2 className="text-2xl font-bold mb-6 text-[#003d82]">Profiili</h2>
            <Card className="p-6">
              <div className="flex items-center gap-6 mb-6">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-3xl font-bold">
                  OP
                </div>
                <div>
                  <h3 className="text-2xl font-bold">Opiskelija Nimi</h3>
                  <p className="text-gray-600">Luokka 9A</p>
                  <p className="text-sm text-gray-500">Opiskelijanumero: 12345678</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Sähköposti</p>
                  <p className="font-medium">opiskelija@ksyk.fi</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Puhelin</p>
                  <p className="font-medium">+358 40 123 4567</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Osoite</p>
                  <p className="font-medium">Esimerkkikatu 1, 00100 Helsinki</p>
                </div>
                <Button className="w-full bg-[#003d82] hover:bg-[#0052a3]">
                  <Settings className="w-4 h-4 mr-2" />
                  Muokkaa profiilia
                </Button>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
