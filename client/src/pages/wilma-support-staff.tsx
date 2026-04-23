import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  LogOut, Home, Calendar, Users, MessageSquare, 
  FileText, Settings, Menu, User, ClipboardList, Heart,
  Brain, Target, Stethoscope
} from "lucide-react";

// Support staff roles
type SupportStaffRole = 'kuraattori' | 'terveydenhoitaja' | 'psykologi' | 'nuoriso-ohjaaja' | 'sosiaalityontekija';

interface SupportStaffConfig {
  role: SupportStaffRole;
  title: string;
  icon: any;
  color: string;
  bgGradient: string;
}

const SUPPORT_STAFF_CONFIGS: Record<SupportStaffRole, SupportStaffConfig> = {
  'kuraattori': {
    role: 'kuraattori',
    title: 'Kuraattori',
    icon: Heart,
    color: '#9333ea', // Purple
    bgGradient: 'from-purple-500 to-purple-600'
  },
  'terveydenhoitaja': {
    role: 'terveydenhoitaja',
    title: 'Terveydenhoitaja',
    icon: Stethoscope,
    color: '#dc2626', // Red
    bgGradient: 'from-red-500 to-red-600'
  },
  'psykologi': {
    role: 'psykologi',
    title: 'Psykologi',
    icon: Brain,
    color: '#2563eb', // Blue
    bgGradient: 'from-blue-500 to-blue-600'
  },
  'nuoriso-ohjaaja': {
    role: 'nuoriso-ohjaaja',
    title: 'Nuoriso-ohjaaja',
    icon: Target,
    color: '#ea580c', // Orange
    bgGradient: 'from-orange-500 to-orange-600'
  },
  'sosiaalityontekija': {
    role: 'sosiaalityontekija',
    title: 'Sosiaalityöntekijä',
    icon: Users,
    color: '#059669', // Emerald
    bgGradient: 'from-emerald-500 to-emerald-600'
  }
};

export default function WilmaSupportStaff() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute('/wilma-:role/:userId/:section?');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeSection, setActiveSection] = useState('home');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [config, setConfig] = useState<SupportStaffConfig | null>(null);

  useEffect(() => {
    // Check authentication
    const storedUser = localStorage.getItem('wilma_user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        const userRole = user.role as SupportStaffRole;
        
        // Check if user has support staff role
        if (SUPPORT_STAFF_CONFIGS[userRole]) {
          setCurrentUser(user);
          setConfig(SUPPORT_STAFF_CONFIGS[userRole]);
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

  useEffect(() => {
    if (params?.section) {
      setActiveSection(params.section);
    }
  }, [params]);

  const handleLogout = () => {
    const currentPath = window.location.pathname;
    localStorage.setItem('wilma_return_path', currentPath);
    localStorage.removeItem('wilma_user');
    setLocation('/wilma?session=expired');
  };

  const navigationItems = [
    { id: 'home', label: 'Etusivu', icon: Home },
    { id: 'calendar', label: 'Kalenteri', icon: Calendar },
    { id: 'students', label: 'Oppilaat', icon: Users },
    { id: 'appointments', label: 'Tapaamiset', icon: ClipboardList },
    { id: 'notes', label: 'Muistiinpanot', icon: FileText },
    { id: 'messages', label: 'Viestit', icon: MessageSquare },
    { id: 'settings', label: 'Asetukset', icon: Settings },
  ];

  if (isLoading || !config) {
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

  const Icon = config.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f5f5f5] to-[#e8e8e8] overflow-x-hidden">
      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 h-screen bg-white border-r border-[#dddddd] transition-all duration-300 z-50 flex flex-col shadow-lg ${
        sidebarOpen ? 'w-64' : 'w-16'
      }`}>
        {/* Logo & Brand */}
        <div className={`h-14 flex items-center justify-between px-3 border-b border-[#dddddd] flex-shrink-0 bg-gradient-to-r ${config.bgGradient}`}>
          {sidebarOpen ? (
            <>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center shadow-sm">
                  <Icon className="w-4 h-4" style={{ color: config.color }} />
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
              className="p-1.5 hover:bg-gray-100 rounded-md transition-all duration-200 mx-auto"
              variant="ghost"
              size="sm"
            >
              <Menu className="w-4 h-4" style={{ color: config.color }} />
            </Button>
          )}
        </div>

        {/* User Info */}
        {sidebarOpen && (
          <div className="p-3 border-b border-[#dddddd] flex-shrink-0" style={{ backgroundColor: `${config.color}10` }}>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-md" style={{ backgroundColor: config.color }}>
                {currentUser.firstName?.[0]}{currentUser.lastName?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">
                  {currentUser.firstName} {currentUser.lastName}
                </p>
                <p className="text-xs text-gray-600 truncate">{config.title}</p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-2">
          {navigationItems.map((item) => {
            const ItemIcon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveSection(item.id);
                  setLocation(`/wilma-${config.role}/${currentUser.id}/${item.id === 'home' ? '' : item.id}`);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r text-white shadow-sm'
                    : 'text-gray-700 hover:bg-gray-50'
                } ${sidebarOpen ? '' : 'justify-center'}`}
                style={isActive ? { backgroundImage: `linear-gradient(to right, ${config.color}, ${config.color}dd)` } : {}}
              >
                <ItemIcon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : ''}`} style={!isActive ? { color: config.color } : {}} />
                {sidebarOpen && (
                  <span className={`text-sm font-medium truncate ${isActive ? 'text-white' : 'text-gray-700'}`}>
                    {item.label}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Logout Button */}
        <div className="p-2 border-t border-[#dddddd] flex-shrink-0">
          <Button
            onClick={handleLogout}
            variant="ghost"
            className={`w-full justify-start text-red-600 hover:bg-red-50 hover:text-red-700 ${
              sidebarOpen ? '' : 'justify-center'
            }`}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {sidebarOpen && <span className="ml-3 text-sm font-medium">Kirjaudu ulos</span>}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-16'}`}>
        {/* Header */}
        <header className="bg-white border-b border-[#dddddd] sticky top-0 z-40 shadow-sm">
          <div className="px-4 py-3 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-800">{config.title}</h1>
              <p className="text-sm text-gray-600">
                {navigationItems.find(item => item.id === activeSection)?.label || 'Etusivu'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold shadow-md" style={{ backgroundColor: config.color }}>
                {currentUser.firstName?.[0]}{currentUser.lastName?.[0]}
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="p-4 md:p-6">
          <Card className="shadow-md">
            <CardHeader style={{ backgroundColor: `${config.color}10` }}>
              <CardTitle className="flex items-center gap-2">
                <Icon className="w-5 h-5" style={{ color: config.color }} />
                {navigationItems.find(item => item.id === activeSection)?.label || 'Etusivu'}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {activeSection === 'home' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card style={{ backgroundColor: `${config.color}10`, borderColor: config.color }}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-600">Tänään</p>
                            <p className="text-2xl font-bold" style={{ color: config.color }}>5</p>
                            <p className="text-xs text-gray-600 mt-1">Tapaamista</p>
                          </div>
                          <Calendar className="w-10 h-10 opacity-50" style={{ color: config.color }} />
                        </div>
                      </CardContent>
                    </Card>

                    <Card style={{ backgroundColor: `${config.color}10`, borderColor: config.color }}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-600">Aktiiviset</p>
                            <p className="text-2xl font-bold" style={{ color: config.color }}>12</p>
                            <p className="text-xs text-gray-600 mt-1">Oppilasta</p>
                          </div>
                          <Users className="w-10 h-10 opacity-50" style={{ color: config.color }} />
                        </div>
                      </CardContent>
                    </Card>

                    <Card style={{ backgroundColor: `${config.color}10`, borderColor: config.color }}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-600">Viestit</p>
                            <p className="text-2xl font-bold" style={{ color: config.color }}>3</p>
                            <p className="text-xs text-gray-600 mt-1">Lukematonta</p>
                          </div>
                          <MessageSquare className="w-10 h-10 opacity-50" style={{ color: config.color }} />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Tämän päivän tapaamiSet</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {[
                          { time: '09:00', student: 'Matti Virtanen', class: '7A', topic: 'Keskustelu' },
                          { time: '10:30', student: 'Anna Korhonen', class: '8B', topic: 'Seuranta' },
                          { time: '13:00', student: 'Pekka Mäkinen', class: '9A', topic: 'Tuki' },
                        ].map((appointment, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style={{ backgroundColor: config.color }}>
                                {appointment.student.split(' ').map(n => n[0]).join('')}
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900">{appointment.student}</p>
                                <p className="text-sm text-gray-600">{appointment.class} • {appointment.topic}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold" style={{ color: config.color }}>{appointment.time}</p>
                              <Button size="sm" variant="outline" className="mt-1">Näytä</Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeSection !== 'home' && (
                <div className="text-center py-12">
                  <Icon className="w-16 h-16 mx-auto mb-4 opacity-50" style={{ color: config.color }} />
                  <p className="text-gray-600">
                    {navigationItems.find(item => item.id === activeSection)?.label} -näkymä tulossa pian...
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
