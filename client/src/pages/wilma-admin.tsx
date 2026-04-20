import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import EnhancedWilmaUserManager from "@/components/EnhancedWilmaUserManager";
import PeopleManager from "@/components/PeopleManager";
import WilmaHomeTab from "@/components/WilmaHomeTab";
import WilmaMessagesManager from "@/components/WilmaMessagesManager";
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header - Mobile Responsive */}
      <div className="bg-gradient-to-r from-[#003d82] to-[#0052a3] text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-3 md:px-4 py-4 md:py-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl md:text-3xl font-bold flex items-center gap-2 md:gap-3">
                <GraduationCap className="w-6 h-6 md:w-8 md:h-8 flex-shrink-0" />
                <span className="truncate">Wilma {isAdmin ? 'Hallinta' : 'Opettaja'}</span>
              </h1>
              <p className="text-blue-100 mt-1 flex items-center gap-2 text-xs md:text-base">
                <User className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
                <span className="truncate">{currentUser.firstName} {currentUser.lastName} • {isAdmin ? 'Ylläpitäjä' : 'Opettaja'}</span>
              </p>
            </div>
            <div className="flex gap-2 md:gap-3 ml-2">
              <Button onClick={() => setLocation('/')} className="bg-white/20 hover:bg-white/30 text-white h-8 md:h-10 px-2 md:px-4" size="sm">
                <Home className="w-4 h-4 md:mr-2" />
                <span className="hidden md:inline">Etusivu</span>
              </Button>
              <Button onClick={handleLogout} className="bg-red-500/80 hover:bg-red-600 text-white h-8 md:h-10 px-2 md:px-4" size="sm">
                <LogOut className="w-4 h-4 md:mr-2" />
                <span className="hidden md:inline">Kirjaudu ulos</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-3 md:px-4 py-4 md:py-6">
        {/* Mobile Menu Button */}
        <div className="md:hidden mb-4">
          <Button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="w-full bg-white text-gray-700 border-2 border-blue-200 hover:bg-blue-50 flex items-center justify-between"
          >
            <span className="flex items-center gap-2">
              <Menu className="w-5 h-5" />
              <span className="font-medium">
                {activeTab === 'home' && 'Koti'}
                {activeTab === 'staff' && 'Henkilökunta'}
                {activeTab === 'students' && 'Opiskelijat'}
                {activeTab === 'messages' && 'Viestit'}
                {activeTab === 'schedule' && 'Lukujärjestys'}
                {activeTab === 'courses' && 'Kurssit'}
                {activeTab === 'teachers' && 'Opettajat'}
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
          <div className="md:hidden mb-4 bg-white rounded-lg shadow-lg border-2 border-blue-100 overflow-hidden">
            <div className="flex flex-col">
              <Button
                onClick={() => {
                  setActiveTab('home');
                  setLocation(`/wilma-admin/${currentUser.id}/home`);
                  setMobileMenuOpen(false);
                }}
                className={`justify-start px-4 py-3 rounded-none border-b ${
                  activeTab === 'home' 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-transparent text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Home className="w-4 h-4 mr-3" />
                <span>Koti</span>
              </Button>
              
              <Button
                onClick={() => {
                  setActiveTab('staff');
                  setLocation(`/wilma-admin/${currentUser.id}/staff`);
                  setMobileMenuOpen(false);
                }}
                className={`justify-start px-4 py-3 rounded-none border-b ${
                  activeTab === 'staff' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-transparent text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Users className="w-4 h-4 mr-3" />
                <span>Henkilökunta</span>
              </Button>
              
              <Button
                onClick={() => {
                  setActiveTab('students');
                  setLocation(`/wilma-admin/${currentUser.id}/students`);
                  setMobileMenuOpen(false);
                }}
                className={`justify-start px-4 py-3 rounded-none border-b ${
                  activeTab === 'students' 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-transparent text-gray-700 hover:bg-gray-100'
                }`}
              >
                <User className="w-4 h-4 mr-3" />
                <span>Opiskelijat</span>
              </Button>
              
              <Button
                onClick={() => {
                  setActiveTab('messages');
                  setLocation(`/wilma-admin/${currentUser.id}/messages`);
                  setMobileMenuOpen(false);
                }}
                className={`justify-start px-4 py-3 rounded-none border-b ${
                  activeTab === 'messages' 
                    ? 'bg-teal-600 text-white' 
                    : 'bg-transparent text-gray-700 hover:bg-gray-100'
                }`}
              >
                <MessageSquare className="w-4 h-4 mr-3" />
                <span>Viestit</span>
              </Button>
              
              <Button
                onClick={() => {
                  setActiveTab('schedule');
                  setLocation(`/wilma-admin/${currentUser.id}/schedule`);
                  setMobileMenuOpen(false);
                }}
                className={`justify-start px-4 py-3 rounded-none border-b ${
                  activeTab === 'schedule' 
                    ? 'bg-green-600 text-white' 
                    : 'bg-transparent text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Calendar className="w-4 h-4 mr-3" />
                <span>Lukujärjestys</span>
              </Button>
              
              <Button
                onClick={() => {
                  setActiveTab('courses');
                  setLocation(`/wilma-admin/${currentUser.id}/courses`);
                  setMobileMenuOpen(false);
                }}
                className={`justify-start px-4 py-3 rounded-none border-b ${
                  activeTab === 'courses' 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-transparent text-gray-700 hover:bg-gray-100'
                }`}
              >
                <BookOpen className="w-4 h-4 mr-3" />
                <span>Kurssit</span>
              </Button>
              
              <Button
                onClick={() => {
                  setActiveTab('teachers');
                  setLocation(`/wilma-admin/${currentUser.id}/teachers`);
                  setMobileMenuOpen(false);
                }}
                className={`justify-start px-4 py-3 rounded-none border-b ${
                  activeTab === 'teachers' 
                    ? 'bg-orange-600 text-white' 
                    : 'bg-transparent text-gray-700 hover:bg-gray-100'
                }`}
              >
                <GraduationCap className="w-4 h-4 mr-3" />
                <span>Opettajat</span>
              </Button>
              
              <Button
                onClick={() => {
                  setActiveTab('rooms');
                  setLocation(`/wilma-admin/${currentUser.id}/rooms`);
                  setMobileMenuOpen(false);
                }}
                className={`justify-start px-4 py-3 rounded-none border-b ${
                  activeTab === 'rooms' 
                    ? 'bg-pink-600 text-white' 
                    : 'bg-transparent text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Building className="w-4 h-4 mr-3" />
                <span>Tilat</span>
              </Button>
              
              <Button
                onClick={() => {
                  setActiveTab('announcements');
                  setLocation(`/wilma-admin/${currentUser.id}/announcements`);
                  setMobileMenuOpen(false);
                }}
                className={`justify-start px-4 py-3 rounded-none border-b ${
                  activeTab === 'announcements' 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-transparent text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Bell className="w-4 h-4 mr-3" />
                <span>Ilmoitukset</span>
              </Button>
              
              <Button
                onClick={() => {
                  setActiveTab('analytics');
                  setLocation(`/wilma-admin/${currentUser.id}/analytics`);
                  setMobileMenuOpen(false);
                }}
                className={`justify-start px-4 py-3 rounded-none border-b ${
                  activeTab === 'analytics' 
                    ? 'bg-cyan-600 text-white' 
                    : 'bg-transparent text-gray-700 hover:bg-gray-100'
                }`}
              >
                <BarChart3 className="w-4 h-4 mr-3" />
                <span>Analytiikka</span>
              </Button>
              
              <Button
                onClick={() => {
                  setActiveTab('settings');
                  setLocation(`/wilma-admin/${currentUser.id}/settings`);
                  setMobileMenuOpen(false);
                }}
                className={`justify-start px-4 py-3 rounded-none ${
                  activeTab === 'settings' 
                    ? 'bg-gray-600 text-white' 
                    : 'bg-transparent text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Settings className="w-4 h-4 mr-3" />
                <span>Asetukset</span>
              </Button>
            </div>
          </div>
        )}

        {/* Top Navigation Bar - Desktop Only */}
        <div className="hidden md:block bg-white rounded-lg shadow-lg border-2 border-blue-100 mb-6 overflow-x-auto">
          <div className="flex gap-1 p-2 min-w-max">
            <Button
              onClick={() => {
                setActiveTab('home');
                setLocation(`/wilma-admin/${currentUser.id}/home`);
              }}
              className={`flex items-center gap-2 px-4 py-3 rounded-md transition-all ${
                activeTab === 'home' 
                  ? 'bg-indigo-600 text-white shadow-md' 
                  : 'bg-transparent text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Home className="w-4 h-4" />
              <span className="font-medium">Koti</span>
            </Button>
            
            <Button
              onClick={() => {
                setActiveTab('staff');
                setLocation(`/wilma-admin/${currentUser.id}/staff`);
              }}
              className={`flex items-center gap-2 px-4 py-3 rounded-md transition-all ${
                activeTab === 'staff' 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'bg-transparent text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Users className="w-4 h-4" />
              <span className="font-medium">Henkilökunta</span>
            </Button>
            
            <Button
              onClick={() => {
                setActiveTab('students');
                setLocation(`/wilma-admin/${currentUser.id}/students`);
              }}
              className={`flex items-center gap-2 px-4 py-3 rounded-md transition-all ${
                activeTab === 'students' 
                  ? 'bg-purple-600 text-white shadow-md' 
                  : 'bg-transparent text-gray-700 hover:bg-gray-100'
              }`}
            >
              <User className="w-4 h-4" />
              <span className="font-medium">Opiskelijat</span>
            </Button>
            
            <Button
              onClick={() => {
                setActiveTab('messages');
                setLocation(`/wilma-admin/${currentUser.id}/messages`);
              }}
              className={`flex items-center gap-2 px-4 py-3 rounded-md transition-all ${
                activeTab === 'messages' 
                  ? 'bg-teal-600 text-white shadow-md' 
                  : 'bg-transparent text-gray-700 hover:bg-gray-100'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span className="font-medium">Viestit</span>
            </Button>
            
            <Button
              onClick={() => {
                setActiveTab('schedule');
                setLocation(`/wilma-admin/${currentUser.id}/schedule`);
              }}
              className={`flex items-center gap-2 px-4 py-3 rounded-md transition-all ${
                activeTab === 'schedule' 
                  ? 'bg-green-600 text-white shadow-md' 
                  : 'bg-transparent text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span className="font-medium">Lukujärjestys</span>
            </Button>
            
            <Button
              onClick={() => {
                setActiveTab('courses');
                setLocation(`/wilma-admin/${currentUser.id}/courses`);
              }}
              className={`flex items-center gap-2 px-4 py-3 rounded-md transition-all ${
                activeTab === 'courses' 
                  ? 'bg-purple-600 text-white shadow-md' 
                  : 'bg-transparent text-gray-700 hover:bg-gray-100'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span className="font-medium">Kurssit</span>
            </Button>
            
            <Button
              onClick={() => {
                setActiveTab('teachers');
                setLocation(`/wilma-admin/${currentUser.id}/teachers`);
              }}
              className={`flex items-center gap-2 px-4 py-3 rounded-md transition-all ${
                activeTab === 'teachers' 
                  ? 'bg-orange-600 text-white shadow-md' 
                  : 'bg-transparent text-gray-700 hover:bg-gray-100'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span className="font-medium">Opettajat</span>
            </Button>
            
            <Button
              onClick={() => {
                setActiveTab('rooms');
                setLocation(`/wilma-admin/${currentUser.id}/rooms`);
              }}
              className={`flex items-center gap-2 px-4 py-3 rounded-md transition-all ${
                activeTab === 'rooms' 
                  ? 'bg-pink-600 text-white shadow-md' 
                  : 'bg-transparent text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Building className="w-4 h-4" />
              <span className="font-medium">Tilat</span>
            </Button>
            
            <Button
              onClick={() => {
                setActiveTab('announcements');
                setLocation(`/wilma-admin/${currentUser.id}/announcements`);
              }}
              className={`flex items-center gap-2 px-4 py-3 rounded-md transition-all ${
                activeTab === 'announcements' 
                  ? 'bg-indigo-600 text-white shadow-md' 
                  : 'bg-transparent text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Bell className="w-4 h-4" />
              <span className="font-medium">Ilmoitukset</span>
            </Button>
            
            <Button
              onClick={() => {
                setActiveTab('analytics');
                setLocation(`/wilma-admin/${currentUser.id}/analytics`);
              }}
              className={`flex items-center gap-2 px-4 py-3 rounded-md transition-all ${
                activeTab === 'analytics' 
                  ? 'bg-cyan-600 text-white shadow-md' 
                  : 'bg-transparent text-gray-700 hover:bg-gray-100'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span className="font-medium">Analytiikka</span>
            </Button>
            
            <Button
              onClick={() => {
                setActiveTab('settings');
                setLocation(`/wilma-admin/${currentUser.id}/settings`);
              }}
              className={`flex items-center gap-2 px-4 py-3 rounded-md transition-all ${
                activeTab === 'settings' 
                  ? 'bg-gray-600 text-white shadow-md' 
                  : 'bg-transparent text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span className="font-medium">Asetukset</span>
            </Button>
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
            <WilmaMessagesManager />
          </TabsContent>

          <TabsContent value="schedule">
            <Card className="border-2 border-green-200 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-green-600" />
                  Lukujärjestyksen hallinta
                </CardTitle>
                <CardDescription>Luo ja hallinnoi luokkien lukujärjestyksiä</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <Button className="bg-green-600 hover:bg-green-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Luo lukujärjestys
                    </Button>
                    <Button variant="outline">
                      <Upload className="w-4 h-4 mr-2" />
                      Tuo CSV
                    </Button>
                    <Button variant="outline">
                      <Download className="w-4 h-4 mr-2" />
                      Vie
                    </Button>
                  </div>
                  <div className="space-y-4">
                    <div className="bg-white border-2 border-green-200 rounded-lg p-4">
                      <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-green-600" />
                        Viikon lukujärjestys
                      </h3>
                      <div className="grid grid-cols-5 gap-2">
                        {['Maanantai', 'Tiistai', 'Keskiviikko', 'Torstai', 'Perjantai'].map((day) => (
                          <div key={day} className="bg-green-50 p-3 rounded-lg">
                            <p className="font-semibold text-sm text-green-800">{day}</p>
                            <p className="text-xs text-gray-600 mt-2">8 tuntia</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Button className="bg-green-600 hover:bg-green-700 h-auto py-4">
                        <Plus className="w-5 h-5 mr-2" />
                        <div className="text-left">
                          <p className="font-semibold">Luo uusi lukujärjestys</p>
                          <p className="text-xs opacity-90">Lisää tunnit ja määritä opettajat</p>
                        </div>
                      </Button>
                      <Button variant="outline" className="h-auto py-4">
                        <Download className="w-5 h-5 mr-2" />
                        <div className="text-left">
                          <p className="font-semibold">Vie lukujärjestys</p>
                          <p className="text-xs text-gray-600">Lataa PDF tai CSV</p>
                        </div>
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="courses">
            <Card className="border-2 border-purple-200 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-violet-50">
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-purple-600" />
                  Kurssien hallinta
                </CardTitle>
                <CardDescription>Hallinnoi kursseja ja ilmoittautumisia</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <Button className="bg-purple-600 hover:bg-purple-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Lisää kurssi
                    </Button>
                    <Button variant="outline">
                      <Search className="w-4 h-4 mr-2" />
                      Hae kursseja
                    </Button>
                    <Button variant="outline">
                      <Filter className="w-4 h-4 mr-2" />
                      Suodata
                    </Button>
                  </div>
                  <div className="space-y-4">
                    <div className="bg-white border-2 border-purple-200 rounded-lg p-4">
                      <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-purple-600" />
                        Aktiiviset kurssit
                      </h3>
                      <div className="space-y-3">
                        {['Matematiikka 1', 'Englannin kirjallisuus', 'Fysiikka syventävä', 'Suomen historia'].map((course, idx) => (
                          <div key={idx} className="flex items-center justify-between bg-purple-50 p-3 rounded-lg">
                            <div>
                              <p className="font-semibold text-sm">{course}</p>
                              <p className="text-xs text-gray-600">{20 + idx * 5} opiskelijaa ilmoittautunut</p>
                            </div>
                            <Button size="sm" variant="outline">Hallinnoi</Button>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Button className="bg-purple-600 hover:bg-purple-700 h-auto py-4">
                        <Plus className="w-5 h-5 mr-2" />
                        <div className="text-left">
                          <p className="font-semibold">Luo uusi kurssi</p>
                          <p className="text-xs opacity-90">Aseta opetussuunnitelma ja materiaalit</p>
                        </div>
                      </Button>
                      <Button variant="outline" className="h-auto py-4">
                        <Search className="w-5 h-5 mr-2" />
                        <div className="text-left">
                          <p className="font-semibold">Selaa luetteloa</p>
                          <p className="text-xs text-gray-600">Näytä kaikki saatavilla olevat kurssit</p>
                        </div>
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="teachers">
            <Card className="border-2 border-orange-200 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50">
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-orange-600" />
                  Opettajahakemisto
                </CardTitle>
                <CardDescription>Hallinnoi opettajien profiileja ja tehtäviä</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <Button className="bg-orange-600 hover:bg-orange-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Lisää opettaja
                    </Button>
                    <Button variant="outline">
                      <Mail className="w-4 h-4 mr-2" />
                      Lähetä sähköposti
                    </Button>
                    <Button variant="outline">
                      <Download className="w-4 h-4 mr-2" />
                      Vie lista
                    </Button>
                  </div>
                  <div className="space-y-4">
                    <div className="bg-white border-2 border-orange-200 rounded-lg p-4">
                      <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                        <GraduationCap className="w-5 h-5 text-orange-600" />
                        Opettajahakemisto
                      </h3>
                      <div className="space-y-3">
                        {[
                          { name: 'Maria Virtanen', subject: 'Matematiikka', students: 45 },
                          { name: 'Jukka Korhonen', subject: 'Fysiikka', students: 38 },
                          { name: 'Anna Mäkinen', subject: 'Englanti', students: 52 },
                          { name: 'Pekka Nieminen', subject: 'Historia', students: 41 }
                        ].map((teacher, idx) => (
                          <div key={idx} className="flex items-center justify-between bg-orange-50 p-3 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-orange-200 rounded-full flex items-center justify-center">
                                <User className="w-5 h-5 text-orange-700" />
                              </div>
                              <div>
                                <p className="font-semibold text-sm">{teacher.name}</p>
                                <p className="text-xs text-gray-600">{teacher.subject} • {teacher.students} opiskelijaa</p>
                              </div>
                            </div>
                            <Button size="sm" variant="outline">Näytä profiili</Button>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Button className="bg-orange-600 hover:bg-orange-700 h-auto py-4">
                        <Plus className="w-5 h-5 mr-2" />
                        <div className="text-left">
                          <p className="font-semibold">Lisää uusi opettaja</p>
                          <p className="text-xs opacity-90">Luo opettajan profiili</p>
                        </div>
                      </Button>
                      <Button variant="outline" className="h-auto py-4">
                        <Mail className="w-5 h-5 mr-2" />
                        <div className="text-left">
                          <p className="font-semibold">Lähetä ryhmäsähköposti</p>
                          <p className="text-xs text-gray-600">Ota yhteyttä kaikkiin opettajiin</p>
                        </div>
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
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
                  Announcements
                </CardTitle>
                <CardDescription>Create and manage school announcements</CardDescription>
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
                        Recent Announcements
                      </h3>
                      <div className="space-y-3">
                        {[
                          { title: 'School Closure Notice', date: '2 hours ago', priority: 'high' },
                          { title: 'Parent-Teacher Meeting', date: '1 day ago', priority: 'medium' },
                          { title: 'Sports Day Schedule', date: '3 days ago', priority: 'low' },
                          { title: 'Exam Timetable Released', date: '1 week ago', priority: 'medium' }
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
                            <Button size="sm" variant="outline">Edit</Button>
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
                  Analytics & Reports
                </CardTitle>
                <CardDescription>View insights and generate reports</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                      <CardContent className="p-4">
                        <TrendingUp className="w-8 h-8 text-blue-600 mb-2" />
                        <p className="text-sm font-medium text-gray-700">Performance Trends</p>
                        <p className="text-2xl font-bold text-blue-600 mt-1">+12%</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                      <CardContent className="p-4">
                        <UserCheck className="w-8 h-8 text-green-600 mb-2" />
                        <p className="text-sm font-medium text-gray-700">Attendance Rate</p>
                        <p className="text-2xl font-bold text-green-600 mt-1">94.5%</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                      <CardContent className="p-4">
                        <Award className="w-8 h-8 text-purple-600 mb-2" />
                        <p className="text-sm font-medium text-gray-700">Average Grade</p>
                        <p className="text-2xl font-bold text-purple-600 mt-1">8.2</p>
                      </CardContent>
                    </Card>
                  </div>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                        <CardContent className="p-4">
                          <TrendingUp className="w-8 h-8 text-blue-600 mb-2" />
                          <p className="text-sm font-medium text-gray-700">Performance Trends</p>
                          <p className="text-2xl font-bold text-blue-600 mt-1">+12%</p>
                          <p className="text-xs text-gray-600 mt-1">vs last semester</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                        <CardContent className="p-4">
                          <UserCheck className="w-8 h-8 text-green-600 mb-2" />
                          <p className="text-sm font-medium text-gray-700">Attendance Rate</p>
                          <p className="text-2xl font-bold text-green-600 mt-1">94.5%</p>
                          <p className="text-xs text-gray-600 mt-1">This month</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                        <CardContent className="p-4">
                          <Award className="w-8 h-8 text-purple-600 mb-2" />
                          <p className="text-sm font-medium text-gray-700">Average Grade</p>
                          <p className="text-2xl font-bold text-purple-600 mt-1">8.2</p>
                          <p className="text-xs text-gray-600 mt-1">Out of 10</p>
                        </CardContent>
                      </Card>
                    </div>
                    <div className="bg-white border-2 border-cyan-200 rounded-lg p-4">
                      <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-cyan-600" />
                        Quick Stats
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-3 bg-cyan-50 rounded-lg">
                          <p className="text-2xl font-bold text-cyan-600">156</p>
                          <p className="text-xs text-gray-600 mt-1">Total Students</p>
                        </div>
                        <div className="text-center p-3 bg-cyan-50 rounded-lg">
                          <p className="text-2xl font-bold text-cyan-600">24</p>
                          <p className="text-xs text-gray-600 mt-1">Teachers</p>
                        </div>
                        <div className="text-center p-3 bg-cyan-50 rounded-lg">
                          <p className="text-2xl font-bold text-cyan-600">18</p>
                          <p className="text-xs text-gray-600 mt-1">Active Courses</p>
                        </div>
                        <div className="text-center p-3 bg-cyan-50 rounded-lg">
                          <p className="text-2xl font-bold text-cyan-600">32</p>
                          <p className="text-xs text-gray-600 mt-1">Classrooms</p>
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
            <Card className="border-2 border-gray-200 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-slate-50">
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-gray-600" />
                  Järjestelmän asetukset
                </CardTitle>
                <CardDescription>Määritä Wilman järjestelmäasetukset</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="border-2 border-blue-200">
                      <CardContent className="p-4">
                        <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-blue-600" />
                          Yleiset asetukset
                        </h3>
                        <p className="text-sm text-gray-600">Koulun nimi, lukuvuosi, lukukaudet</p>
                      </CardContent>
                    </Card>
                    <Card className="border-2 border-green-200">
                      <CardContent className="p-4">
                        <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                          <Mail className="w-5 h-5 text-green-600" />
                          Sähköpostiasetukset
                        </h3>
                        <p className="text-sm text-gray-600">SMTP-asetukset, mallit</p>
                      </CardContent>
                    </Card>
                    <Card className="border-2 border-purple-200">
                      <CardContent className="p-4">
                        <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                          <Bell className="w-5 h-5 text-purple-600" />
                          Notifications
                        </h3>
                        <p className="text-sm text-gray-600">Push notifications, alerts</p>
                      </CardContent>
                    </Card>
                    <Card className="border-2 border-orange-200">
                      <CardContent className="p-4">
                        <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                          <AlertCircle className="w-5 h-5 text-orange-600" />
                          Security
                        </h3>
                        <p className="text-sm text-gray-600">Password policies, 2FA</p>
                      </CardContent>
                    </Card>
                  </div>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card className="border-2 border-blue-200">
                        <CardContent className="p-4">
                          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-blue-600" />
                            Yleiset asetukset
                          </h3>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">Koulun nimi</span>
                              <Button size="sm" variant="outline">Muokkaa</Button>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">Lukuvuosi</span>
                              <Button size="sm" variant="outline">Muokkaa</Button>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">Lukukaudet ja lomat</span>
                              <Button size="sm" variant="outline">Muokkaa</Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="border-2 border-green-200">
                        <CardContent className="p-4">
                          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                            <Mail className="w-5 h-5 text-green-600" />
                            Sähköpostiasetukset
                          </h3>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">SMTP-asetukset</span>
                              <Button size="sm" variant="outline">Määritä</Button>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">Sähköpostimallit</span>
                              <Button size="sm" variant="outline">Hallinnoi</Button>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">Lähettäjän osoite</span>
                              <Button size="sm" variant="outline">Muokkaa</Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="border-2 border-purple-200">
                        <CardContent className="p-4">
                          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                            <Bell className="w-5 h-5 text-purple-600" />
                            Ilmoitukset
                          </h3>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">Push-ilmoitukset</span>
                              <Button size="sm" variant="outline">Ota käyttöön</Button>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">Sähköpostihälytykset</span>
                              <Button size="sm" variant="outline">Määritä</Button>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">Tekstiviesti-ilmoitukset</span>
                              <Button size="sm" variant="outline">Aseta</Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="border-2 border-orange-200">
                        <CardContent className="p-4">
                          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-orange-600" />
                            Turvallisuus
                          </h3>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">Salasanakäytäntö</span>
                              <Button size="sm" variant="outline">Muokkaa</Button>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">Kaksivaiheinen tunnistautuminen</span>
                              <Button size="sm" variant="outline">Määritä</Button>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">Istunnon aikakatkaisu</span>
                              <Button size="sm" variant="outline">Aseta</Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                    <div className="bg-white border-2 border-gray-200 rounded-lg p-4">
                      <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                        <Settings className="w-5 h-5 text-gray-600" />
                        Järjestelmän tiedot
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm font-semibold text-gray-700">Versio</p>
                          <p className="text-lg font-bold text-gray-900 mt-1">3.2.0</p>
                        </div>
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm font-semibold text-gray-700">Käyttöaika</p>
                          <p className="text-lg font-bold text-gray-900 mt-1">99.9%</p>
                        </div>
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm font-semibold text-gray-700">Tallennustila</p>
                          <p className="text-lg font-bold text-gray-900 mt-1">2.4 GB</p>
                        </div>
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm font-semibold text-gray-700">Käyttäjät</p>
                          <p className="text-lg font-bold text-gray-900 mt-1">180</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
