import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import EnhancedWilmaUserManager from "@/components/EnhancedWilmaUserManager";
import PeopleManager from "@/components/PeopleManager";
import WilmaHomeTab from "@/components/WilmaHomeTab";
import EnhancedMessageSystem from "@/components/EnhancedMessageSystem";
import ScheduleManager from "@/components/ScheduleManager";
import ScheduleSettingsManager from "@/components/ScheduleSettingsManager";
import WilmaSettingsManager from "@/components/WilmaSettingsManager";
import TeacherDirectory from "@/components/TeacherDirectory";
import ClassesManager from "@/components/ClassesManager";
import WilmaStyleAttendance from "@/components/WilmaStyleAttendance";
import CourseManager from "@/components/CourseManager";
import StudentEnrollmentManager from "@/components/StudentEnrollmentManager";
import { 
  LogOut, Home, Users, Calendar, BookOpen, GraduationCap, 
  Building, Bell, BarChart3, Settings, Plus, Upload, Download,
  Star, User, Award, TrendingUp, UserCheck, Mail, MapPin,
  Eye, Clock, MessageSquare, Filter, Search, CheckCircle, AlertCircle, Menu
} from "lucide-react";

export default function WilmaAdmin() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute('/wilma-admin/:adminId?/:section?');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(params?.section || 'home');

  useEffect(() => {
    if (params?.section) {
      setActiveTab(params.section);
    }
  }, [params?.section]);

  useEffect(() => {
    const checkAuth = () => {
      const storedUser = localStorage.getItem('wilma_user');
      
      if (storedUser) {
        try {
          const user = JSON.parse(storedUser);
          const roles = user.roles || [user.role];
          const hasAccess = roles.some((r: string) => 
            ['admin', 'teacher', 'principal', 'vice_principal'].includes(r)
          );
          
          if (hasAccess) {
            // SECURITY: Validate admin ID matches logged-in user
            if (params?.adminId && params.adminId !== user.id) {
              // Don't show alert, just silently redirect to correct URL
              setLocation(`/wilma-admin/${user.id}/${params.section || 'home'}`);
              return;
            }
            
            setCurrentUser(user);
            
            // If no adminId in URL, redirect to include it
            if (!params?.adminId) {
              setLocation(`/wilma-admin/${user.id}/home`);
            }
          } else {
            setLocation('/wilma');
          }
        } catch (err) {
          console.error('Auth check failed:', err);
          setLocation('/wilma');
        }
      } else {
        setLocation('/wilma');
      }
      setIsLoading(false);
    };

    checkAuth();
  }, [params?.adminId, params?.section]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { 
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('wilma_user');
      setLocation('/wilma');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading Wilma Admin...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return null; // Will redirect in useEffect
  }

  const roles = currentUser.roles || [currentUser.role];
  const isAdmin = roles.includes('admin') || roles.includes('principal');

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      {/* Header - Wilma Classic Style */}
      <div className="bg-[#003d82] text-white shadow-sm">
        <div className="max-w-7xl mx-auto px-3 md:px-4 py-3 md:py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-lg md:text-2xl font-semibold flex items-center gap-2">
                <GraduationCap className="w-5 h-5 md:w-6 md:h-6 flex-shrink-0" />
                <span className="truncate">Wilma {isAdmin ? 'Hallinta' : 'Opettaja'}</span>
              </h1>
              <p className="text-white/90 mt-0.5 flex items-center gap-2 text-xs md:text-sm">
                <User className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
                <span className="truncate">{currentUser.firstName} {currentUser.lastName} • {isAdmin ? 'Ylläpitäjä' : 'Opettaja'}</span>
              </p>
            </div>
            <div className="flex gap-2 ml-2">
              <Button onClick={() => setLocation('/')} className="bg-white/10 hover:bg-white/20 text-white border-white/20 h-8 md:h-9 px-2 md:px-3 text-xs md:text-sm" size="sm">
                <Home className="w-4 h-4 md:mr-1.5" />
                <span className="hidden md:inline">Etusivu</span>
              </Button>
              <Button onClick={handleLogout} className="bg-white/10 hover:bg-white/20 text-white border-white/20 h-8 md:h-9 px-2 md:px-3 text-xs md:text-sm" size="sm">
                <LogOut className="w-4 h-4 md:mr-1.5" />
                <span className="hidden md:inline">Kirjaudu ulos</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-3 md:px-4 py-4 md:py-6">
        {/* Mobile Menu Button */}
        <div className="md:hidden mb-3">
          <Button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="w-full bg-white text-gray-700 border border-[#dddddd] hover:bg-gray-50 flex items-center justify-between rounded-lg"
          >
            <span className="flex items-center gap-2">
              <Menu className="w-4 h-4" />
              <span className="font-medium text-sm">
                {activeTab === 'home' && 'Koti'}
                {activeTab === 'staff' && 'Henkilökunta'}
                {activeTab === 'students' && 'Opiskelijat'}
                {activeTab === 'messages' && 'Viestit'}
                {activeTab === 'schedule' && 'Lukujärjestys'}
                {activeTab === 'teachers' && 'Opettajat'}
                {activeTab === 'classes' && 'Luokat'}
                {activeTab === 'courses' && 'Kurssit'}
                {activeTab === 'attendance' && 'Tuntimerkinnät'}
                {activeTab === 'rooms' && 'Tilat'}
                {activeTab === 'announcements' && 'Ilmoitukset'}
                {activeTab === 'analytics' && 'Analytiikka'}
                {activeTab === 'settings' && 'Asetukset'}
              </span>
            </span>
            <span className={`transform transition-transform ${mobileMenuOpen ? 'rotate-180' : ''}`}>▼</span>
          </Button>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mb-3 bg-white rounded-lg shadow-sm border border-[#dddddd] overflow-hidden">
            <div className="flex flex-col">{[
              { key: 'home', label: 'Koti', icon: Home },
              { key: 'staff', label: 'Henkilökunta', icon: Users },
              { key: 'students', label: 'Opiskelijat', icon: User },
              { key: 'messages', label: 'Viestit', icon: MessageSquare },
              { key: 'schedule', label: 'Lukujärjestys', icon: Calendar },
              { key: 'courses', label: 'Kurssit', icon: BookOpen },
              { key: 'teachers', label: 'Opettajat', icon: GraduationCap },
              { key: 'classes', label: 'Luokat', icon: Users },
              { key: 'attendance', label: 'Tuntimerkinnät', icon: UserCheck },
              { key: 'rooms', label: 'Tilat', icon: Building },
              { key: 'announcements', label: 'Ilmoitukset', icon: Bell },
              { key: 'analytics', label: 'Analytiikka', icon: BarChart3 },
              { key: 'settings', label: 'Asetukset', icon: Settings }
            ].map(({ key, label, icon: Icon }) => (
              <Button
                key={key}
                onClick={() => {
                  setActiveTab(key);
                  setLocation(`/wilma-admin/${currentUser.id}/${key}`);
                  setMobileMenuOpen(false);
                }}
                className={`justify-start px-4 py-2.5 rounded-none border-b border-[#dddddd] text-sm ${
                  activeTab === key 
                    ? 'bg-[#f5f5f5] text-gray-900 font-medium' 
                    : 'bg-transparent text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-4 h-4 mr-2.5" />
                <span>{label}</span>
              </Button>
            ))}
            </div>
          </div>
        )}

        {/* Top Navigation Bar - Desktop Only - Wilma Style */}
        <div className="hidden md:block bg-white rounded-lg shadow-sm border border-[#dddddd] mb-4">
          <div className="overflow-x-auto">
            <div className="flex gap-0 min-w-max border-b border-[#dddddd]">{[
            { key: 'home', label: 'Koti', icon: Home },
            { key: 'staff', label: 'Henkilökunta', icon: Users },
            { key: 'students', label: 'Opiskelijat', icon: User },
            { key: 'messages', label: 'Viestit', icon: MessageSquare },
            { key: 'schedule', label: 'Lukujärjestys', icon: Calendar },
            { key: 'teachers', label: 'Opettajat', icon: GraduationCap },
            { key: 'classes', label: 'Luokat', icon: Users },
            { key: 'courses', label: 'Kurssit', icon: BookOpen },
            { key: 'attendance', label: 'Tuntimerkinnät', icon: UserCheck },
            { key: 'rooms', label: 'Tilat', icon: Building },
            { key: 'announcements', label: 'Ilmoitukset', icon: Bell },
            { key: 'analytics', label: 'Analytiikka', icon: BarChart3 },
            { key: 'settings', label: 'Asetukset', icon: Settings }
          ].map(({ key, label, icon: Icon }) => (
            <Button
              key={key}
              onClick={() => {
                setActiveTab(key);
                setLocation(`/wilma-admin/${currentUser.id}/${key}`);
              }}
              className={`flex items-center gap-2 px-4 py-3 rounded-none border-b-2 transition-colors ${
                activeTab === key 
                  ? 'border-[#7cb342] text-gray-900 font-semibold bg-white' 
                  : 'border-transparent text-gray-700 hover:bg-gray-50 bg-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-sm whitespace-nowrap">{label}</span>
            </Button>
          ))}
          </div>
        </div>

        {/* Tab Content */}
        <Tabs value={activeTab} onValueChange={(value) => {
          setActiveTab(value);
          setLocation(`/wilma-admin/${currentUser.id}/${value}`);
        }} className="space-y-4 md:space-y-6">
          <TabsContent value="home">
            <WilmaHomeTab userRole={currentUser.role} userRoles={currentUser.roles || [currentUser.role]} />
          </TabsContent>

          <TabsContent value="staff">
            <EnhancedWilmaUserManager />
          </TabsContent>

          <TabsContent value="students">
            <PeopleManager />
          </TabsContent>

          <TabsContent value="messages">
            <EnhancedMessageSystem />
          </TabsContent>

          <TabsContent value="schedule">
            <Tabs defaultValue="schedules" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2 bg-white border border-[#dddddd] rounded-lg p-1">
                <TabsTrigger value="schedules" className="data-[state=active]:bg-[#003d82] data-[state=active]:text-white rounded-lg">
                  Lukujärjestykset
                </TabsTrigger>
                <TabsTrigger value="settings" className="data-[state=active]:bg-[#003d82] data-[state=active]:text-white rounded-lg">
                  <Clock className="w-4 h-4 mr-2" />
                  Asetukset
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="schedules">
                <ScheduleManager />
              </TabsContent>
              
              <TabsContent value="settings">
                <ScheduleSettingsManager />
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="teachers">
            <TeacherDirectory />
          </TabsContent>

          <TabsContent value="classes">
            <ClassesManager />
          </TabsContent>

          <TabsContent value="courses">
            <Tabs defaultValue="courses" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2 bg-white border border-[#dddddd] rounded-lg p-1">
                <TabsTrigger value="courses" className="data-[state=active]:bg-[#003d82] data-[state=active]:text-white rounded-lg">
                  <BookOpen className="w-4 h-4 mr-2" />
                  Kurssit
                </TabsTrigger>
                <TabsTrigger value="enrollments" className="data-[state=active]:bg-[#003d82] data-[state=active]:text-white rounded-lg">
                  <UserCheck className="w-4 h-4 mr-2" />
                  Ilmoittautumiset
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="courses">
                <CourseManager />
              </TabsContent>
              
              <TabsContent value="enrollments">
                <StudentEnrollmentManager />
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="attendance">
            <WilmaStyleAttendance />
          </TabsContent>

          <TabsContent value="rooms">
            <Card className="border-2 border-pink-200 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-pink-50 to-rose-50">
                <CardTitle className="flex items-center gap-2">
                  <Building className="w-5 h-5 text-pink-600" />
                  Tilahakemisto
                </CardTitle>
                <CardDescription>Hallinnoi tiloja ja laitteita</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <Button className="bg-pink-600 hover:bg-pink-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Lisää tila
                    </Button>
                    <Button variant="outline">
                      <MapPin className="w-4 h-4 mr-2" />
                      Näytä kartalla
                    </Button>
                    <Button variant="outline">
                      <Eye className="w-4 h-4 mr-2" />
                      Saatavuus
                    </Button>
                  </div>
                  <div className="space-y-4">
                    <div className="bg-white border-2 border-pink-200 rounded-lg p-4">
                      <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                        <Building className="w-5 h-5 text-pink-600" />
                        Tilojen saatavuus
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                          { room: 'A101', status: 'available', capacity: 30 },
                          { room: 'A102', status: 'occupied', capacity: 25 },
                          { room: 'B201', status: 'available', capacity: 40 },
                          { room: 'B202', status: 'maintenance', capacity: 35 },
                          { room: 'C301', status: 'available', capacity: 20 },
                          { room: 'Lab 1', status: 'occupied', capacity: 15 },
                          { room: 'Sali', status: 'available', capacity: 100 },
                          { room: 'Kirjasto', status: 'available', capacity: 50 }
                        ].map((room, idx) => (
                          <div key={idx} className={`p-3 rounded-lg border-2 ${
                            room.status === 'available' ? 'bg-green-50 border-green-200' :
                            room.status === 'occupied' ? 'bg-red-50 border-red-200' :
                            'bg-yellow-50 border-yellow-200'
                          }`}>
                            <p className="font-semibold text-sm">{room.room}</p>
                            <p className="text-xs text-gray-600">{room.capacity} paikkaa</p>
                            <p className={`text-xs font-medium mt-1 ${
                              room.status === 'available' ? 'text-green-600' :
                              room.status === 'occupied' ? 'text-red-600' :
                              'text-yellow-600'
                            }`}>
                              {room.status === 'available' ? '✓ Vapaa' :
                               room.status === 'occupied' ? '● Käytössä' :
                               '⚠ Huolto'}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Button className="bg-pink-600 hover:bg-pink-700 h-auto py-4">
                        <Plus className="w-5 h-5 mr-2" />
                        <div className="text-left">
                          <p className="font-semibold">Lisää tila</p>
                          <p className="text-xs opacity-90">Rekisteröi uusi tila</p>
                        </div>
                      </Button>
                      <Button variant="outline" className="h-auto py-4">
                        <MapPin className="w-5 h-5 mr-2" />
                        <div className="text-left">
                          <p className="font-semibold">Näytä kartalla</p>
                          <p className="text-xs text-gray-600">Kampuskarttanäkymä</p>
                        </div>
                      </Button>
                      <Button variant="outline" className="h-auto py-4">
                        <Eye className="w-5 h-5 mr-2" />
                        <div className="text-left">
                          <p className="font-semibold">Varaa tila</p>
                          <p className="text-xs text-gray-600">Varaa tapahtumaan</p>
                        </div>
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="announcements">
            <Card className="border-2 border-indigo-200 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50">
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-indigo-600" />
                  Ilmoitukset
                </CardTitle>
                <CardDescription>Luo ja hallinnoi koulun ilmoituksia</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <Button className="bg-indigo-600 hover:bg-indigo-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Uusi ilmoitus
                    </Button>
                    <Button variant="outline">
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Lähetä kaikille
                    </Button>
                    <Button variant="outline">
                      <Clock className="w-4 h-4 mr-2" />
                      Ajasta
                    </Button>
                  </div>
                  <div className="space-y-4">
                    <div className="bg-white border-2 border-indigo-200 rounded-lg p-4">
                      <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                        <Bell className="w-5 h-5 text-indigo-600" />
                        Viimeisimmät ilmoitukset
                      </h3>
                      <div className="space-y-3">
                        {[
                          { title: 'Koulun sulkemisilmoitus', date: '2 tuntia sitten', priority: 'high' },
                          { title: 'Vanhempainilta', date: '1 päivä sitten', priority: 'medium' },
                          { title: 'Urheilupäivän aikataulu', date: '3 päivää sitten', priority: 'low' },
                          { title: 'Kokeaikataulut julkaistu', date: '1 viikko sitten', priority: 'medium' }
                        ].map((announcement, idx) => (
                          <div key={idx} className="flex items-center justify-between bg-indigo-50 p-3 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className={`w-2 h-2 rounded-full ${
                                announcement.priority === 'high' ? 'bg-red-500' :
                                announcement.priority === 'medium' ? 'bg-yellow-500' :
                                'bg-green-500'
                              }`} />
                              <div>
                                <p className="font-semibold text-sm">{announcement.title}</p>
                                <p className="text-xs text-gray-600">{announcement.date}</p>
                              </div>
                            </div>
                            <Button size="sm" variant="outline">Muokkaa</Button>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Button className="bg-indigo-600 hover:bg-indigo-700 h-auto py-4">
                        <Plus className="w-5 h-5 mr-2" />
                        <div className="text-left">
                          <p className="font-semibold">Uusi ilmoitus</p>
                          <p className="text-xs opacity-90">Lähetä kaikille käyttäjille</p>
                        </div>
                      </Button>
                      <Button variant="outline" className="h-auto py-4">
                        <Clock className="w-5 h-5 mr-2" />
                        <div className="text-left">
                          <p className="font-semibold">Ajasta julkaisu</p>
                          <p className="text-xs text-gray-600">Aseta julkaisuaika</p>
                        </div>
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <Card className="border-2 border-cyan-200 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-cyan-50 to-teal-50">
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-cyan-600" />
                  Analytiikka ja raportit
                </CardTitle>
                <CardDescription>Tarkastele tilastoja ja luo raportteja</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                      <CardContent className="p-4">
                        <TrendingUp className="w-8 h-8 text-blue-600 mb-2" />
                        <p className="text-sm font-medium text-gray-700">Suoritustrendit</p>
                        <p className="text-2xl font-bold text-blue-600 mt-1">+12%</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                      <CardContent className="p-4">
                        <UserCheck className="w-8 h-8 text-green-600 mb-2" />
                        <p className="text-sm font-medium text-gray-700">Läsnäoloprosentti</p>
                        <p className="text-2xl font-bold text-green-600 mt-1">94.5%</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                      <CardContent className="p-4">
                        <Award className="w-8 h-8 text-purple-600 mb-2" />
                        <p className="text-sm font-medium text-gray-700">Keskiarvo</p>
                        <p className="text-2xl font-bold text-purple-600 mt-1">8.2</p>
                      </CardContent>
                    </Card>
                  </div>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                        <CardContent className="p-4">
                          <TrendingUp className="w-8 h-8 text-blue-600 mb-2" />
                          <p className="text-sm font-medium text-gray-700">Suoritustrendit</p>
                          <p className="text-2xl font-bold text-blue-600 mt-1">+12%</p>
                          <p className="text-xs text-gray-600 mt-1">vs edellinen lukukausi</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                        <CardContent className="p-4">
                          <UserCheck className="w-8 h-8 text-green-600 mb-2" />
                          <p className="text-sm font-medium text-gray-700">Läsnäoloprosentti</p>
                          <p className="text-2xl font-bold text-green-600 mt-1">94.5%</p>
                          <p className="text-xs text-gray-600 mt-1">Tässä kuussa</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                        <CardContent className="p-4">
                          <Award className="w-8 h-8 text-purple-600 mb-2" />
                          <p className="text-sm font-medium text-gray-700">Keskiarvo</p>
                          <p className="text-2xl font-bold text-purple-600 mt-1">8.2</p>
                          <p className="text-xs text-gray-600 mt-1">Asteikolla 4-10</p>
                        </CardContent>
                      </Card>
                    </div>
                    <div className="bg-white border-2 border-cyan-200 rounded-lg p-4">
                      <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-cyan-600" />
                        Pikatilastot
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-3 bg-cyan-50 rounded-lg">
                          <p className="text-2xl font-bold text-cyan-600">156</p>
                          <p className="text-xs text-gray-600 mt-1">Opiskelijaa yhteensä</p>
                        </div>
                        <div className="text-center p-3 bg-cyan-50 rounded-lg">
                          <p className="text-2xl font-bold text-cyan-600">24</p>
                          <p className="text-xs text-gray-600 mt-1">Opettajaa</p>
                        </div>
                        <div className="text-center p-3 bg-cyan-50 rounded-lg">
                          <p className="text-2xl font-bold text-cyan-600">18</p>
                          <p className="text-xs text-gray-600 mt-1">Aktiivista kurssia</p>
                        </div>
                        <div className="text-center p-3 bg-cyan-50 rounded-lg">
                          <p className="text-2xl font-bold text-cyan-600">32</p>
                          <p className="text-xs text-gray-600 mt-1">Luokkahuonetta</p>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Button className="bg-cyan-600 hover:bg-cyan-700 h-auto py-4">
                        <Download className="w-5 h-5 mr-2" />
                        <div className="text-left">
                          <p className="font-semibold">Vie raportti</p>
                          <p className="text-xs opacity-90">Lataa yksityiskohtainen analyysi</p>
                        </div>
                      </Button>
                      <Button variant="outline" className="h-auto py-4">
                        <Filter className="w-5 h-5 mr-2" />
                        <div className="text-left">
                          <p className="font-semibold">Mukautettu raportti</p>
                          <p className="text-xs text-gray-600">Luo suodatettu näkymä</p>
                        </div>
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <WilmaSettingsManager />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
