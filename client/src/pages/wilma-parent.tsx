import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  LogOut, Home, Calendar, Award, FileText, 
  MessageSquare, UserCheck, Settings, Menu, 
  Users, Baby, TrendingUp, Bell
} from "lucide-react";

export default function WilmaParent() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute('/wilma-parent/:parentId?');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeSection, setActiveSection] = useState('home');
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  // Mock children data - replace with API call
  const children = [
    { id: '1', firstName: 'Matti', lastName: 'Virtanen', class: '9A', studentId: '123456' },
    { id: '2', firstName: 'Liisa', lastName: 'Virtanen', class: '7B', studentId: '123457' },
  ];

  useEffect(() => {
    // Check authentication
    const storedUser = localStorage.getItem('wilma_user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        if (user.role === 'parent') {
          setCurrentUser(user);
          if (children.length > 0) {
            setSelectedChild(children[0].id);
          }
          setIsLoading(false);
        } else {
          setLocation('/wilma');
        }
      } catch (err) {
        setLocation('/wilma');
      }
    } else {
      setLocation('/wilma');
    }
  }, [setLocation]);

  const handleLogout = () => {
    const currentPath = window.location.pathname;
    localStorage.setItem('wilma_return_path', currentPath);
    localStorage.removeItem('wilma_user');
    setLocation('/wilma?session=expired');
  };

  const navigationItems = [
    { id: 'home', label: 'Etusivu', icon: Home },
    { id: 'schedule', label: 'Lukujärjestys', icon: Calendar },
    { id: 'grades', label: 'Arvosanat', icon: Award },
    { id: 'homework', label: 'Tehtävät', icon: FileText },
    { id: 'attendance', label: 'Tuntimerkinnät', icon: UserCheck },
    { id: 'messages', label: 'Viestit', icon: MessageSquare },
    { id: 'progress', label: 'Edistyminen', icon: TrendingUp },
    { id: 'notifications', label: 'Ilmoitukset', icon: Bell },
    { id: 'settings', label: 'Asetukset', icon: Settings },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f5f5f5] to-[#e8e8e8] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#003d82] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Ladataan...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) return null;

  const currentChild = children.find(c => c.id === selectedChild);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f5f5f5] to-[#e8e8e8] overflow-x-hidden pb-20 md:pb-0">
      {/* Sidebar - Hidden on mobile, shown on desktop */}
      <aside className={`hidden md:flex fixed left-0 top-0 h-screen bg-white border-r border-[#dddddd] transition-all duration-300 z-30 flex-col shadow-lg ${
        sidebarOpen ? 'w-64' : 'w-16'
      }`}>
        {/* Logo & Brand */}
        <div className="h-14 flex items-center justify-between px-3 border-b border-[#dddddd] flex-shrink-0 bg-gradient-to-r from-purple-600 to-pink-600">
          {sidebarOpen ? (
            <>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center shadow-sm">
                  <Baby className="w-4 h-4 text-purple-600" />
                </div>
                <span className="font-bold text-base text-white tracking-wide">Wilma</span>
              </div>
              <Button
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 hover:bg-white/20 rounded-md transition-all duration-200"
                variant="ghost"
                size="sm"
              >
                <Menu className="w-4 h-4 text-white" />
              </Button>
            </>
          ) : (
            <Button
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 hover:bg-white/20 rounded-md mx-auto transition-all duration-200"
              variant="ghost"
              size="sm"
            >
              <Menu className="w-4 h-4 text-white" />
            </Button>
          )}
        </div>

        {/* User Info */}
        <div className={`px-3 py-3 border-b border-[#dddddd] flex-shrink-0 bg-gradient-to-br from-purple-50 to-pink-50 ${!sidebarOpen && 'hidden'}`}>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-md">
              {currentUser.firstName[0]}{currentUser.lastName[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-900 truncate">
                {currentUser.firstName} {currentUser.lastName}
              </p>
              <p className="text-xs text-gray-500 truncate">
                Huoltaja
              </p>
            </div>
          </div>
        </div>

        {/* Child Selector */}
        {sidebarOpen && children.length > 0 && (
          <div className="px-3 py-3 border-b border-[#dddddd] bg-gradient-to-br from-blue-50 to-indigo-50">
            <label className="text-xs font-semibold text-gray-700 mb-2 block">Valitse lapsi:</label>
            <select
              value={selectedChild || ''}
              onChange={(e) => setSelectedChild(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {children.map(child => (
                <option key={child.id} value={child.id}>
                  {child.firstName} {child.lastName} ({child.class})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-2 px-2 scrollbar-thin">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 mb-1 group ${
                  isActive
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md scale-105'
                    : 'text-gray-700 hover:bg-gray-100 hover:scale-102'
                }`}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-600 group-hover:text-purple-600'}`} />
                {sidebarOpen && (
                  <span className={`text-sm font-medium truncate ${isActive ? 'text-white' : 'text-gray-700'}`}>
                    {item.label}
                  </span>
                )}
                {isActive && sidebarOpen && (
                  <div className="ml-auto w-2 h-2 bg-white rounded-full animate-pulse"></div>
                )}
              </button>
            );
          })}
        </nav>

        {/* Logout Button */}
        <div className="p-3 border-t border-[#dddddd] flex-shrink-0">
          <Button
            onClick={handleLogout}
            variant="outline"
            className={`w-full justify-start gap-2 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 transition-all ${
              !sidebarOpen && 'justify-center'
            }`}
          >
            <LogOut className="w-4 h-4" />
            {sidebarOpen && <span className="text-sm font-medium">Kirjaudu ulos</span>}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`transition-all duration-300 ${sidebarOpen ? 'md:ml-64' : 'md:ml-16'}`}>
        {/* Mobile Header */}
        <div className="md:hidden sticky top-0 z-40 bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                <Baby className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-bold">Wilma</p>
                <p className="text-xs text-purple-100">{currentUser.firstName}</p>
              </div>
            </div>
            <Button
              onClick={handleLogout}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
          {/* Mobile Child Selector */}
          {children.length > 0 && (
            <div className="px-4 pb-3">
              <select
                value={selectedChild || ''}
                onChange={(e) => setSelectedChild(e.target.value)}
                className="w-full border-0 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-white/50"
              >
                {children.map(child => (
                  <option key={child.id} value={child.id}>
                    {child.firstName} {child.lastName} ({child.class})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="p-3 md:p-4 lg:p-6 max-w-full overflow-x-hidden animate-fadeIn">
          {/* Child Info Banner */}
          {currentChild && (
            <Card className="mb-4 border-2 border-purple-200 shadow-md">
              <CardContent className="p-4 bg-gradient-to-r from-purple-50 to-pink-50">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md">
                    {currentChild.firstName[0]}{currentChild.lastName[0]}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {currentChild.firstName} {currentChild.lastName}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Luokka: {currentChild.class} • Opiskelijanumero: {currentChild.studentId}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Content Sections */}
          {activeSection === 'home' && (
            <Card className="shadow-lg border-[#dddddd]">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-[#dddddd]">
                <CardTitle className="flex items-center gap-2 text-purple-900">
                  <Home className="w-6 h-6" />
                  Etusivu
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                      <CardContent className="p-4 text-center">
                        <Award className="w-8 h-8 mx-auto mb-2 text-green-600" />
                        <p className="text-2xl font-bold text-green-900">8.5</p>
                        <p className="text-sm text-gray-600">Keskiarvo</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
                      <CardContent className="p-4 text-center">
                        <UserCheck className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                        <p className="text-2xl font-bold text-blue-900">95%</p>
                        <p className="text-sm text-gray-600">Läsnäolo</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200">
                      <CardContent className="p-4 text-center">
                        <FileText className="w-8 h-8 mx-auto mb-2 text-orange-600" />
                        <p className="text-2xl font-bold text-orange-900">3</p>
                        <p className="text-sm text-gray-600">Tehtävää</p>
                      </CardContent>
                    </Card>
                  </div>
                  <p className="text-gray-600 text-center mt-6">
                    Tervetuloa huoltajaportaaliin! Täältä voit seurata lapsesi koulunkäyntiä.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {['schedule', 'grades', 'homework', 'attendance', 'messages', 'progress', 'notifications', 'settings'].includes(activeSection) && (
            <Card className="shadow-lg border-[#dddddd]">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-[#dddddd]">
                <CardTitle className="flex items-center gap-2 text-purple-900">
                  {navigationItems.find(item => item.id === activeSection)?.icon && 
                    (() => {
                      const Icon = navigationItems.find(item => item.id === activeSection)!.icon;
                      return <Icon className="w-6 h-6" />;
                    })()
                  }
                  {navigationItems.find(item => item.id === activeSection)?.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <p className="text-gray-600">
                  {activeSection === 'schedule' && 'Lukujärjestys-näkymä tulossa pian...'}
                  {activeSection === 'grades' && 'Arvosanat-näkymä tulossa pian...'}
                  {activeSection === 'homework' && 'Tehtävät-näkymä tulossa pian...'}
                  {activeSection === 'attendance' && 'Tuntimerkinnät-näkymä tulossa pian...'}
                  {activeSection === 'messages' && 'Viestit-näkymä tulossa pian...'}
                  {activeSection === 'progress' && 'Edistyminen-näkymä tulossa pian...'}
                  {activeSection === 'notifications' && 'Ilmoitukset-näkymä tulossa pian...'}
                  {activeSection === 'settings' && 'Asetukset-näkymä tulossa pian...'}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#dddddd] shadow-2xl z-40">
        <div className="grid grid-cols-5 gap-1 px-2 py-2">
          {[
            { id: 'home', label: 'Koti', icon: Home },
            { id: 'schedule', label: 'Lukujärjestys', icon: Calendar },
            { id: 'grades', label: 'Arvosanat', icon: Award },
            { id: 'messages', label: 'Viestit', icon: MessageSquare },
            { id: 'attendance', label: 'Poissaolot', icon: UserCheck },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-br from-purple-600 to-pink-600 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className={`w-5 h-5 mb-1 ${isActive ? 'text-white' : 'text-gray-600'}`} />
                <span className={`text-[10px] font-medium truncate w-full text-center ${
                  isActive ? 'text-white' : 'text-gray-600'
                }`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
