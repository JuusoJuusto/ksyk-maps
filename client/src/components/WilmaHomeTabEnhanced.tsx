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
  Sun, Moon, Monitor, Cloud, Quote, Maximize2, Minimize2, Maximize,
  AlertCircle
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
  { id: 'stats', title: 'Pikatilastot', visible: true, size: 'large', order: 0 },
  { id: 'schedule', title: "Tämän päivän lukujärjestys", visible: true, size: 'large', order: 1 },
  { id: 'grades', title: 'Viimeisimmät arvosanat', visible: true, size: 'large', order: 2 },
  { id: 'overview', title: 'Yleiskatsaus', visible: true, size: 'large', order: 3 },
  { id: 'quickActions', title: 'Pikatoiminnot', visible: true, size: 'medium', order: 4 },
  { id: 'announcements', title: 'Ilmoitukset', visible: true, size: 'medium', order: 5 },
  { id: 'performance', title: 'Suorituskyky', visible: true, size: 'medium', order: 6 },
  { id: 'recentActivity', title: 'Viimeaikainen toiminta', visible: true, size: 'medium', order: 7 },
  { id: 'upcomingEvents', title: 'Tulevat tapahtumat', visible: true, size: 'medium', order: 8 },
  { id: 'weather', title: 'Sää', visible: true, size: 'medium', order: 9 },
  { id: 'quotes', title: 'Päivän lainaus', visible: true, size: 'medium', order: 10 },
  { id: 'quickLinks', title: 'Pikalinkit', visible: true, size: 'small', order: 11 },
  { id: 'homework', title: 'Kotitehtävät', visible: false, size: 'medium', order: 12 },
  { id: 'attendance', title: 'Tuntimerkinnät yhteenveto', visible: false, size: 'medium', order: 13 },
  { id: 'messages', title: 'Viimeisimmät viestit', visible: false, size: 'medium', order: 14 },
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
  const [themeMode, setThemeMode] = useState<'system' | 'light' | 'dark'>('light');
  const [resizingWidget, setResizingWidget] = useState<string | null>(null);

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
        title: "Tallennettu!",
        description: "Kojelaudan asetukset on tallennettu.",
      });
    },
    onError: () => {
      toast({
        title: "Tallennettu paikallisesti",
        description: "Muutokset tallennettu vain laitteellesi.",
      });
    },
  });

  // Get personalized greeting
  const getGreeting = () => {
    if (customGreeting) return customGreeting;
    
    const hour = new Date().getHours();
    const name = userName || 'siellä';
    
    if (hour < 12) return `Hyvää huomenta, ${name}! ☀️`;
    if (hour < 18) return `Hyvää iltapäivää, ${name}! 👋`;
    return `Hyvää iltaa, ${name}! 🌙`;
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

  // Cycle widget size (for corner resize button)
  const cycleWidgetSize = (widgetId: string) => {
    // Safety check: ensure widgets array exists
    if (!widgets || !Array.isArray(widgets)) {
      console.warn('Widgets array is not initialized');
      return;
    }
    
    const widget = widgets.find(w => w.id === widgetId);
    if (!widget) return;
    
    const sizeOrder: ('small' | 'medium' | 'large')[] = ['small', 'medium', 'large'];
    const currentIndex = sizeOrder.indexOf(widget.size || 'medium');
    const nextIndex = (currentIndex + 1) % sizeOrder.length;
    const nextSize = sizeOrder[nextIndex];
    
    updateWidgetSize(widgetId, nextSize);
    
    const sizeNames = { small: 'Pieni', medium: 'Keskikokoinen', large: 'Suuri' };
    
    toast({
      title: "Widgetin koko muutettu!",
      description: `Koko vaihdettu: ${sizeNames[nextSize]}`,
      duration: 1500,
    });
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
      title: "Järjestetty uudelleen!",
      description: "Widgettien järjestys päivitetty. Muista tallentaa!",
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
      title: "Palautus valmis",
      description: "Kojelauta on palautettu oletusasetuksiin.",
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
  const visibleWidgets = (widgets || DEFAULT_WIDGETS)
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

  const { data: messagesData } = useQuery({
    queryKey: ['wilma-messages-count', userId],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/wilma/messages?recipientId=${userId}&unread=true`);
        if (!response.ok) return [];
        return response.json();
      } catch (error) {
        return [];
      }
    },
    enabled: !!userId,
    retry: false
  });

  const { data: coursesData } = useQuery({
    queryKey: ['wilma-courses-count'],
    queryFn: async () => {
      const response = await fetch('/api/wilma/courses');
      if (!response.ok) return [];
      return response.json();
    }
  });

  const { data: attendanceData } = useQuery({
    queryKey: ['wilma-attendance', userId],
    queryFn: async () => {
      if (!userId) return null;
      const response = await fetch(`/api/wilma/attendance-marks?studentId=${userId}`);
      if (!response.ok) return null;
      const marks = await response.json();
      const present = marks.filter((m: any) => m.markType === 'present').length;
      const total = marks.length;
      return total > 0 ? Math.round((present / total) * 100) : 95;
    },
    enabled: isStudent && !!userId
  });

  const { data: homeworkData } = useQuery({
    queryKey: ['wilma-homework', userId],
    queryFn: async () => {
      try {
        const response = await fetch('/api/wilma/homework');
        if (!response.ok) return [];
        return response.json();
      } catch (error) {
        return [];
      }
    },
    retry: false
  });

  const { data: recentMessagesData } = useQuery({
    queryKey: ['wilma-recent-messages', userId],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/wilma/messages?recipientId=${userId}&limit=5`);
        if (!response.ok) return [];
        return response.json();
      } catch (error) {
        return [];
      }
    },
    enabled: !!userId,
    retry: false
  });

  // Fetch schedule data
  const { data: scheduleData } = useQuery({
    queryKey: ['wilma-schedule', userId],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/wilma/schedules/${userId}`);
        if (!response.ok) {
          // Return mock data if endpoint doesn't exist yet
          return [
            { time: '08:00 - 09:30', subject: 'Matematiikka', room: 'A201', teacher: 'M. Virtanen' },
            { time: '09:45 - 11:15', subject: 'Englanti', room: 'B105', teacher: 'A. Korhonen' },
            { time: '11:30 - 13:00', subject: 'Lounastauko', room: '-', teacher: '-' },
            { time: '13:15 - 14:45', subject: 'Fysiikka', room: 'C301', teacher: 'P. Nieminen' },
            { time: '15:00 - 16:30', subject: 'Historia', room: 'A105', teacher: 'L. Mäkinen' },
          ];
        }
        return response.json();
      } catch (error) {
        // Return mock data on error
        return [
          { time: '08:00 - 09:30', subject: 'Matematiikka', room: 'A201', teacher: 'M. Virtanen' },
          { time: '09:45 - 11:15', subject: 'Englanti', room: 'B105', teacher: 'A. Korhonen' },
          { time: '11:30 - 13:00', subject: 'Lounastauko', room: '-', teacher: '-' },
          { time: '13:15 - 14:45', subject: 'Fysiikka', room: 'C301', teacher: 'P. Nieminen' },
          { time: '15:00 - 16:30', subject: 'Historia', room: 'A105', teacher: 'L. Mäkinen' },
        ];
      }
    },
    enabled: !!userId,
    retry: false
  });

  const studentsCount = studentsData?.length || 0;
  const teachersCount = teachersData?.length || 0;
  const totalUsersCount = allUsersData?.length || 0;
  const unreadMessages = messagesData?.length || 0;
  const activeCourses = coursesData?.length || 0;
  const attendancePercentage = attendanceData || 95;
  const homeworkList = homeworkData || [];
  const recentMessages = recentMessagesData || [];
  const todaySchedule = scheduleData || [];

  // Widget renderer helper
  const renderWidget = (widgetId: string) => {
    // Safety check: ensure widgets array exists
    if (!widgets || !Array.isArray(widgets)) {
      console.warn('Widgets array is not initialized');
      return null;
    }
    
    const widget = widgets.find(w => w.id === widgetId);
    if (!widget) return null;

    const widgetTitle = widget.customTitle || widget.title;
    const isEditing = editingWidget === widgetId;

    const widgetHeader = (
      <CardHeader className="bg-white dark:bg-gray-800 border-b border-[#dddddd] dark:border-gray-700 p-4 md:p-6 relative">
        <CardTitle className="flex items-center justify-between text-base md:text-lg text-gray-900 dark:text-gray-100">
          <div className="flex items-center gap-2">
            {customizationMode && <GripVertical className="w-4 h-4 text-gray-400 dark:text-gray-500 cursor-move" />}
            {isEditing ? (
              <div className="flex items-center gap-2">
                <Input
                  value={tempTitle}
                  onChange={(e) => setTempTitle(e.target.value)}
                  className="h-8 text-sm dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
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
        {/* Corner Resize Button */}
        {!customizationMode && (
          <button
            onClick={() => cycleWidgetSize(widgetId)}
            className="absolute bottom-1 right-1 p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100 transition-all opacity-0 group-hover:opacity-100 z-10"
            title={`Nykyinen: ${widget.size === 'small' ? 'Pieni' : widget.size === 'large' ? 'Suuri' : 'Keskikokoinen'}. Klikkaa muuttaaksesi kokoa`}
          >
            <Maximize className="w-3 h-3" />
          </button>
        )}
      </CardHeader>
    );

    // Widget content based on ID
    switch (widgetId) {
      case 'stats':
        return (
          <div key={widgetId} className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 group">
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
                      {isAdmin ? studentsCount : `${attendancePercentage}%`}
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
                      {unreadMessages}
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
                      {isAdmin ? 'Opettajat' : isStudent ? 'Tuntimerkinnät' : 'Kurssit'}
                    </p>
                    <p className="text-2xl md:text-3xl font-bold mt-1 text-[#003d82]">
                      {isAdmin ? teachersCount : isStudent ? `${attendancePercentage}%` : activeCourses}
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
          <Card key={widgetId} className="border border-[#dddddd] dark:border-gray-700 dark:bg-gray-800 rounded-lg shadow-sm group relative">
            {widgetHeader}
            <CardContent className="p-3 md:p-6">
              <div className="space-y-2 md:space-y-3">
                {todaySchedule.map((lesson: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-2 md:p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                    <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
                      <div className="text-xs md:text-sm font-medium text-gray-600 dark:text-gray-300 w-20 md:w-32 flex-shrink-0">
                        <Clock className="w-3 h-3 md:w-4 md:h-4 inline mr-1" />
                        {lesson.time}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm md:text-base text-gray-900 dark:text-gray-100 truncate">{lesson.subject}</p>
                        <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 truncate">{lesson.room} • {lesson.teacher}</p>
                      </div>
                    </div>
                    {lesson.subject !== 'Lounastauko' && (
                      <Button size="sm" variant="outline" className="ml-2 flex-shrink-0 text-xs md:text-sm dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">Näytä</Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );

      case 'recentActivity':
        return (
          <Card key={widgetId} className="border-2 border-blue-200 dark:border-blue-800 group relative">
            {widgetHeader}
            <CardContent className="p-3 md:p-6">
              <div className="space-y-2 md:space-y-3">
                {[
                  { icon: <Mail className="w-4 h-4 text-blue-600" />, text: 'Uusi viesti opettajalta', time: '5 min sitten' },
                  { icon: <Award className="w-4 h-4 text-green-600" />, text: 'Arvosana päivitetty: Matematiikka 9/10', time: '1 tunti sitten' },
                  { icon: <FileText className="w-4 h-4 text-orange-600" />, text: 'Kotitehtävä palautettu', time: '2 tuntia sitten' },
                  { icon: <Bell className="w-4 h-4 text-red-600" />, text: 'Tuntimerkintä merkitty', time: '3 tuntia sitten' },
                ].map((activity, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-2 md:p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="mt-0.5">{activity.icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{activity.text}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );

      case 'upcomingEvents':
        return (
          <Card key={widgetId} className="border-2 border-green-200 dark:border-green-800 group relative">
            {widgetHeader}
            <CardContent className="p-3 md:p-6">
              <div className="space-y-2 md:space-y-3">
                {[
                  { title: 'Matematiikan koe', date: 'Huomenna, 10:00', color: 'bg-red-100 text-red-700' },
                  { title: 'Vanhempainilta', date: 'Perjantai, 15:00', color: 'bg-blue-100 text-blue-700' },
                  { title: 'Liikuntapäivä', date: 'Ensi maanantai', color: 'bg-green-100 text-green-700' },
                  { title: 'Tiedemessut', date: '15. toukokuuta', color: 'bg-orange-100 text-orange-700' },
                ].map((event, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-2 md:p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className={`w-2 h-2 rounded-full ${event.color.split(' ')[0].replace('100', '500')}`}></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{event.title}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{event.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );

      case 'weather':
        // Use Open-Meteo weather data
        const [weatherData, setWeatherData] = useState<any>(null);
        const [weatherLoading, setWeatherLoading] = useState(true);

        useEffect(() => {
          const loadWeather = async () => {
            try {
              const { fetchCurrentWeather, fetchHourlyForecast, getWeatherDescription, getMockWeatherData } = await import('@/lib/openMeteoWeather');
              const data = await fetchCurrentWeather(); // Helsinki coordinates by default
              const forecast = await fetchHourlyForecast(60.1699, 24.9384, 6);
              
              if (data) {
                setWeatherData({
                  current: data,
                  forecast: forecast,
                  description: getWeatherDescription(data.weatherCode)
                });
              } else {
                // Fallback to mock data
                const mockData = getMockWeatherData();
                setWeatherData({
                  current: mockData,
                  forecast: [],
                  description: getWeatherDescription(mockData.weatherCode)
                });
              }
            } catch (error) {
              console.error('Weather fetch error:', error);
              // Use mock data on error
              const { getMockWeatherData, getWeatherDescription } = await import('@/lib/openMeteoWeather');
              const mockData = getMockWeatherData();
              setWeatherData({
                current: mockData,
                forecast: [],
                description: getWeatherDescription(mockData.weatherCode)
              });
            } finally {
              setWeatherLoading(false);
            }
          };
          loadWeather();
        }, []);

        // Helper functions
        const getWeatherIcon = (code: number) => {
          if (code === 0) return 'sun';
          if (code <= 3) return 'cloud-sun';
          if (code <= 48) return 'cloud';
          if (code <= 67) return 'cloud-rain';
          if (code <= 77) return 'cloud-snow';
          if (code <= 99) return 'cloud-lightning';
          return 'cloud';
        };

        const getDayName = (daysAhead: number) => {
          const date = new Date();
          date.setDate(date.getDate() + daysAhead);
          return date.toLocaleDateString('fi-FI', { weekday: 'short' });
        };

        // Generate hourly forecast times - show only hours without minutes
        const now = new Date();
        const finlandTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Helsinki' }));
        const currentHour = finlandTime.getHours();
        const hourlyForecast = weatherData?.forecast.length > 0 
          ? weatherData.forecast.slice(0, 6)
          : Array.from({ length: 6 }, (_, i) => {
              const hour = (currentHour + i) % 24;
              const temp = 18 - i;
              return {
                time: hour.toString(), // Just the hour number
                temperature: temp,
                weatherCode: 3
              };
            });

        return (
          <Card key={widgetId} className="border-2 border-cyan-200 dark:border-cyan-800 bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-gray-800 dark:to-gray-900 group relative">
            {widgetHeader}
            <CardContent className="p-4">
              {weatherLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-8 h-8 border-4 border-cyan-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Current Weather */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-5xl font-bold text-gray-900 dark:text-gray-100">
                        {Math.round(weatherData?.current?.temperature || 18)}°C
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                        {weatherData?.description || 'Pilvistä'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Helsinki, Kulosaari</p>
                    </div>
                    <div className="text-7xl">
                      <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" className="text-gray-400 dark:text-gray-500" fill="currentColor" opacity="0.3"/>
                        <circle cx="12" cy="8" r="3" className="text-yellow-400" fill="currentColor"/>
                        <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth={2} className="text-yellow-400"/>
                      </svg>
                    </div>
                  </div>

                  {/* Weather Details */}
                  <div className="grid grid-cols-2 gap-3 pt-3 border-t dark:border-gray-700">
                    <div className="flex items-center gap-2">
                      <svg className="w-6 h-6 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3"/>
                      </svg>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Tuuli</p>
                        <p className="text-sm font-semibold dark:text-gray-200">
                          {Math.round(weatherData?.current?.windSpeed || 12)} km/h
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <svg className="w-6 h-6 text-blue-500 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clipRule="evenodd"/>
                      </svg>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Kosteus</p>
                        <p className="text-sm font-semibold dark:text-gray-200">
                          {Math.round(weatherData?.current?.humidity || 65)}%
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <svg className="w-6 h-6 text-red-500 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                      </svg>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Tuntuu kuin</p>
                        <p className="text-sm font-semibold dark:text-gray-200">
                          {Math.round(weatherData?.current?.feelsLike || 16)}°C
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <svg className="w-6 h-6 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                      </svg>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Näkyvyys</p>
                        <p className="text-sm font-semibold dark:text-gray-200">
                          {Math.round(weatherData?.current?.visibility || 10)} km
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Hourly Forecast */}
                  <div className="border-t dark:border-gray-700 pt-3">
                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Tuntikohtainen ennuste</p>
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {hourlyForecast.map((hour: any, idx: number) => (
                        <div key={idx} className="flex-shrink-0 text-center p-2 bg-white/50 dark:bg-gray-700/50 rounded min-w-[60px]">
                          <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{hour.time}</p>
                          <div className="my-1">
                            {getWeatherIcon(hour.weatherCode) === 'sun' && (
                              <svg className="w-6 h-6 mx-auto text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                                <circle cx="10" cy="10" r="3"/>
                                <path d="M10 1v2M10 17v2M3.22 3.22l1.42 1.42M15.36 15.36l1.42 1.42M1 10h2M17 10h2M3.22 16.78l1.42-1.42M15.36 4.64l1.42-1.42" stroke="currentColor" strokeWidth={1.5} fill="none"/>
                              </svg>
                            )}
                            {getWeatherIcon(hour.weatherCode) === 'cloud-sun' && (
                              <svg className="w-6 h-6 mx-auto text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M5.5 16a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 16h-8z"/>
                              </svg>
                            )}
                            {getWeatherIcon(hour.weatherCode) === 'cloud' && (
                              <svg className="w-6 h-6 mx-auto text-gray-400 dark:text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M5.5 16a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 16h-8z"/>
                              </svg>
                            )}
                            {getWeatherIcon(hour.weatherCode) === 'cloud-rain' && (
                              <svg className="w-6 h-6 mx-auto text-blue-500 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M5.5 16a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 16h-8z"/>
                                <path d="M7 18v-2M10 18v-2M13 18v-2" stroke="currentColor" strokeWidth={1.5} fill="none"/>
                              </svg>
                            )}
                          </div>
                          <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                            {Math.round(hour.temperature)}°
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 3-Day Forecast */}
                  <div className="grid grid-cols-3 gap-2 text-center text-xs border-t dark:border-gray-700 pt-3">
                    <div className="p-2 bg-white/50 dark:bg-gray-700/50 rounded">
                      <p className="font-semibold text-gray-700 dark:text-gray-300">{getDayName(1)}</p>
                      <svg className="w-8 h-8 mx-auto my-1 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                        <circle cx="10" cy="10" r="3"/>
                      </svg>
                      <p className="text-gray-900 dark:text-gray-100 font-semibold">20°</p>
                      <p className="text-gray-500 dark:text-gray-400 text-xs">12°</p>
                    </div>
                    <div className="p-2 bg-white/50 dark:bg-gray-700/50 rounded">
                      <p className="font-semibold text-gray-700 dark:text-gray-300">{getDayName(2)}</p>
                      <svg className="w-8 h-8 mx-auto my-1 text-blue-500 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M5.5 16a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 16h-8z"/>
                      </svg>
                      <p className="text-gray-900 dark:text-gray-100 font-semibold">15°</p>
                      <p className="text-gray-500 dark:text-gray-400 text-xs">10°</p>
                    </div>
                    <div className="p-2 bg-white/50 dark:bg-gray-700/50 rounded">
                      <p className="font-semibold text-gray-700 dark:text-gray-300">{getDayName(3)}</p>
                      <svg className="w-8 h-8 mx-auto my-1 text-gray-400 dark:text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M5.5 16a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 16h-8z"/>
                      </svg>
                      <p className="text-gray-900 dark:text-gray-100 font-semibold">17°</p>
                      <p className="text-gray-500 dark:text-gray-400 text-xs">11°</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );

      case 'quotes':
        const quotes = [
          "Education is the most powerful weapon which you can use to change the world. - Nelson Mandela",
          "The beautiful thing about learning is that no one can take it away from you. - B.B. King",
          "Success is not final, failure is not fatal: it is the courage to continue that counts. - Winston Churchill",
          "The only way to do great work is to love what you do. - Steve Jobs",
          "Believe you can and you're halfway there. - Theodore Roosevelt",
          "The future belongs to those who believe in the beauty of their dreams. - Eleanor Roosevelt",
          "It does not matter how slowly you go as long as you do not stop. - Confucius",
          "Everything you've ever wanted is on the other side of fear. - George Addair"
        ];
        const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
        
        return (
          <Card key={widgetId} className="border-2 border-yellow-200 dark:border-yellow-800 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-gray-800 dark:to-gray-900 group relative">
            {widgetHeader}
            <CardContent className="p-4 md:p-6">
              <div className="text-center">
                <Quote className="w-12 h-12 mx-auto mb-3 text-yellow-600 dark:text-yellow-500" />
                <p className="text-sm italic text-gray-700 dark:text-gray-300 leading-relaxed">"{randomQuote}"</p>
              </div>
            </CardContent>
          </Card>
        );

      case 'homework':
        return (
          <Card key={widgetId} className="border-2 border-orange-200 dark:border-orange-800 group relative">
            {widgetHeader}
            <CardContent className="p-4">
              <div className="space-y-2">
                {homeworkList.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">Ei kotitehtäviä</p>
                ) : (
                  homeworkList.slice(0, 5).map((hw: any, idx: number) => (
                    <div key={idx} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{hw.title || 'Kotitehtävä'}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{hw.subject || 'Yleinen'}</p>
                      <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">Palautus: {hw.dueDate ? new Date(hw.dueDate).toLocaleDateString('fi-FI') : 'Ei päivämäärää'}</p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        );

      case 'attendance':
        return (
          <Card key={widgetId} className="border-2 border-green-200 dark:border-green-800 group relative">
            {widgetHeader}
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-6xl font-bold text-green-600 dark:text-green-500 mb-2">{attendancePercentage}%</div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Kokonaisläsnäolo</p>
                <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                  <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded">
                    <p className="font-semibold text-green-700 dark:text-green-400">Läsnä</p>
                    <p className="text-lg font-bold text-green-600 dark:text-green-500">85</p>
                  </div>
                  <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded">
                    <p className="font-semibold text-red-700 dark:text-red-400">Poissa</p>
                    <p className="text-lg font-bold text-red-600 dark:text-red-500">5</p>
                  </div>
                  <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                    <p className="font-semibold text-yellow-700 dark:text-yellow-400">Myöhässä</p>
                    <p className="text-lg font-bold text-yellow-600 dark:text-yellow-500">3</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'messages':
        return (
          <Card key={widgetId} className="border-2 border-blue-200 dark:border-blue-800 group relative">
            {widgetHeader}
            <CardContent className="p-4">
              <div className="space-y-2">
                {recentMessages.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">Ei viestejä</p>
                ) : (
                  recentMessages.map((msg: any, idx: number) => (
                    <div key={idx} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer transition-colors">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{msg.subject || 'Ei aihetta'}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Lähettäjä: {msg.senderName || 'Tuntematon'}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{msg.timestamp ? new Date(msg.timestamp).toLocaleDateString('fi-FI') : ''}</p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        );

      case 'quickLinks':
        return (
          <Card key={widgetId} className="border-2 border-indigo-200 dark:border-indigo-800 group relative">
            {widgetHeader}
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="justify-start h-auto py-3 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                  onClick={() => window.open('https://ksyk.fi', '_blank')}
                >
                  <LinkIcon className="w-4 h-4 mr-2" />
                  <span className="text-xs">Koulun sivusto</span>
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="justify-start h-auto py-3 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                  onClick={() => window.location.href = '/wilma'}
                >
                  <LinkIcon className="w-4 h-4 mr-2" />
                  <span className="text-xs">Wilma</span>
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="justify-start h-auto py-3 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                  onClick={() => window.location.href = '/lunch'}
                >
                  <LinkIcon className="w-4 h-4 mr-2" />
                  <span className="text-xs">Lounaslista</span>
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="justify-start h-auto py-3 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                  onClick={() => window.location.href = '/'}
                >
                  <LinkIcon className="w-4 h-4 mr-2" />
                  <span className="text-xs">Kampuskartta</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      case 'grades':
        return (
          <Card key={widgetId} className="border-2 border-purple-200 dark:border-purple-800 group relative">
            {widgetHeader}
            <CardContent className="p-4">
              <div className="space-y-3">
                {[
                  { subject: 'Matematiikka', grade: '9', date: '15.04.2026', teacher: 'M. Virtanen', color: 'text-green-600' },
                  { subject: 'Englanti', grade: '8', date: '12.04.2026', teacher: 'A. Korhonen', color: 'text-green-600' },
                  { subject: 'Fysiikka', grade: '10', date: '10.04.2026', teacher: 'P. Nieminen', color: 'text-green-600' },
                  { subject: 'Historia', grade: '7', date: '08.04.2026', teacher: 'L. Mäkinen', color: 'text-yellow-600' },
                ].map((grade, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{grade.subject}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{grade.teacher} • {grade.date}</p>
                    </div>
                    <div className={`text-2xl font-bold ${grade.color} dark:opacity-90`}>
                      {grade.grade}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );

      case 'overview':
        return (
          <Card key={widgetId} className="border-2 border-indigo-200 dark:border-indigo-800 group relative">
            {widgetHeader}
            <CardContent className="p-4">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-xs text-blue-700 dark:text-blue-400 font-medium">Kursseja</p>
                    <p className="text-2xl font-bold text-blue-900 dark:text-blue-300 mt-1">{activeCourses}</p>
                  </div>
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <p className="text-xs text-green-700 dark:text-green-400 font-medium">Läsnäolo</p>
                    <p className="text-2xl font-bold text-green-900 dark:text-green-300 mt-1">{attendancePercentage}%</p>
                  </div>
                  <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <p className="text-xs text-purple-700 dark:text-purple-400 font-medium">Tehtäviä</p>
                    <p className="text-2xl font-bold text-purple-900 dark:text-purple-300 mt-1">{homeworkList.length}</p>
                  </div>
                  <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                    <p className="text-xs text-orange-700 dark:text-orange-400 font-medium">Viestejä</p>
                    <p className="text-2xl font-bold text-orange-900 dark:text-orange-300 mt-1">{unreadMessages}</p>
                  </div>
                </div>
                <div className="pt-3 border-t dark:border-gray-700">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Nykyinen jakso: <span className="font-semibold text-gray-900 dark:text-gray-100">Jakso 4</span>
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Lukuvuosi: <span className="font-semibold text-gray-900 dark:text-gray-100">2025-2026</span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'performance':
        return (
          <Card key={widgetId} className="border-2 border-teal-200 dark:border-teal-800 group relative">
            {widgetHeader}
            <CardContent className="p-4">
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Keskiarvo</span>
                    <span className="text-lg font-bold text-teal-600 dark:text-teal-400">8.5</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div className="bg-teal-600 dark:bg-teal-500 h-2 rounded-full" style={{ width: '85%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Tehtävät palautettu</span>
                    <span className="text-lg font-bold text-green-600 dark:text-green-400">92%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div className="bg-green-600 dark:bg-green-500 h-2 rounded-full" style={{ width: '92%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Aktiivisuus</span>
                    <span className="text-lg font-bold text-blue-600 dark:text-blue-400">88%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full" style={{ width: '88%' }}></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'announcements':
        return (
          <Card key={widgetId} className="border-2 border-amber-200 dark:border-amber-800 group relative">
            {widgetHeader}
            <CardContent className="p-4">
              <div className="space-y-3">
                {[
                  { title: 'Kevätjuhla 15.5.', type: 'event', icon: <Calendar className="w-4 h-4" />, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
                  { title: 'Uusi ruokalista julkaistu', type: 'info', icon: <Bell className="w-4 h-4" />, color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
                  { title: 'Kirjasto suljettu 20.4.', type: 'warning', icon: <AlertCircle className="w-4 h-4" />, color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
                ].map((announcement, idx) => (
                  <div key={idx} className={`flex items-center gap-3 p-3 rounded-lg ${announcement.color}`}>
                    {announcement.icon}
                    <p className="text-sm font-medium flex-1">{announcement.title}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );

      case 'quickActions':
        return (
          <Card key={widgetId} className="border-2 border-pink-200 dark:border-pink-800 group relative">
            {widgetHeader}
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-auto py-4 flex-col gap-2 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                  onClick={() => window.location.href = '/wilma?tab=viestit'}
                >
                  <Mail className="w-5 h-5" />
                  <span className="text-xs">Uusi viesti</span>
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-auto py-4 flex-col gap-2 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                  onClick={() => window.location.href = '/wilma?tab=tehtävät'}
                >
                  <FileText className="w-5 h-5" />
                  <span className="text-xs">Tehtävät</span>
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-auto py-4 flex-col gap-2 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                  onClick={() => window.location.href = '/wilma?tab=arvosanat'}
                >
                  <Award className="w-5 h-5" />
                  <span className="text-xs">Arvosanat</span>
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-auto py-4 flex-col gap-2 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                  onClick={() => window.location.href = '/wilma?tab=tuntimerkinnät'}
                >
                  <CheckCircle className="w-5 h-5" />
                  <span className="text-xs">Läsnäolo</span>
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
                {customizationMode ? 'Valmis' : 'Muokkaa'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Customization Panel */}
      {customizationMode && (
        <Card className="border-2 border-orange-300 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-700">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-orange-900 dark:text-orange-100">
              <Settings className="w-5 h-5" />
              Kojelaudan muokkaus
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Theme Mode Selector */}
            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 block">
                Teeman tila
              </label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  size="sm"
                  variant={themeMode === 'light' ? "default" : "outline"}
                  onClick={() => setThemeMode('light')}
                  className="flex flex-col items-center py-3 h-auto"
                >
                  <Sun className="w-5 h-5 mb-1" />
                  <span className="text-xs">Vaalea</span>
                </Button>
                <Button
                  size="sm"
                  variant={themeMode === 'dark' ? "default" : "outline"}
                  onClick={() => setThemeMode('dark')}
                  className="flex flex-col items-center py-3 h-auto"
                >
                  <Moon className="w-5 h-5 mb-1" />
                  <span className="text-xs">Tumma</span>
                </Button>
                <Button
                  size="sm"
                  variant={themeMode === 'system' ? "default" : "outline"}
                  onClick={() => setThemeMode('system')}
                  className="flex flex-col items-center py-3 h-auto"
                >
                  <Monitor className="w-5 h-5 mb-1" />
                  <span className="text-xs">Järjestelmä</span>
                </Button>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">Valitse haluamasi teema</p>
            </div>

            {/* Custom Greeting */}
            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 block">
                Mukautettu tervehdys
              </label>
              <Input
                value={customGreeting}
                onChange={(e) => setCustomGreeting(e.target.value)}
                placeholder="Kirjoita oma tervehdyksesi..."
                className="mb-2 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
              />
              <p className="text-xs text-gray-600 dark:text-gray-400">Jätä tyhjäksi automaattista aikaan perustuvaa tervehdystä varten</p>
            </div>

            {/* Widget Visibility */}
            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 block">
                Näkyvät widgetit
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
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 block">
                Widgettien koot (vain näkyvät widgetit)
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {widgets.filter(w => w.visible).map((widget) => (
                  <div key={widget.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                    <span className="text-xs font-medium truncate flex-1 dark:text-gray-200">{widget.customTitle || widget.title}</span>
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
                        <span className="text-xs">K</span>
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
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">Pieni (1 sar), Keskikokoinen (2 sar), Suuri (3 sar)</p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleSaveConfiguration}
                className="flex-1 bg-[#003d82] hover:bg-[#0052a3]"
              >
                <Save className="w-4 h-4 mr-2" />
                Tallenna muutokset
              </Button>
              <Button
                onClick={resetToDefaults}
                variant="outline"
                className="flex-1"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Palauta oletukset
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
