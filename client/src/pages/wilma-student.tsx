import { useState, useEffect } from 'react';
import { useLocation, useRoute } from 'wouter';
import { Button } from "@/components/ui/button";
import ModernWilmaDashboard from "@/components/ModernWilmaDashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Home, BookOpen, Award, MessageSquare, Calendar, 
  FileText, Users, Settings, LogOut, Bell, Menu, X
} from 'lucide-react';

export default function WilmaStudent() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute('/wilma/:studentId/:section?');
  
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeSection, setActiveSection] = useState('frontpage');
  const [language, setLanguage] = useState<'fi' | 'en'>('fi');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('wilma_user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setCurrentUser(user);
      } catch (error) {
        console.error('Error parsing user:', error);
        setLocation('/wilma');
      }
    } else {
      setLocation('/wilma');
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (match && params?.section) {
      setActiveSection(params.section);
    } else if (match) {
      setActiveSection('frontpage');
    }
  }, [match, params]);

  const handleLogout = () => {
    localStorage.removeItem('wilma_user');
    setLocation('/wilma');
  };

  const handleSectionChange = (section: string) => {
    setActiveSection(section);
    if (currentUser?.studentId) {
      setLocation(`/wilma/${currentUser.studentId}/${section === 'frontpage' ? '' : section}`);
    }
    setMobileMenuOpen(false);
  };

  const t = (fi: string, en: string) => language === 'fi' ? fi : en;

  const menuItems = [
    { id: 'frontpage', icon: Home, label: t('Etusivu', 'Dashboard') },
    { id: 'schedule', icon: Calendar, label: t('Lukujärjestys', 'Schedule') },
    { id: 'grades', icon: Award, label: t('Arvosanat', 'Grades') },
    { id: 'assignments', icon: FileText, label: t('Tehtävät', 'Assignments') },
    { id: 'messages', icon: MessageSquare, label: t('Viestit', 'Messages') },
    { id: 'learn-coding', icon: BookOpen, label: t('Koodaus', 'Coding') },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">{t('Ladataan...', 'Loading...')}</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#003d82] text-white shadow-lg">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Title */}
            <div className="flex items-center gap-3">
              <img 
                src="/kulosaaren_yhteiskoulu_logo.jpeg" 
                alt="Wilma" 
                className="h-10 w-10 rounded-full bg-white p-1"
              />
              <div>
                <h1 className="text-xl font-bold">Wilma</h1>
                <p className="text-xs text-blue-200">{t('Kulosaaren yhteiskoulu', 'Kulosaari High School')}</p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <Button
                    key={item.id}
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSectionChange(item.id)}
                    className={`text-white hover:bg-blue-700 ${isActive ? 'bg-blue-700' : ''}`}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {item.label}
                  </Button>
                );
              })}
            </nav>

            {/* Right Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-blue-700"
              >
                <Bell className="w-5 h-5" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="hidden md:flex text-white hover:bg-blue-700"
              >
                <LogOut className="w-4 h-4 mr-2" />
                {t('Kirjaudu ulos', 'Logout')}
              </Button>

              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden text-white hover:bg-blue-700"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden pb-4 space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <Button
                    key={item.id}
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSectionChange(item.id)}
                    className={`w-full justify-start text-white hover:bg-blue-700 ${isActive ? 'bg-blue-700' : ''}`}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {item.label}
                  </Button>
                );
              })}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="w-full justify-start text-white hover:bg-blue-700"
              >
                <LogOut className="w-4 h-4 mr-2" />
                {t('Kirjaudu ulos', 'Logout')}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        {activeSection === 'frontpage' && (
          <ModernWilmaDashboard
            user={currentUser}
            language={language}
            onNavigate={handleSectionChange}
          />
        )}

        {activeSection === 'schedule' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-6 h-6 text-blue-600" />
                {t('Lukujärjestys', 'Schedule')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">{t('Lukujärjestys tulossa pian...', 'Schedule coming soon...')}</p>
            </CardContent>
          </Card>
        )}

        {activeSection === 'grades' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-6 h-6 text-green-600" />
                {t('Arvosanat', 'Grades')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">{t('Arvosanat tulossa pian...', 'Grades coming soon...')}</p>
            </CardContent>
          </Card>
        )}

        {activeSection === 'assignments' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-6 h-6 text-orange-600" />
                {t('Tehtävät', 'Assignments')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">{t('Tehtävät tulossa pian...', 'Assignments coming soon...')}</p>
            </CardContent>
          </Card>
        )}

        {activeSection === 'messages' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-6 h-6 text-purple-600" />
                {t('Viestit', 'Messages')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">{t('Viestit tulossa pian...', 'Messages coming soon...')}</p>
            </CardContent>
          </Card>
        )}

        {activeSection === 'learn-coding' && (
          <div>
            <Button
              onClick={() => setLocation(`/wilma/${currentUser.studentId}/learn-coding`)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <BookOpen className="w-4 h-4 mr-2" />
              {t('Avaa koodausplatformi', 'Open Coding Platform')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
