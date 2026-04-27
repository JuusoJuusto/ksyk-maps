import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useDarkMode } from "@/contexts/DarkModeContext";
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { 
  Calendar, BookOpen, Mail, Clock, 
  Award, CheckCircle, 
  MessageSquare, FileText, BarChart3, Users, ExternalLink,
  Settings, Eye, EyeOff, RotateCcw, Edit2, Save, X, Sparkles,
  TrendingUp, Bell, Link as LinkIcon, Activity, GripVertical,
  Sun, Moon, Monitor, Cloud, Quote, Maximize2, Minimize2
} from "lucide-react";

interface WilmaHomeTabProps {
  userRole?: string;
  userRoles?: string[];
  userId?: string;
  userName?: string;
}

interface WidgetConfig {
  id: string;
  title: string;
  visible: boolean;
  customTitle?: string;
  size?: 'small' | 'medium' | 'large';
  order: number;
}

interface DashboardPreferences {
  widgets: WidgetConfig[];
  greeting: string;
  showGreeting: boolean;
  themeMode: 'system' | 'light' | 'dark';
}

const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: 'stats', title: 'Quick Stats', visible: true, size: 'large', order: 0 },
  { id: 'schedule', title: "Today's Schedule", visible: true, size: 'large', order: 1 },
  { id: 'grades', title: 'Recent Grades', visible: true, size: 'large', order: 2 },
  { id: 'overview', title: 'Overview', visible: true, size: 'large', order: 3 },
  { id: 'quickActions', title: 'Quick Actions', visible: true, size: 'medium', order: 4 },
  { id: 'announcements', title: 'Announcements', visible: true, size: 'medium', order: 5 },
  { id: 'performance', title: 'Performance', visible: true, size: 'medium', order: 6 },
  { id: 'recentActivity', title: 'Recent Activity', visible: true, size: 'medium', order: 7 },
  { id: 'upcomingEvents', title: 'Upcoming Events', visible: true, size: 'medium', order: 8 },
  { id: 'weather', title: 'Weather', visible: true, size: 'small', order: 9 },
  { id: 'quotes', title: 'Daily Quote', visible: true, size: 'medium', order: 10 },
  { id: 'quickLinks', title: 'Quick Links', visible: true, size: 'small', order: 11 },
];

export default function WilmaHomeTabEnhanced({ userRole, userRoles = [], userId, userName }: WilmaHomeTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { darkMode, toggleDarkMode } = useDarkMode();
  
  // Determine user roles
  const roles = userRoles.length > 0 ? userRoles : [userRole];
  const isAdmin = roles.some((r: string) => ['admin', 'principal', 'vice_principal'].includes(r));
  const isStudent = roles.includes('student');
  const isTeacher = roles.includes('teacher');
  
  // Customization state
  const [customizationMode, setCustomizationMode] = useState(false);
  const [widgets, setWidgets] = useState<WidgetConfig[]>(DEFAULT_WIDGETS);
  const [customGreeting, setCustomGreeting] = useState('');
  const [showGreeting, setShowGreeting] = useState(true);
  const [editingWidget, setEditingWidget] = useState<string | null>(null);
  const [tempTitle, setTempTitle] = useState('');
  const [themeMode, setThemeMode] = useState<'system' | 'light' | 'dark'>('system');

  // Load preferences from localStorage and backend on mount
  useEffect(() => {
    const savedPrefs = localStorage.getItem(`wilma_dashboard_${userId}`);
    if (savedPrefs) {
      try {
        const prefs: DashboardPreferences = JSON.parse(savedPrefs);
        setWidgets(prefs.widgets || DEFAULT_WIDGETS);
        setCustomGreeting(prefs.greeting || '');
        setShowGreeting(prefs.showGreeting !== false);
        setThemeMode(prefs.themeMode || 'system');
      } catch (e) {
        console.error('Failed to load dashboard preferences:', e);
      }
    }
    
    // Also try to load from backend
    if (userId) {
      fetch(`/api/wilma/dashboard-preferences/${userId}`)
        .then(res => res.json())
        .then(prefs => {
          if (prefs) {
            setWidgets(prefs.widgets || DEFAULT_WIDGETS);
            setCustomGreeting(prefs.greeting || '');
            setShowGreeting(prefs.showGreeting !== false);
            setThemeMode(prefs.themeMode || 'system');
          }
        })
        .catch(err => console.log('Could not load preferences from backend:', err));
    }
  }, [userId]);

  // Apply theme mode
  useEffect(() => {
    if (themeMode === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark !== darkMode) {
        toggleDarkMode();
      }
    } else if (themeMode === 'light' && darkMode) {
      toggleDarkMode();
    } else if (themeMode === 'dark' && !darkMode) {
      toggleDarkMode();
    }
  }, [themeMode, darkMode, toggleDarkMode]);

  // Save preferences
  const savePreferences = useMutation({
    mutationFn: async (prefs: DashboardPreferences) => {
      localStorage.setItem(`wilma_dashboard_${userId}`, JSON.stringify(prefs));
      
      const response = await fetch('/api/wilma/dashboard-preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, preferences: prefs }),
      });
      
      if (!response.ok) throw new Error('Failed to save preferences');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Saved!",
        description: "Your dashboard preferences have been saved.",
      });
    },
    onError: () => {
      toast({
        title: "Saved Locally",
        description: "Changes saved to your device only.",
      });
    },
  });

  // Get personalized greeting
  const getGreeting = () => {
    if (customGreeting) return customGreeting;
    
    const hour = new Date().getHours();
    const name = userName || 'there';
    
    if (hour < 12) return `Good morning, ${name}! ☀️`;
    if (hour < 18) return `Good afternoon, ${name}! 👋`;
    return `Good evening, ${name}! 🌙`;
  };

  // Toggle widget visibility
  const toggleWidget = (widgetId: string) => {
    const updated = widgets.map(w => 
      w.id === widgetId ? { ...w, visible: !w.visible } : w
    );
    setWidgets(updated);
  };

  // Update widget title
  const updateWidgetTitle = (widgetId: string, newTitle: string) => {
    const updated = widgets.map(w => 
      w.id === widgetId ? { ...w, customTitle: newTitle } : w
    );
    setWidgets(updated);
    setEditingWidget(null);
    setTempTitle('');
  };

  // Update widget size
  const updateWidgetSize = (widgetId: string, size: 'small' | 'medium' | 'large') => {
    const updated = widgets.map(w => 
      w.id === widgetId ? { ...w, size } : w
    );
    setWidgets(updated);
  };

  // Handle drag end
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    
    const items = Array.from(visibleWidgets);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    // Update order
    const updated = items.map((item, index) => ({
      ...item,
      order: index
    }));
    
    // Update all widgets with new order
    const allWidgets = widgets.map(w => {
      const found = updated.find(u => u.id === w.id);
      return found ? { ...found } : w;
    });
    
    setWidgets(allWidgets);
    
    toast({
      title: "Reordered!",
      description: "Widget order updated. Don't forget to save!",
    });
  };

  // Get size class for grid layout
  const getSizeClass = (size?: 'small' | 'medium' | 'large') => {
    switch (size) {
      case 'small': return 'col-span-1';
      case 'medium': return 'col-span-1 md:col-span-2';
      case 'large': return 'col-span-1 md:col-span-3';
      default: return 'col-span-1 md:col-span-2';
    }
  };

  // Reset to defaults
  const resetToDefaults = () => {
    setWidgets(DEFAULT_WIDGETS);
    setCustomGreeting('');
    setShowGreeting(true);
    setThemeMode('system');
    toast({
      title: "Reset Complete",
      description: "Dashboard has been reset to default settings.",
    });
  };

  // Save current configuration
  const handleSaveConfiguration = () => {
    const prefs: DashboardPreferences = {
      widgets,
      greeting: customGreeting,
      showGreeting,
      themeMode,
    };
    savePreferences.mutate(prefs);
    setCustomizationMode(false);
  };

  // Get visible widgets sorted by order
  const visibleWidgets = widgets
    .filter(w => w.visible)
    .sort((a, b) => a.order - b.order);

  // Fetch real data from API
  const { data: studentsData } = useQuery({
    queryKey: ['wilma-students-count'],
    queryFn: async () => {
      const response = await fetch('/api/wilma/users?role=student');
      if (!response.ok) return [];
      return response.json();
    },
    enabled: isAdmin || isTeacher
  });

  const { data: teachersData } = useQuery({
    queryKey: ['wilma-teachers-count'],
    queryFn: async () => {
      const response = await fetch('/api/wilma/users?role=teacher');
      if (!response.ok) return [];
      return response.json();
    },
    enabled: isAdmin
  });

  const { data: allUsersData } = useQuery({
    queryKey: ['wilma-all-users-count'],
    queryFn: async () => {
      const response = await fetch('/api/wilma/users');
      if (!response.ok) return [];
      return response.json();
    },
    enabled: isAdmin
  });

  const studentsCount = studentsData?.length || 0;
  const teachersCount = teachersData?.length || 0;
  const totalUsersCount = allUsersData?.length || 0;

  // Widget renderer helper
  const renderWidget = (widgetId: string) => {
    const widget = widgets.find(w => w.id === widgetId);
    if (!widget) return null;

    const widgetTitle = widget.customTitle || widget.title;
    const isEditing = editingWidget === widgetId;

    const widgetHeader = (
      <CardHeader className="bg-white border-b border-[#dddddd] p-4 md:p-6">
        <CardTitle className="flex items-center justify-between text-base md:text-lg text-gray-900">
          <div className="flex items-center gap-2">
            {customizationMode && <GripVertical className="w-4 h-4 text-gray-400 cursor-move" />}
            {isEditing ? (
              <div className="flex items-center gap-2">
                <Input
                  value={tempTitle}
                  onChange={(e) => setTempTitle(e.target.value)}
                  className="h-8 text-sm"
                  placeholder={widget.title}
                  autoFocus
                />
                <Button
                  size="sm"
                  onClick={() => updateWidgetTitle(widgetId, tempTitle)}
                  className="h-8 px-2"
                >
                  <Save className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setEditingWidget(null);
                    setTempTitle('');
                  }}
                  className="h-8 px-2"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <>
                <span>{widgetTitle}</span>
                {customizationMode && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingWidget(widgetId);
                      setTempTitle(widget.customTitle || widget.title);
                    }}
                    className="h-6 px-2"
                  >
                    <Edit2 className="w-3 h-3" />
                  </Button>
                )}
              </>
            )}
          </div>
          {customizationMode && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => toggleWidget(widgetId)}
              className="h-8 px-2"
            >
              <EyeOff className="w-4 h-4" />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
    );

    // Widget content based on ID
    switch (widgetId) {
      case 'stats':
        return (
          <div key={widgetId} className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <Card className="bg-[#003d82] text-white border-0 rounded-lg shadow-md">
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/80 text-xs md:text-sm">
                      {isAdmin ? 'Käyttäjiä' : 'Tänään'}
                    </p>
                    <p className="text-2xl md:text-3xl font-bold mt-1">
                      {isAdmin ? totalUsersCount : '5'}
                    </p>
                    <p className="text-white/80 text-xs md:text-sm mt-1">
                      {isAdmin ? 'Yhteensä' : 'Oppituntia'}
                    </p>
                  </div>
                  {isAdmin ? (
                    <Users className="w-8 h-8 md:w-12 md:h-12 text-white/60" />
                  ) : (
                    <Calendar className="w-8 h-8 md:w-12 md:h-12 text-white/60" />
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#7cb342] text-white border-0 rounded-lg shadow-md">
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/80 text-xs md:text-sm">
                      {isAdmin ? 'Opiskelijat' : 'Tuntimerkinnät'}
                    </p>
                    <p className="text-2xl md:text-3xl font-bold mt-1">
                      {isAdmin ? studentsCount : '95%'}
                    </p>
                    <p className="text-white/80 text-xs md:text-sm mt-1">
                      {isAdmin ? 'Aktiivisia' : 'Tällä viikolla'}
                    </p>
                  </div>
                  <CheckCircle className="w-8 h-8 md:w-12 md:h-12 text-white/60" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border border-[#dddddd] rounded-lg shadow-sm">
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-xs md:text-sm">Viestit</p>
                    <p className="text-2xl md:text-3xl font-bold mt-1 text-[#003d82]">
                      {isAdmin ? '12' : '3'}
                    </p>
                    <p className="text-gray-600 text-xs md:text-sm mt-1">
                      {isAdmin ? 'Uutta' : 'Lukematonta'}
                    </p>
                  </div>
                  <Mail className="w-8 h-8 md:w-12 md:h-12 text-[#003d82]/20" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border border-[#dddddd] rounded-lg shadow-sm">
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-xs md:text-sm">
                      {isAdmin ? 'Opettajat' : isStudent ? 'Keskiarvo' : 'Kurssit'}
                    </p>
                    <p className="text-2xl md:text-3xl font-bold mt-1 text-[#003d82]">
                      {isAdmin ? teachersCount : isStudent ? '8.5' : '12'}
                    </p>
                    <p className="text-gray-600 text-xs md:text-sm mt-1">
                      {isAdmin ? 'Aktiivisia' : isStudent ? 'Tällä jaksolla' : 'Aktiivisia'}
                    </p>
                  </div>
                  <Award className="w-8 h-8 md:w-12 md:h-12 text-[#003d82]/20" />
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'schedule':
        return (
          <Card key={widgetId} className="border border-[#dddddd] rounded-lg shadow-sm">
            {widgetHeader}
            <CardContent className="p-3 md:p-6">
              <div className="space-y-2 md:space-y-3">
                {[
                  { time: '08:00 - 09:30', subject: 'Matematiikka', room: 'A201', teacher: 'M. Virtanen' },
                  { time: '09:45 - 11:15', subject: 'Englanti', room: 'B105', teacher: 'A. Korhonen' },
                  { time: '11:30 - 13:00', subject: 'Lounastauko', room: '-', teacher: '-' },
                  { time: '13:15 - 14:45', subject: 'Fysiikka', room: 'C301', teacher: 'P. Nieminen' },
                  { time: '15:00 - 16:30', subject: 'Historia', room: 'A105', teacher: 'L. Mäkinen' },
                ].map((lesson, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 md:p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
                      <div className="text-xs md:text-sm font-medium text-gray-600 w-20 md:w-32 flex-shrink-0">
                        <Clock className="w-3 h-3 md:w-4 md:h-4 inline mr-1" />
                        {lesson.time}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm md:text-base text-gray-900 truncate">{lesson.subject}</p>
                        <p className="text-xs md:text-sm text-gray-600 truncate">{lesson.room} • {lesson.teacher}</p>
                      </div>
                    </div>
                    {lesson.subject !== 'Lounastauko' && (
                      <Button size="sm" variant="outline" className="ml-2 flex-shrink-0 text-xs md:text-sm">Näytä</Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );

      case 'recentActivity':
        return (
          <Card key={widgetId} className="border-2 border-blue-200">
            {widgetHeader}
            <CardContent className="p-3 md:p-6">
              <div className="space-y-2 md:space-y-3">
                {[
                  { icon: <Mail className="w-4 h-4 text-blue-600" />, text: 'New message from teacher', time: '5 min ago' },
                  { icon: <Award className="w-4 h-4 text-green-600" />, text: 'Grade updated: Math 9/10', time: '1 hour ago' },
                  { icon: <FileText className="w-4 h-4 text-orange-600" />, text: 'Homework submitted', time: '2 hours ago' },
                  { icon: <Bell className="w-4 h-4 text-red-600" />, text: 'Attendance marked', time: '3 hours ago' },
                ].map((activity, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-2 md:p-3 bg-gray-50 rounded-lg">
                    <div className="mt-0.5">{activity.icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{activity.text}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );

      case 'upcomingEvents':
        return (
          <Card key={widgetId} className="border-2 border-green-200">
            {widgetHeader}
            <CardContent className="p-3 md:p-6">
              <div className="space-y-2 md:space-y-3">
                {[
                  { title: 'Math Exam', date: 'Tomorrow, 10:00', color: 'bg-red-100 text-red-700' },
                  { title: 'Parent Meeting', date: 'Friday, 15:00', color: 'bg-blue-100 text-blue-700' },
                  { title: 'Sports Day', date: 'Next Monday', color: 'bg-green-100 text-green-700' },
                  { title: 'Science Fair', date: 'May 15', color: 'bg-orange-100 text-orange-700' },
                ].map((event, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-2 md:p-3 bg-gray-50 rounded-lg">
                    <div className={`w-2 h-2 rounded-full ${event.color.split(' ')[0].replace('100', '500')}`}></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{event.title}</p>
                      <p className="text-xs text-gray-600">{event.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );

      case 'weather':
        return (
          <Card key={widgetId} className="border-2 border-cyan-200 bg-gradient-to-br from-cyan-50 to-blue-50">
            {widgetHeader}
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-4xl font-bold text-gray-900">18°C</p>
                  <p className="text-sm text-gray-600 mt-1">Partly Cloudy</p>
                  <p className="text-xs text-gray-500 mt-1">Helsinki, Kulosaari</p>
                </div>
                <div className="text-6xl">⛅</div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs border-t pt-3">
                <div className="p-2 bg-white/50 rounded">
                  <p className="font-semibold text-gray-700">Mon</p>
                  <p className="text-2xl my-1">☀️</p>
                  <p className="text-gray-600">20°</p>
                </div>
                <div className="p-2 bg-white/50 rounded">
                  <p className="font-semibold text-gray-700">Tue</p>
                  <p className="text-2xl my-1">🌧️</p>
                  <p className="text-gray-600">15°</p>
                </div>
                <div className="p-2 bg-white/50 rounded">
                  <p className="font-semibold text-gray-700">Wed</p>
                  <p className="text-2xl my-1">⛅</p>
                  <p className="text-gray-600">17°</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'quotes':
        const quotes = [
          "Education is the most powerful weapon which you can use to change the world. - Nelson Mandela",
          "The beautiful thing about learning is that no one can take it away from you. - B.B. King",
          "Success is not final, failure is not fatal: it is the courage to continue that counts. - Winston Churchill",
          "The only way to do great work is to love what you do. - Steve Jobs",
          "Believe you can and you're halfway there. - Theodore Roosevelt"
        ];
        const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
        
        return (
          <Card key={widgetId} className="border-2 border-yellow-200 bg-gradient-to-br from-yellow-50 to-orange-50">
            {widgetHeader}
            <CardContent className="p-4 md:p-6">
              <div className="text-center">
                <Quote className="w-12 h-12 mx-auto mb-3 text-yellow-600" />
                <p className="text-sm italic text-gray-700 leading-relaxed">"{randomQuote}"</p>
              </div>
            </CardContent>
          </Card>
        );

      case 'quickLinks':
        return (
          <Card key={widgetId} className="border-2 border-indigo-200">
            {widgetHeader}
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="justify-start h-auto py-3"
                  onClick={() => window.open('https://ksyk.fi', '_blank')}
                >
                  <LinkIcon className="w-4 h-4 mr-2" />
                  <span className="text-xs">School Site</span>
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="justify-start h-auto py-3"
                  onClick={() => window.location.href = '/wilma'}
                >
                  <LinkIcon className="w-4 h-4 mr-2" />
                  <span className="text-xs">Wilma</span>
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="justify-start h-auto py-3"
                  onClick={() => window.location.href = '/lunch'}
                >
                  <LinkIcon className="w-4 h-4 mr-2" />
                  <span className="text-xs">Lunch Menu</span>
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="justify-start h-auto py-3"
                  onClick={() => window.location.href = '/'}
                >
                  <LinkIcon className="w-4 h-4 mr-2" />
                  <span className="text-xs">Campus Map</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Personalized Greeting */}
      {showGreeting && (
        <Card className="border-2 border-[#003d82] bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Sparkles className="w-6 h-6 text-[#003d82]" />
                <h2 className="text-xl md:text-2xl font-bold text-[#003d82]">
                  {getGreeting()}
                </h2>
              </div>
              <Button
                onClick={() => setCustomizationMode(!customizationMode)}
                variant={customizationMode ? "default" : "outline"}
                className="flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                {customizationMode ? 'Done' : 'Customize'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Customization Panel */}
      {customizationMode && (
        <Card className="border-2 border-orange-300 bg-orange-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-orange-900">
              <Settings className="w-5 h-5" />
              Dashboard Customization
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Theme Mode Selector */}
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 block">
                Theme Mode
              </label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  size="sm"
                  variant={themeMode === 'light' ? "default" : "outline"}
                  onClick={() => setThemeMode('light')}
                  className="flex flex-col items-center py-3 h-auto"
                >
                  <Sun className="w-5 h-5 mb-1" />
                  <span className="text-xs">Light</span>
                </Button>
                <Button
                  size="sm"
                  variant={themeMode === 'dark' ? "default" : "outline"}
                  onClick={() => setThemeMode('dark')}
                  className="flex flex-col items-center py-3 h-auto"
                >
                  <Moon className="w-5 h-5 mb-1" />
                  <span className="text-xs">Dark</span>
                </Button>
                <Button
                  size="sm"
                  variant={themeMode === 'system' ? "default" : "outline"}
                  onClick={() => setThemeMode('system')}
                  className="flex flex-col items-center py-3 h-auto"
                >
                  <Monitor className="w-5 h-5 mb-1" />
                  <span className="text-xs">System</span>
                </Button>
              </div>
              <p className="text-xs text-gray-600 mt-2">Choose your preferred theme</p>
            </div>

            {/* Custom Greeting */}
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 block">
                Custom Greeting
              </label>
              <Input
                value={customGreeting}
                onChange={(e) => setCustomGreeting(e.target.value)}
                placeholder="Enter your custom greeting..."
                className="mb-2"
              />
              <p className="text-xs text-gray-600">Leave empty for automatic time-based greeting</p>
            </div>

            {/* Widget Visibility */}
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 block">
                Visible Widgets
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {widgets.map((widget) => (
                  <Button
                    key={widget.id}
                    size="sm"
                    variant={widget.visible ? "default" : "outline"}
                    onClick={() => toggleWidget(widget.id)}
                    className="justify-start"
                  >
                    {widget.visible ? <Eye className="w-4 h-4 mr-2" /> : <EyeOff className="w-4 h-4 mr-2" />}
                    <span className="truncate text-xs">{widget.customTitle || widget.title}</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Widget Sizes */}
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 block">
                Widget Sizes (Visible Widgets Only)
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {widgets.filter(w => w.visible).map((widget) => (
                  <div key={widget.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-xs font-medium truncate flex-1">{widget.customTitle || widget.title}</span>
                    <div className="flex gap-1 ml-2">
                      <Button
                        size="sm"
                        variant={widget.size === 'small' ? "default" : "outline"}
                        onClick={() => updateWidgetSize(widget.id, 'small')}
                        className="h-7 px-2"
                      >
                        <Minimize2 className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant={widget.size === 'medium' ? "default" : "outline"}
                        onClick={() => updateWidgetSize(widget.id, 'medium')}
                        className="h-7 px-2"
                      >
                        <span className="text-xs">M</span>
                      </Button>
                      <Button
                        size="sm"
                        variant={widget.size === 'large' ? "default" : "outline"}
                        onClick={() => updateWidgetSize(widget.id, 'large')}
                        className="h-7 px-2"
                      >
                        <Maximize2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-600 mt-2">Small (1 col), Medium (2 cols), Large (3 cols)</p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleSaveConfiguration}
                className="flex-1 bg-[#003d82] hover:bg-[#0052a3]"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
              <Button
                onClick={resetToDefaults}
                variant="outline"
                className="flex-1"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset to Default
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* School Website Link Banner */}
      <Card className="border-2 border-[#003d82] bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h3 className="font-bold text-lg text-[#003d82] mb-1">Kulosaaren yhteiskoulu</h3>
              <p className="text-sm text-gray-700">
                Vieraile koulumme verkkosivuilla saadaksesi lisätietoja tapahtumista ja uutisista
              </p>
            </div>
            <Button
              onClick={() => window.open('https://ksyk.fi', '_blank')}
              className="bg-[#003d82] hover:bg-[#0052a3] flex items-center gap-2 whitespace-nowrap"
            >
              <ExternalLink className="w-4 h-4" />
              ksyk.fi
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Render Visible Widgets with Drag-and-Drop */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="widgets">
          {(provided) => (
            <div 
              {...provided.droppableProps} 
              ref={provided.innerRef}
              className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6"
            >
              {visibleWidgets.map((widget, index) => (
                <Draggable 
                  key={widget.id} 
                  draggableId={widget.id} 
                  index={index}
                  isDragDisabled={!customizationMode}
                >
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className={`${getSizeClass(widget.size)} ${snapshot.isDragging ? 'opacity-50 scale-105' : ''} transition-all`}
                    >
                      {renderWidget(widget.id)}
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}
